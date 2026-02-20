import React, { useState, useEffect } from 'react';
import { Map, Vote, CheckCircle2, Timer } from 'lucide-react';

interface MapOption {
    id: string;
    name: string;
    description: string;
    color: string;
}

interface MapVoteOverlayProps {
    voteData: {
        options: MapOption[];
        tally: Record<string, number>;
        endTime: number;
    } | null;
    myVote: string | null;
    onVote: (mapId: string) => void;
    mapChangeResult: { name: string; color: string } | null;
}

export const MapVoteOverlay: React.FC<MapVoteOverlayProps> = ({
    voteData,
    myVote,
    onVote,
    mapChangeResult
}) => {
    const [timeLeft, setTimeLeft] = useState(20);

    // Sync countdown timer with endTime
    useEffect(() => {
        if (!voteData) return;
        const update = () => {
            const remaining = Math.max(0, Math.round((voteData.endTime - Date.now()) / 1000));
            setTimeLeft(remaining);
        };
        update();
        const id = setInterval(update, 500);
        return () => clearInterval(id);
    }, [voteData?.endTime]);

    // Map change result banner
    if (mapChangeResult) {
        return (
            <div className="absolute inset-0 flex items-end justify-center pb-40 pointer-events-none z-50">
                <div className="animate-bounce flex flex-col items-center gap-2">
                    <Map size={28} style={{ color: mapChangeResult.color }} />
                    <div
                        className="px-6 py-3 rounded-2xl border-2 text-center"
                        style={{
                            borderColor: mapChangeResult.color + '80',
                            backgroundColor: mapChangeResult.color + '18',
                            boxShadow: `0 0 30px ${mapChangeResult.color}44`
                        }}
                    >
                        <div className="text-[9px] uppercase tracking-widest text-white/50 mb-1 font-bold">Map Changed</div>
                        <div className="text-xl font-black uppercase tracking-wider" style={{ color: mapChangeResult.color }}>
                            {mapChangeResult.name}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!voteData || voteData.options.length === 0) return null;

    const tally = voteData.tally;
    const totalVotes = Object.values(tally).reduce((s, v) => s + v, 0);

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
                    {voteData.options.map(opt => {
                        const votes = tally[opt.id] || 0;
                        const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                        const isVoted = myVote === opt.id;
                        const maxVotes = Math.max(...Object.values(tally), 0);
                        const isWinning = myVote !== null && votes > 0 && votes === maxVotes;

                        return (
                            <button
                                key={opt.id}
                                onClick={() => onVote(opt.id)}
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
