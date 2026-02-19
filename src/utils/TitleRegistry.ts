export interface Title {
    id: string;
    name: string;
    description: string;
    color: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'admin';
    hidden?: boolean; // If true, only shows when unlocked
}

export const TITLES: Record<string, Title> = {
    // ── Starting ──────────────────────────────────────────────
    'beginner': {
        id: 'beginner',
        name: 'Beginner',
        description: 'Welcome to the arena.',
        color: '#94a3b8',
        rarity: 'common'
    },

    // ── Kills & Combat ────────────────────────────────────────
    'killer': {
        id: 'killer',
        name: 'Killer',
        description: 'Eliminate 30 enemies.',
        color: '#ef4444',
        rarity: 'common'
    },
    'sneaky': {
        id: 'sneaky',
        name: 'Sneaky',
        description: 'Eliminate an enemy with a single hit.',
        color: '#a855f7',
        rarity: 'rare'
    },
    'threeforone': {
        id: 'threeforone',
        name: 'Three for One',
        description: 'Eliminate 3 enemies with a single attack.',
        color: '#f59e0b',
        rarity: 'epic'
    },
    'unstoppable': {
        id: 'unstoppable',
        name: 'Unstoppable',
        description: 'Reach a 100 killstreak.',
        color: '#f87171',
        rarity: 'legendary'
    },
    'monster': {
        id: 'monster',
        name: 'Monster',
        description: 'Reach a 1000 killstreak.',
        color: '#dc2626',
        rarity: 'mythical'
    },

    // ── New Combat Titles ─────────────────────────────────────
    'quickdraw': {
        id: 'quickdraw',
        name: 'Quickdraw',
        description: 'Kill an enemy within 1 second of spawning.',
        color: '#fbbf24',
        rarity: 'rare'
    },
    'shredder': {
        id: 'shredder',
        name: 'Shredder',
        description: 'Deal 10 000 total damage in a single game.',
        color: '#f97316',
        rarity: 'epic'
    },
    'deadeye': {
        id: 'deadeye',
        name: 'Deadeye',
        description: 'Land 50 critical hits in a single match.',
        color: '#38bdf8',
        rarity: 'rare'
    },
    'pyromaniac': {
        id: 'pyromaniac',
        name: 'Pyromaniac',
        description: 'Kill 20 enemies with explosion damage.',
        color: '#fb923c',
        rarity: 'epic'
    },
    'brawler': {
        id: 'brawler',
        name: 'Brawler',
        description: 'Survive 5 minutes at less than 10% HP.',
        color: '#4ade80',
        rarity: 'rare'
    },

    // ── Playstyle ─────────────────────────────────────────────
    'friendly': {
        id: 'friendly',
        name: 'Friendly',
        description: 'Survive 30 minutes without firing a single shot.',
        color: '#10b981',
        rarity: 'rare'
    },
    'hostile': {
        id: 'hostile',
        name: 'Hostile',
        description: 'Fire your weapon continuously for 5 minutes.',
        color: '#f97316',
        rarity: 'rare'
    },
    'zzz': {
        id: 'zzz',
        name: 'ZZZ',
        description: 'Remain AFK in the lobby for 24 hours.',
        color: '#64748b',
        rarity: 'epic'
    },
    'survivor': {
        id: 'survivor',
        name: 'Survivor',
        description: 'Reach Wave 15 in co-op survival.',
        color: '#34d399',
        rarity: 'rare'
    },
    'ghostwalker': {
        id: 'ghostwalker',
        name: 'Ghost Walker',
        description: 'Complete a wave without being hit once.',
        color: '#c4b5fd',
        rarity: 'epic'
    },
    'shadow': {
        id: 'shadow',
        name: 'Shadow',
        description: 'Kill 5 enemies while using a fading projectile build.',
        color: '#818cf8',
        rarity: 'rare'
    },

    // ── Progression ───────────────────────────────────────────
    'veteran': {
        id: 'veteran',
        name: 'Veteran',
        description: 'Reach Level 10.',
        color: '#60a5fa',
        rarity: 'common'
    },
    'op': {
        id: 'op',
        name: 'OP',
        description: 'Maximize all stats and attributes.',
        color: '#0ea5e9',
        rarity: 'legendary'
    },
    'magnetar': {
        id: 'magnetar',
        name: 'Magnetar',
        description: 'Max out the Vortex (Attraction Force) attribute.',
        color: '#e879f9',
        rarity: 'epic'
    },

    // ── Admin / Special ───────────────────────────────────────
    'modhelper': {
        id: 'modhelper',
        name: 'Idea Generator',
        description: 'Contribute a brilliant idea to the community.',
        color: '#8b5cf6',
        rarity: 'rare'
    },
    'mod': {
        id: 'mod',
        name: 'Moderator',
        description: 'Community Guardian.',
        color: '#22c55e',
        rarity: 'admin'
    },
    'dev': {
        id: 'dev',
        name: 'Developer',
        description: 'Architect of the Matrix.',
        color: '#3b82f6',
        rarity: 'admin'
    },
    'god': {
        id: 'god',
        name: 'GOD',
        description: 'Omnipotent.',
        color: '#eab308',
        rarity: 'admin'
    },

    // ── Achievements ──────────────────────────────────────────
    'godkiller': {
        id: 'godkiller',
        name: 'God Slayer',
        description: 'Eliminate a player holding the GOD title.',
        color: '#e11d48',   // Fixed: was #000000 (invisible on dark BG)
        rarity: 'mythical'
    },
    'immortal': {
        id: 'immortal',
        name: 'Immortal',
        description: 'Win a tournament without dying once.',
        color: '#d946ef',
        rarity: 'legendary'
    },
    'trueking': {
        id: 'trueking',
        name: 'True King',
        description: 'Winner of the Tournament of Existence.',
        color: '#fbbf24',
        rarity: 'mythical'
    },

    // ── Completionist ─────────────────────────────────────────
    'theultragod': {
        id: 'theultragod',
        name: 'THE ULTRA GOD',
        description: 'Unlock ALL other non-admin titles.',
        color: '#ff79c6',   // Solid pink — gradient strings can't be used as CSS color
        rarity: 'mythical'
    }
};

// Rarity → card border/bg/text style
export const getTitleStyle = (rarity: Title['rarity']) => {
    switch (rarity) {
        case 'admin':
            return 'border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
        case 'mythical':
            return 'border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.5)] animate-pulse';
        case 'legendary':
            return 'border-amber-500/50 bg-amber-500/10 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
        case 'epic':
            return 'border-purple-500/50 bg-purple-500/10 text-purple-400';
        case 'rare':
            return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
        default:
            return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
    }
};
