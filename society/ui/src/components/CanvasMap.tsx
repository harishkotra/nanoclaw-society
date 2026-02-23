import React, { useEffect, useRef } from 'react';
import type { WorldState, Faction } from '../types';

interface CanvasMapProps {
    worldState: WorldState;
    showMessages?: boolean;
    showThoughts?: boolean;
}

const FACTION_COLORS: Record<Faction, string> = {
    red: '#ff4d4f',
    blue: '#1890ff',
    green: '#52c41a',
    yellow: '#fadb14',
    neutral: '#d9d9d9',
};

const CanvasMap: React.FC<CanvasMapProps> = ({ worldState, showMessages = true, showThoughts = true }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw message lines
        if (showMessages) {
            worldState.messages.forEach(msg => {
                const sender = worldState.agents.find(a => a.id === msg.senderId);
                const receiver = worldState.agents.find(a => a.id === msg.receiverId);
                if (sender && receiver) {
                    ctx.beginPath();
                    ctx.moveTo(sender.position.x, sender.position.y);
                    ctx.lineTo(receiver.position.x, receiver.position.y);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Draw little packet animation
                    const elapsed = Date.now() - msg.timestamp;
                    const progress = Math.min(1, elapsed / 1000); // 1 second animation
                    const px = Math.round(sender.position.x + (receiver.position.x - sender.position.x) * progress);
                    const py = Math.round(sender.position.y + (receiver.position.y - sender.position.y) * progress);

                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(px, py, 3, 0, Math.PI * 2);
                    ctx.fill();

                    // Draw 1-line summary briefly
                    if (progress < 0.8) {
                        ctx.fillStyle = 'rgba(255,255,255,0.8)';
                        ctx.font = '10px Arial';
                        ctx.fillText(msg.content, px + 5, py - 5);
                    }
                }
            });
        }

        // Draw Resources
        worldState.resources.forEach(res => {
            const rx = Math.round(res.position.x);
            const ry = Math.round(res.position.y);
            ctx.fillStyle = '#faad14';
            ctx.beginPath();
            ctx.arc(rx, ry, 10 * (res.amount / res.maxAmount) + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(res.amount.toString(), rx, ry + 3);
        });

        // Draw Agents
        worldState.agents.forEach(agent => {
            const x = Math.round(agent.position.x);
            const y = Math.round(agent.position.y);

            // Glow (Confidence)
            const glowScale = agent.confidence ? agent.confidence * 15 : 0;
            if (glowScale > 0) {
                ctx.shadowBlur = glowScale;
                ctx.shadowColor = FACTION_COLORS[agent.faction];
            }

            // Draw agent body (Circle)
            ctx.fillStyle = FACTION_COLORS[agent.faction];

            // Thinking pulse
            let radius = 12 + (agent.energy / 100) * 6;
            if (agent.stateAnim === 'thinking') {
                radius += Math.sin(Date.now() / 150) * 2;
            }

            ctx.beginPath();
            ctx.arc(x, y, Math.max(radius, 5), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // Reset

            // Status indicator ring
            ctx.lineWidth = 2;
            if (agent.stateAnim === 'conflict') {
                ctx.strokeStyle = '#ff4d4f';
                ctx.stroke();
            } else if (agent.stateAnim === 'ally_formed') {
                ctx.strokeStyle = '#1890ff';
                ctx.stroke();
            }

            // Thought bubble (Dynamic Multi-line Chat Bubble)
            ctx.globalCompositeOperation = 'source-over'; // Draw bubbles on top of everything
            if (showThoughts && agent.lastThoughts) {
                // Aggressively summarize thoughts to prevent massive overlapping boxes
                let text = String(agent.lastThoughts);
                if (text.length > 70) {
                    text = text.trim().substring(0, 67) + '...';
                }

                ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                const maxWidth = 130;

                const words = text.split(' ');
                let line = '';
                const lines = [];
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && n > 0) {
                        lines.push(line);
                        line = words[n] + ' ';
                    } else {
                        line = testLine;
                    }
                }
                lines.push(line.trim());

                const lineHeight = 15;
                let maxLineWidth = 0;
                lines.forEach(l => {
                    const w = ctx.measureText(l).width;
                    if (w > maxLineWidth) maxLineWidth = w;
                });
                const finalBubbleWidth = Math.max(40, maxLineWidth + 16);
                const bubbleHeight = (lines.length * lineHeight) + 12;

                // Position constraint to keep bubbles on screen
                let bx = x - finalBubbleWidth / 2;
                let by = y - radius - bubbleHeight - 12;

                if (bx < 5) bx = 5;
                if (bx + finalBubbleWidth > canvas.width - 5) bx = canvas.width - finalBubbleWidth - 5;

                // if it goes off the top of the canvas, render it *below* the agent instead
                let isBottomPointer = true;
                if (by < 5) {
                    by = y + radius + 15;
                    isBottomPointer = false;
                }

                // Draw rounded bubble box
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.lineWidth = 1;

                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(bx, by, finalBubbleWidth, bubbleHeight, 8);
                } else {
                    ctx.rect(bx, by, finalBubbleWidth, bubbleHeight);
                }
                ctx.fill();
                ctx.stroke();

                // Draw bubble pointer 
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.beginPath();
                if (isBottomPointer) {
                    ctx.moveTo(x - 6, by + bubbleHeight);
                    ctx.lineTo(x + 6, by + bubbleHeight);
                    ctx.lineTo(x, by + bubbleHeight + 8);
                } else {
                    ctx.moveTo(x - 6, by);
                    ctx.lineTo(x + 6, by);
                    ctx.lineTo(x, by - 8);
                }
                ctx.fill();

                // Draw Text
                ctx.fillStyle = '#111';
                ctx.textAlign = 'center';
                lines.forEach((l, i) => {
                    ctx.fillText(l, bx + finalBubbleWidth / 2, by + 14 + (i * lineHeight));
                });
            }

            // Label
            ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            const labelWidth = ctx.measureText(agent.name).width + 12;

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x - labelWidth / 2, y + radius + 4, labelWidth, 16, 8);
            } else {
                ctx.rect(x - labelWidth / 2, y + radius + 4, labelWidth, 16);
            }
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.fillText(agent.name, x, y + radius + 15);
        });

        // Draw Legend Map in top-left
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(10, 10, 120, 85, 8);
        } else {
            ctx.rect(10, 10, 120, 85);
        }
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Factions', 20, 26);

        let ly = 45;
        ['red', 'blue', 'green'].forEach(faction => {
            ctx.fillStyle = FACTION_COLORS[faction as Faction];
            ctx.beginPath();
            ctx.arc(25, ly - 3, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ddd';
            ctx.font = '10px -apple-system, sans-serif';
            ctx.fillText(faction.charAt(0).toUpperCase() + faction.slice(1), 38, ly);
            ly += 20;
        });

    }, [worldState]); // Re-render every tick

    return (
        <canvas
            ref={canvasRef}
            width={worldState.width}
            height={worldState.height}
            style={{ border: '1px solid #333', background: '#1e1e24', display: 'block', margin: '0 auto' }}
        />
    );
};

export default CanvasMap;
