import React from 'react';
import { Lock, Unlock, TrendingUp, DollarSign, Info } from 'lucide-react';
import { ATTRIBUTES, getUpgradeCost } from '../utils/AttributeRegistry';

interface WorkshopProps {
    userProfile: {
        money: number;
        unlocks: string[];
        limits: Record<string, number>;
    };
    onUpgrade: (attributeId: string) => void;
}

export const Workshop: React.FC<WorkshopProps> = ({ userProfile, onUpgrade }) => {
    const allAttributes = Object.values(ATTRIBUTES);

    return (
        <div className="flex-1 bg-[#0a0a0c] p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-black text-white mb-2">
                        WEAPON <span className="text-cyber-accent">WORKSHOP</span>
                    </h1>
                    <p className="text-cyber-muted">Upgrade your arsenal with earned currency</p>

                    {/* Money Display */}
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-black/40 border border-emerald-500/30 mt-4">
                        <DollarSign className="text-emerald-400" size={24} />
                        <span className="text-3xl font-black text-emerald-400">{userProfile.money.toLocaleString()}</span>
                    </div>
                </div>

                {/* Attributes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allAttributes.map((attr) => {
                        const isUnlocked = userProfile.unlocks.includes(attr.id);
                        const currentLimit = userProfile.limits[attr.id] || 0;
                        const isMaxed = currentLimit >= attr.maxLimit;
                        const upgradeCost = getUpgradeCost(attr.id, currentLimit);
                        const canAfford = userProfile.money >= upgradeCost;
                        const Icon = attr.icon;

                        return (
                            <div
                                key={attr.id}
                                className={`relative bg-cyber-dark border-2 rounded-2xl p-6 transition-all ${isUnlocked
                                    ? 'border-cyber-accent/50 hover:border-cyber-accent'
                                    : 'border-cyber-muted/30 opacity-60'
                                    }`}
                            >
                                {/* Lock/Unlock Badge */}
                                <div className={`absolute top-4 right-4 p-2 rounded-full ${isUnlocked ? 'bg-emerald-500/20' : 'bg-red-500/20'
                                    }`}>
                                    {isUnlocked ? (
                                        <Unlock className="text-emerald-400" size={16} />
                                    ) : (
                                        <Lock className="text-red-400" size={16} />
                                    )}
                                </div>

                                {/* Icon & Title */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="bg-cyber-accent/10 p-3 rounded-xl">
                                        <Icon className="text-cyber-accent" size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">{attr.name}</h3>
                                </div>

                                {/* Description */}
                                <p className="text-cyber-muted text-xs mb-4">{attr.description}</p>

                                {/* Current Limit */}
                                {isUnlocked && (
                                    <div className="bg-black/40 rounded-lg p-3 mb-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] text-cyber-muted uppercase">Current Limit</span>
                                            <span className="text-sm font-bold text-white">{currentLimit}</span>
                                        </div>
                                        <div className="w-full bg-cyber-muted/20 rounded-full h-2">
                                            <div
                                                className="bg-cyber-accent h-2 rounded-full transition-all"
                                                style={{ width: `${(currentLimit / attr.maxLimit) * 100}%` }}
                                            />
                                        </div>
                                        <div className="text-[8px] text-cyber-muted text-right mt-1">
                                            Max: {attr.maxLimit}
                                        </div>
                                    </div>
                                )}

                                {/* Upgrade Button */}
                                {isUnlocked && !isMaxed && (
                                    <button
                                        onClick={() => onUpgrade(attr.id)}
                                        disabled={!canAfford}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${canAfford
                                            ? 'bg-cyber-accent text-black hover:bg-emerald-400'
                                            : 'bg-cyber-muted/20 text-cyber-muted cursor-not-allowed'
                                            }`}
                                    >
                                        <TrendingUp size={16} />
                                        <span>Upgrade</span>
                                        <span className="ml-auto">${upgradeCost.toLocaleString()}</span>
                                    </button>
                                )}

                                {isUnlocked && isMaxed && (
                                    <div className="w-full text-center py-2 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-sm">
                                        MAXED OUT
                                    </div>
                                )}

                                {!isUnlocked && (
                                    <div className="w-full text-center py-2 rounded-lg bg-red-500/20 text-red-400 font-bold text-sm">
                                        LOCKED - Level up to unlock
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Info Footer */}
                <div className="mt-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-start gap-3">
                        <Info className="text-blue-400 mt-1" size={20} />
                        <div>
                            <h4 className="text-blue-400 font-bold mb-1">How to Progress</h4>
                            <p className="text-cyber-muted text-sm">
                                <strong>Unlock new attributes</strong> by leveling up and selecting cards.
                                <strong> Upgrade limits</strong> using money earned from kills and level-ups.
                                Higher limits allow your weapon scripts to use more powerful values.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
