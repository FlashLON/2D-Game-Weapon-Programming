// PyodideManager.ts (TypeScript)
// Requires: npm i pyodide (or have loadPyodide available in runtime)
import { loadPyodide, type PyodideInterface } from "pyodide";

export interface WeaponScript {
  on_fire: (tx: number, ty: number, mx: number, my: number) => any | null;
  on_hit: (target_id: string) => any | null;
  on_kill: (target_id: string) => any | null;
  update: (dt: number) => void;
  init: () => void;
}

export class PyodideManager {
  private pyodide: PyodideInterface | null = null;
  private isReady = false;

  async init(onLog?: (msg: string, isError?: boolean) => void) {
    if (this.isReady) return;
    try {
      this.pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
      });
      this.isReady = true;
      onLog?.("Pyodide environment initialized.", false);
      console.log("Pyodide initialized");
    } catch (err) {
      const msg = "Failed to initialize Pyodide: " + String(err);
      console.error(msg);
      onLog?.(msg, true);
      throw err;
    }
  }

  /**
   * Load Python weapon code, optionally exposing a JS api object to Python as `api`.
   * Returns a JS wrapper implementing WeaponScript or null on failure.
   */
  async loadWeaponCode(code: string, api?: any, onLog?: (msg: string, isError?: boolean) => void): Promise<WeaponScript | null> {
    if (!this.pyodide || !this.isReady) {
      onLog?.("Pyodide not ready", true);
      return null;
    }

    try {
      // Ensure globals is the Pyodide global mapping
      const globals = this.pyodide.globals;

      // Expose console (JS) to python as "console" so python code can call console.log if wanted
      try {
        globals.set("console", this.pyodide.toPy(console));
      } catch (e) {
        // not fatal
        console.warn("Could not set console in python globals:", e);
      }

      // If a JS API object is provided, expose it as _js_api and wrap it in python
      if (api) {
        try {
          globals.set("_js_api", this.pyodide.toPy(api));
          // Create a thin wrapper API on python side (APIWrapper -> api)
          await this.pyodide.runPythonAsync(
            `
class APIWrapper:
    def __init__(self, js_api):
        self._api = js_api
    def __getattr__(self, name):
        # Forward attribute access to the JS object
        return getattr(self._api, name)

# Construct 'api' object for user scripts
try:
    api = APIWrapper(_js_api)
except Exception as e:
    print("API wrapper creation failed:", e)
`,
            { globals }
          );
        } catch (e) {
          console.warn("Failed to expose JS API to python:", e);
        }
      }

      // Run the user's code inside the pyodide global namespace.
      // Note: this will define classes/functions in python globals (Weapon etc.)
      await this.pyodide.runPythonAsync(code, { globals });

      // Instantiate Weapon() and create safe python wrappers that catch exceptions.
      // The wrappers will be _call_on_fire, _call_on_hit, _call_on_kill, _call_update, _call_init
      await this.pyodide.runPythonAsync(
        `
# Try to instantiate Weapon. Any error is printed.
weapon_instance = None
try:
    if 'Weapon' in globals():
        weapon_instance = Weapon()
    else:
        print("Error: No class named 'Weapon' defined.")
except Exception as e:
    print("Weapon instantiation error:", e)

# Safe wrappers that call methods if present and catch exceptions
def _call_on_fire(tx, ty, mx, my):
    try:
        if weapon_instance is not None and hasattr(weapon_instance, "on_fire"):
            return weapon_instance.on_fire(tx, ty, mx, my)
    except Exception as e:
        print("Error in on_fire:", e)
    return None

def _call_on_hit(tid):
    try:
        if weapon_instance is not None and hasattr(weapon_instance, "on_hit"):
            return weapon_instance.on_hit(tid)
    except Exception as e:
        print("Error in on_hit:", e)
    return None

def _call_on_kill(tid):
    try:
        if weapon_instance is not None and hasattr(weapon_instance, "on_kill"):
            return weapon_instance.on_kill(tid)
    except Exception as e:
        print("Error in on_kill:", e)
    return None

def _call_update(dt):
    try:
        if weapon_instance is not None and hasattr(weapon_instance, "update"):
            return weapon_instance.update(dt)
    except Exception as e:
        print("Error in update:", e)
    return None

def _call_init():
    try:
        if weapon_instance is not None and hasattr(weapon_instance, "init"):
            return weapon_instance.init()
    except Exception as e:
        print("Error in init:", e)
    return None
`,
        { globals }
      );

      // Grab the wrapper callables from python globals
      const callOnFire = globals.get("_call_on_fire");
      const callOnHit = globals.get("_call_on_hit");
      const callOnKill = globals.get("_call_on_kill");
      const callUpdate = globals.get("_call_update");
      const callInit = globals.get("_call_init");

      // Create JS wrapper that calls the python wrappers and converts results to JS.
      const wrap = {
        on_fire: (tx: number, ty: number, mx: number, my: number) => {
          try {
            const res = callOnFire.call(undefined, tx, ty, mx, my);
            // convert PyProxy result to JS value (safe check)
            return res === null || res === undefined ? null : res.toJs ? res.toJs() : res;
          } catch (err) {
            console.error("Error calling python on_fire wrapper:", err);
            onLog?.("Error calling python on_fire wrapper: " + String(err), true);
            return null;
          }
        },
        on_hit: (tid: string) => {
          try {
            const res = callOnHit.call(undefined, tid);
            return res === null || res === undefined ? null : res.toJs ? res.toJs() : res;
          } catch (err) {
            console.error("Error calling python on_hit wrapper:", err);
            onLog?.("Error calling python on_hit wrapper: " + String(err), true);
            return null;
          }
        },
        on_kill: (tid: string) => {
          try {
            const res = callOnKill.call(undefined, tid);
            return res === null || res === undefined ? null : res.toJs ? res.toJs() : res;
          } catch (err) {
            console.error("Error calling python on_kill wrapper:", err);
            onLog?.("Error calling python on_kill wrapper: " + String(err), true);
            return null;
          }
        },
        update: (dt: number) => {
          try {
            // callUpdate may return None; ignore result
            callUpdate.call(undefined, dt);
          } catch (err) {
            console.error("Error calling python update wrapper:", err);
            onLog?.("Error calling python update wrapper: " + String(err), true);
          }
        },
        init: () => {
          try {
            callInit.call(undefined);
          } catch (err) {
            console.error("Error calling python init wrapper:", err);
            onLog?.("Error calling python init wrapper: " + String(err), true);
          }
        },
      } as WeaponScript;

      onLog?.("Weapon code loaded successfully.", false);
      return wrap;
    } catch (err) {
      console.error("Error loading weapon code:", err);
      onLog?.("Error loading weapon code: " + String(err), true);
      return null;
    }
  }
}

// Export a singleton if you want
export const pyodideManager = new PyodideManager();
