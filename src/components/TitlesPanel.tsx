import React from 'react';
import { TITLES, getTitleStyle, type Title } from '../utils/TitleRegistry';
import { Trophy, Lock, CheckCircle2 } from 'lucide-react';

interface TitlesPanelProps {
    unlockedTitles: string[];
    equippedTitle: string | null;
    onEquip: (titleId: string | null) => void;
}

// Sort order: admin → mythical → legendary → epic → rare → common
const RARITY_ORDER: Record<Title['rarity'], number> = {
    admin: 0,
    mythical: 1,
    legendary: 2,
    epic: 3,
    rare: 4,
    common: 5
};

export const TitlesPanel: React.FC<TitlesPanelProps> = ({ unlockedTitles, equippedTitle, onEquip }) => {
    const sortedTitles = Object.values(TITLES).sort(
        (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
    );

    return (
        <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                <Trophy className="text-blue-400 shrink-0" size={16} />
                <p className="text-[9px] text-blue-100 uppercase tracking-wider leading-relaxed font-bold">
                    Equip titles to show off your achievements. Titles are visible to all players in the Arena.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {/* None Option */}
                <div
                    onClick={() => onEquip(null)}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer group
                        ${equippedTitle === null
                            ? 'bg-cyber-accent/10 border-cyber-accent'
                            : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-black text-white uppercase mb-1">No Title</div>
                            <div className="text-[9px] text-cyber-muted uppercase">Stay Incognito</div>
                        </div>
                        {equippedTitle === null && <CheckCircle2 size={16} className="text-cyber-accent" />}
                    </div>
                </div>

                {sortedTitles.map((title: Title) => {
                    const isUnlocked = unlockedTitles.includes(title.id);
                    const isEquipped = equippedTitle === title.id;
                    const styleClass = getTitleStyle(title.rarity);

                    if (title.hidden && !isUnlocked) return null;

                    return (
                        <div
                            key={title.id}
                            onClick={() => isUnlocked && onEquip(title.id)}
                            className={`relative p-4 rounded-xl border-2 transition-all
                                ${isUnlocked ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}
                                ${isEquipped
                                    ? styleClass  /* full card style when equipped */
                                    : isUnlocked
                                        ? 'bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/20'
                                        : 'bg-black/20 border-white/5'
                                }`}
                        >
                            {/* Rarity badge — top right */}
                            <div className="absolute top-2 right-3 flex flex-col items-end gap-0.5">
                                <span className={`text-[7px] font-black uppercase tracking-widest
                                    ${title.rarity === 'mythical' ? 'text-fuchsia-400'
                                        : title.rarity === 'legendary' ? 'text-amber-400'
                                            : title.rarity === 'epic' ? 'text-purple-400'
                                                : title.rarity === 'rare' ? 'text-blue-400'
                                                    : title.rarity === 'admin' ? 'text-red-400'
                                                        : 'text-gray-500'}`}>
                                    {title.rarity}
                                </span>
                            </div>

                            <div className="flex justify-between items-start pr-10">
                                <div className="flex-1">
                                    {/* Title Name Badge — use the title's own color */}
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span
                                            className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded border"
                                            style={{
                                                color: title.color,
                                                borderColor: title.color + '55',
                                                backgroundColor: title.color + '18',
                                                textShadow: `0 0 8px ${title.color}88`
                                            }}
                                        >
                                            {title.name}
                                        </span>
                                        {isEquipped && <CheckCircle2 size={14} className="text-emerald-400" />}
                                    </div>
                                    <div className="text-[9px] text-cyber-muted uppercase font-bold tracking-wide leading-tight">
                                        {title.description}
                                    </div>
                                </div>
                                {!isUnlocked && <Lock size={14} className="text-cyber-muted ml-2 shrink-0" />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
