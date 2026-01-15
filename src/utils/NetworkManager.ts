import { io, Socket } from 'socket.io-client';
import type { GameState } from '../engine/GameEngine';

class NetworkManager {
    private socket: Socket | null = null;
    private connected: boolean = false;
    private playerId: string | null = null;

    // Callbacks
    private onStateUpdate: ((state: GameState) => void) | null = null;
    private onConnectionChange: ((connected: boolean) => void) | null = null;
    private onPlayerCountChange: ((count: number) => void) | null = null;
    private onKill: ((enemyId: string) => void) | null = null;
    private onVisualEffect: ((effect: any) => void) | null = null;

    connect(serverUrl: string) {
        if (this.socket) {
            console.warn('Already connected');
            return;
        }

        console.log('Connecting to server:', serverUrl);
        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        // Connection events
        this.socket.on('connect', () => {
            console.log('✅ Connected to game server');
            this.connected = true;
            this.onConnectionChange?.(true);
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            this.connected = false;
            this.onConnectionChange?.(false);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.connected = false;
            this.onConnectionChange?.(false);
        });

        // Game events
        this.socket.on('init', (data: { playerId: string; gameState: GameState }) => {
            console.log('Received initial state, player ID:', data.playerId);
            this.playerId = data.playerId;
            this.onStateUpdate?.(data.gameState);
        });

        this.socket.on('state', (state: GameState) => {
            this.onStateUpdate?.(state);
        });

        this.socket.on('playerJoined', (data: { playerId: string; playerCount: number }) => {
            console.log('Player joined:', data.playerId);
            this.onPlayerCountChange?.(data.playerCount);
        });

        this.socket.on('playerLeft', (data: { playerId: string; playerCount: number }) => {
            console.log('Player left:', data.playerId);
            this.onPlayerCountChange?.(data.playerCount);
        });

        this.socket.on('kill', (data: { enemyId: string }) => {
            console.log('You killed:', data.enemyId);
            this.onKill?.(data.enemyId);
        });

        this.socket.on('visual_effect', (effect: any) => {
            this.onVisualEffect?.(effect);
        });
    }

    joinRoom(roomId: string, settings?: any) {
        if (this.socket && this.connected) {
            console.log('Joining room:', roomId, settings);
            this.socket.emit('join_room', { roomId, settings });
        }
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

    sendFire(data: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        damage?: number;
        color?: string;
        radius?: number;
        homing?: number;
        lifetime?: number;
        acceleration?: number;
        knockback?: number;
        pierce?: number;
        explosion_radius?: number;
        explosion_damage?: number;
        wave_amplitude?: number;
        wave_frequency?: number;
        chain_count?: number;
        chain_range?: number;
        fade_over_time?: boolean;
    }) {
        if (this.socket && this.connected) {
            this.socket.emit('fire', data);
        }
    }

    // Setters for callbacks
    setOnStateUpdate(callback: (state: GameState) => void) {
        this.onStateUpdate = callback;
    }

    setOnConnectionChange(callback: (connected: boolean) => void) {
        this.onConnectionChange = callback;
    }

    setOnPlayerCountChange(callback: (count: number) => void) {
        this.onPlayerCountChange = callback;
    }

    setOnKill(callback: (enemyId: string) => void) {
        this.onKill = callback;
    }

    // Getters
    isConnected(): boolean {
        return this.connected;
    }

    getPlayerId(): string | null {
        return this.playerId;
    }

    setOnVisualEffect(callback: (effect: any) => void) {
        this.onVisualEffect = callback;
    }
}

export const networkManager = new NetworkManager();
