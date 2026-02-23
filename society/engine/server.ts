import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { World } from './World.js';
import { Intent, Position } from './types.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
    }
});

let currentWorld = new World('cooperative');

async function initModelsAndAgents() {
    let models = ['llama3.2:latest']; // default
    try {
        const res = await fetch('http://localhost:11434/api/tags');
        const data = await res.json();
        const available = data.models
            .map((m: any) => m.name)
            .filter((n: string) => !n.includes('embed') && !n.includes('qwen'));
        if (available.length > 0) models = available;
    } catch (e) {
        console.log('Could not fetch Ollama models, using fallback.');
    }

    // Initialize agents
    for (let i = 0; i < 15; i++) {
        currentWorld.addAgent({
            id: `agent_${i}`,
            name: `Agent ${i}`,
            position: { x: Math.random() * 700 + 50, y: Math.random() * 500 + 50 },
            velocity: { x: 0, y: 0 },
            energy: 100,
            faction: ['red', 'blue', 'green'][i % 3] as any,
            stateAnim: 'idle',
            trustScores: {},
            alliances: [],
            confidence: 1.0,
            model: models[i % models.length]
        });
    }

    for (let i = 0; i < 5; i++) {
        currentWorld.addResource({
            id: `res_${i}`,
            position: { x: Math.random() * 700 + 50, y: Math.random() * 500 + 50 },
            amount: 50,
            maxAmount: 100
        });
    }
}

// Tick loop: ~60fps
const TICK_RATE = 1000 / 60;
let accumulator = 0;

setInterval(() => {
    if (!currentWorld.state.isPaused) {
        // default speed is 1 if undefined, representing normal 60 ticks per second.
        accumulator += (currentWorld.state.speed ?? 1);
        while (accumulator >= 1) {
            currentWorld.tick();
            accumulator -= 1;
        }
    }
    io.volatile.emit('world_state', currentWorld.state);
}, TICK_RATE);

io.on('connection', (socket) => {
    console.log('UI connected:', socket.id);

    socket.emit('world_state', currentWorld.state);

    socket.on('set_mode', (mode: 'cooperative' | 'competitive' | 'survival') => {
        currentWorld.state.mode = mode;
    });

    socket.on('set_paused', (paused: boolean) => {
        currentWorld.state.isPaused = paused;
    });

    socket.on('set_speed', (speed: number) => {
        currentWorld.state.speed = speed;
    });

    socket.on('step', () => {
        if (currentWorld.state.isPaused) {
            currentWorld.tick();
            // immediately emit the state
            io.volatile.emit('world_state', currentWorld.state);
        }
    });

    socket.on('disconnect', () => {
        console.log('UI disconnected:', socket.id);
    });
});

// Cognitive API for agents to send intents
app.post('/api/intent', (req, res) => {
    const { agentId, intent } = req.body as { agentId: string, intent: Intent };
    if (!agentId || !intent) {
        return res.status(400).send({ error: 'Missing agentId or intent' });
    }

    currentWorld.applyIntent(agentId, intent);
    res.send({ status: 'ok' });
});

app.get('/world_state', (req, res) => {
    res.send(currentWorld.state);
});

// API config
const PORT = process.env.PORT || 3001;

initModelsAndAgents().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`Society Engine running on http://localhost:${PORT}`);
    });
});
