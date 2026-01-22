import React from 'react';
import { TITLES, getTitleStyle, Title } from '../utils/TitleRegistry';
import { Trophy, Lock, CheckCircle2 } from 'lucide-react';

interface TitlesPanelProps {
    unlockedTitles: string[];
    equippedTitle: string | null;
    onEquip: (titleId: string | null) => void;
}

export const TitlesPanel: React.FC<TitlesPanelProps> = ({ unlockedTitles, equippedTitle, onEquip }) => {
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
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer group ${equippedTitle === null ? 'bg-cyber-accent/10 border-cyber-accent' : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'}`}
                >
                    <div className="flex items-center justify-betaween">
                        <div>
                            <div className="text-xs font-black text-white uppercase mb-1">No Title</div>
                            <div className="text-[9px] text-cyber-muted uppercase">Stay Incognito</div>
                        </div>
                        {equippedTitle === null && <CheckCircle2 size={16} className="text-cyber-accent" />}
                    </div>
                </div>

                {Object.values(TITLES).map((title: Title) => {
                    const isUnlocked = unlockedTitles.includes(title.id);
                    const isEquipped = equippedTitle === title.id;
                    const styleClass = getTitleStyle(title.rarity);

                    if (title.hidden && !isUnlocked) return null;

                    return (
                        <div
                            key={title.id}
                            onClick={() => isUnlocked && onEquip(title.id)}
                            className={`relative p-4 rounded-xl border-2 transition-all ${isUnlocked ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'} ${isEquipped ? 'bg-black/40 ' + styleClass.replace('bg-', 'border-') : 'bg-black/20 border-transparent hover:bg-white/5'} ${isUnlocked && !isEquipped ? 'hover:border-white/20' : ''}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded ${styleClass} border-0`}>
                                            {title.name}
                                        </span>
                                        {isEquipped && <CheckCircle2 size={14} className="text-emerald-500" />}
                                    </div>
                                    <div className="text-[9px] text-cyber-muted uppercase font-bold tracking-wide">
                                        {title.description}
                                    </div>
                                </div>
                                {!isUnlocked && <Lock size={14} className="text-cyber-muted" />}
                            </div>

                            {/* Rarity & Condition Tag */}
                            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                <span className={`text-[8px] font-black uppercase ${title.rarity === 'mythical' ? 'text-fuchsia-500' : 'text-cyber-muted'}`}>
                                    {title.rarity}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
