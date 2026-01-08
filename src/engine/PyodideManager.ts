import { loadPyodide, type PyodideInterface } from 'pyodide';

export interface WeaponScript {
    on_fire: (target_x: number, target_y: number, my_x: number, my_y: number) => any;
    on_hit: (target_id: string) => any;
    on_kill?: (target_id: string) => any;
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

    async loadWeaponCode(code: string, api?: any): Promise<WeaponScript | null> {
        if (!this.pyodide || !this.isReady) {
            console.warn("Pyodide not ready");
            return null;
        }

        try {
            // Create a clean namespace for the weapon
            const namespace = this.pyodide.toPy({});

            // Inject standard console
            namespace.set('console', this.pyodide.toPy(console));

            // Inject API
            if (api) {
                try {
                    console.log("Injecting API...");
                    // 1. Pass the raw JS API object to Python as a hidden variable
                    // This creates a JsProxy in Python
                    namespace.set('_js_api', this.pyodide.toPy(api));

                    // 2. Define the Wrapper Class in Python
                    // This wrapper creates a "pythonic" interface that bridges property access
                    // to the JavaScript getter functions, satisfying the user's diagnostic script.
                    await this.pyodide.runPythonAsync(`
class APIWrapper:
    def __init__(self, js_api):
        self._api = js_api

    # Explicit properties mapping to JS getters
    @property
    def player(self):
        return self._api.get_player()

    @property
    def enemies(self):
        return self._api.get_enemies()
        
    @property
    def arena(self):
        return self._api.get_arena_size()

    # Forward everything else (like .log(), .get_time())
    def __getattr__(self, name):
        return getattr(self._api, name)

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

            // Map Python methods to JS interface
            return {
                on_fire: (tx, ty, mx, my) => {
                    if (weaponInstance.on_fire) {
                        return weaponInstance.on_fire(tx, ty, mx, my);
                    }
                    return null;
                },
                on_hit: (tid) => {
                    if (weaponInstance.on_hit) return weaponInstance.on_hit(tid);
                },
                on_kill: (tid) => {
                    if (weaponInstance.on_kill) return weaponInstance.on_kill(tid);
                },
                update: (dt) => {
                    if (weaponInstance.update) weaponInstance.update(dt);
                },
                init: () => {
                    if (weaponInstance.init) weaponInstance.init();
                }
            };

        } catch (err) {
            console.error("Error loading weapon code:", err);
            return null;
        }
    }
}

export const pyodideManager = new PyodideManager();
