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
                        drawColor = '#ff9f00'; // Vibrant Orange for Other Players
                    }
                }

                ctx.fillStyle = drawColor;

                // ONLY apply glow to players and enemies (Projectiles are too numerous)
                if (ent.type !== 'projectile') {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = drawColor;
                }

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

                    // Draw Type/ID label
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    ctx.font = '10px "Outfit", sans-serif';
                    ctx.textAlign = 'center';
                    const label = ent.type === 'player' ? (ent.id === networkManager.getPlayerId() ? 'YOU' : `PLAYER`) : 'BOT';
                    ctx.fillText(label, ent.x, ent.y - ent.radius - 15);
                    ctx.textAlign = 'left';
                }
            });

            // 4. Draw HUD (Local Stats)
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px "Outfit", sans-serif';
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.fillText(`SCORE: ${state.score}`, 20, 40);

            // If in multiplayer, show my kills/deaths
            if (networkManager.isConnected()) {
                const myId = networkManager.getPlayerId();
                const me = state.entities.find(e => e.id === myId);
                if (me) {
                    ctx.fillStyle = '#00ff9f';
                    ctx.font = '16px "Outfit", sans-serif';
                    ctx.fillText(`KILLS: ${me.kills || 0}`, 20, 70);
                    ctx.fillStyle = '#ff0055';
                    ctx.fillText(`DEATHS: ${me.deaths || 0}`, 20, 95);
                }
            }
            ctx.shadowBlur = 0;

            // 5. Draw Leaderboard (Multiplayer)
            if (state.leaderboard && state.leaderboard.length > 0) {
                const myId = networkManager.getPlayerId();
                const lbX = canvas.width - 180;
                const lbY = 40;

                // Header
                ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
                ctx.fillRect(lbX - 10, lbY - 25, 170, 30 + state.leaderboard.length * 25);
                ctx.strokeStyle = '#00ff9f';
                ctx.lineWidth = 1;
                ctx.strokeRect(lbX - 10, lbY - 25, 170, 30 + state.leaderboard.length * 25);

                ctx.fillStyle = '#00ff9f';
                ctx.font = 'bold 14px "Outfit", sans-serif';
                ctx.fillText("LEADERBOARD", lbX, lbY);

                state.leaderboard.slice(0, 5).forEach((entry: any, i: number) => {
                    const isMe = entry.id === myId;
                    ctx.fillStyle = isMe ? '#00ff9f' : '#fff';
                    ctx.font = isMe ? 'bold 13px "Outfit", sans-serif' : '13px "Outfit", sans-serif';

                    const name = isMe ? "YOU" : `Player ${entry.id.substring(0, 4)}`;
                    ctx.fillText(`${i + 1}. ${name}`, lbX, lbY + 25 + i * 25);
                    ctx.textAlign = 'right';
                    ctx.fillText(`${entry.kills}`, lbX + 150, lbY + 25 + i * 25);
                    ctx.textAlign = 'left';
                });
            }

            if (state.gameOver) {
                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ff0055';
                ctx.font = 'bold 48px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
                ctx.textAlign = 'left';
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
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Trigger fire action in engine
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
