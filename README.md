# ⚡ CyberCore — Multiplayer Weapon Scripting Arena

A real-time multiplayer IO-style battle arena where you code custom weapons in Python and dominate the battlefield with 43 upgradeable attributes, 8 unique auras, co-op wave survival, and competitive PvP.

> **Live**: Hosted on Vercel (frontend) + Railway (backend) with Firebase Realtime Database for persistence.

---

## 🎮 Game Overview

CyberCore is a 2D top-down multiplayer arena game with a twist — **you write Python code to control your weapon**. Customize projectile behavior, unlock powerful attributes, equip devastating auras, and compete against other players or survive endless waves of enemies together.

### Core Features
- **🐍 Python Weapon Scripting** — Write real Python code (via Pyodide) to control weapon behavior
- **🌐 Real-time Multiplayer** — Socket.IO based authoritative server with client-side prediction
- **⚔️ 43 Upgradeable Attributes** — From basic damage to chain lightning, homing missiles, and orbital projectiles
- **🔮 8 Unique Auras** — Passive area effects that damage, slow, pull, drain, or buff within range
- **👥 Co-op Wave Survival** — Team up against increasingly difficult enemy waves with bosses
- **🏆 PvP Combat** — Battle other players with your custom builds
- **🏅 Title System** — Unlock achievement-based titles through gameplay feats
- **📊 Global Leaderboard** — Compete for the highest level and kill count
- **🗺️ Dynamic Maps** — Multiple arenas with map voting between rounds
- **👑 Admin Panel** — Full server control for admin users (flashlon)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **npm**

### Local Development
```bash
# 1. Install frontend dependencies
npm install

# 2. Install server dependencies
cd server && npm install && cd ..

# 3. Start the backend server
cd server && node index.js
# Server runs on http://localhost:3000

# 4. In a new terminal, start the frontend
npm run dev
# Frontend runs on http://localhost:5173
```

### Environment Variables

**Frontend** (`.env` in root):
```env
VITE_SERVER_URL=http://localhost:3000
```

**Backend** (`server/.env`):
```env
PORT=3000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

---

## 🎯 How to Play

### Controls
| Key | Action |
|-----|--------|
| **W/A/S/D** | Move your player |
| **Mouse Click** | Fire weapon toward cursor |
| **Hold Click** | Continuous fire |

### Gameplay Loop
1. **Login/Signup** → Create an account to save progress
2. **Join a Room** → Enter a room code or create a new one
3. **Write Weapon Code** → Modify your Python weapon script in the editor
4. **Deploy & Fight** → Click "DEPLOY WEAPON" and battle enemies/players
5. **Earn Money & XP** → Kill enemies to level up and earn currency
6. **Upgrade Attributes** → Spend money to increase weapon limits
7. **Equip Auras** → Choose a passive area effect
8. **Unlock Titles** → Achieve feats to earn unique titles

### Game Modes
- **PvP Arena** — Free-for-all player versus player combat
- **Co-op Waves** — Team survival against enemy waves with bosses every 5 waves

---

## 🐍 Weapon Scripting Guide

### Basic Weapon
```python
class Weapon:
    def __init__(self):
        self.msg = "Ready to fire"

    def on_fire(self, tx, ty, mx, my):
        import math
        angle = math.atan2(ty - my, tx - mx)
        return {
            "speed": 300,
            "angle": math.degrees(angle),
            "damage": 25
        }

    def on_hit(self, target_id):
        pass

    def update(self, dt):
        pass
```

### Advanced Weapon — Homing Shotgun
```python
class Weapon:
    def __init__(self):
        self.msg = "Homing Shotgun"

    def on_fire(self, tx, ty, mx, my):
        import math
        base_angle = math.atan2(ty - my, tx - mx)
        shots = []
        for i in range(-2, 3):
            angle = base_angle + (i * 0.15)
            shots.append({
                "speed": 400,
                "angle": math.degrees(angle),
                "damage": 15,
                "homing": 3,
                "lifetime": 3.0,
                "radius": 4,
                "pierce": 2,
                "color": "#ff00ff"
            })
        return shots
```

### Available API
| Method | Returns | Description |
|--------|---------|-------------|
| `api.log(msg)` | None | Print to console |
| `api.get_enemies()` | List | All visible enemies `[{id, x, y, hp, radius}]` |
| `api.get_nearest_enemy(x, y)` | Dict | Closest enemy to coordinates |
| `api.get_player()` | Dict | Your player `{x, y, hp, maxHp}` |
| `api.get_arena_size()` | Dict | Arena dimensions `{width, height}` |
| `api.rand_float()` | Float | Random 0.0–1.0 |
| `api.spawn_projectile(params)` | None | Spawn a projectile directly |

### All Projectile Properties
| Property | Type | Max | Description |
|----------|------|-----|-------------|
| `speed` | number | 1200 | Pixels per second |
| `angle` | number | — | Direction in degrees |
| `damage` | number | 250 | Base damage per hit |
| `color` | string | — | Hex color code |
| `radius` | number | 80 | Projectile hitbox size |
| `lifetime` | number | 8.0 | Seconds before despawn |
| `homing` | number | 50 | Steering strength toward enemies |
| `pierce` | number | 25 | Targets hit before destroying |
| `knockback` | number | 500 | Push force on impact |
| `acceleration` | number | 2.0 | Speed multiplier over time |
| `vampirism` | number | 50 | % damage returned as health |
| `split_on_death` | number | 8 | Fragments on expiry |
| `attraction_force` | number | 100 | Pull force on nearby enemies |
| `bounciness` | number | 1.0 | Wall bounce retention |
| `spin` | number | 720 | Rotation degrees/sec |
| `explosion_radius` | number | 300 | AoE radius on impact |
| `explosion_damage` | number | 300 | AoE bonus damage |
| `chain_count` | number | 10 | Chain lightning bounces |
| `chain_range` | number | 500 | Max chain jump distance |
| `wave_amplitude` | number | 200 | Sine-wave width |
| `wave_frequency` | number | 20 | Sine-wave speed |
| `orbit_player` | 0/1 | 1 | Orbit around player |
| `orbit_speed` | number | 10 | Orbital rotation speed |
| `orbit_radius` | number | 200 | Orbital distance |
| `fade_over_time` | 0/1 | 1 | Alpha fades with lifetime |
| `crit_chance` | number | 100 | Critical hit % chance |
| `crit_damage` | number | 5.0 | Critical hit multiplier |
| `focus_fire` | number | 2.0 | Streak damage bonus |
| `burst_damage` | number | 500 | Bonus damage after 3s gap |
| `execution_damage` | number | 3.0 | Bonus from missing HP% |
| `dot_damage` | number | 200 | Damage over time (5s burn) |
| `armor_shred` | number | 1.0 | Reduces enemy resistance |

---

## 🔮 Auras

Auras are passive area-of-effect abilities. Only one can be equipped at a time. They affect **all entities** (enemies + other players) within range (100px base, scales with upgrades).

| Aura | Color | Effect |
|------|-------|--------|
| **🔴 Damage** | Deep Red | Multiplies all projectile damage |
| **🟣 Gravity** | Purple | Pulls all nearby entities toward you |
| **🟢 Corruption** | Toxic Green | Continuous poison DPS in range |
| **🟠 Execution** | Orange | Bonus DPS to enemies below 30% HP |
| **🌈 Chaos** | RGB Glitch | 30% chance to randomly boost projectile stats |
| **🔵 Control** | Ice Blue | Slows enemy movement speed |
| **❤️ Vampire** | Crimson | Drains HP from nearby enemies, heals you |
| **⬜ Precision** | White Grid | Boosts crit chance and focus fire |

---

## 🏅 Titles

Titles are unlocked through gameplay achievements and displayed next to your name.

| Title | Unlock Condition |
|-------|-----------------|
| **OP** | Max out all attributes |
| **Friendly** | Stay in a game 30+ minutes without firing |
| **Hostile** | Fire continuously for 5+ minutes |
| **ZZZ** | AFK for 24 hours |
| **Sneaky** | One-shot kill from full HP |
| **Three For One** | Kill 3+ enemies with one piercing projectile |

---

## 📁 Project Structure

```
CyberCore/
├── src/                          # Frontend (React + TypeScript + Vite)
│   ├── App.tsx                   # Main app — state, auth, profile, enforcer
│   ├── main.tsx                  # Entry point
│   ├── firebase.ts               # Firebase client initialization
│   ├── components/
│   │   ├── Arena.tsx             # Canvas renderer — all visuals, auras, HUD
│   │   ├── Lobby.tsx             # Pre-game UI — login, rooms, shop, admin
│   │   ├── WeaponEditor.tsx      # Monaco code editor wrapper
│   │   ├── Console.tsx           # Python output console
│   │   ├── DocsPanel.tsx         # In-game documentation
│   │   ├── Workshop.tsx          # Code workshop/playground
│   │   ├── Tutorial.tsx          # Interactive tutorial
│   │   ├── LevelUpModal.tsx      # Level-up card draft UI
│   │   ├── MapVoteOverlay.tsx    # Map voting during gameplay
│   │   ├── TitlesPanel.tsx       # Title equip/view panel
│   │   ├── SaveCodeModal.tsx     # Save weapon code dialog
│   │   ├── LoadCodeModal.tsx     # Load saved code dialog
│   │   └── SavedCodePanel.tsx    # Saved codes list
│   ├── engine/
│   │   ├── GameEngine.ts         # Core game logic — physics, collisions, auras
│   │   └── PyodideManager.ts     # Python runtime (Pyodide/WebAssembly)
│   └── utils/
│       ├── AttributeRegistry.ts  # All 43 attributes — limits, costs, icons
│       ├── NetworkManager.ts     # Socket.IO client — connect, emit, receive
│       └── TitleRegistry.ts      # Title definitions and unlock conditions
├── server/
│   ├── index.js                  # Authoritative game server (2600+ lines)
│   ├── package.json              # Server dependencies
│   ├── .env                      # Firebase credentials (gitignored)
│   ├── railway.toml              # Railway deployment config
│   └── FIREBASE_SETUP.md         # Firebase setup instructions
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite build configuration
├── tsconfig.json                 # TypeScript configuration
├── DEPLOYMENT_GUIDE.md           # Hosting guide (Vercel + Railway)
├── MULTIPLAYER_GUIDE.md          # Multiplayer architecture reference
└── IMPLEMENTATION_PLAN.md        # Original implementation roadmap
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS |
| **Code Editor** | Monaco Editor |
| **Python Runtime** | Pyodide (WebAssembly) |
| **Game Rendering** | HTML5 Canvas (2D) |
| **Networking** | Socket.IO (WebSocket) |
| **Backend** | Node.js + Express |
| **Database** | Firebase Realtime Database |
| **Auth** | Custom (bcrypt passwords, server sessions) |
| **Frontend Hosting** | Vercel |
| **Backend Hosting** | Railway |

---

## 🚀 Deployment

### Frontend → Vercel
```bash
# Auto-deploys on push to GitHub
# Or manually:
npm install -g vercel
vercel --prod
```

### Backend → Railway
```bash
# Auto-deploys on push to GitHub
# Set root directory to "server" in Railway dashboard
# Environment variables configured in Railway dashboard
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete setup instructions.

---

## 👑 Admin Commands

Admin access is restricted to username `flashlon`. Available via the Admin tab in the Lobby inventory panel.

| Command | Description |
|---------|-------------|
| **Broadcast Message** | Send a notification to all players |
| **Give Money** | Inject currency to a target user |
| **Set Stats** | Override level/XP/money for a user |
| **Unlock All Titles** | Grant every title to a user |
| **Max Out Limits** | Set all 43 attributes to max |
| **Unlock All VALUES** | Unlock + max all attributes |
| **Wipe Account** | Reset a user to default state |
| **Nuke Enemies** | Clear all enemies from a room or server |
| **Start Boss** | Spawn a boss in a room |
| **Global Heal** | Restore all players to full HP |
| **Server Restart** | Kick all players and reset |

---

## 📝 License

MIT License — free to use for learning and building.

---

**Made with ⚡ by FlashLON — React, TypeScript, Python, Socket.IO, Firebase**
