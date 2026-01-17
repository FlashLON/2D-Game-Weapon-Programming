import React from 'react';
import { Sparkles } from 'lucide-react';
import { ATTRIBUTES, generateDraftOptions } from '../utils/AttributeRegistry';

interface LevelUpModalProps {
    userProfile: {
        level: number;
        unlocks: string[];
        limits: Record<string, number>;
    };
    onSelectCard: (type: 'unlock' | 'upgrade', attributeId: string, value: number) => void;
    onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ userProfile, onSelectCard, onClose }) => {
    const options = generateDraftOptions(userProfile.unlocks, userProfile.limits);

    const handleSelect = (option: typeof options[0]) => {
        onSelectCard(option.type, option.attributeId, option.value);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
            <div className="bg-gradient-to-br from-cyber-light to-cyber-dark border-2 border-cyber-accent rounded-3xl p-8 max-w-5xl w-full relative shadow-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyber-accent/20 border border-cyber-accent mb-4">
                        <Sparkles className="text-cyber-accent" size={20} />
                        <span className="text-cyber-accent font-bold text-sm uppercase tracking-widest">Level {userProfile.level} Reached!</span>
                    </div>
                    <h2 className="text-4xl font-black text-white mb-2">Choose Your Upgrade</h2>
                    <p className="text-cyber-muted">Select one card to enhance your arsenal</p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {options.map((option, idx) => {
                        const attr = ATTRIBUTES[option.attributeId];
                        const Icon = attr.icon;
                        const isUnlock = option.type === 'unlock';

                        return (
                            <button
                                key={idx}
                                onClick={() => handleSelect(option)}
                                className="group relative bg-cyber-dark border-2 border-cyber-muted hover:border-cyber-accent rounded-2xl p-6 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-cyber-accent/50"
                            >
                                {/* Card Type Badge */}
                                <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${isUnlock ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {isUnlock ? 'New' : 'Upgrade'}
                                </div>

                                {/* Icon */}
                                <div className="bg-cyber-accent/10 p-4 rounded-xl mb-4 inline-block">
                                    <Icon className="text-cyber-accent" size={32} />
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-bold text-white mb-2">{attr.name}</h3>

                                {/* Description */}
                                <p className="text-cyber-muted text-sm mb-4">{attr.description}</p>

                                {/* Value Display */}
                                <div className="bg-black/40 rounded-lg p-3 border border-cyber-muted/30">
                                    {isUnlock ? (
                                        <div className="text-center">
                                            <div className="text-2xl font-black text-cyber-accent">{option.value}</div>
                                            <div className="text-[10px] text-cyber-muted uppercase">Starting Value</div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-white">{userProfile.limits[option.attributeId]}</div>
                                                <div className="text-[8px] text-cyber-muted uppercase">Current</div>
                                            </div>
                                            <div className="text-cyber-accent">→</div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-cyber-accent">{option.value}</div>
                                                <div className="text-[8px] text-cyber-muted uppercase">New</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Hover Effect */}
                                <div className="absolute inset-0 bg-gradient-to-t from-cyber-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                            </button>
                        );
                    })}
                </div>

                {/* Close Button (Optional - can remove if we want to force selection) */}
                {/* <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-cyber-muted hover:text-white transition-colors"
                >
                    <X size={24} />
                </button> */}
            </div>
        </div>
    );
};
