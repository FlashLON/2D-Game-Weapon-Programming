import React, { useState } from 'react';
import { Target, Users2, Shield, Cpu, Globe, Link as LinkIcon, Settings, BookOpen, Lock, Play, Wrench, DollarSign, TrendingUp, Info, CheckCircle2, Trophy, Swords } from 'lucide-react';
import { Tutorial } from './Tutorial';
import { SavedCodePanel } from './SavedCodePanel';
import { TitlesPanel } from './TitlesPanel';
import { ATTRIBUTES, getUpgradeCost } from '../utils/AttributeRegistry';
import type { SavedCode } from '../utils/NetworkManager';

interface LobbyProps {
    onJoinRoom: (roomId: string, settings?: any) => void;
    onSpectate: (roomId: string) => void;
    onConnect: () => void;
    isConnected: boolean;
    serverUrl: string;
    setServerUrl: (url: string) => void;
    userProfile?: {
        level: number;
        xp: number;
        money: number;
        maxXp: number;
        unlocks: string[];
        limits: Record<string, number>;
        titles: string[];
        equippedTitle: string | null;
        aura_type?: string | null;
    };
    onLogin?: (username: string, password?: string) => void;
    isLoggedIn?: boolean;
    username?: string;
    onUpgrade?: (attributeId: string) => void;
    onSignup?: (username: string, password?: string) => void;
    leaderboard?: any[];
    savedCodes?: SavedCode[];
    onLoadCode?: (code: SavedCode) => void;
    onDeleteCode?: (codeId: string) => void;
    onRenameCode?: (codeId: string, newName: string) => void;
    loadingSavedCodes?: boolean;
    onEquipTitle?: (titleId: string | null) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
    onJoinRoom,
    onSpectate,
    onConnect,
    isConnected,
    serverUrl,
    setServerUrl,
    userProfile,
    onLogin,
    isLoggedIn,
    username,
    onUpgrade,
    onSignup,
    leaderboard = [],
    savedCodes = [],
    onLoadCode,
    onDeleteCode,
    onRenameCode,
    loadingSavedCodes = false,
    onEquipTitle
}) => {
    const [roomCode, setRoomCode] = useState('');
    const [loginName, setLoginName] = useState('');
    const [password, setPassword] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);

    // Multiplayer Creation State
    const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
    const [createName, setCreateName] = useState('');
    const [isPublic] = useState(true);

    // Inventory vs Saved Code tabs
    const [inventoryTab, setInventoryTab] = useState<'inventory' | 'saved-code' | 'titles' | 'admin'>('inventory');

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
        <div className="flex-1 bg-[#0a0a0c] flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
            {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

            {/* Dynamic Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-cyber-accent/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            </div>

            <div className="max-w-7xl w-full flex flex-col gap-8 z-10 h-full max-h-[90vh]">
                {/* Header Section */}
                <div className="text-center shrink-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-accent/10 border border-cyber-accent/20 text-cyber-accent text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                        <Cpu size={12} />
                        Neural Combat v2.5
                    </div>
                    <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tighter">
                        CYBER<span className="text-cyber-accent">CORE</span>
                    </h1>

                    {!isLoggedIn && (
                        <div className="flex flex-col items-center justify-center gap-4 my-2">
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input
                                        value={loginName}
                                        onChange={(e) => setLoginName(e.target.value)}
                                        placeholder="USERNAME"
                                        className="bg-black/40 border border-cyber-muted rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-cyber-accent font-mono uppercase w-32"
                                    />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="PASSWORD"
                                        className="bg-black/40 border border-cyber-muted rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-cyber-accent font-mono uppercase w-32"
                                    />
                                </div>
                                <div className="flex gap-2 justify-center">
                                    <button
                                        onClick={() => onLogin?.(loginName, password)}
                                        className="bg-cyber-accent text-black font-bold px-6 py-2 rounded-lg hover:bg-emerald-400 transition-colors text-xs uppercase flex-1"
                                    >
                                        Login
                                    </button>
                                    <button
                                        onClick={() => onSignup?.(loginName, password)}
                                        className="bg-blue-500 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-400 transition-colors text-xs uppercase flex-1"
                                    >
                                        Signup
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content: 2-Column Layout */}
                <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">

                    {/* LEFT: Arena Selection (60% width) */}
                    <div className="flex-[3] flex flex-col gap-6 overflow-y-auto pr-2">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-widest">
                            <Target className="text-cyber-accent" />
                            Select Arena
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                            {/* Solo Sandbox Card */}
                            <div className="bg-cyber-light/40 border-2 border-cyber-muted/30 rounded-3xl p-6 flex flex-col relative overflow-hidden group hover:border-cyber-accent/50 transition-all">
                                <div className="absolute top-0 right-0 p-4 text-cyber-muted/10 group-hover:text-cyber-accent/10 transition-colors">
                                    <Cpu size={140} />
                                </div>
                                <div className="z-10">
                                    <h3 className="text-2xl font-black text-white mb-2">SANDBOX</h3>
                                    <p className="text-cyber-muted text-sm mb-6">Test your Python scripts offline with AI targets.</p>

                                    <ul className="space-y-2 mb-8">
                                        <li className="flex items-center gap-2 text-[10px] font-bold text-cyber-muted uppercase font-mono">
                                            <CheckCircle2 size={12} className="text-emerald-500" /> No Connection Needed
                                        </li>
                                        <li className="flex items-center gap-2 text-[10px] font-bold text-cyber-muted uppercase font-mono">
                                            <CheckCircle2 size={12} className="text-emerald-500" /> Unlimited Retries
                                        </li>
                                    </ul>
                                </div>
                                <button
                                    onClick={() => onJoinRoom('offline')}
                                    className="mt-auto w-full bg-cyber-accent text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-cyber-accent/20 flex items-center justify-center gap-3 z-10"
                                >
                                    <Play size={20} fill="currentColor" /> ENTER SANDBOX
                                </button>
                            </div>

                            {/* Co-op Mode Card */}
                            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/10 border-2 border-purple-500/30 rounded-3xl p-6 flex flex-col relative overflow-hidden group hover:border-purple-400/50 transition-all">
                                <div className="absolute top-0 right-0 p-4 text-purple-500/10 group-hover:text-purple-400/10 transition-colors">
                                    <Swords size={120} />
                                </div>
                                <div className="z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-2xl font-black text-white">CO-OP SURVIVAL</h3>
                                        <span className="bg-purple-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">NEW MOD</span>
                                    </div>
                                    <p className="text-cyber-muted text-sm mb-6">Team up with friends to survive endless waves and massive bosses.</p>

                                    <div className="space-y-3 mb-4">
                                        <button
                                            onClick={() => onJoinRoom('coop-main', { mode: 'coop', public: true })}
                                            disabled={!isConnected}
                                            className={`w-full py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 ${isConnected ? 'bg-purple-600/20 text-purple-400 border border-purple-500/50 hover:bg-purple-600/40 hover:text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed grayscale'}`}
                                        >
                                            <Globe size={16} /> JOIN PUBLIC SECTOR
                                        </button>
                                        <button
                                            onClick={() => onJoinRoom(`coop-private-${Math.floor(Math.random() * 10000)}`, { mode: 'coop', public: false })}
                                            disabled={!isConnected}
                                            className={`w-full py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 ${isConnected ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-600/20' : 'bg-gray-800 text-gray-500 cursor-not-allowed grayscale'}`}
                                        >
                                            <Lock size={16} /> CREATE PRIVATE SQUAD
                                        </button>
                                        <button
                                            onClick={() => onSpectate('coop-main')}
                                            disabled={!isConnected}
                                            className={`w-full py-2 rounded-xl font-black transition-all text-xs flex items-center justify-center gap-2 ${isConnected ? 'bg-purple-900/30 text-purple-400 border border-purple-700/40 hover:bg-purple-900/50' : 'bg-gray-800 text-gray-500 cursor-not-allowed grayscale'}`}
                                        >
                                            👁 SPECTATE CO-OP
                                        </button>
                                    </div>

                                    <ul className="space-y-2 mb-2">
                                        <li className="flex items-center gap-2 text-[10px] font-bold text-purple-300 uppercase font-mono">
                                            <Users2 size={12} /> Mutual Defense
                                        </li>
                                        <li className="flex items-center gap-2 text-[10px] font-bold text-purple-300 uppercase font-mono">
                                            <Shield size={12} /> Shared Objectives
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Multiplayer Card */}
                            <div className="bg-cyber-light/40 border-2 border-cyber-muted/30 rounded-3xl p-6 flex flex-col relative overflow-hidden group hover:border-blue-500/50 transition-all">
                                <div className="absolute top-0 right-0 p-4 text-cyber-muted/10 group-hover:text-blue-500/10 transition-colors">
                                    <Globe size={140} />
                                </div>

                                <div className="z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-2xl font-black text-white">MULTIPLAYER</h3>
                                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest flex items-center gap-1.5 ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-cyber-danger/10 text-cyber-danger'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-cyber-danger'} ${isConnected ? 'animate-pulse' : ''}`} />
                                            {isConnected ? 'ONLINE' : 'OFFLINE'}
                                        </div>
                                    </div>
                                    <p className="text-cyber-muted text-sm mb-4">Compete against other engineers in real-time.</p>
                                </div>

                                {!isConnected ? (
                                    <button
                                        onClick={onConnect}
                                        className="mt-auto w-full bg-blue-500 text-white font-black py-4 rounded-2xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 z-10"
                                    >
                                        <LinkIcon size={20} /> INITIALIZE LINK
                                    </button>
                                ) : (
                                    <div className="mt-auto z-10 space-y-4">
                                        <div className="flex p-1 bg-black/40 rounded-xl">
                                            <button
                                                onClick={() => setActiveTab('join')}
                                                className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${activeTab === 'join' ? 'bg-white/10 text-white' : 'text-cyber-muted hover:text-white'}`}
                                            >
                                                Join Room
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('create')}
                                                className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${activeTab === 'create' ? 'bg-white/10 text-white' : 'text-cyber-muted hover:text-white'}`}
                                            >
                                                Create Room
                                            </button>
                                        </div>

                                        {activeTab === 'join' ? (
                                            <form onSubmit={handleJoin} className="space-y-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        value={roomCode}
                                                        onChange={(e) => setRoomCode(e.target.value)}
                                                        placeholder="ROOM CODE"
                                                        className="flex-1 bg-black/60 border border-cyber-muted/30 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-400 transition-all font-mono"
                                                    />
                                                    <button type="submit" className="bg-blue-500 text-white font-black px-5 rounded-xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20 text-xs">
                                                        JOIN
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => roomCode.trim() && onSpectate(roomCode.trim().toLowerCase())}
                                                        className="bg-purple-700/60 text-purple-300 border border-purple-500/50 font-black px-4 rounded-xl hover:bg-purple-700/90 transition-all text-xs"
                                                        title="Watch without playing"
                                                    >
                                                        👁 WATCH
                                                    </button>
                                                </div>
                                                <p className="text-[9px] text-white/30 text-center uppercase tracking-widest">👁 WATCH to spectate without playing</p>
                                            </form>
                                        ) : (
                                            <form onSubmit={handleCreate} className="space-y-2">
                                                <input
                                                    value={createName}
                                                    onChange={(e) => setCreateName(e.target.value)}
                                                    placeholder="NAME (OPTIONAL)"
                                                    className="w-full bg-black/60 border border-cyber-muted/30 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-400 transition-all font-mono"
                                                />
                                                <div className="flex gap-2">
                                                    <button type="submit" className="flex-1 bg-blue-500 text-white font-black py-3 rounded-xl hover:bg-blue-400 transition-all text-xs">
                                                        CREATE PARTY
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const id = createName.trim() || Math.random().toString(36).substr(2, 6);
                                                            onSpectate(id.toLowerCase());
                                                        }}
                                                        className="bg-purple-700/60 text-purple-300 border border-purple-500/50 font-black px-4 rounded-xl hover:bg-purple-700/90 transition-all text-xs"
                                                        title="Create room but spectate instead of playing"
                                                    >
                                                        👁 WATCH
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tutorial Links */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowTutorial(true)}
                                className="bg-cyber-light/20 border border-cyber-muted/20 rounded-2xl p-4 flex items-center gap-3 hover:bg-cyber-light/40 transition-all text-left"
                            >
                                <div className="bg-cyber-accent/10 p-2 rounded-lg text-cyber-accent">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <div className="text-xs font-black text-white uppercase">Operational Guide</div>
                                    <div className="text-[10px] text-cyber-muted uppercase">Learn the basics</div>
                                </div>
                            </button>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="bg-cyber-light/20 border border-cyber-muted/20 rounded-2xl p-4 flex items-center gap-3 hover:bg-cyber-light/40 transition-all text-left"
                            >
                                <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <div className="text-xs font-black text-white uppercase">Network Config</div>
                                    <div className="text-[10px] text-cyber-muted uppercase">Server settings</div>
                                </div>
                            </button>
                        </div>

                        {showSettings && (
                            <div className="p-4 bg-black/60 rounded-2xl border border-cyber-muted/30 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] text-cyber-muted uppercase font-black mb-2 block">Relay Server URL</label>
                                <input
                                    type="text"
                                    value={serverUrl}
                                    onChange={(e) => setServerUrl(e.target.value)}
                                    className="w-full bg-black border border-cyber-muted/50 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-cyber-accent font-mono"
                                />
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Inventory & Upgrades (40% width) */}
                    <div className="flex-[2] bg-cyber-dark/80 border-2 border-cyber-accent/20 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl">
                        <div className="p-6 border-b border-cyber-accent/10 flex justify-between items-center shrink-0">
                            <div className="flex-1">
                                <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                                    <Wrench className="text-cyber-accent" size={20} />
                                    {inventoryTab === 'inventory' ? 'Inventory' : inventoryTab === 'titles' ? 'Titles' : inventoryTab === 'admin' ? 'Admin Control' : 'Saved Code'}
                                </h2>
                                <div className="text-[10px] text-cyber-muted uppercase font-bold tracking-widest">
                                    {inventoryTab === 'inventory' ? 'Global Assets' : inventoryTab === 'titles' ? 'Identity Matrix' : inventoryTab === 'admin' ? 'System Override' : 'Your Scripts'}
                                </div>
                            </div>
                            {userProfile && inventoryTab === 'inventory' && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
                                    <DollarSign className="text-emerald-400" size={16} />
                                    <span className="text-xl font-black text-emerald-400">{userProfile.money.toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        {/* Tab Buttons */}
                        {isLoggedIn && (
                            <div className="px-6 py-3 border-b border-cyber-accent/10 flex gap-2">
                                <button
                                    onClick={() => setInventoryTab('inventory')}
                                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${inventoryTab === 'inventory' ? 'bg-white/10 text-white' : 'text-cyber-muted hover:text-white'}`}
                                >
                                    Inventory
                                </button>
                                <button
                                    onClick={() => setInventoryTab('saved-code')}
                                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${inventoryTab === 'saved-code' ? 'bg-white/10 text-white' : 'text-cyber-muted hover:text-white'}`}
                                >
                                    Saved Code
                                </button>
                                <button
                                    onClick={() => setInventoryTab('titles')}
                                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${inventoryTab === 'titles' ? 'bg-white/10 text-white' : 'text-cyber-muted hover:text-white'}`}
                                >
                                    Titles
                                </button>
                                {username?.toLowerCase() === 'flashlon' && (
                                    <button
                                        onClick={() => setInventoryTab('admin')}
                                        className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all border ${inventoryTab === 'admin' ? 'bg-red-500/20 text-red-500 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-transparent text-red-500/50 hover:text-red-500 hover:bg-red-500/10'}`}
                                    >
                                        Admin
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {inventoryTab === 'inventory' ? (
                                <>
                                    {!isLoggedIn ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40 grayscale">
                                            <Lock size={48} className="mb-4 text-cyber-muted" />
                                            <div className="text-sm font-black text-white uppercase mb-2">Systems Locked</div>
                                            <div className="text-[10px] text-cyber-muted uppercase">Login to access inventory & upgrades</div>
                                        </div>
                                    ) : userProfile ? (
                                        <>
                                            {/* Aura Status Card */}
                                            {userProfile.aura_type && (
                                                <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-2 border-purple-500/40 rounded-2xl p-4 mb-4 relative overflow-hidden">
                                                    <div className="flex items-center gap-4 relative z-10">
                                                        <div className="bg-purple-500/30 p-3 rounded-xl border border-purple-500/50">
                                                            {React.createElement(ATTRIBUTES[userProfile.aura_type]?.icon || Shield, { size: 32, className: "text-purple-400" })}
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Active Aura</div>
                                                            <div className="text-lg font-black text-white uppercase">{ATTRIBUTES[userProfile.aura_type]?.name}</div>
                                                            <div className="text-[10px] text-cyber-muted uppercase leading-tight">{ATTRIBUTES[userProfile.aura_type]?.description}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-4 pb-4">
                                                {Object.values(ATTRIBUTES).map((attr) => {
                                                    const isUnlocked = attr.isBase || userProfile.unlocks.includes(attr.id);
                                                    const currentLimit = userProfile.limits[attr.id] || attr.startLimit;
                                                    const isMaxed = currentLimit >= attr.maxLimit;
                                                    const upgradeCost = getUpgradeCost(attr.id, currentLimit);
                                                    const canAfford = userProfile.money >= upgradeCost;
                                                    const Icon = attr.icon;

                                                    if (attr.isAura && userProfile.aura_type && userProfile.aura_type !== attr.id) {
                                                        return null;
                                                    }

                                                    if (!isUnlocked) return (
                                                        <div key={attr.id} className="bg-black/20 border border-cyber-muted/10 rounded-2xl p-4 opacity-50 flex items-center gap-4">
                                                            <div className="bg-cyber-muted/10 p-3 rounded-xl grayscale">
                                                                <Icon size={24} className="text-cyber-muted" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="text-xs font-bold text-cyber-muted uppercase tracking-wider">{attr.name}</div>
                                                                <div className="text-[8px] text-cyber-muted uppercase">Locked (Level {userProfile.level + 1}+)</div>
                                                            </div>
                                                            <Lock size={16} className="text-cyber-muted" />
                                                        </div>
                                                    );

                                                    return (
                                                        <div key={attr.id} className="bg-cyber-light/30 border border-cyber-accent/20 rounded-2xl p-4 hover:border-cyber-accent/40 transition-all group">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="bg-cyber-accent/10 p-2.5 rounded-xl text-cyber-accent group-hover:bg-cyber-accent/20 transition-all">
                                                                    <Icon size={20} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-center mb-0.5">
                                                                        <h3 className="text-sm font-black text-white uppercase tracking-tight">{attr.name}</h3>
                                                                        <div className="text-[8px] font-bold text-cyber-accent border border-cyber-accent/20 px-1.5 py-0.5 rounded uppercase">LVL MAX: {attr.maxLimit}</div>
                                                                    </div>
                                                                    <div className="flex justify-between items-end">
                                                                        <div className="text-[8px] text-cyber-muted uppercase max-w-[140px] leading-tight line-clamp-1">{attr.description}</div>
                                                                        <div className="text-xs font-black text-white">{currentLimit}</div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="w-full bg-black/40 rounded-full h-1 mb-4 overflow-hidden">
                                                                <div
                                                                    className="bg-cyber-accent h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,255,159,0.5)]"
                                                                    style={{ width: `${(currentLimit / attr.maxLimit) * 100}%` }}
                                                                />
                                                            </div>

                                                            {!isMaxed ? (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (onUpgrade) onUpgrade(attr.id);
                                                                        }}
                                                                        disabled={!canAfford}
                                                                        className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${canAfford ? 'bg-cyber-accent text-black hover:bg-emerald-400 active:scale-[0.98]' : 'bg-white/5 text-cyber-muted cursor-not-allowed grayscale'}`}
                                                                    >
                                                                        <TrendingUp size={14} />
                                                                        Upgrade Limit
                                                                        <span className="ml-auto opacity-70 tracking-widest">${upgradeCost.toLocaleString()}</span>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="w-full py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-black text-[10px] uppercase text-center flex items-center justify-center gap-2">
                                                                    <CheckCircle2 size={14} /> Neural Overload Reached
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                                                <Info className="text-blue-400 shrink-0" size={16} />
                                                <p className="text-[9px] text-blue-100 uppercase tracking-wider leading-relaxed font-bold">
                                                    Level up to receive <span className="text-cyber-accent">Draft Cards</span>. Choose new attributes to expand your logic capabilities. Use money to increase execution limits.
                                                </p>
                                            </div>
                                        </>
                                    ) : null}
                                </>
                            ) : inventoryTab === 'titles' ? (
                                <TitlesPanel
                                    unlockedTitles={userProfile?.titles || []}
                                    equippedTitle={userProfile?.equippedTitle || null}
                                    onEquip={(id) => onEquipTitle?.(id)}
                                />
                            ) : inventoryTab === 'admin' && username?.toLowerCase() === 'flashlon' ? (
                                <div className="flex flex-col items-center justify-start py-8 px-4 animate-in fade-in zoom-in duration-300 relative w-full min-h-full">
                                    {/* Background glow for admin panel */}
                                    <div className="absolute inset-0 bg-red-500/5 pointer-events-none rounded-2xl" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/20 rounded-full blur-[100px] pointer-events-none" />

                                    <Shield size={64} className="text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10" />
                                    <h3 className="text-3xl font-black text-white uppercase tracking-[0.2em] mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] z-10">Admin Override</h3>
                                    <p className="text-red-300 text-[10px] uppercase font-bold tracking-widest mb-8 z-10">Welcome back, flashlon. Full system access granted.</p>

                                    <div className="w-full max-w-sm space-y-3 z-10">
                                        <button
                                            onClick={() => {
                                                const msg = window.prompt('Enter message to broadcast:');
                                                if (msg) import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('broadcast', { message: msg }));
                                            }}
                                            className="w-full bg-red-900/20 border border-red-500/30 text-red-400 font-black py-4 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:text-white transition-all text-xs uppercase flex items-center justify-center gap-3 group">
                                            <Globe size={18} className="text-red-500 group-hover:animate-pulse" /> Broadcast Server Message
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to kick all other players?')) {
                                                    import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('kick_all'));
                                                }
                                            }}
                                            className="w-full bg-red-900/20 border border-red-500/30 text-red-400 font-black py-4 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:text-white transition-all text-xs uppercase flex items-center justify-center gap-3 group">
                                            <Users2 size={18} className="text-red-500 group-hover:animate-pulse" /> Manage / Kick Connected Nodes
                                        </button>
                                        <button
                                            onClick={() => {
                                                const username = window.prompt('Enter username (leave empty for self):') || 'flashlon';
                                                const amtStr = window.prompt('Enter currency amount:');
                                                if (amtStr) {
                                                    const amount = parseInt(amtStr, 10);
                                                    if (!isNaN(amount)) import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('inject_currency', { targetUser: username, amount }));
                                                }
                                            }}
                                            className="w-full bg-red-900/20 border border-red-500/30 text-red-400 font-black py-4 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:text-white transition-all text-xs uppercase flex items-center justify-center gap-3 group">
                                            <TrendingUp size={18} className="text-red-500 group-hover:animate-pulse" /> Inject Currency
                                        </button>
                                        <button
                                            onClick={() => {
                                                const targetUser = window.prompt('Enter target username:') || 'flashlon';
                                                const levelStr = window.prompt('Enter new level (leave blank to skip):');
                                                const xpStr = window.prompt('Enter new xp (leave blank to skip):');
                                                const payload: any = { targetUser };
                                                if (levelStr) payload.level = parseInt(levelStr, 10);
                                                if (xpStr) payload.xp = parseInt(xpStr, 10);
                                                import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('set_user_stats', payload));
                                            }}
                                            className="w-full bg-red-900/20 border border-red-500/30 text-red-400 font-black py-4 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:text-white transition-all text-xs uppercase flex items-center justify-center gap-3 group">
                                            <TrendingUp size={18} className="text-red-500 group-hover:animate-pulse" /> Set Target Stats
                                        </button>
                                        <button
                                            onClick={() => {
                                                const targetUser = window.prompt('Enter target username:') || 'flashlon';
                                                if (targetUser) {
                                                    import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('unlock_all_titles', { targetUser }));
                                                }
                                            }}
                                            className="w-full bg-red-900/20 border border-red-500/30 text-red-400 font-black py-4 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:text-white transition-all text-xs uppercase flex items-center justify-center gap-3 group">
                                            <Shield size={18} className="text-red-500 group-hover:animate-pulse" /> Unlock All Titles
                                        </button>
                                        <button
                                            onClick={() => {
                                                const targetUser = window.prompt('Enter target username:') || 'flashlon';
                                                if (targetUser) {
                                                    import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('max_limits', { targetUser }));
                                                }
                                            }}
                                            className="w-full bg-red-900/20 border border-red-500/30 text-red-400 font-black py-4 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:text-white transition-all text-xs uppercase flex items-center justify-center gap-3 group">
                                            <Cpu size={18} className="text-red-500 group-hover:animate-pulse" /> Max Out Limits / UI
                                        </button>
                                        <button
                                            onClick={() => {
                                                const targetUser = window.prompt('Enter target username:') || 'flashlon';
                                                if (targetUser) {
                                                    import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('unlock_all_values', { targetUser }));
                                                }
                                            }}
                                            className="w-full bg-red-900/20 border border-red-500/30 text-red-400 font-black py-4 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:text-white transition-all text-xs uppercase flex items-center justify-center gap-3 group">
                                            <DollarSign size={18} className="text-red-500 group-hover:animate-pulse" /> Unlock All VALUES (Max Everything)
                                        </button>
                                        <button
                                            onClick={() => {
                                                const targetRoom = window.prompt('Enter room ID to nuke enemies in:');
                                                if (targetRoom) {
                                                    import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('nuke_enemies', { roomId: targetRoom }));
                                                }
                                            }}
                                            className="w-full bg-red-900/20 border border-red-500/30 text-red-400 font-black py-4 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:text-white transition-all text-xs uppercase flex items-center justify-center gap-3 group">
                                            <Swords size={18} className="text-red-500 group-hover:animate-pulse" /> Nuke All Enemies
                                        </button>
                                        <button
                                            onClick={() => {
                                                const targetRoom = window.prompt('Enter room ID to spawn boss in:');
                                                if (targetRoom) {
                                                    import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('spawn_boss', { roomId: targetRoom }));
                                                }
                                            }}
                                            className="w-full bg-red-900/20 border border-red-500/30 text-red-400 font-black py-4 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:text-white transition-all text-xs uppercase flex items-center justify-center gap-3 group">
                                            <Target size={18} className="text-red-500 group-hover:animate-pulse" /> Force Spawn Boss
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <SavedCodePanel
                                    savedCodes={savedCodes}
                                    onLoad={(code) => onLoadCode?.(code)}
                                    onDelete={(codeId) => onDeleteCode?.(codeId)}
                                    onRename={(codeId, newName) => onRenameCode?.(codeId, newName)}
                                    isLoading={loadingSavedCodes}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Section & Leaderboard */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-8 shrink-0 border-t border-cyber-muted/10 pt-6">
                    <div className="flex-1 w-full lg:w-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy size={18} className="text-cyber-accent" />
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Global Top Seekers</h2>
                        </div>
                        <div className="bg-black/40 border border-cyber-accent/10 rounded-2xl p-4 overflow-x-auto">
                            <div className="flex gap-6">
                                {leaderboard.length > 0 ? leaderboard.map((player: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 shrink-0 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                        <span className="text-cyber-accent font-black text-xs">#{i + 1}</span>
                                        <div>
                                            <div className="text-[10px] font-black text-white uppercase">{player.username}</div>
                                            <div className="text-[8px] font-bold text-cyber-muted uppercase">Level {player.level}</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-[10px] font-bold text-cyber-muted uppercase tracking-widest py-2">
                                        Establishing Satellite Uplink... 📡
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-4 min-w-[200px]">
                        <div className="flex gap-8">
                            <div className="flex items-center gap-2 opacity-50">
                                <Users2 size={14} className="text-cyber-muted" />
                                <span className="text-[10px] font-bold text-cyber-muted uppercase tracking-widest">{leaderboard.length * 7 + 12} Nodes Active</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-50">
                                <Shield size={14} className="text-cyber-muted" />
                                <span className="text-[10px] font-bold text-cyber-muted uppercase tracking-widest">Neural Link Secure</span>
                            </div>
                        </div>
                        {isLoggedIn && (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-accent/20 to-blue-500/20 border border-white/10 flex items-center justify-center font-black text-white text-[10px] uppercase">
                                    {username?.slice(0, 2)}
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-white uppercase leading-none">{username}</div>
                                    <div className="text-[8px] font-bold text-cyber-accent uppercase tracking-tighter">Status: Active</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
