# Weapon Game - Multiplayer Edition

A browser-based multiplayer game where you can script custom weapons using Python and battle with friends in real-time!

## 🎮 Features

- **Custom Weapon Scripting**: Write Python code to create unique weapons
- **Real-time Multiplayer**: Play with friends online
- **Advanced Projectile Physics**: Homing, acceleration, lifetime control
- **WASD Movement**: Smooth player controls
- **Modern UI**: Cyberpunk-themed interface

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:5173 in your browser.

## 🎯 How to Play

### Single Player Mode
1. **Move**: Use WASD keys
2. **Fire**: Click anywhere in the arena
3. **Edit Weapon**: Modify the Python code in the editor
4. **Deploy**: Click "DEPLOY WEAPON" to test your changes

### Multiplayer Mode (Coming Soon)
- Connect with friends online
- See other players in real-time
- Compete for the highest score

## 🐍 Weapon Scripting Guide

### Basic Weapon Structure

```python
import math

class Weapon:
    def __init__(self):
        self.damage = 25
        self.speed = 400
        api.log("Weapon ready!")

    def on_fire(self, target_x, target_y, my_x, my_y):
        # Calculate angle to target
        dx = target_x - my_x
        dy = target_y - my_y
        angle = math.degrees(math.atan2(dy, dx))
        
        return {
            "speed": self.speed,
            "angle": angle,
            "damage": self.damage,
            "color": "#fce83a",
            "radius": 5
        }

    def on_kill(self, target_id):
        api.log(f"Eliminated {target_id}!")

    def update(self, dt):
        pass
```

### Available API Methods

- `api.log(message)` - Print to console
- `api.get_enemies()` - Get list of all enemies
- `api.get_nearest_enemy(x, y)` - Find closest enemy
- `api.get_player()` - Get player info
- `api.get_arena_size()` - Get arena dimensions
- `api.rand_float()` - Random number 0.0-1.0

### Projectile Properties

| Property | Type | Description |
|----------|------|-------------|
| `speed` | number | Pixels per second |
| `angle` | number | Direction in degrees |
| `damage` | number | Damage dealt on hit |
| `color` | string | Hex color code |
| `radius` | number | Projectile size |
| `homing` | number | Steering strength (0 = none) |
| `lifetime` | number | Seconds before despawn |
| `acceleration` | number | Speed multiplier per second |
| `knockback` | number | Push force on hit |
| `pierce` | number | Targets to hit before destroying |

## 📁 Project Structure

```
roblox-game/
├── src/
│   ├── components/
│   │   ├── Arena.tsx          # Game canvas and rendering
│   │   ├── WeaponEditor.tsx   # Code editor
│   │   ├── Console.tsx        # Debug console
│   │   └── DocsPanel.tsx      # Documentation
│   ├── engine/
│   │   ├── GameEngine.ts      # Core game logic
│   │   └── PyodideManager.ts  # Python interpreter
│   ├── App.tsx                # Main application
│   └── main.tsx               # Entry point
├── public/                     # Static assets
├── package.json               # Dependencies
└── vite.config.ts             # Build configuration
```

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Code Editor**: Monaco Editor
- **Python Runtime**: Pyodide (Python in WebAssembly)
- **Game Loop**: RequestAnimationFrame

## 📚 Documentation

- [Multiplayer Guide](MULTIPLAYER_GUIDE.md) - How to add multiplayer
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Deploy to Vercel + Railway
- [Implementation Plan](IMPLEMENTATION_PLAN.md) - Multiplayer roadmap

## 🚀 Deployment

### Deploy to Vercel (Frontend)
```bash
npm install -g vercel
vercel --prod
```

### Deploy to Railway (Backend - Coming Soon)
See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for details.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📝 License

MIT License - feel free to use this project for learning or building your own games!

## 🎓 Learning Resources

- [Pyodide Documentation](https://pyodide.org/)
- [Socket.IO Guide](https://socket.io/docs/)
- [Game Development Patterns](https://gameprogrammingpatterns.com/)

## 🐛 Known Issues

- Custom weapon scripts are client-side only (multiplayer will use preset weapons)
- Server may sleep after 15-30 minutes of inactivity (free tier limitation)

## 🔮 Roadmap

- [x] Single player mode
- [x] Custom weapon scripting
- [x] Advanced projectile physics
- [x] WASD movement
- [ ] Multiplayer support
- [ ] Matchmaking/lobbies
- [ ] Leaderboards
- [ ] More enemy types
- [ ] Power-ups

## 💬 Support

If you have questions or need help:
1. Check the [Documentation](DEPLOYMENT_GUIDE.md)
2. Open an issue on GitHub
3. Join our community (coming soon)

---

**Made with ❤️ using React, TypeScript, and Pyodide**
