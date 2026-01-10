import React, { useState } from 'react';
import { Users, Plus, Target, Users2, Shield, Sword } from 'lucide-react';

interface LobbyProps {
    onJoinRoom: (roomId: string) => void;
    isConnected: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinRoom, isConnected }) => {
    const [roomCode, setRoomCode] = useState('');

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomCode.trim()) {
            onJoinRoom(roomCode.trim().toLowerCase());
        }
    };

    return (
        <div className="flex-1 bg-cyber-dark flex items-center justify-center p-8 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-accent rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 z-10">
                {/* Left Side: Branding & Info */}
                <div className="flex flex-col justify-center space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-5xl font-black tracking-tighter text-white">
                            SQUAD <span className="text-cyber-accent underline decoration-4 underline-offset-8">UP</span>
                        </h2>
                        <p className="text-cyber-muted text-lg max-w-sm">
                            Create a private party or join your friends in the arena. Team work makes the dream work.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-cyber-light/50 border border-cyber-muted p-4 rounded-xl flex items-center gap-3">
                            <Users2 className="text-cyber-accent" size={24} />
                            <div>
                                <div className="text-white font-bold text-sm">PvP Combat</div>
                                <div className="text-[10px] text-cyber-muted uppercase tracking-widest">Active Mode</div>
                            </div>
                        </div>
                        <div className="bg-cyber-light/50 border border-cyber-muted p-4 rounded-xl flex items-center gap-3">
                            <Shield className="text-blue-400" size={24} />
                            <div>
                                <div className="text-white font-bold text-sm">Private Party</div>
                                <div className="text-[10px] text-cyber-muted uppercase tracking-widest">Secure Rooms</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Party Controls */}
                <div className="bg-cyber-light border border-cyber-muted p-8 rounded-2xl shadow-2xl space-y-8 backdrop-blur-sm">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Users size={20} className="text-cyber-accent" />
                            Party Settings
                        </h3>

                        {!isConnected && (
                            <div className="bg-cyber-danger/10 border border-cyber-danger/30 p-3 rounded text-cyber-danger text-xs text-center font-medium">
                                Please connect to the server first using the top right menu.
                            </div>
                        )}

                        <form onSubmit={handleJoin} className="space-y-4">
                            <div>
                                <label className="text-xs text-cyber-muted block mb-2 uppercase tracking-widest font-bold">
                                    Party Code / Friend ID
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value)}
                                        placeholder="E.g. ALYC-2342"
                                        disabled={!isConnected}
                                        className="w-full bg-black/40 border-2 border-cyber-muted rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-cyber-accent outline-none transition-all font-mono tracking-widest uppercase disabled:opacity-50"
                                    />
                                    <Plus className="absolute right-4 top-1/2 -translate-y-1/2 text-cyber-muted" size={18} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="submit"
                                    disabled={!isConnected || !roomCode}
                                    className="flex items-center justify-center gap-2 bg-cyber-accent text-black font-black py-4 rounded-xl hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                                >
                                    <Sword size={20} />
                                    JOIN ROOM
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onJoinRoom('global')}
                                    disabled={!isConnected}
                                    className="flex items-center justify-center gap-2 bg-cyber-muted/30 border-2 border-cyber-muted text-white font-black py-4 rounded-xl hover:bg-cyber-muted transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Target size={20} />
                                    PUBLIC
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="pt-6 border-t border-cyber-muted">
                        <div className="text-[10px] text-cyber-muted uppercase tracking-widest mb-4 font-bold">How it works</div>
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-xs text-gray-400">
                                <span className="w-5 h-5 rounded-full bg-cyber-accent/10 flex items-center justify-center text-cyber-accent font-bold shrink-0">1</span>
                                Enter any code (like 'pizza-party') and tell your friends.
                            </li>
                            <li className="flex gap-3 text-xs text-gray-400">
                                <span className="w-5 h-5 rounded-full bg-cyber-accent/10 flex items-center justify-center text-cyber-accent font-bold shrink-0">2</span>
                                When they type the same code, you'll be in the same arena!
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
