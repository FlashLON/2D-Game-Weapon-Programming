import { useEffect, useState } from 'react';
import { WeaponEditor } from './components/WeaponEditor';
import { Arena } from './components/Arena';
import { Lobby } from './components/Lobby';
import { Console, type LogMessage, type LogType } from './components/Console';
import { pyodideManager } from './engine/PyodideManager';
import { gameEngine } from './engine/GameEngine';
import { networkManager } from './utils/NetworkManager';
import { Play, RotateCcw, Link as LinkIcon, CheckCircle2, LogOut } from 'lucide-react';
import { DocsPanel } from './components/DocsPanel';

const DEFAULT_CODE = `
class Weapon:
    def __init__(self):
        self.msg = "Locked and loaded"
    def on_fire(self, tx, ty, mx, my):
        import math
        angle = math.atan2(ty - my, tx - mx)
        return {
            "speed": 300,
            "angle": math.degrees(angle),
            "damage": 50,
            "knockback": 300,
            "pierce": 1
        }
    
    def on_hit(self, target_id):
        pass
    def update(self, dt): 
        pass
`.trim();

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [status, setStatus] = useState("Initializing Python...");
  const [showDocs, setShowDocs] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // Multiplayer State
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("https://2d-game-weapon-programming-production.up.railway.app");

  const addLog = (msg: string, type: LogType = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      message: msg,
      type
    }].slice(-200));
  };

  // Define API for Python environment
  const api = {
    get_enemies: () => {
      return gameEngine.getEnemies().map(e => ({
        ...e,
        toString: () => `Enemy(id=${e.id}, x=${Math.round(e.x)}, y=${Math.round(e.y)}, hp=${e.hp})`
      }));
    },
    get_player: () => {
      const p = gameEngine.getPlayer();
      if (!p) return null;
      return {
        ...p,
        toString: () => `Player(id=${p.id}, x=${Math.round(p.x)}, y=${Math.round(p.y)}, hp=${p.hp})`
      };
    },
    get_arena_size: () => gameEngine.getArenaBounds(),
    log: (msg: string) => {
      console.log("PY:", msg);
      addLog(msg, 'info');
    },
    get_nearest_enemy: (x: number, y: number) => gameEngine.getNearestEnemy(x, y),
    get_entities_in_range: (x: number, y: number, range: number) => gameEngine.getEntitiesInRange(x, y, range),
    get_projectiles: () => gameEngine.getAllProjectiles(),
    spawn_projectile: (params: any, shouldNetwork: boolean = true) => {
      let jsParams = params;
      if (params && typeof params.toJs === 'function') {
        const raw = params.toJs();
        if (raw instanceof Map || (raw && typeof raw.get === 'function')) {
          jsParams = {};
          raw.forEach((v: any, k: any) => { (jsParams as any)[k] = v; });
        } else { jsParams = raw; }
      }
      const proj = gameEngine.spawnProjectile(jsParams);
      if (proj && isConnected && shouldNetwork) {
        networkManager.sendFire({ ...proj, vx: proj.velocity.x, vy: proj.velocity.y });
      }
      return proj;
    },
    get_time: () => Date.now(),
    rand_float: () => Math.random(),
  };

  const handleCompile = async (sourceCode: string) => {
    try {
      setStatus("Compiling...");
      const weaponInstance = await pyodideManager.loadWeaponCode(sourceCode, api);
      if (weaponInstance) {
        setStatus("Ready to deploy");
        gameEngine.setWeaponScript(weaponInstance);
      } else {
        setStatus("Compilation failed");
      }
    } catch (err) {
      setStatus("Error: " + String(err));
    }
  };

  const handleSave = () => {
    handleCompile(code);
    addLog("Weapon logic updated!", "success");
  };

  const handleJoinRoom = (roomId: string) => {
    if (roomId === 'offline') {
      setCurrentRoom('offline');
      gameEngine.setMultiplayerMode(false);
      if (isConnected) networkManager.disconnect();
      addLog("Starting Solo Sandbox", "info");
    } else {
      networkManager.joinRoom(roomId);
      setCurrentRoom(roomId);
      addLog(`Joined party: ${roomId.toUpperCase()}`, "success");
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    networkManager.joinRoom('');
    addLog("Returned to lobby", "info");
  };

  const handleConnect = async () => {
    if (isConnected) {
      networkManager.disconnect();
    } else {
      try {
        setStatus("Connecting to server...");
        networkManager.connect(serverUrl || "http://localhost:3000");
      } catch (err) {
        addLog("Connection failed: " + String(err), "error");
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await pyodideManager.init((msg, isError) => {
          addLog(msg, isError ? 'error' : 'info');
        });
        setStatus("Ready to compile");
        handleCompile(DEFAULT_CODE);
      } catch (err) {
        setStatus("Failed to load System: " + String(err));
      }
    };
    init();
  }, []);

  useEffect(() => {
    networkManager.setOnConnectionChange((connected) => {
      setIsConnected(connected);
      gameEngine.setMultiplayerMode(connected, networkManager.getPlayerId());
      if (connected) {
        addLog("Connected to Multiplayer Server!", "success");
      } else {
        addLog("Disconnected from Server", "warning");
      }
    });

    networkManager.setOnStateUpdate((state) => {
      // CRITICAL: Ensure engine knows our ID (arrives via init packet)
      const myId = networkManager.getPlayerId();
      if (myId) {
        gameEngine.setMultiplayerMode(isConnected, myId);
      }
      gameEngine.updateFromSnapshot(state);
    });
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-cyber-dark text-white font-sans overflow-hidden">
      {/* Dynamic Header */}
      <header className="h-14 border-b border-cyber-muted flex items-center px-6 justify-between bg-cyber-light shadow-md z-10 shrink-0">
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

          <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/30 border border-cyber-muted">
            {isConnected ? (
              <>
                <CheckCircle2 size={14} className="text-cyber-accent" />
                <span className="text-[10px] text-cyber-accent font-bold uppercase tracking-widest">Online</span>
              </>
            ) : (
              <>
                <LinkIcon size={14} className="text-cyber-danger" />
                <span className="text-[10px] text-cyber-danger font-bold uppercase tracking-widest">Offline</span>
              </>
            )}
          </div>

          {currentRoom && (
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-2 px-3 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 transition-colors text-sm font-bold"
            >
              <LogOut size={14} />
              EXIT TO HOME
            </button>
          )}
        </div>
      </header>

      {/* Main Content Areas */}
      <div className="flex-1 flex overflow-hidden relative">
        {!currentRoom ? (
          <Lobby
            isConnected={isConnected}
            onJoinRoom={handleJoinRoom}
            onConnect={handleConnect}
            serverUrl={serverUrl}
            setServerUrl={setServerUrl}
          />
        ) : (
          <>
            {/* Editor Pane (Left) */}
            <div className="w-1/2 min-w-[400px] h-full shadow-xl z-0 overflow-hidden flex flex-col border-r border-cyber-muted">
              <WeaponEditor code={code} onChange={(val) => setCode(val || "")} />
            </div>

            {/* Arena/Console Pane (Right) */}
            <div className="flex-1 h-full relative flex flex-col min-w-0">
              <div className="flex-1 relative bg-black/50 overflow-hidden">
                <Arena />
                {showDocs && <DocsPanel onClose={() => setShowDocs(false)} />}
              </div>
              <div className="h-48 shrink-0 border-t border-cyber-muted bg-cyber-dark/80">
                <Console logs={logs} onClear={() => setLogs([])} />
              </div>
            </div>

            {/* Contextual Actions (Floating) */}
            <div className="absolute top-4 right-4 flex gap-2 z-20">
              <button
                onClick={() => gameEngine.reset()}
                className="p-2 bg-cyber-light/90 border border-cyber-muted rounded-lg text-white hover:bg-cyber-muted transition-all backdrop-blur-sm"
                title="Reset Arena"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-cyber-accent text-black font-black px-4 py-2 rounded-lg shadow-xl shadow-cyber-accent/30 hover:bg-emerald-400 transition-all font-mono text-sm active:scale-95"
              >
                <Play size={14} fill="currentColor" />
                DEPLOY LOGIC
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
