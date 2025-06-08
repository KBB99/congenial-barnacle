// Core data types based on the architecture document

export interface World {
  worldId: string;
  name: string;
  description: string;
  createdAt: string;
  lastModified: string;
  status: 'running' | 'paused' | 'stopped';
  settings: WorldSettings;
  currentTime: string;
  agentCount: number;
}

export interface WorldSettings {
  timeSpeed: number;
  maxAgents: number;
  worldSize: {
    width: number;
    height: number;
  };
  physics: {
    gravity: boolean;
    collision: boolean;
  };
}

export interface Agent {
  agentId: string;
  worldId: string;
  name: string;
  description: string;
  currentLocation: Location;
  currentAction: string;
  relationships: Record<string, string>;
  goals: string[];
  traits: string[];
  currentPlan: AgentPlan;
  status: 'active' | 'inactive' | 'deleted';
}

export interface Location {
  x: number;
  y: number;
  area: string;
}

export interface AgentPlan {
  dailyPlan: string[];
  hourlyPlan: string[];
  currentStep: string;
}

export interface MemoryStream {
  memoryId: string;
  agentId: string;
  worldId: string;
  type: 'observation' | 'reflection' | 'plan';
  content: string;
  timestamp: string;
  importance: number;
  lastAccessed: string;
  relatedMemories: string[];
  embedding?: number[];
  tags: string[];
}

export interface WorldObject {
  objectId: string;
  worldId: string;
  type: 'building' | 'furniture' | 'vehicle' | 'item';
  name: string;
  location: Location;
  state: Record<string, any>;
  properties: Record<string, any>;
  interactions: string[];
}

export interface WorldEvent {
  eventId: string;
  worldId: string;
  timestamp: string;
  type: 'agent_action' | 'world_event' | 'user_intervention';
  agentId?: string;
  description: string;
  data: Record<string, any>;
  consequences: string[];
}

export interface Snapshot {
  snapshotId: string;
  worldId: string;
  name: string;
  timestamp: string;
  s3Location: string;
  size: number;
  agentCount: number;
  description: string;
}

// UI-specific types
export interface WorldViewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface AgentRelationship {
  agentId: string;
  targetAgentId: string;
  relationshipType: string;
  strength: number;
  description: string;
}

export interface Conversation {
  conversationId: string;
  participants: string[];
  messages: ConversationMessage[];
  startTime: string;
  endTime?: string;
  location: Location;
}

export interface ConversationMessage {
  messageId: string;
  speakerId: string;
  content: string;
  timestamp: string;
  type: 'dialogue' | 'action' | 'thought';
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface AgentUpdateMessage extends WebSocketMessage {
  type: 'agent_update';
  data: {
    agentId: string;
    location?: Location;
    action?: string;
    status?: string;
  };
}

export interface WorldStateMessage extends WebSocketMessage {
  type: 'world_state';
  data: {
    worldId: string;
    status: string;
    currentTime: string;
    agentCount: number;
  };
}

export interface MemoryUpdateMessage extends WebSocketMessage {
  type: 'memory_update';
  data: {
    agentId: string;
    memory: MemoryStream;
  };
}

export interface ConversationWebSocketMessage extends WebSocketMessage {
  type: 'conversation';
  data: {
    conversation: Conversation;
  };
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Form types
export interface CreateWorldForm {
  name: string;
  description: string;
  template?: string;
  settings: Partial<WorldSettings>;
}

export interface CreateAgentForm {
  name: string;
  description: string;
  traits: string[];
  goals: string[];
  location: Location;
}

export interface EditMemoryForm {
  content: string;
  importance: number;
  tags: string[];
}

// Time control types
export interface TimeControlState {
  isPlaying: boolean;
  speed: number;
  currentTime: string;
  canRewind: boolean;
  checkpoints: Checkpoint[];
}

export interface Checkpoint {
  id: string;
  name: string;
  timestamp: string;
  description: string;
}

// Chat interface types
export interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  agentId?: string;
  agentName?: string;
}

export interface ChatSession {
  sessionId: string;
  worldId: string;
  messages: ChatMessage[];
  activeAgents: string[];
  startTime: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Store types
export interface WorldStore {
  currentWorld: World | null;
  worlds: World[];
  loading: boolean;
  error: AppError | null;
}

export interface AgentStore {
  agents: Agent[];
  selectedAgent: Agent | null;
  loading: boolean;
  error: AppError | null;
}

export interface UIStore {
  viewport: WorldViewport;
  selectedTool: string;
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  chatOpen: boolean;
}