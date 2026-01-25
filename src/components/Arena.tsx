import { useRef, useEffect } from 'react';
import { gameEngine, type GameState } from '../engine/GameEngine';

import { networkManager } from '../utils/NetworkManager';
import { TITLES } from '../utils/TitleRegistry';
import { ATTRIBUTES } from '../utils/AttributeRegistry';

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
                // Skip dead entities (moved off-screen)
                if (ent.x < -1000) return;

                const drawX = ent.renderX ?? ent.x;
                const drawY = ent.renderY ?? ent.y;
                const time = performance.now() / 1000;

                // --- AURA RENDERING (For Players) ---
                if (ent.type === 'player' && ent.aura_type) {
                    const aura = ent.aura_type;
                    const baseRange = 240;
                    const strength = (ent as any).limits?.[aura] || ATTRIBUTES[aura]?.startLimit || 1;
                    const startLimit = ATTRIBUTES[aura]?.startLimit || 1;
                    // Scale radius: +5% per 10% increase over base, max +30%
                    const scaleFactor = Math.min(0.3, Math.max(0, (strength / startLimit) - 1) * 0.5);
                    const range = baseRange * (1 + scaleFactor);

                    ctx.save();
                    ctx.translate(drawX, drawY);

                    const nowMs = Date.now();
                    const lastDmg = (ent as any).lastDealtDamageTime || 0;
                    const lastCrit = (ent as any).lastCritTime || 0;
                    const dmgRecent = (nowMs - lastDmg) < 300;
                    const critRecent = (nowMs - lastCrit) < 300;

                    // MANDATORY BASE GLOW (Ensure it's never invisible)
                    const baseGlow = ctx.createRadialGradient(0, 0, ent.radius, 0, 0, range);
                    baseGlow.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
                    baseGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = baseGlow;
                    ctx.beginPath(); ctx.arc(0, 0, range, 0, Math.PI * 2); ctx.fill();

                    if (aura === 'aura_damage') {
                        // 🔴 Damage Aura – “Power Ring”
                        const pulse = (Math.sin(time * Math.PI * 2) + 1) * 0.5;
                        const reactiveRange = range * (dmgRecent ? 1.1 : 1.0);

                        ctx.shadowBlur = 20;
                        ctx.shadowColor = '#ff0000';
                        const grad = ctx.createRadialGradient(0, 0, ent.radius, 0, 0, reactiveRange);
                        grad.addColorStop(0, dmgRecent ? 'rgba(255, 255, 255, 0.8)' : 'rgba(220, 38, 38, 0.6)');
                        grad.addColorStop(1, 'rgba(255, 69, 0, 0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath(); ctx.arc(0, 0, reactiveRange, 0, Math.PI * 2); ctx.fill();

                        ctx.strokeStyle = '#ff4500';
                        ctx.lineWidth = 4 + pulse * 2;
                        ctx.beginPath(); ctx.arc(0, 0, reactiveRange * (0.8 + pulse * 0.15), 0, Math.PI * 2); ctx.stroke();
                        ctx.shadowBlur = 0;

                    } else if (aura === 'aura_gravity') {
                        // 🟣 Gravity Aura – “Warp Field”
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = '#a855f7';
                        for (let i = 0; i < 3; i++) {
                            ctx.save();
                            ctx.rotate(time * 0.8 + i);
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(168, 85, 247, ${0.5 + Math.sin(time * 2 + i) * 0.3})`;
                            ctx.lineWidth = 3;
                            ctx.moveTo(-range, 0);
                            for (let x = -range; x < range; x += 15) {
                                const y = Math.sin(x * 0.03 + time * 3) * 20;
                                ctx.lineTo(x, y);
                            }
                            ctx.stroke();
                            ctx.restore();
                        }
                        ctx.shadowBlur = 0;

                    } else if (aura === 'aura_corruption') {
                        // 🟢 Corruption Aura – “Decay Mist”
                        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, range);
                        grad.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
                        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath(); ctx.arc(0, 0, range, 0, Math.PI * 2); ctx.fill();

                        for (let i = 0; i < 12; i++) {
                            const angle = (i * Math.PI / 6) + time * 0.5;
                            const dist = (range * 0.2) + ((time * 70 + i * 40) % (range * 0.8));
                            const alpha = (1 - (dist / range)) * 0.8;
                            ctx.fillStyle = `rgba(132, 204, 22, ${alpha})`;
                            ctx.beginPath();
                            ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist - (time * 15 % 30), 5, 0, Math.PI * 2);
                            ctx.fill();
                        }

                    } else if (aura === 'aura_execution') {
                        // 🟠 Execution Aura – “Hunter Halo”
                        let speedMult = 1.0;
                        const nearbyLowHP = state.entities.some(e =>
                            e.type === 'enemy' &&
                            Math.hypot(e.x - ent.x, e.y - ent.y) < range &&
                            e.hp < e.maxHp * 0.3
                        );
                        if (nearbyLowHP) speedMult = 5.0;

                        ctx.shadowBlur = 20;
                        ctx.shadowColor = (dmgRecent || nearbyLowHP) ? '#fff' : '#fb923c';
                        ctx.rotate(time * 10 * speedMult);
                        ctx.strokeStyle = (dmgRecent || nearbyLowHP) ? '#fff' : '#fb923c';
                        ctx.lineWidth = 4;
                        ctx.beginPath(); ctx.arc(0, 0, range * 0.95, 0, Math.PI * 2); ctx.stroke();

                        for (let i = 0; i < 8; i++) {
                            ctx.rotate(Math.PI / 4);
                            ctx.beginPath(); ctx.moveTo(range * 0.85, 0); ctx.lineTo(range * 1.0, 0); ctx.stroke();
                        }
                        ctx.shadowBlur = 0;

                    } else if (aura === 'aura_chaos') {
                        // 🌈 Chaos Aura – “Glitch Sphere”
                        const glitch = Math.random() > 0.8;
                        const hue = (time * 800) % 360;
                        const rSkew = range * (glitch ? (0.7 + Math.random() * 0.6) : 1.0);

                        ctx.shadowBlur = glitch ? 30 : 10;
                        ctx.shadowColor = `hsla(${hue}, 100%, 50%, 1)`;
                        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 1.0)`;
                        ctx.lineWidth = glitch ? 6 : 3;
                        const jitter = (glitch ? 12 : 0);
                        ctx.beginPath();
                        ctx.arc((Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter, rSkew, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.shadowBlur = 0;

                    } else if (aura === 'aura_control') {
                        // 🔵 Control Aura – “Frozen Field”
                        ctx.fillStyle = 'rgba(186, 230, 253, 0.3)';
                        ctx.beginPath(); ctx.arc(0, 0, range, 0, Math.PI * 2); ctx.fill();

                        ctx.strokeStyle = 'rgba(14, 165, 233, 0.7)';
                        ctx.lineWidth = 3;
                        for (let i = 0; i < 3; i++) {
                            const r = ((time * 60 + i * 100) % range);
                            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
                        }
                        ctx.setLineDash([8, 8]);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                        ctx.beginPath(); ctx.arc(0, 0, range, 0, Math.PI * 2); ctx.stroke();
                        ctx.setLineDash([]);

                    } else if (aura === 'aura_vampire') {
                        // 🩸 Vampiric Aura – “Blood Pulse”
                        const beat = Math.pow(Math.sin(time * 4), 6);
                        const glow = 0.4 + beat * 0.5;

                        ctx.shadowBlur = 15;
                        ctx.shadowColor = '#ff0000';
                        const grad = ctx.createRadialGradient(0, 0, ent.radius, 0, 0, range);
                        grad.addColorStop(0, `rgba(153, 27, 27, ${glow})`);
                        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath(); ctx.arc(0, 0, range, 0, Math.PI * 2); ctx.fill();

                        for (let i = 0; i < 12; i++) {
                            const angle = (i * Math.PI / 6) + time * 2;
                            const dist = range - ((time * 100 + i * 60) % range);
                            ctx.fillStyle = '#ef4444';
                            ctx.beginPath(); ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 3, 0, Math.PI * 2); ctx.fill();
                        }
                        ctx.shadowBlur = 0;

                    } else if (aura === 'aura_precision') {
                        // 🎯 Precision Aura – “Target Grid”
                        const active = critRecent || dmgRecent;
                        ctx.strokeStyle = active ? '#fff' : 'rgba(255, 255, 255, 0.7)';
                        ctx.lineWidth = active ? 3 : 1.5;
                        if (active) { ctx.shadowBlur = 20; ctx.shadowColor = '#fff'; }

                        ctx.rotate(time * 0.2);
                        for (let i = 0; i < 4; i++) {
                            ctx.rotate(Math.PI / 4);
                            ctx.beginPath();
                            ctx.moveTo(-range, 0); ctx.lineTo(range, 0);
                            ctx.moveTo(0, -range); ctx.lineTo(0, range);
                            ctx.stroke();
                        }
                        ctx.shadowBlur = 0;
                    }

                    ctx.restore();
                }

                ctx.beginPath();
                ctx.arc(drawX, drawY, ent.radius, 0, Math.PI * 2);

                // Determine Color
                let drawColor = ent.color;

                // Color other players in Multiplayer matches
                if (ent.type === 'player' && networkManager.isConnected() && gameEngine.isMultiplayerMode()) {
                    const myId = networkManager.getPlayerId();
                    if (ent.id !== myId && ent.id !== 'player') {
                        drawColor = '#ff9f00'; // Vibrant Orange for Other Players
                    }
                }

                ctx.fillStyle = drawColor;

                // Apply fade for projectiles with fade_over_time
                if (ent.type === 'projectile' && ent.fade_over_time && ent.lifetime && ent.maxLifetime) {
                    ctx.globalAlpha = Math.max(0.1, ent.lifetime / ent.maxLifetime);
                }

                // ONLY apply glow to players and enemies (Projectiles are too numerous)
                if (ent.type !== 'projectile') {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = drawColor;
                }

                ctx.fill();
                ctx.shadowBlur = 0; // Reset shadow for other elements
                ctx.globalAlpha = 1.0; // Reset alpha

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

                    // Render Username (for multiplayer)
                    if (ent.type === 'player' && (ent as any).username) {
                        // Check for Title
                        const playerEnt = ent as any;
                        if (playerEnt.equippedTitle && TITLES[playerEnt.equippedTitle]) {
                            const titleDef = TITLES[playerEnt.equippedTitle];
                            ctx.font = 'bold 9px "Outfit", sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillStyle = titleDef.color; // Use title color directly
                            // Can't render tailwind styles in canvas easily, so just color/shadow
                            ctx.shadowBlur = 4;
                            ctx.shadowColor = titleDef.color;
                            ctx.fillText(titleDef.name.toUpperCase(), ent.x, barY - 14);
                            ctx.shadowBlur = 0;
                        }

                        ctx.fillStyle = '#ffffff';
                        ctx.font = '10px "Outfit", sans-serif';
                        ctx.textAlign = 'center';
                        ctx.shadowBlur = 2;
                        ctx.shadowColor = 'black';
                        ctx.fillText((ent as any).username, ent.x, barY - 4);
                        ctx.textAlign = 'left'; // Reset
                        ctx.shadowBlur = 0;
                    }
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

            // --- BOSS HEALTH BAR (Top Center) ---
            const boss = state.entities.find(e => (e as any).isBoss);
            if (boss) {
                const barWidth = 400;
                const barHeight = 20;
                const barX = (canvas.width - barWidth) / 2;
                const barY = 30;

                // Border/Shadow
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ff00ff';
                ctx.fillStyle = 'rgba(255, 0, 255, 0.1)';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 2;
                ctx.strokeRect(barX, barY, barWidth, barHeight);

                // Fill
                const hpPct = boss.hp / boss.maxHp;
                const grad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
                grad.addColorStop(0, '#ff00ff');
                grad.addColorStop(1, '#770077');
                ctx.fillStyle = grad;
                ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);

                // Label
                ctx.fillStyle = '#fff';
                ctx.font = 'black 14px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`BOSS DETECTED: ${Math.ceil(boss.hp)} AP`, canvas.width / 2, barY + barHeight + 20);
                ctx.textAlign = 'left';
                ctx.shadowBlur = 0;
            }

            // --- WAVE STATUS (Bottom Center) ---
            if (state.wave && state.wave > 0) {
                ctx.fillStyle = 'rgba(0, 255, 159, 0.1)';
                ctx.fillRect(canvas.width / 2 - 100, canvas.height - 40, 200, 30);
                ctx.strokeStyle = '#00ff9f';
                ctx.lineWidth = 1;
                ctx.strokeRect(canvas.width / 2 - 100, canvas.height - 40, 200, 30);

                ctx.fillStyle = '#00ff9f';
                ctx.font = 'bold 12px "Outfit", sans-serif';
                ctx.textAlign = 'center';
                const status = state.waveState === 'boss' ? 'CRITICAL: BOSS' : (state.waveState === 'spawning' ? 'INCOMING WAVE' : 'SECTOR STABLE');
                ctx.fillText(`WAVE ${state.wave} | ${status}`, canvas.width / 2, canvas.height - 21);
                ctx.textAlign = 'left';
            }
            ctx.shadowBlur = 0;

            // --- SPECTATOR OVERLAY (If Dead) ---
            if (networkManager.isConnected()) {
                const myId = networkManager.getPlayerId();
                const me = state.entities.find(e => e.id === myId);
                if (me && me.x < -1000) { // Dead check
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    ctx.fillStyle = '#ff0055';
                    ctx.font = 'black 32px "Outfit", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = 'black';
                    ctx.fillText("CRITICAL FAILURE // SYSTEM DOWN", canvas.width / 2, canvas.height / 2);
                    ctx.font = 'bold 16px "Outfit", sans-serif';
                    ctx.fillStyle = '#ff9f9f';
                    ctx.fillText("WAITING FOR SQUAD REVIVE...", canvas.width / 2, canvas.height / 2 + 30);
                    ctx.textAlign = 'left';
                    ctx.shadowBlur = 0;
                }
            }

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
                const hudY = canvas.height - 70; // Moved up slightly

                // --- HEALTH BAR ---
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(hudX, hudY, 200, 12);
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.strokeRect(hudX - 1, hudY - 1, 202, 14);

                const hpPct = myPlayer.hp / myPlayer.maxHp;
                const fillGrad = ctx.createLinearGradient(hudX, 0, hudX + 200, 0);
                fillGrad.addColorStop(0, hpPct < 0.3 ? '#ff0055' : '#00ff9f');
                fillGrad.addColorStop(1, hpPct < 0.3 ? '#880022' : '#004422');

                ctx.fillStyle = fillGrad;
                ctx.fillRect(hudX, hudY, 200 * hpPct, 12);

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px "Outfit", sans-serif';
                ctx.fillText(`SYSTEM HP: ${Math.round(myPlayer.hp)}%`, hudX, hudY - 10);

                // --- XP BAR ---
                const xpY = hudY + 25;
                const xp = myPlayer.xp || 0;
                const maxXp = myPlayer.maxXp || 100;
                const xpPct = Math.min(1, xp / maxXp);

                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(hudX, xpY, 200, 6); // Thinner bar

                ctx.fillStyle = '#3a86ff'; // Blue/Azure for XP
                ctx.fillRect(hudX, xpY, 200 * xpPct, 6);

                ctx.fillStyle = '#8ecae6';
                ctx.font = '10px "Outfit", sans-serif';
                ctx.fillText(`LVL ${myPlayer.level || 1}  •  ${Math.floor(xp)} / ${maxXp} XP`, hudX, xpY - 5);

                // --- MONEY INDICATOR ---
                // Draw Coin Icon (Yellow Circle)
                ctx.beginPath();
                ctx.arc(hudX + 260, hudY + 5, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#ffd700'; // Gold
                ctx.fill();
                ctx.strokeStyle = '#b8860b';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 16px "Outfit", sans-serif';
                ctx.fillText(`${(myPlayer.money || 0).toLocaleString()}`, hudX + 275, hudY + 11);

                // Segment lines for Health Bar only
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 1;
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
