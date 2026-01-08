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

    /**
     * The main game loop driven by requestAnimationFrame.
     * Calculates delta time (dt) and updates physics/logic.
     */
    private gameLoop = () => {
        const now = performance.now();
        // dt is the time elapsed since last frame in seconds
        // We limit it to 0.1s to prevent huge jumps if the tab is backgrounded
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.notify(); // Inform UI to re-render

        // Schedule next frame if game is running
        if (!this.state.gameOver) {
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
        }
    };

    /**
     * Updates all game entities and logic.
     * @param dt Delta time in seconds
     */
    private update(dt: number) {
        // --- MULTIPLAYER LOGIC ---
        // If in multiplayer, we MAINLY rely on server, but we MUST update local player physics
        // to ensure smooth movement (Client Prediction).
        if (this.isMultiplayer) {
            if (this.localPlayerId) {
                const myPlayer = this.state.entities.find(e => e.id === this.localPlayerId);
                if (myPlayer) {
                    // Apply velocity to local player
                    myPlayer.x += myPlayer.velocity.x * dt;
                    myPlayer.y += myPlayer.velocity.y * dt;

                    // Client-side bounds check
                    const bounds = this.getArenaBounds();
                    myPlayer.x = Math.max(myPlayer.radius, Math.min(bounds.width - myPlayer.radius, myPlayer.x));
                    myPlayer.y = Math.max(myPlayer.radius, Math.min(bounds.height - myPlayer.radius, myPlayer.y));
                }
            }
            // We skip the rest of the simulation (other entities, collisions) 
            // because the server snapshot handles them.
            return;
        }

        // --- SINGLE PLAYER LOGIC (Normal Loop) ---
        // 1. Run user-defined update code (if any)
        if (this.weaponScript) {
            try {
                this.weaponScript.update(dt);
            } catch (e) {
                console.error("Error in weapon update:", e);
            }
        }

        // 2. Update movement for characters (Player/Enemies)
        this.state.entities.forEach(ent => {
            ent.x += ent.velocity.x * dt;
            ent.y += ent.velocity.y * dt;

            // Keep player within arena bounds
            if (ent.type === 'player') {
                const bounds = this.getArenaBounds();
                ent.x = Math.max(ent.radius, Math.min(bounds.width - ent.radius, ent.x));
                ent.y = Math.max(ent.radius, Math.min(bounds.height - ent.radius, ent.y));
            }
        });

        // 3. Update movement for projectiles
        for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
            const proj = this.state.projectiles[i];

            // --- LIFETIME LOGIC ---
            if (proj.lifetime !== undefined) {
                proj.lifetime -= dt;
                if (proj.lifetime <= 0) {
                    this.state.projectiles.splice(i, 1);
                    continue;
                }
            }

            // --- ACCELERATION LOGIC ---
            if (proj.acceleration) {
                // Increase speed by acceleration factor
                proj.velocity.x *= (1 + proj.acceleration * dt);
                proj.velocity.y *= (1 + proj.acceleration * dt);
            }

            // --- HOMING LOGIC ---
            if (proj.homing && proj.homing > 0) {
                const nearest = this.getNearestEnemy(proj.x, proj.y);
                if (nearest) {
                    // Current velocity angle
                    const currentAngle = Math.atan2(proj.velocity.y, proj.velocity.x);
                    // Target angle
                    const targetAngle = Math.atan2(nearest.y - proj.y, nearest.x - proj.x);

                    // Steer towards target (simple lerp of angle)
                    // Homing strength determines how fast we turn
                    let angleDiff = targetAngle - currentAngle;

                    // Normalize to -PI to PI
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    const turnSpeed = proj.homing * 5 * dt; // Arbitrary 5.0 turn multiplier
                    const newAngle = currentAngle + Math.max(-turnSpeed, Math.min(turnSpeed, angleDiff));

                    const speed = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2);
                    proj.velocity.x = Math.cos(newAngle) * speed;
                    proj.velocity.y = Math.sin(newAngle) * speed;
                }
            }

            // Move
            proj.x += proj.velocity.x * dt;
            proj.y += proj.velocity.y * dt;

            // Simple bounds check (remove if off screen)
            // World bounds are 800x600
            // Extended bounds for projectiles to allow them to come back if homing
            if (proj.x < -100 || proj.x > 900 || proj.y < -100 || proj.y > 700) {
                this.state.projectiles.splice(i, 1);
            }
        }

        // 4. Check for collisions between projectiles and enemies
        this.checkCollisions();
    }

    /**
     * Checks collisions between projectiles and enemies.
     * Currently uses a naive O(N*M) check which is fine for small numbers of entities.
     */
    private checkCollisions() {
        // Iterate backwards so we can safely splice projectiles
        for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
            const p = this.state.projectiles[i];
            let hitSomething = false;

            // Check against all entities
            for (const e of this.state.entities) {
                // Only collide with enemies
                if (e.type === 'enemy') {
                    const dx = p.x - e.x;
                    const dy = p.y - e.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Circle-Circle collision check
                    if (dist < p.radius + e.radius) {
                        // Collision detected!
                        const dmg = p.damage || 10;
                        e.hp -= dmg;

                        // Apply knockback if specified
                        if (p.knockback) {
                            const angle = Math.atan2(dy, dx);
                            // Push enemy away from projectile
                            e.velocity.x -= Math.cos(angle) * p.knockback;
                            e.velocity.y -= Math.sin(angle) * p.knockback;
                        }

                        // Trigger on_hit callback in Python code
                        if (this.weaponScript && this.weaponScript.on_hit) {
                            try {
                                this.weaponScript.on_hit(e.id);
                            } catch (err) { console.error(err); }
                        }

                        hitSomething = true;

                        // Check if enemy died
                        if (e.hp <= 0) {
                            // Respawn enemy mechanism for endless gameplay
                            e.hp = e.maxHp;
                            e.x = Math.random() * 700 + 50;
                            e.y = Math.random() * 500 + 50;
                            e.velocity = { x: 0, y: 0 }; // Reset velocity
                            this.state.score += 1;

                            // Trigger on_kill callback
                            if (this.weaponScript && this.weaponScript.on_kill) {
                                try {
                                    this.weaponScript.on_kill(e.id);
                                } catch (err) { console.error(err); }
                            }
                        }

                        // Handle pierce mechanics
                        if (p.pierce && p.pierce > 1) {
                            p.pierce--;
                            hitSomething = false; // Projectile survives to hit another
                        } else {
                            break; // Projectile destroyed, stop checking other enemies
                        }
                    }
                }
            }

            // Remove projectile if it hit something and didn't pierce
            if (hitSomething) {
                this.state.projectiles.splice(i, 1);
            }
        }
    }

    private notify() {
        if (this.onStateChange) {
            this.onStateChange({ ...this.state });
        }
    }

    // Public API for Python
    getEnemies() {
        return this.state.entities
            .filter(e => e.type === 'enemy')
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
        return this.state.entities
            .filter(e => e.type === 'enemy')
            .map(e => {
                const dist = Math.sqrt((e.x - x) ** 2 + (e.y - y) ** 2);
                return { id: e.id, x: e.x, y: e.y, hp: e.hp, dist };
            })
            .filter(e => e.dist <= range);
    }

    getPlayer() {
        const p = this.state.entities.find(e => e.type === 'player');
        if (p) return { x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp };
        return null;
    }

    getArenaBounds() {
        return { width: 800, height: 600 };
    }

    setPlayerVelocity(vx: number, vy: number) {
        const player = this.state.entities.find(e => e.type === 'player');
        if (player) {
            player.velocity.x = vx;
            player.velocity.y = vy;
        }
    }

    // Public API for the UI/Input to call
    fireWeapon(targetX: number, targetY: number) {
        if (!this.weaponScript || !this.weaponScript.on_fire) return;

        const player = this.state.entities.find(e => e.type === 'player');
        if (!player) return;

        try {
            const result = this.weaponScript.on_fire(targetX, targetY, player.x, player.y);

            if (result) {
                let vx = 0;
                let vy = 0;
                let color = '#fce83a';
                let radius = 5;
                let damage = 10;
                let knockback = 0;
                let pierce = 1;
                let homing = 0;
                let lifetime = 5;
                let acceleration = 0;

                // Helper to unwrap pyodide proxy
                const res = result.toJs ? result.toJs() : result;

                // Check if Map (from Python dict)
                if (res.get && res.has) {
                    if (res.has('color')) color = res.get('color');
                    if (res.has('radius')) radius = res.get('radius');
                    if (res.has('damage')) damage = res.get('damage');
                    if (res.has('knockback')) knockback = res.get('knockback');
                    if (res.has('pierce')) pierce = res.get('pierce');
                    if (res.has('homing')) homing = res.get('homing');
                    if (res.has('lifetime')) lifetime = res.get('lifetime');
                    if (res.has('acceleration')) acceleration = res.get('acceleration');

                    // Handle velocity/angle from Map
                    if (res.has('speed') && res.has('angle')) {
                        const speed = res.get('speed');
                        const angle = res.get('angle');
                        const rad = angle * Math.PI / 180;
                        vx = Math.cos(rad) * speed;
                        vy = Math.sin(rad) * speed;
                    }
                } else {
                    // Plain JS object
                    if (res.color) color = res.color;
                    if (res.radius) radius = res.radius;
                    if (res.damage) damage = res.damage;
                    if (res.knockback) knockback = res.knockback;
                    if (res.pierce) pierce = res.pierce;
                    if (res.homing) homing = res.homing;
                    if (res.lifetime) lifetime = res.lifetime;
                    if (res.acceleration) acceleration = res.acceleration;

                    if (res.vx !== undefined && res.vy !== undefined) {
                        vx = res.vx;
                        vy = res.vy;
                    } else if (res.speed !== undefined && res.angle !== undefined) {
                        const rad = res.angle * Math.PI / 180;
                        vx = Math.cos(rad) * res.speed;
                        vy = Math.sin(rad) * res.speed;
                    }
                }

                // Prepare projectile data
                const projectileData = {
                    id: `proj_${Date.now()}`,
                    x: player.x,
                    y: player.y,
                    radius: radius,
                    color: color,
                    hp: 1,
                    maxHp: 1,
                    damage: damage,
                    knockback: knockback,
                    pierce: pierce,
                    type: 'projectile' as const,
                    velocity: { x: vx, y: vy },
                    homing,
                    lifetime,
                    maxLifetime: lifetime,
                    acceleration
                };

                // If single player, add to local state immediately
                if (!this.isMultiplayer) {
                    this.state.projectiles.push(projectileData);
                }

                // Return data for UI -> Network Manager
                return {
                    vx, vy, color, radius, damage, knockback, pierce, homing, lifetime, acceleration
                };
            }
        } catch (err) {
            console.error("Error firing weapon:", err);
        }
        return null;
    }

    // --- MULTIPLAYER SUPPORT ---
    private isMultiplayer = false;
    private localPlayerId: string | null = null;

    setMultiplayerMode(enabled: boolean, myId: string | null = null) {
        this.isMultiplayer = enabled;
        this.localPlayerId = myId;
    }

    updateFromSnapshot(snapshot: any) {
        // Transform players dict to array
        const playersArray = Object.values(snapshot.players || {}).map((p: any) => ({
            ...p,
            type: 'player'
        }));

        // Ensure enemies is array
        const enemiesArray = Array.isArray(snapshot.enemies) ? snapshot.enemies : [];
        const projectilesArray = Array.isArray(snapshot.projectiles) ? snapshot.projectiles : [];

        // 1. Process Players
        // If we are in multiplayer, we want to maintain our LOCAL position for responsiveness (Client Prediction),
        // but accept the server's truth for everyone else.
        if (this.isMultiplayer && this.localPlayerId) {
            // Find our local state currently
            const myLocalEntity = this.state.entities.find(e => e.id === this.localPlayerId);

            // Merge snapshot with local state
            const mergedEntities = playersArray.map((serverEnt: any) => {
                if (serverEnt.id === this.localPlayerId && myLocalEntity) {
                    // It's me! Keep my local physics coordinates to avoid "rubberbanding"
                    // Only sync critical state like HP or MaxHP
                    return {
                        ...serverEnt,
                        x: myLocalEntity.x,
                        y: myLocalEntity.y,
                        velocity: myLocalEntity.velocity // Keep local velocity too
                    };
                }
                return serverEnt;
            });

            this.state.entities = [...mergedEntities, ...enemiesArray];

        } else {
            // Standard full overwrite
            this.state.entities = [...playersArray, ...enemiesArray];
        }

        this.state.projectiles = projectilesArray;
        this.state.score = snapshot.score || 0;
        this.state.gameOver = false;

        this.notify();
    }
}

export const gameEngine = new GameEngine();
