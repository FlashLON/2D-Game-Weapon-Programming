# Server Setup & Firebase Configuration

## Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Set up Firebase

#### Option A: Using Firebase Realtime Database (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use existing one
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Copy the generated JSON and extract these fields:
   - `project_id`
   - `client_email`
   - `private_key`
   - The database URL from Realtime Database section

#### Option B: In-Memory Storage (Development Only)
If you don't have Firebase credentials, the server will automatically fall back to in-memory storage. **Data will NOT persist** when the server restarts.

### 3. Configure Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com

# Server Configuration
PORT=3000
NODE_ENV=production
```

**⚠️ Important:** The `FIREBASE_PRIVATE_KEY` must have `\n` replaced with actual newlines when pasting into `.env`

### 4. Run the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## Health Check

Once running, test the server health:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/status
```

You should see JSON responses showing database status, active rooms, and players.

## Troubleshooting

### Firebase Connection Issues

**Error: "Firebase Credentials missing"**
- Make sure `.env` file exists in the `server/` directory
- Check that all required environment variables are set
- Verify no extra spaces in the `.env` file

**Error: "Firebase Initialization Error"**
- Verify your credentials are correct
- Check that the service account has "Editor" role
- Ensure the Firebase Realtime Database is enabled in your project

### Server Not Starting

**"Cannot find module 'firebase-admin'"**
```bash
npm install firebase-admin
```

**Port already in use**
```bash
# Change PORT in .env or use:
PORT=3001 npm start
```

## Features

✅ **Persistent Storage** - User profiles, leveling, unlocks saved to Firebase
✅ **Multiplayer Rooms** - Separate game instances for different players
✅ **Leaderboard** - Global leaderboard synced every 30 seconds
✅ **Fallback Mode** - In-memory storage if Firebase unavailable
✅ **Health Endpoints** - Monitor server status

## Database Structure

Firebase stores data at this structure:

```
users/
  ├── username1/
  │   ├── username: "username1"
  │   ├── level: 5
  │   ├── xp: 250
  │   ├── money: 1000
  │   ├── unlocks: ["speed", "damage", "hp", "cooldown"]
  │   ├── limits: { speed: 200, damage: 5, hp: 100, cooldown: 0.5 }
  │   ├── lastSeen: "2026-01-19T12:00:00.000Z"
  │   └── createdAt: "2026-01-19T11:00:00.000Z"
  └── username2/
      └── ...
```

## Production Deployment

### Railway.app Deployment

1. Set environment variables in Railway:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (paste the entire key, Railway handles escaping)
   - `FIREBASE_DATABASE_URL`

2. Deploy:
```bash
railway up
```

### Other Platforms (Heroku, Vercel, etc.)

Set the same environment variables in your platform's configuration panel.
