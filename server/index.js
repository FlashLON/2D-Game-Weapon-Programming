const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const admin = require('firebase-admin');

// --- DATABASE SETUP (FIREBASE) ---
let firebaseDb = null;
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL || "https://cybercore-2124b-default-rtdb.firebaseio.com/";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

const memoryUsers = new Map(); // Fallback for when Firebase is not connected

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    try {
        // Check if Firebase is already initialized
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: FIREBASE_PROJECT_ID,
                    clientEmail: FIREBASE_CLIENT_EMAIL,
                    privateKey: FIREBASE_PRIVATE_KEY,
                }),
                databaseURL: FIREBASE_DATABASE_URL
            });
        }
        firebaseDb = admin.database();
        console.log("✅ Connected to Firebase: " + FIREBASE_PROJECT_ID);
    } catch (err) {
        console.error("❌ Firebase Initialization Error:", err.message);
        console.warn("⚠️ Persistence disabled. Server will use temporary In-Memory storage.");
        firebaseDb = null;
    }
} else {
    console.warn("⚠️ Firebase Credentials missing in .env. Server running in 'In-Memory' mode.");
    console.warn("Required env variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL");
}

// --- ACCOUNT HELPERS ---
async function findUser(username) {
    if (!username || username.trim() === '') return null;

    if (firebaseDb) {
        try {
            const snapshot = await firebaseDb.ref(`users/${username}`).once('value');
            return snapshot.val();
        } catch (err) {
            console.error(`❌ Firebase error reading user ${username}:`, err.message);
            return memoryUsers.get(username) || null;
        }
    }
    return memoryUsers.get(username) || null;
}

async function upsertUser(username, userData) {
    if (!username || username.trim() === '') return;

    if (firebaseDb) {
        try {
            await firebaseDb.ref(`users/${username}`).update({
                ...userData,
                lastSeen: new Date().toISOString()
            });
        } catch (err) {
            console.error(`❌ Firebase error writing user ${username}:`, err.message);
            // Fallback to memory
            const existing = memoryUsers.get(username) || {};
            memoryUsers.set(username, { ...existing, ...userData, lastSeen: new Date().toISOString() });
        }
    } else {
        const existing = memoryUsers.get(username) || {};
        memoryUsers.set(username, { ...existing, ...userData, lastSeen: new Date().toISOString() });
    }
}

async function getGlobalLeaderboard() {
    if (firebaseDb) {
        try {
            const snapshot = await firebaseDb.ref('users')
                .orderByChild('level')
                .limitToLast(10)
                .once('value');

            const data = snapshot.val();
            if (!data) return getMemoryLeaderboard();

            return Object.values(data)
                .filter(u => u && u.username)
                .sort((a, b) => (b.level || 0) - (a.level || 0))
                .slice(0, 10)
                .map(u => ({ username: u.username, level: u.level || 1, money: u.money || 0 }));
        } catch (e) {
            console.error("❌ Leaderboard Fetch Error:", e.message);
            return getMemoryLeaderboard();
        }
    }
    return getMemoryLeaderboard();
}

function getMemoryLeaderboard() {
    // Memory fallback
    return Array.from(memoryUsers.values())
        .filter(u => u && u.username)
        .sort((a, b) => (b.level || 1) - (a.level || 1))
        .slice(0, 10)
        .map(u => ({ username: u.username, level: u.level || 1, money: u.money || 0 }));
}

// Global leaderboard update every 30 seconds
setInterval(async () => {
    const leaderboard = await getGlobalLeaderboard();
    io.emit('global_leaderboard', leaderboard);
}, 30000);

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

// --- HEALTH CHECK ENDPOINT ---
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        firebase: firebaseDb ? 'connected' : 'disconnected',
        mode: firebaseDb ? 'Firebase' : 'In-Memory',
        activeRooms: Object.keys(rooms).length,
        uptime: process.uptime()
    });
});

app.get('/api/status', (req, res) => {
    const totalPlayers = Object.values(rooms).reduce((sum, r) => sum + Object.keys(r.players).length, 0);
    const totalProjectiles = Object.values(rooms).reduce((sum, r) => sum + r.projectiles.length, 0);

    res.json({
        timestamp: new Date().toISOString(),
        database: firebaseDb ? 'Firebase connected' : 'Memory storage (no persistence)',
        activeRooms: Object.keys(rooms).length,
        totalPlayers,
        totalProjectiles,
        memoryUsers: memoryUsers.size,
        uptime: `${Math.floor(process.uptime() / 60)}m`
    });
});

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
            if (!username || username.trim().length === 0) {
                socket.emit('login_response', { success: false, error: "Username cannot be empty" });
                return;
            }

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

            // Immediately send leaderboard
            const leaderboard = await getGlobalLeaderboard();
            socket.emit('global_leaderboard', leaderboard);
        } catch (err) {
            console.error("[AUTH] Login Error:", err.message);
            socket.emit('login_response', { success: false, error: "Authentication system error: " + err.message });
        }
    });

    socket.on('signup', async ({ username }) => {
        console.log(`[AUTH] Signup Request: ${username}`);

        try {
            if (!username || username.trim().length === 0) {
                socket.emit('login_response', { success: false, error: "Username cannot be empty" });
                return;
            }

            if (username.length > 20) {
                socket.emit('login_response', { success: false, error: "Username too long (max 20 chars)" });
                return;
            }

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
                unlocks: ['speed', 'damage', 'hp', 'cooldown'],
                limits: { speed: 200, damage: 5, hp: 100, cooldown: 0.5 },
                lastUpgradeLevel: {},
                createdAt: new Date().toISOString()
            };

            await upsertUser(username, newUser);
            console.log(`[AUTH] Signup Success: ${username}`);

            socket.data.username = username;
            socket.emit('login_response', {
                success: true,
                isNew: true,
                profile: newUser
            });

            // Immediately send leaderboard
            const leaderboard = await getGlobalLeaderboard();
            socket.emit('global_leaderboard', leaderboard);
        } catch (err) {
            console.error("[AUTH] Signup Error:", err.message);
            socket.emit('login_response', { success: false, error: "Registration failed: " + err.message });
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
                id: roomId,
                mode: settings?.mode || 'pvp', // 'pvp' or 'coop'
                players: {},
                projectiles: [],
                enemies: [],
                grid: {},
                lastUpdate: Date.now(),
                score: 0,
                wave: 0,
                waveState: 'idle', // 'idle', 'spawning', 'fight', 'boss'
                waveTimer: 0
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

    // --- SAVED CODE HANDLERS ---
    socket.on('save_code', async ({ username, codeName, codeContent }) => {
        console.log(`[CODES] Save Code Request: ${username} - "${codeName}"`);

        try {
            if (!socket.data.username || socket.data.username !== username) {
                socket.emit('save_code_response', { success: false, error: "Authentication failed" });
                return;
            }

            if (!codeName || codeName.trim().length === 0) {
                socket.emit('save_code_response', { success: false, error: "Code name cannot be empty" });
                return;
            }

            if (!codeContent || codeContent.trim().length === 0) {
                socket.emit('save_code_response', { success: false, error: "Code content cannot be empty" });
                return;
            }

            const codeId = 'code_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const codeData = {
                id: codeId,
                name: codeName.trim(),
                code: codeContent,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isDefault: false
            };

            if (firebaseDb) {
                try {
                    await firebaseDb.ref(`users/${username}/saved_codes/${codeId}`).set(codeData);
                    console.log(`✅ Code saved for ${username}: ${codeName}`);
                } catch (err) {
                    throw err;
                }
            } else {
                // Memory fallback
                const user = memoryUsers.get(username) || {};
                if (!user.saved_codes) user.saved_codes = {};
                user.saved_codes[codeId] = codeData;
                memoryUsers.set(username, user);
            }

            socket.emit('save_code_response', { success: true, codeId, message: `Code saved as "${codeName}"` });
        } catch (err) {
            console.error("[CODES] Save Error:", err.message);
            socket.emit('save_code_response', { success: false, error: "Failed to save code: " + err.message });
        }
    });

    socket.on('fetch_saved_codes', async ({ username }) => {
        console.log(`[CODES] Fetch Saved Codes Request: ${username}`);

        try {
            if (!socket.data.username || socket.data.username !== username) {
                socket.emit('fetch_saved_codes_response', { success: false, error: "Authentication failed", codes: [] });
                return;
            }

            let codes = [];

            if (firebaseDb) {
                try {
                    const snapshot = await firebaseDb.ref(`users/${username}/saved_codes`).once('value');
                    const data = snapshot.val();
                    codes = data ? Object.values(data) : [];
                    console.log(`✅ Fetched ${codes.length} codes for ${username}`);
                } catch (err) {
                    throw err;
                }
            } else {
                // Memory fallback
                const user = memoryUsers.get(username);
                codes = user?.saved_codes ? Object.values(user.saved_codes) : [];
            }

            socket.emit('fetch_saved_codes_response', { success: true, codes });
        } catch (err) {
            console.error("[CODES] Fetch Error:", err.message);
            socket.emit('fetch_saved_codes_response', { success: false, error: "Failed to fetch codes: " + err.message, codes: [] });
        }
    });

    socket.on('load_code', async ({ username, codeId }) => {
        console.log(`[CODES] Load Code Request: ${username} - ${codeId}`);

        try {
            if (!socket.data.username || socket.data.username !== username) {
                socket.emit('load_code_response', { success: false, error: "Authentication failed" });
                return;
            }

            if (!codeId) {
                socket.emit('load_code_response', { success: false, error: "Code ID is required" });
                return;
            }

            let code = null;

            if (firebaseDb) {
                try {
                    const snapshot = await firebaseDb.ref(`users/${username}/saved_codes/${codeId}`).once('value');
                    code = snapshot.val();
                } catch (err) {
                    throw err;
                }
            } else {
                // Memory fallback
                const user = memoryUsers.get(username);
                code = user?.saved_codes?.[codeId] || null;
            }

            if (!code) {
                socket.emit('load_code_response', { success: false, error: "Code not found" });
                return;
            }

            console.log(`✅ Loaded code for ${username}: ${code.name}`);
            socket.emit('load_code_response', { success: true, code });
        } catch (err) {
            console.error("[CODES] Load Error:", err.message);
            socket.emit('load_code_response', { success: false, error: "Failed to load code: " + err.message });
        }
    });

    socket.on('delete_code', async ({ username, codeId }) => {
        console.log(`[CODES] Delete Code Request: ${username} - ${codeId}`);

        try {
            if (!socket.data.username || socket.data.username !== username) {
                socket.emit('delete_code_response', { success: false, error: "Authentication failed" });
                return;
            }

            if (!codeId) {
                socket.emit('delete_code_response', { success: false, error: "Code ID is required" });
                return;
            }

            if (firebaseDb) {
                try {
                    await firebaseDb.ref(`users/${username}/saved_codes/${codeId}`).remove();
                    console.log(`✅ Deleted code for ${username}: ${codeId}`);
                } catch (err) {
                    throw err;
                }
            } else {
                // Memory fallback
                const user = memoryUsers.get(username);
                if (user?.saved_codes?.[codeId]) {
                    delete user.saved_codes[codeId];
                    memoryUsers.set(username, user);
                }
            }

            socket.emit('delete_code_response', { success: true, message: "Code deleted" });
        } catch (err) {
            console.error("[CODES] Delete Error:", err.message);
            socket.emit('delete_code_response', { success: false, error: "Failed to delete code: " + err.message });
        }
    });

    socket.on('rename_code', async ({ username, codeId, newName }) => {
        console.log(`[CODES] Rename Code Request: ${username} - ${codeId} -> "${newName}"`);

        try {
            if (!socket.data.username || socket.data.username !== username) {
                socket.emit('rename_code_response', { success: false, error: "Authentication failed" });
                return;
            }

            if (!codeId) {
                socket.emit('rename_code_response', { success: false, error: "Code ID is required" });
                return;
            }

            if (!newName || newName.trim().length === 0) {
                socket.emit('rename_code_response', { success: false, error: "Code name cannot be empty" });
                return;
            }

            if (firebaseDb) {
                try {
                    await firebaseDb.ref(`users/${username}/saved_codes/${codeId}`).update({
                        name: newName.trim(),
                        updatedAt: new Date().toISOString()
                    });
                    console.log(`✅ Renamed code for ${username}: ${codeId}`);
                } catch (err) {
                    throw err;
                }
            } else {
                // Memory fallback
                const user = memoryUsers.get(username);
                if (user?.saved_codes?.[codeId]) {
                    user.saved_codes[codeId].name = newName.trim();
                    user.saved_codes[codeId].updatedAt = new Date().toISOString();
                    memoryUsers.set(username, user);
                }
            }

            socket.emit('rename_code_response', { success: true, message: "Code renamed" });
        } catch (err) {
            console.error("[CODES] Rename Error:", err.message);
            socket.emit('rename_code_response', { success: false, error: "Failed to rename code: " + err.message });
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
    if (!username || !stats) return;
    try {
        await upsertUser(username, stats);
        const mode = firebaseDb ? '☁️ [Firebase]' : '💾 [Memory]';
        console.log(`${mode} Saved ${username} (Level ${stats.level}/${Math.floor(stats.xp)}xp)`);
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
        // --- WAVE MODE LOGIC ---
        if (room.mode === 'coop') {
            room.waveTimer += dt;

            if (room.waveState === 'idle' && Object.keys(room.players).length > 0) {
                room.wave = (room.wave || 0) + 1;
                room.waveState = 'spawning';
                room.waveTimer = 0;
                io.to(roomId).emit('wave_start', { wave: room.wave });
            }

            if (room.waveState === 'spawning') {
                const maxEnemies = 5 + (room.wave * 2);
                if (room.enemies.length < maxEnemies && Math.random() < 0.1) {
                    const side = Math.floor(Math.random() * 4);
                    let ex = 0, ey = 0;
                    if (side === 0) { ex = Math.random() * 800; ey = -50; }
                    else if (side === 1) { ex = 850; ey = Math.random() * 600; }
                    else if (side === 2) { ex = Math.random() * 800; ey = 650; }
                    else { ex = -50; ey = Math.random() * 600; }

                    // Enemy Variety
                    const rand = Math.random();
                    let type = 'standard';
                    let radius = 20;
                    let color = '#ff0055';
                    let speed = 50 + (room.wave * 2);
                    let hp = 30 + (room.wave * 15);

                    if (room.wave > 3 && rand > 0.8) {
                        type = 'tank';
                        radius = 35;
                        color = '#880022';
                        speed *= 0.6;
                        hp *= 2.5;
                    } else if (room.wave > 5 && rand > 0.6) {
                        type = 'speedster';
                        radius = 15;
                        color = '#ffaa00';
                        speed *= 1.5;
                        hp *= 0.6;
                    } else if (room.wave > 7 && rand > 0.4) {
                        type = 'sniper';
                        radius = 20;
                        color = '#00ff00'; // Green
                        speed *= 0.8;
                        hp *= 0.8;
                    }

                    room.enemies.push({
                        id: 'enemy_' + Math.random().toString(36).substr(2, 5),
                        type: 'enemy',
                        enemyType: type,
                        x: ex, y: ey,
                        radius: radius,
                        hp: hp,
                        maxHp: hp,
                        color: color,
                        velocity: { x: 0, y: 0 },
                        speed: speed,
                        shootTimer: Math.random() * 2 // Desync shots
                    });
                }
                if (room.waveTimer > 5) room.waveState = 'fight';
            }

            // Boss Spawn every 5 waves
            if (room.wave > 0 && room.wave % 5 === 0 && room.waveState === 'fight' && !room.enemies.some(e => e.isBoss)) {
                room.enemies.push({
                    id: 'boss_' + room.wave,
                    type: 'enemy',
                    isBoss: true,
                    x: 400, y: -100,
                    radius: 70,
                    hp: 800 * (room.wave / 5),
                    maxHp: 800 * (room.wave / 5),
                    color: '#ff00ff',
                    velocity: { x: 0, y: 0 },
                    speed: 45,
                    bossTimer: 0,
                    bossState: 'chase' // chase, rapid_fire, charge
                });
                io.to(roomId).emit('boss_spawn', { wave: room.wave, hp: 800 * (room.wave / 5) });
            }

            if (room.waveState === 'fight' && room.enemies.length === 0) {
                room.waveState = 'idle';
                room.waveTimer = 0;
            }
        }

        updateRoomGrid(room);

        // Update Physics
        room.projectiles.forEach((proj, i) => {
            proj.lifetime -= dt;
            if (proj.lifetime <= 0) {
                // Split on Death
                if (proj.split_on_death > 0) {
                    for (let s = 0; s < proj.split_on_death; s++) {
                        const angle = (Math.PI * 2 / proj.split_on_death) * s;
                        room.projectiles.push({
                            id: Math.random().toString(36).substr(2, 9),
                            playerId: proj.playerId,
                            type: 'projectile',
                            x: proj.x, y: proj.y,
                            velocity: { x: Math.cos(angle) * 300, y: Math.sin(angle) * 300 },
                            lifetime: 2,
                            maxLifetime: 2,
                            radius: (proj.radius || 5) * 0.6,
                            damage: (proj.damage || 10) * 0.5,
                            color: proj.color
                        });
                    }
                }
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

                if (proj.wave_amplitude && proj.wave_amplitude > 0) {
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

                // Attraction Force
                if (proj.attraction_force > 0) {
                    nearby.forEach(ent => {
                        if (ent.id === proj.playerId || ent.type === 'projectile') return;
                        const dx = proj.x - ent.x;
                        const dy = proj.y - ent.y;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < 200 * 200) {
                            const mag = Math.sqrt(dSq) || 1;
                            const force = (proj.attraction_force * 100) / (mag + 1);
                            ent.velocity.x += (dx / mag) * force * dt;
                            ent.velocity.y += (dy / mag) * force * dt;
                        }
                    });
                }
            }

            // Collisions
            nearby.forEach(ent => {
                if (ent.id === proj.playerId || ent.type === 'projectile') return;
                const dist = Math.sqrt((ent.x - (proj.renderX || proj.x)) ** 2 + (ent.y - (proj.renderY || proj.y)) ** 2);
                if (dist < ent.radius + proj.radius) {
                    const dmg = (proj.damage || 10);
                    ent.hp -= dmg;

                    // Vampirism
                    if (proj.vampirism > 0 && room.players[proj.playerId]) {
                        const shooter = room.players[proj.playerId];
                        shooter.hp = Math.min(shooter.maxHp, shooter.hp + (dmg * proj.vampirism));
                    }

                    // Knockback
                    if (proj.knockback > 0) {
                        const angle = Math.atan2(ent.y - (proj.renderY || proj.y), ent.x - (proj.renderX || proj.x));
                        ent.velocity.x += Math.cos(angle) * proj.knockback;
                        ent.velocity.y += Math.sin(angle) * proj.knockback;
                    }

                    // Enemy Projectile Collision
                    if (proj.isEnemyProjectile && room.players[ent.id]) {
                        // It hit a player! Projectiles from enemies
                        ent.hp -= (proj.damage || 5);
                        room.projectiles.splice(i, 1);

                        // Visual hit
                        io.to(roomId).emit('visual_effect', { type: 'impact', x: ent.x, y: ent.y, color: '#ff0055', strength: 10 });

                        if (ent.hp <= 0) {
                            ent.hp = ent.maxHp;
                            ent.deaths = (ent.deaths || 0) + 1;
                            ent.x = 400; ent.y = 300;
                        }
                        return; // Done with this projectile
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
                        if (room.mode === 'coop') {
                            room.enemies.splice(room.enemies.indexOf(ent), 1);
                        } else {
                            ent.hp = ent.maxHp;
                            ent.x = Math.random() * 700 + 50;
                            ent.y = Math.random() * 500 + 50;
                        }
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

        // Standalone Enemy AI & Movement
        room.enemies.forEach(ent => {
            let nearestPlayer = null;
            let minDist = Infinity;
            Object.values(room.players).forEach(p => {
                // Ignore dead players
                if (p.dead || p.x < -1000) return;

                const d = Math.sqrt((p.x - ent.x) ** 2 + (p.y - ent.y) ** 2);
                if (d < minDist) { minDist = d; nearestPlayer = p; }
            });

            if (nearestPlayer) {
                if (ent.isBoss) {
                    // BOSS AI
                    ent.bossTimer = (ent.bossTimer || 0) + dt;

                    if (ent.bossState === 'chase') {
                        const angle = Math.atan2(nearestPlayer.y - ent.y, nearestPlayer.x - ent.x);
                        ent.velocity.x += Math.cos(angle) * ent.speed * dt;
                        ent.velocity.y += Math.sin(angle) * ent.speed * dt;

                        // Switch to attack every 4 seconds
                        if (ent.bossTimer > 4) {
                            ent.bossTimer = 0;
                            ent.bossState = Math.random() < 0.5 ? 'rapid_fire' : 'charge';
                        }
                    } else if (ent.bossState === 'rapid_fire') {
                        ent.velocity.x *= 0.9;
                        ent.velocity.y *= 0.9;

                        if (ent.bossTimer % 0.2 < dt) { // Fire every 0.2s
                            const angle = Math.atan2(nearestPlayer.y - ent.y, nearestPlayer.x - ent.x) + (Math.random() - 0.5) * 0.5;
                            room.projectiles.push({
                                id: 'bp_' + Math.random(),
                                playerId: 'boss',
                                type: 'projectile',
                                isEnemyProjectile: true,
                                x: ent.x, y: ent.y,
                                velocity: { x: Math.cos(angle) * 400, y: Math.sin(angle) * 400 },
                                lifetime: 3,
                                radius: 8,
                                damage: 20,
                                color: '#ff00ff'
                            });
                            io.to(roomId).emit('visual_effect', { type: 'boss_fire', x: ent.x, y: ent.y });
                        }

                        if (ent.bossTimer > 2) {
                            ent.bossTimer = 0;
                            ent.bossState = 'chase';
                        }
                    } else if (ent.bossState === 'charge') {
                        if (ent.bossTimer < 0.5) {
                            // Telegraph (stop and shake?)
                            ent.velocity.x *= 0.9; ent.velocity.y *= 0.9;
                        } else if (ent.bossTimer < 0.6) {
                            // Launch
                            const angle = Math.atan2(nearestPlayer.y - ent.y, nearestPlayer.x - ent.x);
                            ent.velocity.x = Math.cos(angle) * 800;
                            ent.velocity.y = Math.sin(angle) * 800;
                        }

                        if (ent.bossTimer > 1.5) {
                            ent.bossTimer = 0;
                            ent.bossState = 'chase';
                        }
                    }

                } else if (ent.enemyType === 'sniper') {
                    // SNIPER AI
                    const dist = Math.sqrt((nearestPlayer.x - ent.x) ** 2 + (nearestPlayer.y - ent.y) ** 2);
                    const angle = Math.atan2(nearestPlayer.y - ent.y, nearestPlayer.x - ent.x);

                    if (dist > 400) {
                        // Approach
                        ent.velocity.x += Math.cos(angle) * ent.speed * dt;
                        ent.velocity.y += Math.sin(angle) * ent.speed * dt;
                    } else if (dist < 250) {
                        // Back away
                        ent.velocity.x -= Math.cos(angle) * ent.speed * dt;
                        ent.velocity.y -= Math.sin(angle) * ent.speed * dt;
                    }

                    // Shoot
                    ent.shootTimer = (ent.shootTimer || 0) + dt;
                    if (ent.shootTimer > 3) {
                        ent.shootTimer = 0;
                        room.projectiles.push({
                            id: 'sp_' + Math.random(),
                            playerId: 'enemy',
                            type: 'projectile',
                            isEnemyProjectile: true,
                            x: ent.x, y: ent.y,
                            velocity: { x: Math.cos(angle) * 700, y: Math.sin(angle) * 700 },
                            lifetime: 2,
                            radius: 6,
                            damage: 40,
                            color: '#00ff00'
                        });
                        io.to(roomId).emit('visual_effect', { type: 'impact', x: ent.x, y: ent.y, color: '#00ff00' });
                    }

                } else {
                    // STANDARD ENEMY AI
                    const angle = Math.atan2(nearestPlayer.y - ent.y, nearestPlayer.x - ent.x);
                    const force = ent.speed;
                    ent.velocity.x += Math.cos(angle) * force * dt;
                    ent.velocity.y += Math.sin(angle) * force * dt;
                }
            }

            ent.velocity.x *= 0.95;
            ent.velocity.y *= 0.95;
            ent.x += ent.velocity.x * dt;
            ent.y += ent.velocity.y * dt;

            // Player Damage on Touch
            Object.values(room.players).forEach(p => {
                const dist = Math.sqrt((p.x - ent.x) ** 2 + (p.y - ent.y) ** 2);
                if (dist < p.radius + ent.radius) {
                    p.hp -= ent.isBoss ? 1 : 0.5;
                    if (p.hp <= 0) {
                        if (room.mode === 'coop') {
                            p.dead = true;
                            p.hp = 0;
                            p.x = -99999; // Move away
                            p.deaths = (p.deaths || 0) + 1;

                            // Check Wipe
                            const alive = Object.values(room.players).filter((pl) => !pl.dead);
                            if (alive.length === 0) {
                                // RESET GAME
                                room.wave = 0; // Will increment to 1 next tick
                                room.waveState = 'idle';
                                room.enemies = [];
                                room.projectiles = [];
                                Object.values(room.players).forEach((pl) => {
                                    pl.dead = false;
                                    pl.hp = pl.maxHp;
                                    pl.x = 400; pl.y = 300;
                                    pl.velocity = { x: 0, y: 0 };
                                });
                                io.to(roomId).emit('visual_effect', { type: 'wave_start', wave: 1 }); // Visual Reset
                            }
                        } else {
                            p.hp = p.maxHp;
                            p.deaths = (p.deaths || 0) + 1;
                            p.x = 400; p.y = 300;
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
                score: room.score,
                wave: room.wave,
                waveState: room.waveState
            });
        }
    }
}, TICK_INTERVAL);

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
