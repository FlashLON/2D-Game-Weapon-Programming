const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // In production, set to your Vercel URL
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;

// Game state
const gameState = {
    players: {},
    enemies: [
        { id: 'enemy1', x: 600, y: 300, radius: 20, color: '#ff0055', hp: 50, maxHp: 50, type: 'enemy', velocity: { x: 0, y: 0 } }
    ],
    projectiles: [],
    score: 0
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        players: Object.keys(gameState.players).length,
        uptime: process.uptime()
    });
});

// Handle player connections
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Add new player
    gameState.players[socket.id] = {
        id: socket.id,
        x: Math.random() * 700 + 50,
        y: Math.random() * 500 + 50,
        radius: 20,
        color: '#00ff9f',
        hp: 100,
        maxHp: 100,
        type: 'player',
        velocity: { x: 0, y: 0 }
    };

    // Send initial state to new player
    socket.emit('init', {
        playerId: socket.id,
        gameState: gameState
    });

    // Broadcast to all players that someone joined
    io.emit('playerJoined', {
        playerId: socket.id,
        playerCount: Object.keys(gameState.players).length
    });

    // Handle player movement input
    socket.on('move', (velocity) => {
        const player = gameState.players[socket.id];
        if (player) {
            player.velocity = velocity;
        }
    });

    // Handle weapon fire
    socket.on('fire', (data) => {
        const player = gameState.players[socket.id];
        if (player) {
            const projectile = {
                id: `proj_${Date.now()}_${socket.id}`,
                playerId: socket.id,
                x: player.x,
                y: player.y,
                radius: data.radius || 5,
                color: data.color || '#fce83a',
                damage: data.damage || 25,
                type: 'projectile',
                velocity: {
                    x: data.vx || 0,
                    y: data.vy || 0
                },
                homing: data.homing || 0,
                lifetime: data.lifetime || 5,
                maxLifetime: data.lifetime || 5,
                acceleration: data.acceleration || 0,
                knockback: data.knockback || 0,
                pierce: data.pierce || 1
            };

            gameState.projectiles.push(projectile);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete gameState.players[socket.id];

        // Broadcast to remaining players
        io.emit('playerLeft', {
            playerId: socket.id,
            playerCount: Object.keys(gameState.players).length
        });
    });
});

// Game loop (60 FPS)
const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;
let lastTick = Date.now();

setInterval(() => {
    const now = Date.now();
    const dt = Math.min((now - lastTick) / 1000, 0.1);
    lastTick = now;

    // Update players
    Object.values(gameState.players).forEach(player => {
        player.x += player.velocity.x * dt;
        player.y += player.velocity.y * dt;

        // Keep in bounds
        player.x = Math.max(player.radius, Math.min(800 - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(600 - player.radius, player.y));
    });

    // Update projectiles
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const proj = gameState.projectiles[i];

        // Lifetime
        if (proj.lifetime !== undefined) {
            proj.lifetime -= dt;
            if (proj.lifetime <= 0) {
                gameState.projectiles.splice(i, 1);
                continue;
            }
        }

        // Acceleration
        if (proj.acceleration) {
            proj.velocity.x *= (1 + proj.acceleration * dt);
            proj.velocity.y *= (1 + proj.acceleration * dt);
        }

        // Homing (find nearest enemy)
        if (proj.homing && proj.homing > 0) {
            let nearest = null;
            let minDistSq = Infinity;

            gameState.enemies.forEach(enemy => {
                const distSq = (enemy.x - proj.x) ** 2 + (enemy.y - proj.y) ** 2;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    nearest = enemy;
                }
            });

            if (nearest) {
                const currentAngle = Math.atan2(proj.velocity.y, proj.velocity.x);
                const targetAngle = Math.atan2(nearest.y - proj.y, nearest.x - proj.x);

                let angleDiff = targetAngle - currentAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                const turnSpeed = proj.homing * 5 * dt;
                const newAngle = currentAngle + Math.max(-turnSpeed, Math.min(turnSpeed, angleDiff));

                const speed = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2);
                proj.velocity.x = Math.cos(newAngle) * speed;
                proj.velocity.y = Math.sin(newAngle) * speed;
            }
        }

        // Move
        proj.x += proj.velocity.x * dt;
        proj.y += proj.velocity.y * dt;

        // Remove if out of bounds
        if (proj.x < -100 || proj.x > 900 || proj.y < -100 || proj.y > 700) {
            gameState.projectiles.splice(i, 1);
        }
    }

    // Check collisions
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const p = gameState.projectiles[i];
        let hitSomething = false;

        // Check against enemies
        for (const e of gameState.enemies) {
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < p.radius + e.radius) {
                const dmg = p.damage || 10;
                e.hp -= dmg;

                // Apply knockback
                if (p.knockback) {
                    const angle = Math.atan2(dy, dx);
                    e.velocity.x -= Math.cos(angle) * p.knockback;
                    e.velocity.y -= Math.sin(angle) * p.knockback;
                }

                hitSomething = true;

                // Check if enemy died
                if (e.hp <= 0) {
                    e.hp = e.maxHp;
                    e.x = Math.random() * 700 + 50;
                    e.y = Math.random() * 500 + 50;
                    e.velocity = { x: 0, y: 0 };
                    gameState.score += 1;

                    // Notify the player who got the kill
                    io.to(p.playerId).emit('kill', { enemyId: e.id });
                }

                // Handle pierce
                if (p.pierce && p.pierce > 1) {
                    p.pierce--;
                    hitSomething = false;
                } else {
                    break;
                }
            }
        }

        if (hitSomething) {
            gameState.projectiles.splice(i, 1);
        }
    }

    // Broadcast state to all clients
    io.emit('state', gameState);
}, TICK_INTERVAL);

server.listen(PORT, () => {
    console.log(`🎮 Game server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
