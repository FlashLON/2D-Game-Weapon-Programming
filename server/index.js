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
    enemies: [],
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
                pierce: data.pierce || 1,
                // Advanced behaviors
                orbit_player: data.orbit_player || false,
                vampirism: data.vampirism || 0,
                split_on_death: data.split_on_death || 0,
                attraction_force: data.attraction_force || 0
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

// Helper to spawn fragments
const spawnFragments = (parent, count) => {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const speed = 200;
        gameState.projectiles.push({
            id: `frag_${parent.id}_${i}`,
            playerId: parent.playerId,
            x: parent.x,
            y: parent.y,
            radius: parent.radius * 0.6,
            color: parent.color,
            damage: (parent.damage || 10) * 0.5,
            type: 'projectile',
            velocity: {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            },
            lifetime: 1.0,
            maxLifetime: 1.0,
            // Fragments don't inherit split/orbit to prevent infinite recursion/chaos
            pierce: 1
        });
    }
};

// Game loop (30 FPS for bandwidth optimization)
const TICK_RATE = 30;
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

        // --- ORBIT PLAYER LOGIC ---
        if (proj.orbit_player) {
            const owner = gameState.players[proj.playerId];
            if (owner) {
                if (proj.orbitAngle === undefined) {
                    proj.orbitAngle = Math.atan2(proj.y - owner.y, proj.x - owner.x);
                    const dx = proj.x - owner.x;
                    const dy = proj.y - owner.y;
                    let r = Math.sqrt(dx * dx + dy * dy);
                    if (r < 10) r = 60;
                    proj.orbitRadius = r;
                }

                const orbitSpeed = 3.0;
                proj.orbitAngle += orbitSpeed * dt;

                proj.x = owner.x + Math.cos(proj.orbitAngle) * proj.orbitRadius;
                proj.y = owner.y + Math.sin(proj.orbitAngle) * proj.orbitRadius;

                proj.velocity.x = -proj.orbitRadius * orbitSpeed * Math.sin(proj.orbitAngle);
                proj.velocity.y = proj.orbitRadius * orbitSpeed * Math.cos(proj.orbitAngle);
            }
        } else {
            // Standard Movement
            if (proj.acceleration) {
                proj.velocity.x *= (1 + proj.acceleration * dt);
                proj.velocity.y *= (1 + proj.acceleration * dt);
            }

            // Homing
            if (proj.homing && proj.homing > 0) {
                let nearest = null;
                let minDistSq = Infinity;

                // Scan enemies
                gameState.enemies.forEach(enemy => {
                    const distSq = (enemy.x - proj.x) ** 2 + (enemy.y - proj.y) ** 2;
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        nearest = enemy;
                    }
                });

                // Scan players (PVP) - target nearest valid player
                Object.values(gameState.players).forEach(p => {
                    if (p.id !== proj.playerId) {
                        const distSq = (p.x - proj.x) ** 2 + (p.y - proj.y) ** 2;
                        if (distSq < minDistSq) {
                            minDistSq = distSq;
                            nearest = p;
                        }
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
        }

        // --- ATTRACTION FORCE LOGIC ---
        if (proj.attraction_force && proj.attraction_force > 0) {
            const range = 200;
            const force = proj.attraction_force * 1000;

            // Pull enemies
            gameState.enemies.forEach(e => {
                const dx = proj.x - e.x;
                const dy = proj.y - e.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < range * range && distSq > 100) {
                    const dist = Math.sqrt(distSq);
                    const ax = (dx / dist) * (force / distSq);
                    const ay = (dy / dist) * (force / distSq);
                    // Server relies on client prediction somewhat, but simple physics update helps
                    // Note: Enemy velocity logic isn't fully simulated on server like player, 
                    // but we can nudge their position or add velocity property to enemies if missing.
                    // Current enemies have velocity {x,y} in initialization? No, I need to check.
                    // Assuming they do or adding it now.
                    if (!e.velocity) e.velocity = { x: 0, y: 0 };
                    e.velocity.x += ax * dt;
                    e.velocity.y += ay * dt;
                    // Use velocity to move them? 
                    // The main loop doesn't update enemy position by velocity yet!
                    // I'll add that to the enemy loop below if needed.
                    // Actually, let's just nudge position directly for now to be safe, 
                    // or better, update the Main Loop to move enemies.
                    e.x += ax * dt * dt * 0.5; // Approximation
                    e.y += ay * dt * dt * 0.5;
                }
            });

            // Pull other players
            Object.values(gameState.players).forEach(p => {
                if (p.id !== proj.playerId) {
                    const dx = proj.x - p.x;
                    const dy = proj.y - p.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < range * range && distSq > 100) {
                        const dist = Math.sqrt(distSq);
                        const ax = (dx / dist) * (force / distSq);
                        const ay = (dy / dist) * (force / distSq);
                        p.velocity.x += ax * dt;
                        p.velocity.y += ay * dt;
                    }
                }
            });
        }

        // Lifetime
        if (proj.lifetime !== undefined) {
            proj.lifetime -= dt;
            if (proj.lifetime <= 0) {
                if (proj.split_on_death) {
                    spawnFragments(proj, proj.split_on_death);
                }
                gameState.projectiles.splice(i, 1);
                continue;
            }
        }

        // Remove if out of bounds
        if (proj.x < -100 || proj.x > 900 || proj.y < -100 || proj.y > 700) {
            gameState.projectiles.splice(i, 1);
        }
    }

    // Check collisions
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const p = gameState.projectiles[i];
        let hitSomething = false;

        // 1. Check against enemies (PVE)
        for (const e of gameState.enemies) {
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < p.radius + e.radius) {
                const dmg = p.damage || 10;
                e.hp -= dmg;

                // Vampirism
                if (p.vampirism && p.vampirism > 0) {
                    const owner = gameState.players[p.playerId];
                    if (owner) {
                        const heal = dmg * (p.vampirism / 100);
                        owner.hp = Math.min(owner.maxHp, owner.hp + heal);
                    }
                }

                // Apply knockback
                if (p.knockback) {
                    const angle = Math.atan2(dy, dx);
                    if (!e.velocity) e.velocity = { x: 0, y: 0 };
                    e.velocity.x -= Math.cos(angle) * p.knockback;
                    e.velocity.y -= Math.sin(angle) * p.knockback;
                    // Simple positional nudge
                    e.x -= Math.cos(angle) * p.knockback * 0.1;
                    e.y -= Math.sin(angle) * p.knockback * 0.1;
                }

                hitSomething = true;

                // Check if enemy died
                if (e.hp <= 0) {
                    e.hp = e.maxHp;
                    e.x = Math.random() * 700 + 50;
                    e.y = Math.random() * 500 + 50;
                    e.velocity = { x: 0, y: 0 };
                    gameState.score += 1;
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

        // 2. Check against other Players (PVP) - FREE FOR ALL
        if (!hitSomething) {
            for (const playerId in gameState.players) {
                if (playerId === p.playerId) continue;

                const player = gameState.players[playerId];
                const dx = p.x - player.x;
                const dy = p.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < p.radius + player.radius) {
                    const dmg = p.damage || 10;
                    player.hp -= dmg;

                    // Vampirism
                    if (p.vampirism && p.vampirism > 0) {
                        const owner = gameState.players[p.playerId];
                        if (owner) {
                            const heal = dmg * (p.vampirism / 100);
                            owner.hp = Math.min(owner.maxHp, owner.hp + heal);
                        }
                    }

                    // Apply knockback
                    if (p.knockback) {
                        const angle = Math.atan2(dy, dx);
                        player.velocity.x -= Math.cos(angle) * p.knockback;
                        player.velocity.y -= Math.sin(angle) * p.knockback;
                    }

                    hitSomething = true;
                    io.to(playerId).emit('hit', { damage: dmg, attackerId: p.playerId });

                    if (player.hp <= 0) {
                        player.hp = player.maxHp;
                        player.x = Math.random() * 700 + 50;
                        player.y = Math.random() * 500 + 50;
                        player.velocity = { x: 0, y: 0 };
                        io.to(p.playerId).emit('kill', { enemyId: player.id });
                        io.emit('killFeed', { killer: p.playerId, victim: player.id });
                    }

                    if (p.pierce && p.pierce > 1) {
                        p.pierce--;
                        hitSomething = false;
                    } else {
                        break;
                    }
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
