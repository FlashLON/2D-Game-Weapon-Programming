// Fixes applied:
// 1. Defensive checks for Python method existence (using hasattr) to avoid runtime errors.
// 2. Ensured Weapon class instantiation works even if user code does not define all methods.
// 3. Improved error handling and logging for Python-JS interop.

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
            const namespace = this.pyodide.toPy({});
            namespace.set('console', this.pyodide.toPy(console));

            if (api) {
                namespace.set('_js_api', this.pyodide.toPy(api));
                await this.pyodide.runPythonAsync(`
import types
class APIWrapper:
    def __init__(self, js_api):
        self._api = js_api
    def __getattr__(self, name):
        return getattr(self._api, name)

api = APIWrapper(_js_api)
`, { globals: namespace });
            }

            await this.pyodide.runPythonAsync(code, { globals: namespace });

            const WeaponClass = namespace.get('Weapon');
            if (!WeaponClass) {
                throw new Error("Code must define a 'class Weapon'");
            }

            const weaponInstance = WeaponClass();

            // Defensive: Use hasattr to check for method existence
            return {
                on_fire: (tx, ty, mx, my) => {
                    try {
                        if (weaponInstance.hasattr && weaponInstance.hasattr('on_fire')) {
                            return weaponInstance.get('on_fire')(tx, ty, mx, my);
                        } else if (weaponInstance.on_fire) {
                            return weaponInstance.on_fire(tx, ty, mx, my);
                        }
                    } catch (err) {
                        console.error("Error in weaponInstance.on_fire:", err);
                    }
                    return null;
                },
                on_hit: (tid) => {
                    try {
                        if (weaponInstance.hasattr && weaponInstance.hasattr('on_hit')) {
                            return weaponInstance.get('on_hit')(tid);
                        } else if (weaponInstance.on_hit) {
                            return weaponInstance.on_hit(tid);
                        }
                    } catch (err) {
                        console.error("Error in weaponInstance.on_hit:", err);
                    }
                },
                on_kill: (tid) => {
                    try {
                        if (weaponInstance.hasattr && weaponInstance.hasattr('on_kill')) {
                            return weaponInstance.get('on_kill')(tid);
                        } else if (weaponInstance.on_kill) {
                            return weaponInstance.on_kill(tid);
                        }
                    } catch (err) {
                        console.error("Error in weaponInstance.on_kill:", err);
                    }
                },
                update: (dt) => {
                    try {
                        if (weaponInstance.hasattr && weaponInstance.hasattr('update')) {
                            return weaponInstance.get('update')(dt);
                        } else if (weaponInstance.update) {
                            return weaponInstance.update(dt);
                        }
                    } catch (err) {
                        console.error("Error in weaponInstance.update:", err);
                    }
                },
                init: () => {
                    try {
                        if (weaponInstance.hasattr && weaponInstance.hasattr('init')) {
                            return weaponInstance.get('init')();
                        } else if (weaponInstance.init) {
                            return weaponInstance.init();
                        }
                    } catch (err) {
                        console.error("Error in weaponInstance.init:", err);
                    }
                }
            };

        } catch (err) {
            console.error("Error loading weapon code:", err);
            return null;
        }
    }
}

export const pyodideManager = new PyodideManager();
