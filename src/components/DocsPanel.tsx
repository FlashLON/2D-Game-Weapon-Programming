import React from 'react';
import { Book, X, Lock, CheckCircle2, Code, Zap, Database } from 'lucide-react';
import { ATTRIBUTES } from '../utils/AttributeRegistry';

interface DocsPanelProps {
    onClose: () => void;
    userProfile: any;
}

export const DocsPanel: React.FC<DocsPanelProps> = ({ onClose, userProfile }) => {
    const unlocks = userProfile.unlocks || [];
    const limits = userProfile.limits || {};

    return (
        <div className="absolute top-0 right-0 h-full w-[450px] bg-[#0c0d10]/98 backdrop-blur shadow-2xl border-l border-cyber-accent z-[50] overflow-y-auto text-sm text-gray-300 transform transition-transform duration-300">
            {/* Header */}
            <div className="p-4 border-b border-cyber-muted/30 flex justify-between items-center bg-black/50 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-2 text-cyber-accent font-black text-lg uppercase tracking-wider">
                    <Book size={20} />
                    <span>Weapon Systems API</span>
                </div>
                <button onClick={onClose} className="hover:text-white text-cyber-muted transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 space-y-8 font-mono">
                {/* 1. PROGRESSION STATUS */}
                <section className="bg-cyber-accent/5 p-4 rounded-xl border border-cyber-accent/20">
                    <h3 className="text-cyber-accent font-bold mb-3 flex items-center gap-2 uppercase">
                        <CheckCircle2 size={16} /> Hardware Status
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-[10px]">
                        <div>
                            <span className="text-cyber-muted block uppercase font-bold">License Level</span>
                            <span className="text-white font-black text-2xl">{userProfile.level}</span>
                        </div>
                        <div>
                            <span className="text-cyber-muted block uppercase font-bold">Total Credits</span>
                            <span className="text-emerald-400 font-black text-2xl">${userProfile.money.toLocaleString()}</span>
                        </div>
                    </div>
                </section>

                {/* 2. CLASS BLUEPRINT */}
                <section>
                    <h3 className="text-white font-bold mb-3 border-b border-cyber-muted/30 pb-2 flex items-center gap-2 uppercase">
                        <Code size={16} className="text-blue-400" /> 1. Class Blueprint
                    </h3>
                    <p className="mb-2 text-[11px] text-gray-400 leading-relaxed">Your code MUST define a <code>Weapon</code> class. The <code>on_fire</code> method is called automatically when you click the mouse.</p>
                    <pre className="bg-black/80 p-4 rounded-xl text-green-400 text-[11px] overflow-x-auto border border-gray-800 shadow-inner">
                        {`class Weapon:
    def __init__(self):
        self.shots_fired = 0
        self.msg = "Weapon Initialized"
        
    def on_fire(self, tx, ty, mx, my):
        # tx, ty = Target X, Y (Mouse relative to arena)
        # mx, my = Muzzle X, Y (Player coords)
        
        import math
        angle = math.degrees(math.atan2(ty - my, tx - mx))
        
        # Return a dict or list of dicts for projectiles
        return {
            "speed": 800,
            "angle": angle,
            "damage": 50
        }
        
    def on_hit(self, target_id):
        pass # Called on impact

    def update(self, dt):
        pass # Called every frame`}
                    </pre>
                </section>

                {/* 3. PROJECTILE PARAMETERS */}
                <section>
                    <h3 className="text-white font-bold mb-3 border-b border-cyber-muted/30 pb-2 flex items-center gap-2 uppercase">
                        <Zap size={16} className="text-yellow-400" /> 2. Projectile Attributes
                    </h3>
                    <p className="mb-4 text-[11px] text-gray-400 leading-relaxed">Keys you can return in <code>on_fire()</code>. Values surpassing your <strong>MAX</strong> limits are automatically capped by the Enforcer. Gray items are locked.</p>

                    <div className="grid grid-cols-1 gap-2">
                        {Object.values(ATTRIBUTES).filter(a => !a.isAura).map(attr => {
                            const isUnlocked = attr.isBase || unlocks.includes(attr.id);
                            const currentLimit = limits[attr.id] || (isUnlocked ? attr.startLimit : 0);

                            return (
                                <div key={attr.id} className={`p-3 rounded-xl border flex flex-col justify-center transition-all ${isUnlocked ? 'border-cyber-muted/30 bg-cyber-light/5 hover:bg-cyber-light/10' : 'border-red-900/30 bg-red-950/10 opacity-50'}`}>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-2">
                                            {isUnlocked ? <attr.icon size={14} className="text-cyber-accent" /> : <Lock size={14} className="text-red-500" />}
                                            <span className={`text-[11px] font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{attr.id}</span>
                                        </div>
                                        {isUnlocked && <span className="text-[9px] font-black text-cyber-accent bg-cyber-accent/10 px-2 py-0.5 rounded uppercase border border-cyber-accent/20">MAX: {currentLimit}</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-tight">{attr.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 4. WORLD API */}
                <section>
                    <h3 className="text-white font-bold mb-3 border-b border-cyber-muted/30 pb-2 flex items-center gap-2 uppercase">
                        <Database size={16} className="text-purple-400" /> 3. World API
                    </h3>
                    <p className="mb-4 text-[11px] text-gray-400 leading-relaxed">Use the global <code>api</code> object to query the game state.</p>

                    <div className="space-y-4 bg-black/50 p-4 rounded-xl border border-gray-800">
                        <ApiMethod
                            name="api.get_enemies()"
                            desc="Returns list of dicts: [{id, x, y, hp, maxHp}, ...]"
                        />
                        <ApiMethod
                            name="api.get_players()"
                            desc="Returns list of other players in the room."
                        />
                        <ApiMethod
                            name="api.get_self() OR api.player"
                            desc="Returns your own entity state."
                        />
                        <ApiMethod
                            name="api.get_nearest_enemy(x, y)"
                            desc="Quick lookup for closest enemy."
                        />
                        <ApiMethod
                            name="api.predict_position(target_id, speed)"
                            desc="Calculates intercept point. Returns {x, y}."
                        />
                        <ApiMethod
                            name="api.get_entities_in_range(x, y, radius)"
                            desc="Returns all entities within a circle."
                        />
                        <ApiMethod
                            name="api.get_arena_size() OR api.arena"
                            desc="Returns {width, height}."
                        />
                        <ApiMethod
                            name="api.get_stats() OR api.stats"
                            desc="Returns your profile (level, money, titles)."
                        />
                        <ApiMethod
                            name="api.log(msg)"
                            desc="Prints to the System Console tab."
                        />
                    </div>
                </section>

                {/* 5. EXAMPLE */}
                <section className="pb-10">
                    <h3 className="text-white font-bold mb-3 border-b border-cyber-muted/30 pb-2 uppercase text-[12px]">Example: Predator Missile</h3>
                    <pre className="bg-black/80 p-4 rounded-xl text-yellow-400 text-[11px] border border-gray-800 shadow-inner overflow-x-auto">
                        {`def on_fire(self, tx, ty, mx, my):
    enemies = api.get_enemies()
    if not enemies:
        return {"speed": 500, "angle": 0} # Blind fire
        
    nearest = api.get_nearest_enemy(mx, my)
    
    # Predict where they will be based on bullet speed
    target = api.predict_position(nearest['id'], 600)
    
    if target:
        import math
        angle = math.degrees(math.atan2(target['y'] - my, target['x'] - mx))
        return {
            "speed": 600,
            "angle": angle,
            "homing": 5.0,
            "color": "#ff0055"
        }`}
                    </pre>
                </section>

            </div>
        </div>
    );
};

const ApiMethod: React.FC<{ name: string, desc: string }> = ({ name, desc }) => (
    <div className="border-b border-gray-800/50 pb-3 last:border-0 last:pb-0">
        <code className="text-cyber-accent font-bold block mb-1 text-[11px] bg-cyber-accent/10 w-fit px-1.5 py-0.5 rounded">{name}</code>
        <p className="text-[11px] text-gray-400 leading-normal">{desc}</p>
    </div>
);
