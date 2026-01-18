import { io, Socket } from 'socket.io-client';
import type { GameState } from '../engine/GameEngine';

export interface AuthResponse {
    success: boolean;
    error?: string;
    profile?: any;
    isNew?: boolean;
}

class NetworkManager {
    private socket: Socket | null = null;
    private connected: boolean = false;
    private playerId: string | null = null;

    // Listeners
    private connectionListeners: Set<(connected: boolean) => void> = new Set();
    private onStateUpdate: ((state: GameState) => void) | null = null;
    private onKill: ((enemyId: string) => void) | null = null;
    private onVisualEffect: ((effect: any) => void) | null = null;

    connect(serverUrl: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.socket && this.connected) {
                console.log('[NetworkManager] Reusing active connection');
                resolve(true);
                return;
            }

            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }

            const url = serverUrl || "http://localhost:3000";
            console.log('[NetworkManager] 🔌 Connecting to:', url);

            this.socket = io(url, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                timeout: 10000
            });

            this.socket.once('connect', () => {
                console.log('[NetworkManager] ✅ Connected! ID:', this.socket?.id);
                this.connected = true;
                this.connectionListeners.forEach(fn => fn(true));
                resolve(true);
            });

            this.socket.once('connect_error', (err) => {
                console.error('[NetworkManager] ⚠️ Connection failed:', err.message);
                this.connected = false;
                this.connectionListeners.forEach(fn => fn(false));
                resolve(false);
            });

            // Standard Event Relays
            this.socket.on('disconnect', (reason) => {
                console.log('[NetworkManager] ❌ Disconnected:', reason);
                this.connected = false;
                this.connectionListeners.forEach(fn => fn(false));
            });

            this.socket.on('init', (data: { playerId: string; gameState: GameState }) => {
                this.playerId = data.playerId;
                this.onStateUpdate?.(data.gameState);
            });

            this.socket.on('state', (state: GameState) => {
                this.onStateUpdate?.(state);
            });

            this.socket.on('kill', (data: { enemyId: string }) => this.onKill?.(data.enemyId));
            this.socket.on('visual_effect', (effect: any) => this.onVisualEffect?.(effect));

            // Debug: Log all incoming events
            this.socket.onAny((ev, ...args) => {
                if (ev !== 'state') console.log(`[NetworkManager] 📥 Event: ${ev}`, args);
            });
        });
    }

    async login(username: string): Promise<AuthResponse> {
        if (!this.socket || !this.connected) return { success: false, error: "Not connected to server" };

        console.log('[NetworkManager] 📤 Requesting LOGIN for:', username);
        return new Promise((resolve) => {
            if (!this.socket) return resolve({ success: false, error: "Socket lost" });

            this.socket.once('login_response', (res: AuthResponse) => {
                console.log('[NetworkManager] 📥 LOGIN RESPONSE:', res);
                resolve(res);
            });

            this.socket.emit('login', { username });

            // Timeout safety (10 seconds for cold starts)
            setTimeout(() => resolve({ success: false, error: "Auth Timeout (Server took too long)" }), 10000);
        });
    }

    async signup(username: string): Promise<AuthResponse> {
        if (!this.socket || !this.connected) return { success: false, error: "Not connected to server" };

        console.log('[NetworkManager] 📤 Requesting SIGNUP for:', username);
        return new Promise((resolve) => {
            if (!this.socket) return resolve({ success: false, error: "Socket lost" });

            this.socket.once('login_response', (res: AuthResponse) => {
                console.log('[NetworkManager] 📥 SIGNUP RESPONSE:', res);
                resolve(res);
            });

            this.socket.emit('signup', { username });

            // Timeout safety (10 seconds for cold starts)
            setTimeout(() => resolve({ success: false, error: "Auth Timeout (Server took too long)" }), 10000);
        });
    }

    // Callbacks
    addConnectionListener(callback: (connected: boolean) => void) {
        this.connectionListeners.add(callback);
    }

    removeConnectionListener(callback: (connected: boolean) => void) {
        this.connectionListeners.delete(callback);
    }

    setOnStateUpdate(cb: (state: GameState) => void) { this.onStateUpdate = cb; }
    setOnKill(cb: (enemyId: string) => void) { this.onKill = cb; }
    setOnVisualEffect(cb: (effect: any) => void) { this.onVisualEffect = cb; }

    // Emitters
    joinRoom(roomId: string, settings?: any, profile?: any) {
        if (this.socket && this.connected) this.socket.emit('join_room', { roomId, settings, profile });
    }

    saveProfile(profile: any) {
        if (this.socket && this.connected) this.socket.emit('save_profile', { profile });
    }

    sendMovement(vx: number, vy: number) {
        if (this.socket && this.connected) this.socket.emit('move', { x: vx, y: vy });
    }

    sendFire(data: any) {
        if (this.socket && this.connected) this.socket.emit('fire', data);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    isConnected(): boolean { return this.connected; }
    getPlayerId(): string | null { return this.playerId; }
}

export const networkManager = new NetworkManager();
