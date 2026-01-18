import React from 'react';
import { Book, X, Lock, CheckCircle2 } from 'lucide-react';
import { ATTRIBUTES } from '../utils/AttributeRegistry';

interface DocsPanelProps {
    onClose: () => void;
    userProfile: any;
}

export const DocsPanel: React.FC<DocsPanelProps> = ({ onClose, userProfile }) => {
    const unlocks = userProfile.unlocks || [];
    const limits = userProfile.limits || {};

    return (
        <div className="absolute top-0 right-0 h-full w-[450px] bg-gray-900/98 backdrop-blur shadow-2xl border-l border-cyber-accent z-[50] overflow-y-auto text-sm text-gray-300 transform transition-transform duration-300">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 sticky top-0 z-10">
                <div className="flex items-center gap-2 text-cyber-accent font-bold text-lg">
                    <Book size={20} />
                    <span>Weapon Systems Manual</span>
                </div>
                <button onClick={onClose} className="hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 space-y-8 font-mono">

                {/* 1. PROGRESSION STATUS */}
                <section className="bg-cyber-accent/5 p-4 rounded-lg border border-cyber-accent/20">
                    <h3 className="text-cyber-accent font-bold mb-3 flex items-center gap-2">
                        <CheckCircle2 size={16} /> Progression Status
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-[10px]">
                        <div>
                            <span className="text-gray-500 block">LICENSE LEVEL</span>
                            <span className="text-white font-bold text-lg">{userProfile.level}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">TOTAL CREDITS</span>
                            <span className="text-emerald-400 font-bold text-lg">${userProfile.money.toLocaleString()}</span>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-white font-bold mb-3 border-b border-gray-700 pb-1">1. Class Blueprint</h3>
                    <p className="mb-2 text-xs text-gray-400">Your code MUST define a <code>Weapon</code> class with these methods:</p>
                    <pre className="bg-black/50 p-3 rounded text-green-400 text-[11px] overflow-x-auto border border-gray-800">
                        {`class Weapon:
  def __init__(self):
    self.counter = 0
    
  def on_fire(self, tx, ty, mx, my):
    # Triggered automatically
    return {"speed": 300, "angle": 0}
    
  def on_hit(self, target_id):
    # Triggered on impact
    pass

  def update(self, dt):
    # Every frame logic
    pass`}
                    </pre>
                </section>

                <section>
                    <h3 className="text-white font-bold mb-3 border-b border-gray-700 pb-1 flex items-center gap-2">
                        2. Projectile Parameters
                    </h3>
                    <p className="mb-4 text-xs text-gray-400">Values returned by <code>on_fire</code> or passed to <code>spawn_projectile</code>. Grayed items are locked.</p>

                    <div className="space-y-3">
                        {Object.values(ATTRIBUTES).map(attr => {
                            const isUnlocked = unlocks.includes(attr.id);
                            const currentLimit = limits[attr.id] || 0;

                            return (
                                <div key={attr.id} className={`p-2 rounded border ${isUnlocked ? 'border-gray-700 bg-gray-800/30' : 'border-red-900/30 bg-red-950/10 opacity-60'}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            {isUnlocked ? <attr.icon size={14} className="text-cyber-accent" /> : <Lock size={14} className="text-red-500" />}
                                            <span className={`font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{attr.id}</span>
                                        </div>
                                        {isUnlocked && <span className="text-[10px] text-cyber-accent">MAX: {currentLimit}</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-tight">{attr.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h3 className="text-white font-bold mb-3 border-b border-gray-700 pb-1">3. World API</h3>
                    <p className="mb-4 text-xs text-gray-400">Use the global <code>api</code> object inside your methods.</p>

                    <div className="space-y-4">
                        <ApiMethod
                            name="api.get_enemies()"
                            desc="Returns list of Enemy dicts with {id, x, y, hp, maxHp}."
                        />
                        <ApiMethod
                            name="api.get_players()"
                            desc="Returns list of other Players in the room."
                        />
                        <ApiMethod
                            name="api.get_self()"
                            desc="Returns your own status: {id, x, y, hp}."
                        />
                        <ApiMethod
                            name="api.spawn_projectile(params)"
                            desc="Spawns a projectile. Validates against your limits."
                        />
                        <ApiMethod
                            name="api.predict_position(target_id, speed)"
                            desc="Calculates interception point. Returns {x, y}."
                        />
                        <ApiMethod
                            name="api.get_nearest_enemy(x, y)"
                            desc="Quick lookup for closest target."
                        />
                        <ApiMethod
                            name="api.get_arena_size()"
                            desc="Returns {width, height} dimensions."
                        />
                        <ApiMethod
                            name="api.log(message)"
                            desc="Prints to the System Console."
                        />
                    </div>
                </section>

                <section className="pb-10">
                    <h3 className="text-white font-bold mb-3 border-b border-gray-700 pb-1">Example: Pro Radar</h3>
                    <pre className="bg-black/50 p-3 rounded text-cyber-accent text-[11px] border border-gray-800">
                        {`enemies = api.get_enemies()
if enemies:
    nearest = api.get_nearest_enemy(mx, my)
    target = api.predict_position(nearest['id'], 300)
    if target:
        # Fire at projected point
        return {"angle": 45, "speed": 300}`}
                    </pre>
                </section>

            </div>
        </div>
    );
};

const ApiMethod: React.FC<{ name: string, desc: string }> = ({ name, desc }) => (
    <div>
        <code className="text-cyber-accent font-bold block mb-1 text-[12px]">{name}</code>
        <p className="text-[11px] text-gray-400 leading-normal">{desc}</p>
    </div>
);
