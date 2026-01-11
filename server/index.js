const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;

// Multiple Game Instances (Rooms/Parties)
const rooms = {};

// --- SPATIAL PARTITIONING CONFIG ---
const PROJECTILE_CAP = 200;
const CELL_SIZE = 100;
const GRID_COLS = 8;
const GRID_ROWS = 6;

function createGameState() {
    return {
        players: {},
        enemies: [],
        projectiles: [],
        spatialGrid: Array.from({ length: GRID_COLS * GRID_ROWS }, () => [])
    };
}

function getCellIndex(x, y) {
    const col = Math.floor(Math.max(0, Math.min(x, 799)) / CELL_SIZE);
    const row = Math.floor(Math.max(0, Math.min(y, 599)) / CELL_SIZE);
    return row * GRID_COLS + col;
}

function updateRoomGrid(gameState) {
    gameState.spatialGrid = Array.from({ length: GRID_COLS * GRID_ROWS }, () => []);
    Object.values(gameState.players).forEach(p => {
        const idx = getCellIndex(p.x, p.y);
        gameState.spatialGrid[idx].push(p);
    });
}

function getNearbyEntities(gameState, x, y) {
    const col = Math.floor(Math.max(0, Math.min(x, 799)) / CELL_SIZE);
    const row = Math.floor(Math.max(0, Math.min(y, 599)) / CELL_SIZE);
    let nearby = [];
    for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
                nearby.push(...gameState.spatialGrid[r * GRID_COLS + c]);
            }
        }
    }
    return nearby;
}

const spawnFragments = (room, parent, count) => {
    for (let i = 0; i < count; i++) {
        if (room.projectiles.length >= PROJECTILE_CAP) break;
        const angle = (Math.PI * 2 / count) * i;
        room.projectiles.push({
            id: `frag_${parent.id}_${i}_${Math.random().toString(36).substr(2, 5)}`,
            playerId: parent.playerId,
            x: parent.x,
            y: parent.y,
            radius: parent.radius * 0.6,
            color: parent.color,
            damage: (parent.damage || 10) * 0.5,
            type: 'projectile',
            velocity: { x: Math.cos(angle) * 200, y: Math.sin(angle) * 200 },
            lifetime: 1.0,
            maxLifetime: 1.0,
            pierce: 1
        });
    }
};

app.get('/health', (req, res) => {
    res.json({ status: 'ok', activeRooms: Object.keys(rooms).length });
});

io.on('connection', (socket) => {
    let currentRoomId = null;

    const leaveRoom = (id) => {
        if (currentRoomId && rooms[currentRoomId]) {
            const room = rooms[currentRoomId];
            delete room.players[id];

            if (Object.keys(room.players).length === 0) {
                delete rooms[currentRoomId];
            } else {
                io.to(currentRoomId).emit('playerLeft', {
                    playerId: id,
                    playerCount: Object.keys(room.players).length
                });
            }
        }
    };

    socket.on('join_room', ({ roomId }) => {
        // CLEANUP: Always leave old room before joining new one
        leaveRoom(socket.id);
        if (currentRoomId) socket.leave(currentRoomId);

        // If no roomId (joining Home Page / Limbo), just exit
        if (!roomId) {
            currentRoomId = null;
            return;
        }

        currentRoomId = roomId;
        socket.join(currentRoomId);

        if (!rooms[currentRoomId]) {
            rooms[currentRoomId] = createGameState();
        }

        const room = rooms[currentRoomId];
        room.players[socket.id] = {
            id: socket.id,
            x: Math.random() * 700 + 50,
            y: Math.random() * 500 + 50,
            radius: 20,
            color: '#00ff9f',
            hp: 100, maxHp: 100,
            type: 'player',
            velocity: { x: 0, y: 0 },
            kills: 0, deaths: 0
        };

        socket.emit('init', { playerId: socket.id, gameState: room });
        io.to(currentRoomId).emit('playerJoined', {
            playerId: socket.id,
            playerCount: Object.keys(room.players).length
        });

        console.log(`Player ${socket.id} joined room ${currentRoomId}`);
    });

    socket.on('move', (velocity) => {
        const room = rooms[currentRoomId];
        if (room && room.players[socket.id]) {
            room.players[socket.id].velocity = velocity;
        }
    });

    socket.on('fire', (data) => {
        const room = rooms[currentRoomId];
        if (room && room.players[socket.id]) {
            const player = room.players[socket.id];
            if (room.projectiles.length < PROJECTILE_CAP) {
                room.projectiles.push({
                    id: `proj_${Math.random().toString(36).substr(2, 9)}_${socket.id}`,
                    playerId: socket.id,
                    x: data.x ?? player.x,
                    y: data.y ?? player.y,
                    radius: data.radius || 5,
                    color: data.color || '#fce83a',
                    damage: data.damage || 25,
                    type: 'projectile',
                    velocity: { x: data.vx || 0, y: data.vy || 0 },
                    homing: data.homing || 0,
                    lifetime: data.lifetime || 5,
                    maxLifetime: data.lifetime || 5,
                    acceleration: data.acceleration || 0,
                    knockback: data.knockback || 0,
                    pierce: data.pierce || 1,
                    orbit_player: data.orbit_player || false,
                    vampirism: data.vampirism || 0,
                    split_on_death: data.split_on_death || 0,
                    attraction_force: data.attraction_force || 0,
                    bounciness: data.bounciness || 0,
                    spin: data.spin || 0,
                    chain_count: data.chain_count || 0,
                    chain_range: data.chain_range || 0,
                    orbit_speed: data.orbit_speed || 3.0,
                    orbit_radius: data.orbit_radius || 60,
                    wave_amplitude: data.wave_amplitude || 0,
                    wave_frequency: data.wave_frequency || 0,
                    explosion_radius: data.explosion_radius || 0,
                    explosion_damage: data.explosion_damage || 0,
                    fade_over_time: data.fade_over_time || false
                });
            }
        }
    });

    socket.on('disconnect', () => {
        leaveRoom(socket.id);
    });
});

const TICK_RATE = 45;
const TICK_INTERVAL = 1000 / TICK_RATE;
const BROADCAST_INTERVAL = 100; // 10Hz
let lastTick = Date.now();
let lastBroadcast = 0;

setInterval(() => {
    const now = Date.now();
    const dt = Math.min((now - lastTick) / 1000, 0.1);
    lastTick = now;

    for (const [roomId, room] of Object.entries(rooms)) {
        updateRoomGrid(room);

        Object.values(room.players).forEach(p => {
            p.x += p.velocity.x * dt;
            p.y += p.velocity.y * dt;
            p.x = Math.max(p.radius, Math.min(800 - p.radius, p.x));
            p.y = Math.max(p.radius, Math.min(600 - p.radius, p.y));
        });

        for (let i = room.projectiles.length - 1; i >= 0; i--) {
            const proj = room.projectiles[i];
            let removed = false;
            const nearby = getNearbyEntities(room, proj.x, proj.y);

            if (proj.orbit_player) {
                const owner = room.players[proj.playerId];
                if (owner) {
                    if (proj.orbitAngle === undefined) {
                        const dx = proj.x - owner.x, dy = proj.y - owner.y;
                        proj.orbitRadius = proj.orbit_radius || Math.sqrt(dx * dx + dy * dy);
                        proj.orbitAngle = Math.atan2(dy, dx);
                    }
                    proj.orbitAngle += (proj.orbit_speed || 4.0) * dt;
                    proj.x = owner.x + Math.cos(proj.orbitAngle) * proj.orbitRadius;
                    proj.y = owner.y + Math.sin(proj.orbitAngle) * proj.orbitRadius;
                    proj.velocity.x = -proj.orbitRadius * (proj.orbit_speed || 4.0) * Math.sin(proj.orbitAngle);
                    proj.velocity.y = proj.orbitRadius * (proj.orbit_speed || 4.0) * Math.cos(proj.orbitAngle);
                } else { proj.orbit_player = false; }
            } else {
                if (proj.acceleration) {
                    proj.velocity.x *= (1 + proj.acceleration * dt);
                    proj.velocity.y *= (1 + proj.acceleration * dt);
                }
                if (proj.spin) {
                    const spinRad = (proj.spin * Math.PI / 180) * dt;
                    const cos = Math.cos(spinRad), sin = Math.sin(spinRad);
                    const nx = proj.velocity.x * cos - proj.velocity.y * sin;
                    const ny = proj.velocity.x * sin + proj.velocity.y * cos;
                    proj.velocity.x = nx; proj.velocity.y = ny;
                }
                if (proj.homing && proj.homing > 0) {
                    let nearest = null, minDistSq = Infinity;
                    nearby.forEach(ent => {
                        if (ent.id === proj.playerId) return;
                        const dSq = (ent.x - proj.x) ** 2 + (ent.y - proj.y) ** 2;
                        if (dSq < minDistSq) { minDistSq = dSq; nearest = ent; }
                    });
                    if (nearest) {
                        const cur = Math.atan2(proj.velocity.y, proj.velocity.x);
                        const tar = Math.atan2(nearest.y - proj.y, nearest.x - proj.x);
                        let diff = tar - cur;
                        while (diff > Math.PI) diff -= Math.PI * 2;
                        while (diff < -Math.PI) diff += Math.PI * 2;
                        const turn = proj.homing * 5 * dt;
                        const newAngle = cur + Math.max(-turn, Math.min(turn, diff));
                        const speed = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2);
                        proj.velocity.x = Math.cos(newAngle) * speed; proj.velocity.y = Math.sin(newAngle) * speed;
                    }
                }
                proj.x += proj.velocity.x * dt;
                proj.y += proj.velocity.y * dt;

                if (proj.wave_amplitude > 0) {
                    const elapsed = proj.maxLifetime - proj.lifetime;
                    const offset = Math.sin(elapsed * proj.wave_frequency) * proj.wave_amplitude;
                    const perpX = -proj.velocity.y, perpY = proj.velocity.x;
                    const mag = Math.sqrt(perpX ** 2 + perpY ** 2) || 1;
                    proj.renderX = proj.x + (perpX / mag) * offset;
                    proj.renderY = proj.y + (perpY / mag) * offset;
                } else {
                    proj.renderX = proj.x;
                    proj.renderY = proj.y;
                }

                if (proj.bounciness) {
                    if (proj.x < proj.radius || proj.x > 800 - proj.radius) proj.velocity.x *= -proj.bounciness;
                    if (proj.y < proj.radius || proj.y > 600 - proj.radius) proj.velocity.y *= -proj.bounciness;
                }
            }

            let hitSomething = false;
            for (const ent of nearby) {
                if (ent.id === proj.playerId || ent.type === 'projectile') continue;
                const dist = Math.sqrt((ent.x - (proj.renderX || proj.x)) ** 2 + (ent.y - (proj.renderY || proj.y)) ** 2);
                if (dist < ent.radius + proj.radius) {
                    ent.hp -= (proj.damage || 10);
                    hitSomething = true;

                    // CHAIN LOGIC
                    if (proj.chain_count > 0 && proj.chain_range > 0) {
                        const targets = nearby.filter(e => e.id !== ent.id && e.id !== proj.playerId && e.type !== 'projectile');
                        targets.sort((a, b) => Math.sqrt((a.x - ent.x) ** 2 + (a.y - ent.y) ** 2) - Math.sqrt((b.x - ent.x) ** 2 + (b.y - ent.y) ** 2));
                        for (let j = 0; j < Math.min(proj.chain_count, targets.length); j++) {
                            const t = targets[j];
                            if (Math.sqrt((t.x - ent.x) ** 2 + (t.y - ent.y) ** 2) < proj.chain_range) {
                                t.hp -= (proj.damage || 10) * 0.5;
                            }
                        }
                    }

                    if (ent.hp <= 0) {
                        ent.hp = ent.maxHp;
                        ent.x = Math.random() * 700 + 50;
                        ent.y = Math.random() * 500 + 50;
                        ent.deaths = (ent.deaths || 0) + 1;
                        if (room.players[proj.playerId]) {
                            room.players[proj.playerId].kills = (room.players[proj.playerId].kills || 0) + 1;
                        }
                    }
                    if (proj.pierce > 1) { proj.pierce--; hitSomething = false; }
                    if (hitSomething) break;
                }
            }

            if (hitSomething || proj.lifetime <= 0) {
                // EXPLOSION LOGIC
                if (proj.explosion_radius > 0) {
                    const targets = nearby.filter(e => e.id !== proj.playerId && e.type !== 'projectile');
                    targets.forEach(t => {
                        const d = Math.sqrt((t.x - (proj.renderX || proj.x)) ** 2 + (t.y - (proj.renderY || proj.y)) ** 2);
                        if (d < proj.explosion_radius) {
                            t.hp -= proj.explosion_damage || proj.damage;
                            if (t.hp <= 0) {
                                t.hp = t.maxHp; t.x = Math.random() * 700 + 50; t.y = Math.random() * 500 + 50;
                                t.deaths = (t.deaths || 0) + 1;
                                if (room.players[proj.playerId]) room.players[proj.playerId].kills++;
                            }
                        }
                    });
                }

                if (proj.split_on_death) spawnFragments(room, proj, proj.split_on_death);
                room.projectiles.splice(i, 1);
                removed = true;
            } else if (proj.x < -100 || proj.x > 900 || proj.y < -100 || proj.y > 700) {
                room.projectiles.splice(i, 1);
                removed = true;
            } else {
                proj.lifetime -= dt;
            }
        }
        if (now - lastBroadcast > BROADCAST_INTERVAL) {
            const slim = {
                players: {},
                projectiles: room.projectiles.filter(p => !p.orbit_player).map(p => ({
                    id: p.id, x: p.x, y: p.y, vx: p.velocity.x, vy: p.velocity.y,
                    radius: p.radius, color: p.color, playerId: p.playerId,
                    wave_amplitude: p.wave_amplitude, wave_frequency: p.wave_frequency,
                    lifetime: p.lifetime, maxLifetime: p.maxLifetime,
                    fade_over_time: p.fade_over_time
                }))
            };
            Object.values(room.players).forEach(p => {
                slim.players[p.id] = {
                    id: p.id, x: p.x, y: p.y, vx: p.velocity.x, vy: p.velocity.y,
                    hp: p.hp, maxHp: p.maxHp, color: p.color, radius: p.radius,
                    kills: p.kills || 0, deaths: p.deaths || 0
                };
            });
            io.to(roomId).emit('state', slim);
        }
    }
    if (now - lastBroadcast > BROADCAST_INTERVAL) lastBroadcast = now;
}, TICK_INTERVAL);

server.listen(PORT, () => console.log(`🎮 Game server running on port ${PORT}`));
