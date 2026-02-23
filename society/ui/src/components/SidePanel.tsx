import React from 'react';
import type { WorldState } from '../types';

interface SidePanelProps {
    worldState: WorldState;
}

const SidePanel: React.FC<SidePanelProps> = ({ worldState }) => {
    return (
        <div className="side-panel-content">
            <h2>Insight View</h2>

            <div className="panel-section">
                <h3>Agents ({worldState.agents.length})</h3>
                <ul className="agent-list">
                    {worldState.agents.map(a => (
                        <li key={a.id}>
                            <strong>{a.name}</strong> ({a.faction}) - <em>{a.model || 'Mock'}</em>
                            <div>Energy: {a.energy.toFixed(1)}</div>
                            <div>State: {a.stateAnim}</div>
                            {a.lastThoughts && (
                                <div style={{ fontSize: '0.85em', color: '#b8b8b8', marginTop: '5px', fontStyle: 'italic', borderLeft: '2px solid #555', paddingLeft: '5px' }}>
                                    💭 {a.lastThoughts}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="panel-section">
                <h3>Recent Messages</h3>
                <ul className="message-list">
                    {worldState.messages.map(m => (
                        <li key={m.id}>
                            <em>{m.senderId} &rarr; {m.receiverId}:</em> {m.content}
                        </li>
                    ))}
                </ul>
            </div>

        </div>
    );
};

export default SidePanel;
