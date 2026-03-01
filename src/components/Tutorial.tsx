import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Terminal, Sword, ShieldAlert, Zap, Globe } from 'lucide-react';

interface TutorialProps {
    onClose: () => void;
}

const STEPS = [
    {
        title: "Welcome to CyberCore",
        icon: <Terminal size={48} className="text-cyber-accent" />,
        content: (
            <div className="space-y-4 text-left">
                <p>
                    CyberCore is a top-down arena shooter with a twist: <strong>you program your weapon using Python.</strong>
                </p>
                <p>
                    Use <strong className="text-white">W A S D</strong> to move and click your mouse to fire. Your goal is to survive endless waves of enemies or battle it out against other players.
                </p>
            </div>
        )
    },
    {
        title: "Economy & Upgrades",
        icon: <Zap size={48} className="text-blue-400" />,
        content: (
            <div className="space-y-4 text-left">
                <p>
                    Destroy enemies to earn <strong>XP</strong> and <strong>Money</strong>.
                </p>
                <ul className="list-disc list-inside mt-2 text-cyber-muted space-y-2">
                    <li><strong className="text-emerald-400">Level Ups:</strong> Grant you access to new attribute limits.</li>
                    <li><strong className="text-yellow-400">Money:</strong> Used in the Lobby to upgrade your attributes.</li>
                </ul>
                <p>
                    There are <strong>43 unique attributes</strong> (like Homing, Pierce, Chain Lightning, Explosions) that you can unlock and upgrade.
                </p>
            </div>
        )
    },
    {
        title: "The Weapon Code",
        icon: <Sword size={48} className="text-purple-400" />,
        content: (
            <div className="space-y-4 text-left">
                <p>
                    In the match, open the <strong>Weapon Editor</strong> to write real Python code that controls your projectiles.
                </p>
                <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-gray-300 border border-cyber-muted">
                    <span className="text-purple-400">def</span> <span className="text-yellow-400">on_fire</span>(tx, ty, mx, my):<br />
                    &nbsp;&nbsp;<span className="text-purple-400">return</span> {"{"}<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-400">"speed"</span>: 800,<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-400">"homing"</span>: 10,<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-400">"pierce"</span>: 3<br />
                    &nbsp;&nbsp;{"}"}
                </div>
                <p>
                    Your code's requested values are <strong>automatically capped</strong> by your upgraded limits. You can't shoot faster or harder than your current hardware allows!
                </p>
            </div>
        )
    },
    {
        title: "Auras & Titles",
        icon: <ShieldAlert size={48} className="text-emerald-400" />,
        content: (
            <div className="space-y-4 text-left">
                <p>
                    <strong>Auras</strong> are passive area-of-effect abilities.
                </p>
                <p>
                    You can equip one aura at a time (e.g., <span className="text-green-400">Corruption</span> for poison, <span className="text-purple-400">Gravity</span> for pulling). They affect <strong>everyone</strong> in range. Upgrading an aura increases its strength and radius.
                </p>
                <p>
                    <strong>Titles</strong> display next to your name and are earned by achieving feats (e.g., Maxing out stats, playing for 30 minutes without shooting).
                </p>
            </div>
        )
    },
    {
        title: "Multiplayer Modes",
        icon: <Globe size={48} className="text-red-400" />,
        content: (
            <div className="space-y-4 text-left">
                <p>
                    You can play Solo, or join a Room.
                </p>
                <ul className="list-disc list-inside mt-2 text-cyber-muted space-y-2">
                    <li><strong className="text-white">Co-op Waves:</strong> Team up to survive endless enemies. A powerful Boss spawns every 5 waves!</li>
                    <li><strong className="text-white">PvP Arena:</strong> Free-for-all combat against other players. Use your custom weapon scripts to dominate.</li>
                    <li><strong className="text-white">Map Voting:</strong> Between rounds, vote for the next arena layout.</li>
                </ul>
            </div>
        )
    }
];

export const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
    const [step, setStep] = useState(0);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f1115] border border-cyber-muted rounded-3xl max-w-2xl w-full flex flex-col overflow-hidden shadow-2xl shadow-black/50 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-cyber-muted/30 flex justify-between items-center bg-cyber-light/10">
                    <h2 className="text-2xl font-black text-white tracking-wide uppercase flex items-center gap-3">
                        <span className="text-cyber-accent">STEP {step + 1}</span> / {STEPS.length}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-cyber-muted/20 rounded-full transition-colors text-cyber-muted hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-12 flex-1 flex flex-col items-center text-center">
                    <div className="mb-8 p-6 bg-cyber-accent/5 rounded-full border border-cyber-accent/20">
                        {STEPS[step].icon}
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-6">{STEPS[step].title}</h3>
                    <div className="text-sm text-gray-300 leading-relaxed max-w-lg">
                        {STEPS[step].content}
                    </div>
                </div>

                {/* Footer / Controls */}
                <div className="p-6 border-t border-cyber-muted/30 bg-cyber-light/5 flex justify-between items-center">
                    <button
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                        className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-white"
                    >
                        <ChevronLeft size={20} /> PREV
                    </button>

                    <div className="flex gap-2">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-cyber-accent w-6' : 'bg-cyber-muted'}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            if (step === STEPS.length - 1) onClose();
                            else setStep(Math.min(STEPS.length - 1, step + 1));
                        }}
                        className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 bg-cyber-accent text-black hover:bg-emerald-400 transition-all shadow-lg shadow-cyber-accent/20"
                    >
                        {step === STEPS.length - 1 ? "ENTER CORE" : "NEXT"} <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
