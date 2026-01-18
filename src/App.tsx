import { useEffect, useState } from 'react';
import { WeaponEditor } from './components/WeaponEditor';
import { Arena } from './components/Arena';
import { Lobby } from './components/Lobby';
import { LevelUpModal } from './components/LevelUpModal';
import { Console, type LogMessage, type LogType } from './components/Console';
import { pyodideManager } from './engine/PyodideManager';
import { gameEngine } from './engine/GameEngine';
import { networkManager } from './utils/NetworkManager';
import { ATTRIBUTES, getUpgradeCost } from './utils/AttributeRegistry';
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

  // User Profile State (Persisted)
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : {
      level: 1,
      xp: 0,
      maxXp: 100,
      money: 0,
      unlocks: ['speed', 'damage'],
      limits: { speed: 200, damage: 5 }
    };
  });
  const [username, setUsername] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('user_profile', JSON.stringify(userProfile));

    // Sync to server if logged in
    if (isLoggedIn && networkManager.isConnected()) {
      networkManager.saveProfile(userProfile);
    }
  }, [userProfile, isLoggedIn]);

  const handleProfileUpdate = (newProfile: any) => {
    setUserProfile((prev: any) => ({
      ...prev,
      ...newProfile
    }));
  };

  const handleCardSelect = (type: 'unlock' | 'upgrade', attributeId: string, value: number) => {
    setUserProfile((prev: any) => {
      const newUnlocks = type === 'unlock' && !prev.unlocks.includes(attributeId)
        ? [...prev.unlocks, attributeId]
        : prev.unlocks;

      const newLimits = {
        ...prev.limits,
        [attributeId]: value
      };

      return {
        ...prev,
        unlocks: newUnlocks,
        limits: newLimits
      };
    });

    addLog(`${type === 'unlock' ? 'Unlocked' : 'Upgraded'} ${attributeId}!`, 'success');
  };

  const handleUpgrade = (attributeId: string) => {
    const attr = ATTRIBUTES[attributeId];
    if (!attr) return;

    const currentLimit = userProfile.limits[attributeId] || 0;
    const cost = getUpgradeCost(attributeId, currentLimit);

    if (userProfile.money < cost) {
      addLog(`Not enough money! Need $${cost.toLocaleString()}`, 'error');
      return;
    }

    if (currentLimit >= attr.maxLimit) {
      addLog(`${attr.name} is already maxed out!`, 'warning');
      return;
    }

    const newLimit = currentLimit + attr.upgradeStep;

    setUserProfile((prev: any) => ({
      ...prev,
      money: prev.money - cost,
      limits: {
        ...prev.limits,
        [attributeId]: newLimit
      }
    }));

    addLog(`Upgraded ${attr.name} to ${newLimit}!`, 'success');
  };

  // ENFORCEMENT LOGIC (Shared for api.spawn_projectile and gameEngine.fireWeapon)
  const enforceProjectileLimits = (params: any) => {
    const profile = userProfile;
    const limits = profile.limits || {};
    const unlocks = profile.unlocks || [];
    const p = { ...params };

    // 1. Enforce Speed (Magnitude of velocity if speed isn't provided)
    const speedLimit = unlocks.includes('speed') ? (limits['speed'] || 0) : 0;

    if (p.vx !== undefined && p.vy !== undefined) {
      const mag = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (mag > speedLimit) {
        const factor = speedLimit / mag;
        p.vx *= factor;
        p.vy *= factor;
      }
    } else if (p.speed !== undefined) {
      p.speed = Math.min(p.speed, speedLimit);
    }

    // 2. Dynamically enforce all other attributes
    Object.keys(ATTRIBUTES).forEach(attrId => {
      if (attrId === 'speed') return; // Handled above
      if (attrId in p) {
        const limit = unlocks.includes(attrId) ? (limits[attrId] || 0) : 0;
        p[attrId] = Math.min(p[attrId], limit);
      }
    });

    return p;
  };

  useEffect(() => {
    gameEngine.setEnforcer(enforceProjectileLimits);
  }, [userProfile]); // Update enforcer whenever profile changes

  // Define API for Python environment
  const api = {
    log: (msg: string) => {
      console.log("PY:", msg);
      addLog(msg, 'info');
    },
    get_nearest_enemy: (x: number, y: number) => gameEngine.getNearestEnemy(x, y),
    get_entities_in_range: (x: number, y: number, range: number) => gameEngine.getEntitiesInRange(x, y, range),
    get_projectiles: () => gameEngine.getAllProjectiles(),
    get_enemies: () => gameEngine.getEnemies().map(e => ({ id: e.id, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp })),
    get_players: () => gameEngine.getPlayers().map(p => ({ id: p.id, x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp })),
    get_self: () => gameEngine.getPlayer(),
    get_arena_size: () => gameEngine.getArenaBounds(),
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
    predict_position: (targetId: string, bulletSpeed: number) => {
      const target = gameEngine.getEnemies().find(e => e.id === targetId) ||
        gameEngine.getPlayers().find(p => p.id === targetId);
      if (!target) return null;

      const player = gameEngine.getPlayer();
      if (!player) return null;

      const dx = target.x - player.x;
      const dy = target.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const speedLimit = userProfile.unlocks.includes('speed') ? (userProfile.limits['speed'] || 0) : 0;
      const effectiveSpeed = Math.min(bulletSpeed || 0, speedLimit);

      const timeToHit = dist / (effectiveSpeed || 1);
      const vel = (target as any).velocity || { x: 0, y: 0 };

      return {
        x: target.x + (vel.x * timeToHit),
        y: target.y + (vel.y * timeToHit)
      };
    },
    get_closest_projectile: () => {
      const player = gameEngine.getPlayer();
      if (!player) return null;
      return gameEngine.getClosestProjectile(player.x, player.y);
    },
    get_last_hit_info: () => gameEngine.getLastHitInfo(),
    get_leaderboard: () => gameEngine.getState().leaderboard || [],
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

  const handleJoinRoom = (roomId: string, settings?: any) => {
    if (roomId === 'offline') {
      setCurrentRoom('offline');
      gameEngine.setMultiplayerMode(false);
      addLog("Starting Solo Sandbox", "info");
    } else {
      networkManager.joinRoom(roomId, settings, userProfile);
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
      const myId = networkManager.getPlayerId();
      if (myId) {
        gameEngine.setMultiplayerMode(isConnected, myId);
      }
      gameEngine.updateFromSnapshot(state);
    });

    const handleVisualEffect = (effect: any) => {
      if (effect.type === 'impact') {
        gameEngine.spawnParticles(effect.x, effect.y, effect.color, 10);
        gameEngine.addGridImpulse(effect.x, effect.y, effect.strength, effect.radius);
      } else if (effect.type === 'explosion') {
        gameEngine.spawnParticles(effect.x, effect.y, effect.color, 15);
        gameEngine.addGridImpulse(effect.x, effect.y, effect.strength, effect.radius);
      } else if (effect.type === 'levelup') {
        gameEngine.spawnParticles(effect.x, effect.y, effect.color, 30);
        gameEngine.addGridImpulse(effect.x, effect.y, effect.strength, effect.radius);
        addLog(`LEVEL UP! You reached Level ${effect.level}`, 'success');

        if (effect.playerId === networkManager.getPlayerId() || !isConnected) {
          handleProfileUpdate({
            level: effect.level,
            xp: effect.xp,
            maxXp: effect.maxXp,
            money: effect.money
          });
          setShowLevelUpModal(true);
        }
      }
    };

    networkManager.setOnVisualEffect(handleVisualEffect);
    gameEngine.onVisualEffect = handleVisualEffect;

    networkManager.setOnLoginResponse((res) => {
      if (res.success) {
        addLog("Cloud Login Successful!", "success");
        setUserProfile(res.profile);
        setIsLoggedIn(true);
      } else {
        addLog(`Login Failed: ${res.error}`, "error");
      }
    });
  }, [isConnected]);

  const handleLogin = async (name: string) => {
    if (!name) return;
    if (!isConnected) {
      addLog("Connecting to server...", "info");
      await handleConnect();
    }

    setTimeout(() => {
      if (networkManager.isConnected()) {
        setUsername(name);
        networkManager.login(name);
        addLog(`Logging in as ${name}...`, "info");
      } else {
        addLog("Connection failed. Please try again.", "error");
      }
    }, 500);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-cyber-dark text-white font-sans overflow-hidden">
      <header className="h-14 border-b border-cyber-muted flex items-center px-6 justify-between bg-cyber-light shadow-md z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyber-accent to-blue-500 flex items-center justify-center font-bold text-black border border-white/20">
            CA
          </div>
          <h1 className="font-bold text-lg tracking-wide">CodeCombat <span className="text-cyber-accent">Arena</span></h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4 px-3 py-1 rounded bg-[#0a0a0c] border border-cyber-muted/50">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-blue-400">LVL {userProfile.level}</span>
            <span className="text-cyber-muted text-[10px] mx-1">|</span>
            <span className="text-xs font-bold text-yellow-400">XP {Math.floor(userProfile.xp)}</span>
            <span className="text-cyber-muted text-[10px] mx-1">|</span>
            <span className="text-xs font-bold text-emerald-400">${userProfile.money.toLocaleString()}</span>
          </div>

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

      <div className="flex-1 flex overflow-hidden relative">
        {!currentRoom ? (
          <Lobby
            isConnected={isConnected}
            onJoinRoom={handleJoinRoom}
            onConnect={handleConnect}
            serverUrl={serverUrl}
            setServerUrl={setServerUrl}
            userProfile={userProfile}
            onLogin={handleLogin}
            isLoggedIn={isLoggedIn}
            username={username}
            onUpgrade={handleUpgrade}
          />
        ) : (
          <>
            <div className="w-1/2 min-w-[400px] h-full shadow-xl z-0 overflow-hidden flex flex-col border-r border-cyber-muted">
              <WeaponEditor code={code} onChange={(val) => setCode(val || "")} />
            </div>

            <div className="flex-1 h-full relative flex flex-col min-w-0">
              <div className="flex-1 relative bg-black/50 overflow-hidden">
                <Arena />
                {showDocs && <DocsPanel onClose={() => setShowDocs(false)} userProfile={userProfile} />}
              </div>
              <div className="h-48 shrink-0 border-t border-cyber-muted bg-cyber-dark/80">
                <Console logs={logs} onClear={() => setLogs([])} />
              </div>
            </div>

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

      {showLevelUpModal && (
        <LevelUpModal
          userProfile={userProfile}
          onSelectCard={handleCardSelect}
          onClose={() => setShowLevelUpModal(false)}
        />
      )}
    </div>
  );
}

export default App;
