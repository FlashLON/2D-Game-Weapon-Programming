import { io, Socket } from 'socket.io-client';
import type { GameState } from '../engine/GameEngine';

class NetworkManager {
    private socket: Socket | null = null;
    private connected: boolean = false;
    private playerId: string | null = null;

    // Callbacks groups
    private connectionListeners: Set<(connected: boolean) => void> = new Set();

    // Internal Callback Storage
    private onStateUpdate: ((state: GameState) => void) | null = null;
    private onPlayerCountChange: ((count: number) => void) | null = null;
    private onKill: ((enemyId: string) => void) | null = null;
    private onVisualEffect: ((effect: any) => void) | null = null;
    private onLoginResponse: ((response: any) => void) | null = null;

    connect(serverUrl: string) {
        if (this.socket && this.connected) {
            console.warn('[NetworkManager] Already connected to:', serverUrl);
            this.connectionListeners.forEach(fn => fn(true));
            return;
        }

        if (this.socket) {
            console.log('[NetworkManager] Disconnecting previous socket');
            this.socket.disconnect();
            this.socket = null;
        }

        const url = serverUrl || "http://localhost:3000";
        console.log('[NetworkManager] 🔌 Connecting to:', url);

        this.socket = io(url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            timeout: 20000
        });

        // Setup Relays
        this.socket.on('connect', () => {
            console.log('[NetworkManager] ✅ Connected! ID:', this.socket?.id);
            this.connected = true;
            this.connectionListeners.forEach(fn => fn(true));
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[NetworkManager] ❌ Disconnected:', reason);
            this.connected = false;
            this.connectionListeners.forEach(fn => fn(false));
        });

        this.socket.on('connect_error', (error) => {
            console.error('[NetworkManager] ⚠️ Connection Error:', error.message);
            this.connected = false;
            this.connectionListeners.forEach(fn => fn(false));
        });

        // Game State Relays
        this.socket.on('init', (data: { playerId: string; gameState: GameState }) => {
            console.log('[NetworkManager] Initialized with ID:', data.playerId);
            this.playerId = data.playerId;
            this.onStateUpdate?.(data.gameState);
        });

        this.socket.on('state', (state: GameState) => {
            this.onStateUpdate?.(state);
        });

        this.socket.on('playerJoined', (data: { playerId: string; playerCount: number }) => {
            this.onPlayerCountChange?.(data.playerCount);
        });

        this.socket.on('playerLeft', (data: { playerId: string; playerCount: number }) => {
            this.onPlayerCountChange?.(data.playerCount);
        });

        this.socket.on('kill', (data: { enemyId: string }) => {
            this.onKill?.(data.enemyId);
        });

        this.socket.on('visual_effect', (effect: any) => {
            this.onVisualEffect?.(effect);
        });

        this.socket.on('login_response', (response: any) => {
            console.log('[NetworkManager] 📧 LOGIN RESPONSE:', response);
            if (this.onLoginResponse) {
                this.onLoginResponse(response);
            } else {
                console.error('[NetworkManager] CRITICAL: No onLoginResponse handler found!');
            }
        });

        // Debug: Log all incoming events
        this.socket.onAny((eventName, ...args) => {
            if (eventName !== 'state') { // Ignore high-frequency state updates
                console.log(`[NetworkManager] 📥 Event: ${eventName}`, args);
            }
        });
    }

    // LISTENER MANAGEMENT
    addConnectionListener(callback: (connected: boolean) => void) {
        this.connectionListeners.add(callback);
    }

    removeConnectionListener(callback: (connected: boolean) => void) {
        this.connectionListeners.delete(callback);
    }

    joinRoom(roomId: string, settings?: any, profile?: any) {
        if (this.socket && this.connected) {
            console.log('[NetworkManager] Emit: join_room', roomId);
            this.socket.emit('join_room', { roomId, settings, profile });
        }
    }

    login(username: string) {
        if (this.socket && this.connected) {
            console.log('[NetworkManager] 📤 Emit: login', username);
            this.socket.emit('login', { username });
        } else {
            console.error('[NetworkManager] ❌ Emit failed: Not connected');
        }
    }

    signup(username: string) {
        if (this.socket && this.connected) {
            console.log('[NetworkManager] 📤 Emit: signup', username);
            this.socket.emit('signup', { username });
        } else {
            console.error('[NetworkManager] ❌ Emit failed: Not connected');
        }
    }

    saveProfile(profile: any) {
        if (this.socket && this.connected) {
            this.socket.emit('save_profile', { profile });
        }
    }

    // Direct Relay Setters
    setOnLoginResponse(callback: (response: any) => void) {
        this.onLoginResponse = callback;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            this.playerId = null;
        }
    }

    sendMovement(vx: number, vy: number) {
        if (this.socket && this.connected) {
            this.socket.emit('move', { x: vx, y: vy });
        }
    }

    sendFire(data: any) {
        if (this.socket && this.connected) {
            this.socket.emit('fire', data);
        }
    }

    setOnStateUpdate(callback: (state: GameState) => void) {
        this.onStateUpdate = callback;
    }

    setOnPlayerCountChange(callback: (count: number) => void) {
        this.onPlayerCountChange = callback;
    }

    setOnKill(callback: (enemyId: string) => void) {
        this.onKill = callback;
    }

    setOnVisualEffect(callback: (effect: any) => void) {
        this.onVisualEffect = callback;
    }

    // Getters
    isConnected(): boolean {
        return this.connected;
    }

    getPlayerId(): string | null {
        return this.playerId;
    }
}

export const networkManager = new NetworkManager();
