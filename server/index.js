const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const { MongoClient } = require('mongodb');

let db = null;
const MONGODB_URI = process.env.MONGODB_URI;
const memoryUsers = new Map(); // Fallback for when DB is not connected

if (MONGODB_URI) {
    const options = {
        appName: "devrel.vercel.integration",
        maxIdleTimeMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 30000,
    };

    const client = new MongoClient(MONGODB_URI, options);

    client.connect()
        .then(() => {
            db = client.db('CYBERCORE');
            console.log("✅ Connected to MongoDB: CYBERCORE (Persistence Enabled)");
        })
        .catch(err => {
            console.error("❌ MongoDB Connection Error:", err.message);
            console.warn("⚠️ Persistence disabled. Server will use temporary In-Memory storage.");
            db = null;
        });
} else {
    console.warn("⚠️ MONGODB_URI not found. Server running in temporary 'In-Memory' mode.");
}

// --- ACCOUNT HELPERS ---
async function findUser(username) {
    if (db) {
        return await db.collection('users').findOne({ username });
    }
    return memoryUsers.get(username);
}

async function upsertUser(username, userData) {
    if (db) {
        await db.collection('users').updateOne(
            { username },
            { $set: { ...userData, lastSeen: new Date() } },
            { upsert: true }
        );
    } else {
        const existing = memoryUsers.get(username) || {};
        memoryUsers.set(username, { ...existing, ...userData, lastSeen: new Date() });
    }
}

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

function getGridCell(x, y) {
    return `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
}

function updateRoomGrid(room) {
    room.grid = {};
    const allEntities = [
        ...Object.values(room.players),
        ...room.enemies,
        ...room.projectiles
    ];

    allEntities.forEach(ent => {
        const cell = getGridCell(ent.x, ent.y);
        if (!room.grid[cell]) room.grid[cell] = [];
        room.grid[cell].push(ent);
    });
}

function getNearbyEntities(room, x, y, radius = CELL_SIZE) {
    const cells = new Set();
    for (let dx = -radius; dx <= radius; dx += CELL_SIZE) {
        for (let dy = -radius; dy <= radius; dy += CELL_SIZE) {
            cells.add(getGridCell(x + dx, y + dy));
        }
    }
    const nearby = [];
    cells.forEach(cell => {
        if (room.grid[cell]) nearby.push(...room.grid[cell]);
    });
    return nearby;
}

// Socket handler
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    let currentRoomId = null;

    socket.on('ping', () => {
        socket.emit('pong', { time: Date.now() });
    });

    socket.onAny((eventName, ...args) => {
        console.log(`[SERVER] Received: ${eventName}`, args);
    });

    socket.on('login', async ({ username }) => {
        console.log(`[AUTH] Login Request: ${username}`);

        try {
            const user = await findUser(username);

            if (!user) {
                console.log(`[AUTH] Login Failed: ${username} not found`);
                socket.emit('login_response', { success: false, error: "User not found. Please click Signup." });
                return;
            }

            console.log(`[AUTH] Login Success: ${username}`);
            socket.data.username = username;

            socket.emit('login_response', {
                success: true,
                isNew: false,
                profile: {
                    username: user.username,
                    level: user.level || 1,
                    xp: user.xp || 0,
                    maxXp: user.maxXp || 100,
                    money: user.money || 0,
                    unlocks: user.unlocks || ['speed', 'damage'],
                    limits: user.limits || { speed: 200, damage: 5 }
                }
            });
        } catch (err) {
            console.error("[AUTH] Login Error:", err.message);
            socket.emit('login_response', { success: false, error: "Authentication system error" });
        }
    });

    socket.on('signup', async ({ username }) => {
        console.log(`[AUTH] Signup Request: ${username}`);

        try {
            const existing = await findUser(username);

            if (existing) {
                console.log(`[AUTH] Signup Failed: ${username} exists`);
                socket.emit('login_response', { success: false, error: "Name taken. Use another or Login." });
                return;
            }

            const newUser = {
                username,
                level: 1,
                xp: 0,
                maxXp: 100,
                money: 0,
                unlocks: ['speed', 'damage'],
                limits: { speed: 200, damage: 5 },
                createdAt: new Date()
            };

            await upsertUser(username, newUser);
            console.log(`[AUTH] Signup Success: ${username}`);

            socket.data.username = username;
            socket.emit('login_response', {
                success: true,
                isNew: true,
                profile: newUser
            });
        } catch (err) {
            console.error("[AUTH] Signup Error:", err.message);
            socket.emit('login_response', { success: false, error: "Registration failed" });
        }
    });

    socket.on('join_room', ({ roomId, settings, profile }) => {
        leaveRoom(socket.id);
        if (currentRoomId) socket.leave(currentRoomId);

        if (!roomId) {
            currentRoomId = null;
            return;
        }

        currentRoomId = roomId;
        socket.join(currentRoomId);

        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: {},
                projectiles: [],
                enemies: [],
                grid: {},
                lastUpdate: Date.now(),
                score: 0
            };
        }

        const room = rooms[roomId];
        room.players[socket.id] = {
            id: socket.id,
            username: socket.data.username || 'Guest',
            x: 400,
            y: 300,
            radius: 20,
            hp: 100,
            maxHp: 100,
            color: '#00ff9f',
            velocity: { x: 0, y: 0 },
            kills: 0,
            deaths: 0,
            // Sync progression values to room state
            level: profile?.level || 1,
            xp: profile?.xp || 0,
            maxXp: profile?.maxXp || 100,
            money: profile?.money || 0,
            unlocks: profile?.unlocks || ['speed', 'damage'],
            limits: profile?.limits || { speed: 200, damage: 5 }
        };

        socket.emit('init', {
            playerId: socket.id,
            gameState: {
                entities: [...Object.values(room.players), ...room.enemies],
                projectiles: room.projectiles,
                score: room.score
            }
        });

        console.log(`Player ${socket.id} joined room ${currentRoomId}`);
    });

    socket.on('save_profile', ({ profile }) => {
        if (socket.data.username && profile) {
            saveProgress(socket.data.username, profile);

            // Sync current room player if active
            const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
            if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
                const p = rooms[roomId].players[socket.id];
                p.level = profile.level;
                p.xp = profile.xp;
                p.maxXp = profile.maxXp;
                p.money = profile.money;
                p.unlocks = profile.unlocks;
                p.limits = profile.limits;
            }
        }
    });

    socket.on('move', (data) => {
        if (currentRoomId && rooms[currentRoomId]) {
            const player = rooms[currentRoomId].players[socket.id];
            if (player) {
                player.velocity.x = data.x;
                player.velocity.y = data.y;
            }
        }
    });

    socket.on('fire', (data) => {
        if (currentRoomId && rooms[currentRoomId]) {
            const room = rooms[currentRoomId];
            if (room.projectiles.length > PROJECTILE_CAP) {
                room.projectiles.shift(); // Max projectile limit
            }
            room.projectiles.push({
                ...data,
                id: Math.random().toString(36).substr(2, 9),
                playerId: socket.id,
                type: 'projectile',
                velocity: { x: data.vx, y: data.vy },
                lifetime: data.lifetime || 5,
                maxLifetime: data.lifetime || 5,
                radius: data.radius || 5
            });
        }
    });

    function leaveRoom(id) {
        for (const roomId in rooms) {
            if (rooms[roomId].players[id]) {
                delete rooms[roomId].players[id];
                if (Object.keys(rooms[roomId].players).length === 0) {
                    delete rooms[roomId];
                }
            }
        }
    }

    socket.on('disconnect', () => {
        leaveRoom(socket.id);
    });
});

async function saveProgress(username, stats) {
    if (!username) return;
    try {
        await upsertUser(username, stats);
        if (!db) console.log(`💾 [Memory] Saved ${username} (${stats.level}/${Math.floor(stats.xp)}xp)`);
    } catch (err) {
        console.error(`❌ [Save] Failed to save for ${username}:`, err.message);
    }
}

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

        // Update Physics
        room.projectiles.forEach((proj, i) => {
            proj.lifetime -= dt;
            if (proj.lifetime <= 0) {
                room.projectiles.splice(i, 1);
                return;
            }

            const nearby = getNearbyEntities(room, proj.x, proj.y, proj.radius + 50);

            // Orbit logic
            if (proj.orbit_player) {
                const owner = room.players[proj.playerId];
                if (owner) {
                    if (proj.orbitAngle === undefined) {
                        proj.orbitAngle = Math.atan2(proj.y - owner.y, proj.x - owner.x);
                        proj.orbitRadius = Math.sqrt((proj.x - owner.x) ** 2 + (proj.y - owner.y) ** 2) || (proj.orbit_radius || 100);
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
                        if (ent.id === proj.playerId || ent.type === 'projectile') return;
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
                    const offset = Math.sin(elapsed * (proj.wave_frequency || 10)) * proj.wave_amplitude;
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

            // Collisions
            nearby.forEach(ent => {
                if (ent.id === proj.playerId || ent.type === 'projectile') return;
                const dist = Math.sqrt((ent.x - (proj.renderX || proj.x)) ** 2 + (ent.y - (proj.renderY || proj.y)) ** 2);
                if (dist < ent.radius + proj.radius) {
                    ent.hp -= (proj.damage || 10);

                    // Knockback
                    if (proj.knockback > 0) {
                        const angle = Math.atan2(ent.y - (proj.renderY || proj.y), ent.x - (proj.renderX || proj.x));
                        ent.velocity.x += Math.cos(angle) * proj.knockback;
                        ent.velocity.y += Math.sin(angle) * proj.knockback;
                    }

                    // Explosion
                    if (proj.explosion_radius > 0) {
                        const exRadius = proj.explosion_radius;
                        const targets = getNearbyEntities(room, proj.x, proj.y, exRadius);
                        targets.forEach(t => {
                            if (t.id === proj.playerId || t.type === 'projectile') return;
                            const dSq = (t.x - proj.x) ** 2 + (t.y - proj.y) ** 2;
                            if (dSq < exRadius ** 2) {
                                t.hp -= (proj.explosion_damage || 15);
                                const exAngle = Math.atan2(t.y - proj.y, t.x - proj.x);
                                t.velocity.x += Math.cos(exAngle) * 50;
                                t.velocity.y += Math.sin(exAngle) * 50;
                            }
                        });
                        io.to(roomId).emit('visual_effect', {
                            type: 'explosion', x: proj.x, y: proj.y, color: proj.color || '#ff6e00', strength: 25, radius: exRadius
                        });
                    }

                    // Cleanup projectile unless piercing
                    if (proj.pierce && proj.pierce > 1) {
                        proj.pierce--;
                    } else {
                        room.projectiles.splice(i, 1);
                    }

                    // Impact FX (if not already handled by explosion)
                    if (!(proj.explosion_radius > 0)) {
                        io.to(roomId).emit('visual_effect', {
                            type: 'impact', x: ent.x, y: ent.y, color: ent.color, strength: 15, radius: 80
                        });
                    }

                    if (ent.hp <= 0) {
                        ent.hp = ent.maxHp;
                        ent.x = Math.random() * 700 + 50;
                        ent.y = Math.random() * 500 + 50;
                        if (room.players[proj.playerId]) {
                            const killer = room.players[proj.playerId];
                            killer.kills++;
                            killer.xp += 50;
                            killer.money += 25;
                            if (killer.xp >= killer.maxXp) {
                                killer.level++;
                                killer.xp -= killer.maxXp;
                                killer.maxXp = Math.floor(killer.maxXp * 1.5);
                                io.to(roomId).emit('visual_effect', {
                                    type: 'levelup', x: killer.x, y: killer.y, color: '#ffd700',
                                    level: killer.level, xp: killer.xp, maxXp: killer.maxXp, money: killer.money, playerId: killer.id
                                });
                            }
                            saveProgress(killer.username, killer);
                        }
                    }
                }
            });
        });

        // Player movement
        Object.values(room.players).forEach(p => {
            p.x += p.velocity.x * dt;
            p.y += p.velocity.y * dt;
            p.x = Math.max(p.radius, Math.min(800 - p.radius, p.x));
            p.y = Math.max(p.radius, Math.min(600 - p.radius, p.y));
        });
    }

    if (now - lastBroadcast > BROADCAST_INTERVAL) {
        lastBroadcast = now;
        for (const [roomId, room] of Object.entries(rooms)) {
            io.to(roomId).emit('state', {
                players: room.players,
                enemies: room.enemies,
                projectiles: room.projectiles,
                score: room.score
            });
        }
    }
}, TICK_INTERVAL);

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
