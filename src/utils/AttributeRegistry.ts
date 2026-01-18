import {
    Zap, Target, Shield,
    Maximize, Move, Activity,
    Flame, Skull, Link
} from 'lucide-react';

export interface AttributeConfig {
    id: string;
    name: string;
    description: string;
    isBase: boolean; // True if unlocked by default
    startLimit: number; // Value when first unlocked
    maxLimit: number; // Absolute hard cap
    upgradeStep: number; // Value added per upgrade
    baseCost: number; // Money cost for first upgrade
    costMultiplier: number; // How much cost increases per level
    icon: any; // Lucide icon
}

export const ATTRIBUTES: Record<string, AttributeConfig> = {
    // --- BASE STATS ---
    speed: {
        id: 'speed',
        name: 'Projectile Speed',
        description: 'How fast your weapon projectiles travel.',
        isBase: true,
        startLimit: 200,
        maxLimit: 1000,
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
        maxLimit: 100,
        upgradeStep: 2,
        baseCost: 200,
        costMultiplier: 1.5,
        icon: Skull
    },

    // --- UNLOCKABLE STATS ---
    lifetime: {
        id: 'lifetime',
        name: 'Range / Lifetime',
        description: 'How long projectiles last before disappearing.',
        isBase: false,
        startLimit: 0.5,
        maxLimit: 5.0,
        upgradeStep: 0.25,
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
        maxLimit: 50,
        upgradeStep: 2,
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
        maxLimit: 20.0,
        upgradeStep: 2.5,
        baseCost: 500,
        costMultiplier: 1.6,
        icon: Target
    },
    pierce: {
        id: 'pierce',
        name: 'Piercing',
        description: 'Number of enemies a projectile can pass through.',
        isBase: false,
        startLimit: 1,
        maxLimit: 10,
        upgradeStep: 1,
        baseCost: 400,
        costMultiplier: 1.8,
        icon: Shield // Using Shield as a metaphor for breaking through? Or Move.
    },
    knockback: {
        id: 'knockback',
        name: 'Knockback',
        description: 'Force applied to enemies on hit.',
        isBase: false,
        startLimit: 10,
        maxLimit: 200,
        upgradeStep: 10,
        baseCost: 150,
        costMultiplier: 1.3,
        icon: Move
    },
    explosion_radius: {
        id: 'explosion_radius',
        name: 'Explosive Area',
        description: 'Radius of area damage on impact.',
        isBase: false,
        startLimit: 20,
        maxLimit: 150,
        upgradeStep: 10,
        baseCost: 600,
        costMultiplier: 1.7,
        icon: Flame
    },
    chain_count: {
        id: 'chain_count',
        name: 'Chain Lightning',
        description: 'Number of additional targets to bounce to.',
        isBase: false,
        startLimit: 1,
        maxLimit: 5,
        upgradeStep: 1,
        baseCost: 700,
        costMultiplier: 2.0,
        icon: Link
    },
    wave_amplitude: {
        id: 'wave_amplitude',
        name: 'Wave Motion',
        description: 'Amplitude of sine-wave movement.',
        isBase: false,
        startLimit: 10,
        maxLimit: 100,
        upgradeStep: 5,
        baseCost: 300,
        costMultiplier: 1.4,
        icon: Activity
    }
};

export function getUpgradeCost(attributeId: string, currentLimit: number): number {
    const attr = ATTRIBUTES[attributeId];
    if (!attr) return 999999;

    // Calculate how many upgrades have been applied
    // (Current - Start) / Step
    const upgrades = Math.max(0, Math.round((currentLimit - attr.startLimit) / attr.upgradeStep));

    return Math.floor(attr.baseCost * Math.pow(attr.costMultiplier, upgrades));
}

// Generate 3 random cards for drafting
// 1. Upgrade existing stats (if not maxed)
// 2. Unlock new stats (if locked)
export function generateDraftOptions(
    unlocked: string[],
    limits: Record<string, number>
): Array<{ type: 'unlock' | 'upgrade', attributeId: string, value: number }> {
    const options: Array<{ type: 'unlock' | 'upgrade', attributeId: string, value: number }> = [];

    const allIds = Object.keys(ATTRIBUTES);
    const lockedIds = allIds.filter(id => !unlocked.includes(id));
    const upgradableIds = unlocked.filter(id => {
        const attr = ATTRIBUTES[id];
        return (limits[id] || 0) < attr.maxLimit;
    });

    // Strategy: 1 New Unlock (if available) + 2 Upgrades (if available)
    // Or pure random

    interface DraftPoolItem {
        type: 'unlock' | 'upgrade';
        attributeId: string;
        weight: number;
    }

    const pool: DraftPoolItem[] = [];

    // Add potential unlocks
    lockedIds.forEach(id => pool.push({ type: 'unlock', attributeId: id, weight: 2 }));

    // Add potential upgrades
    upgradableIds.forEach(id => pool.push({ type: 'upgrade', attributeId: id, weight: 5 }));

    // Naive shuffle and pick 3 unique attributes
    // Ensure we don't pick the same attribute twice if possible

    const pickedAttributes = new Set<string>();

    for (let i = 0; i < 3; i++) {
        // Filter pool to exclude already picked attributes for this draft
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

        options.push({
            type: pick.type,
            attributeId: pick.attributeId,
            value: value
        });
        pickedAttributes.add(pick.attributeId);
    }

    return options;
}
