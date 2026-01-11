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
    chain_count?: number;
    orbit_speed?: number;
    orbit_radius?: number;
    wave_amplitude?: number;
    wave_frequency?: number;
    explosion_radius?: number;
    explosion_damage?: number;
    fade_over_time?: boolean;
    kills?: number;
    deaths?: number;
    renderX?: number; // Visual X for waves
    renderY?: number; // Visual Y for waves
}

export interface DamageNumber {
    id: string;
    x: number;
    y: number;
    value: number;
    color: string;
    life: number; // 0 to 1
}

export interface KillNotification {
    id: string;
    attacker: string;
    victim: string;
    life: number;
}

export interface Particle {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number; // 0 to 1
    size: number;
}

export interface GridImpulse {
    x: number;
    y: number;
    strength: number;
    radius: number;
    life: number;
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
    damageNumbers: DamageNumber[];
    notifications: KillNotification[];
    screenshake: number; // 0 to 1
    particles: Particle[];
    gridImpulses: GridImpulse[];
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

    // --- MULTIPLAYER PROPERTIES ---
    private isMultiplayer = false;
    private localPlayerId: string | null = null;
    private lastHitInfo: any = null;

    constructor() {
        // Initialize default state with empty arrays
        this.state = {
            entities: [],
            projectiles: [],
            score: 0,
            gameOver: false,
            damageNumbers: [],
            notifications: [],
            screenshake: 0,
            particles: [],
            gridImpulses: []
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

    getState() { return this.state; }
    getPlayers() { return this.state.entities.filter(e => e.type === 'player'); }
    getLastHitInfo() { return this.lastHitInfo; }

    getClosestProjectile(x: number, y: number) {
        let nearest: Entity | null = null;
        let minDist = Infinity;
        this.state.projectiles.forEach(p => {
            const d = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
            if (d < minDist) { minDist = d; nearest = p; }
        });
        return nearest;
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
            damageNumbers: [],
            notifications: [],
            screenshake: 0,
            particles: [],
            gridImpulses: []
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
        // Update Feedback Effects
        if (this.state.screenshake > 0) {
            this.state.screenshake -= dt * 5; // Decay
            if (this.state.screenshake < 0) this.state.screenshake = 0;
        }

        this.state.damageNumbers.forEach(dn => {
            dn.y -= 40 * dt; // Rise
            dn.life -= dt * 1.5; // Fade duration
        });
        this.state.damageNumbers = this.state.damageNumbers.filter(dn => dn.life > 0);

        this.state.notifications.forEach(n => {
            n.life -= dt * 0.5;
        });
        this.state.notifications = this.state.notifications.filter(n => n.life > 0);

        // Update Particles
        this.state.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.98; // Friction
            p.vy *= 0.98;
            p.life -= dt * 1.5;
        });
        this.state.particles = this.state.particles.filter(p => p.life > 0);

        // Update Grid Impulses
        this.state.gridImpulses.forEach(gi => {
            gi.life -= dt * 2.0;
        });
        this.state.gridImpulses = this.state.gridImpulses.filter(gi => gi.life > 0);

        if (this.isMultiplayer) {
            // CLIENT-SIDE EXTRAPOLATION
            // We move everything locally while waiting for server snapshots
            this.state.entities.forEach(ent => {
                ent.x += ent.velocity.x * dt;
                ent.y += ent.velocity.y * dt;

                const bounds = this.getArenaBounds();
                ent.x = Math.max(ent.radius, Math.min(bounds.width - ent.radius, ent.x));
                ent.y = Math.max(ent.radius, Math.min(bounds.height - ent.radius, ent.y));
            });

            this.state.projectiles.forEach(proj => {
                if (proj.orbit_player) {
                    // Full orbit simulation - server doesn't sync these anymore
                    const player = this.state.entities.find(e => e.id === proj.playerId);
                    if (player) {
                        // Initialize orbit angle if not set
                        if ((proj as any).orbitAngle === undefined) {
                            (proj as any).orbitAngle = Math.atan2(proj.y - player.y, proj.x - player.x);
                            (proj as any).orbitRadius = proj.orbit_radius || 60;
                        }

                        const orbitSpeed = proj.orbit_speed || 3.0;
                        (proj as any).orbitAngle += orbitSpeed * dt;

                        const r = (proj as any).orbitRadius;
                        proj.x = player.x + Math.cos((proj as any).orbitAngle) * r;
                        proj.y = player.y + Math.sin((proj as any).orbitAngle) * r;
                    }
                } else {
                    // Standard linear projectiles
                    proj.x += (proj.velocity?.x || 0) * dt;
                    proj.y += (proj.velocity?.y || 0) * dt;
                }

                // Calculate visual offsets (Waves)
                if (proj.wave_amplitude && proj.wave_amplitude > 0) {
                    const elapsed = (proj.maxLifetime || 5) - (proj.lifetime || 5);
                    const offset = Math.sin(elapsed * (proj.wave_frequency || 1)) * proj.wave_amplitude;
                    const perpX = -(proj.velocity?.y || 0), perpY = (proj.velocity?.x || 0);
                    const mag = Math.sqrt(perpX ** 2 + perpY ** 2) || 1;
                    proj.renderX = proj.x + (perpX / mag) * offset;
                    proj.renderY = proj.y + (perpY / mag) * offset;
                } else {
                    proj.renderX = proj.x;
                    proj.renderY = proj.y;
                }
            });
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

                // Calculate visual offsets (Waves)
                if (proj.wave_amplitude && proj.wave_amplitude > 0) {
                    const elapsed = (proj.maxLifetime || 5) - (proj.lifetime || 5);
                    const offset = Math.sin(elapsed * (proj.wave_frequency || 1)) * proj.wave_amplitude;
                    const perpX = -proj.velocity.y, perpY = proj.velocity.x;
                    const mag = Math.sqrt(perpX ** 2 + perpY ** 2) || 1;
                    proj.renderX = proj.x + (perpX / mag) * offset;
                    proj.renderY = proj.y + (perpY / mag) * offset;
                } else {
                    proj.renderX = proj.x;
                    proj.renderY = proj.y;
                }

                if (proj.bounciness && proj.bounciness > 0) {
                    const bounds = this.getArenaBounds();
                    if (proj.x < proj.radius) {
                        proj.x = proj.radius;
                        proj.velocity.x *= -proj.bounciness;
                        if (this.weaponScript?.on_hit_wall) this.weaponScript.on_hit_wall(proj.x, proj.y);
                    } else if (proj.x > bounds.width - proj.radius) {
                        proj.x = bounds.width - proj.radius;
                        proj.velocity.x *= -proj.bounciness;
                        if (this.weaponScript?.on_hit_wall) this.weaponScript.on_hit_wall(proj.x, proj.y);
                    }
                    if (proj.y < proj.radius) {
                        proj.y = proj.radius;
                        proj.velocity.y *= -proj.bounciness;
                        if (this.weaponScript?.on_hit_wall) this.weaponScript.on_hit_wall(proj.x, proj.y);
                    } else if (proj.y > bounds.height - proj.radius) {
                        proj.y = bounds.height - proj.radius;
                        proj.velocity.y *= -proj.bounciness;
                        if (this.weaponScript?.on_hit_wall) this.weaponScript.on_hit_wall(proj.x, proj.y);
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
                    // EXPLOSION LOGIC (Solo Only - Server handles multi)
                    if (!this.isMultiplayer && proj.explosion_radius && proj.explosion_radius > 0) {
                        this.triggerExplosion(proj.renderX || proj.x, proj.renderY || proj.y, proj.explosion_radius, proj.explosion_damage || proj.damage || 10);
                    }
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
                    const px = p.renderX || p.x;
                    const py = p.renderY || p.y;
                    const dx = px - e.x;
                    const dy = py - e.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < p.radius + e.radius) {
                        const dmg = p.damage || 10;
                        e.hp -= dmg;

                        // EXPLOSION ON HIT
                        if (p.explosion_radius && p.explosion_radius > 0) {
                            this.triggerExplosion(px, py, p.explosion_radius, p.explosion_damage || dmg);
                        }

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
                            try {
                                this.weaponScript.on_hit(e.id);
                                this.lastHitInfo = { id: e.id, time: Date.now() };
                            } catch (err) { console.error(err); }
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
        const player = this.getLocalPlayer();
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
        const fade_over_time = params.fade_over_time ?? false;
        const explosion_radius = params.explosion_radius ?? 0;
        const explosion_damage = params.explosion_damage ?? 0;
        const wave_amplitude = params.wave_amplitude ?? 0;
        const wave_frequency = params.wave_frequency ?? 0;
        const chain_count = params.chain_count ?? 0;
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

        const proj: Entity = {
            id: params.id || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            playerId: params.playerId || (player ? player.id : 'unknown'),
            x, y, radius, color, damage, type: 'projectile',
            hp: 1, maxHp: 1,
            velocity: { x: vx, y: vy },
            homing, lifetime, maxLifetime: lifetime, acceleration,
            orbit_player, vampirism, split_on_death, attraction_force,
            bounciness, spin, chain_range, orbit_speed, orbit_radius,
            pierce, knockback, chain_count,
            explosion_radius, explosion_damage,
            wave_amplitude, wave_frequency,
            fade_over_time
        };
        if (!this.isMultiplayer) {
            this.state.projectiles.push(proj);
        }
        return proj;
    }

    private triggerExplosion(x: number, y: number, radius: number, damage: number) {
        // Visuals
        this.addGridImpulse(x, y, 25, radius * 1.5);
        this.spawnParticles(x, y, '#ff9f00', 15);
        this.state.screenshake = 0.3;

        // Damage (Solo Only)
        this.state.entities.forEach(ent => {
            if (ent.type === 'enemy') {
                const dist = Math.sqrt((ent.x - x) ** 2 + (ent.y - y) ** 2);
                if (dist < radius) {
                    ent.hp -= damage;
                    if (ent.hp <= 0) {
                        ent.hp = ent.maxHp;
                        ent.x = Math.random() * 700 + 50;
                        ent.y = Math.random() * 500 + 50;
                        this.state.score += 1;
                        if (this.weaponScript?.on_kill) this.weaponScript.on_kill(ent.id);
                    }
                }
            }
        });
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

    private getLocalPlayer() {
        if (this.localPlayerId) {
            return this.state.entities.find(e => e.id === this.localPlayerId && e.type === 'player');
        }
        // In multiplayer, if we don't have our ID yet, we must NOT default to others
        if (this.isMultiplayer) return null;

        return this.state.entities.find(e => e.type === 'player');
    }

    getPlayer() {
        const p = this.getLocalPlayer();
        if (p) return { id: p.id, x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp };
        return null;
    }

    getArenaBounds() { return { width: 800, height: 600 }; }

    setPlayerVelocity(vx: number, vy: number) {
        const player = this.getLocalPlayer();
        if (player) {
            player.velocity.x = vx;
            player.velocity.y = vy;
        }
    }

    fireWeapon(targetX: number, targetY: number) {
        if (!this.weaponScript || !this.weaponScript.on_fire) return;
        const player = this.getLocalPlayer();
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
                    // MUZZLE FLASH EFFECTS
                    this.spawnParticles(player.x, player.y, proj.color, 4);
                    this.addGridImpulse(player.x, player.y, 5, 50);
                    return {
                        ...proj,
                        vx: proj.velocity.x,
                        vy: proj.velocity.y,
                        explosion_radius: proj.explosion_radius,
                        explosion_damage: proj.explosion_damage,
                        wave_amplitude: proj.wave_amplitude,
                        wave_frequency: proj.wave_frequency,
                        chain_count: proj.chain_count,
                        chain_range: proj.chain_range,
                        fade_over_time: proj.fade_over_time
                    };
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
        // 1. Prepare Snapshots
        const playersArray = Object.values(snapshot.players || {}).map((p: any) => ({ ...p, type: 'player' as const }));
        const enemiesArray = (snapshot.enemies || []).map((e: any) => ({ ...e, type: 'enemy' as const }));
        const projectilesArray = snapshot.projectiles || [];

        // 2. Reconcile Entities (Players & Enemies)
        // We use a combination of "Server Reconciliation" for self and "Soft Interpolation" for others
        const allServerEntities = [...playersArray, ...enemiesArray];

        // Find entities that should persist or be created
        const nextEntities: Entity[] = [];

        allServerEntities.forEach(serverEnt => {
            const localEnt = this.state.entities.find(e => e.id === serverEnt.id);

            if (localEnt) {
                // COMBAT FEEDBACK: Calculate Damage Numbers
                if (serverEnt.hp < localEnt.hp) {
                    const diff = localEnt.hp - serverEnt.hp;

                    // Trigger Screenshake if it's the local player
                    if (serverEnt.id === this.localPlayerId) {
                        this.state.screenshake = 0.5;
                    }

                    // IMPACT EFFECTS
                    this.spawnParticles(serverEnt.x, serverEnt.y, serverEnt.color, 10);
                    this.addGridImpulse(serverEnt.x, serverEnt.y, 15, 80);

                    this.state.damageNumbers.push({
                        id: Math.random().toString(36).substr(2, 9),
                        x: serverEnt.x,
                        y: serverEnt.y - 10,
                        value: Math.round(diff),
                        color: serverEnt.id === this.localPlayerId ? '#ff0055' : '#fce83a',
                        life: 1.0
                    });

                    // Trigger on_damaged callback if it's the local player
                    if (serverEnt.id === this.localPlayerId && this.weaponScript?.on_damaged) {
                        this.weaponScript.on_damaged("Enemy", diff);
                    }
                }

                // KILL DETECTION: If kills count increased
                if (serverEnt.kills > (localEnt.kills || 0)) {
                    this.state.notifications.push({
                        id: Math.random().toString(36).substr(2, 9),
                        attacker: serverEnt.id === this.localPlayerId ? "You" : `Player ${serverEnt.id.substring(0, 4)}`,
                        victim: "Enemy", // Simplified since server doesn't send victim name yet
                        life: 4.0
                    });
                }

                if (serverEnt.id === this.localPlayerId) {
                    // SELF (Client-Side Prediction with Light Reconciliation):
                    // If we are way off (lag/collision), snap. Otherwise, let local physics rule.
                    const dist = Math.sqrt((localEnt.x - serverEnt.x) ** 2 + (localEnt.y - serverEnt.y) ** 2);
                    if (dist > 100) {
                        // Hard sync if too far
                        nextEntities.push({
                            ...serverEnt,
                            velocity: localEnt.velocity // Keep local velocity for immediate response
                        });
                    } else {
                        // Soft sync: Pull slightly towards server to correct small drifts
                        const pullFactor = 0.1;
                        nextEntities.push({
                            ...serverEnt,
                            x: localEnt.x + (serverEnt.x - localEnt.x) * pullFactor,
                            y: localEnt.y + (serverEnt.y - localEnt.y) * pullFactor,
                            velocity: localEnt.velocity
                        });
                    }
                } else {
                    // OTHERS: Soft pull towards server position to avoid jumpiness
                    // INCREASED LERP for better responsiveness (0.2 -> 0.35)
                    const lerpFactor = 0.35;
                    nextEntities.push({
                        ...serverEnt,
                        x: localEnt.x + (serverEnt.x - localEnt.x) * lerpFactor,
                        y: localEnt.y + (serverEnt.y - localEnt.y) * lerpFactor,
                        velocity: serverEnt.vx !== undefined ? { x: serverEnt.vx, y: serverEnt.vy } : serverEnt.velocity
                    });
                }
            } else {
                // NEW ENTITY: Spawn immediately
                if (serverEnt.vx !== undefined) {
                    serverEnt.velocity = { x: serverEnt.vx, y: serverEnt.vy };
                }
                nextEntities.push(serverEnt);
            }
        });

        this.state.entities = nextEntities;

        // 3. Projectiles (Snapping is fine for fast moving shots)
        this.state.projectiles = projectilesArray.map((p: any) => ({
            ...p,
            velocity: p.vx !== undefined ? { x: p.vx, y: p.vy } : p.velocity
        }));

        this.state.score = snapshot.score || 0;

        // 4. Leaderboard
        const leaderboard = Object.values(snapshot.players || {}).map((p: any) => ({
            id: p.id,
            kills: p.kills || 0,
            deaths: p.deaths || 0
        })).sort((a: any, b: any) => b.kills - a.kills);

        this.state.leaderboard = leaderboard;
        this.state.gameOver = false;
        this.notify();
    }
    spawnParticles(x: number, y: number, color: string, count: number = 8) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            this.state.particles.push({
                id: Math.random().toString(36).substr(2, 9),
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                life: 1.0,
                size: Math.random() * 2 + 1
            });
        }
    }

    addGridImpulse(x: number, y: number, strength: number = 20, radius: number = 100) {
        this.state.gridImpulses.push({ x, y, strength, radius, life: 1.0 });
    }
}

export const gameEngine = new GameEngine();
