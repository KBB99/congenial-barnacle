// Shared TypeScript types for the generative world system

export interface World {
  worldId: string;
  name: string;
  description: string;
  createdAt: string;
  lastModified: string;
  status: 'running' | 'paused' | 'stopped';
  settings: {
    timeSpeed: number;
    maxAgents: number;
    worldSize: { width: number; height: number };
    physics: { gravity: boolean; collision: boolean };
  };
  currentTime: string;
  agentCount: number;
}

export interface Agent {
  agentId: string;
  worldId: string;
  name: string;
  description: string;
  currentLocation: { x: number; y: number; area: string };
  currentAction: string;
  relationships: Record<string, string>;
  goals: string[];
  traits: string[];
  currentPlan: {
    dailyPlan: string[];
    hourlyPlan: string[];
    currentStep: string;
  };
  status: 'active' | 'inactive' | 'deleted';
}

export interface MemoryStream {
  memoryId: string;
  agentId: string;
  worldId: string;
  type: 'observation' | 'reflection' | 'plan';
  content: string;
  timestamp: string;
  importance: number; // 1-10 scale
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
  location: { x: number; y: number; area: string };
  state: Record<string, any>;
  properties: Record<string, any>;
  interactions: string[];
}

export interface Event {
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

// Memory retrieval scoring components
export interface MemoryScore {
  memoryId: string;
  relevanceScore: number;
  recencyScore: number;
  importanceScore: number;
  combinedScore: number;
}

// Reflection generation types
export interface ReflectionQuestion {
  question: string;
  relatedMemories: string[];
}

export interface ReflectionInsight {
  insight: string;
  evidence: string[];
  importance: number;
}

// Planning types
export interface DailyPlan {
  date: string;
  activities: string[];
  goals: string[];
}

export interface HourlyPlan {
  hour: number;
  actions: string[];
  context: string;
}

export interface MinutePlan {
  minute: number;
  action: string;
  reasoning: string;
}

// Agent action types
export interface AgentAction {
  actionId: string;
  agentId: string;
  type: 'move' | 'interact' | 'communicate' | 'observe' | 'reflect' | 'plan';
  target?: string;
  parameters: Record<string, any>;
  timestamp: string;
  duration: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

// Dialogue types
export interface Dialogue {
  dialogueId: string;
  participants: string[];
  worldId: string;
  location: { x: number; y: number; area: string };
  startTime: string;
  endTime?: string;
  messages: DialogueMessage[];
  context: string;
}

export interface DialogueMessage {
  messageId: string;
  speakerId: string;
  content: string;
  timestamp: string;
  emotion?: string;
  intent?: string;
}

// LLM integration types
export interface LLMRequest {
  requestId: string;
  model: string;
  prompt: string;
  context: Record<string, any>;
  maxTokens: number;
  temperature: number;
  timestamp: string;
}

export interface LLMResponse {
  requestId: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  timestamp: string;
  cached: boolean;
}

// Error types
export class GenerativeWorldError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'GenerativeWorldError';
  }
}

export class MemoryRetrievalError extends GenerativeWorldError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'MEMORY_RETRIEVAL_ERROR', details);
  }
}

export class ReflectionError extends GenerativeWorldError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'REFLECTION_ERROR', details);
  }
}

export class PlanningError extends GenerativeWorldError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'PLANNING_ERROR', details);
  }
}

export class LLMIntegrationError extends GenerativeWorldError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'LLM_INTEGRATION_ERROR', details);
  }
}

export class WorldManagementError extends GenerativeWorldError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'WORLD_MANAGEMENT_ERROR', details);
  }
}