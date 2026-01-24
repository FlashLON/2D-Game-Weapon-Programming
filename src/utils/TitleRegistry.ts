export interface Title {
    id: string;
    name: string;
    description: string;
    color: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'admin';
    hidden?: boolean; // If true, only shows when unlocked
}

export const TITLES: Record<string, Title> = {
    // Kills & Combat
    'killer': { id: 'killer', name: 'Killer', description: 'Eliminate 30 enemies.', color: '#ef4444', rarity: 'common' }, // Red
    'sneaky': { id: 'sneaky', name: 'Sneaky', description: 'Eliminate an enemy or player with a single hit.', color: '#a855f7', rarity: 'rare' }, // Purple
    'threeforone': { id: 'threeforone', name: 'Three for One', description: 'Eliminate 3 enemies or players with a single attack.', color: '#f59e0b', rarity: 'epic' }, // Amber
    'unstoppable': { id: 'unstoppable', name: 'Unstoppable', description: 'Reach a 100 killstreak.', color: '#ef4444', rarity: 'legendary' },
    'monster': { id: 'monster', name: 'Monster', description: 'Reach a 1000 killstreak.', color: '#b91c1c', rarity: 'mythical' },

    // Playstyle
    'friendly': { id: 'friendly', name: 'Friendly', description: 'Survive 30 minutes in a server without firing a single shot.', color: '#10b981', rarity: 'rare' }, // Emerald
    'hostile': { id: 'hostile', name: 'Hostile', description: 'Fire your weapon continuously for 5 minutes.', color: '#f97316', rarity: 'rare' }, // Orange
    'zzz': { id: 'zzz', name: 'ZZZ', description: 'Remain AFK in the lobby for 24 hours.', color: '#64748b', rarity: 'epic' },

    // Progression
    'op': { id: 'op', name: 'OP', description: 'Maximize all stats/attributes.', color: '#0ea5e9', rarity: 'legendary' }, // Sky Blue

    // Admin / Special
    'modhelper': { id: 'modhelper', name: 'Idea Generator', description: 'Contribute a brilliant idea to the community.', color: '#8b5cf6', rarity: 'rare' },
    'mod': { id: 'mod', name: 'Moderator', description: 'Community Guardian.', color: '#22c55e', rarity: 'admin' },
    'dev': { id: 'dev', name: 'Developer', description: 'Architect of the Matrix.', color: '#3b82f6', rarity: 'admin' },
    'god': { id: 'god', name: 'GOD', description: 'Omnipotent.', color: '#eab308', rarity: 'admin' },

    // Achievements
    'godkiller': { id: 'godkiller', name: 'God Slayer', description: 'Eliminate a player holding the GOD title.', color: '#000000', rarity: 'mythical' },
    'immortal': { id: 'immortal', name: 'Immortal', description: 'Win a tournament without dying once.', color: '#d946ef', rarity: 'legendary' },
    'trueking': { id: 'trueking', name: 'True King', description: 'Winner of the Tournament of Existence.', color: '#fbbf24', rarity: 'mythical' },

    // Completionist
    'theultragod': { id: 'theultragod', name: 'THE ULTRA GOD', description: 'Unlock ALL other non-admin titles.', color: 'linear-gradient(to right, #ff00cc, #333399)', rarity: 'mythical' }
};

export const getTitleStyle = (rarity: Title['rarity']) => {
    switch (rarity) {
        case 'admin': return 'border-red-500/50 bg-red-500/10 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
        case 'mythical': return 'border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)] animate-pulse';
        case 'legendary': return 'border-amber-500/50 bg-amber-500/10 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
        case 'epic': return 'border-purple-500/50 bg-purple-500/10 text-purple-400';
        case 'rare': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
        default: return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
    }
};
