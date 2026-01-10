const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors()); // Enable CORS for all routes

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
    score: 0 // Global enemy kill score
};

// --- SPATIAL PARTITIONING GRID ---
const PROJECTILE_CAP = 200;
const CELL_SIZE = 100;
const GRID_COLS = 8; // 800 / 100
const GRID_ROWS = 6; // 600 / 100
let spatialGrid = []; // Array of Cells, each cell is a Map of entities

function resetGrid() {
    spatialGrid = Array.from({ length: GRID_COLS * GRID_ROWS }, () => []);
}

function getCellIndex(x, y) {
    const col = Math.floor(Math.max(0, Math.min(x, 799)) / CELL_SIZE);
    const row = Math.floor(Math.max(0, Math.min(y, 599)) / CELL_SIZE);
    return row * GRID_COLS + col;
}

function updateGrid() {
    resetGrid();
    // Add enemies to grid
    gameState.enemies.forEach(e => {
        const idx = getCellIndex(e.x, e.y);
        spatialGrid[idx].push(e);
    });
    // Add players to grid
    Object.values(gameState.players).forEach(p => {
        const idx = getCellIndex(p.x, p.y);
        spatialGrid[idx].push(p);
    });
}

function getNearbyEntities(x, y) {
    const col = Math.floor(Math.max(0, Math.min(x, 799)) / CELL_SIZE);
    const row = Math.floor(Math.max(0, Math.min(y, 599)) / CELL_SIZE);

    let nearby = [];
    for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
                const idx = r * GRID_COLS + c;
                nearby.push(...spatialGrid[idx]);
            }
        }
    }
    return nearby;
}
// ---------------------------------

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
        velocity: { x: 0, y: 0 },
        kills: 0,
        deaths: 0
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
                attraction_force: data.attraction_force || 0,
                bounciness: data.bounciness || 0,
                spin: data.spin || 0,
                chain_range: data.chain_range || 0,
                orbit_speed: data.orbit_speed || 3.0,
                orbit_radius: data.orbit_radius || 60
            };

            if (gameState.projectiles.length < PROJECTILE_CAP) {
                gameState.projectiles.push(projectile);
            }
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
// Physics and Network configuration (High-Sync Mode)
const TICK_RATE = 45;  // Physics updates at 45 FPS
const TICK_INTERVAL = 1000 / TICK_RATE;
const BROADCAST_RATE = 45; // Match broadcast to tick rate for maximum synchronization
const BROADCAST_INTERVAL = 1000 / BROADCAST_RATE;

let lastTick = Date.now();
let lastBroadcast = 0;

setInterval(() => {
    const now = Date.now();
    const dt = Math.min((now - lastTick) / 1000, 0.1);
    lastTick = now;

    // --- 0. SPAWN ENEMIES IF NEEDED ---
    if (gameState.enemies.length < 5) {
        gameState.enemies.push({
            id: `enemy_${Date.now()}_${Math.random()}`,
            x: Math.random() * 700 + 50,
            y: Math.random() * 500 + 50,
            radius: 20,
            color: '#ff0055',
            hp: 50,
            maxHp: 50,
            type: 'enemy',
            velocity: { x: 0, y: 0 }
        });
    }

    // --- 1. PREPARE GRID ---
    updateGrid();

    // --- 2. PHYSICS UPDATE ---

    // Update players
    Object.values(gameState.players).forEach(player => {
        player.x += player.velocity.x * dt;
        player.y += player.velocity.y * dt;

        player.x = Math.max(player.radius, Math.min(800 - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(600 - player.radius, player.y));
    });

    // Update projectiles & Check Collisions
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const proj = gameState.projectiles[i];
        let removed = false;

        // --- 1. MOVEMENT & SPECIAL BEHAVIORS ---
        if (proj.orbit_player) {
            const owner = gameState.players[proj.playerId];
            if (owner) {
                if (proj.orbitAngle === undefined) {
                    const dx = proj.x - owner.x;
                    const dy = proj.y - owner.y;
                    let r = proj.orbit_radius || Math.sqrt(dx * dx + dy * dy);
                    let angle = Math.atan2(dy, dx);
                    if (r < 20) { r = proj.orbit_radius || 60; angle = (Math.random() * Math.PI * 2); }
                    proj.orbitRadius = r;
                    proj.orbitAngle = angle;
                }
                const orbitSpeed = proj.orbit_speed || 4.0;
                proj.orbitAngle += orbitSpeed * dt;
                proj.x = owner.x + Math.cos(proj.orbitAngle) * proj.orbitRadius;
                proj.y = owner.y + Math.sin(proj.orbitAngle) * proj.orbitRadius;
                proj.velocity.x = -proj.orbitRadius * orbitSpeed * Math.sin(proj.orbitAngle);
                proj.velocity.y = proj.orbitRadius * orbitSpeed * Math.cos(proj.orbitAngle);
            } else {
                proj.orbit_player = false;
            }
        } else {
            if (proj.acceleration) {
                proj.velocity.x *= (1 + proj.acceleration * dt);
                proj.velocity.y *= (1 + proj.acceleration * dt);
            }
            if (proj.spin) {
                const spinRad = (proj.spin * Math.PI / 180) * dt;
                const cos = Math.cos(spinRad);
                const sin = Math.sin(spinRad);
                const nx = proj.velocity.x * cos - proj.velocity.y * sin;
                const ny = proj.velocity.x * sin + proj.velocity.y * cos;
                proj.velocity.x = nx;
                proj.velocity.y = ny;
            }
            if (proj.homing && proj.homing > 0) {
                let nearest = null;
                let minDistSq = Infinity;
                const nearby = getNearbyEntities(proj.x, proj.y);
                nearby.forEach(ent => {
                    if (ent.id === proj.playerId) return;
                    const dx = ent.x - proj.x;
                    const dy = ent.y - proj.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < minDistSq) { minDistSq = dSq; nearest = ent; }
                });
                if (nearest && minDistSq > 0) {
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
            proj.x += proj.velocity.x * dt;
            proj.y += proj.velocity.y * dt;

            if (proj.bounciness && proj.bounciness > 0) {
                const width = 800, height = 600;
                if (proj.x < proj.radius) { proj.x = proj.radius; proj.velocity.x *= -proj.bounciness; }
                else if (proj.x > width - proj.radius) { proj.x = width - proj.radius; proj.velocity.x *= -proj.bounciness; }
                if (proj.y < proj.radius) { proj.y = proj.radius; proj.velocity.y *= -proj.bounciness; }
                else if (proj.y > height - proj.radius) { proj.y = height - proj.radius; proj.velocity.y *= -proj.bounciness; }
            }
        }

        // --- 2. ATTRACTION & COLLISION ---
        if (proj.attraction_force && proj.attraction_force > 0) {
            const rangeSq = 200 * 200, force = proj.attraction_force * 1000;
            const nearby = getNearbyEntities(proj.x, proj.y);
            nearby.forEach(e => {
                if (e.id === proj.playerId) return;
                const dx = proj.x - e.x, dy = proj.y - e.y, distSq = dx * dx + dy * dy;
                if (distSq < rangeSq && distSq > 100) {
                    const dist = Math.sqrt(distSq), ax = (dx / dist) * (force / distSq), ay = (dy / dist) * (force / distSq);
                    if (!e.velocity) e.velocity = { x: 0, y: 0 };
                    e.velocity.x += ax * dt; e.velocity.y += ay * dt;
                    e.x += ax * dt * dt * 0.5; e.y += ay * dt * dt * 0.5;
                }
            });
        }

        const collisionNearby = getNearbyEntities(proj.x, proj.y);
        let hitSomething = false;

        for (const ent of collisionNearby) {
            if (ent.id === proj.playerId) continue;
            const dx = proj.x - ent.x, dy = proj.y - ent.y, distSq = dx * dx + dy * dy;
            const combinedRadius = proj.radius + ent.radius;

            if (distSq < combinedRadius * combinedRadius) {
                const dmg = proj.damage || 10;
                ent.hp -= dmg;
                if (proj.vampirism && proj.vampirism > 0) {
                    const owner = gameState.players[proj.playerId];
                    if (owner) {
                        const heal = dmg * (proj.vampirism / 100);
                        owner.hp = Math.min(owner.maxHp, owner.hp + heal);
                        io.to(proj.playerId).emit('heal', { amount: heal, hp: owner.hp });
                    }
                }
                if (proj.knockback) {
                    const angle = Math.atan2(dy, dx);
                    if (!ent.velocity) ent.velocity = { x: 0, y: 0 };
                    ent.velocity.x -= Math.cos(angle) * proj.knockback;
                    ent.velocity.y -= Math.sin(angle) * proj.knockback;
                    ent.x -= Math.cos(angle) * proj.knockback * 0.1;
                    ent.y -= Math.sin(angle) * proj.knockback * 0.1;
                }
                hitSomething = true;
                if (ent.type === 'player') io.to(ent.id).emit('hit', { damage: dmg, attackerId: proj.playerId });
                if (ent.hp <= 0) {
                    ent.hp = ent.maxHp; ent.x = Math.random() * 700 + 50; ent.y = Math.random() * 500 + 50; ent.velocity = { x: 0, y: 0 };
                    const attacker = gameState.players[proj.playerId];
                    if (attacker) attacker.kills = (attacker.kills || 0) + 1;
                    if (ent.type === 'enemy') gameState.score += 1;
                    else { ent.deaths = (ent.deaths || 0) + 1; io.emit('killFeed', { killer: proj.playerId, victim: ent.id }); }
                    io.to(proj.playerId).emit('kill', { enemyId: ent.id });
                }

                if (proj.chain_range && proj.chain_range > 0) {
                    const targets = getNearbyEntities(proj.x, proj.y);
                    let nearestChain = null, minChainSq = Infinity;
                    const chainRangeSq = proj.chain_range * proj.chain_range;
                    targets.forEach(t => {
                        if (t.id === ent.id || t.id === proj.playerId) return;
                        const dSq = (t.x - proj.x) ** 2 + (t.y - proj.y) ** 2;
                        if (dSq < minChainSq && dSq <= chainRangeSq) { minChainSq = dSq; nearestChain = t; }
                    });

                    if (nearestChain) {
                        const speed = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2);
                        const angle = Math.atan2(nearestChain.y - proj.y, nearestChain.x - proj.x);
                        proj.velocity.x = Math.cos(angle) * speed; proj.velocity.y = Math.sin(angle) * speed;
                        if (proj.pierce && proj.pierce > 1) { proj.pierce--; hitSomething = false; }
                    } else if (proj.pierce && proj.pierce > 1) { proj.pierce--; hitSomething = false; }
                } else if (proj.pierce && proj.pierce > 1) { proj.pierce--; hitSomething = false; }

                if (hitSomething) break;
            }
        }

        if (hitSomething) {
            if (proj.split_on_death) spawnFragments(proj, proj.split_on_death);
            gameState.projectiles.splice(i, 1);
            removed = true;
        }

        if (!removed) {
            if (proj.lifetime !== undefined) {
                proj.lifetime -= dt;
                if (proj.lifetime <= 0) {
                    if (proj.split_on_death) spawnFragments(proj, proj.split_on_death);
                    gameState.projectiles.splice(i, 1);
                    removed = true;
                }
            }
            if (!removed && (proj.x < -100 || proj.x > 900 || proj.y < -100 || proj.y > 700)) {
                gameState.projectiles.splice(i, 1);
            }
        }
    }

    // --- 3. BROADCAST (Reduced Frequency) ---
    if (now - lastBroadcast > BROADCAST_INTERVAL) {
        lastBroadcast = now;

        const slimState = {
            players: {},
            enemies: gameState.enemies.map(e => ({
                id: e.id,
                x: Math.round(e.x), y: Math.round(e.y),
                vx: Math.round(e.velocity ? e.velocity.x : 0),
                vy: Math.round(e.velocity ? e.velocity.y : 0),
                hp: Math.round(e.hp), maxHp: e.maxHp, radius: e.radius, color: e.color
            })),
            projectiles: gameState.projectiles.map(p => ({
                id: p.id,
                x: Math.round(p.x), y: Math.round(p.y),
                vx: Math.round(p.velocity.x), vy: Math.round(p.velocity.y),
                radius: p.radius, color: p.color,
                orbit_player: p.orbit_player,
                playerId: p.playerId
            })),
            score: gameState.score
        };

        Object.values(gameState.players).forEach(p => {
            slimState.players[p.id] = {
                id: p.id,
                x: Math.round(p.x), y: Math.round(p.y),
                vx: Math.round(p.velocity.x), vy: Math.round(p.velocity.y),
                hp: Math.round(p.hp), maxHp: p.maxHp, color: p.color, radius: p.radius,
                kills: p.kills || 0,
                deaths: p.deaths || 0
            };
        });

        io.emit('state', slimState);
    }
}, TICK_INTERVAL);

server.listen(PORT, () => {
    console.log(`🎮 Game server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
