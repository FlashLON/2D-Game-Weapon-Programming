import React, { useState } from 'react';
import { Target, Users2, Shield, Sword, Cpu, Globe, Link as LinkIcon, Settings, BookOpen, Lock, Unlock, Zap, Play } from 'lucide-react';
import { Tutorial } from './Tutorial';

interface LobbyProps {
    onJoinRoom: (roomId: string, settings?: any) => void;
    onConnect: () => void;
    isConnected: boolean;
    serverUrl: string;
    setServerUrl: (url: string) => void;
    userProfile?: { level: number; xp: number; money: number; maxXp: number };
}

export const Lobby: React.FC<LobbyProps> = ({
    onJoinRoom,
    onConnect,
    isConnected,
    serverUrl,
    setServerUrl,
    userProfile
}) => {
    const [roomCode, setRoomCode] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);

    // Multiplayer Creation State
    const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
    const [createName, setCreateName] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomCode.trim()) {
            onJoinRoom(roomCode.trim().toLowerCase());
        }
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const id = createName.trim() || Math.random().toString(36).substr(2, 6);
        onJoinRoom(id.toLowerCase(), { public: isPublic });
    };

    return (
        <div className="flex-1 bg-[#0a0a0c] flex items-center justify-center p-8 relative overflow-hidden">
            {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

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
                        Neural Combat v2.5
                    </div>
                    <h1 className="text-7xl font-black text-white tracking-tighter">
                        CYBER<span className="text-cyber-accent">CORE</span>
                    </h1>

                    {userProfile && (
                        <div className="flex items-center justify-center gap-4 my-2">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-cyber-muted/50">
                                <span className="text-sm font-bold text-blue-400">LVL {userProfile.level}</span>
                                <span className="text-cyber-muted text-xs mx-1">|</span>
                                <span className="text-sm font-bold text-yellow-500">XP {Math.floor(userProfile.xp)}/{userProfile.maxXp}</span>
                                <span className="text-cyber-muted text-xs mx-1">|</span>
                                <span className="text-sm font-bold text-emerald-400">${userProfile.money.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    <p className="text-cyber-muted text-xl max-w-2xl mx-auto">
                        Design your weapon logic in Python. Test in the sandbox. Dominate the multiplayer arena.
                    </p>
                </div>

                {/* Main Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[500px]">

                    {/* Solo Sandbox Card */}
                    <div className="bg-cyber-light/30 border-2 border-cyber-muted/50 rounded-3xl p-8 flex flex-col items-start text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 text-cyber-muted/20">
                            <Cpu size={160} />
                        </div>

                        <div className="bg-cyber-accent/20 p-4 rounded-2xl mb-8 z-10">
                            <Target className="text-cyber-accent" size={32} />
                        </div>

                        <h3 className="text-3xl font-black text-white mb-4 z-10">SOLO SANDBOX</h3>
                        <p className="text-cyber-muted mb-6 max-w-[280px] z-10">
                            The ultimate testing ground. Battle AI dummies and refine your weapon logic locally.
                        </p>

                        <div className="mt-auto flex flex-col gap-4 w-full z-10">
                            <button
                                onClick={() => onJoinRoom('offline')}
                                className="w-full bg-cyber-accent text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-cyber-accent/20"
                            >
                                <Sword size={20} /> ENTER ARENA
                            </button>
                            <button
                                onClick={() => setShowTutorial(true)}
                                className="w-full bg-black/40 border border-cyber-muted text-cyber-muted font-bold py-3 rounded-2xl hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                            >
                                <BookOpen size={16} /> How to Play
                            </button>
                        </div>
                    </div>

                    {/* Multiplayer Card */}
                    <div className="bg-cyber-light/40 border-2 border-cyber-muted rounded-3xl p-8 flex flex-col relative">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-blue-500/20 p-4 rounded-2xl">
                                <Globe className="text-blue-400" size={32} />
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-cyber-danger/10 text-cyber-danger'}`}>
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-cyber-danger'} animate-ping`} />
                                {isConnected ? 'ONLINE' : 'OFFLINE'}
                            </div>
                        </div>

                        <h3 className="text-3xl font-black text-white mb-2 uppercase">Multiplayer</h3>

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
                                        <div className="p-4 bg-black/40 rounded-xl border border-cyber-muted/30 animate-in slide-in-from-top-2">
                                            <label className="text-[10px] text-cyber-muted uppercase block mb-2 font-bold tracking-widest">Network URL</label>
                                            <input
                                                type="text"
                                                value={serverUrl}
                                                onChange={(e) => setServerUrl(e.target.value)}
                                                className="w-full bg-black border border-cyber-muted rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-blue-400 font-mono"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                {/* Tabs */}
                                <div className="flex p-1 bg-black/40 rounded-xl mb-6">
                                    <button
                                        onClick={() => setActiveTab('join')}
                                        className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'join' ? 'bg-blue-600 text-white shadow-lg' : 'text-cyber-muted hover:text-white'}`}
                                    >
                                        Join Party
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('create')}
                                        className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-lg' : 'text-cyber-muted hover:text-white'}`}
                                    >
                                        Create Party
                                    </button>
                                </div>

                                {activeTab === 'join' ? (
                                    <form onSubmit={handleJoin} className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={roomCode}
                                                onChange={(e) => setRoomCode(e.target.value)}
                                                placeholder="ENTER CODE..."
                                                className="w-full bg-black/40 border-2 border-cyber-muted/50 rounded-2xl px-6 py-4 text-white placeholder:text-gray-600 focus:border-blue-400 outline-none transition-all font-mono tracking-widest uppercase"
                                            />
                                            <Zap className="absolute right-6 top-1/2 -translate-y-1/2 text-cyber-muted" size={20} />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!roomCode}
                                            className="w-full bg-blue-500 text-white font-black py-4 rounded-2xl hover:bg-blue-400 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale shadow-lg shadow-blue-500/20 mt-auto"
                                        >
                                            CONNECT
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleCreate} className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div>
                                            <label className="text-[10px] text-cyber-muted uppercase font-bold tracking-widest mb-2 block">Party Name (Optional)</label>
                                            <input
                                                type="text"
                                                value={createName}
                                                onChange={(e) => setCreateName(e.target.value)}
                                                placeholder="RANDOM"
                                                className="w-full bg-black/40 border-2 border-cyber-muted/50 rounded-2xl px-6 py-4 text-white placeholder:text-gray-600 focus:border-blue-400 outline-none transition-all font-mono tracking-widest uppercase text-sm"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between bg-black/20 p-4 rounded-2xl border border-cyber-muted/30 cursor-pointer hover:bg-black/40 transition-colors" onClick={() => setIsPublic(!isPublic)}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isPublic ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                                    {isPublic ? <Unlock size={20} /> : <Lock size={20} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white uppercase">{isPublic ? 'Public Party' : 'Private Party'}</span>
                                                    <span className="text-[10px] text-cyber-muted uppercase tracking-wider">{isPublic ? 'Visible to everyone' : 'Invitation Code only'}</span>
                                                </div>
                                            </div>
                                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isPublic ? 'bg-emerald-500' : 'bg-cyber-muted/50'}`}>
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full bg-cyber-accent text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-cyber-accent/20 mt-auto"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <Play size={16} fill="currentColor" /> HOST MATCH
                                            </div>
                                        </button>
                                    </form>
                                )}
                            </div>
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
