import { Intent, WorldState } from '../engine/types.js';

const ENGINE_URL = 'http://localhost:3001';

async function fetchWorldState(): Promise<WorldState> {
    const res = await fetch(`${ENGINE_URL}/world_state`);
    return res.json() as Promise<WorldState>;
}

async function sendIntent(agentId: string, intent: Intent): Promise<void> {
    await fetch(`${ENGINE_URL}/api/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, intent })
    });
}

// -----------------------------------------------------
// Simulated LLM Call
// -----------------------------------------------------
async function generateAgentIntent(agent: any, world: WorldState): Promise<Intent> {
    const model = agent.model || 'llama3.2:latest';

    const systemPrompt = `You are Agent ${agent.name} (Faction: ${agent.faction}) in a 2D simulation. Your energy is ${agent.energy.toFixed(1)}.
The current mode is ${world.mode}.
Your goal: ${world.mode === 'cooperative' ? 'cooperate, accumulate wealth together' : world.mode === 'competitive' ? 'compete, attack rivals, grab resources' : 'survive by any means'}.

Output JSON strictly matching this schema:
{
  "action": "idle" | "move" | "trade" | "attack",
  "target": {"x": number, "y": number} | {"id": "string"},
  "message": {"receiverId": "string", "content": "string"},
  "thought": "detailed explanation of why you are doing this",
  "confidence": 0.0 to 1.0
}`;

    const prompt = `Available resources: ${world.resources.length}
Nearby agents: ${world.agents.filter((a: any) => a.id !== agent.id).map((a: any) => `${a.name} at x:${Math.round(a.position.x)},y:${Math.round(a.position.y)}`).join(', ')}
Decide your next move. JSON only.`;

    try {
        const res = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: systemPrompt + '\\n' + prompt,
                stream: false
            })
        });

        if (!res.ok) throw new Error('Ollama connection failed');

        const data = await res.json() as { response: string };

        // Clean up response if the model generated markdown or extra text
        let jsonStr = data.response;
        if (!jsonStr) throw new Error('Ollama returned empty response');
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
            jsonStr = match[0];
        }
        const parsed = JSON.parse(jsonStr);

        return {
            action: parsed.action || 'idle',
            target: parsed.target,
            message: parsed.message,
            confidence: parsed.confidence || 0.5,
            internal_state_update: { thought: parsed.thought || 'thinking...' }
        };
    } catch (e: any) {
        // Fallback logic activated silently if LLM hallucinates or returns invalid JSON (common for Qwen3:4b)
        return {
            action: 'move',
            target: { x: Math.random() * 700 + 50, y: Math.random() * 500 + 50 },
            confidence: 0.1,
            internal_state_update: { thought: 'Fallback logic activated.' }
        };
    }
}

// -----------------------------------------------------
// Orchestrator Loop
// -----------------------------------------------------
async function runLoop() {
    console.log('Starting Cognitive Layer loop...');
    while (true) {
        try {
            const world = await fetchWorldState();

            // Async run agents
            const agentPromises = world.agents.map(async agent => {
                // Throttling reasoning to not overload logs or be perfectly regular
                // so it looks like async agents
                if (Math.random() < 0.2) {
                    const intent = await generateAgentIntent(agent, world);
                    await sendIntent(agent.id, intent);
                }
            });

            await Promise.allSettled(agentPromises);
        } catch (err) {
            // Backend not running yet
            console.log('Waiting for engine...');
        }

        await new Promise(r => setTimeout(r, 1000)); // Every second run cognitive layer pass
    }
}

runLoop().catch(console.error);
