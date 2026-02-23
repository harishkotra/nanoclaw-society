export interface Position {
  x: number;
  y: number;
}

export type ActionType = 'move' | 'trade' | 'request' | 'attack' | 'ally' | 'idle';

export interface Intent {
  action: ActionType;
  target?: { id: string } | Position;
  message?: { receiverId: string; content: string };
  internal_state_update?: Record<string, any>;
  confidence: number;
}

export interface MessagePkt {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  delivered: boolean;
}

export type Faction = 'red' | 'blue' | 'green' | 'yellow' | 'neutral';

export type AgentStateAnim = 'thinking' | 'idle' | 'conflict' | 'ally_formed';

export interface AgentData {
  id: string;
  name: string;
  position: Position;
  velocity: Position;
  energy: number;
  faction: Faction;
  stateAnim: AgentStateAnim;
  trustScores: Record<string, number>;
  alliances: string[];
  conflictWait?: number;
  targetPos?: Position;
  lastMessage?: string;
  lastThoughts?: string;
  thoughtBubbleUntil?: number;
  confidence: number;
  model?: string;
}

export interface ResourceNode {
  id: string;
  position: Position;
  amount: number;
  maxAmount: number;
}

export interface WorldState {
  tick: number;
  agents: AgentData[];
  resources: ResourceNode[];
  messages: MessagePkt[];
  width: number;
  height: number;
  mode: 'cooperative' | 'competitive' | 'survival';
  isPaused?: boolean;
  speed?: number;
}
