import React, { useEffect, useRef } from 'react';
import { gameEngine, type GameState } from '../engine/GameEngine';

import { networkManager } from '../utils/NetworkManager';

export const Arena: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Track which keys are currently pressed
        const keysPressed = new Set<string>();
        const moveSpeed = 250; // pixels per second

        // Keyboard event handlers for player movement
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd'].includes(key)) {
                e.preventDefault();
                keysPressed.add(key);
                updatePlayerVelocity();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd'].includes(key)) {
                keysPressed.delete(key);
                updatePlayerVelocity();
            }
        };

        const updatePlayerVelocity = () => {
            let vx = 0;
            let vy = 0;

            if (keysPressed.has('w')) vy -= moveSpeed;
            if (keysPressed.has('s')) vy += moveSpeed;
            if (keysPressed.has('a')) vx -= moveSpeed;
            if (keysPressed.has('d')) vx += moveSpeed;

            // Normalize diagonal movement
            if (vx !== 0 && vy !== 0) {
                const magnitude = Math.sqrt(vx * vx + vy * vy);
                vx = (vx / magnitude) * moveSpeed;
                vy = (vy / magnitude) * moveSpeed;
            }

            if (networkManager.isConnected()) {
                networkManager.sendMovement(vx, vy);
            } else {
                gameEngine.setPlayerVelocity(vx, vy);
            }
        };

        // Main render function called whenever game state changes
        const render = (state: GameState) => {
            // 1. Clear the canvas
            ctx.fillStyle = '#0a0a0f'; // BG color matched to theme
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Grid
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1;
            const gridSize = 50;
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // 3. Draw all Entities (Players, Enemies, Projectiles)
            [...state.entities, ...state.projectiles].forEach(ent => {
                ctx.beginPath();
                ctx.arc(ent.x, ent.y, ent.radius, 0, Math.PI * 2);

                // Determine Color
                let drawColor = ent.color;

                // If it's another player in multiplayer, assign them "Enemy Red" color
                // We use NetworkManager to know our own ID
                if (ent.type === 'player' && networkManager.isConnected()) {
                    const myId = networkManager.getPlayerId();
                    if (ent.id !== myId) {
                        drawColor = '#ff0055'; // Hostile Red
                    }
                }

                ctx.fillStyle = drawColor;

                // Add simple glow effect for "cyber" feel
                ctx.shadowBlur = 10;
                ctx.shadowColor = drawColor;

                ctx.fill();
                ctx.shadowBlur = 0; // Reset shadow for other elements

                // Draw HP bar for living entities (not projectiles)
                if (ent.type !== 'projectile') {
                    const hpPct = ent.hp / ent.maxHp;
                    const barW = 30;
                    const barH = 4;
                    // Background bar
                    ctx.fillStyle = '#333';
                    ctx.fillRect(ent.x - barW / 2, ent.y - ent.radius - 10, barW, barH);
                    // Health fill (Green if healthy, Red if low)
                    ctx.fillStyle = hpPct > 0.5 ? '#00ff9f' : '#ff0055';
                    ctx.fillRect(ent.x - barW / 2, ent.y - ent.radius - 10, barW * hpPct, barH);
                }
            });

            // 4. Draw HUD (Heads Up Display)
            ctx.fillStyle = '#fff';
            ctx.font = '20px "Fira Code"';
            ctx.fillText(`SCORE: ${state.score}`, 20, 40);

            if (state.gameOver) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ff0055';
                ctx.font = '40px "Fira Code"';
                ctx.fillText("GAME OVER", canvas.width / 2 - 100, canvas.height / 2);
            }
        };

        gameEngine.subscribe(render);

        // Add keyboard listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Start loop if not started
        gameEngine.start();

        return () => {
            gameEngine.stop();
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Handle mouse clicks to fire weapon
    const handleClick = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        // Calculate click position relative to canvas
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Trigger fire action in engine (which calls Python logic)
        // returns projectile data if intent is valid
        const projectileData = gameEngine.fireWeapon(x, y);

        if (networkManager.isConnected() && projectileData) {
            networkManager.sendFire(projectileData);
        }
    };

    return (
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onClick={handleClick}
                className="border border-cyber-accent shadow-[0_0_20px_rgba(0,255,159,0.3)] bg-cyber-dark cursor-crosshair"
            />
            <div className="absolute top-4 right-4 text-cyber-muted text-xs space-y-1">
                <div>WASD to Move</div>
                <div>Click to Fire</div>
            </div>
        </div>
    );
};
