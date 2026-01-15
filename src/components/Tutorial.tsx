import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Terminal, Sword, Target, Share2 } from 'lucide-react';

interface TutorialProps {
    onClose: () => void;
}

const STEPS = [
    {
        title: "Welcome to CyberCore",
        icon: <Terminal size={48} className="text-cyber-accent" />,
        content: (
            <p>
                CyberCore is a programmable arena shooter. Instead of just clicking to shoot,
                you <strong>write Python code</strong> to define how your weapon behaves.
                <br /><br />
                Your goal involves designing smart projectiles, predicting enemy movement, and outsmarting opponents with superior logic.
            </p>
        )
    },
    {
        title: "The Weapon Editor",
        icon: <Target size={48} className="text-blue-400" />,
        content: (
            <div className="space-y-4">
                <p>
                    On the left side of the screen is the <strong>Weapon Editor</strong>.
                </p>
                <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-gray-300 border border-cyber-muted">
                    <span className="text-purple-400">def</span> <span className="text-yellow-400">on_fire</span>(tx, ty, mx, my):<br />
                    &nbsp;&nbsp;<span className="text-gray-500"># Return projectile stats</span><br />
                    &nbsp;&nbsp;<span className="text-purple-400">return</span> {"{"}<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-400">"speed"</span>: 300,<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-400">"damage"</span>: 50,<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-400">"homing"</span>: 1.0<br />
                    &nbsp;&nbsp;{"}"}
                </div>
                <p>
                    Use the <code>on_fire</code> function to return a dictionary of properties for your projectile.
                </p>
            </div>
        )
    },
    {
        title: "Multiplayer Logic",
        icon: <Share2 size={48} className="text-emerald-400" />,
        content: (
            <p>
                When you play online, your code runs locally, but the <strong>Server</strong> validates all actions.
                <br /><br />
                You can create <strong>Public</strong> or <strong>Private</strong> lobbies.
                <ul className="list-disc list-inside mt-2 text-cyber-muted">
                    <li><strong>Private:</strong> Share the room code with friends.</li>
                    <li><strong>Public:</strong> Match with anyone looking for a fight.</li>
                </ul>
            </p>
        )
    },
    {
        title: "Combat Tips",
        icon: <Sword size={48} className="text-red-400" />,
        content: (
            <ul className="space-y-2">
                <li className="flex gap-2">
                    <span className="text-cyber-accent">➢</span>
                    <span>Use <code>api.get_nearest_enemy()</code> to auto-target.</span>
                </li>
                <li className="flex gap-2">
                    <span className="text-cyber-accent">➢</span>
                    <span>Experiment with <strong>homing</strong> and <strong>acceleration</strong>.</span>
                </li>
                <li className="flex gap-2">
                    <span className="text-cyber-accent">➢</span>
                    <span>Try the <strong>Solo Sandbox</strong> to test safely.</span>
                </li>
            </ul>
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
                    <div className="text-lg text-gray-300 leading-relaxed max-w-lg">
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
                        {step === STEPS.length - 1 ? "GET STARTED" : "NEXT"} <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
