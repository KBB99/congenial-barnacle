import { World, Agent } from '../../../shared/types';
import { createLogger } from '../../../shared/utils';

const logger = createLogger('world-state-manager');

export interface Location {
  id: string;
  name: string;
  type: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  properties: Record<string, any>;
}

export interface WorldObject {
  id: string;
  name: string;
  type: string;
  location: {
    x: number;
    y: number;
    area?: string;
  };
  state: Record<string, any>;
  interactions: string[];
}

export interface WeatherState {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
  temperature: number;
  humidity: number;
  windSpeed: number;
}

export interface EnvironmentalEffect {
  type: string;
  intensity: number;
  area?: string;
  duration?: number;
}

export interface ActiveConversation {
  id: string;
  participants: string[];
  startTime: Date;
  location: string;
  topic?: string;
  messages: number;
}

export interface WorldState {
  // Temporal state
  currentTime: Date;
  dayPhase: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
  weather: WeatherState;
  
  // Spatial state
  agents: Map<string, Agent>;
  objects: Map<string, WorldObject>;
  locations: Map<string, Location>;
  
  // Social state
  relationships: Map<string, Map<string, string>>; // agentId -> agentId -> relationship
  conversations: ActiveConversation[];
  
  // Environmental state
  events: any[];
  globalEffects: EnvironmentalEffect[];
  
  // Metadata
  lastUpdated: Date;
  version: number;
}

export class WorldStateManager {
  private worldId: string;
  private state: WorldState;
  private stateHistory: WorldState[] = [];
  private maxHistorySize: number = 10;

  constructor(worldId: string) {
    this.worldId = worldId;
    this.state = this.initializeState();
    logger.info('World state manager initialized', { worldId });
  }

  /**
   * Initialize empty world state
   */
  private initializeState(): WorldState {
    return {
      currentTime: new Date(),
      dayPhase: 'morning',
      weather: {
        condition: 'sunny',
        temperature: 20,
        humidity: 50,
        windSpeed: 5
      },
      agents: new Map(),
      objects: new Map(),
      locations: new Map(),
      relationships: new Map(),
      conversations: [],
      events: [],
      globalEffects: [],
      lastUpdated: new Date(),
      version: 1
    };
  }

  /**
   * Get current world state
   */
  getState(): WorldState {
    return this.state;
  }

  /**
   * Update world state
   */
  updateState(updates: Partial<WorldState>): void {
    // Save current state to history
    this.saveToHistory();

    // Apply updates
    this.state = {
      ...this.state,
      ...updates,
      lastUpdated: new Date(),
      version: this.state.version + 1
    };

    logger.debug('World state updated', {
      worldId: this.worldId,
      version: this.state.version,
      updates: Object.keys(updates)
    });
  }

  /**
   * Update time and day phase
   */
  updateTime(newTime: Date): void {
    const hour = newTime.getHours();
    let dayPhase: WorldState['dayPhase'];
    
    if (hour >= 5 && hour < 7) dayPhase = 'dawn';
    else if (hour >= 7 && hour < 12) dayPhase = 'morning';
    else if (hour >= 12 && hour < 18) dayPhase = 'afternoon';
    else if (hour >= 18 && hour < 21) dayPhase = 'evening';
    else dayPhase = 'night';

    this.updateState({
      currentTime: newTime,
      dayPhase
    });
  }

  /**
   * Update weather
   */
  updateWeather(weather: Partial<WeatherState>): void {
    this.updateState({
      weather: {
        ...this.state.weather,
        ...weather
      }
    });
  }

  /**
   * Add or update an agent
   */
  setAgent(agent: Agent): void {
    const agents = new Map(this.state.agents);
    agents.set(agent.agentId, agent);
    this.updateState({ agents });
  }

  /**
   * Remove an agent
   */
  removeAgent(agentId: string): void {
    const agents = new Map(this.state.agents);
    agents.delete(agentId);
    
    // Also remove from relationships
    const relationships = new Map(this.state.relationships);
    relationships.delete(agentId);
    relationships.forEach(agentRels => agentRels.delete(agentId));
    
    this.updateState({ agents, relationships });
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.state.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAgents(): Agent[] {
    return Array.from(this.state.agents.values());
  }

  /**
   * Get agents in a specific location
   */
  getAgentsInLocation(locationId: string): Agent[] {
    return this.getAgents().filter(agent => 
      agent.currentLocation.area === locationId
    );
  }

  /**
   * Get nearby agents
   */
  getNearbyAgents(agentId: string, radius: number): Agent[] {
    const agent = this.getAgent(agentId);
    if (!agent) return [];

    const { x, y } = agent.currentLocation;
    
    return this.getAgents().filter(other => {
      if (other.agentId === agentId) return false;
      
      const dx = other.currentLocation.x - x;
      const dy = other.currentLocation.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance <= radius;
    });
  }

  /**
   * Update agent relationship
   */
  setRelationship(agentId1: string, agentId2: string, relationship: string): void {
    const relationships = new Map(this.state.relationships);
    
    if (!relationships.has(agentId1)) {
      relationships.set(agentId1, new Map());
    }
    
    relationships.get(agentId1)!.set(agentId2, relationship);
    
    this.updateState({ relationships });
  }

  /**
   * Get relationship between agents
   */
  getRelationship(agentId1: string, agentId2: string): string | undefined {
    return this.state.relationships.get(agentId1)?.get(agentId2);
  }

  /**
   * Add or update an object
   */
  setObject(object: WorldObject): void {
    const objects = new Map(this.state.objects);
    objects.set(object.id, object);
    this.updateState({ objects });
  }

  /**
   * Remove an object
   */
  removeObject(objectId: string): void {
    const objects = new Map(this.state.objects);
    objects.delete(objectId);
    this.updateState({ objects });
  }

  /**
   * Get objects in a location
   */
  getObjectsInLocation(locationId: string): WorldObject[] {
    return Array.from(this.state.objects.values()).filter(obj =>
      obj.location.area === locationId
    );
  }

  /**
   * Add a location
   */
  addLocation(location: Location): void {
    const locations = new Map(this.state.locations);
    locations.set(location.id, location);
    this.updateState({ locations });
  }

  /**
   * Start a conversation
   */
  startConversation(participants: string[], location: string, topic?: string): string {
    const conversation: ActiveConversation = {
      id: `conv-${Date.now()}`,
      participants,
      startTime: new Date(),
      location,
      topic,
      messages: 0
    };

    const conversations = [...this.state.conversations, conversation];
    this.updateState({ conversations });

    return conversation.id;
  }

  /**
   * End a conversation
   */
  endConversation(conversationId: string): void {
    const conversations = this.state.conversations.filter(c => c.id !== conversationId);
    this.updateState({ conversations });
  }

  /**
   * Add a global effect
   */
  addGlobalEffect(effect: EnvironmentalEffect): void {
    const globalEffects = [...this.state.globalEffects, effect];
    this.updateState({ globalEffects });
  }

  /**
   * Remove expired effects
   */
  cleanupExpiredEffects(currentTime: Date): void {
    const globalEffects = this.state.globalEffects.filter(effect => {
      if (!effect.duration) return true;
      // Assuming effects have a startTime property
      return true; // For now, keep all effects
    });
    
    if (globalEffects.length !== this.state.globalEffects.length) {
      this.updateState({ globalEffects });
    }
  }

  /**
   * Create a snapshot of the current state
   */
  createSnapshot(): WorldState {
    return {
      ...this.state,
      agents: new Map(this.state.agents),
      objects: new Map(this.state.objects),
      locations: new Map(this.state.locations),
      relationships: new Map(this.state.relationships),
      conversations: [...this.state.conversations],
      events: [...this.state.events],
      globalEffects: [...this.state.globalEffects]
    };
  }

  /**
   * Restore from a snapshot
   */
  restoreSnapshot(snapshot: WorldState): void {
    this.state = snapshot;
    logger.info('World state restored from snapshot', {
      worldId: this.worldId,
      version: snapshot.version
    });
  }

  /**
   * Save current state to history
   */
  private saveToHistory(): void {
    this.stateHistory.push(this.createSnapshot());
    
    // Limit history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  /**
   * Get state history
   */
  getHistory(): WorldState[] {
    return [...this.stateHistory];
  }

  /**
   * Revert to previous state
   */
  revert(): boolean {
    if (this.stateHistory.length === 0) {
      return false;
    }

    const previousState = this.stateHistory.pop()!;
    this.state = previousState;
    
    logger.info('World state reverted', {
      worldId: this.worldId,
      version: previousState.version
    });
    
    return true;
  }

  /**
   * Get state statistics
   */
  getStats(): {
    agentCount: number;
    objectCount: number;
    locationCount: number;
    activeConversations: number;
    globalEffects: number;
    version: number;
  } {
    return {
      agentCount: this.state.agents.size,
      objectCount: this.state.objects.size,
      locationCount: this.state.locations.size,
      activeConversations: this.state.conversations.length,
      globalEffects: this.state.globalEffects.length,
      version: this.state.version
    };
  }
}