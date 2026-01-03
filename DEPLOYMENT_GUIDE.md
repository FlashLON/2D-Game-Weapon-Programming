# Free Multiplayer Hosting Guide

## Can I Host Multiplayer Online (Not on My Computer)?

**YES!** You can host your multiplayer game completely free using modern cloud platforms. Here's how:

---

## The Two Parts You Need to Host

### 1. **Frontend (React Game Client)**
- This is what players see in their browser
- Can be hosted on **GitHub Pages**, **Vercel**, or **Netlify**
- ✅ **100% Free Forever**

### 2. **Backend (Game Server)**
- This runs the multiplayer logic
- Needs to be "always on" to handle connections
- Can be hosted on **Railway**, **Render**, or **Fly.io**
- ✅ **Free tier available** (with limitations)

---

## 🎯 Recommended Setup (Easiest)

### **Frontend: Vercel** (connected to GitHub)
### **Backend: Railway** (connected to GitHub)

Both auto-deploy when you push to GitHub!

---

## Step-by-Step Deployment Guide

### **Step 1: Push Your Code to GitHub**

```bash
# In your project folder
git init
git add .
git commit -m "Initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

### **Step 2: Deploy Frontend to Vercel**

#### Option A: Using Vercel Website (Easiest)
1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account
3. Click **"New Project"**
4. Select your repository
5. Vercel auto-detects Vite settings
6. Click **"Deploy"**
7. Done! Your game is live at `https://your-game.vercel.app`

#### Option B: Using Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Your frontend is now live!** But it won't have multiplayer yet...

---

### **Step 3: Create the Game Server**

Create a new file: `server/index.js`

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // In production, set this to your Vercel URL
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;

// Game state
const gameState = {
    players: {},
    enemies: [
        { id: 'enemy1', x: 600, y: 300, hp: 50, maxHp: 50 }
    ],
    projectiles: []
};

// Handle connections
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    // Add new player
    gameState.players[socket.id] = {
        id: socket.id,
        x: Math.random() * 700 + 50,
        y: Math.random() * 500 + 50,
        hp: 100,
        maxHp: 100,
        color: '#00ff9f',
        velocity: { x: 0, y: 0 }
    };

    // Send initial state
    socket.emit('init', gameState);

    // Handle player movement
    socket.on('move', (velocity) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].velocity = velocity;
        }
    });

    // Handle weapon fire
    socket.on('fire', (data) => {
        const player = gameState.players[socket.id];
        if (player) {
            gameState.projectiles.push({
                id: `proj_${Date.now()}_${socket.id}`,
                playerId: socket.id,
                x: player.x,
                y: player.y,
                vx: data.vx,
                vy: data.vy,
                color: '#fce83a'
            });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete gameState.players[socket.id];
    });
});

// Game loop (60 FPS)
setInterval(() => {
    // Update players
    Object.values(gameState.players).forEach(player => {
        player.x += player.velocity.x * 0.016;
        player.y += player.velocity.y * 0.016;
        
        // Keep in bounds
        player.x = Math.max(20, Math.min(780, player.x));
        player.y = Math.max(20, Math.min(580, player.y));
    });

    // Update projectiles
    gameState.projectiles = gameState.projectiles.filter(proj => {
        proj.x += proj.vx * 0.016;
        proj.y += proj.vy * 0.016;
        
        // Remove if out of bounds
        return proj.x > 0 && proj.x < 800 && proj.y > 0 && proj.y < 600;
    });

    // Broadcast state
    io.emit('state', gameState);
}, 16);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

Create `server/package.json`:

```json
{
  "name": "game-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1"
  }
}
```

---

### **Step 4: Deploy Server to Railway**

#### Using Railway Website (Recommended):
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your repository
6. Railway auto-detects Node.js
7. Set **Root Directory** to `server` (if you created a server folder)
8. Click **"Deploy"**
9. Railway gives you a URL like: `https://your-game.up.railway.app`

#### Important Settings in Railway:
- **Start Command**: `npm start`
- **Environment Variables**: None needed for basic setup
- **Port**: Railway auto-assigns (uses `process.env.PORT`)

---

### **Step 5: Connect Frontend to Server**

Update your frontend code to connect to the Railway server:

```typescript
// In src/utils/network.ts (create this file)
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'https://your-game.up.railway.app'; // Replace with your Railway URL

let socket: Socket;

export function connectToServer() {
    socket = io(SERVER_URL);

    socket.on('connect', () => {
        console.log('Connected to game server!');
    });

    socket.on('init', (gameState) => {
        console.log('Received initial game state:', gameState);
        // Initialize your game with this state
    });

    socket.on('state', (gameState) => {
        // Update your game every frame
        // gameEngine.updateFromServer(gameState);
    });

    return socket;
}

export function sendMovement(vx: number, vy: number) {
    socket?.emit('move', { x: vx, y: vy });
}

export function sendFire(vx: number, vy: number) {
    socket?.emit('fire', { vx, vy });
}
```

Then in `App.tsx`:
```typescript
import { connectToServer } from './utils/network';

useEffect(() => {
    connectToServer();
}, []);
```

---

## Free Hosting Comparison

| Platform | Frontend | Backend | Free Tier | Auto-Deploy |
|----------|----------|---------|-----------|-------------|
| **Vercel** | ✅ | ❌ | Unlimited | ✅ |
| **Netlify** | ✅ | ❌ | Unlimited | ✅ |
| **Railway** | ✅ | ✅ | 500 hrs/month | ✅ |
| **Render** | ✅ | ✅ | 750 hrs/month | ✅ |
| **Fly.io** | ✅ | ✅ | 3 VMs free | ✅ |
| **GitHub Pages** | ✅ | ❌ | Unlimited | ✅ |

---

## 🎯 My Recommendation

### **For Your Game:**

1. **Frontend**: Deploy to **Vercel** (easiest, fastest)
2. **Backend**: Deploy to **Railway** (generous free tier, simple setup)
3. **Code**: Keep everything in one GitHub repo

### **Folder Structure:**
```
roblox-game/
├── src/              # Frontend (React/Vite)
├── server/           # Backend (Node.js)
│   ├── index.js
│   └── package.json
├── package.json      # Frontend dependencies
└── vercel.json       # Vercel config (optional)
```

### **Deployment Workflow:**
1. Push code to GitHub
2. Vercel auto-deploys frontend
3. Railway auto-deploys backend
4. Both update automatically on every push!

---

## Free Tier Limitations

### **Railway Free Tier:**
- ✅ 500 hours/month (enough for ~20 days always-on)
- ✅ 1GB RAM
- ✅ 1GB disk
- ⚠️ Server sleeps after 30 min of inactivity (wakes up in ~30 seconds)

### **Render Free Tier:**
- ✅ 750 hours/month
- ✅ 512MB RAM
- ⚠️ Server sleeps after 15 min of inactivity

### **To Keep Server Always On:**
- Upgrade to paid tier ($5-10/month)
- Or use a "keep-alive" service that pings your server every 10 minutes

---

## GitHub Pages Alternative (Static Only)

**Can you host on GitHub Pages alone?**
- ✅ Yes, for the **frontend** (the game client)
- ❌ No, for the **backend** (multiplayer server)

GitHub Pages only serves static files (HTML, CSS, JS). It can't run a Node.js server.

**But you can:**
1. Host frontend on GitHub Pages (free)
2. Host backend on Railway (free)
3. Connect them together

---

## Quick Start Commands

### 1. Install dependencies:
```bash
cd server
npm install
```

### 2. Test locally:
```bash
npm start
# Server runs on http://localhost:3000
```

### 3. Deploy to Railway:
```bash
# Just push to GitHub, Railway auto-deploys!
git add .
git commit -m "Add multiplayer server"
git push
```

---

## Security Tips for Production

1. **Set CORS properly:**
```javascript
cors: {
    origin: 'https://your-game.vercel.app', // Your actual frontend URL
    methods: ['GET', 'POST']
}
```

2. **Add rate limiting:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 1000,
    max: 60 // 60 requests per second
});

app.use(limiter);
```

3. **Validate all inputs:**
```javascript
socket.on('move', (velocity) => {
    if (typeof velocity.x !== 'number' || typeof velocity.y !== 'number') {
        return; // Ignore invalid input
    }
    // ... rest of code
});
```

---

## Next Steps

1. ✅ Push your code to GitHub
2. ✅ Deploy frontend to Vercel
3. ✅ Create `server/` folder with game server code
4. ✅ Deploy backend to Railway
5. ✅ Update frontend to connect to Railway URL
6. ✅ Test with friends!

**Want me to help you set this up step by step?** I can create the server code and deployment configs for you!
