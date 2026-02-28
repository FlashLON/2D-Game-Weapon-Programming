const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- HASHING HELPER ---
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// --- DATABASE SETUP (FIREBASE) ---
let firebaseDb = null;
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL || "https://cybercore-2124b-default-rtdb.firebaseio.com/";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

const memoryUsers = new Map(); // Fallback for when Firebase is not connected
const DB_FILE = path.join(__dirname, 'database.json');

// LOAD LOCAL DB
if (fs.existsSync(DB_FILE)) {
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const data = JSON.parse(raw);
        Object.entries(data).forEach(([u, d]) => memoryUsers.set(u, d));
        console.log(`📂 Loaded ${memoryUsers.size} users from local database.json`);
    } catch (err) {
        console.error("Failed to load database.json:", err.message);
    }
}

// Force create admin if missing
if (!memoryUsers.has('flashlon')) {
    memoryUsers.set('flashlon', {
        username: 'flashlon',
        password: hashPassword('flashlon'),
        level: 99,
        xp: 0,
        maxXp: 1000,
        money: 9000000,
        unlocks: ['speed', 'damage', 'hp', 'cooldown'],
        limits: { speed: 500, damage: 100, hp: 500, cooldown: 0.1 },
        lastUpgradeLevel: {},
        titles: ['dev', 'trueking', 'theultragod'],
        equippedTitle: 'dev',
        killCount: 999
    });
    try {
        const data = Object.fromEntries(memoryUsers);
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) { }
}

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
            return snapshot.val() || memoryUsers.get(username) || null;
        } catch (err) {
            console.error(`❌ Firebase error reading user ${username}:`, err.message);
            return memoryUsers.get(username) || null;
        }
    }
    return memoryUsers.get(username) || null;
}

async function upsertUser(username, userData) {
    if (!username || username.trim() === '') return;

    const lastSeen = new Date().toISOString();
    const existing = memoryUsers.get(username) || {};
    const newData = { ...existing, ...userData, lastSeen };

    // Always update memory cache
    memoryUsers.set(username, newData);

    if (firebaseDb) {
        try {
            await firebaseDb.ref(`users/${username}`).update({
                ...userData,
                lastSeen
            });
        } catch (err) {
            console.error(`❌ Firebase error writing user ${username}:`, err.message);
        }
    } else {
        // PERSIST TO FILE
        try {
            const data = Object.fromEntries(memoryUsers);
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error("Failed to save to database.json:", err.message);
        }
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

// Global leaderboard update is started after io is created (see bottom of server setup)

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Global leaderboard update every 30 seconds (must be after io is defined)
setInterval(async () => {
    const leaderboard = await getGlobalLeaderboard();
    io.emit('global_leaderboard', leaderboard);
}, 30000);

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

// --- TITLE LOGIC HELPERS ---
const TITLES_LIST = [
    'killer', 'sneaky', 'threeforone', 'unstoppable', 'monster',
    'friendly', 'hostile', 'zzz', 'op', 'modhelper', 'mod', 'dev',
    'god', 'godkiller', 'immortal', 'trueking', 'theultragod'
];

function unlockTitle(username, titleId, socket) {
    console.log(`[TITLE] Attempting to unlock "${titleId}" for ${username}`);

    let user = memoryUsers.get(username);
    if (!user) {
        console.log(`[TITLE] ❌ User ${username} not found in memoryUsers`);
        return;
    }

    if (!user.titles) user.titles = ['beginner']; // Default

    console.log(`[TITLE] Current titles for ${username}:`, user.titles);

    if (!user.titles.includes(titleId)) {
        user.titles.push(titleId);
        console.log(`🏆 UNLOCKED TITLE: ${username} -> ${titleId}`);
        console.log(`[TITLE] New titles array:`, user.titles);

        if (socket) {
            console.log(`[TITLE] Sending notification to socket ${socket.id}`);
            socket.emit('notification', { type: 'unlock', message: `Title Unlocked: ${titleId.toUpperCase()}` });
            // FORCE UPDATE CLIENT PROFILE
            socket.emit('profile_update', user);
        } else {
            console.log(`[TITLE] ⚠️ No socket provided for ${username}`);
        }

        saveProgress(username, user);

        // Check for 'The Ultra God'
        const nonAdminTitles = ['killer', 'sneaky', 'threeforone', 'unstoppable', 'monster', 'friendly', 'hostile', 'zzz', 'op', 'modhelper', 'godkiller', 'immortal', 'trueking'];
        const hasAll = nonAdminTitles.every(t => user.titles.includes(t));
        if (hasAll && !user.titles.includes('theultragod')) {
            unlockTitle(username, 'theultragod', socket);
        }
    } else {
        console.log(`[TITLE] ${username} already has "${titleId}"`);
    }
}

function checkTitles(username, stats, socket) {
    if (!username) return;
    let user = memoryUsers.get(username);
    if (!user) return;

    if (!user.killCount) user.killCount = 0;
    if (!user.titles || user.titles.length === 0) user.titles = ['beginner'];

    // 1. Killer (30 kills)
    if (user.killCount >= 30 && !user.titles.includes('killer')) {
        unlockTitle(username, 'killer', socket);
    }

    // 2. Veteran (Level 10)
    if ((user.level || 1) >= 10 && !user.titles.includes('veteran')) {
        unlockTitle(username, 'veteran', socket);
    }

    // 3. Unstoppable (100 killstreak — checked from stats.killstreak)
    if ((stats.killstreak || 0) >= 100 && !user.titles.includes('unstoppable')) {
        unlockTitle(username, 'unstoppable', socket);
    }

    // 4. Monster (1000 killstreak)
    if ((stats.killstreak || 0) >= 1000 && !user.titles.includes('monster')) {
        unlockTitle(username, 'monster', socket);
    }

    // 5. Shredder (10 000 total match damage)
    if ((stats.matchDamage || 0) >= 10000 && !user.titles.includes('shredder')) {
        unlockTitle(username, 'shredder', socket);
    }

    // 6. Deadeye (50 crits in one match)
    if ((stats.matchCrits || 0) >= 50 && !user.titles.includes('deadeye')) {
        unlockTitle(username, 'deadeye', socket);
    }

    // 7. OP (Maximize core Stats)
    if (stats.limits) {
        const l = stats.limits;
        const isMaxed = (
            (l.speed || 0) >= 1200 &&
            (l.damage || 0) >= 250 &&
            (l.hp || 0) >= 2000 &&
            (l.cooldown || 1) <= 0.05 &&
            (l.pierce || 0) >= 25 &&
            (l.homing || 0) >= 50
        );
        if (isMaxed && !user.titles.includes('op')) {
            unlockTitle(username, 'op', socket);
        }

        // Magnetar (max vortex)
        if ((l.attraction_force || 0) >= 100 && !user.titles.includes('magnetar')) {
            unlockTitle(username, 'magnetar', socket);
        }
    }
}

// ─── MAP DEFINITIONS ──────────────────────────────────────────────────────────
// Each map defines wall rectangles [x, y, width, height] and a display name.
const MAPS = {
    arena_open: {
        id: 'arena_open',
        name: 'Open Field',
        description: 'No cover. Pure aim wins.',
        color: '#00ff9f',
        walls: []
    },
    arena_cross: {
        id: 'arena_cross',
        name: 'Cross Roads',
        description: 'Two intersecting walls split the arena.',
        color: '#3b82f6',
        walls: [
            { x: 350, y: 100, w: 100, h: 20 },
            { x: 350, y: 480, w: 100, h: 20 },
            { x: 100, y: 290, w: 20, h: 100 },
            { x: 680, y: 290, w: 20, h: 100 }
        ]
    },
    arena_pillars: {
        id: 'arena_pillars',
        name: 'Pillars',
        description: 'Six pillars create tight lanes.',
        color: '#a855f7',
        walls: [
            { x: 200, y: 150, w: 30, h: 30 },
            { x: 570, y: 150, w: 30, h: 30 },
            { x: 200, y: 420, w: 30, h: 30 },
            { x: 570, y: 420, w: 30, h: 30 },
            { x: 385, y: 100, w: 30, h: 30 },
            { x: 385, y: 470, w: 30, h: 30 }
        ]
    },
    arena_fortress: {
        id: 'arena_fortress',
        name: 'Fortress',
        description: 'A center room with entry gaps on each side.',
        color: '#f59e0b',
        walls: [
            // Center box with gaps
            { x: 280, y: 200, w: 100, h: 15 },   // top-left segment
            { x: 420, y: 200, w: 100, h: 15 },   // top-right segment
            { x: 280, y: 385, w: 100, h: 15 },   // bottom-left
            { x: 420, y: 385, w: 100, h: 15 },   // bottom-right
            { x: 280, y: 215, w: 15, h: 80 },    // left-top
            { x: 280, y: 310, w: 15, h: 80 },    // left-bottom
            { x: 505, y: 215, w: 15, h: 80 },    // right-top
            { x: 505, y: 310, w: 15, h: 80 }     // right-bottom
        ]
    },
    arena_maze: {
        id: 'arena_maze',
        name: 'Maze Runner',
        description: 'Tight corridors. Homing weapons shine.',
        color: '#ef4444',
        walls: [
            { x: 150, y: 100, w: 200, h: 15 },
            { x: 450, y: 100, w: 200, h: 15 },
            { x: 150, y: 100, w: 15, h: 150 },
            { x: 635, y: 100, w: 15, h: 150 },
            { x: 150, y: 350, w: 200, h: 15 },
            { x: 450, y: 350, w: 200, h: 15 },
            { x: 150, y: 350, w: 15, h: 150 },
            { x: 635, y: 350, w: 15, h: 150 },
            { x: 300, y: 200, w: 15, h: 150 },
            { x: 485, y: 200, w: 15, h: 150 }
        ]
    }
};

const MAP_IDS = Object.keys(MAPS);

// MAP VOTING STATE — per room
// room.mapVote = { options: [], votes: {socketId: mapId}, endTime: ms, active: bool }
const MAP_VOTE_INTERVAL = 60 * 1000; // 60 seconds between votes
const MAP_VOTE_DURATION = 20 * 1000;  // 20 seconds to vote

function startMapVote(roomId) {
    console.log(`[VOTE] Attempting to start vote in room ${roomId}...`);
    const room = rooms[roomId];
    // Run for any non-coop room (pvp, deathmatch, etc.)
    if (!room) { console.log(`[VOTE] Room ${roomId} not found`); return; }
    if (room.mode === 'coop') { console.log(`[VOTE] Room is coop, skipping`); return; }

    console.log(`[VOTE] Starting vote with ${Object.keys(room.players).length} players`);

    // Pick 3 random distinct maps (exclude current map)
    const options = [];
    const currentMap = room.currentMap || 'arena_open';
    const pool = MAP_IDS.filter(id => id !== currentMap);
    while (options.length < 3 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        options.push(pool.splice(idx, 1)[0]);
    }
    if (options.length < 3) options.push(currentMap); // fallback

    room.mapVote = {
        options,
        votes: {},
        active: true,
        endTime: Date.now() + MAP_VOTE_DURATION
    };

    io.to(roomId).emit('map_vote_start', {
        options: options.map(id => ({ id, ...MAPS[id] })),
        duration: MAP_VOTE_DURATION
    });

    // Auto-resolve after vote duration
    setTimeout(() => resolveMapVote(roomId), MAP_VOTE_DURATION);
}

function resolveMapVote(roomId) {
    const room = rooms[roomId];
    if (!room || !room.mapVote || !room.mapVote.active) return;

    // Count votes
    const tally = {};
    room.mapVote.options.forEach(id => { tally[id] = 0; });
    Object.values(room.mapVote.votes).forEach(v => { if (tally[v] !== undefined) tally[v]++; });

    // Pick winner (random tiebreak)
    let winner = room.mapVote.options[0];
    let maxVotes = -1;
    for (const [mapId, count] of Object.entries(tally)) {
        if (count > maxVotes) { maxVotes = count; winner = mapId; }
    }

    room.mapVote.active = false;
    room.currentMap = winner;
    room.walls = MAPS[winner].walls;

    io.to(roomId).emit('map_change', {
        mapId: winner,
        map: MAPS[winner],
        tally
    });
}

// ─────────────────────────────────────────────────────────────────────────────

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

    socket.on('login', async ({ username, password }) => {
        console.log(`[AUTH] Login Request: ${username}`);

        try {
            if (!username || username.trim().length === 0) {
                socket.emit('login_response', { success: false, error: "Username cannot be empty" });
                return;
            }

            if (!password) {
                socket.emit('login_response', { success: false, error: "Password is required" });
                return;
            }

            const user = await findUser(username);

            if (!user) {
                console.log(`[AUTH] Login Failed: ${username} not found`);
                socket.emit('login_response', { success: false, error: "User not found. Please click Signup." });
                return;
            }

            // Check password
            const hashed = hashPassword(password);
            if (user.password && user.password !== hashed) {
                console.log(`[AUTH] Login Failed: ${username} invalid password`);
                socket.emit('login_response', { success: false, error: "Invalid password" });
                return;
            }
            // If user has no password yet (old account), let them in but maybe set it on next save?
            // For now, we'll allow it or force set it. Let's just allow it for legacy.
            if (!user.password) {
                user.password = hashed;
                await upsertUser(username, user);
            }

            console.log(`[AUTH] Login Success: ${username}`);
            socket.data.username = username;

            // CACHE USER FOR TITLES (Crucial for Firebase users)
            memoryUsers.set(username, user);

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
                    limits: user.limits || { speed: 200, damage: 5 },
                    titles: user.titles && user.titles.length > 0 ? user.titles : ['beginner'],
                    equippedTitle: user.equippedTitle || null,
                    killCount: user.killCount || 0,
                    aura_type: user.aura_type || null
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

    socket.on('signup', async ({ username, password }) => {
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

            if (!password || password.length < 4) {
                socket.emit('login_response', { success: false, error: "Password must be at least 4 characters" });
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
                password: hashPassword(password),
                level: 1,
                xp: 0,
                maxXp: 100,
                money: 0,
                unlocks: ['speed', 'damage', 'hp', 'cooldown'],
                limits: { speed: 200, damage: 5, hp: 100, cooldown: 0.5 },
                lastUpgradeLevel: {},
                titles: ['beginner'],
                equippedTitle: null,
                killCount: 0,
                aura_type: null,
                createdAt: new Date().toISOString()
            };

            await upsertUser(username, newUser);
            console.log(`[AUTH] Signup Success: ${username}`);

            // CACHE USER FOR TITLES
            memoryUsers.set(username, newUser);

            socket.data.username = username;
            socket.emit('login_response', {
                success: true,
                isNew: true,
                profile: {
                    username: newUser.username,
                    level: newUser.level,
                    xp: newUser.xp,
                    maxXp: newUser.maxXp,
                    money: newUser.money,
                    unlocks: newUser.unlocks,
                    limits: newUser.limits,
                    lastUpgradeLevel: newUser.lastUpgradeLevel,
                    titles: newUser.titles || [],
                    equippedTitle: newUser.equippedTitle || null,
                    killCount: newUser.killCount || 0,
                    aura_type: newUser.aura_type || null
                }
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
                mode: settings?.mode || 'pvp',
                players: {},
                spectators: {},
                projectiles: [],
                enemies: [],
                grid: {},
                lastUpdate: Date.now(),
                score: 0,
                wave: 0,
                waveState: 'idle',
                waveTimer: 0,
                currentMap: 'arena_pillars',
                walls: MAPS['arena_pillars'].walls
            };
        }

        const room = rooms[roomId];

        // Ensure room has walls if it's an existing one from a previous server version
        if (!room.walls || room.walls.length === 0) {
            room.currentMap = room.currentMap || 'arena_pillars';
            room.walls = MAPS[room.currentMap]?.walls || MAPS['arena_pillars'].walls;
        }

        const isSpectator = settings?.spectator === true;

        if (isSpectator) {
            // SPECTATOR — no player entity, just observe
            room.spectators = room.spectators || {};
            room.spectators[socket.id] = {
                id: socket.id,
                username: socket.data.username || 'Guest',
                joinedAt: Date.now()
            };
            socket.emit('init', {
                playerId: socket.id,
                isSpectator: true,
                gameState: {
                    entities: [...Object.values(room.players), ...room.enemies],
                    projectiles: room.projectiles,
                    score: room.score,
                    walls: room.walls || [],
                    currentMap: room.currentMap || 'arena_open'
                }
            });
            console.log(`👁 Spectator ${socket.id} (${socket.data.username}) joined room ${currentRoomId}`);
        } else {
            // PLAYER — full entity
            room.players[socket.id] = {
                id: socket.id,
                username: socket.data.username || 'Guest',
                x: 400,
                y: 300,
                radius: 20,
                hp: 100,
                maxHp: 100,
                color: '#00ff9f',
                type: 'player',
                velocity: { x: 0, y: 0 },
                kills: 0,
                deaths: 0,
                level: profile?.level || 1,
                xp: profile?.xp || 0,
                maxXp: profile?.maxXp || 100,
                money: profile?.money || 0,
                unlocks: profile?.unlocks || ['speed', 'damage'],
                limits: profile?.limits || { speed: 200, damage: 5 },
                titles: profile?.titles || [],
                equippedTitle: profile?.equippedTitle || null,
                aura_type: profile?.aura_type || null,
                joinedAt: Date.now(),
                lastFireTime: 0,
                hasFired: false,
                lastActionTime: Date.now(),
                continuousFireStartTime: 0
            };
            socket.emit('init', {
                playerId: socket.id,
                isSpectator: false,
                gameState: {
                    entities: [...Object.values(room.players), ...room.enemies],
                    projectiles: room.projectiles,
                    score: room.score,
                    walls: room.walls || [],
                    currentMap: room.currentMap || 'arena_open'
                }
            });
            checkTitles(socket.data.username, { ...profile, killstreak: 0 }, socket);
            console.log(`Player ${socket.id} joined room ${currentRoomId}`);
        }
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
                p.titles = profile.titles;
                p.equippedTitle = profile.equippedTitle;
                p.aura_type = profile.aura_type;
            }

            // Always check titles on save (handles "OP" title from shop upgrades)
            checkTitles(socket.data.username, profile, socket);
        }
    });

    socket.on('equip_title', ({ titleId }) => {
        if (socket.data.username) {
            const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
            if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
                const p = rooms[roomId].players[socket.id];
                if (p.titles && p.titles.includes(titleId)) {
                    p.equippedTitle = titleId;
                    // Persist
                    const user = memoryUsers.get(socket.data.username);
                    if (user) {
                        user.equippedTitle = titleId;
                        saveProgress(socket.data.username, user);
                    }
                } else if (titleId === null) {
                    p.equippedTitle = null;
                    const user = memoryUsers.get(socket.data.username);
                    if (user) {
                        user.equippedTitle = null;
                        saveProgress(socket.data.username, user);
                    }
                }
            }
        }
    });

    // TEST COMMAND - Remove in production
    socket.on('test_unlock_title', ({ titleId }) => {
        console.log(`[TEST] ========== TEST UNLOCK TITLE ==========`);
        console.log(`[TEST] Requested titleId: ${titleId}`);
        console.log(`[TEST] Socket ID: ${socket.id}`);
        console.log(`[TEST] socket.data.username: ${socket.data.username}`);

        if (socket.data.username) {
            const user = memoryUsers.get(socket.data.username);
            console.log(`[TEST] User found in memoryUsers: ${!!user}`);
            if (user) {
                console.log(`[TEST] User current titles:`, user.titles);
                console.log(`[TEST] Calling unlockTitle...`);
                unlockTitle(socket.data.username, titleId, socket);
            } else {
                console.log(`[TEST] ❌ User ${socket.data.username} NOT in memoryUsers`);
                console.log(`[TEST] memoryUsers keys:`, Array.from(memoryUsers.keys()));
                socket.emit('notification', { type: 'error', message: 'User not found in database' });
            }
        } else {
            console.log('[TEST] ❌ socket.data.username is undefined - user not logged in');
            socket.emit('notification', { type: 'error', message: 'Please login first' });
        }
        console.log(`[TEST] ==========================================`);
    });

    socket.on('admin_award_title', ({ secret, targetUsername, titleId }) => {
        const ADMIN_SECRET = process.env.ADMIN_SECRET || 'cyber_secret_2024';
        if (secret === ADMIN_SECRET) {
            console.log(`[ADMIN] Awarding "${titleId}" to ${targetUsername}`);

            // Find target socket if online
            let targetSocket = null;
            for (const s of io.sockets.sockets.values()) {
                if (s.data.username === targetUsername) {
                    targetSocket = s;
                    break;
                }
            }

            unlockTitle(targetUsername, titleId, targetSocket);
        } else {
            socket.emit('notification', { type: 'error', message: 'Unauthorized' });
        }
    });

    socket.on('admin_command', ({ command, payload }) => {
        if (socket.data.username !== 'flashlon') {
            socket.emit('notification', { type: 'error', message: 'Unauthorized / Access Denied' });
            return;
        }
        console.log(`[ADMIN] Command received: ${command}`, payload);

        switch (command) {
            case 'broadcast':
                io.emit('notification', { type: 'unlock', message: `[SYS ADMIN] ${payload.message}` });
                break;
            case 'kick_all':
                io.emit('notification', { type: 'error', message: 'Admin initiated global kick/restart.' });
                io.sockets.sockets.forEach(s => {
                    if (s.data.username !== 'flashlon') s.disconnect(true);
                });
                break;
            case 'inject_currency':
                if (payload.targetUser) {
                    const targetNameKey = Array.from(memoryUsers.keys()).find(k => k.toLowerCase() === payload.targetUser.toLowerCase());
                    const user = targetNameKey ? memoryUsers.get(targetNameKey) : null;
                    if (user) {
                        user.money = (user.money || 0) + (payload.amount || 0);
                        upsertUser(targetNameKey, user).then(() => {
                            for (const s of io.sockets.sockets.values()) {
                                if (s.data.username === targetNameKey) {
                                    s.emit('profile_update', user);
                                    s.emit('notification', { type: 'unlock', message: `Admin injected $${payload.amount} to your account.` });
                                }
                            }
                        });
                    }
                }
                break;
            case 'set_user_stats':
                if (payload.targetUser) {
                    const targetNameKey = Array.from(memoryUsers.keys()).find(k => k.toLowerCase() === payload.targetUser.toLowerCase());
                    const user = targetNameKey ? memoryUsers.get(targetNameKey) : null;
                    if (user) {
                        if (payload.level !== undefined) user.level = payload.level;
                        if (payload.xp !== undefined) user.xp = payload.xp;
                        upsertUser(targetNameKey, user).then(() => {
                            for (const s of io.sockets.sockets.values()) {
                                if (s.data.username === targetNameKey) {
                                    s.emit('profile_update', user);
                                    s.emit('notification', { type: 'unlock', message: `Admin updated your stats.` });
                                }
                            }
                        });
                    } else {
                        socket.emit('notification', { type: 'error', message: `User ${payload.targetUser} not found.` });
                    }
                }
                break;
            case 'unlock_all_titles':
                if (payload.targetUser) {
                    const targetNameKey = Array.from(memoryUsers.keys()).find(k => k.toLowerCase() === payload.targetUser.toLowerCase());
                    const user = targetNameKey ? memoryUsers.get(targetNameKey) : null;
                    if (user) {
                        user.titles = [...TITLES_LIST];
                        upsertUser(targetNameKey, user).then(() => {
                            for (const s of io.sockets.sockets.values()) {
                                if (s.data.username === targetNameKey) {
                                    s.emit('profile_update', user);
                                    s.emit('notification', { type: 'unlock', message: `Admin unlocked all titles for you.` });
                                }
                            }
                        });
                    } else {
                        socket.emit('notification', { type: 'error', message: `User ${payload.targetUser} not found.` });
                    }
                }
                break;
            case 'max_limits':
                if (payload.targetUser) {
                    const targetNameKey = Array.from(memoryUsers.keys()).find(k => k.toLowerCase() === payload.targetUser.toLowerCase());
                    const user = targetNameKey ? memoryUsers.get(targetNameKey) : null;
                    if (user) {
                        user.limits = { speed: 10000, damage: 10000, hp: 10000, cooldown: 0.01, pierce: 100, homing: 100, attraction_force: 500, burst: 10 };
                        user.unlocks = ['speed', 'damage', 'hp', 'cooldown', 'pierce', 'homing', 'aura_fire', 'aura_ice', 'aura_crystal', 'vortex', 'burst'];
                        upsertUser(targetNameKey, user).then(() => {
                            for (const s of io.sockets.sockets.values()) {
                                if (s.data.username === targetNameKey) {
                                    s.emit('profile_update', user);
                                    s.emit('notification', { type: 'unlock', message: `Admin maxed out your limits and unlocked all attributes.` });
                                }
                            }
                        });
                    } else {
                        socket.emit('notification', { type: 'error', message: `User ${payload.targetUser} not found.` });
                    }
                }
                break;
            case 'unlock_all_values':
                if (payload.targetUser) {
                    const targetNameKey = Array.from(memoryUsers.keys()).find(k => k.toLowerCase() === payload.targetUser.toLowerCase());
                    const user = targetNameKey ? memoryUsers.get(targetNameKey) : null;
                    if (user) {
                        user.level = 999;
                        user.xp = 0;
                        user.maxXp = 9999999;
                        user.money = 99999999;
                        user.killCount = 99999;
                        user.titles = [...TITLES_LIST];
                        user.limits = { speed: 10000, damage: 10000, hp: 10000, cooldown: 0.01, pierce: 100, homing: 100, attraction_force: 500, burst: 10 };
                        user.unlocks = ['speed', 'damage', 'hp', 'cooldown', 'pierce', 'homing', 'aura_fire', 'aura_ice', 'aura_crystal', 'vortex', 'burst'];

                        upsertUser(targetNameKey, user).then(() => {
                            for (const s of io.sockets.sockets.values()) {
                                if (s.data.username === targetNameKey) {
                                    s.emit('profile_update', user);
                                    s.emit('notification', { type: 'unlock', message: `Admin unlocked ALL VALUES and MAXED your account.` });
                                }
                            }
                        });
                    } else {
                        socket.emit('notification', { type: 'error', message: `User ${payload.targetUser} not found.` });
                    }
                }
                break;
            case 'nuke_enemies':
                const roomToNuke = rooms[payload.roomId];
                if (roomToNuke) {
                    roomToNuke.enemies = []; // clears all enemies instantly
                    io.to(payload.roomId).emit('notification', { type: 'unlock', message: '[SYS] Admin Nuked All Enemies!' });
                } else {
                    socket.emit('notification', { type: 'error', message: 'Room not found' });
                }
                break;
            case 'spawn_boss':
                const targetRoom = rooms[payload.roomId];
                if (targetRoom) {
                    io.to(payload.roomId).emit('wave_start', { wave: 999 });
                    setTimeout(() => {
                        io.to(payload.roomId).emit('boss_spawn', { wave: 999 });
                    }, 3000);
                } else {
                    socket.emit('notification', { type: 'error', message: 'Room not found' });
                }
                break;
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
                player.lastActionTime = Date.now(); // Record activity
            }
        }
    });

    socket.on('fire', (data) => {
        if (currentRoomId && rooms[currentRoomId]) {
            const room = rooms[currentRoomId];
            const player = room.players[socket.id];

            if (player) {
                player.lastFireTime = Date.now();
                player.hasFired = true;
                player.lastActionTime = Date.now();

                if (!player.continuousFireStartTime) {
                    player.continuousFireStartTime = Date.now();
                }
            }

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

            // --- CHAOS AURA: Random Power Boost ---
            if (player && player.aura_type === 'aura_chaos') {
                const strength = player.limits?.['aura_chaos'] || 1.2;
                const chaos = Math.random();
                if (chaos < 0.3) {
                    const lastProj = room.projectiles[room.projectiles.length - 1];
                    if (lastProj) {
                        const type = Math.floor(Math.random() * 3);
                        if (type === 0) lastProj.damage *= strength;
                        else if (type === 1) {
                            lastProj.velocity.x *= strength;
                            lastProj.velocity.y *= strength;
                        }
                        else lastProj.radius *= strength;

                        lastProj.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
                    }
                }
            }
        }
    });

    function leaveRoom(id) {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.players[id]) {
                delete room.players[id];
            }
            if (room.spectators && room.spectators[id]) {
                delete room.spectators[id];
            }
            const totalPeople = Object.keys(room.players).length +
                Object.keys(room.spectators || {}).length;
            if (totalPeople === 0) {
                delete rooms[roomId];
            }
        }
    }

    socket.on('vote_map', ({ mapId }) => {
        if (!currentRoomId) return;
        const room = rooms[currentRoomId];
        if (!room || !room.mapVote || !room.mapVote.active) return;
        if (!room.mapVote.options.includes(mapId)) return;
        room.mapVote.votes[socket.id] = mapId;
        // Broadcast updated vote tally to room so UI can update live
        const tally = {};
        room.mapVote.options.forEach(id => { tally[id] = 0; });
        Object.values(room.mapVote.votes).forEach(v => { if (tally[v] !== undefined) tally[v]++; });
        io.to(currentRoomId).emit('map_vote_update', { tally });
    });

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
        try {
            // --- WAVE MODE LOGIC ---
            if (room.mode === 'coop') {
                room.waveTimer += dt;

                if (room.waveState === 'idle' && Object.keys(room.players).length > 0) {
                    room.wave = (room.wave || 0) + 1;
                    room.waveState = 'spawning';
                    room.waveTimer = 0;
                    room.bossSpawned = false; // Reset boss flag
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

                        // Enemy Variety — wave-scaled with new types
                        const rand = Math.random();
                        let type = 'standard';
                        let radius = 20;
                        let color = '#ff0055';
                        let speed = 50 + (room.wave * 2);
                        let hp = 30 + (room.wave * 15);
                        let extraProps = {};

                        if (room.wave > 2 && rand > 0.88) {
                            // HEALER — restores HP to nearby enemies
                            type = 'healer';
                            radius = 18;
                            color = '#4ade80';
                            speed *= 0.7;
                            hp *= 0.8;
                            extraProps = { healCooldown: 0, healRadius: 120, healAmount: 8 };

                        } else if (room.wave > 3 && rand > 0.78) {
                            // TANK
                            type = 'tank';
                            radius = 35;
                            color = '#880022';
                            speed *= 0.55;
                            hp *= 3.0;

                        } else if (room.wave > 4 && rand > 0.68) {
                            // BERSERKER — speeds up and deals more damage at low HP
                            type = 'berserker';
                            radius = 22;
                            color = '#f97316';
                            speed *= 1.0;
                            hp *= 1.2;
                            extraProps = { enraged: false };

                        } else if (room.wave > 5 && rand > 0.58) {
                            // GHOST — phases in/out, invulnerable while phased
                            type = 'ghost';
                            radius = 18;
                            color = '#c4b5fd';
                            speed *= 1.2;
                            hp *= 0.7;
                            extraProps = { phased: false, phaseTimer: 0, phaseCycle: 3.0 };

                        } else if (room.wave > 5 && rand > 0.48) {
                            // SPEEDSTER
                            type = 'speedster';
                            radius = 15;
                            color = '#ffaa00';
                            speed *= 1.6;
                            hp *= 0.55;

                        } else if (room.wave > 6 && rand > 0.38) {
                            // SPLITTER — spawns 2 mini-clones on death
                            type = 'splitter';
                            radius = 26;
                            color = '#fb7185';
                            speed *= 0.9;
                            hp *= 1.3;
                            extraProps = { splits: 2 };

                        } else if (room.wave > 7 && rand > 0.28) {
                            // SNIPER
                            type = 'sniper';
                            radius = 20;
                            color = '#00ff00';
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
                            shootTimer: Math.random() * 2,
                            ...extraProps
                        });
                    }
                    if (room.waveTimer > 5) room.waveState = 'fight';
                }

                // Boss Spawn every 5 waves (ensure only once)
                if (room.wave > 0 && room.wave % 5 === 0 && room.waveState === 'fight' && !room.enemies.some(e => e.isBoss) && !room.bossSpawned) {
                    room.bossSpawned = true;
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
                    // WAVE COMPLETED
                    const waveCompleted = room.wave;
                    room.waveState = 'idle';
                    room.waveTimer = 0;

                    // Check for Immortal and True King upon completing waves
                    Object.values(room.players).forEach(p => {
                        const pSocket = io.sockets.sockets.get(p.id);
                        // Immortal: Reach Wave 50 without dying
                        if (waveCompleted >= 50 && (!p.deaths || p.deaths === 0)) {
                            unlockTitle(p.username, 'immortal', pSocket);
                        }
                        // True King: Reach Wave 100
                        if (waveCompleted >= 100) {
                            unlockTitle(p.username, 'trueking', pSocket);
                        }
                    });
                }
            }

            updateRoomGrid(room);

            // Update Physics — iterate in reverse so splice(i,1) does not corrupt loop
            for (let i = room.projectiles.length - 1; i >= 0; i--) {
                const proj = room.projectiles[i];
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
                    continue;
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

                    // Projectile Wall Collision
                    if (room.walls && room.walls.length > 0) {
                        for (const w of room.walls) {
                            if (proj.x > w.x && proj.x < w.x + w.w &&
                                proj.y > w.y && proj.y < w.y + w.h) {

                                if (proj.bounciness) {
                                    const dxLeft = Math.abs(proj.x - w.x);
                                    const dxRight = Math.abs(proj.x - (w.x + w.w));
                                    const dyTop = Math.abs(proj.y - w.y);
                                    const dyBottom = Math.abs(proj.y - (w.y + w.h));
                                    const min = Math.min(dxLeft, dxRight, dyTop, dyBottom);

                                    if (min === dxLeft || min === dxRight) proj.velocity.x *= -proj.bounciness;
                                    else proj.velocity.y *= -proj.bounciness;

                                    if (min === dxLeft) proj.x = w.x - 1;
                                    else if (min === dxRight) proj.x = w.x + w.w + 1;
                                    else if (min === dyTop) proj.y = w.y - 1;
                                    else if (min === dyBottom) proj.y = w.y + w.h + 1;
                                } else {
                                    io.to(roomId).emit('visual_effect', {
                                        type: 'impact', x: proj.x, y: proj.y, color: '#666', strength: 5
                                    });
                                    room.projectiles.splice(i, 1);
                                    i--;
                                    return;
                                }
                                break;
                            }
                        }
                    }

                    if (proj.bounciness) {
                        if (proj.x < proj.radius || proj.x > 800 - proj.radius) {
                            proj.velocity.x *= -proj.bounciness;
                            proj.x = proj.x < proj.radius ? proj.radius : 800 - proj.radius;
                        }
                        if (proj.y < proj.radius || proj.y > 600 - proj.radius) {
                            proj.velocity.y *= -proj.bounciness;
                            proj.y = proj.y < proj.radius ? proj.radius : 600 - proj.radius;
                        }
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
                let hitSomething = false;
                nearby.forEach(ent => {
                    if (ent.id === proj.playerId || ent.type === 'projectile') return;
                    // GHOST: invulnerable while phased
                    if (ent.enemyType === 'ghost' && ent.phased) return;
                    const dist = Math.sqrt((ent.x - (proj.renderX || proj.x)) ** 2 + (ent.y - (proj.renderY || proj.y)) ** 2);
                    if (dist < ent.radius + proj.radius) {
                        let dmg = (proj.damage || 10);
                        const now = Date.now();
                        const shooterId = proj.playerId || 'unknown';
                        const room = rooms[roomId]; // Room context

                        // CRITICAL: Apply Damage Aura Multiplier if shooter has it
                        if (room && room.players[shooterId]) {
                            const shooter = room.players[shooterId];
                            if (shooter.aura_type === 'aura_damage') {
                                const mult = shooter.limits?.['aura_damage'] || 1.1;
                                dmg *= mult;
                            }
                        }

                        // Initialize tracker fields
                        if (!ent.last_hit_by) ent.last_hit_by = {};
                        if (!ent.hit_streak) ent.hit_streak = {};
                        if (!ent.active_dots) ent.active_dots = [];
                        if (ent.armor_reduction === undefined) ent.armor_reduction = 0;

                        // --- AURAS: Server Parity ---
                        let critChanceBonus = 0;
                        let critDmgBonus = 0;
                        let focusFireBonus = 0;
                        let damageMult = 1.0;

                        if (room.players[shooterId]) {
                            const shooter = room.players[shooterId];
                            if (shooter.aura_type === 'aura_precision') {
                                const strength = shooter.limits?.['aura_precision'] || 1.1;
                                critChanceBonus = (strength - 1) * 40;
                                critDmgBonus = (strength - 1);
                                focusFireBonus = (strength - 1) * 0.5;
                            }
                            if (shooter.aura_type === 'aura_damage') {
                                damageMult = shooter.limits?.['aura_damage'] || 1.1;
                            }
                        }

                        // 1. Critical Hits
                        const finalCritChance = (proj.crit_chance || 0) + critChanceBonus;
                        const isCrit = Math.random() * 100 < finalCritChance;

                        if (isCrit) {
                            dmg *= ((proj.crit_damage || 2.0) + critDmgBonus);
                            io.to(roomId).emit('visual_effect', { type: 'impact', x: ent.x, y: ent.y, color: '#ffffff', strength: 5, radius: 20 });
                        }

                        dmg *= damageMult;

                        // 2. Focus Fire
                        const lastHitTime = ent.last_hit_by[shooterId] || 0;
                        if (now - lastHitTime < 1000) {
                            ent.hit_streak[shooterId] = (ent.hit_streak[shooterId] || 0) + 1;
                            const ffPower = (proj.focus_fire || 0) + focusFireBonus;
                            if (ffPower > 0) {
                                dmg *= (1 + (ent.hit_streak[shooterId] * ffPower));
                            }
                        } else {
                            ent.hit_streak[shooterId] = 1;
                        }
                        ent.last_hit_by[shooterId] = now;

                        // 3. Burst
                        if (proj.burst_damage && (now - lastHitTime > 3000)) {
                            dmg += proj.burst_damage;
                        }

                        // 4. Execution
                        if (proj.execution_damage) {
                            const hpFactor = 1 - (ent.hp / ent.maxHp);
                            dmg *= (1 + (hpFactor * proj.execution_damage));
                        }

                        // 5. Armor Shred
                        if (proj.armor_shred) {
                            ent.armor_reduction = Math.min(0.9, (ent.armor_reduction || 0) + proj.armor_shred);
                        }
                        dmg *= (1 + (ent.armor_reduction || 0));

                        // 6. DOT (Corrupt)
                        if (proj.dot_damage) {
                            ent.active_dots.push({
                                damage: proj.dot_damage / 5,
                                end_time: now + 5000,
                                attacker_id: shooterId
                            });
                        }

                        // Logic for Sneaky (One Shot Kill on ANY entity)
                        if (dmg >= ent.maxHp && ent.hp >= ent.maxHp * 0.99) {
                            if (room.players[proj.playerId]) {
                                const shooterSocket = io.sockets.sockets.get(proj.playerId);
                                unlockTitle(room.players[proj.playerId].username, 'sneaky', shooterSocket);
                            }
                        }

                        // Sync damage timing for aura effects
                        if (room.players[proj.playerId]) {
                            room.players[proj.playerId].lastDealtDamageTime = Date.now();
                            if (isCrit) room.players[proj.playerId].lastCritTime = Date.now();
                        }

                        ent.hp -= dmg;

                        // Logic for ThreeForOne (Multikill on Pierce)
                        if (ent.hp <= 0 && room.players[proj.playerId]) {
                            proj.hitCount = (proj.hitCount || 0) + 1;
                            if (proj.hitCount >= 3) {
                                const shooterSocket = io.sockets.sockets.get(proj.playerId);
                                unlockTitle(room.players[proj.playerId].username, 'threeforone', shooterSocket);
                            }
                        }

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

                        // Enemy Projectile Collision — damage was already applied above;
                        // just handle visual + death + removal for enemy projectiles.
                        if (proj.isEnemyProjectile && room.players[ent.id]) {
                            // Visual hit
                            io.to(roomId).emit('visual_effect', { type: 'impact', x: ent.x, y: ent.y, color: '#ff0055', strength: 10 });

                            if (ent.hp <= 0) {
                                ent.hp = ent.maxHp;
                                ent.deaths = (ent.deaths || 0) + 1;
                                ent.x = 400; ent.y = 300;
                            }
                            hitSomething = true;
                            return; // Done with this projectile
                        }

                        // Explosion
                        if (proj.explosion_radius > 0) {
                            const exRadius = proj.explosion_radius;
                            const targets = getNearbyEntities(room, proj.x, proj.y, exRadius);
                            targets.forEach(t => {
                                if (t.id === proj.playerId || t.type === 'projectile') return;
                                const dSq = (t.x - proj.x) ** 2 + (t.y - proj.y) ** 2;
                                if (dSq < exRadius * exRadius) {
                                    t.hp -= (proj.explosion_damage || 15);

                                    // Track Multikill for Explosion
                                    if (t.hp <= 0 && room.players[proj.playerId]) {
                                        proj.hitCount = (proj.hitCount || 0) + 1;
                                        if (proj.hitCount >= 3) {
                                            const shooterSocket = io.sockets.sockets.get(proj.playerId);
                                            unlockTitle(room.players[proj.playerId].username, 'threeforone', shooterSocket);
                                        }
                                    }

                                    const exAngle = Math.atan2(t.y - proj.y, t.x - proj.x);
                                    t.velocity.x += Math.cos(exAngle) * 50;
                                    t.velocity.y += Math.sin(exAngle) * 50;
                                }
                            });
                            io.to(roomId).emit('visual_effect', {
                                type: 'explosion', x: proj.x, y: proj.y, color: proj.color || '#ff6e00', strength: 25, radius: exRadius
                            });
                        }

                        // --- CHAIN LIGHTNING LOGIC ---
                        if (proj.chain_range > 0 && (proj.chain_count || 0) > 0) {
                            proj.chain_count--;

                            // Find nearest enemy excluding current target
                            let nearest = null;
                            let minDistSq = proj.chain_range * proj.chain_range;

                            const candidates = getNearbyEntities(room, ent.x, ent.y, proj.chain_range);
                            candidates.forEach(c => {
                                if (c.id === ent.id || c.id === proj.playerId || c.type === 'projectile') return;
                                const dSq = (c.x - ent.x) ** 2 + (c.y - ent.y) ** 2;
                                if (dSq < minDistSq) {
                                    minDistSq = dSq;
                                    nearest = c;
                                }
                            });

                            if (nearest) {
                                // Redirect projectile to next target
                                const angle = Math.atan2(nearest.y - ent.y, nearest.x - ent.x);
                                const speed = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2) || 400;
                                proj.x = ent.x;
                                proj.y = ent.y;
                                proj.velocity.x = Math.cos(angle) * speed;
                                proj.velocity.y = Math.sin(angle) * speed;
                                hitSomething = false; // Don't destroy yet

                                // Visual Jump Effect
                                io.to(roomId).emit('visual_effect', {
                                    type: 'impact', x: ent.x, y: ent.y, color: proj.color, strength: 10
                                });
                            } else {
                                // No more targets to jump to
                                if (proj.pierce && proj.pierce > 1) {
                                    proj.pierce--;
                                    hitSomething = false;
                                } else {
                                    hitSomething = true;
                                }
                            }
                        } else if (proj.pierce && proj.pierce > 1) {
                            proj.pierce--;
                            hitSomething = false;
                        } else {
                            hitSomething = true;
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
                                killer.killstreak = (killer.killstreak || 0) + 1; // Increment streak

                                console.log(`[KILL] ${killer.username} got a kill! Session kills: ${killer.kills}, Killstreak: ${killer.killstreak}`);

                                // Update persistent kill count
                                let user = memoryUsers.get(killer.username);
                                if (user) {
                                    user.killCount = (user.killCount || 0) + 1;
                                    console.log(`[KILL] Updated persistent killCount for ${killer.username}: ${user.killCount}`);

                                    // Find socket for this player
                                    const killerSocket = io.sockets.sockets.get(proj.playerId);
                                    console.log(`[KILL] Socket lookup for ${proj.playerId}:`, killerSocket ? 'Found' : 'Not found');

                                    // Sync damage timing for aura effects
                                    killer.lastDealtDamageTime = Date.now();
                                    if (isCrit) killer.lastCritTime = Date.now();

                                    // Check Titles using PERSISTENT killCount
                                    if (user.killCount >= 30) unlockTitle(killer.username, 'killer', killerSocket);
                                    if (killer.killstreak >= 100) unlockTitle(killer.username, 'unstoppable', killerSocket);
                                    if (killer.killstreak >= 1000) unlockTitle(killer.username, 'monster', killerSocket);

                                    // Check God Slayer (Eliminate a player holding the GOD title)
                                    if (ent.type === 'player' && room.players[ent.id]) {
                                        const victim = room.players[ent.id];
                                        console.log(`[KILL] Checking God Slayer: Victim ${victim.username} equippedTitle: ${victim.equippedTitle}`);
                                        if (victim.equippedTitle === 'god') {
                                            unlockTitle(killer.username, 'godkiller', killerSocket);
                                        }
                                    }
                                } else {
                                    console.log(`[KILL] ⚠️ User ${killer.username} not found in memoryUsers!`);
                                }

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

                // Remove projectile if it hit something and wasn't a pierce/chain
                if (hitSomething) {
                    room.projectiles.splice(i, 1);
                }
            } // end projectile for loop

            // Standalone Enemy AI & Movement
            room.enemies.forEach(ent => {
                const now = Date.now();

                // Decay highlights
                if (ent.aura_highlight_timer && ent.aura_highlight_timer > 0) {
                    ent.aura_highlight_timer -= dt;
                }

                // --- DOT / Aura Effects Processing ---
                if (ent.active_dots) {
                    ent.active_dots = ent.active_dots.filter(dot => {
                        if (now < dot.end_time) {
                            ent.hp -= (dot.damage * dt);
                            return true;
                        }
                        return false;
                    });
                }

                // Auras from nearby players — affect ENEMIES ONLY (not allied players)
                Object.values(room.players).forEach(p => {
                    if (p.dead || p.x < -1000) return;
                    const aura = p.aura_type;
                    if (!aura) return;

                    // Only target enemies, never allied players
                    const targets = room.enemies;

                    targets.forEach(target => {
                        const distSq = (target.x - p.x) ** 2 + (target.y - p.y) ** 2;
                        const strength = p.limits?.[aura] || 1;
                        const baseRange = 240;
                        const rangeScale = 1 + Math.min(0.3, Math.max(0, (strength / 1.1) - 1) * 0.5);
                        const range = baseRange * rangeScale;

                        if (distSq < range * range) {
                            const dist = Math.sqrt(distSq) || 1;

                            // Highlight targets being affected
                            if (!target.aura_highlight_timer || target.aura_highlight_timer <= 0) {
                                target.aura_highlight_timer = 0.2;
                                const colors = {
                                    aura_damage: '#ff4500',
                                    aura_gravity: '#a855f7',
                                    aura_corruption: '#22c55e',
                                    aura_execution: '#fb923c',
                                    aura_chaos: '#ff00ff',
                                    aura_control: '#0ea5e9',
                                    aura_vampire: '#ef4444',
                                    aura_precision: '#ffffff'
                                };
                                target.aura_highlight_color = colors[aura] || '#fff';
                            }

                            // Apply gameplay effects
                            if (aura === 'aura_corruption') {
                                target.hp -= (strength * dt);

                            } else if (aura === 'aura_execution') {
                                // Only kicker-in below 30% HP; strength is a damage multiplier (e.g. 1.2 = +20%)
                                if (target.hp < target.maxHp * 0.3) {
                                    target.hp -= (target.maxHp * (strength - 1) * 0.1 * dt);
                                }

                            } else if (aura === 'aura_control') {
                                // Friction-based slow: strength < 1 (e.g. 0.7 = 30% slow)
                                // Apply as a damping multiplier each frame, clamped so velocity can't flip sign
                                const damping = Math.pow(Math.max(0, strength), dt * 3);
                                target.velocity.x *= damping;
                                target.velocity.y *= damping;

                            } else if (aura === 'aura_vampire') {
                                const siph = strength * dt * 50;
                                target.hp -= siph;
                                p.hp = Math.min(p.maxHp, p.hp + siph * 0.5); // heal caster

                            } else if (aura === 'aura_gravity') {
                                const pullX = p.x - target.x;
                                const pullY = p.y - target.y;
                                const force = strength * 200 / dist;
                                target.velocity.x += (pullX / dist) * force * dt;
                                target.velocity.y += (pullY / dist) * force * dt;
                            }
                        }
                    });
                });

                // Remove enemies killed by aura/DOT effects (all modes)
                if (ent.hp <= 0) {
                    const idx = room.enemies.indexOf(ent);
                    if (idx !== -1) {
                        // SPLITTER: spawn mini-clones
                        if (ent.enemyType === 'splitter' && !ent.hasSplit) {
                            ent.hasSplit = true;
                            for (let s = 0; s < (ent.splits || 2); s++) {
                                const angle = (s / (ent.splits || 2)) * Math.PI * 2;
                                const miniHp = ent.maxHp * 0.25;
                                room.enemies.push({
                                    id: 'mini_' + Math.random().toString(36).substr(2, 5),
                                    type: 'enemy',
                                    enemyType: 'standard',
                                    x: ent.x + Math.cos(angle) * 30,
                                    y: ent.y + Math.sin(angle) * 30,
                                    radius: Math.round(ent.radius * 0.55),
                                    hp: miniHp,
                                    maxHp: miniHp,
                                    color: '#fda4af',
                                    velocity: { x: Math.cos(angle) * 80, y: Math.sin(angle) * 80 },
                                    speed: (ent.speed || 60) * 1.4,
                                    shootTimer: 0
                                });
                            }
                            io.to(roomId).emit('visual_effect', { type: 'explosion', x: ent.x, y: ent.y, color: '#fb7185', strength: 15, radius: 60 });
                        }
                        room.enemies.splice(idx, 1);
                        return; // skip further processing for this enemy
                    }
                }

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

                    } else if (ent.enemyType === 'healer') {
                        // HEALER AI — stay near allies and heal them
                        const angle = Math.atan2(nearestPlayer.y - ent.y, nearestPlayer.x - ent.x);
                        const distToPlayer = Math.sqrt((nearestPlayer.x - ent.x) ** 2 + (nearestPlayer.y - ent.y) ** 2);
                        if (distToPlayer > 300) {
                            ent.velocity.x += Math.cos(angle) * ent.speed * dt;
                            ent.velocity.y += Math.sin(angle) * ent.speed * dt;
                        }
                        // Heal nearby enemies every 2 seconds
                        ent.healCooldown = (ent.healCooldown || 0) + dt;
                        if (ent.healCooldown > 2) {
                            ent.healCooldown = 0;
                            const healRadius = ent.healRadius || 120;
                            const healAmount = ent.healAmount || 8;
                            room.enemies.forEach(ally => {
                                if (ally.id !== ent.id && ally.hp < ally.maxHp) {
                                    const d = Math.sqrt((ally.x - ent.x) ** 2 + (ally.y - ent.y) ** 2);
                                    if (d < healRadius) {
                                        ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
                                        io.to(roomId).emit('visual_effect', { type: 'heal', x: ally.x, y: ally.y, color: '#4ade80' });
                                    }
                                }
                            });
                        }

                    } else if (ent.enemyType === 'ghost') {
                        // GHOST AI — phases in/out, invulnerable while phased
                        ent.phaseTimer = (ent.phaseTimer || 0) + dt;
                        const cycle = ent.phaseCycle || 3.0;
                        ent.phased = (ent.phaseTimer % (cycle * 2)) > cycle;
                        const angle = Math.atan2(nearestPlayer.y - ent.y, nearestPlayer.x - ent.x);
                        ent.velocity.x += Math.cos(angle) * ent.speed * (ent.phased ? 1.5 : 0.8) * dt;
                        ent.velocity.y += Math.sin(angle) * ent.speed * (ent.phased ? 1.5 : 0.8) * dt;

                    } else if (ent.enemyType === 'berserker') {
                        // BERSERKER AI — gets faster and more dangerous at low HP
                        const hpFrac = ent.hp / ent.maxHp;
                        if (hpFrac < 0.4 && !ent.enraged) {
                            ent.enraged = true;
                            ent.speed *= 1.8;
                            io.to(roomId).emit('visual_effect', { type: 'impact', x: ent.x, y: ent.y, color: '#f97316', strength: 20 });
                        }
                        const angle = Math.atan2(nearestPlayer.y - ent.y, nearestPlayer.x - ent.x);
                        ent.velocity.x += Math.cos(angle) * ent.speed * dt;
                        ent.velocity.y += Math.sin(angle) * ent.speed * dt;

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

            if (room.mode !== 'coop') {
                room.mapVoteTimer = (room.mapVoteTimer || 0) + dt;
                if (room.mapVoteTimer >= MAP_VOTE_INTERVAL / 1000) {
                    if (Object.keys(room.players).length >= 1) {
                        room.mapVoteTimer = 0;
                        if (!room.mapVote || !room.mapVote.active) {
                            startMapVote(roomId);
                        } else {
                            console.log(`[VOTE] Timer hit but vote already active`);
                        }
                    } else {
                        // Reset timer if 0 players so it doesn't build up forever
                        if (room.mapVoteTimer > (MAP_VOTE_INTERVAL / 1000) * 2) room.mapVoteTimer = 0;
                    }
                }
            }

            // Player movement & Wall Collision
            Object.values(room.players).forEach(p => {
                const nextX = p.x + p.velocity.x * dt;
                const nextY = p.y + p.velocity.y * dt;

                let finalX = nextX;
                let finalY = nextY;

                // Collide with map walls
                if (room.walls && room.walls.length > 0) {
                    room.walls.forEach(w => {
                        const buffer = p.radius;
                        // Check if p.x, p.y is already inside (unlikely) or if next position is inside
                        const rect = {
                            left: w.x - buffer,
                            right: w.x + w.w + buffer,
                            top: w.y - buffer,
                            bottom: w.y + w.h + buffer
                        };

                        if (finalX > rect.left && finalX < rect.right &&
                            finalY > rect.top && finalY < rect.bottom) {

                            // Simple resolution: push to nearest edge
                            const dxLeft = Math.abs(finalX - rect.left);
                            const dxRight = Math.abs(finalX - rect.right);
                            const dyTop = Math.abs(finalY - rect.top);
                            const dyBottom = Math.abs(finalY - rect.bottom);
                            const min = Math.min(dxLeft, dxRight, dyTop, dyBottom);

                            if (min === dxLeft) finalX = rect.left;
                            else if (min === dxRight) finalX = rect.right;
                            else if (min === dyTop) finalY = rect.top;
                            else if (min === dyBottom) finalY = rect.bottom;
                        }
                    });
                }

                p.x = Math.max(p.radius, Math.min(800 - p.radius, finalX));
                p.y = Math.max(p.radius, Math.min(600 - p.radius, finalY));

                // Decay highlights
                if (p.aura_highlight_timer && p.aura_highlight_timer > 0) {
                    p.aura_highlight_timer -= dt;
                }

                // --- TIME BASED TITLES CHECK (Every Tick or Periodic) ---
                const now = Date.now();
                const pSocket = io.sockets.sockets.get(p.id);

                // 1. Friendly (30 mins without firing)
                if (!p.hasFired && (now - p.joinedAt) > 30 * 60 * 1000) {
                    unlockTitle(p.username, 'friendly', pSocket);
                }

                // 2. Hostile (Fire continuously for 5 mins)
                // If they haven't fired in 5 seconds, reset continuous start
                if (p.lastFireTime && (now - p.lastFireTime) > 5000) {
                    p.continuousFireStartTime = 0;
                }
                if (p.continuousFireStartTime && (now - p.continuousFireStartTime) > 5 * 60 * 1000) {
                    unlockTitle(p.username, 'hostile', pSocket);
                }

                // 3. ZZZ (AFK 24 hours) - Use 1 min for testing if you want, but sticking to 24h as per request
                if (p.lastActionTime && (now - p.lastActionTime) > 24 * 60 * 60 * 1000) {
                    unlockTitle(p.username, 'zzz', pSocket);
                }
            });
        } catch (loopErr) {
            console.error(`[LOOP ERROR] Room ${roomId}:`, loopErr.message);
        }
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
                waveState: room.waveState,
                walls: room.walls || [],
                currentMap: room.currentMap || 'arena_open',
                mapVote: (room.mapVote && room.mapVote.active) ? {
                    active: true,
                    endTime: room.mapVote.endTime,
                    options: room.mapVote.options.map(id => ({ id, ...MAPS[id] })),
                    tally: (() => {
                        const t = {};
                        room.mapVote.options.forEach(id => { t[id] = 0; });
                        Object.values(room.mapVote.votes).forEach(v => { if (t[v] !== undefined) t[v]++; });
                        return t;
                    })()
                } : null
            });
        }
    }
}, TICK_INTERVAL);

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
