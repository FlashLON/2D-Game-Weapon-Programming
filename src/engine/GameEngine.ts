import type { WeaponScript } from './PyodideManager';

/**
 * Represents any moving object in the game world.
 * Can be a player, enemy, or projectile.
 */
export interface Entity {
    id: string;
    x: number;
    y: number;
    radius: number;
    color: string;
    hp: number;
    maxHp: number;
    type: 'player' | 'enemy' | 'projectile';
    damage?: number;     // Damage dealt by this entity (if projectile)
    knockback?: number;  // Knockback force applied on hit
    pierce?: number;     // Number of targets it can hit before destroying
    homing?: number;     // Homing steering strength
    lifetime?: number;   // Current lifetime in seconds
    maxLifetime?: number;// Initial lifetime in seconds
    acceleration?: number; // Acceleration factor
    velocity: { x: number; y: number };
    playerId?: string;   // Owner of the entity (for projectiles)
    // Advanced Behaviors
    orbit_player?: boolean;
    vampirism?: number;       // Heal percent
    split_on_death?: number;  // Fragments count
    attraction_force?: number;// Pull strength

    // New Features
    bounciness?: number;
    spin?: number;
    chain_range?: number;
    orbit_speed?: number;
    orbit_radius?: number;
    kills?: number;
    deaths?: number;
}

/**
 * The global state of the game.
 * Contains all active entities, score, and status.
 */
export interface GameState {
    entities: Entity[];
    projectiles: Entity[];
    score: number;
    gameOver: boolean;
    leaderboard?: { id: string; kills: number; deaths: number }[];
}

/**
 * Core Game Engine.
 * Manages the game loop, physics, collision detection, and entity state.
 * Implements a Pub/Sub pattern to notify UI of state changes.
 */
export class GameEngine {
    private state: GameState;
    private weaponScript: WeaponScript | null = null;
    private lastTime: number = 0;
    private animationFrameId: number | null = null;
    private onStateChange: ((state: GameState) => void) | null = null;

    private isMultiplayer = false;
    private localPlayerId: string | null = null;
    private snapshots: { timestamp: number; state: any }[] = [];
    private INTERPOLATION_OFFSET = 60; // ms lookback - lower is more live, higher is smoother

    constructor() {
        // Initialize default state with empty arrays
        this.state = {
            entities: [],
            projectiles: [],
            score: 0,
            gameOver: false,
        };
    }

    setWeaponScript(script: WeaponScript) {
        this.weaponScript = script;
        if (this.weaponScript.init) {
            this.weaponScript.init();
        }
    }

    subscribe(callback: (state: GameState) => void) {
        this.onStateChange = callback;
    }

    start() {
        if (this.animationFrameId) return;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    reset() {
        this.state = {
            entities: [
                // Player
                { id: 'player', x: 400, y: 300, radius: 20, color: '#00ff9f', hp: 100, maxHp: 100, type: 'player', velocity: { x: 0, y: 0 } },
                // Dummy Enemy
                { id: 'enemy1', x: 600, y: 300, radius: 20, color: '#ff0055', hp: 50, maxHp: 50, type: 'enemy', velocity: { x: 0, y: 0 } }
            ],
            projectiles: [],
            score: 0,
            gameOver: false,
        };
        this.notify();
    }

    private gameLoop = () => {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.notify();

        if (!this.state.gameOver) {
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
        }
    };

    private update(dt: number) {
        if (this.isMultiplayer) {
            this.interpolateMultiplayer(dt);
            return;
        }

        if (this.weaponScript) {
            try {
                this.weaponScript.update(dt);
            } catch (e) {
                console.error("Error in weapon update:", e);
            }
        }

        this.state.entities.forEach(ent => {
            ent.x += ent.velocity.x * dt;
            ent.y += ent.velocity.y * dt;

            if (ent.type === 'player') {
                const bounds = this.getArenaBounds();
                ent.x = Math.max(ent.radius, Math.min(bounds.width - ent.radius, ent.x));
                ent.y = Math.max(ent.radius, Math.min(bounds.height - ent.radius, ent.y));
            }
        });

        for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
            const proj = this.state.projectiles[i];

            if (proj.orbit_player) {
                const player = this.state.entities.find(e => e.type === 'player');
                if (player) {
                    if ((proj as any).orbitAngle === undefined) {
                        (proj as any).orbitAngle = Math.atan2(proj.y - player.y, proj.x - player.x);
                        let r = proj.orbit_radius || Math.sqrt((proj.x - player.x) ** 2 + (proj.y - player.y) ** 2);
                        if (r < 10) r = 60;
                        (proj as any).orbitRadius = r;
                    }

                    const orbitSpeed = proj.orbit_speed || 3.0;
                    (proj as any).orbitAngle += orbitSpeed * dt;

                    proj.x = player.x + Math.cos((proj as any).orbitAngle) * (proj as any).orbitRadius;
                    proj.y = player.y + Math.sin((proj as any).orbitAngle) * (proj as any).orbitRadius;

                    proj.velocity.x = -(proj as any).orbitRadius * orbitSpeed * Math.sin((proj as any).orbitAngle);
                    proj.velocity.y = (proj as any).orbitRadius * orbitSpeed * Math.cos((proj as any).orbitAngle);
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
                    const nearest = this.getNearestEnemy(proj.x, proj.y);
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

                proj.x += proj.velocity.x * dt;
                proj.y += proj.velocity.y * dt;

                if (proj.bounciness && proj.bounciness > 0) {
                    const bounds = this.getArenaBounds();
                    if (proj.x < proj.radius) {
                        proj.x = proj.radius;
                        proj.velocity.x *= -proj.bounciness;
                    } else if (proj.x > bounds.width - proj.radius) {
                        proj.x = bounds.width - proj.radius;
                        proj.velocity.x *= -proj.bounciness;
                    }
                    if (proj.y < proj.radius) {
                        proj.y = proj.radius;
                        proj.velocity.y *= -proj.bounciness;
                    } else if (proj.y > bounds.height - proj.radius) {
                        proj.y = bounds.height - proj.radius;
                        proj.velocity.y *= -proj.bounciness;
                    }
                }
            }

            if (proj.attraction_force && proj.attraction_force > 0) {
                const range = 200;
                const force = proj.attraction_force * 1000;
                this.state.entities.forEach(e => {
                    if (e.type === 'enemy') {
                        const dx = proj.x - e.x;
                        const dy = proj.y - e.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < range * range && distSq > 100) {
                            const dist = Math.sqrt(distSq);
                            const ax = (dx / dist) * (force / distSq);
                            const ay = (dy / dist) * (force / distSq);
                            e.velocity.x += ax * dt;
                            e.velocity.y += ay * dt;
                        }
                    }
                });
            }

            if (proj.lifetime !== undefined) {
                proj.lifetime -= dt;
                if (proj.lifetime <= 0) {
                    if (proj.split_on_death) {
                        this.spawnFragments(proj, proj.split_on_death);
                    }
                    this.state.projectiles.splice(i, 1);
                    continue;
                }
            }

            if (!(proj.bounciness && proj.bounciness > 0)) {
                if (proj.x < -100 || proj.x > 900 || proj.y < -100 || proj.y > 700) {
                    this.state.projectiles.splice(i, 1);
                }
            } else {
                if (proj.x < -500 || proj.x > 1300 || proj.y < -500 || proj.y > 1100) {
                    this.state.projectiles.splice(i, 1);
                }
            }
        }

        this.checkCollisions();
    }

    private checkCollisions() {
        for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
            const p = this.state.projectiles[i];
            let hitSomething = false;

            for (const e of this.state.entities) {
                if (e.type === 'enemy') {
                    const dx = p.x - e.x;
                    const dy = p.y - e.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < p.radius + e.radius) {
                        const dmg = p.damage || 10;
                        e.hp -= dmg;

                        if (p.vampirism && p.vampirism > 0) {
                            const heal = dmg * (p.vampirism / 100);
                            const player = this.state.entities.find(ent => ent.type === 'player');
                            if (player) {
                                player.hp = Math.min(player.maxHp, player.hp + heal);
                            }
                        }

                        if (p.knockback) {
                            const angle = Math.atan2(dy, dx);
                            e.velocity.x -= Math.cos(angle) * p.knockback;
                            e.velocity.y -= Math.sin(angle) * p.knockback;
                        }

                        if (this.weaponScript && this.weaponScript.on_hit) {
                            try { this.weaponScript.on_hit(e.id); } catch (err) { console.error(err); }
                        }

                        hitSomething = true;

                        if (e.hp <= 0) {
                            e.hp = e.maxHp;
                            e.x = Math.random() * 700 + 50;
                            e.y = Math.random() * 500 + 50;
                            e.velocity = { x: 0, y: 0 };
                            this.state.score += 1;
                            if (this.weaponScript && this.weaponScript.on_kill) {
                                try { this.weaponScript.on_kill(e.id); } catch (err) { console.error(err); }
                            }
                        }

                        if (p.chain_range && p.chain_range > 0) {
                            const nearest = this.getNearestEnemyExcept(p.x, p.y, e.id);
                            if (nearest && Math.sqrt((nearest.x - p.x) ** 2 + (nearest.y - p.y) ** 2) <= p.chain_range) {
                                const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2);
                                const angle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
                                p.velocity.x = Math.cos(angle) * speed;
                                p.velocity.y = Math.sin(angle) * speed;
                                if (p.pierce && p.pierce > 1) {
                                    p.pierce--;
                                    hitSomething = false;
                                } else {
                                    hitSomething = true;
                                }
                            } else if (p.pierce && p.pierce > 1) {
                                p.pierce--;
                                hitSomething = false;
                            } else {
                                hitSomething = true;
                            }
                        } else if (p.pierce && p.pierce > 1) {
                            p.pierce--;
                            hitSomething = false;
                        } else {
                            hitSomething = true;
                        }

                        if (hitSomething) break;
                    }
                }
            }

            if (hitSomething) {
                this.state.projectiles.splice(i, 1);
            }
        }
    }

    private getNearestEnemyExcept(x: number, y: number, exceptId: string): Entity | null {
        let nearest: Entity | null = null;
        let minDistSq = Infinity;
        this.state.entities.forEach(e => {
            if (e.type === 'enemy' && e.id !== exceptId) {
                const distSq = (e.x - x) ** 2 + (e.y - y) ** 2;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    nearest = e;
                }
            }
        });
        return nearest;
    }

    private spawnFragments(parent: Entity, count: number) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 200;
            this.spawnProjectile({
                x: parent.x,
                y: parent.y,
                speed: speed,
                angle: angle * (180 / Math.PI),
                radius: Math.max(2, parent.radius * 0.6),
                color: parent.color,
                damage: Math.ceil((parent.damage || 10) * 0.5),
                lifetime: 0.5
            });
        }
    }

    spawnProjectile(params: any): Entity | null {
        const player = this.state.entities.find(e => e.type === 'player');
        const x = params.x ?? (player ? player.x : 400);
        const y = params.y ?? (player ? player.y : 300);
        const radius = params.radius ?? 5;
        const color = params.color ?? '#fce83a';
        const damage = params.damage ?? 10;
        const knockback = params.knockback ?? 0;
        const pierce = params.pierce ?? 1;
        const homing = params.homing ?? 0;
        const lifetime = params.lifetime ?? 5;
        const acceleration = params.acceleration ?? 0;
        const orbit_player = params.orbit_player ?? false;
        const vampirism = params.vampirism ?? 0;
        const split_on_death = params.split_on_death ?? 0;
        const attraction_force = params.attraction_force ?? 0;
        const bounciness = params.bounciness ?? 0;
        const spin = params.spin ?? 0;
        const chain_range = params.chain_range ?? 0;
        const orbit_speed = params.orbit_speed ?? 3.0;
        const orbit_radius = params.orbit_radius ?? 60;

        let vx = params.vx ?? 0;
        let vy = params.vy ?? 0;

        if (params.speed !== undefined && params.angle !== undefined) {
            const rad = params.angle * (Math.PI / 180);
            vx = Math.cos(rad) * params.speed;
            vy = Math.sin(rad) * params.speed;
        }

        const projectileData: Entity = {
            id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            x, y, radius, color, hp: 1, maxHp: 1, damage, knockback, pierce, type: 'projectile',
            velocity: { x: vx, y: vy }, homing, lifetime, maxLifetime: lifetime, acceleration,
            orbit_player, vampirism, split_on_death, attraction_force, bounciness, spin, chain_range, orbit_speed, orbit_radius,
            playerId: this.localPlayerId || undefined
        };

        if (!this.isMultiplayer || projectileData.playerId === this.localPlayerId) {
            // In multiplayer, we spawn our OWN projectiles immediately for feedback
            this.state.projectiles.push(projectileData);
        }
        return projectileData;
    }

    getAllProjectiles() {
        return this.state.projectiles.map(p => ({
            id: p.id, x: p.x, y: p.y, damage: p.damage, color: p.color, radius: p.radius
        }));
    }

    private notify() {
        if (this.onStateChange) {
            this.onStateChange({ ...this.state });
        }
    }

    getEnemies() {
        return this.state.entities.filter(e => e.type === 'enemy')
            .map(e => ({ id: e.id, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp }));
    }

    getNearestEnemy(x: number, y: number): { id: string, x: number, y: number, hp: number, dist: number } | null {
        let nearest = null;
        let minDistSq = Infinity;
        this.state.entities.forEach(e => {
            if (e.type === 'enemy') {
                const distSq = (e.x - x) ** 2 + (e.y - y) ** 2;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    nearest = { id: e.id, x: e.x, y: e.y, hp: e.hp, dist: Math.sqrt(distSq) };
                }
            }
        });
        return nearest;
    }

    getEntitiesInRange(x: number, y: number, range: number) {
        return this.state.entities.filter(e => e.type === 'enemy')
            .map(e => {
                const dist = Math.sqrt((e.x - x) ** 2 + (e.y - y) ** 2);
                return { id: e.id, x: e.x, y: e.y, hp: e.hp, dist };
            })
            .filter(e => e.dist <= range);
    }

    getPlayer() {
        const p = this.state.entities.find(e => e.type === 'player');
        if (p) return { id: p.id, x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp };
        return null;
    }

    getArenaBounds() { return { width: 800, height: 600 }; }

    setPlayerVelocity(vx: number, vy: number) {
        const player = this.localPlayerId
            ? this.state.entities.find(e => e.id === this.localPlayerId)
            : this.state.entities.find(e => e.type === 'player');

        if (player) {
            player.velocity.x = vx;
            player.velocity.y = vy;
        }
    }

    fireWeapon(targetX: number, targetY: number) {
        if (!this.weaponScript || !this.weaponScript.on_fire) return;

        // Find the correct player (self in multiplayer, or the only player in solo)
        const player = this.localPlayerId
            ? this.state.entities.find(e => e.id === this.localPlayerId)
            : this.state.entities.find(e => e.type === 'player');

        if (!player) return;
        try {
            const result = this.weaponScript.on_fire(targetX, targetY, player.x, player.y);
            if (result) {
                const rawParams = result.toJs ? result.toJs() : result;
                let params: any = {};
                if (rawParams instanceof Map || (rawParams && typeof rawParams.get === 'function')) {
                    rawParams.forEach((v: any, k: any) => { params[k] = v; });
                } else {
                    params = rawParams;
                }
                params.x = player.x;
                params.y = player.y;
                const proj = this.spawnProjectile(params);
                if (proj) {
                    return { ...proj, vx: proj.velocity.x, vy: proj.velocity.y };
                }
            }
        } catch (err) { console.error("Error firing weapon:", err); }
        return null;
    }

    setMultiplayerMode(enabled: boolean, myId: string | null = null) {
        this.isMultiplayer = enabled;
        this.localPlayerId = myId;
    }

    updateFromSnapshot(snapshot: any) {
        // Add to snapshots buffer for interpolation
        this.snapshots.push({
            timestamp: Date.now(),
            state: snapshot
        });

        // Keep buffer manageable (last 1 second)
        if (this.snapshots.length > 20) {
            this.snapshots.shift();
        }

        // Stats and Global State sync
        this.state.score = snapshot.score || 0;

        // Local Player HUD sync
        if (this.localPlayerId) {
            const serverMe = (snapshot.players || {})[this.localPlayerId];
            const localMe = this.state.entities.find(e => e.id === this.localPlayerId);
            if (serverMe && localMe) {
                localMe.hp = serverMe.hp;
                localMe.kills = serverMe.kills;
                localMe.deaths = serverMe.deaths;
            }
        }

        // Leaderboard Sync
        const leaderboard = Object.values(snapshot.players || {}).map((p: any) => ({
            id: p.id,
            kills: p.kills || 0,
            deaths: p.deaths || 0
        })).sort((a: any, b: any) => b.kills - a.kills);

        this.state.leaderboard = leaderboard;
        this.notify();
    }

    private interpolateMultiplayer(dt: number) {
        if (this.snapshots.length < 2) {
            // Not enough data yet, just extrapolate local player
            const me = this.state.entities.find(e => e.id === this.localPlayerId);
            if (me) {
                me.x += me.velocity.x * dt;
                me.y += me.velocity.y * dt;
                const bounds = this.getArenaBounds();
                me.x = Math.max(me.radius, Math.min(bounds.width - me.radius, me.x));
                me.y = Math.max(me.radius, Math.min(bounds.height - me.radius, me.y));
            }
            return;
        }

        const renderTime = Date.now() - this.INTERPOLATION_OFFSET;

        // Find snapshots to interpolate between
        let s1 = this.snapshots[0];
        let s2 = this.snapshots[1];

        for (let i = 0; i < this.snapshots.length - 1; i++) {
            if (renderTime >= this.snapshots[i].timestamp && renderTime <= this.snapshots[i + 1].timestamp) {
                s1 = this.snapshots[i];
                s2 = this.snapshots[i + 1];
                break;
            }
        }

        const t = (renderTime - s1.timestamp) / (s2.timestamp - s1.timestamp);
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        // Reconstruct Entities
        const playersArray = Object.values(s2.state.players || {}).map((p: any) => ({ ...p, type: 'player' as const }));
        const enemiesArray = (s2.state.enemies || []).map((e: any) => ({ ...e, type: 'enemy' as const }));
        const allServerEntities = [...playersArray, ...enemiesArray];

        const nextEntities: Entity[] = [];

        allServerEntities.forEach(e2 => {
            const e1Arr = [...Object.values(s1.state.players || {}), ...(s1.state.enemies || [])];
            const e1: any = e1Arr.find((e: any) => e.id === e2.id);

            if (e2.id === this.localPlayerId) {
                // Local player: Move based on input (Extrapolation)
                const localMe = this.state.entities.find(ent => ent.id === this.localPlayerId);
                if (localMe) {
                    localMe.x += localMe.velocity.x * dt;
                    localMe.y += localMe.velocity.y * dt;
                    const b = this.getArenaBounds();
                    localMe.x = Math.max(localMe.radius, Math.min(b.width - localMe.radius, localMe.x));
                    localMe.y = Math.max(localMe.radius, Math.min(b.height - localMe.radius, localMe.y));
                    nextEntities.push(localMe);
                } else {
                    nextEntities.push(e2);
                }
            } else if (e1) {
                // Other entities: Interpolate position
                nextEntities.push({
                    ...e2,
                    x: lerp(e1.x, e2.x, t),
                    y: lerp(e1.y, e2.y, t),
                    velocity: e2.vx !== undefined ? { x: e2.vx, y: e2.vy } : e2.velocity
                });
            } else {
                // No past data: snap to current
                nextEntities.push(e2);
            }
        });

        this.state.entities = nextEntities;

        // Interpolate Projectiles (Remote ones only, keep local previews)
        const p2Arr: any[] = s2.state.projectiles || [];
        const p1Arr: any[] = s1.state.projectiles || [];

        // 1. Get interpolated remote projectiles
        const interpolatedProjectiles = p2Arr
            .filter(p2 => p2.playerId !== this.localPlayerId) // Ignore server's version of our own shots (we simulate them)
            .map(p2 => {
                const p1 = p1Arr.find(p => p.id === p2.id);
                if (p1) {
                    return {
                        ...p2,
                        x: lerp(p1.x, p2.x, t),
                        y: lerp(p1.y, p2.y, t),
                        velocity: p2.vx !== undefined ? { x: p2.vx, y: p2.vy } : p2.velocity
                    };
                }
                return p2;
            });

        // 2. Keep local shots that aren't from server
        const localProjectiles = this.state.projectiles.filter(p => p.playerId === this.localPlayerId);

        // 3. Update lifetime for local shots (since we aren't using the server's ones)
        localProjectiles.forEach(p => {
            if (p.lifetime !== undefined) {
                p.lifetime -= dt;
                p.x += p.velocity.x * dt;
                p.y += p.velocity.y * dt;
            }
        });

        this.state.projectiles = [
            ...interpolatedProjectiles,
            ...localProjectiles.filter(p => (p.lifetime ?? 1) > 0)
        ];
    }
}

export const gameEngine = new GameEngine();
