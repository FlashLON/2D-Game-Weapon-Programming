const { loadPyodide } = require("pyodide");

async function test() {
    const pyodide = await loadPyodide();
    const namespace = pyodide.toPy({});
    
    // Simulate API injection
    const api = {
        get_nearest_enemy: (x, y) => ({ id: "e1", x: 100, y: 100, hp: 50, dist: 50 }),
        get_enemies: () => [{ id: "e1", x: 100, y: 100, hp: 50, dist: 50 }],
        predict_position: (id, speed) => ({ x: 150, y: 150 })
    };
    
    namespace.set('_js_api', pyodide.toPy(api));
    
    await pyodide.runPythonAsync(`
class APIWrapper:
    def __init__(self, raw_api):
        self._raw = raw_api # Expecting a dict/map-like interface
        
    def _convert(self, val):
        try:
            return val.to_py()
        except Exception as e:
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

    def get_closest_enemy(self, x, y):
        func = self._raw.get('get_nearest_enemy')
        return self._convert(func(x, y)) if func else None

    def __getattr__(self, name):
        print(f"getattr called for {name}, raw is type {type(self._raw)}")
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

    const code = `
class Drone:
    def __init__(self):
        self.fire_timer = 0
    
    def update(self, dt, drone_x, drone_y):
        self.fire_timer += dt
        if self.fire_timer >= 0.8:
            self.fire_timer = 0
            nearest = api.get_nearest_enemy(drone_x, drone_y)
            if nearest:
                import math
                angle = math.degrees(math.atan2(
                    nearest['y'] - drone_y,
                    nearest['x'] - drone_x
                ))
                return {
                    "speed": 400,
                    "angle": angle,
                    "damage": 10,
                    "color": "#00e5ff"
                }
        return None

class Weapon:
    def __init__(self):
        self.msg = "Predator Missile + Drone Ready"

    def on_fire(self, tx, ty, mx, my):
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
            }
            
        return {"speed": 500, "angle": 0}

    def on_hit(self, target_id):
        pass

    def update(self, dt):
        pass
    `;

    try {
        await pyodide.runPythonAsync(code, { globals: namespace });
        
        const WeaponClass = namespace.get('Weapon');
        const weapon = WeaponClass();
        
        console.log("Compilation Successful!");
        
        // test firing
        const result = weapon.on_fire(200, 200, 0, 0);
        console.log("Fire result:", result.toJs ? result.toJs() : result);
        
    } catch(err) {
        console.error("Compilation failed:", err);
    }
}
test();
