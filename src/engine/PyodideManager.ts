import { loadPyodide, type PyodideInterface } from 'pyodide';

export interface WeaponScript {
    on_fire: (target_x: number, target_y: number, my_x: number, my_y: number) => any;
    on_hit: (target_id: string) => any;
    on_kill?: (target_id: string) => any;
    on_hit_wall?: (x: number, y: number) => void;
    on_damaged?: (attacker_id: string, amount: number) => void;
    update: (dt: number) => void;
    init: () => void;
}

class PyodideManager {
    private pyodide: PyodideInterface | null = null;
    private isReady = false;

    async init(onLog?: (msg: string, isError?: boolean) => void) {
        if (this.isReady) return;

        try {
            this.pyodide = await loadPyodide({
                // Use the matching version from package.json
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
                stdout: (text) => {
                    console.log("Python stdout:", text);
                    if (onLog) onLog(text, false);
                },
                stderr: (text) => {
                    console.warn("Python stderr:", text);
                    if (onLog) onLog(text, true);
                }
            });
            this.isReady = true;
            if (onLog) onLog("Pyodide environment initialized.", false);
            console.log("Pyodide initialized!");
        } catch (err) {
            const msg = "Failed to initialize Pyodide: " + String(err);
            console.error(msg);
            if (onLog) onLog(msg, true);
            throw err;
        }
    }

    async loadWeaponCode(code: string, api?: any, unlockedModules: string[] = []): Promise<WeaponScript | null> {
        if (!this.pyodide || !this.isReady) {
            console.warn("Pyodide not ready");
            return null;
        }

        try {
            // Check imports against unlocked modules
            const premiumModules: Record<string, string> = {
                'random': 'module_random',
                'cmath': 'module_cmath'
            };
            const importMatch = /(?:^|\n)\s*(?:import\s+([a-zA-Z0-9_, ]+)|from\s+([a-zA-Z0-9_]+)\s+import)/g;
            let match;
            while ((match = importMatch.exec(code)) !== null) {
                const modules = (match[1] || match[2]).split(',').map(s => s.trim());
                for (const mod of modules) {
                    if (premiumModules[mod] && !unlockedModules.includes(premiumModules[mod])) {
                        throw new Error(`Locked Module: '${mod}'. Unlock '${premiumModules[mod]}' in the shop first!`);
                    }
                }
            }

            // Create a clean namespace for the weapon
            const namespace = this.pyodide.toPy({});

            // Inject standard console
            namespace.set('console', this.pyodide.toPy(console));

            // Inject API
            if (api) {
                try {
                    console.log("Injecting API...");
                    // 1. Pass the raw JS API object
                    namespace.set('_js_api', this.pyodide.toPy(api));

                    // 2. Define Wrapper that handles _js_api as a Dictionary
                    await this.pyodide.runPythonAsync(`
class APIWrapper:
    def __init__(self, raw_api):
        self._raw = raw_api # Expecting a dict/map-like interface
        
    def _convert(self, val):
        try:
            return val.to_py()
        except Exception:
            pass
        if isinstance(val, list):
            return [self._convert(x) for x in val]
        return val

    # Explicit properties mapping to JS getters
    @property
    def player(self):
        func = self._raw.get('get_player')
        return self._convert(func()) if func else None

    @property
    def enemies(self):
        func = self._raw.get('get_enemies')
        return self._convert(func()) if func else []
        
    @property
    def arena(self):
        func = self._raw.get('get_arena_size')
        return self._convert(func()) if func else None

    @property
    def level(self):
        func = self._raw.get('get_level')
        return self._convert(func()) if func else 1

    @property
    def stats(self):
        func = self._raw.get('get_stats')
        return self._convert(func()) if func else {}

    def get_closest_enemy(self, x, y):
        func = self._raw.get('get_nearest_enemy')
        return self._convert(func(x, y)) if func else None
        
    def get_incoming_projectiles(self, x, y, range_val=200):
        func = self._raw.get('get_incoming_projectiles')
        return self._convert(func(x, y, range_val)) if func else []

    # Forward everything else (like .log(), .get_time(), .predict_position()) by looking up keys
    def __getattr__(self, name):
        val = self._raw.get(name) if isinstance(self._raw, dict) else getattr(self._raw, name, None)
        if val is not None:
            if callable(val):
                def wrapper(*args, **kwargs):
                    return self._convert(val(*args, **kwargs))
                return wrapper
            return self._convert(val)
        raise AttributeError(f"'APIWrapper' object has no attribute '{name}'")

api = APIWrapper(_js_api)
`, { globals: namespace });

                } catch (apiErr) {
                    console.error("API Injection error:", apiErr);
                    throw apiErr;
                }
            }

            // Execute the user code
            await this.pyodide.runPythonAsync(code, { globals: namespace });

            // Extract the Weapon class (assuming user must define 'class Weapon')
            // For simplicity, we might ask them to modify a global 'weapon' object or similar.
            // Better approach: User defines 'class Weapon', we instantiate it.

            // Check if 'Weapon' class exists
            const WeaponClass = namespace.get('Weapon');
            if (!WeaponClass) {
                throw new Error("Code must define a 'class Weapon'");
            }

            const weaponInstance = WeaponClass();

            // --- DRONE: Check if user also defined a 'class Drone' ---
            let droneInstance: any = null;
            const DroneClass = namespace.get('Drone');
            if (DroneClass) {
                try {
                    droneInstance = DroneClass();
                    console.log('[PYODIDE] Drone class detected and instantiated.');
                } catch (droneErr) {
                    console.warn('[PYODIDE] Failed to instantiate Drone:', droneErr);
                }
            }

            // Map Python methods to JS interface
            const script: any = {
                on_fire: (tx: number, ty: number, mx: number, my: number) => {
                    if (weaponInstance.on_fire) {
                        return weaponInstance.on_fire(tx, ty, mx, my);
                    }
                    return null;
                },
                on_hit: (tid: string) => {
                    if (weaponInstance.on_hit) return weaponInstance.on_hit(tid);
                },
                on_kill: (tid: string) => {
                    if (weaponInstance.on_kill) return weaponInstance.on_kill(tid);
                },
                on_hit_wall: (x: number, y: number) => {
                    if (weaponInstance.on_hit_wall) weaponInstance.on_hit_wall(x, y);
                },
                update: (dt: number) => {
                    if (weaponInstance.update) weaponInstance.update(dt);
                },
                init: () => {
                    if (weaponInstance.init) weaponInstance.init();
                },
                // Drone scripting hook
                drone_update: droneInstance ? (dt: number, dx: number, dy: number) => {
                    if (droneInstance.update) return droneInstance.update(dt, dx, dy);
                    return null;
                } : null,
                hasDrone: !!droneInstance,
            };

            return script as WeaponScript;

        } catch (err) {
            console.error("Error loading weapon code:", err);
            return null;
        }
    }
}

export const pyodideManager = new PyodideManager();
