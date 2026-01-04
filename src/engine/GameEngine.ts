// Fixes applied:
// 1. Defensive checks for Pyodide proxy objects (toJs, get, has) to avoid runtime errors.
// 2. Ensured projectile velocity is always set (fallback to direction if speed/angle missing).
// 3. Improved error logging for weaponScript API failures.
// 4. Added fallback for missing projectile config values.

import type { WeaponScript } from './PyodideManager';

export interface Entity {
    id: string;
    x: number;
    y: number;
    radius: number;
    color: string;
    hp: number;
    maxHp: number;
    type: 'player' | 'enemy' | 'projectile';
    damage?: number;
    knockback?: number;
    pierce?: number;
    homing?: number;
    lifetime?: number;
    maxLifetime?: number;
    acceleration?: number;
    velocity: { x: number; y: number };
}

export interface GameState {
    entities: Entity[];
    projectiles: Entity[];
    score: number;
    gameOver: boolean;
}

export class GameEngine {
    private state: GameState;
    private weaponScript: WeaponScript | null = null;
    private lastTime: number = 0;
    private animationFrameId: number | null = null;
    private onStateChange: ((state: GameState) => void) | null = null;

    constructor() {
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
                { id: 'player', x: 400, y: 300, radius: 20, color: '#00ff9f', hp: 100, maxHp: 100, type: 'player', velocity: { x: 0, y: 0 } },
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

            if (proj.lifetime !== undefined) {
                proj.lifetime -= dt;
                if (proj.lifetime <= 0) {
                    this.state.projectiles.splice(i, 1);
                    continue;
                }
            }

            if (proj.acceleration) {
                proj.velocity.x *= (1 + proj.acceleration * dt);
                proj.velocity.y *= (1 + proj.acceleration * dt);
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

            if (proj.x < -100 || proj.x > 900 || proj.y < -100 || proj.y > 700) {
                this.state.projectiles.splice(i, 1);
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

                        if (p.knockback) {
                            const angle = Math.atan2(dy, dx);
                            e.velocity.x -= Math.cos(angle) * p.knockback;
                            e.velocity.y -= Math.sin(angle) * p.knockback;
                        }

                        if (this.weaponScript && this.weaponScript.on_hit) {
                            try {
                                this.weaponScript.on_hit(e.id);
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
                                try {
                                    this.weaponScript.on_kill(e.id);
                                } catch (err) { console.error(err); }
                            }
                        }

                        if (p.pierce && p.pierce > 1) {
                            p.pierce--;
                            hitSomething = false;
                        } else {
                            break;
                        }
                    }
                }
            }

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

    // Fixed: Defensive checks for Pyodide proxy and fallback for missing projectile config
    fireWeapon(targetX: number, targetY: number) {
        if (!this.weaponScript || typeof this.weaponScript.on_fire !== 'function') return;

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

                // Defensive unwrap for Pyodide proxy
                let res: any = result;
                if (res && typeof res.toJs === 'function') {
                    res = res.toJs();
                }

                // Pyodide Map (Python dict)
                if (res && typeof res.get === 'function' && typeof res.has === 'function') {
                    if (res.has('color')) color = res.get('color');
                    if (res.has('radius')) radius = res.get('radius');
                    if (res.has('damage')) damage = res.get('damage');
                    if (res.has('knockback')) knockback = res.get('knockback');
                    if (res.has('pierce')) pierce = res.get('pierce');
                    if (res.has('homing')) homing = res.get('homing');
                    if (res.has('lifetime')) lifetime = res.get('lifetime');
                    if (res.has('acceleration')) acceleration = res.get('acceleration');
                    if (res.has('speed') && res.has('angle')) {
                        const speed = res.get('speed');
                        const angle = res.get('angle');
                        const rad = angle * Math.PI / 180;
                        vx = Math.cos(rad) * speed;
                        vy = Math.sin(rad) * speed;
                    }
                } else if (res && typeof res === 'object') {
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

                // Fallback: If velocity is still zero, shoot towards target
                if (vx === 0 && vy === 0) {
                    const dx = targetX - player.x;
                    const dy = targetY - player.y;
                    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
                    const defaultSpeed = 300;
                    vx = (dx / mag) * defaultSpeed;
                    vy = (dy / mag) * defaultSpeed;
                }

                this.state.projectiles.push({
                    id: `proj_${Date.now()}`,
                    x: player.x,
                    y: player.y,
                    radius,
                    color,
                    hp: 1,
                    maxHp: 1,
                    damage,
                    knockback,
                    pierce,
                    type: 'projectile',
                    velocity: { x: vx, y: vy },
                    homing,
                    lifetime,
                    maxLifetime: lifetime,
                    acceleration
                });
            }
        } catch (err) {
            console.error("Error firing weapon:", err);
        }
    }
}

export const gameEngine = new GameEngine();
