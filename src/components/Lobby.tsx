import React, { useState } from 'react';
import { Plus, Target, Users2, Shield, Sword, Cpu, Globe, Link as LinkIcon, Settings } from 'lucide-react';

interface LobbyProps {
    onJoinRoom: (roomId: string) => void;
    onConnect: () => void;
    isConnected: boolean;
    serverUrl: string;
    setServerUrl: (url: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
    onJoinRoom,
    onConnect,
    isConnected,
    serverUrl,
    setServerUrl
}) => {
    const [roomCode, setRoomCode] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomCode.trim()) {
            onJoinRoom(roomCode.trim().toLowerCase());
        }
    };

    return (
        <div className="flex-1 bg-[#0a0a0c] flex items-center justify-center p-8 relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-cyber-accent/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            </div>

            <div className="max-w-5xl w-full flex flex-col gap-12 z-10">
                {/* Header Section */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-accent/10 border border-cyber-accent/20 text-cyber-accent text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
                        <Cpu size={12} />
                        Neural Combat v2.4
                    </div>
                    <h1 className="text-7xl font-black text-white tracking-tighter">
                        CYBER<span className="text-cyber-accent">CORE</span>
                    </h1>
                    <p className="text-cyber-muted text-xl max-w-2xl mx-auto">
                        Design your weapon logic in Python. Test in the sandbox. Dominate the multiplayer arena.
                    </p>
                </div>

                {/* Main Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[440px]">

                    {/* Solo Sandbox Card */}
                    <button
                        onClick={() => onJoinRoom('offline')}
                        className="group relative bg-cyber-light/30 border-2 border-cyber-muted/50 rounded-3xl p-8 flex flex-col items-start text-left transition-all hover:border-cyber-accent hover:bg-cyber-accent/5 hover:translate-y-[-4px] overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 text-cyber-muted/20 group-hover:text-cyber-accent/20 transition-colors">
                            <Cpu size={160} />
                        </div>

                        <div className="bg-cyber-accent/20 p-4 rounded-2xl mb-8">
                            <Target className="text-cyber-accent" size={32} />
                        </div>

                        <h3 className="text-3xl font-black text-white mb-4">SOLO SANDBOX</h3>
                        <p className="text-cyber-muted mb-auto max-w-[280px]">
                            The ultimate testing ground for your Python scripts. Battle AI dummies and refine your weapon logic.
                        </p>

                        <div className="flex items-center gap-2 text-cyber-accent font-bold group-hover:gap-4 transition-all uppercase tracking-widest text-xs mt-8">
                            ENTER ARENA <Sword size={16} />
                        </div>
                    </button>

                    {/* Multiplayer Card */}
                    <div className="bg-cyber-light/40 border-2 border-cyber-muted rounded-3xl p-8 flex flex-col relative">
                        <div className="flex justify-between items-start mb-8">
                            <div className="bg-blue-500/20 p-4 rounded-2xl">
                                <Globe className="text-blue-400" size={32} />
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-cyber-danger/10 text-cyber-danger'}`}>
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-cyber-danger'} animate-ping`} />
                                {isConnected ? 'SERVER ONLINE' : 'SERVER OFFLINE'}
                            </div>
                        </div>

                        <h3 className="text-3xl font-black text-white mb-4 uppercase">Multiplayer</h3>

                        {!isConnected ? (
                            <div className="flex-1 flex flex-col justify-center gap-6">
                                <p className="text-cyber-muted">
                                    Connect to the global mainframe to join parties and battle other engineers worldwide.
                                </p>
                                <div className="space-y-3">
                                    <button
                                        onClick={onConnect}
                                        className="w-full bg-blue-500 text-white font-black py-5 rounded-2xl hover:bg-blue-400 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
                                    >
                                        <LinkIcon size={20} />
                                        INITIALIZE CONNECTION
                                    </button>
                                    <button
                                        onClick={() => setShowSettings(!showSettings)}
                                        className="w-full text-cyber-muted text-xs font-bold py-2 hover:text-white transition-colors flex items-center justify-center gap-1 uppercase"
                                    >
                                        <Settings size={12} /> Server Settings
                                    </button>

                                    {showSettings && (
                                        <div className="p-4 bg-black/40 rounded-xl border border-cyber-muted/30">
                                            <label className="text-[10px] text-cyber-muted uppercase block mb-2 font-bold tracking-widest">Network URL</label>
                                            <input
                                                type="text"
                                                value={serverUrl}
                                                onChange={(e) => setServerUrl(e.target.value)}
                                                className="w-full bg-black border border-cyber-muted rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-blue-400"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleJoin} className="flex-1 flex flex-col gap-6">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={roomCode}
                                            onChange={(e) => setRoomCode(e.target.value)}
                                            placeholder="ENTER PARTY CODE..."
                                            className="w-full bg-black/40 border-2 border-cyber-muted/50 rounded-2xl px-6 py-4 text-white placeholder:text-gray-600 focus:border-blue-400 outline-none transition-all font-mono tracking-widest uppercase"
                                        />
                                        <Plus className="absolute right-6 top-1/2 -translate-y-1/2 text-cyber-muted" size={20} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="submit"
                                            disabled={!roomCode}
                                            className="bg-blue-500 text-white font-black py-4 rounded-2xl hover:bg-blue-400 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale shadow-lg shadow-blue-500/20"
                                        >
                                            JOIN PARTY
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onJoinRoom('global')}
                                            className="bg-cyber-muted/20 border-2 border-cyber-muted text-white font-black py-4 rounded-2xl hover:bg-cyber-muted/40 transition-all active:scale-95"
                                        >
                                            GLOBAL ARENA
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-cyber-muted uppercase tracking-[0.2em] font-bold mt-auto text-center">
                                    Battle is synchronized with 10ms neural latency
                                </p>
                            </form>
                        )}
                    </div>

                </div>

                {/* Footer info */}
                <div className="flex justify-center gap-12 border-t border-cyber-muted/20 pt-8 opacity-50">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyber-muted uppercase tracking-widest">
                        <Users2 size={16} /> 24 ACTIVE SINCE BOOT
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-cyber-muted uppercase tracking-widest">
                        <Shield size={16} /> SECURE NEURAL LINK
                    </div>
                </div>
            </div>
        </div>
    );
};
