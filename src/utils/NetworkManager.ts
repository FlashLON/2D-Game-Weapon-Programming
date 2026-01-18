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
            console.warn('[NetworkManager] Already connected, skipping init');
            this.connectionListeners.forEach(fn => fn(true));
            return;
        }

        if (this.socket) {
            console.log('[NetworkManager] Cleaning up existing socket before reconnect');
            this.socket.disconnect();
            this.socket = null;
        }

        console.log('[NetworkManager] Initiating connection to:', serverUrl);
        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            timeout: 10000
        });

        // Setup Relays
        this.socket.on('connect', () => {
            console.log('[NetworkManager] ✅ Socket physically connected');
            this.connected = true;
            this.connectionListeners.forEach(fn => fn(true));
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[NetworkManager] ❌ Socket disconnected:', reason);
            this.connected = false;
            this.connectionListeners.forEach(fn => fn(false));
        });

        this.socket.on('connect_error', (error) => {
            console.error('[NetworkManager] ⚠️ Connection Error:', error);
            this.connected = false;
            this.connectionListeners.forEach(fn => fn(false));
        });

        // Game State Relays
        this.socket.on('init', (data: { playerId: string; gameState: GameState }) => {
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
            console.log('[NetworkManager] 📧 Received login_response:', response);
            if (this.onLoginResponse) {
                this.onLoginResponse(response);
            } else {
                console.warn('[NetworkManager] ⚠️ No onLoginResponse handler registered in App.tsx!');
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
            this.socket.emit('join_room', { roomId, settings, profile });
        }
    }

    login(username: string) {
        if (this.socket && this.connected) {
            console.log('[NetworkManager] 📤 Emitting login for:', username);
            this.socket.emit('login', { username });
        } else {
            console.error('[NetworkManager] ❌ Cannot login: not connected');
        }
    }

    signup(username: string) {
        if (this.socket && this.connected) {
            console.log('[NetworkManager] 📤 Emitting signup for:', username);
            this.socket.emit('signup', { username });
        } else {
            console.error('[NetworkManager] ❌ Cannot signup: not connected');
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
