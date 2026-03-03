import {
    Circle, Zap, Cpu,
    Star, Ghost, Triangle,
    Shield
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
    neon_glitch: {
        id: 'neon_glitch',
        name: 'Neon Glitch',
        description: 'A experimental drone core pulsing with unstable cyan and magenta energy.',
        cost: 15000,
        icon: Zap,
        rarity: 'epic',
        color: '#00ffff'
    },
    binary_link: {
        id: 'binary_link',
        name: 'Binary Link',
        description: 'Two synchronized processing cores sharing a high-speed data stream.',
        cost: 30000,
        icon: Cpu,
        rarity: 'epic',
        color: '#ffffff'
    },
    sun_god: {
        id: 'sun_god',
        name: 'Sun God Core',
        description: 'A radiant golden engine encased in a high-voltage solar ring.',
        cost: 75000,
        icon: Star,
        rarity: 'legendary',
        color: '#ffcc00'
    },
    void_pulse: {
        id: 'void_pulse',
        name: 'Void Pulse',
        description: 'A corrupted variant of the glitch core, drawing power from the null-space.',
        cost: 50000,
        icon: Ghost,
        rarity: 'epic',
        color: '#ff00ff'
    },
    sky_guardian: {
        id: 'sky_guardian',
        name: 'Sky Guardian',
        description: 'A winged interceptor frame optimized for aerial domination optics.',
        cost: 150000,
        icon: Triangle,
        rarity: 'legendary',
        color: '#ffffff'
    },
    golden_sentinel: {
        id: 'golden_sentinel',
        name: 'Golden Sentinel',
        description: 'The pinnacle of martial engineering. Heavy, golden, and unstoppable.',
        cost: 300000,
        icon: Shield,
        rarity: 'mythic',
        color: '#ffd700'
    }
};

export const getSkinColor = (skinId: string, baseColor: string) => {
    return SKINS[skinId]?.color || baseColor;
};
