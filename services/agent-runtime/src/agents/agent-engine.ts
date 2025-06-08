import { Agent, AgentAction, MemoryStream, GenerativeWorldError } from '../../../shared/types';
import { db } from '../../../shared/database';
import { createLogger, generateId, generateTimestamp, isWithinRange } from '../../../shared/utils';
import { MemoryManager } from '../memory/memory-manager';
import { ReflectionEngine } from '../reflection/reflection-engine';
import { PlanningEngine } from '../planning/planning-engine';
import { DialogueManager } from '../dialogue/dialogue-manager';

const logger = createLogger('agent-engine');

interface WorldState {
  currentTime: string;
  agents: Agent[];
  objects: any[];
  events: any[];
  environment: any;
}

interface ProcessingResult {
  agentId: string;
  actions: AgentAction[];
  observations: string[];
  newMemories: string[];
  planUpdates: any;
  dialogues: string[];
  status: 'success' | 'error';
  error?: string;
}

export class AgentEngine {
  private memoryManager: MemoryManager;
  private reflectionEngine: ReflectionEngine;
  private planningEngine: PlanningEngine;
  private dialogueManager: DialogueManager;
  private llmServiceUrl: string;

  constructor(
    memoryManager: MemoryManager,
    reflectionEngine: ReflectionEngine,
    planningEngine: PlanningEngine,
    dialogueManager: DialogueManager
  ) {
    this.memoryManager = memoryManager;
    this.reflectionEngine = reflectionEngine;
    this.planningEngine = planningEngine;
    this.dialogueManager = dialogueManager;
    this.llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://localhost:3002';
  }

  async createAgent(agent: Agent): Promise<void> {
    try {
      // Validate agent data
      if (!agent.agentId || !agent.worldId || !agent.name) {
        throw new Error('Agent must have agentId, worldId, and name');
      }

      // Set default values
      agent.status = agent.status || 'active';
      agent.currentAction = agent.currentAction || 'observing surroundings';
      agent.relationships = agent.relationships || {};
      agent.goals = agent.goals || [];
      agent.traits = agent.traits || [];
      agent.currentPlan = agent.currentPlan || {
        dailyPlan: [],
        hourlyPlan: [],
        currentStep: 'getting oriented'
      };

      await db.putAgent(agent);

      // Create initial observation memory
      await this.createInitialMemories(agent);

      // Generate initial daily plan
      await this.planningEngine.generatePlan(agent.agentId, 'daily', {
        agent,
        currentTime: generateTimestamp()
      });

      logger.info('Agent created successfully', { agentId: agent.agentId, worldId: agent.worldId });
    } catch (error) {
      logger.error('Failed to create agent', error as Error, { agentId: agent.agentId });
      throw new GenerativeWorldError('Failed to create agent', 'AGENT_ERROR', { agentId: agent.agentId });
    }
  }

  async getAgent(agentId: string): Promise<Agent | null> {
    try {
      return await db.getAgent(agentId);
    } catch (error) {
      logger.error('Failed to get agent', error as Error, { agentId });
      throw new GenerativeWorldError('Failed to get agent', 'AGENT_ERROR', { agentId });
    }
  }

  async updateAgent(agentId: string, updates: Partial<Agent>): Promise<void> {
    try {
      const agent = await db.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Apply updates
      Object.assign(agent, updates);
      await db.putAgent(agent);

      logger.debug('Agent updated', { agentId, updates: Object.keys(updates) });
    } catch (error) {
      logger.error('Failed to update agent', error as Error, { agentId });
      throw new GenerativeWorldError('Failed to update agent', 'AGENT_ERROR', { agentId });
    }
  }

  async processAgent(agentId: string, worldState: WorldState, timeStep: number): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      agentId,
      actions: [],
      observations: [],
      newMemories: [],
      planUpdates: {},
      dialogues: [],
      status: 'success'
    };

    try {
      const agent = await db.getAgent(agentId);
      if (!agent || agent.status !== 'active') {
        result.status = 'error';
        result.error = 'Agent not found or inactive';
        return result;
      }

      // Step 1: Observe environment
      const observations = await this.observeEnvironment(agent, worldState);
      result.observations = observations;

      // Step 2: Store observations as memories
      for (const observation of observations) {
        const memoryId = await this.memoryManager.addMemory(agentId, {
          worldId: agent.worldId,
          type: 'observation',
          content: observation,
          tags: ['environment', 'observation']
        });
        result.newMemories.push(memoryId);
      }

      // Step 3: Check for reflection triggers
      if (await this.reflectionEngine.shouldTriggerReflection(agentId)) {
        const reflection = await this.reflectionEngine.generateReflection(agentId);
        if (reflection) {
          logger.debug('Reflection generated during processing', { agentId });
        }
      }

      // Step 4: Update plans if needed
      const significantObservation = observations.find(obs => 
        obs.includes('unexpected') || obs.includes('changed') || obs.includes('new')
      );
      
      if (significantObservation) {
        const replanned = await this.planningEngine.replanIfNeeded(agentId, significantObservation, {
          agent,
          currentTime: worldState.currentTime,
          worldState
        });
        
        if (replanned) {
          result.planUpdates = { replanned: true, trigger: significantObservation };
        }
      }

      // Step 5: Generate and execute actions
      const action = await this.generateNextAction(agent, worldState);
      if (action) {
        const executionResult = await this.executeAction(agentId, action);
        result.actions.push(action);
        
        // Store action as memory
        const actionMemoryId = await this.memoryManager.addMemory(agentId, {
          worldId: agent.worldId,
          type: 'observation',
          content: `I ${action.type}: ${action.parameters.description || action.type}`,
          importance: 3,
          tags: ['action', action.type]
        });
        result.newMemories.push(actionMemoryId);
      }

      // Step 6: Handle social interactions
      const nearbyAgents = this.findNearbyAgents(agent, worldState.agents);
      for (const nearbyAgent of nearbyAgents) {
        if (this.shouldInitiateInteraction(agent, nearbyAgent)) {
          const dialogue = await this.dialogueManager.initiateDialogue(
            agentId, 
            nearbyAgent.agentId,
            {
              location: agent.currentLocation,
              situation: 'casual encounter'
            }
          );
          result.dialogues.push(dialogue.dialogueId);
        }
      }

      logger.debug('Agent processing completed', { 
        agentId, 
        observationCount: result.observations.length,
        actionCount: result.actions.length,
        newMemoryCount: result.newMemories.length
      });

    } catch (error) {
      logger.error('Failed to process agent', error as Error, { agentId });
      result.status = 'error';
      result.error = (error as Error).message;
    }

    return result;
  }

  async processBatch(
    worldId: string, 
    agentIds: string[], 
    worldState: WorldState, 
    timeStep: number
  ): Promise<ProcessingResult[]> {
    try {
      const results: ProcessingResult[] = [];
      const batchSize = 5; // Process agents in small batches

      for (let i = 0; i < agentIds.length; i += batchSize) {
        const batch = agentIds.slice(i, i + batchSize);
        const batchPromises = batch.map(agentId => 
          this.processAgent(agentId, worldState, timeStep)
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to avoid overwhelming the system
        if (i + batchSize < agentIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const successCount = results.filter(r => r.status === 'success').length;
      logger.info('Batch processing completed', { 
        worldId, 
        totalAgents: agentIds.length, 
        successCount,
        errorCount: results.length - successCount
      });

      return results;
    } catch (error) {
      logger.error('Failed to process agent batch', error as Error, { worldId });
      throw new GenerativeWorldError('Failed to process agent batch', 'AGENT_ERROR', { worldId });
    }
  }

  async executeAction(agentId: string, action: AgentAction): Promise<any> {
    try {
      const agent = await db.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      let result: any = {};

      switch (action.type) {
        case 'move':
          result = await this.executeMovement(agent, action);
          break;
        case 'interact':
          result = await this.executeInteraction(agent, action);
          break;
        case 'communicate':
          result = await this.executeCommunication(agent, action);
          break;
        case 'observe':
          result = await this.executeObservation(agent, action);
          break;
        case 'reflect':
          result = await this.executeReflection(agent, action);
          break;
        case 'plan':
          result = await this.executePlanning(agent, action);
          break;
        default:
          result = { success: false, message: `Unknown action type: ${action.type}` };
      }

      // Update agent's current action
      agent.currentAction = `${action.type}: ${action.parameters.description || action.type}`;
      await db.putAgent(agent);

      logger.debug('Action executed', { agentId, actionType: action.type, success: result.success });
      return result;
    } catch (error) {
      logger.error('Failed to execute action', error as Error, { agentId, actionType: action.type });
      throw new GenerativeWorldError('Failed to execute action', 'AGENT_ERROR', { agentId, actionType: action.type });
    }
  }

  async generateAction(agentId: string, situation: string, availableActions?: string[]): Promise<AgentAction> {
    try {
      const agent = await db.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Get relevant memories for context
      const relevantMemories = await this.memoryManager.retrieveRelevantMemories(agentId, situation, 5);

      const response = await fetch(`${this.llmServiceUrl}/action/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          situation,
          availableActions: availableActions || ['move', 'interact', 'communicate', 'observe'],
          agentContext: {
            ...agent,
            recentMemories: relevantMemories.slice(0, 3).map(m => m.content)
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM service error: ${response.statusText}`);
      }

      const data = await response.json();
      const actionData = data.action;

      const action: AgentAction = {
        actionId: generateId(),
        agentId,
        type: actionData.type || 'observe',
        target: actionData.target,
        parameters: actionData.parameters || { description: actionData.description || situation },
        timestamp: generateTimestamp(),
        duration: actionData.duration || 5,
        status: 'pending'
      };

      logger.debug('Action generated', { agentId, actionType: action.type, situation: situation.substring(0, 50) });
      return action;
    } catch (error) {
      logger.error('Failed to generate action', error as Error, { agentId });
      
      // Fallback to default action
      return {
        actionId: generateId(),
        agentId,
        type: 'observe',
        parameters: { description: 'observe surroundings' },
        timestamp: generateTimestamp(),
        duration: 5,
        status: 'pending'
      };
    }
  }

  private async createInitialMemories(agent: Agent): Promise<void> {
    const initialMemories = [
      {
        worldId: agent.worldId,
        type: 'observation' as const,
        content: `I am ${agent.name}. ${agent.description}`,
        importance: 8,
        tags: ['identity', 'self']
      },
      {
        worldId: agent.worldId,
        type: 'observation' as const,
        content: `I am currently at ${JSON.stringify(agent.currentLocation)}`,
        importance: 5,
        tags: ['location', 'environment']
      }
    ];

    for (const memory of initialMemories) {
      await this.memoryManager.addMemory(agent.agentId, memory);
    }
  }

  private async observeEnvironment(agent: Agent, worldState: WorldState): Promise<string[]> {
    const observations: string[] = [];

    // Observe nearby agents
    const nearbyAgents = this.findNearbyAgents(agent, worldState.agents);
    if (nearbyAgents.length > 0) {
      observations.push(`I see ${nearbyAgents.map(a => a.name).join(', ')} nearby`);
    }

    // Observe objects in the area
    const nearbyObjects = worldState.objects?.filter(obj => 
      obj.location?.area === agent.currentLocation.area
    ) || [];
    
    if (nearbyObjects.length > 0) {
      observations.push(`I notice ${nearbyObjects.map(o => o.name).join(', ')} in this area`);
    }

    // Observe environment changes
    if (worldState.environment) {
      observations.push(`The environment is ${worldState.environment.atmosphere || 'normal'}`);
    }

    // If no specific observations, add a general one
    if (observations.length === 0) {
      observations.push('I observe my current surroundings');
    }

    return observations;
  }

  private async generateNextAction(agent: Agent, worldState: WorldState): Promise<AgentAction | null> {
    try {
      // Get current plan step
      const currentStep = agent.currentPlan.currentStep;
      if (!currentStep) {
        // Generate a new minute plan
        await this.planningEngine.generatePlan(agent.agentId, 'minute', { agent, worldState });
        const updatedAgent = await db.getAgent(agent.agentId);
        if (updatedAgent?.currentPlan.currentStep) {
          return await this.generateAction(agent.agentId, updatedAgent.currentPlan.currentStep);
        }
      }

      // Generate action based on current step
      return await this.generateAction(agent.agentId, currentStep);
    } catch (error) {
      logger.warn('Failed to generate next action, using default', { agentId: agent.agentId });
      return await this.generateAction(agent.agentId, 'continue current activity');
    }
  }

  private findNearbyAgents(agent: Agent, allAgents: Agent[]): Agent[] {
    return allAgents.filter(otherAgent => 
      otherAgent.agentId !== agent.agentId &&
      otherAgent.status === 'active' &&
      otherAgent.currentLocation.area === agent.currentLocation.area &&
      isWithinRange(agent.currentLocation, otherAgent.currentLocation, 50) // 50 unit proximity
    );
  }

  private shouldInitiateInteraction(agent: Agent, otherAgent: Agent): boolean {
    // Simple heuristics for social interaction
    const relationship = agent.relationships[otherAgent.agentId];
    const isStranger = !relationship || relationship === 'stranger';
    const isFriend = relationship === 'friend' || relationship === 'close_friend';
    
    // Friends are more likely to interact, strangers less likely
    const interactionProbability = isFriend ? 0.3 : isStranger ? 0.1 : 0.2;
    
    return Math.random() < interactionProbability;
  }

  private async executeMovement(agent: Agent, action: AgentAction): Promise<any> {
    // Simple movement execution
    const newLocation = action.parameters.destination || agent.currentLocation;
    agent.currentLocation = newLocation;
    await db.putAgent(agent);
    
    return { success: true, message: `Moved to ${JSON.stringify(newLocation)}` };
  }

  private async executeInteraction(agent: Agent, action: AgentAction): Promise<any> {
    // Object interaction execution
    return { success: true, message: `Interacted with ${action.target || 'object'}` };
  }

  private async executeCommunication(agent: Agent, action: AgentAction): Promise<any> {
    // Communication execution (would integrate with dialogue manager)
    return { success: true, message: `Communicated: ${action.parameters.message || 'spoke'}` };
  }

  private async executeObservation(agent: Agent, action: AgentAction): Promise<any> {
    // Observation execution
    return { success: true, message: 'Observed surroundings' };
  }

  private async executeReflection(agent: Agent, action: AgentAction): Promise<any> {
    // Reflection execution
    const reflection = await this.reflectionEngine.generateReflection(agent.agentId, true);
    return { success: true, message: 'Generated reflection', reflection };
  }

  private async executePlanning(agent: Agent, action: AgentAction): Promise<any> {
    // Planning execution
    const planType = action.parameters.planType || 'minute';
    const plan = await this.planningEngine.generatePlan(agent.agentId, planType);
    return { success: true, message: `Generated ${planType} plan`, plan };
  }
}