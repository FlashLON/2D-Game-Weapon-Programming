import React, { useState, useEffect } from 'react';
import { Target, Users2, Shield, Cpu, Globe, Link as LinkIcon, Settings, BookOpen, Lock, Play, Wrench, DollarSign, TrendingUp, Info, CheckCircle2, Trophy, Swords, Zap, Clock, UserPlus, X, Volume2, Eye, Monitor, Copy } from 'lucide-react';
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
    onEquipAura?: (auraId: string) => void;
    onSignup?: (username: string, password?: string) => void;
    leaderboard?: any[];
    savedCodes?: SavedCode[];
    onLoadCode?: (code: SavedCode) => void;
    onDeleteCode?: (codeId: string) => void;
    onRenameCode?: (codeId: string, newName: string) => void;
    loadingSavedCodes?: boolean;
    onEquipTitle?: (titleId: string | null) => void;
    queueStatus?: any;
    partyData?: any;
    onQueue2v2?: () => void;
    onLeaveQueue?: () => void;
    onCreateParty?: () => void;
    onJoinParty?: (partyId: string) => void;
    onLeaveParty?: () => void;
    onSetCoopDifficulty?: (diff: string) => void;
    gameSettings?: { screenshake: boolean; damageNumbers: boolean; showFps: boolean };
    onUpdateSettings?: (key: string, value: any) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
    onJoinRoom,
    onSpectate,
    onConnect,
    isConnected,
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
    onEquipTitle,
    onEquipAura,
    queueStatus,
    partyData,
    onQueue2v2,
    onLeaveQueue,
    onCreateParty,
    onJoinParty,
    onLeaveParty,
    onSetCoopDifficulty,
    gameSettings,
    onUpdateSettings
}) => {
    const [roomCode, setRoomCode] = useState('');
    const [loginName, setLoginName] = useState('');
    const [password, setPassword] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);

    const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
    const [createName, setCreateName] = useState('');
    const [isPublic] = useState(true);

    const [inventoryTab, setInventoryTab] = useState<'inventory' | 'saved-code' | 'titles' | 'admin'>('inventory');

    const [partyCodeInput, setPartyCodeInput] = useState('');
    const [coopDifficulty, setCoopDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
    const [searchTimer, setSearchTimer] = useState(0);
    const [copiedPartyId, setCopiedPartyId] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [adminSubTab, setAdminSubTab] = useState<'commands' | 'analytics'>('commands');
    const isQueued = queueStatus?.status === 'queued' || queueStatus?.status === 'already_queued';

    useEffect(() => {
        if (!isQueued) { setSearchTimer(0); return; }
        const id = setInterval(() => setSearchTimer(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [isQueued]);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomCode.trim()) onJoinRoom(roomCode.trim().toLowerCase());
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const id = createName.trim() || Math.random().toString(36).substr(2, 6);
        onJoinRoom(id.toLowerCase(), { public: isPublic });
    };

    const copyPartyId = () => {
        if (partyData?.partyId) {
            navigator.clipboard.writeText(partyData.partyId);
            setCopiedPartyId(true);
            setTimeout(() => setCopiedPartyId(false), 2000);
        }
    };

    return (
        <div className="flex-1 bg-[#060608] flex items-center justify-center p-4 lg:p-6 relative overflow-hidden">
            {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-accent/5 rounded-full blur-[160px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[160px]" />
                <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
                {/* Subtle grid overlay */}
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            </div>

            <div className="max-w-[1400px] w-full flex flex-col gap-5 z-10 h-full max-h-[95vh]">

                {/* ═══════════════════════════════════════════ */}
                {/* HEADER: Title + Login + Status */}
                {/* ═══════════════════════════════════════════ */}
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none">
                                CYBER<span className="text-cyber-accent">CORE</span>
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyber-accent/10 border border-cyber-accent/20 text-cyber-accent text-[8px] font-bold tracking-[0.2em] uppercase">
                                    <Cpu size={10} /> v2.5
                                </div>
                                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest ${isConnected ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                    {isConnected ? 'ONLINE' : 'OFFLINE'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Login or Profile */}
                    {!isLoggedIn ? (
                        <div className="flex items-center gap-2">
                            <input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="USERNAME"
                                className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-[10px] outline-none focus:border-cyber-accent font-mono uppercase w-28" />
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="PASSWORD"
                                className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-[10px] outline-none focus:border-cyber-accent font-mono uppercase w-28" />
                            <button onClick={() => onLogin?.(loginName, password)}
                                className="bg-cyber-accent text-black font-black px-4 py-2 rounded-lg hover:bg-emerald-400 transition-all text-[10px] uppercase">Login</button>
                            <button onClick={() => onSignup?.(loginName, password)}
                                className="bg-blue-500/20 text-blue-400 border border-blue-500/30 font-black px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-all text-[10px] uppercase">Sign Up</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            {userProfile && (
                                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-[10px] font-bold text-cyber-muted uppercase">LVL <span className="text-white text-xs">{userProfile.level}</span></div>
                                    <div className="w-px h-4 bg-white/10" />
                                    <div className="flex items-center gap-1 text-emerald-400">
                                        <DollarSign size={12} />
                                        <span className="text-xs font-black">{userProfile.money.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-accent/30 to-blue-500/30 border border-white/10 flex items-center justify-center font-black text-white text-[10px] uppercase">
                                    {username?.slice(0, 2)}
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-white uppercase leading-none">{username}</div>
                                    <div className="text-[8px] font-bold text-cyber-accent uppercase">Active</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════ */}
                {/* PARTY BAR — Global, mode-independent */}
                {/* ═══════════════════════════════════════════ */}
                {isLoggedIn && isConnected && (
                    <div className="shrink-0 bg-black/40 border border-white/5 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                            <Users2 size={14} className="text-cyber-accent" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">Party</span>
                        </div>

                        {partyData ? (
                            <>
                                <div className="flex-1 flex items-center gap-2">
                                    {partyData.members?.map((m: string, i: number) => (
                                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyber-accent/10 border border-cyber-accent/20">
                                            <div className="w-2 h-2 bg-cyber-accent rounded-full animate-pulse" />
                                            <span className="text-[10px] font-bold text-white">{m}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={copyPartyId}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[9px] font-bold text-white/50 hover:text-white">
                                    <Copy size={10} />
                                    {copiedPartyId ? 'COPIED!' : partyData.partyId}
                                </button>
                                <button onClick={onLeaveParty}
                                    className="px-2.5 py-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all">
                                    <X size={14} />
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="flex-1 flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase tracking-wider">
                                    No party — invite friends to play together in any mode
                                </div>
                                <button onClick={onCreateParty}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/20 hover:bg-cyber-accent/20 transition-all text-[10px] font-black uppercase">
                                    <UserPlus size={12} /> Create Party
                                </button>
                                <div className="flex items-center gap-1.5">
                                    <input value={partyCodeInput} onChange={e => setPartyCodeInput(e.target.value)} placeholder="PARTY CODE"
                                        className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none font-mono w-28 focus:border-cyber-accent/50" />
                                    <button onClick={() => partyCodeInput.trim() && onJoinParty?.(partyCodeInput.trim())}
                                        disabled={!partyCodeInput.trim()}
                                        className="px-3 py-1.5 text-[10px] font-black bg-white/5 text-white/60 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all disabled:opacity-30">
                                        JOIN
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════ */}
                {/* MAIN CONTENT: 2-column layout */}
                {/* ═══════════════════════════════════════════ */}
                <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden min-h-0">

                    {/* ──── LEFT COLUMN: Game Modes ──── */}
                    <div className="flex-[3] flex flex-col gap-4 overflow-y-auto pr-1 scrollbar-thin">

                        {/* Section Title */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-widest">
                                <Target className="text-cyber-accent" size={18} /> Game Modes
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={() => setShowTutorial(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-[10px] font-bold text-white/50 hover:text-white">
                                    <BookOpen size={12} /> Guide
                                </button>
                                <button onClick={() => setShowSettings(!showSettings)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold ${showSettings ? 'bg-cyber-accent/10 text-cyber-accent border-cyber-accent/30' : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:bg-white/10'}`}>
                                    <Settings size={12} /> Settings
                                </button>
                            </div>
                        </div>

                        {/* Settings Panel (collapsible) */}
                        {showSettings && (
                            <div className="bg-black/50 border border-white/5 rounded-2xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[9px] text-white/30 uppercase font-black mb-2 tracking-widest">Game Settings</div>
                                        <div className="space-y-1.5">
                                            {[
                                                { key: 'screenshake', label: 'Screen Shake', icon: <Monitor size={12} />, val: gameSettings?.screenshake ?? true },
                                                { key: 'damageNumbers', label: 'Damage Numbers', icon: <Eye size={12} />, val: gameSettings?.damageNumbers ?? true },
                                                { key: 'showFps', label: 'FPS Counter', icon: <Volume2 size={12} />, val: gameSettings?.showFps ?? false },
                                            ].map(s => (
                                                <div key={s.key} className="flex items-center justify-between p-2 rounded-lg bg-white/3 hover:bg-white/5 transition-all">
                                                    <div className="flex items-center gap-2 text-[10px] text-white/60">{s.icon} {s.label}</div>
                                                    <button onClick={() => onUpdateSettings?.(s.key, !s.val)}
                                                        className={`w-9 h-[18px] rounded-full relative transition-all ${s.val ? 'bg-cyber-accent' : 'bg-white/15'}`}>
                                                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[2px] transition-all ${s.val ? 'left-[18px]' : 'left-[2px]'}`} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] text-white/30 uppercase font-black mb-2 tracking-widest">Network</div>
                                        {!isConnected && (
                                            <button onClick={onConnect}
                                                className="mt-2 w-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-black py-2 rounded-lg hover:bg-blue-500/30 transition-all text-[10px] uppercase flex items-center justify-center gap-2">
                                                <LinkIcon size={12} /> CONNECT TO SERVER
                                            </button>
                                        )}
                                        {isConnected && (
                                            <div className="text-[10px] text-cyber-accent text-center bg-cyber-accent/10 border border-cyber-accent/20 rounded-lg p-2 uppercase tracking-widest font-bold">
                                                Connected
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ──── Game Mode Cards Grid ──── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* ── SANDBOX ── */}
                            <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-white/5 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-cyber-accent/30 transition-all">
                                <div className="absolute top-2 right-2 text-white/[0.03] group-hover:text-cyber-accent/[0.06] transition-colors">
                                    <Cpu size={100} />
                                </div>
                                <div className="z-10 flex-1">
                                    <h3 className="text-lg font-black text-white mb-1">SANDBOX</h3>
                                    <p className="text-[11px] text-white/30 mb-4 leading-relaxed">Test Python scripts offline with AI targets.</p>
                                    <div className="flex gap-3 mb-4">
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400/60 uppercase">
                                            <CheckCircle2 size={10} /> Offline
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400/60 uppercase">
                                            <CheckCircle2 size={10} /> No Limits
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => onJoinRoom('offline')}
                                    className="w-full bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/20 font-black py-3 rounded-xl hover:bg-cyber-accent hover:text-black transition-all flex items-center justify-center gap-2 text-xs z-10">
                                    <Play size={14} fill="currentColor" /> ENTER SANDBOX
                                </button>
                            </div>

                            {/* ── CO-OP SURVIVAL ── */}
                            <div className="bg-gradient-to-br from-purple-500/5 to-transparent border border-white/5 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-purple-500/30 transition-all">
                                <div className="absolute top-2 right-2 text-white/[0.03] group-hover:text-purple-500/[0.06] transition-colors">
                                    <Swords size={100} />
                                </div>
                                <div className="z-10 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-black text-white">CO-OP</h3>
                                        <span className="bg-purple-500/20 text-purple-400 text-[7px] font-black px-1.5 py-0.5 rounded border border-purple-500/30">SURVIVAL</span>
                                    </div>
                                    <p className="text-[11px] text-white/30 mb-3 leading-relaxed">Team up and survive endless waves and bosses.</p>

                                    {/* Difficulty */}
                                    <div className="flex gap-0.5 mb-3 p-0.5 bg-black/30 rounded-lg">
                                        {(['easy', 'normal', 'hard'] as const).map(diff => (
                                            <button key={diff}
                                                onClick={() => { setCoopDifficulty(diff); onSetCoopDifficulty?.(diff); }}
                                                className={`flex-1 py-1 text-[8px] font-black uppercase rounded transition-all ${coopDifficulty === diff
                                                    ? diff === 'easy' ? 'bg-emerald-500/15 text-emerald-400'
                                                        : diff === 'normal' ? 'bg-yellow-500/15 text-yellow-400'
                                                            : 'bg-red-500/15 text-red-400'
                                                    : 'text-white/20 hover:text-white/40'
                                                    }`}>
                                                {diff === 'easy' ? '😊' : diff === 'normal' ? '⚔️' : '💀'} {diff}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex gap-3 mb-3">
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-purple-400/50 uppercase">
                                            <Users2 size={10} /> Team Play
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-purple-400/50 uppercase">
                                            <TrendingUp size={10} /> {coopDifficulty === 'easy' ? '0.5x' : coopDifficulty === 'hard' ? '2x' : '1x'}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5 z-10">
                                    <button onClick={() => onJoinRoom('coop-main', { mode: 'coop', public: true })} disabled={!isConnected}
                                        className={`w-full py-2.5 rounded-xl font-black transition-all flex items-center justify-center gap-2 text-[10px] ${isConnected ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 hover:text-white' : 'bg-white/3 text-white/20 cursor-not-allowed'}`}>
                                        <Globe size={12} /> PUBLIC SERVER
                                    </button>
                                    <button onClick={() => onJoinRoom(`coop-private-${Math.floor(Math.random() * 10000)}`, { mode: 'coop', public: false })} disabled={!isConnected}
                                        className={`w-full py-2.5 rounded-xl font-black transition-all flex items-center justify-center gap-2 text-[10px] ${isConnected ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30' : 'bg-white/3 text-white/20 cursor-not-allowed'}`}>
                                        <Lock size={12} /> PRIVATE SQUAD
                                    </button>
                                </div>
                            </div>

                            {/* ── 2v2 ARENA ── */}
                            <div className="bg-gradient-to-br from-red-500/5 via-transparent to-blue-500/5 border border-white/5 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-red-500/30 transition-all">
                                <div className="absolute top-2 right-2 text-white/[0.03] group-hover:text-red-500/[0.06] transition-colors">
                                    <Zap size={100} />
                                </div>
                                <div className="z-10 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-black text-white">2v2 ARENA</h3>
                                        <span className="bg-gradient-to-r from-red-500/20 to-blue-500/20 text-white text-[7px] font-black px-1.5 py-0.5 rounded border border-white/10">NEW</span>
                                    </div>
                                    <p className="text-[11px] text-white/30 mb-3 leading-relaxed">Elimination duel — no respawns.</p>

                                    {/* Teams Preview */}
                                    <div className="flex gap-2 mb-3">
                                        <div className="flex-1 bg-red-500/5 border border-red-500/10 rounded-lg py-1.5 text-center">
                                            <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mb-0.5" />
                                            <div className="text-[7px] font-black text-red-400/60 uppercase">RED</div>
                                        </div>
                                        <div className="flex items-center text-white/15 text-[8px] font-black">VS</div>
                                        <div className="flex-1 bg-blue-500/5 border border-blue-500/10 rounded-lg py-1.5 text-center">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mb-0.5" />
                                            <div className="text-[7px] font-black text-blue-400/60 uppercase">BLUE</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mb-3">
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-red-400/40 uppercase">
                                            <CheckCircle2 size={9} /> No Respawn
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-blue-400/40 uppercase">
                                            <CheckCircle2 size={9} /> Ranked XP
                                        </div>
                                    </div>
                                </div>

                                {/* Queue Button */}
                                {isQueued ? (
                                    <div className="space-y-1.5 z-10">
                                        <div className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500/10 to-blue-500/10 border border-white/5 flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Searching...</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[9px] text-white/30">
                                                <span><Clock size={9} className="inline mr-0.5" />{searchTimer}s</span>
                                                <span>{queueStatus?.total || '?'} in queue</span>
                                            </div>
                                        </div>
                                        <button onClick={onLeaveQueue}
                                            className="w-full py-1.5 rounded-lg text-[9px] font-black text-red-400/60 border border-red-500/15 hover:bg-red-500/10 hover:text-red-400 transition-all">
                                            CANCEL
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={onQueue2v2} disabled={!isConnected || !isLoggedIn}
                                        className={`w-full py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 text-xs z-10 ${isConnected && isLoggedIn
                                            ? 'bg-gradient-to-r from-red-500/20 to-blue-500/20 text-white border border-white/10 hover:from-red-500/30 hover:to-blue-500/30 hover:border-white/20 shadow-lg shadow-red-500/5'
                                            : 'bg-white/3 text-white/20 cursor-not-allowed'
                                            }`}>
                                        <Zap size={14} /> FIND MATCH
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ──── Custom Room Section ──── */}
                        <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Globe size={14} className="text-blue-400/60" />
                                    <span className="text-xs font-black text-white uppercase tracking-wider">Custom Room</span>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                </div>
                                {!isConnected && (
                                    <button onClick={onConnect}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all text-[10px] font-black uppercase">
                                        <LinkIcon size={10} /> Connect
                                    </button>
                                )}
                            </div>

                            {isConnected && (
                                <div className="flex gap-3">
                                    <div className="flex p-0.5 bg-white/5 rounded-lg shrink-0">
                                        <button onClick={() => setActiveTab('join')}
                                            className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded transition-all ${activeTab === 'join' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
                                            Join
                                        </button>
                                        <button onClick={() => setActiveTab('create')}
                                            className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded transition-all ${activeTab === 'create' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
                                            Create
                                        </button>
                                    </div>

                                    {activeTab === 'join' ? (
                                        <form onSubmit={handleJoin} className="flex-1 flex gap-2">
                                            <input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="ROOM CODE"
                                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-[10px] outline-none focus:border-blue-400 font-mono" />
                                            <button type="submit" className="bg-blue-500/20 text-blue-400 border border-blue-500/30 font-black px-4 rounded-lg hover:bg-blue-500/30 transition-all text-[10px]">JOIN</button>
                                            <button type="button" onClick={() => roomCode.trim() && onSpectate(roomCode.trim().toLowerCase())}
                                                className="bg-purple-500/10 text-purple-400 border border-purple-500/20 font-black px-3 rounded-lg hover:bg-purple-500/20 transition-all text-[10px]">👁</button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleCreate} className="flex-1 flex gap-2">
                                            <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="NAME (OPTIONAL)"
                                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-[10px] outline-none focus:border-blue-400 font-mono" />
                                            <button type="submit" className="bg-blue-500/20 text-blue-400 border border-blue-500/30 font-black px-4 rounded-lg hover:bg-blue-500/30 transition-all text-[10px]">CREATE</button>
                                            <button type="button" onClick={() => { const id = createName.trim() || Math.random().toString(36).substr(2, 6); onSpectate(id.toLowerCase()); }}
                                                className="bg-purple-500/10 text-purple-400 border border-purple-500/20 font-black px-3 rounded-lg hover:bg-purple-500/20 transition-all text-[10px]">👁</button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ──── Leaderboard ──── */}
                        <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Trophy size={14} className="text-yellow-500/60" />
                                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Global Leaderboard</span>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
                                {leaderboard.length > 0 ? leaderboard.map((player: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2.5 shrink-0 px-3 py-2 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all">
                                        <span className={`text-xs font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-white/30'}`}>#{i + 1}</span>
                                        <div>
                                            <div className="text-[10px] font-black text-white uppercase">{player.username}</div>
                                            <div className="text-[8px] font-bold text-white/20 uppercase">Lvl {player.level}</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest py-1">
                                        Establishing Satellite Uplink... 📡
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ──── RIGHT COLUMN: Inventory & Upgrades ──── */}
                    <div className="flex-[2] bg-black/30 border border-white/5 rounded-2xl flex flex-col overflow-hidden backdrop-blur-sm">
                        <div className="p-5 pb-3 border-b border-white/5 flex justify-between items-center shrink-0">
                            <div className="flex-1">
                                <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight">
                                    <Wrench className="text-cyber-accent" size={16} />
                                    {inventoryTab === 'inventory' ? 'Inventory' : inventoryTab === 'titles' ? 'Titles' : inventoryTab === 'admin' ? 'Admin' : 'Saved Code'}
                                </h2>
                                <div className="text-[9px] text-white/20 uppercase font-bold tracking-widest">
                                    {inventoryTab === 'inventory' ? 'Upgrades & Equipment' : inventoryTab === 'titles' ? 'Identity Matrix' : inventoryTab === 'admin' ? 'System Override' : 'Your Scripts'}
                                </div>
                            </div>
                        </div>

                        {/* Tab Buttons */}
                        {isLoggedIn && (
                            <div className="px-4 py-2 border-b border-white/5 flex gap-1">
                                {(['inventory', 'saved-code', 'titles'] as const).map(tab => (
                                    <button key={tab} onClick={() => setInventoryTab(tab)}
                                        className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all ${inventoryTab === tab ? 'bg-white/8 text-white' : 'text-white/25 hover:text-white/50'}`}>
                                        {tab === 'saved-code' ? 'Code' : tab}
                                    </button>
                                ))}
                                {username?.toLowerCase() === 'flashlon' && (
                                    <button onClick={() => setInventoryTab('admin')}
                                        className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all ${inventoryTab === 'admin' ? 'bg-red-500/15 text-red-400' : 'text-red-500/30 hover:text-red-400/60'}`}>
                                        Admin
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                            {inventoryTab === 'inventory' ? (
                                <>
                                    {!isLoggedIn ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30">
                                            <Lock size={40} className="mb-3 text-white/30" />
                                            <div className="text-xs font-black text-white uppercase mb-1">Systems Locked</div>
                                            <div className="text-[10px] text-white/30 uppercase">Login to access upgrades</div>
                                        </div>
                                    ) : userProfile ? (
                                        <>
                                            {/* Aura Status */}
                                            {userProfile.aura_type && (
                                                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-3 mb-2 relative overflow-hidden">
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
                                                            {React.createElement(ATTRIBUTES[userProfile.aura_type]?.icon || Shield, { size: 24, className: "text-purple-400" })}
                                                        </div>
                                                        <div>
                                                            <div className="text-[8px] font-black text-purple-400/60 uppercase tracking-[0.2em]">Active Aura</div>
                                                            <div className="text-sm font-black text-white uppercase">{ATTRIBUTES[userProfile.aura_type]?.name}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-3 pb-2">
                                                {Object.values(ATTRIBUTES).map((attr) => {
                                                    const isUnlocked = attr.isBase || userProfile.unlocks.includes(attr.id);
                                                    const currentLimit = userProfile.limits[attr.id] ?? attr.startLimit;
                                                    const isInverted = attr.upgradeStep < 0;
                                                    const isMaxed = isInverted ? currentLimit <= attr.maxLimit : currentLimit >= attr.maxLimit;
                                                    const upgradeCost = getUpgradeCost(attr.id, currentLimit);
                                                    const canAfford = userProfile.money >= upgradeCost;
                                                    const Icon = attr.icon;

                                                    if (!isUnlocked) return (
                                                        <div key={attr.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 opacity-40 flex items-center gap-3">
                                                            <div className="bg-white/5 p-2 rounded-lg"><Icon size={18} className="text-white/20" /></div>
                                                            <div className="flex-1">
                                                                <div className="text-[10px] font-bold text-white/30 uppercase">{attr.name}</div>
                                                                <div className="text-[8px] text-white/15 uppercase">Locked</div>
                                                            </div>
                                                            <Lock size={12} className="text-white/15" />
                                                        </div>
                                                    );

                                                    return (
                                                        <div key={attr.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 hover:border-cyber-accent/20 transition-all group">
                                                            <div className="flex items-center gap-2.5 mb-2">
                                                                <div className="bg-cyber-accent/8 p-2 rounded-lg text-cyber-accent group-hover:bg-cyber-accent/15 transition-all">
                                                                    <Icon size={16} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-center">
                                                                        <h3 className="text-[11px] font-black text-white uppercase tracking-tight">{attr.name}</h3>
                                                                        <span className="text-[10px] font-black text-white/60">{currentLimit}</span>
                                                                    </div>
                                                                    <div className="text-[8px] text-white/20 uppercase truncate">{attr.description}</div>
                                                                </div>
                                                            </div>

                                                            <div className="w-full bg-white/5 rounded-full h-1 mb-2.5 overflow-hidden">
                                                                <div className="bg-cyber-accent/60 h-full rounded-full transition-all duration-500"
                                                                    style={{ width: `${isInverted ? ((attr.startLimit - currentLimit) / (attr.startLimit - attr.maxLimit)) * 100 : (currentLimit / attr.maxLimit) * 100}%` }} />
                                                            </div>

                                                            {!isMaxed ? (
                                                                <button onClick={(e) => { e.stopPropagation(); if (onUpgrade) onUpgrade(attr.id); }}
                                                                    disabled={!canAfford}
                                                                    className={`w-full py-2 rounded-lg font-black text-[9px] uppercase flex items-center justify-center gap-1.5 transition-all ${canAfford ? 'bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/20 hover:bg-cyber-accent hover:text-black active:scale-[0.98]' : 'bg-white/3 text-white/15 cursor-not-allowed'}`}>
                                                                    <TrendingUp size={11} />
                                                                    {attr.isAura ? 'Upgrade & Equip' : 'Upgrade'}
                                                                    <span className="ml-auto opacity-60">${upgradeCost.toLocaleString()}</span>
                                                                </button>
                                                            ) : attr.isAura ? (
                                                                <button onClick={(e) => { e.stopPropagation(); if (onEquipAura) onEquipAura(attr.id); }}
                                                                    className={`w-full py-2 rounded-lg font-black text-[9px] uppercase text-center flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${userProfile.aura_type === attr.id
                                                                        ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-300'
                                                                        : 'bg-purple-500/8 border border-purple-500/15 text-purple-400/60 hover:bg-purple-500/15'
                                                                        }`}>
                                                                    {userProfile.aura_type === attr.id ? (<><CheckCircle2 size={11} /> Equipped</>) : (<><Swords size={11} /> Equip Aura</>)}
                                                                </button>
                                                            ) : (
                                                                <div className="w-full py-2 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-400/40 font-black text-[9px] uppercase text-center flex items-center justify-center gap-1.5">
                                                                    <CheckCircle2 size={11} /> Maxed
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 flex items-start gap-2">
                                                <Info className="text-blue-400/40 shrink-0" size={12} />
                                                <p className="text-[8px] text-blue-200/30 uppercase tracking-wider leading-relaxed font-bold">
                                                    Level up to receive <span className="text-cyber-accent/60">Draft Cards</span>. Use money to increase limits.
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
                                <div className="flex flex-col items-center justify-start py-4 px-3 animate-in fade-in zoom-in duration-300 relative w-full min-h-full overflow-y-auto max-h-[500px]">
                                    <div className="absolute inset-0 bg-red-500/3 pointer-events-none rounded-xl" />
                                    <Shield size={36} className="text-red-500 mb-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)] z-10" />
                                    <h3 className="text-xl font-black text-white uppercase tracking-[0.15em] mb-1 z-10">Admin Override</h3>
                                    <p className="text-red-300/50 text-[9px] uppercase font-bold tracking-widest mb-3 z-10">Full access granted</p>

                                    {/* Sub-tabs: Commands | Analytics */}
                                    <div className="flex gap-1 mb-4 z-10 w-full max-w-sm">
                                        <button onClick={() => setAdminSubTab('commands')}
                                            className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${adminSubTab === 'commands' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-white/30 hover:text-white/50'}`}>
                                            ⚡ Commands
                                        </button>
                                        <button onClick={() => { setAdminSubTab('analytics'); import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('get_analytics', {})); }}
                                            className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${adminSubTab === 'analytics' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-white/30 hover:text-white/50'}`}>
                                            📊 Analytics
                                        </button>
                                    </div>

                                    {adminSubTab === 'commands' ? (
                                        <div className="w-full max-w-sm space-y-2 z-10">
                                            <button onClick={() => { const msg = window.prompt('Enter message:'); if (msg) import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('broadcast', { message: msg })); }}
                                                className="w-full bg-red-900/15 border border-red-500/20 text-red-400/70 font-black py-3 rounded-xl hover:bg-red-500/15 hover:text-red-300 transition-all text-[10px] uppercase flex items-center justify-center gap-2">
                                                <Globe size={14} /> Broadcast Message
                                            </button>
                                            <button onClick={() => { if (window.confirm('Kick all?')) import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('kick_all')); }}
                                                className="w-full bg-red-900/15 border border-red-500/20 text-red-400/70 font-black py-3 rounded-xl hover:bg-red-500/15 hover:text-red-300 transition-all text-[10px] uppercase flex items-center justify-center gap-2">
                                                <Users2 size={14} /> Kick All Players
                                            </button>
                                            <div className="flex gap-2">
                                                <button onClick={() => { if (window.confirm('Heal all?')) import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('global_heal')); }}
                                                    className="flex-1 bg-emerald-900/15 border border-emerald-500/20 text-emerald-400/70 font-black py-3 rounded-xl hover:bg-emerald-500/15 hover:text-emerald-300 transition-all text-[10px] uppercase flex items-center justify-center gap-2">
                                                    <Target size={14} /> Global Heal
                                                </button>
                                                <button onClick={() => { const u = window.prompt('Username:') || 'flashlon'; const a = window.prompt('Amount:'); if (a) { const n = parseInt(a, 10); if (!isNaN(n)) import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('inject_currency', { targetUser: u, amount: n })); } }}
                                                    className="flex-1 bg-red-900/15 border border-red-500/20 text-red-400/70 font-black py-3 rounded-xl hover:bg-red-500/15 hover:text-red-300 transition-all text-[10px] uppercase flex items-center justify-center gap-2">
                                                    <DollarSign size={14} /> Inject $
                                                </button>
                                            </div>
                                            <button onClick={() => { const u = window.prompt('Username:') || 'flashlon'; const l = window.prompt('Level:'); const x = window.prompt('XP:'); const p: any = { targetUser: u }; if (l) p.level = parseInt(l, 10); if (x) p.xp = parseInt(x, 10); import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('set_user_stats', p)); }}
                                                className="w-full bg-red-900/15 border border-red-500/20 text-red-400/70 font-black py-3 rounded-xl hover:bg-red-500/15 hover:text-red-300 transition-all text-[10px] uppercase flex items-center justify-center gap-2">
                                                <TrendingUp size={14} /> Set Stats
                                            </button>
                                            <div className="flex gap-2">
                                                <button onClick={() => { const u = window.prompt('Username:') || 'flashlon'; if (u) import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('unlock_all_titles', { targetUser: u })); }}
                                                    className="flex-1 bg-purple-900/15 border border-purple-500/20 text-purple-400/60 font-black py-3 rounded-xl hover:bg-purple-500/15 hover:text-purple-300 transition-all text-[9px] uppercase flex items-center justify-center gap-1">
                                                    <Shield size={12} /> All Titles
                                                </button>
                                                <button onClick={() => { const u = window.prompt('Username:') || 'flashlon'; if (u) import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('max_limits', { targetUser: u })); }}
                                                    className="flex-1 bg-purple-900/15 border border-purple-500/20 text-purple-400/60 font-black py-3 rounded-xl hover:bg-purple-500/15 hover:text-purple-300 transition-all text-[9px] uppercase flex items-center justify-center gap-1">
                                                    <Cpu size={12} /> Max Limits
                                                </button>
                                            </div>
                                            <button onClick={() => { const u = window.prompt('Username:') || 'flashlon'; if (u) import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('unlock_all_values', { targetUser: u })); }}
                                                className="w-full bg-gradient-to-r from-red-600/20 to-purple-600/20 border border-red-500/30 text-white/70 font-black py-3 rounded-xl hover:from-red-600/30 hover:to-purple-600/30 transition-all text-[10px] uppercase flex items-center justify-center gap-2">
                                                <Zap size={14} /> Unlock Everything
                                            </button>
                                            <div className="flex gap-2">
                                                <button onClick={() => { const r = window.prompt('Room ID (blank=ALL):'); import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('nuke_enemies', { roomId: r })); }}
                                                    className="flex-1 bg-red-900/15 border border-red-500/20 text-red-400/60 font-black py-3 rounded-xl hover:bg-red-500/15 hover:text-red-300 transition-all text-[9px] uppercase flex items-center justify-center gap-1">
                                                    <Swords size={12} /> Nuke
                                                </button>
                                                <button onClick={() => { const r = window.prompt('Room ID:'); if (r) import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('spawn_boss', { roomId: r })); }}
                                                    className="flex-1 bg-red-900/15 border border-red-500/20 text-red-400/60 font-black py-3 rounded-xl hover:bg-red-500/15 hover:text-red-300 transition-all text-[9px] uppercase flex items-center justify-center gap-1">
                                                    <Target size={12} /> Boss
                                                </button>
                                            </div>
                                            <button onClick={() => { const u = window.prompt('Username to wipe:'); if (u && window.confirm(`DELETE ALL progress for ${u}?`)) import('../utils/NetworkManager').then(m => m.networkManager.adminCommand('wipe_account', { targetUser: u })); }}
                                                className="w-full bg-red-900/30 border border-red-500/50 text-red-200/60 font-black py-2.5 rounded-xl hover:bg-red-600/40 hover:text-white transition-all text-[9px] uppercase mt-2">
                                                ⚠️ Wipe Account ⚠️
                                            </button>
                                        </div>
                                    ) : (
                                        /* Analytics Dashboard */
                                        <div className="w-full max-w-sm space-y-3 z-10">
                                            <button onClick={() => import('../utils/NetworkManager').then(m => { m.networkManager.adminCommand('get_analytics', {}); m.networkManager.setOnAnalyticsData((data: any) => setAnalyticsData(data)); })}
                                                className="w-full bg-cyan-900/20 border border-cyan-500/20 text-cyan-300 font-black py-2 rounded-lg text-[9px] uppercase hover:bg-cyan-500/20 transition-all">
                                                🔄 Refresh Analytics
                                            </button>
                                            {analyticsData ? (
                                                <>
                                                    {/* Live Stats */}
                                                    <div className="bg-black/40 border border-cyan-500/10 rounded-xl p-3">
                                                        <div className="text-[8px] font-black text-cyan-400/60 uppercase tracking-widest mb-2">📡 Live</div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="text-center">
                                                                <div className="text-lg font-black text-emerald-400">{analyticsData.live?.onlineNow || 0}</div>
                                                                <div className="text-[7px] text-white/30 uppercase">Online</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-lg font-black text-blue-400">{analyticsData.live?.activeRooms || 0}</div>
                                                                <div className="text-[7px] text-white/30 uppercase">Rooms</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-lg font-black text-yellow-400">{analyticsData.live?.queueSize || 0}</div>
                                                                <div className="text-[7px] text-white/30 uppercase">In Queue</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Today Stats */}
                                                    <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                                                        <div className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-2">📅 Today ({analyticsData.today?.date})</div>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                                            {[
                                                                ['DAU', analyticsData.today?.dau || 0, 'text-cyan-400'],
                                                                ['Sessions', analyticsData.today?.sessions || 0, 'text-blue-400'],
                                                                ['Kills', analyticsData.today?.kills || 0, 'text-red-400'],
                                                                ['Deaths', analyticsData.today?.deaths || 0, 'text-orange-400'],
                                                                ['Matches', analyticsData.today?.matchesPlayed || 0, 'text-purple-400'],
                                                                ['Avg Play', `${analyticsData.today?.avgPlaytimeMin || 0}m`, 'text-emerald-400'],
                                                                ['Peak Online', analyticsData.today?.peakConcurrent || 0, 'text-yellow-400'],
                                                                ['Signups', analyticsData.today?.registrations || 0, 'text-pink-400'],
                                                            ].map(([label, val, color], i) => (
                                                                <div key={i} className="flex justify-between items-center">
                                                                    <span className="text-[8px] text-white/30">{label}</span>
                                                                    <span className={`text-[10px] font-black ${color}`}>{val}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Mode Popularity */}
                                                    <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                                                        <div className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-2">🎮 Mode Popularity (Today)</div>
                                                        <div className="space-y-1.5">
                                                            {Object.entries(analyticsData.today?.modes || {}).map(([mode, count]: [string, any]) => {
                                                                const total = Object.values(analyticsData.today?.modes || {}).reduce((a: number, b: any) => a + (b as number), 0) as number;
                                                                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                                                const colors: Record<string, string> = { sandbox: '#00ff9f', coop: '#4488ff', '2v2': '#ff4444', custom: '#ff9f00' };
                                                                return (
                                                                    <div key={mode}>
                                                                        <div className="flex justify-between text-[8px] mb-0.5">
                                                                            <span className="text-white/50 uppercase">{mode}</span>
                                                                            <span className="text-white/30">{count} ({pct}%)</span>
                                                                        </div>
                                                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: colors[mode] || '#888' }} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Global Stats */}
                                                    <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                                                        <div className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-2">🌐 All-Time</div>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                                            {[
                                                                ['Total Players', analyticsData.global?.totalPlayers || 0, 'text-cyan-400'],
                                                                ['Total Sessions', analyticsData.global?.totalSessions || 0, 'text-blue-400'],
                                                                ['Total Kills', analyticsData.global?.totalKills || 0, 'text-red-400'],
                                                                ['Avg K/D', analyticsData.global?.avgKDRatio || 0, 'text-orange-400'],
                                                                ['Play Time', `${analyticsData.global?.totalPlayTimeHours || 0}h`, 'text-emerald-400'],
                                                                ['Total Matches', analyticsData.global?.totalMatchesPlayed || 0, 'text-purple-400'],
                                                                ['Peak Concurrent', analyticsData.global?.peakConcurrent || 0, 'text-yellow-400'],
                                                                ['Uptime', `${analyticsData.global?.serverUptimeHours || 0}h`, 'text-white/60'],
                                                            ].map(([label, val, color], i) => (
                                                                <div key={i} className="flex justify-between items-center">
                                                                    <span className="text-[8px] text-white/30">{label}</span>
                                                                    <span className={`text-[10px] font-black ${color}`}>{val}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* 7-Day Trend */}
                                                    <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                                                        <div className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-2">📈 7-Day DAU Trend</div>
                                                        <div className="flex items-end gap-1 h-12">
                                                            {(analyticsData.recentDays || []).map((day: any, i: number) => {
                                                                const maxDau = Math.max(1, ...analyticsData.recentDays.map((d: any) => d.dau || 0));
                                                                const height = Math.max(4, ((day.dau || 0) / maxDau) * 100);
                                                                return (
                                                                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                                                        <div className="text-[6px] text-cyan-400 font-bold">{day.dau || 0}</div>
                                                                        <div className="w-full bg-cyan-500/40 rounded-t" style={{ height: `${height}%` }} />
                                                                        <div className="text-[5px] text-white/20">{day.date.slice(5)}</div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-white/20 text-[9px] text-center py-6">Click Refresh to load analytics data</div>
                                            )}
                                        </div>
                                    )}
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
            </div>
        </div>
    );
};
