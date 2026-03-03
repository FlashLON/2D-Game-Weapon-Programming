import React, { useState } from 'react';
import { DollarSign, Zap, Crown, Star, Gem, ShieldCheck, X, ExternalLink, Lock } from 'lucide-react';

interface TokenPack {
    id: string;
    name: string;
    price: string;
    priceUsd: number;
    baseTokens: number;
    bonusTokens: number;
    totalTokens: number;
    tag: string;
    color: string;
    accent: string;
    icon: React.ReactNode;
    popular?: boolean;
    bestValue?: boolean;
}

const TOKEN_PACKS: TokenPack[] = [
    {
        id: 'starter_hack',
        name: 'Starter Hack',
        price: '$1.99',
        priceUsd: 1.99,
        baseTokens: 200,
        bonusTokens: 0,
        totalTokens: 200,
        tag: 'Entry Level',
        color: 'from-slate-500/20 to-slate-600/5',
        accent: '#94a3b8',
        icon: <Zap size={16} />
    },
    {
        id: 'mercenary_pack',
        name: 'Mercenary Pack',
        price: '$4.99',
        priceUsd: 4.99,
        baseTokens: 500,
        bonusTokens: 50,
        totalTokens: 550,
        tag: 'Great Starter',
        color: 'from-emerald-500/20 to-emerald-600/5',
        accent: '#34d399',
        icon: <ShieldCheck size={16} />
    },
    {
        id: 'cybernetic_pack',
        name: 'Cybernetic Pack',
        price: '$9.99',
        priceUsd: 9.99,
        baseTokens: 1000,
        bonusTokens: 150,
        totalTokens: 1150,
        tag: '⭐ Most Popular',
        color: 'from-cyan-500/20 to-blue-500/5',
        accent: '#22d3ee',
        icon: <Star size={16} />,
        popular: true
    },
    {
        id: 'overlord_cache',
        name: 'Overlord Cache',
        price: '$19.99',
        priceUsd: 19.99,
        baseTokens: 2000,
        bonusTokens: 400,
        totalTokens: 2400,
        tag: 'For Serious Hackers',
        color: 'from-purple-500/20 to-violet-500/5',
        accent: '#a855f7',
        icon: <Crown size={16} />
    },
    {
        id: 'matrix_core',
        name: 'The Matrix Core',
        price: '$49.99',
        priceUsd: 49.99,
        baseTokens: 5000,
        bonusTokens: 1500,
        totalTokens: 6500,
        tag: '💎 Best Value',
        color: 'from-yellow-500/20 to-amber-500/5',
        accent: '#fbbf24',
        icon: <Gem size={16} />,
        bestValue: true
    }
];

interface TokenShopProps {
    userMoney: number;
    isLoggedIn: boolean;
    username?: string;
    serverUrl?: string;
    onPurchase?: (packId: string, totalTokens: number) => void;
}

export const TokenShop: React.FC<TokenShopProps> = ({ userMoney, isLoggedIn }) => {
    const [expanded, setExpanded] = useState(false);
    const [showComingSoon, setShowComingSoon] = useState<TokenPack | null>(null);

    const handleBuy = (pack: TokenPack) => {
        setShowComingSoon(pack);
    };

    return (
        <>
            {/* Compact Toggle Button */}
            <div className="relative">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl border transition-all duration-300 ${expanded
                            ? 'bg-gradient-to-r from-yellow-500/15 to-amber-500/10 border-yellow-500/30 shadow-lg shadow-yellow-500/5'
                            : 'bg-black/30 border-white/5 hover:border-yellow-500/20 hover:bg-yellow-500/5'
                        }`}
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/30 to-amber-600/20 border border-yellow-500/20 flex items-center justify-center shrink-0">
                        <DollarSign size={16} className="text-yellow-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-[11px] font-black text-white uppercase tracking-wider">Token Shop</div>
                        <div className="text-[8px] font-bold text-yellow-400/50 uppercase tracking-widest">Premium Coin Packs</div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                        <DollarSign size={10} className="text-yellow-400" />
                        <span className="text-[10px] font-black text-yellow-400">{userMoney.toLocaleString()}</span>
                    </div>
                </button>

                {/* Expanded Shop Panel */}
                {expanded && (
                    <div className="mt-2 bg-black/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <Gem size={12} className="text-yellow-400" /> Premium Token Packs
                                </div>
                                <div className="text-[8px] text-white/20 mt-0.5">Support the game • Get coins</div>
                            </div>
                            <button onClick={() => setExpanded(false)} className="p-1 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all">
                                <X size={14} />
                            </button>
                        </div>

                        {/* Packs */}
                        <div className="p-3 space-y-2 max-h-[340px] overflow-y-auto scrollbar-thin">
                            {TOKEN_PACKS.map((pack) => (
                                <div
                                    key={pack.id}
                                    className={`relative group rounded-xl border transition-all duration-200 overflow-hidden ${pack.popular
                                            ? 'border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/5 shadow-lg shadow-cyan-500/5'
                                            : pack.bestValue
                                                ? 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 shadow-lg shadow-yellow-500/5'
                                                : 'border-white/5 bg-gradient-to-r ' + pack.color + ' hover:border-white/15'
                                        }`}
                                >
                                    {/* Popular / Best Value Badge */}
                                    {pack.popular && (
                                        <div className="absolute -top-px -right-px">
                                            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-black text-[7px] font-black px-2 py-0.5 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
                                                MOST POPULAR
                                            </div>
                                        </div>
                                    )}
                                    {pack.bestValue && (
                                        <div className="absolute -top-px -right-px">
                                            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[7px] font-black px-2 py-0.5 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
                                                BEST VALUE
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 p-3">
                                        {/* Icon */}
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                                            style={{
                                                background: `linear-gradient(135deg, ${pack.accent}22, ${pack.accent}08)`,
                                                borderColor: `${pack.accent}33`,
                                                color: pack.accent
                                            }}
                                        >
                                            {pack.icon}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-white uppercase">{pack.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-bold" style={{ color: pack.accent }}>
                                                    {pack.totalTokens.toLocaleString()} coins
                                                </span>
                                                {pack.bonusTokens > 0 && (
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                                        +{pack.bonusTokens} BONUS
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[8px] text-white/20 mt-0.5">{pack.tag}</div>
                                        </div>

                                        {/* Price & Buy */}
                                        <button
                                            onClick={() => handleBuy(pack)}
                                            disabled={!isLoggedIn}
                                            className={`shrink-0 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase transition-all ${!isLoggedIn
                                                    ? 'bg-white/3 text-white/15 cursor-not-allowed'
                                                    : `border hover:scale-105 active:scale-95`
                                                }`}
                                            style={
                                                isLoggedIn
                                                    ? {
                                                        background: `linear-gradient(135deg, ${pack.accent}22, ${pack.accent}11)`,
                                                        borderColor: `${pack.accent}44`,
                                                        color: pack.accent
                                                    }
                                                    : undefined
                                            }
                                        >
                                            {pack.price}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
                            <div className="text-[8px] text-white/15 uppercase tracking-wider flex items-center gap-1.5">
                                <ShieldCheck size={10} className="text-emerald-400/40" /> Secure Payments
                            </div>
                            <div className="flex items-center gap-1 text-[8px] text-white/15 hover:text-white/30 cursor-pointer transition-all">
                                <ExternalLink size={9} /> Terms Apply
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Coming Soon Modal */}
            {showComingSoon && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-gradient-to-b from-[#151520] to-[#0a0a12] border border-white/10 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="text-center mb-5">
                            <div
                                className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center border"
                                style={{
                                    background: `linear-gradient(135deg, ${showComingSoon.accent}33, ${showComingSoon.accent}11)`,
                                    borderColor: `${showComingSoon.accent}44`,
                                    color: showComingSoon.accent
                                }}
                            >
                                <Lock size={24} />
                            </div>
                            <h3 className="text-lg font-black text-white uppercase">{showComingSoon.name}</h3>
                            <div className="text-[10px] text-white/30 mt-1">{showComingSoon.price} — {showComingSoon.totalTokens.toLocaleString()} Coins</div>
                        </div>

                        {/* Coming Soon Message */}
                        <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-4 mb-5 text-center">
                            <div className="text-[13px] font-black text-yellow-400 uppercase tracking-wider mb-1">
                                🚧 Coming Soon
                            </div>
                            <div className="text-[10px] text-white/40 leading-relaxed">
                                Payments are not available yet. This feature is under development and will be enabled in a future update.
                            </div>
                        </div>

                        {/* Breakdown Preview */}
                        <div className="bg-black/40 rounded-xl p-4 mb-5 space-y-2 border border-white/5">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-white/40">Base Tokens</span>
                                <span className="text-white font-bold">{showComingSoon.baseTokens.toLocaleString()}</span>
                            </div>
                            {showComingSoon.bonusTokens > 0 && (
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-emerald-400/60">Bonus Tokens</span>
                                    <span className="text-emerald-400 font-bold">+{showComingSoon.bonusTokens.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="border-t border-white/5 pt-2 flex justify-between text-[12px]">
                                <span className="text-white/60 font-bold">Total</span>
                                <span className="font-black" style={{ color: showComingSoon.accent }}>{showComingSoon.totalTokens.toLocaleString()} Coins</span>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => setShowComingSoon(null)}
                            className="w-full py-3 rounded-xl text-[11px] font-black text-white/60 border border-white/10 hover:bg-white/5 hover:text-white transition-all uppercase"
                        >
                            Got it
                        </button>

                        <div className="mt-3 text-center text-[8px] text-white/15 uppercase tracking-wider">
                            Stay tuned for updates
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
