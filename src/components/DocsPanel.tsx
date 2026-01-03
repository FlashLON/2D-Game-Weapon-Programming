import React from 'react';
import { Book, X } from 'lucide-react';

interface DocsPanelProps {
    onClose: () => void;
}

export const DocsPanel: React.FC<DocsPanelProps> = ({ onClose }) => {
    return (
        <div className="absolute top-0 right-0 h-full w-96 bg-gray-900/95 backdrop-blur shadow-2xl border-l border-cyber-accent z-20 overflow-y-auto text-sm text-gray-300 transform transition-transform duration-300">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 sticky top-0">
                <div className="flex items-center gap-2 text-cyber-accent font-bold text-lg">
                    <Book size={20} />
                    <span>Weapon Manual</span>
                </div>
                <button onClick={onClose} className="hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 space-y-8 font-mono">

                <section>
                    <h3 className="text-white font-bold mb-3 border-b border-gray-700 pb-1">1. Class Structure</h3>
                    <p className="mb-2 text-xs text-gray-400">Your code must define a generic `Weapon` class.</p>
                    <pre className="bg-black/50 p-3 rounded text-green-400 overflow-x-auto border border-gray-800">
                        {`class Weapon:
  def __init__(self):
    self.damage = 10
    
  def on_fire(self, tx, ty, mx, my):
    # Returns projectile info
    pass
    
  def on_hit(self, target_id):
    # Triggered on impact
    pass

  def on_kill(self, target_id):
    # Triggered when enemy dies
    pass
    
  def update(self, dt):
    # Called every frame
    pass`}
                    </pre>
                </section>

                <section>
                    <h3 className="text-white font-bold mb-3 border-b border-gray-700 pb-1">2. Firing Return Values</h3>
                    <p className="mb-2 text-xs text-gray-400">Return a dictionary from <code>on_fire</code> to spawn a projectile.</p>
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-xs">
                        <span className="text-cyber-warning">speed</span> <span>(number) Speed in pixels/sec</span>
                        <span className="text-cyber-warning">angle</span> <span>(number) Direction in degrees</span>
                        <span className="text-cyber-accent">damage</span> <span>(number) Damage on hit</span>
                        <span className="text-cyber-accent">color</span> <span>(string) Hex code</span>
                        <span className="text-cyber-accent">radius</span> <span>(number) Projectile size</span>
                        <span className="text-pink-400">homing</span> <span>(number) Steering power (e.g. 2.0)</span>
                        <span className="text-pink-400">lifetime</span> <span>(number) Seconds before despawn</span>
                        <span className="text-pink-400">acceleration</span> <span>(number) Speed mult/sec</span>
                        <span className="text-purple-400">knockback</span> <span>(number) Push force</span>
                        <span className="text-purple-400">pierce</span> <span>(number) Targets to hit</span>
                    </div>
                </section>

                <section>
                    <h3 className="text-white font-bold mb-3 border-b border-gray-700 pb-1">3. World API</h3>
                    <p className="mb-2 text-xs text-gray-400">Use the global <code>api</code> object to access game data.</p>

                    <div className="space-y-4">
                        <div>
                            <code className="text-cyber-accent block mb-1">api.get_enemies()</code>
                            <p>Returns a list of all active enemies.</p>
                            <pre className="bg-black/50 p-2 rounded text-gray-400 text-xs mt-1">
                                {`[
  {"id": "e1", "x": 100, "y": 200, "hp": 50},
  ...
]`}
                            </pre>
                        </div>
                        <div>
                            <code className="text-cyber-accent block mb-1">api.get_player()</code>
                            <p>Returns player info: <code>{`{"x": 400, "y": 300, ...}`}</code></p>
                        </div>
                        <div>
                            <code className="text-cyber-accent block mb-1">api.get_arena_size()</code>
                            <p>Returns arena dimensions: <code>{`{"width": 800, "height": 600}`}</code></p>
                        </div>
                        <div>
                            <code className="text-cyber-accent block mb-1">api.get_nearest_enemy(x, y)</code>
                            <p>Returns the nearest enemy object (with <code>dist</code> property) or <code>null</code>.</p>
                        </div>
                        <div>
                            <code className="text-cyber-accent block mb-1">api.get_entities_in_range(x, y, r)</code>
                            <p>Returns a list of enemies within radius <code>r</code> of point <code>(x, y)</code>.</p>
                        </div>
                        <div>
                            <code className="text-cyber-accent block mb-1">api.log(msg)</code>
                            <p>Prints a message to the in-game debug console.</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-white font-bold mb-3 border-b border-gray-700 pb-1">Example: Homing</h3>
                    <pre className="bg-black/50 p-3 rounded text-purple-300 text-xs border border-gray-800">
                        {`import math

enemies = api.get_enemies()
if len(enemies) > 0:
    e = enemies[0]
    # Aim at first enemy...`}
                    </pre>
                </section>

            </div>
        </div>
    );
};
