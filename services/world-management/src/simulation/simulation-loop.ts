import { TimeController, SimulationTime } from './time-controller';
import { createLogger } from '../../../shared/utils';
import { Agent, World } from '../../../shared/types';

const logger = createLogger('simulation-loop');

export interface SimulationConfig {
  worldId: string;
  tickRate?: number;
  timeMultiplier?: number;
  batchSize?: number;
  maxConcurrentAgents?: number;
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: Date;
  processedTicks: number;
  activeAgents: number;
  lastTickDuration: number;
  averageTickDuration: number;
}

export interface TickResult {
  tickNumber: number;
  simulationTime: Date;
  processedAgents: number;
  events: any[];
  errors: any[];
  duration: number;
}

export class SimulationLoop {
  private timeController: TimeController;
  private worldId: string;
  private isRunning: boolean = false;
  private processedTicks: number = 0;
  private tickDurations: number[] = [];
  private batchSize: number;
  private maxConcurrentAgents: number;
  
  // Service URLs
  private agentServiceUrl: string;
  private llmServiceUrl: string;
  private worldServiceUrl: string;

  constructor(config: SimulationConfig) {
    this.worldId = config.worldId;
    this.batchSize = config.batchSize || 10;
    this.maxConcurrentAgents = config.maxConcurrentAgents || 5;
    
    // Initialize time controller
    this.timeController = new TimeController({
      tickRate: config.tickRate || 10,
      timeMultiplier: config.timeMultiplier || 1
    });
    
    // Service URLs from environment
    this.agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:3001';
    this.llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://localhost:3002';
    this.worldServiceUrl = process.env.WORLD_SERVICE_URL || 'http://localhost:3000';
    
    // Set up time controller event handlers
    this.setupTimeHandlers();
  }

  /**
   * Start the simulation loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Simulation loop already running', { worldId: this.worldId });
      return;
    }

    logger.info('Starting simulation loop', { 
      worldId: this.worldId,
      batchSize: this.batchSize,
      maxConcurrentAgents: this.maxConcurrentAgents
    });

    this.isRunning = true;
    this.timeController.start();
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    logger.info('Pausing simulation', { worldId: this.worldId });
    this.timeController.pause();
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    logger.info('Resuming simulation', { worldId: this.worldId });
    this.timeController.resume();
  }

  /**
   * Stop the simulation loop
   */
  stop(): void {
    logger.info('Stopping simulation loop', { worldId: this.worldId });
    this.isRunning = false;
    this.timeController.pause();
    this.timeController.destroy();
  }

  /**
   * Set simulation speed
   */
  setSpeed(multiplier: number): void {
    this.timeController.setSpeed(multiplier);
  }

  /**
   * Skip time forward
   */
  skipTime(minutes: number): void {
    this.timeController.skipTime(minutes);
  }

  /**
   * Get current simulation state
   */
  getState(): SimulationState {
    const timeState = this.timeController.getTimeState();
    const avgDuration = this.tickDurations.length > 0
      ? this.tickDurations.reduce((a, b) => a + b, 0) / this.tickDurations.length
      : 0;

    return {
      isRunning: this.isRunning,
      isPaused: timeState.isPaused,
      currentTime: timeState.simulationTime,
      processedTicks: this.processedTicks,
      activeAgents: 0, // Will be updated when we fetch agents
      lastTickDuration: this.tickDurations[this.tickDurations.length - 1] || 0,
      averageTickDuration: avgDuration
    };
  }

  /**
   * Set up time controller event handlers
   */
  private setupTimeHandlers(): void {
    this.timeController.on('tick', async (tickData) => {
      if (!this.isRunning) return;
      
      try {
        await this.processTick(tickData);
      } catch (error) {
        logger.error('Error processing tick', error as Error, { 
          worldId: this.worldId,
          tick: tickData 
        });
      }
    });

    this.timeController.on('started', (timeState: SimulationTime) => {
      logger.info('Simulation time started', { worldId: this.worldId, timeState });
    });

    this.timeController.on('paused', (timeState: SimulationTime) => {
      logger.info('Simulation time paused', { worldId: this.worldId, timeState });
    });

    this.timeController.on('speedChanged', (data) => {
      logger.info('Simulation speed changed', { 
        worldId: this.worldId, 
        oldSpeed: data.oldSpeed,
        newSpeed: data.newSpeed 
      });
    });
  }

  /**
   * Process a single simulation tick
   */
  private async processTick(tickData: any): Promise<TickResult> {
    const startTime = Date.now();
    const tickNumber = ++this.processedTicks;
    
    logger.debug('Processing tick', { 
      worldId: this.worldId, 
      tickNumber,
      simulationTime: tickData.simulationTime 
    });

    const result: TickResult = {
      tickNumber,
      simulationTime: tickData.simulationTime,
      processedAgents: 0,
      events: [],
      errors: [],
      duration: 0
    };

    try {
      // 1. Get world state
      const worldState = await this.getWorldState();
      
      // 2. Process scheduled events
      const events = await this.processScheduledEvents(tickData.simulationTime);
      result.events.push(...events);
      
      // 3. Process agents in batches
      const agentResults = await this.processAgents(worldState, tickData);
      result.processedAgents = agentResults.processed;
      result.errors.push(...agentResults.errors);
      
      // 4. Update world state
      await this.updateWorldState(worldState, tickData.simulationTime);
      
      // 5. Broadcast updates
      await this.broadcastUpdates(worldState, result);
      
    } catch (error) {
      logger.error('Failed to process tick', error as Error, { 
        worldId: this.worldId, 
        tickNumber 
      });
      result.errors.push({
        type: 'tick_error',
        message: (error as Error).message,
        tickNumber
      });
    }

    // Record tick duration
    const duration = Date.now() - startTime;
    result.duration = duration;
    this.recordTickDuration(duration);

    // Log tick completion
    if (tickNumber % 10 === 0) {
      logger.info('Tick milestone', {
        worldId: this.worldId,
        tickNumber,
        avgDuration: this.tickDurations.reduce((a, b) => a + b, 0) / this.tickDurations.length,
        processedAgents: result.processedAgents
      });
    }

    return result;
  }

  /**
   * Get current world state
   */
  private async getWorldState(): Promise<any> {
    try {
      const response = await fetch(`${this.worldServiceUrl}/api/worlds/${this.worldId}/state`);
      if (!response.ok) {
        throw new Error(`Failed to get world state: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('Failed to get world state', error as Error, { worldId: this.worldId });
      // Return minimal state to continue simulation
      return {
        worldId: this.worldId,
        agents: [],
        objects: [],
        events: []
      };
    }
  }

  /**
   * Process scheduled events for the current time
   */
  private async processScheduledEvents(simulationTime: Date): Promise<any[]> {
    // TODO: Implement event processing
    // For now, return empty array
    return [];
  }

  /**
   * Process all agents in the world
   */
  private async processAgents(worldState: any, tickData: any): Promise<{
    processed: number;
    errors: any[];
  }> {
    const agents = worldState.agents || [];
    const errors: any[] = [];
    let processed = 0;

    // Process agents in batches
    for (let i = 0; i < agents.length; i += this.batchSize) {
      const batch = agents.slice(i, i + this.batchSize);
      
      try {
        // Process batch in parallel with concurrency limit
        const batchPromises = batch.map((agent: Agent) => 
          this.processAgent(agent, worldState, tickData)
        );
        
        const results = await Promise.allSettled(batchPromises);
        
        // Count successes and collect errors
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            processed++;
          } else {
            errors.push({
              agentId: batch[index].agentId,
              error: result.reason
            });
          }
        });
        
      } catch (error) {
        logger.error('Failed to process agent batch', error as Error, {
          worldId: this.worldId,
          batchIndex: i / this.batchSize
        });
        errors.push({
          type: 'batch_error',
          message: (error as Error).message,
          batchIndex: i / this.batchSize
        });
      }
    }

    return { processed, errors };
  }

  /**
   * Process a single agent
   */
  private async processAgent(agent: Agent, worldState: any, tickData: any): Promise<void> {
    try {
      const response = await fetch(`${this.agentServiceUrl}/api/agents/${agent.agentId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          worldState,
          timeStep: tickData.tickCount,
          simulationTime: tickData.simulationTime
        })
      });

      if (!response.ok) {
        throw new Error(`Agent processing failed: ${response.statusText}`);
      }

      const result = await response.json();
      logger.debug('Agent processed', { 
        agentId: agent.agentId, 
        actions: result.actions?.length || 0 
      });
      
    } catch (error) {
      logger.error('Failed to process agent', error as Error, { 
        agentId: agent.agentId 
      });
      throw error;
    }
  }

  /**
   * Update world state after processing
   */
  private async updateWorldState(worldState: any, simulationTime: Date): Promise<void> {
    try {
      await fetch(`${this.worldServiceUrl}/api/worlds/${this.worldId}/state`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...worldState,
          currentTime: simulationTime,
          lastUpdated: new Date()
        })
      });
    } catch (error) {
      logger.error('Failed to update world state', error as Error, { 
        worldId: this.worldId 
      });
    }
  }

  /**
   * Broadcast updates to connected clients
   */
  private async broadcastUpdates(worldState: any, tickResult: TickResult): Promise<void> {
    // TODO: Implement WebSocket broadcasting
    // For now, just log
    logger.debug('Broadcasting updates', {
      worldId: this.worldId,
      tickNumber: tickResult.tickNumber,
      agentCount: tickResult.processedAgents
    });
  }

  /**
   * Record tick duration for performance monitoring
   */
  private recordTickDuration(duration: number): void {
    this.tickDurations.push(duration);
    
    // Keep only last 100 durations
    if (this.tickDurations.length > 100) {
      this.tickDurations.shift();
    }
  }
}