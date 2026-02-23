import { AgentData, Intent, MessagePkt, ResourceNode, WorldState, Position } from './types.js';

export class World {
    public state: WorldState;

    constructor(mode: 'cooperative' | 'competitive' | 'survival' = 'cooperative') {
        this.state = {
            tick: 0,
            agents: [],
            resources: [],
            messages: [],
            width: 800,
            height: 600,
            mode,
        };
    }

    public addAgent(agent: AgentData) {
        this.state.agents.push(agent);
    }

    public addResource(resource: ResourceNode) {
        this.state.resources.push(resource);
    }

    private distance(a: Position, b: Position) {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }

    public applyIntent(agentId: string, intent: Intent) {
        const agent = this.state.agents.find(a => a.id === agentId);
        if (!agent) return;

        // Apply agent thoughts / confidence for UI
        agent.confidence = intent.confidence;
        if (intent.internal_state_update?.thought) {
            agent.lastThoughts = intent.internal_state_update.thought;
            agent.thoughtBubbleUntil = Date.now() + 6000;
            agent.stateAnim = 'thinking';
        } else {
            agent.stateAnim = 'idle';
        }

        if (intent.action === 'move') {
            const target = intent.target as Position;
            if (target && target.x !== undefined && target.y !== undefined) {
                agent.targetPos = target;
            }
        } else if (intent.action === 'trade') {
            // Implementation of logic
            const targetAgentId = (intent.target as { id: string })?.id;
            const targetAgent = this.state.agents.find(a => a.id === targetAgentId);
            if (targetAgent && this.distance(agent.position, targetAgent.position) < 50) {
                // Simple trust boost
                agent.trustScores[targetAgentId] = (agent.trustScores[targetAgentId] || 0) + 1;
                targetAgent.trustScores[agentId] = (targetAgent.trustScores[agentId] || 0) + 1;
            }
        } else if (intent.action === 'attack') {
            const targetAgentId = (intent.target as { id: string })?.id;
            const targetAgent = this.state.agents.find(a => a.id === targetAgentId);
            if (targetAgent && this.distance(agent.position, targetAgent.position) < 50) {
                agent.stateAnim = 'conflict';
                targetAgent.stateAnim = 'conflict';

                agent.conflictWait = 10;
                targetAgent.conflictWait = 10;

                targetAgent.energy = Math.max(0, targetAgent.energy - 10);
                agent.energy += 10;

                // Trust drop
                agent.trustScores[targetAgentId] = (agent.trustScores[targetAgentId] || 0) - 5;
                targetAgent.trustScores[agentId] = (targetAgent.trustScores[agentId] || 0) - 5;
            }
        } else if (intent.action === 'ally') {
            const targetAgentId = (intent.target as { id: string })?.id;
            if (targetAgentId && !agent.alliances.includes(targetAgentId)) {
                agent.alliances.push(targetAgentId);
                agent.stateAnim = 'ally_formed';
            }
        }

        // Process messaging
        if (intent.message) {
            this.state.messages.push({
                id: Math.random().toString(36).substring(7),
                senderId: agentId,
                receiverId: intent.message.receiverId,
                content: intent.message.content,
                timestamp: Date.now(),
                delivered: false,
            });
            agent.lastMessage = intent.message.content;
        }
    }

    public tick() {
        this.state.tick++;
        const SPEED = 0.5;

        for (const agent of this.state.agents) {
            // Manage thought bubble expiry
            if (agent.thoughtBubbleUntil && Date.now() > agent.thoughtBubbleUntil) {
                agent.thoughtBubbleUntil = undefined;
                agent.lastThoughts = undefined;
            }

            if (agent.conflictWait && agent.conflictWait > 0) {
                agent.conflictWait--;
                continue;
            }

            // Physics logic: move towards target
            if (agent.targetPos) {
                const dx = agent.targetPos.x - agent.position.x;
                const dy = agent.targetPos.y - agent.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > SPEED) {
                    const vx = (dx / dist) * SPEED;
                    const vy = (dy / dist) * SPEED;
                    agent.position.x += vx;
                    agent.position.y += vy;
                    agent.velocity = { x: vx, y: vy };
                } else {
                    agent.position.x = agent.targetPos.x;
                    agent.position.y = agent.targetPos.y;
                    agent.velocity = { x: 0, y: 0 };
                    agent.targetPos = undefined;
                }
            }

            // Modes specific logic handled centrally or distributed. 
            // e.g. survival hazard, resource usage.
            if (this.state.tick % 60 === 0) {
                agent.energy = Math.max(0, agent.energy - 1); // Cost of living
                if (this.state.mode === 'survival') {
                    // Hazard zone check could live here
                }
            }

            // Auto resource collection
            for (const res of this.state.resources) {
                if (res.amount > 0 && this.distance(agent.position, res.position) < 20) {
                    res.amount -= 1;
                    agent.energy += 1;
                }
            }
        }

        // Message delivery system (clears old messages)
        const now = Date.now();
        this.state.messages = this.state.messages.filter(m => (!m.delivered || now - m.timestamp < 1000));
        for (const msg of this.state.messages) {
            if (!msg.delivered) {
                msg.delivered = true;
            }
        }

        // Resource respawn maybe?
        for (const res of this.state.resources) {
            if (res.amount < res.maxAmount && Math.random() < 0.01) {
                res.amount += 1;
            }
        }
    }
}
