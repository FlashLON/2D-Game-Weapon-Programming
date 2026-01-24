import {
    Zap, Target, Shield,
    Maximize, Move, Activity,
    Flame, Skull, Link,
    Compass, RefreshCw, Layers,
    Heart, Magnet, Repeat,
    Wind, Wand2, Clock
} from 'lucide-react';

export interface AttributeConfig {
    id: string;
    name: string;
    description: string;
    isBase: boolean;
    startLimit: number;
    maxLimit: number;
    upgradeStep: number;
    baseCost: number;
    costMultiplier: number;
    icon: any;
}

export const ATTRIBUTES: Record<string, AttributeConfig> = {
    speed: {
        id: 'speed',
        name: 'Projectile Speed',
        description: 'How fast your weapon projectiles travel.',
        isBase: true,
        startLimit: 200,
        maxLimit: 1200,
        upgradeStep: 50,
        baseCost: 100,
        costMultiplier: 1.5,
        icon: Zap
    },
    damage: {
        id: 'damage',
        name: 'Damage',
        description: 'Base damage dealt to enemies.',
        isBase: true,
        startLimit: 5,
        maxLimit: 250,
        upgradeStep: 5,
        baseCost: 200,
        costMultiplier: 1.6,
        icon: Skull
    },
    hp: {
        id: 'hp',
        name: 'Life (Max HP)',
        description: 'Maximum health points. (Once per Level)',
        isBase: true,
        startLimit: 100,
        maxLimit: 2000,
        upgradeStep: 50,
        baseCost: 200,
        costMultiplier: 1.7,
        icon: Heart
    },
    cooldown: {
        id: 'cooldown',
        name: 'Fire Rate (Cooldown)',
        description: 'Time between weapon fires. (Once per Level)',
        isBase: true,
        startLimit: 0.5,
        maxLimit: 0.05,
        upgradeStep: -0.05,
        baseCost: 200,
        costMultiplier: 1.8,
        icon: Clock
    },
    lifetime: {
        id: 'lifetime',
        name: 'Range / Lifetime',
        description: 'How long projectiles last before disappearing.',
        isBase: false,
        startLimit: 0.5,
        maxLimit: 8.0,
        upgradeStep: 0.5,
        baseCost: 300,
        costMultiplier: 1.5,
        icon: Activity
    },
    radius: {
        id: 'radius',
        name: 'Projectile Size',
        description: 'Size of the projectile hitbox.',
        isBase: false,
        startLimit: 5,
        maxLimit: 80,
        upgradeStep: 5,
        baseCost: 250,
        costMultiplier: 1.4,
        icon: Maximize
    },
    homing: {
        id: 'homing',
        name: 'Homing',
        description: 'Ability to steer towards enemies.',
        isBase: false,
        startLimit: 0.05,
        maxLimit: 50.0,
        upgradeStep: 5,
        baseCost: 500,
        costMultiplier: 1.7,
        icon: Target
    },
    pierce: {
        id: 'pierce',
        name: 'Piercing',
        description: 'Number of enemies a projectile can pass through.',
        isBase: false,
        startLimit: 1,
        maxLimit: 25,
        upgradeStep: 1,
        baseCost: 400,
        costMultiplier: 1.8,
        icon: Shield
    },
    knockback: {
        id: 'knockback',
        name: 'Knockback',
        description: 'Force applied to enemies on hit.',
        isBase: false,
        startLimit: 10,
        maxLimit: 500,
        upgradeStep: 25,
        baseCost: 150,
        costMultiplier: 1.3,
        icon: Move
    },
    acceleration: {
        id: 'acceleration',
        name: 'Acceleration',
        description: 'Increases projectile velocity over time.',
        isBase: false,
        startLimit: 0.1,
        maxLimit: 2.0,
        upgradeStep: 0.2,
        baseCost: 450,
        costMultiplier: 1.6,
        icon: Wind
    },
    vampirism: {
        id: 'vampirism',
        name: 'Vampirism',
        description: 'Percentage of damage returned as health.',
        isBase: false,
        startLimit: 1,
        maxLimit: 50,
        upgradeStep: 5,
        baseCost: 800,
        costMultiplier: 1.9,
        icon: Heart
    },
    split_on_death: {
        id: 'split_on_death',
        name: 'Splitting',
        description: 'Number of fragments created when projectile expires.',
        isBase: false,
        startLimit: 2,
        maxLimit: 8,
        upgradeStep: 1,
        baseCost: 1000,
        costMultiplier: 2.2,
        icon: Layers
    },
    attraction_force: {
        id: 'attraction_force',
        name: 'Vortex',
        description: 'Pull force applied to nearby enemies.',
        isBase: false,
        startLimit: 5,
        maxLimit: 100,
        upgradeStep: 10,
        baseCost: 750,
        costMultiplier: 1.6,
        icon: Magnet
    },
    bounciness: {
        id: 'bounciness',
        name: 'Bounciness',
        description: 'Velocity retained when hitting arena walls.',
        isBase: false,
        startLimit: 0.2,
        maxLimit: 1.0,
        upgradeStep: 0.1,
        baseCost: 400,
        costMultiplier: 1.4,
        icon: Repeat
    },
    spin: {
        id: 'spin',
        name: 'Spin',
        description: 'Rotational velocity (degrees per second).',
        isBase: false,
        startLimit: 90,
        maxLimit: 720,
        upgradeStep: 45,
        baseCost: 350,
        costMultiplier: 1.3,
        icon: RefreshCw
    },
    explosion_radius: {
        id: 'explosion_radius',
        name: 'Explosion Area',
        description: 'Radius of area damage on impact.',
        isBase: false,
        startLimit: 60,
        maxLimit: 300,
        upgradeStep: 20,
        baseCost: 600,
        costMultiplier: 1.7,
        icon: Flame
    },
    explosion_damage: {
        id: 'explosion_damage',
        name: 'Explosion DMG',
        description: 'Bonus damage dealt by the impact explosion.',
        isBase: false,
        startLimit: 30,
        maxLimit: 300,
        upgradeStep: 20,
        baseCost: 650,
        costMultiplier: 1.6,
        icon: Skull
    },
    chain_count: {
        id: 'chain_count',
        name: 'Chain Jumps',
        description: 'Number of times a projectile bounces between enemies.',
        isBase: false,
        startLimit: 2,
        maxLimit: 10,
        upgradeStep: 1,
        baseCost: 700,
        costMultiplier: 2.0,
        icon: Link
    },
    chain_range: {
        id: 'chain_range',
        name: 'Chain Range',
        description: 'Maximum distance for chain lightning jumps.',
        isBase: false,
        startLimit: 100,
        maxLimit: 500,
        upgradeStep: 50,
        baseCost: 500,
        costMultiplier: 1.5,
        icon: Compass
    },
    wave_amplitude: {
        id: 'wave_amplitude',
        name: 'Wave Amplitude',
        description: 'Width of the sine-wave oscillation.',
        isBase: false,
        startLimit: 10,
        maxLimit: 200,
        upgradeStep: 10,
        baseCost: 300,
        costMultiplier: 1.4,
        icon: Activity
    },
    wave_frequency: {
        id: 'wave_frequency',
        name: 'Wave Frequency',
        description: 'Speed of the sine-wave oscillation.',
        isBase: false,
        startLimit: 2,
        maxLimit: 20,
        upgradeStep: 2,
        baseCost: 350,
        costMultiplier: 1.4,
        icon: Activity
    },
    orbit_speed: {
        id: 'orbit_speed',
        name: 'Orbit Speed',
        description: 'Rotation speed when in orbital mode.',
        isBase: false,
        startLimit: 1,
        maxLimit: 10,
        upgradeStep: 1,
        baseCost: 550,
        costMultiplier: 1.6,
        icon: RefreshCw
    },
    orbit_radius: {
        id: 'orbit_radius',
        name: 'Orbit Radius',
        description: 'Distance from you in orbital mode.',
        isBase: false,
        startLimit: 30,
        maxLimit: 200,
        upgradeStep: 10,
        baseCost: 500,
        costMultiplier: 1.5,
        icon: Maximize
    },
    orbit_player: {
        id: 'orbit_player',
        name: 'Orbital Mode',
        description: 'Projectiles rotate around you instead of flying.',
        isBase: false,
        startLimit: 1,
        maxLimit: 1,
        upgradeStep: 1,
        baseCost: 2000,
        costMultiplier: 1,
        icon: RefreshCw
    },
    fade_over_time: {
        id: 'fade_over_time',
        name: 'Ghost Rounds',
        description: 'Projectiles shrink and fade away slowly.',
        isBase: false,
        startLimit: 1,
        maxLimit: 1,
        upgradeStep: 1,
        baseCost: 1500,
        costMultiplier: 1,
        icon: Wand2
    }
};

export function getUpgradeCost(attributeId: string, currentLimit: number): number {
    const attr = ATTRIBUTES[attributeId];
    if (!attr) return 999999;
    const upgrades = Math.max(0, Math.round((currentLimit - attr.startLimit) / Math.max(0.001, attr.upgradeStep)));
    return Math.floor(attr.baseCost * Math.pow(attr.costMultiplier, upgrades));
}

export function generateDraftOptions(
    unlocked: string[],
    limits: Record<string, number>
): Array<{ type: 'unlock' | 'upgrade', attributeId: string, value: number }> {
    const options: Array<{ type: 'unlock' | 'upgrade', attributeId: string, value: number }> = [];
    const allIds = Object.keys(ATTRIBUTES);
    const lockedIds = allIds.filter(id => !unlocked.includes(id));
    const upgradableIds = unlocked.filter(id => {
        const attr = ATTRIBUTES[id];
        if (attr.maxLimit <= attr.startLimit && (limits[id] || 0) >= attr.startLimit) return false;
        return (limits[id] || 0) < attr.maxLimit;
    });

    interface DraftPoolItem {
        type: 'unlock' | 'upgrade';
        attributeId: string;
        weight: number;
    }

    const pool: DraftPoolItem[] = [];
    lockedIds.forEach(id => pool.push({ type: 'unlock', attributeId: id, weight: 2 }));
    upgradableIds.forEach(id => {
        const attr = ATTRIBUTES[id];
        if (attr.maxLimit > attr.startLimit) {
            pool.push({ type: 'upgrade', attributeId: id, weight: 5 });
        }
    });

    const pickedAttributes = new Set<string>();
    for (let i = 0; i < 3; i++) {
        const validPool = pool.filter(p => !pickedAttributes.has(p.attributeId));
        if (validPool.length === 0) break;
        const pick = validPool[Math.floor(Math.random() * validPool.length)];
        let value = 0;
        if (pick.type === 'unlock') {
            value = ATTRIBUTES[pick.attributeId].startLimit;
        } else {
            const current = limits[pick.attributeId] || ATTRIBUTES[pick.attributeId].startLimit;
            value = current + ATTRIBUTES[pick.attributeId].upgradeStep;
        }
        options.push({ type: pick.type, attributeId: pick.attributeId, value: value });
        pickedAttributes.add(pick.attributeId);
    }
    return options;
}
