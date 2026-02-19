import React, { useState, useEffect } from 'react';
import { networkManager } from '../utils/NetworkManager';
import { Map, Vote, CheckCircle2, Timer } from 'lucide-react';

interface MapOption {
    id: string;
    name: string;
    description: string;
    color: string;
    walls: any[];
}

interface MapVoteOverlayProps {
    onMapChange?: (mapId: string) => void;
}

export const MapVoteOverlay: React.FC<MapVoteOverlayProps> = ({ onMapChange }) => {
    const [voteActive, setVoteActive] = useState(false);
    const [options, setOptions] = useState<MapOption[]>([]);
    const [tally, setTally] = useState<Record<string, number>>({});
    const [myVote, setMyVote] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(20);
    const [resolvedMap, setResolvedMap] = useState<{ name: string; color: string } | null>(null);
    const [showResult, setShowResult] = useState(false);

    useEffect(() => {
        networkManager.setOnMapVoteStart((data) => {
            console.log('[CLIENT] Map Vote Started!', data);
            setOptions(data.options || []);
            setTally({});
            setMyVote(null);
            setVoteActive(true);
            setShowResult(false);
            setTimeLeft(Math.floor((data.duration || 20000) / 1000));
            setResolvedMap(null);
        });

        networkManager.setOnMapVoteUpdate((data) => {
            setTally(data.tally || {});
        });

        networkManager.setOnMapChange((data) => {
            setVoteActive(false);
            setResolvedMap({ name: data.map?.name || data.mapId, color: data.map?.color || '#00ff9f' });
            setShowResult(true);
            onMapChange?.(data.mapId);
            // Hide result after 3 seconds
            setTimeout(() => setShowResult(false), 3000);
        });

        return () => {
            networkManager.setOnMapVoteStart(() => { });
            networkManager.setOnMapVoteUpdate(() => { });
            networkManager.setOnMapChange(() => { });
        };
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!voteActive) return;
        if (timeLeft <= 0) { setVoteActive(false); return; }
        const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(id);
    }, [voteActive, timeLeft]);

    const handleVote = (mapId: string) => {
        if (myVote) return; // already voted
        setMyVote(mapId);
        networkManager.sendVote(mapId);
        setTally(prev => ({ ...prev, [mapId]: (prev[mapId] || 0) + 1 }));
    };

    const totalVotes = Object.values(tally).reduce((s, v) => s + v, 0);

    // Map victory result
    if (showResult && resolvedMap) {
        return (
            <div className="absolute inset-0 flex items-end justify-center pb-40 pointer-events-none z-50">
                <div className="animate-bounce flex flex-col items-center gap-2">
                    <Map size={28} style={{ color: resolvedMap.color }} />
                    <div
                        className="px-6 py-3 rounded-2xl border-2 text-center"
                        style={{
                            borderColor: resolvedMap.color + '80',
                            backgroundColor: resolvedMap.color + '18',
                            boxShadow: `0 0 30px ${resolvedMap.color}44`
                        }}
                    >
                        <div className="text-[9px] uppercase tracking-widest text-white/50 mb-1 font-bold">Map Changed</div>
                        <div className="text-xl font-black uppercase tracking-wider" style={{ color: resolvedMap.color }}>
                            {resolvedMap.name}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!voteActive) return null;

    return (
        <div className="absolute inset-0 flex items-end justify-center pb-8 z-40 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm mx-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                        <Vote size={14} className="text-cyber-accent" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-cyber-accent">
                            MAP VOTE
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Timer size={12} className={timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white/50'} />
                        <span className={`text-xs font-black tabular-nums ${timeLeft <= 5 ? 'text-red-400' : 'text-white/60'}`}>
                            {timeLeft}s
                        </span>
                    </div>
                </div>

                {/* Options */}
                <div className="space-y-2">
                    {options.map(opt => {
                        const votes = tally[opt.id] || 0;
                        const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                        const isVoted = myVote === opt.id;
                        const isWinning = myVote && votes === Math.max(...Object.values(tally));

                        return (
                            <button
                                key={opt.id}
                                onClick={() => handleVote(opt.id)}
                                disabled={!!myVote}
                                className={`w-full text-left rounded-xl border-2 p-3 transition-all duration-200 relative overflow-hidden
                                    ${isVoted
                                        ? 'cursor-default'
                                        : 'hover:scale-[1.02] cursor-pointer active:scale-100'}
                                    disabled:cursor-default`}
                                style={{
                                    borderColor: isVoted ? opt.color : opt.color + '40',
                                    backgroundColor: isVoted ? opt.color + '22' : '#0a0a0f',
                                    boxShadow: isVoted ? `0 0 15px ${opt.color}44` : 'none'
                                }}
                            >
                                {/* Vote bar fill */}
                                <div
                                    className="absolute inset-y-0 left-0 transition-all duration-500"
                                    style={{
                                        width: `${pct}%`,
                                        backgroundColor: opt.color + '20'
                                    }}
                                />

                                <div className="relative flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {isVoted && <CheckCircle2 size={12} style={{ color: opt.color }} />}
                                            <span
                                                className="text-xs font-black uppercase tracking-widest"
                                                style={{ color: isVoted ? opt.color : '#fff' }}
                                            >
                                                {opt.name}
                                            </span>
                                            {myVote && isWinning && (
                                                <span
                                                    className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                                    style={{ backgroundColor: opt.color + '33', color: opt.color }}
                                                >
                                                    WINNING
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[9px] text-white/40 uppercase tracking-wide mt-0.5">
                                            {opt.description}
                                        </div>
                                    </div>
                                    {myVote && (
                                        <div className="text-right shrink-0 ml-3">
                                            <div className="text-sm font-black" style={{ color: opt.color }}>
                                                {votes}
                                            </div>
                                            <div className="text-[9px] text-white/40">{Math.round(pct)}%</div>
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {!myVote && (
                    <p className="text-center text-[9px] text-white/30 uppercase tracking-widest mt-2 font-bold">
                        Click to vote • 1 vote per player
                    </p>
                )}
            </div>
        </div>
    );
};
