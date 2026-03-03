import {
    Circle, Square, Triangle,
    Hexagon, Diamond, Star,
    Ghost, Cpu
} from 'lucide-react';

export interface SkinConfig {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: any;
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
    color?: string; // Optional override color
}

export const SKINS: Record<string, SkinConfig> = {
    default: {
        id: 'default',
        name: 'Basic Chassis',
        description: 'The standard issue combat frame. Reliable and clean.',
        cost: 0,
        icon: Circle,
        rarity: 'common'
    },
    vanguard: {
        id: 'vanguard',
        name: 'Vanguard Frame',
        description: 'A sharp, aerodynamic frame designed for aggressive maneuvers.',
        cost: 5000,
        icon: Triangle,
        rarity: 'common',
        color: '#00ff9f'
    },
    sentinel: {
        id: 'sentinel',
        name: 'Sentinel Block',
        description: 'A heavy-duty square chassis focused on stability and defense.',
        cost: 7500,
        icon: Square,
        rarity: 'common',
        color: '#3a86ff'
    },
    interceptor: {
        id: 'interceptor',
        name: 'Interceptor',
        description: 'A diamond-shaped hull that excels at high-speed tracking.',
        cost: 15000,
        icon: Diamond,
        rarity: 'rare',
        color: '#ff0055'
    },
    technomancer: {
        id: 'technomancer',
        name: 'Technomancer',
        description: 'A complex hexagonal weave that channels energy efficiently.',
        cost: 25000,
        icon: Hexagon,
        rarity: 'rare',
        color: '#fb923c'
    },
    phantom: {
        id: 'phantom',
        name: 'Phantom Shift',
        description: 'A specialized frame that flickers between reality and the void.',
        cost: 60000,
        icon: Ghost,
        rarity: 'epic',
        color: '#a855f7'
    },
    starlight: {
        id: 'starlight',
        name: 'Starlight Core',
        description: 'Forged from the heart of a dying pulsar. Radiant and pure.',
        cost: 120000,
        icon: Star,
        rarity: 'legendary',
        color: '#ffd700'
    },
    overlord: {
        id: 'overlord',
        name: 'The Overlord',
        description: 'The ultimate combat platform. Command the arena with authority.',
        cost: 250000,
        icon: Cpu,
        rarity: 'mythic',
        color: '#ff00ff'
    }
};

export const getSkinColor = (skinId: string, baseColor: string) => {
    return SKINS[skinId]?.color || baseColor;
};
