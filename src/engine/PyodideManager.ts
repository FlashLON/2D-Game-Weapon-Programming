// PyodideManager.ts
import { loadPyodide, type PyodideInterface } from "pyodide";

export interface WeaponScript {
  on_fire: (tx: number, ty: number, mx: number, my: number) => any | null;
  on_hit: (tid: string) => any | null;
  on_kill: (tid: string) => any | null;
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
   * Load user Python weapon code and expose optional JS API object (`api`) to Python.
   * Provides snake_case -> camelCase resolution for JS API calls from Python.
   */
  async loadWeaponCode(code: string, api?: any, onLog?: (msg: string, isError?: boolean) => void): Promise<WeaponScript | null> {
    if (!this.pyodide || !this.isReady) {
      onLog?.("Pyodide not ready", true);
      return null;
    }

    try {
      const globals = this.pyodide.globals;

      // expose console to python (optional)
      try {
        globals.set("console", this.pyodide.toPy(console));
      } catch (e) {
        console.warn("Could not set console in python globals:", e);
      }

      // If a JS API object was provided, expose it and create a Python wrapper that maps snake_case -> camelCase
      if (api) {
        try {
          globals.set("_js_api", this.pyodide.toPy(api));
          await this.pyodide.runPythonAsync(
            `
class APIWrapper:
    def __init__(self, js_api):
        self._api = js_api

    def _to_camel(self, name):
        parts = name.split('_')
        if len(parts) == 1:
            return name
        return parts[0] + ''.join(p.title() for p in parts[1:])

    def __getattr__(self, name):
        # Try original name first
        try:
            return getattr(self._api, name)
        except Exception:
            pass
        # Try camelCase conversion (getEnemies -> get_enemies maps back)
        try:
            camel = self._to_camel(name)
            return getattr(self._api, camel)
        except Exception:
            pass
        # If not found, raise attribute error so python code sees the missing method
        raise AttributeError(f"JS API has no attribute '{name}' or '{camel}'")

# make 'api' variable available to user scripts
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

      // Run user's code in pyodide globals
      await this.pyodide.runPythonAsync(code, { globals });

      // Create safe python-side wrappers that call Weapon methods and catch exceptions.
      await this.pyodide.runPythonAsync(
        `
weapon_instance = None
try:
    if 'Weapon' in globals():
        weapon_instance = Weapon()
    else:
        print("Error: No class named 'Weapon' defined in script.")
except Exception as e:
    print("Weapon instantiation error:", e)

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

      // Grab Python callables
      const callOnFire = globals.get("_call_on_fire");
      const callOnHit = globals.get("_call_on_hit");
      const callOnKill = globals.get("_call_on_kill");
      const callUpdate = globals.get("_call_update");
      const callInit = globals.get("_call_init");

      // JS wrapper that calls python wrappers and converts results safely
      const wrap: WeaponScript = {
        on_fire: (tx: number, ty: number, mx: number, my: number) => {
          try {
            const res = callOnFire.call(undefined, tx, ty, mx, my);
            if (res === null || res === undefined) return null;
            return res.toJs ? res.toJs() : res;
          } catch (err) {
            console.error("Error calling python on_fire wrapper:", err);
            onLog?.("Error calling python on_fire wrapper: " + String(err), true);
            return null;
          }
        },
        on_hit: (tid: string) => {
          try {
            const res = callOnHit.call(undefined, tid);
            if (res === null || res === undefined) return null;
            return res.toJs ? res.toJs() : res;
          } catch (err) {
            console.error("Error calling python on_hit wrapper:", err);
            onLog?.("Error calling python on_hit wrapper: " + String(err), true);
            return null;
          }
        },
        on_kill: (tid: string) => {
          try {
            const res = callOnKill.call(undefined, tid);
            if (res === null || res === undefined) return null;
            return res.toJs ? res.toJs() : res;
          } catch (err) {
            console.error("Error calling python on_kill wrapper:", err);
            onLog?.("Error calling python on_kill wrapper: " + String(err), true);
            return null;
          }
        },
        update: (dt: number) => {
          try {
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
      };

      onLog?.("Weapon code loaded successfully.", false);
      return wrap;
    } catch (err) {
      console.error("Error loading weapon code:", err);
      onLog?.("Error loading weapon code: " + String(err), true);
      return null;
    }
  }
}

export const pyodideManager = new PyodideManager();
