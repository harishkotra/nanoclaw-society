import React from 'react';

interface ControlPanelProps {
    mode: string;
    tick: number;
    isPaused: boolean;
    speed: number;
    onSetMode: (mode: 'cooperative' | 'competitive' | 'survival') => void;
    onSetPaused: (paused: boolean) => void;
    onSetSpeed: (speed: number) => void;
    onStep: () => void;
    showMessages: boolean;
    onToggleMessages: (show: boolean) => void;
    showThoughts: boolean;
    onToggleThoughts: (show: boolean) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    mode, tick, isPaused, speed,
    onSetMode, onSetPaused, onSetSpeed, onStep,
    showMessages, onToggleMessages,
    showThoughts, onToggleThoughts
}) => {
    return (
        <div className="control-panel" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div><strong>Tick:</strong> {tick}</div>

            <div>
                <strong>Mode:</strong>
                <select value={mode} onChange={(e) => onSetMode(e.target.value as any)} style={{ marginLeft: 5 }}>
                    <option value="cooperative">Cooperative</option>
                    <option value="competitive">Competitive</option>
                    <option value="survival">Survival</option>
                </select>
            </div>

            <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => onSetPaused(!isPaused)}>
                    {isPaused ? '▶ Play' : '⏸ Pause'}
                </button>
                <button onClick={onStep} disabled={!isPaused}>⏭ Step</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <strong>Speed:</strong>
                <input
                    type="range" min="0.01" max="2" step="0.01"
                    value={speed}
                    onChange={(e) => onSetSpeed(parseFloat(e.target.value))}
                />
                <span>{speed.toFixed(2)}x</span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <label>
                    <input type="checkbox" checked={showMessages} onChange={(e) => onToggleMessages(e.target.checked)} />
                    Messages
                </label>
                <label>
                    <input type="checkbox" checked={showThoughts} onChange={(e) => onToggleThoughts(e.target.checked)} />
                    Thoughts
                </label>
            </div>

        </div>
    );
};

export default ControlPanel;
