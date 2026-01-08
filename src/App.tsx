import { useEffect, useState } from 'react';
import { WeaponEditor } from './components/WeaponEditor';
import { Arena } from './components/Arena';
import { Console, type LogMessage, type LogType } from './components/Console';
import { pyodideManager } from './engine/PyodideManager';
import { gameEngine } from './engine/GameEngine';
import { networkManager } from './utils/NetworkManager';
import { Play, RotateCcw, X, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

const DEFAULT_CODE = `
# ==========================================
#  BASIC WEAPON SCRIPTER
# ==========================================
# Target enemies and click to fire.
# Use 'api' functions to build cool weapons!

import math

class Weapon:
    def __init__(self):
        # 1. Setup base stats
        self.damage = 25
        self.speed = 400
        api.log("Weapon ready! Click the Arena to fire.")

    # ------------------------------------------
    # ON FIRE: Spawns the projectile
    # ------------------------------------------
    def on_fire(self, target_x, target_y, my_x, my_y):
        # Calculate angle to where you clicked
        dx = target_x - my_x
        dy = target_y - my_y
        angle = math.degrees(math.atan2(dy, dx))
        
        # Return how the shot looks and moves
        return {
            "speed": self.speed,
            "angle": angle,
            "damage": self.damage,
            "color": "#fce83a",
            "radius": 5
        }

    # ------------------------------------------
    # ON KILL: Called when an enemy is defeated
    # ------------------------------------------
    def on_kill(self, target_id):
        api.log(f"Target {target_id} eliminated!")

    # ------------------------------------------
    # UPDATE: Called on every frame
    # ------------------------------------------
    def update(self, dt):
        pass
`.trim();

import { DocsPanel } from './components/DocsPanel';

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [status, setStatus] = useState("Initializing Python...");
  const [showDocs, setShowDocs] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // Multiplayer State
  const [isConnected, setIsConnected] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [serverUrl, setServerUrl] = useState("https://2d-game-weapon-programming-production.up.railway.app");

  const addLog = (msg: string, type: LogType = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      message: msg,
      type
    }].slice(-200)); // Keep last 200 logs
  };

  // Define API for Python environment
  const api = {
    get_enemies: () => {
      return gameEngine.getEnemies();
    },
    get_player: () => {
      return gameEngine.getPlayer();
    },
    get_arena_size: () => {
      return gameEngine.getArenaBounds();
    },
    // We can add more helpers here
    log: (msg: string) => {
      console.log("PY:", msg);
      addLog(msg, 'info');
    },
    // Enhanced Spatial Queries
    get_nearest_enemy: (x: number, y: number) => {
      return gameEngine.getNearestEnemy(x, y);
    },
    get_entities_in_range: (x: number, y: number, range: number) => {
      return gameEngine.getEntitiesInRange(x, y, range);
    },
    // Utilities
    get_time: () => Date.now(),
    rand_float: () => Math.random(),
  };

  useEffect(() => {
    const init = async () => {
      try {
        await pyodideManager.init((msg, isError) => {
          addLog(msg, isError ? 'error' : 'info');
        });
        setStatus("Ready to compile");
        // Load default code
        handleCompile(DEFAULT_CODE);
      } catch (err) {
        setStatus("Failed to load System: " + String(err));
      }
    };
    init();
  }, []);

  // Network Listeners
  useEffect(() => {
    networkManager.setOnConnectionChange((connected) => {
      setIsConnected(connected);
      gameEngine.setMultiplayerMode(connected);
      if (connected) {
        addLog("Connected to Multiplayer Server!", "success");
        setShowConnect(false);
      } else {
        addLog("Disconnected from Server", "warning");
      }
    });

    networkManager.setOnStateUpdate((state) => {
      gameEngine.updateFromSnapshot(state);
    });

    networkManager.setOnKill((id) => {
      addLog(`Eliminated enemy ${id}!`, "success");
    });

    // Clean up
    return () => {
      networkManager.disconnect();
    };
  }, []);

  const handleConnect = async () => {
    if (isConnected) {
      networkManager.disconnect();
    } else {
      let url = serverUrl || "http://localhost:3000";
      // Remove trailing slash for consistency
      url = url.replace(/\/$/, "");

      addLog(`Checking server at ${url}...`, "info");

      try {
        // 1. Health Check
        const response = await fetch(`${url}/health`);
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.indexOf("application/json") !== -1) {
          // Success - it's our game server
          addLog("Server found! Connecting...", "info");
          networkManager.connect(url);
        } else {
          // Failure - likely serving the frontend HTML app instead of backend API
          addLog("Error: Server returned HTML instead of JSON.", "error");
          addLog("Fix: In Railway settings, set Root Directory to '/server'", "warning");
        }
      } catch (err) {
        addLog(`Connection Failed: ${String(err)}`, "error");
        // If fetch fails (CORS or offline), we might still try socket if the user insists, 
        // but usually this means the server is unreachable.
        // We'll try connecting anyway just in case it's a specific fetch issue.
        addLog("Attempting socket connection anyway...", "info");
        networkManager.connect(url);
      }
    }
  };

  const handleCompile = async (source: string) => {
    setStatus("Compiling...");
    try {
      // Pass API to Pyodide
      const script = await pyodideManager.loadWeaponCode(source, api);
      if (script) {
        gameEngine.setWeaponScript(script);
        setStatus("Weapon Updated!");
        setTimeout(() => setStatus("Ready"), 2000);
      } else {
        setStatus("Compilation Failed (Check Console)");
      }
    } catch (err) {
      setStatus("Error: " + String(err));
    }
  };

  const handleSave = () => {
    handleCompile(code);
  };

  return (
    <div className="h-screen w-screen bg-cyber-dark text-white flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-cyber-muted flex items-center px-6 justify-between bg-cyber-light shadow-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyber-accent to-blue-500 flex items-center justify-center font-bold text-black border border-white/20">
            CA
          </div>
          <h1 className="font-bold text-lg tracking-wide">CodeCombat <span className="text-cyber-accent">Arena</span></h1>
        </div>

        <div className="flex items-center gap-4">
          <div className={`text-xs px-3 py-1 rounded-full border ${status.includes("Failed") ? "border-cyber-danger text-cyber-danger" :
            status.includes("Ready") ? "border-cyber-accent text-cyber-accent" : "border-cyber-warning text-cyber-warning"
            }`}>
            {status}
          </div>

          <button
            onClick={() => setShowDocs(!showDocs)}
            className="text-sm border border-cyber-accent text-cyber-accent px-3 py-1 rounded hover:bg-cyber-accent/10 transition-colors"
          >
            {showDocs ? "Hide Guide" : "Code Guide"}
          </button>

          {/* Multiplayer Button */}
          <div className="relative">
            <button
              onClick={() => setShowConnect(!showConnect)}
              className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${isConnected
                ? "bg-cyber-accent/20 text-cyber-accent border border-cyber-accent"
                : "text-gray-300 hover:bg-cyber-muted border border-transparent"}`}
            >
              {isConnected ? <CheckCircle2 size={16} /> : <LinkIcon size={16} />}
              {isConnected ? "Online" : "Multiplayer"}
            </button>

            {/* Connection Popup */}
            {showConnect && (
              <div className="absolute top-12 right-0 w-80 bg-cyber-dark border border-cyber-muted p-4 rounded shadow-2xl z-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white">Multiplayer Connection</h3>
                  <button onClick={() => setShowConnect(false)} className="text-gray-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                {!isConnected ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-cyber-muted block mb-1">Server URL</label>
                      <input
                        type="text"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        placeholder="wss://your-app.railway.app"
                        className="w-full bg-black/50 border border-cyber-muted rounded px-3 py-2 text-sm text-white focus:border-cyber-accent outline-none"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Leave empty for localhost:3000</p>
                    </div>
                    <button
                      onClick={handleConnect}
                      className="w-full bg-cyber-accent text-black font-bold py-2 rounded hover:bg-emerald-400 transition-colors"
                    >
                      Connect Server
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 p-3 rounded">
                      <CheckCircle2 size={24} />
                      <div>
                        <div className="font-bold text-sm">Connected</div>
                        <div className="text-xs opacity-75">Syncing game state...</div>
                      </div>
                    </div>
                    <button
                      onClick={() => networkManager.disconnect()}
                      className="w-full border border-red-500 text-red-500 hover:bg-red-500/10 font-bold py-2 rounded transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => gameEngine.reset()}
            className="p-2 hover:bg-cyber-muted rounded transition-colors text-gray-300"
            title="Reset Arena"
          >
            <RotateCcw size={20} />
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-cyber-accent hover:bg-emerald-400 text-black px-4 py-1.5 rounded font-bold transition-all shadow-[0_0_15px_rgba(0,255,159,0.3)] hover:shadow-[0_0_25px_rgba(0,255,159,0.5)]"
          >
            <Play size={16} fill="black" />
            DEPLOY WEAPON
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor Pane */}
        <div className="w-1/2 min-w-[400px] h-full shadow-xl z-0">
          <WeaponEditor code={code} onChange={(val) => setCode(val || "")} />
        </div>

        {/* Arena Pane */}
        <div className="flex-1 h-full relative flex flex-col min-w-0">
          <div className="flex-1 relative bg-black/50">
            <Arena />
            {/* Documentation Panel Overlay - kept relative to Arena */}
            {showDocs && <DocsPanel onClose={() => setShowDocs(false)} />}
          </div>

          <div className="h-48 shrink-0 z-10 border-t border-cyber-muted">
            <Console
              logs={logs}
              onClear={() => setLogs([])}
              className="h-full"
            />
          </div>
        </div>


      </div>
    </div>
  );
}

export default App;
