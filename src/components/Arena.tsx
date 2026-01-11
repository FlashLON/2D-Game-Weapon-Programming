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
            }
            gameEngine.setPlayerVelocity(vx, vy);
        };

        // Main render function called whenever game state changes
        const render = (state: GameState) => {
            // 1. Clear the canvas
            ctx.fillStyle = '#0a0a0f'; // BG color matched to theme
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // IMPACT SCREENSHAKE: Offset context
            if (state.screenshake > 0) {
                const shake = state.screenshake * 15;
                const ox = (Math.random() - 0.5) * shake;
                const oy = (Math.random() - 0.5) * shake;
                ctx.translate(ox, oy);
            }

            // 2. Draw Reactive Grid
            const gridSize = 40;
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1;

            for (let x = 0; x <= canvas.width; x += gridSize) {
                ctx.beginPath();
                for (let y = 0; y <= canvas.height; y += gridSize) {
                    let dx = 0;
                    let dy = 0;

                    // Apply Distortions
                    state.gridImpulses.forEach(imp => {
                        const distSq = (x - imp.x) ** 2 + (y - imp.y) ** 2;
                        if (distSq < imp.radius ** 2) {
                            const dist = Math.sqrt(distSq);
                            const force = (1 - dist / imp.radius) * imp.strength * imp.life;
                            dx += (x - imp.x) / dist * force;
                            dy += (y - imp.y) / dist * force;
                        }
                    });

                    if (y === 0) ctx.moveTo(x + dx, y + dy);
                    else ctx.lineTo(x + dx, y + dy);
                }
                ctx.stroke();
            }

            for (let y = 0; y <= canvas.height; y += gridSize) {
                ctx.beginPath();
                for (let x = 0; x <= canvas.width; x += gridSize) {
                    let dx = 0;
                    let dy = 0;

                    state.gridImpulses.forEach(imp => {
                        const distSq = (x - imp.x) ** 2 + (y - imp.y) ** 2;
                        if (distSq < imp.radius ** 2) {
                            const dist = Math.sqrt(distSq);
                            const force = (1 - dist / imp.radius) * imp.strength * imp.life;
                            dx += (x - imp.x) / dist * force;
                            dy += (y - imp.y) / dist * force;
                        }
                    });

                    if (x === 0) ctx.moveTo(x + dx, y + dy);
                    else ctx.lineTo(x + dx, y + dy);
                }
                ctx.stroke();
            }

            // 3. Draw Particles (Background layer)
            state.particles.forEach(p => {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            // 3. Draw all Entities (Players, Enemies, Projectiles)
            [...state.entities, ...state.projectiles].forEach(ent => {
                const drawX = ent.renderX ?? ent.x;
                const drawY = ent.renderY ?? ent.y;

                ctx.beginPath();
                ctx.arc(drawX, drawY, ent.radius, 0, Math.PI * 2);

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

                // Apply fade for projectiles with fade_over_time
                if (ent.type === 'projectile' && ent.fade_over_time && ent.lifetime && ent.maxLifetime) {
                    ctx.globalAlpha = Math.max(0.1, ent.lifetime / ent.maxLifetime);
                }

                // SPECIAL: Draw velocity trail for projectiles
                if (ent.type === 'projectile' && ent.velocity) {
                    ctx.beginPath();
                    ctx.strokeStyle = drawColor;
                    const trailAlpha = (ctx.globalAlpha || 1.0) * 0.4;
                    ctx.globalAlpha = trailAlpha;
                    ctx.lineWidth = ent.radius * 0.8;
                    const tx = ent.renderX ?? ent.x;
                    const ty = ent.renderY ?? ent.y;
                    ctx.moveTo(tx, ty);
                    ctx.lineTo(tx - ent.velocity.x * 0.05, ty - ent.velocity.y * 0.05);
                    ctx.stroke();
                    // Reset alpha for the head
                    ctx.globalAlpha = ent.type === 'projectile' && ent.fade_over_time && ent.lifetime && ent.maxLifetime ? Math.max(0.1, ent.lifetime / ent.maxLifetime) : 1.0;
                }

                // ONLY apply glow to players and enemies (Projectiles are too numerous)
                if (ent.type !== 'projectile') {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = drawColor;
                }

                ctx.fill();
                ctx.shadowBlur = 0; // Reset shadow for other elements

                // Draw HP bar for living entities (not projectiles)
                if (ent.type !== 'projectile') {
                    const hpPct = Math.max(0, Math.min(1, ent.hp / ent.maxHp));
                    const barW = 32;
                    const barH = 3;
                    const barY = ent.y - ent.radius - 8;

                    // Background Bar (Outer border/shadow)
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(ent.x - barW / 2 - 1, barY - 1, barW + 2, barH + 2);

                    // Background bar (Dark base)
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(ent.x - barW / 2, barY, barW, barH);

                    // Health fill color logic: Green -> Yellow -> Red
                    let hpColor = '#00ff9f'; // Healthy Green
                    if (hpPct < 0.3) hpColor = '#ff0055'; // Critical Red
                    else if (hpPct < 0.6) hpColor = '#ff9f00'; // Warning Orange

                    ctx.fillStyle = hpColor;
                    ctx.fillRect(ent.x - barW / 2, barY, barW * hpPct, barH);
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

            // 5. Draw Feedback: Damage Numbers
            state.damageNumbers.forEach(dn => {
                ctx.globalAlpha = dn.life;
                ctx.fillStyle = dn.color;
                ctx.font = `bold ${14 + dn.value * 0.1}px "Outfit", sans-serif`;
                ctx.textAlign = 'center';
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.fillText(`-${dn.value}`, dn.x, dn.y);
            });
            ctx.globalAlpha = 1.0;
            ctx.textAlign = 'left';
            ctx.shadowBlur = 0;

            // 6. Draw Leaderboard & Kill Feed (Multiplayer)
            if (networkManager.isConnected()) {
                const lbX = canvas.width - 180;
                const lbY = 40;

                // Kill Feed (Top Left)
                state.notifications.forEach((n, i) => {
                    ctx.globalAlpha = n.life;
                    ctx.fillStyle = 'rgba(255, 0, 85, 0.2)';
                    ctx.fillRect(20, 110 + i * 30, 200, 25);
                    ctx.fillStyle = '#ff0055';
                    ctx.font = 'bold 11px font-mono';
                    ctx.fillText(`⚡ ${n.attacker.toUpperCase()} TERMINATED ${n.victim.toUpperCase()}`, 30, 127 + i * 30);
                });
                ctx.globalAlpha = 1.0;

                if (state.leaderboard && state.leaderboard.length > 0) {
                    const myId = networkManager.getPlayerId();
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
            }

            // 7. Reset Context (after shake)
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            // 8. Draw Neural HUD (Local Stats - Screen Space)
            const myPlayer = state.entities.find(e => e.id === networkManager.getPlayerId());
            if (myPlayer) {
                const hudX = 30;
                const hudY = canvas.height - 50;

                // Health Bar Container
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(hudX, hudY, 200, 12);
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.strokeRect(hudX - 1, hudY - 1, 202, 14);

                // Health Fill
                const hpPct = myPlayer.hp / myPlayer.maxHp;
                const fillGrad = ctx.createLinearGradient(hudX, 0, hudX + 200, 0);
                fillGrad.addColorStop(0, hpPct < 0.3 ? '#ff0055' : '#00ff9f');
                fillGrad.addColorStop(1, hpPct < 0.3 ? '#880022' : '#004422');

                ctx.fillStyle = fillGrad;
                ctx.fillRect(hudX, hudY, 200 * hpPct, 12);

                // HUD Text
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px "Outfit", sans-serif';
                ctx.fillText(`SYSTEM HP: ${Math.round(myPlayer.hp)}%`, hudX, hudY - 10);

                // Segment lines
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                for (let i = 1; i < 10; i++) {
                    ctx.beginPath();
                    ctx.moveTo(hudX + i * 20, hudY);
                    ctx.lineTo(hudX + i * 20, hudY + 12);
                    ctx.stroke();
                }
            }

            // 9. Draw Vignette (Screen Space)
            const vignette = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.8
            );
            vignette.addColorStop(0, 'rgba(0,0,0,0)');
            vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

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
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        // Scale mouse coordinates to match 800x600 internal resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Trigger fire action in engine
        const projectileData = gameEngine.fireWeapon(x, y);

        // SYNC WITH SERVER: This was missing in the last update, causing "direction" issues
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
                className="border border-cyber-accent/50 shadow-[0_0_50px_rgba(0,255,159,0.15)] bg-cyber-dark cursor-crosshair transition-all duration-300"
                style={{
                    filter: 'contrast(1.1) brightness(1.1)',
                }}
            />
            <div className="absolute top-4 right-4 text-cyber-muted text-xs space-y-1">
                <div>WASD to Move</div>
                <div>Click to Fire</div>
            </div>
        </div>
    );
};
