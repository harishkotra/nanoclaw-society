import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { WorldState } from './types';
import CanvasMap from './components/CanvasMap';
import ControlPanel from './components/ControlPanel';
import SidePanel from './components/SidePanel';
import './App.css';

const SOCKET_URL = 'http://localhost:3001';

function App() {
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [socket, setSocket] = useState<any>(null);

  // Local UI visual toggles
  const [showMessages, setShowMessages] = useState<boolean>(true);
  const [showThoughts, setShowThoughts] = useState<boolean>(true);

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on('world_state', (state: WorldState) => {
      setWorldState(state);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleSetMode = (mode: 'cooperative' | 'competitive' | 'survival') => {
    if (socket) socket.emit('set_mode', mode);
  };

  const handleSetPaused = (paused: boolean) => {
    if (socket) socket.emit('set_paused', paused);
  };

  const handleSetSpeed = (speed: number) => {
    if (socket) socket.emit('set_speed', speed);
  };

  const handleStep = () => {
    if (socket) socket.emit('step');
  };

  if (!worldState) {
    return <div className="loading">Connecting to Society Engine...</div>;
  }

  return (
    <div className="app-container">
      <div className="main-content">
        <header>
          <h1>NanoClaw Society</h1>
          <ControlPanel
            mode={worldState.mode}
            tick={worldState.tick}
            isPaused={worldState.isPaused || false}
            speed={worldState.speed || 1}
            onSetMode={handleSetMode}
            onSetPaused={handleSetPaused}
            onSetSpeed={handleSetSpeed}
            onStep={handleStep}
            showMessages={showMessages}
            onToggleMessages={setShowMessages}
            showThoughts={showThoughts}
            onToggleThoughts={setShowThoughts}
          />
        </header>
        <div className="canvas-wrapper">
          <CanvasMap
            worldState={worldState}
            showMessages={showMessages}
            showThoughts={showThoughts}
          />
        </div>
      </div>
      <aside className="side-panel">
        <SidePanel worldState={worldState} />
      </aside>
    </div>
  );
}

export default App;
