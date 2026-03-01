# CyberCore — Code Architecture Guide

> Deep technical reference for developers working on the CyberCore codebase.
> Last updated: March 2026

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Server — index.js](#server--indexjs)
3. [Client — App.tsx](#client--apptsx)
4. [Game Engine — GameEngine.ts](#game-engine--gameenginets)
5. [Renderer — Arena.tsx](#renderer--arenatsx)
6. [Networking — NetworkManager.ts](#networking--networkmanagerts)
7. [Attribute System — AttributeRegistry.ts](#attribute-system--attributeregistryts)
8. [Python Runtime — PyodideManager.ts](#python-runtime--pyodidemanagerts)
9. [Aura System](#aura-system)
10. [Title System — TitleRegistry.ts](#title-system--titleregistryts)
11. [Data Flow](#data-flow)
12. [Security Model](#security-model)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER (CLIENT)                       │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ App.tsx  │──│ Lobby.tsx    │  │ WeaponEditor.tsx   │    │
│  │ (State)  │  │ (Pre-Game)   │  │ (Monaco + Python)  │    │
│  └────┬─────┘  └──────────────┘  └─────────┬──────────┘    │
│       │                                      │              │
│  ┌────▼──────────────────────────────────────▼──────────┐   │
│  │               GameEngine.ts                          │   │
│  │  • Client-side prediction (local player)             │   │
│  │  • Server state reconciliation (other entities)      │   │
│  │  • Solo mode physics (offline)                       │   │
│  │  • Aura effects processing                          │   │
│  │  • Collision detection (client-side prediction)      │   │
│  └────┬─────────────────────────────────────────────────┘   │
│       │                                                     │
│  ┌────▼─────────┐  ┌───────────────────┐                   │
│  │ Arena.tsx    │  │ NetworkManager.ts │                   │
│  │ (Canvas 2D) │  │ (Socket.IO)       │                   │
│  └──────────────┘  └────────┬──────────┘                   │
└──────────────────────────────┼──────────────────────────────┘
                               │ WebSocket
┌──────────────────────────────┼──────────────────────────────┐
│                      SERVER (Node.js)                       │
│                                                             │
│  ┌───────────────────────────▼──────────────────────────┐   │
│  │                 server/index.js                       │   │
│  │  • Authoritative game state                          │   │
│  │  • 45 FPS tick rate, 10 Hz broadcast                 │   │
│  │  • Physics, collision, damage calculations           │   │
│  │  • Aura effects (affects enemies + other players)    │   │
│  │  • Wave spawning, boss AI, enemy AI                  │   │
│  │  • Authentication (bcrypt)                           │   │
│  │  • Profile management                               │   │
│  │  • Admin commands                                    │   │
│  │  • Title unlock checking                            │   │
│  │  • Map voting system                                │   │
│  │  • Saved code storage                               │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │            Firebase Realtime Database                 │   │
│  │  • Persistent user profiles                          │   │
│  │  • Leaderboard data                                 │   │
│  │  • Saved weapon codes                               │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Server — index.js

**File**: `server/index.js` (~2626 lines)
**Role**: Authoritative multiplayer game server

### Key Subsystems

#### 1. Authentication (Lines ~520–680)
- Custom username/password auth with bcrypt
- `login` / `signup` socket events
- Session stored via `socket.data.username`
- Profiles persisted to Firebase on periodic save intervals
- In-memory fallback via `memoryUsers` Map

#### 2. Room Management (Lines ~680–780)
- Players join rooms by ID; auto-created if doesn't exist
- Room state: `{ players, enemies, projectiles, score, wave, walls, currentMap }`
- Spectator mode supported
- Profile data loaded into room player object on join

#### 3. Profile Sync (Lines ~784–840)
- Client sends `save_profile` with local profile state
- **Guard logic**: Server never allows client to overwrite admin-set values
  - Keeps whichever is higher for level/money/xp
  - Keeps whichever is higher for attribute limits (except inverted attributes like `cooldown` and `aura_control` where lower = better)
  - Keeps longer title/unlock arrays
- Room player object updated in real-time (`p.aura_type = profile.aura_type`)

#### 4. Admin System (Lines ~880–1220)
- Restricted to username `flashlon`
- Commands: `broadcast`, `give_money`, `set_stats`, `unlock_all_titles`, `max_limits`, `unlock_all_values`, `wipe_account`, `nuke_enemies`, `start_boss`, `global_heal`, `server_restart`
- Each command emits `profile_update` to affected sockets

#### 5. Combat & Fire Handling (Lines ~1468–1520)
- Client sends `fire` event with projectile params (already enforced by client-side limiter)
- Server adds `id`, `playerId`, `type`, `velocity`, `lifetime`, `radius`
- **Chaos Aura**: 30% chance to randomly boost damage/speed/radius if shooter has aura_chaos

#### 6. Game Loop (Lines ~1566–2620)
- **Tick rate**: 45 FPS (`TICK_INTERVAL = 1000/45`)
- **Broadcast rate**: 10 Hz (`BROADCAST_INTERVAL = 100ms`)

**Per-tick processing:**
1. Wave spawning (co-op mode) — enemy variety scales with wave number
2. Boss spawning every 5 waves
3. Projectile physics: acceleration, spin, homing, wave motion, wall bounce, attraction
4. Collision detection: damage, crits, focus fire, burst, execution, armor shred, DOT, vampirism, knockback, chain lightning, explosions, split on death
5. DOT/Aura effects on enemies
6. **Aura processing**: Iterates all players with `aura_type`, applies effects to all entities (enemies + other players) within 100px base range
7. Enemy AI: Standard chase, Sniper (ranged), Tank (heavy), Berserker (low-HP rage), Healer (allies), Splitter (fragments), Ghost (phase), Summoner (minions)
8. Boss AI: Chase, Rapid Fire, Charge phases
9. Player movement + wall collision
10. Title checks (time-based: Friendly, Hostile, ZZZ)

**Broadcast payload:**
```javascript
{
    players: room.players,      // Full player objects including aura_type, limits
    enemies: room.enemies,
    projectiles: room.projectiles,
    score, wave, waveState,
    walls, currentMap,
    mapVote                     // Active vote data if voting
}
```

#### 7. Map System (Lines ~381–460)
- 6 maps: `arena_open`, `arena_corridors`, `arena_fortress`, `arena_pillars`, `arena_maze`, `arena_divided`
- Map voting: Random 3 options → 15s vote → resolve by majority
- Walls defined as `{ x, y, w, h }` arrays

---

## Client — App.tsx

**File**: `src/App.tsx` (~922 lines)
**Role**: Root application state, authentication, profile management, enforcement

### Key Responsibilities

#### 1. User Profile State
```typescript
{
    level, xp, maxXp, money,
    unlocks: string[],           // Attribute IDs the player has access to
    limits: Record<string, number>,  // Current max value per attribute
    lastUpgradeLevel: Record<string, number>,
    titles: string[],
    equippedTitle: string | null,
    killCount: number,
    aura_type: string | null     // Currently equipped aura ID
}
```
- Loaded from `localStorage` on init, merged with defaults
- Saved to `localStorage` on every change
- Synced to server via `networkManager.saveProfile()` periodically

#### 2. Enforcer (Lines ~224–248)
```typescript
enforceProjectileLimits(params) → enforcedParams
```
- Applied to every projectile before spawn (both API and GameEngine)
- Caps `speed` magnitude to limit
- For each attribute in `ATTRIBUTES`: if not unlocked, forces to 0; if unlocked, caps to `limits[attr]`
- Aura attributes are skipped (handled separately)
- Passed to GameEngine via `gameEngine.setEnforcer()`

#### 3. Upgrade System (Lines ~160–207)
- `handleUpgrade(attributeId)`: Checks cost, level restrictions, maxed status
- Handles inverted attributes (cooldown, aura_control) where `upgradeStep < 0`
- Auto-equips auras on upgrade
- `handleEquipAura(auraId)`: Toggle equip/unequip for aura attributes

#### 4. Network Events (Lines ~300+)
- `onStateUpdate`: Feeds server state to GameEngine
- `onProfileUpdate`: Merges server profile changes (admin commands, title unlocks)
- `onKill`: Grants XP + money, handles level-ups
- `onVisualEffect`: Forwards visual events to GameEngine
- `onWaveEvent`: Handles wave start/boss spawn notifications

---

## Game Engine — GameEngine.ts

**File**: `src/engine/GameEngine.ts` (~1276 lines)
**Role**: Client-side game simulation, physics, rendering state

### Entity Interface
```typescript
interface Entity {
    id: string;
    type: 'player' | 'enemy';
    x, y: number;
    radius: number;
    hp, maxHp: number;
    color: string;
    velocity: { x, y };
    aura_type?: string;          // Active aura ID
    aura_timer?: number;
    aura_highlight_timer?: number;
    aura_highlight_color?: string;
    limits?: Record<string, number>;
    // ... many more fields
}
```

### Key Methods

#### `update(dt: number)` (Lines ~200–530)
Called every frame. In multiplayer, this does **client-side prediction**:
- **Local player**: Applies movement immediately, keeps local velocity
- **Other entities**: Extrapolates position from server velocity
- **Aura processing**: Applies visual highlights + gameplay effects to entities in range
- **Projectile simulation**: Orbit, wave, homing, spin, acceleration, fade

In solo/sandbox mode, this acts as the full game loop.

#### `checkCollisions()` (Lines ~690–860)
Client-side collision detection for solo mode and visual feedback:
- Projectile vs entities
- Damage calculation with all modifiers: crits, focus fire, burst, execution, armor shred, DOT
- Aura damage/precision bonuses
- Knockback, chain lightning, explosions, split on death
- Vampirism healing

#### `spawnProjectile(params)` (Lines ~878–960)
Creates a new projectile with enforced limits:
- Applies enforcer function
- Chaos Aura: 30% chance random boost
- Sets initial position, velocity, lifetime, all attribute values

#### `applyServerState(snapshot)` (Lines ~1100–1240)
Reconciles authoritative server state with local prediction:
- **Self (local player)**: If distance > 100px, hard snap; else soft pull (10% lerp)
- **Others**: 35% lerp toward server position each frame
- **New entities**: Direct create from server data
- **Removed entities**: Removed from local state
- Preserves `aura_type`, `limits`, `lastDealtDamageTime`, `lastCritTime`

#### `fireWeapon(tx, ty)` (Lines ~960–1050)
Called on mouse click:
- Executes Python weapon script via PyodideManager
- Passes result through enforcer
- Sends fire event to server
- Creates local projectile for immediate visual feedback

---

## Renderer — Arena.tsx

**File**: `src/components/Arena.tsx` (~700 lines)
**Role**: HTML5 Canvas 2D rendering of all game visuals

### Render Pipeline (per frame)
1. **Background**: Dark gradient, grid pattern
2. **Map walls**: Filled rectangles with glow effects
3. **Aura visuals**: Per-entity aura circle rendering
   - Each aura type has unique color gradient, pulse animation, particle effects
   - Range = 100px × (1 + scaleFactor based on strength)
4. **Enemies**: Colored circles with HP bars, type-specific visuals (healer cross, berserker flame, etc.)
5. **Players**: Circle + username + title + HP bar + aura highlight
6. **Projectiles**: Circles with trails, fade-over-time alpha, color based on attributes
7. **HUD**: HP bar, level, money, wave indicator, kill feed, crosshair

### Aura Visual Effects
```
aura_damage   → Red radial gradient with pulsing ring
aura_gravity  → Purple spinning vortex
aura_corruption → Green toxic mist particles
aura_execution → Orange expanding halo
aura_chaos    → Rainbow shifting RGB glitch
aura_control  → Blue ice crystal field
aura_vampire  → Red blood pulse
aura_precision → White grid overlay
```

---

## Networking — NetworkManager.ts

**File**: `src/utils/NetworkManager.ts` (~339 lines)
**Role**: Socket.IO client wrapper — all server communication

### Connection
- URL from `VITE_SERVER_URL` or localhost
- Transports: WebSocket preferred, polling fallback
- Auto-reconnection (5 attempts)

### Events Emitted (Client → Server)
| Event | Payload | Description |
|-------|---------|-------------|
| `login` | `{username, password}` | Authenticate |
| `signup` | `{username, password}` | Register |
| `join_room` | `{roomId, settings, profile}` | Enter a game room |
| `move` | `{x, y}` | Velocity update |
| `fire` | `{vx, vy, damage, ...attrs}` | Spawn projectile |
| `save_profile` | `{profile}` | Sync profile to server |
| `equip_title` | `{titleId}` | Equip/unequip title |
| `vote_map` | `{mapId}` | Cast map vote |
| `admin_command` | `{command, payload}` | Admin action |
| `save_code` | `{username, codeName, codeContent}` | Save weapon code |
| `fetch_saved_codes` | `{username}` | List saved codes |
| `load_code` | `{username, codeId}` | Load a saved code |
| `delete_code` | `{username, codeId}` | Delete a saved code |
| `rename_code` | `{username, codeId, newName}` | Rename a saved code |

### Events Received (Server → Client)
| Event | Payload | Handler |
|-------|---------|---------|
| `init` | `{playerId, isSpectator, gameState}` | Set player ID, load initial state |
| `state` | Full room state (10 Hz) | `applyServerState()` |
| `kill` | `{enemyId}` | Grant XP/money |
| `visual_effect` | `{type, x, y, color, ...}` | Render impact, explosion, etc. |
| `profile_update` | Profile object | Merge admin changes |
| `notification` | `{type, message}` | Toast notification |
| `global_leaderboard` | Array of entries | Update leaderboard |
| `wave_start` | `{wave}` | Wave notification |
| `boss_spawn` | `{wave}` | Boss alert |
| `map_vote_start` | `{options, endTime}` | Show vote overlay |
| `map_vote_update` | `{tally}` | Update vote counts |
| `map_change` | `{mapId, walls}` | Switch map |

---

## Attribute System — AttributeRegistry.ts

**File**: `src/utils/AttributeRegistry.ts` (~584 lines)
**Role**: Central definition of all 43 upgradeable attributes

### Attribute Definition
```typescript
{
    id: string,               // Unique key (e.g. 'homing', 'aura_damage')
    name: string,             // Display name
    description: string,      // Tooltip text
    isBase: boolean,          // true = always unlocked (speed, damage, hp, cooldown)
    isAura?: boolean,         // true = aura attribute (only one equipped at a time)
    startLimit: number,       // Default value when first unlocked
    maxLimit: number,         // Maximum achievable value
    upgradeStep: number,      // Amount added per upgrade (negative = inverted)
    baseCost: number,         // Cost of first upgrade
    costMultiplier: number,   // Exponential cost scaling
    icon: LucideIcon          // UI icon component
}
```

### Inverted Attributes
Two attributes have `upgradeStep < 0` (lower value = better):
- **`cooldown`**: 0.5 → 0.05 (faster fire rate)
- **`aura_control`**: 0.8 → 0.2 (stronger slow)

The upgrade cost function uses `Math.abs(upgradeStep)` to handle this correctly.

### Categories
- **Base (4)**: speed, damage, hp, cooldown — always unlocked
- **Projectile Mechanics (17)**: lifetime, radius, homing, pierce, knockback, acceleration, vampirism, split_on_death, attraction_force, bounciness, spin, explosion_radius, explosion_damage, chain_count, chain_range, wave_amplitude, wave_frequency
- **Orbital (3)**: orbit_player, orbit_speed, orbit_radius
- **Toggle (1)**: fade_over_time
- **Combat Modifiers (10)**: focus_fire, burst_damage, execution_damage, crit_chance, crit_damage, dot_damage, armor_shred
- **Auras (8)**: aura_damage, aura_gravity, aura_corruption, aura_execution, aura_chaos, aura_control, aura_vampire, aura_precision

---

## Python Runtime — PyodideManager.ts

**File**: `src/engine/PyodideManager.ts` (~150 lines)
**Role**: Load and execute Python weapon scripts in the browser via WebAssembly

### How It Works
1. Loads Pyodide (Python compiled to WASM) on first use
2. Player writes a `Weapon` class with `on_fire(tx, ty, mx, my)` method
3. On each click/fire, `on_fire()` is called with target and player coordinates
4. Returns a dict (or list of dicts) with projectile parameters
5. Parameters are passed through the enforcer before spawning

### Sandboxing
- Scripts run in Pyodide's isolated environment
- `api` object injected with safe game methods only
- No filesystem, network, or system access
- Execution timeout prevents infinite loops

---

## Aura System

### How Auras Work

#### Equipping
1. Player buys/upgrades an aura attribute in the Lobby shop
2. `aura_type` is set on the user profile (e.g., `'aura_damage'`)
3. Only one aura active at a time — equipping a new one replaces the old
4. Clicking an already-equipped aura unequips it (sets to `null`)

#### Server Processing (Authoritative)
```
Every tick:
  For each player P with aura_type:
    Build targets = [...enemies, ...otherPlayers] (not self)
    For each target within range (100px base):
      Apply highlight visual
      Apply effect based on aura type
```

#### Client Processing
- **Multiplayer**: Receives server state including `aura_type` and `aura_highlight_timer` on entities. Arena.tsx renders visual effects accordingly.
- **Solo mode**: GameEngine.ts runs the full aura logic locally (same algorithm as server).

#### Range Calculation
```javascript
const baseRange = 100;  // pixels
const strength = player.limits[aura] || 1;
const rangeScale = 1 + Math.min(0.3, Math.max(0, (strength / startLimit) - 1) * 0.5);
const range = baseRange * rangeScale;  // 100px to 130px at max
```

---

## Title System — TitleRegistry.ts

**File**: `src/utils/TitleRegistry.ts` (~200 lines)
**Role**: Define unlock conditions and metadata for achievement titles

### Server-Side Checking
Titles are checked on the server in two places:
1. **`checkTitles()`** — Called on join room and profile save. Checks stat-based titles (OP, etc.)
2. **Game loop** — Checks time-based titles every tick (Friendly, Hostile, ZZZ)
3. **Collision/kill events** — Checks combat titles (Sneaky, ThreeForOne)

When unlocked, server emits `profile_update` + `notification` to the player's socket.

---

## Data Flow

### Fire → Damage → Kill Flow
```
1. Player clicks → GameEngine.fireWeapon(tx, ty)
2. PyodideManager executes weapon Python script
3. Enforcer caps all values to profile limits
4. Client creates local projectile (instant feedback)
5. NetworkManager sends 'fire' event to server
6. Server creates authoritative projectile (with ID, playerId)
7. Server tick: projectile physics (homing, spin, wave, etc.)
8. Server collision check: damage calc with all modifiers
9. If kill: server emits 'kill' event → client grants XP/money
10. Server broadcasts updated state at 10 Hz
11. Client reconciles: soft lerp for others, prediction for self
```

### Profile Sync Flow
```
1. Client upgrades attribute → setUserProfile()
2. localStorage updated immediately
3. useEffect triggers saveProfile to server (debounced)
4. Server guard: keeps whichever values are higher (prevents client downgrade)
5. Server updates room player object in real-time
6. Server periodic save: writes to Firebase every few minutes
7. Server emits profile_update on admin changes → client merges
```

### Aura Effect Flow
```
1. Player equips aura → aura_type set on profile
2. Profile synced to server → room player gets aura_type
3. Every server tick:
   a. Find all players with active aura
   b. For each: find all entities in range (100px)
   c. Apply gameplay effect (damage, slow, pull, drain, etc.)
   d. Set aura_highlight_timer on affected targets
4. Broadcast state includes aura_type + highlight data
5. Client Arena.tsx renders visual aura circle + affected entity highlights
```

---

## Security Model

### Server Authority
- Server owns all game state — clients cannot directly modify HP, position, or kills
- Projectile parameters are accepted from client but server caps them (future improvement: server-side enforcement)
- Admin commands are gated by `socket.data.username === 'flashlon'`

### Profile Guard
- When client sends `save_profile`, server compares with its own data
- Server keeps whichever value is higher (prevents client-side money/level hacks)
- Inverted attributes (cooldown, aura_control) use reverse comparison (keeps lower)

### Authentication
- Passwords hashed with bcrypt (salt rounds = 10)
- Session maintained via `socket.data.username` (server-side only)
- No JWT tokens — session lives as long as socket connection

### Known Limitations
- Client sends projectile params in `fire` event — server doesn't re-enforce limits (trusts the client enforcer ran). A malicious client could bypass this.
- No rate limiting on fire events beyond projectile cap.
- Profile sync guard can be bypassed if client sends higher values before server has saved.

---

## Development Tips

### Adding a New Attribute
1. Add definition to `AttributeRegistry.ts` in the `ATTRIBUTES` object
2. Add handling in `GameEngine.ts` → `update()` or `checkCollisions()` or `spawnProjectile()`
3. Add same handling in `server/index.js` → game loop or collision section
4. Enforcer in `App.tsx` auto-handles it (iterates all ATTRIBUTES keys)
5. Lobby.tsx auto-renders it (iterates all ATTRIBUTES values)
6. Update admin `unlock_all_values` and `max_limits` in server if needed

### Adding a New Enemy Type
1. Add spawn logic in `server/index.js` → wave spawning section (~line 1600)
2. Add AI behavior in the enemy movement section (~line 2300)
3. Add visual rendering in `Arena.tsx` → enemy drawing section
4. Optionally add to `GameEngine.ts` for solo mode

### Adding a New Map
1. Add to `MAPS` object in `server/index.js` (~line 380)
2. Define `walls: [{ x, y, w, h }, ...]` array
3. Map auto-appears in vote rotation

### Adding a New Title
1. Add to `TitleRegistry.ts`
2. Add unlock check in `server/index.js` → `checkTitles()` or game loop
3. Call `unlockTitle(username, titleId, socket)`
