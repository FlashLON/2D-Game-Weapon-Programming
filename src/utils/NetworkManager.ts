import { io, Socket } from 'socket.io-client';
import type { GameState } from '../engine/GameEngine';

export interface AuthResponse {
    success: boolean;
    error?: string;
    profile?: any;
    isNew?: boolean;
}

// Saved Code Interfaces
export interface SavedCode {
    id: string;
    name: string;
    code: string;
    createdAt: string;
    updatedAt: string;
    isDefault: boolean;
}

export interface SaveCodeResponse {
    success: boolean;
    codeId?: string;
    message?: string;
    error?: string;
}

export interface FetchCodesResponse {
    success: boolean;
    codes?: SavedCode[];
    error?: string;
}

export interface LoadCodeResponse {
    success: boolean;
    code?: SavedCode;
    error?: string;
}

export interface DeleteCodeResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export interface RenameCodeResponse {
    success: boolean;
    message?: string;
    error?: string;
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
    private onLeaderboardUpdate: ((data: any[]) => void) | null = null;
    private onWaveEvent: ((event: any) => void) | null = null;
    private onProfileUpdate: ((profile: any) => void) | null = null;
    private onMapVoteStart: ((data: any) => void) | null = null;
    private onMapVoteUpdate: ((data: any) => void) | null = null;
    private onMapChange: ((data: any) => void) | null = null;
    private onInit: ((data: { isSpectator: boolean }) => void) | null = null;

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
                console.error('[NetworkManager] ⚠️ Connection failed:', err.message, err);
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

            this.socket.on('init', (data: { playerId: string; isSpectator?: boolean; gameState: GameState }) => {
                this.playerId = data.playerId;
                this.onStateUpdate?.(data.gameState);
                this.onInit?.({ isSpectator: data.isSpectator ?? false });
            });

            this.socket.on('state', (state: GameState) => {
                this.onStateUpdate?.(state);
            });

            this.socket.on('kill', (data: { enemyId: string }) => this.onKill?.(data.enemyId));
            this.socket.on('visual_effect', (effect: any) => this.onVisualEffect?.(effect));
            this.socket.on('global_leaderboard', (data: any[]) => this.onLeaderboardUpdate?.(data));
            this.socket.on('wave_start', (data: any) => this.onWaveEvent?.({ type: 'wave_start', ...data }));
            this.socket.on('boss_spawn', (data: any) => this.onWaveEvent?.({ type: 'boss_spawn', ...data }));
            this.socket.on('profile_update', (profile: any) => this.onProfileUpdate?.(profile));
            this.socket.on('map_vote_start', (data: any) => this.onMapVoteStart?.(data));
            this.socket.on('map_vote_update', (data: any) => this.onMapVoteUpdate?.(data));
            this.socket.on('map_change', (data: any) => this.onMapChange?.(data));

            // Debug: Log all incoming events
            this.socket.onAny((ev, ...args) => {
                if (ev !== 'state') console.log(`[NetworkManager] 📥 Event: ${ev}`, args);
            });
        });
    }

    async login(username: string, password?: string): Promise<AuthResponse> {
        if (!this.socket || !this.connected) return { success: false, error: "Not connected to server" };

        console.log('[NetworkManager] 📤 Requesting LOGIN for:', username);
        return new Promise((resolve) => {
            if (!this.socket) return resolve({ success: false, error: "Socket lost" });

            this.socket.once('login_response', (res: AuthResponse) => {
                console.log('[NetworkManager] 📥 LOGIN RESPONSE:', res);
                resolve(res);
            });

            this.socket.emit('login', { username, password });

            // Timeout safety (10 seconds for cold starts)
            setTimeout(() => resolve({ success: false, error: "Auth Timeout (Server took too long)" }), 10000);
        });
    }

    async signup(username: string, password?: string): Promise<AuthResponse> {
        if (!this.socket || !this.connected) return { success: false, error: "Not connected to server" };

        console.log('[NetworkManager] 📤 Requesting SIGNUP for:', username);
        return new Promise((resolve) => {
            if (!this.socket) return resolve({ success: false, error: "Socket lost" });

            this.socket.once('login_response', (res: AuthResponse) => {
                console.log('[NetworkManager] 📥 SIGNUP RESPONSE:', res);
                resolve(res);
            });

            this.socket.emit('signup', { username, password });

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
    setOnLeaderboardUpdate(cb: (data: any[]) => void) { this.onLeaderboardUpdate = cb; }
    setOnWaveEvent(cb: (event: any) => void) { this.onWaveEvent = cb; }
    setOnProfileUpdate(cb: (profile: any) => void) { this.onProfileUpdate = cb; }
    setOnInit(cb: (data: { isSpectator: boolean }) => void) { this.onInit = cb; }

    // Emitters
    joinRoom(roomId: string, settings?: any, profile?: any) {
        if (this.socket && this.connected) this.socket.emit('join_room', { roomId, settings, profile });
    }

    spectateRoom(roomId: string, profile?: any) {
        if (this.socket && this.connected)
            this.socket.emit('join_room', { roomId, settings: { spectator: true }, profile });
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

    // Saved Code Methods
    async saveCode(username: string, codeName: string, codeContent: string): Promise<SaveCodeResponse> {
        if (!this.socket || !this.connected) return { success: false, error: "Not connected to server" };

        console.log('[NetworkManager] 📤 Saving Code:', codeName);
        return new Promise((resolve) => {
            if (!this.socket) return resolve({ success: false, error: "Socket lost" });

            this.socket.once('save_code_response', (res: SaveCodeResponse) => {
                console.log('[NetworkManager] 📥 SAVE CODE RESPONSE:', res);
                resolve(res);
            });

            this.socket.emit('save_code', { username, codeName, codeContent });

            setTimeout(() => resolve({ success: false, error: "Save Timeout (Server took too long)" }), 10000);
        });
    }

    async fetchSavedCodes(username: string): Promise<FetchCodesResponse> {
        if (!this.socket || !this.connected) return { success: false, error: "Not connected to server", codes: [] };

        console.log('[NetworkManager] 📤 Fetching Saved Codes for:', username);
        return new Promise((resolve) => {
            if (!this.socket) return resolve({ success: false, error: "Socket lost", codes: [] });

            this.socket.once('fetch_saved_codes_response', (res: FetchCodesResponse) => {
                console.log('[NetworkManager] 📥 FETCH CODES RESPONSE:', res);
                resolve(res);
            });

            this.socket.emit('fetch_saved_codes', { username });

            setTimeout(() => resolve({ success: false, error: "Fetch Timeout (Server took too long)", codes: [] }), 10000);
        });
    }

    async loadCode(username: string, codeId: string): Promise<LoadCodeResponse> {
        if (!this.socket || !this.connected) return { success: false, error: "Not connected to server" };

        console.log('[NetworkManager] 📤 Loading Code:', codeId);
        return new Promise((resolve) => {
            if (!this.socket) return resolve({ success: false, error: "Socket lost" });

            this.socket.once('load_code_response', (res: LoadCodeResponse) => {
                console.log('[NetworkManager] 📥 LOAD CODE RESPONSE:', res);
                resolve(res);
            });

            this.socket.emit('load_code', { username, codeId });

            setTimeout(() => resolve({ success: false, error: "Load Timeout (Server took too long)" }), 10000);
        });
    }

    async deleteCode(username: string, codeId: string): Promise<DeleteCodeResponse> {
        if (!this.socket || !this.connected) return { success: false, error: "Not connected to server" };

        console.log('[NetworkManager] 📤 Deleting Code:', codeId);
        return new Promise((resolve) => {
            if (!this.socket) return resolve({ success: false, error: "Socket lost" });

            this.socket.once('delete_code_response', (res: DeleteCodeResponse) => {
                console.log('[NetworkManager] 📥 DELETE CODE RESPONSE:', res);
                resolve(res);
            });

            this.socket.emit('delete_code', { username, codeId });

            setTimeout(() => resolve({ success: false, error: "Delete Timeout (Server took too long)" }), 10000);
        });
    }

    async renameCode(username: string, codeId: string, newName: string): Promise<RenameCodeResponse> {
        if (!this.socket || !this.connected) return { success: false, error: "Not connected to server" };

        console.log('[NetworkManager] 📤 Renaming Code:', codeId);
        return new Promise((resolve) => {
            if (!this.socket) return resolve({ success: false, error: "Socket lost" });

            this.socket.once('rename_code_response', (res: RenameCodeResponse) => {
                console.log('[NetworkManager] 📥 RENAME CODE RESPONSE:', res);
                resolve(res);
            });

            this.socket.emit('rename_code', { username, codeId, newName });

            setTimeout(() => resolve({ success: false, error: "Rename Timeout (Server took too long)" }), 10000);
        });
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

    // Map Voting
    setOnMapVoteStart(cb: (data: any) => void) { this.onMapVoteStart = cb; }
    setOnMapVoteUpdate(cb: (data: any) => void) { this.onMapVoteUpdate = cb; }
    setOnMapChange(cb: (data: any) => void) { this.onMapChange = cb; }

    sendVote(mapId: string) {
        this.socket?.emit('vote_map', { mapId });
    }

    sendEquipTitle(titleId: string | null) {
        this.socket?.emit('equip_title', { titleId });
    }
}

export const networkManager = new NetworkManager();
