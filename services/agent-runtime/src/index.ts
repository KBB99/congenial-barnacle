import express from 'express';
import cors from 'cors';
import { AgentEngine } from './agents/agent-engine';
import { MemoryManager } from './memory/memory-manager';
import { ReflectionEngine } from './reflection/reflection-engine';
import { PlanningEngine } from './planning/planning-engine';
import { DialogueManager } from './dialogue/dialogue-manager';
import { createLogger } from '../../shared/utils';
import { GenerativeWorldError } from '../../shared/types';

const logger = createLogger('agent-runtime-service');
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Services
const memoryManager = new MemoryManager();
const reflectionEngine = new ReflectionEngine();
const planningEngine = new PlanningEngine();
const dialogueManager = new DialogueManager();
const agentEngine = new AgentEngine(memoryManager, reflectionEngine, planningEngine, dialogueManager);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'agent-runtime', timestamp: new Date().toISOString() });
});

// Agent management endpoints
app.post('/agents', async (req, res) => {
  try {
    const { agent } = req.body;
    
    if (!agent || !agent.agentId || !agent.worldId) {
      return res.status(400).json({ error: 'Agent with agentId and worldId is required' });
    }

    await agentEngine.createAgent(agent);
    
    res.json({ message: 'Agent created successfully', agentId: agent.agentId });
  } catch (error) {
    logger.error('Failed to create agent', error as Error, { agentId: req.body.agent?.agentId });
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

app.get('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = await agentEngine.getAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({ agent });
  } catch (error) {
    logger.error('Failed to get agent', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

app.put('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { agent } = req.body;
    
    if (!agent) {
      return res.status(400).json({ error: 'Agent data is required' });
    }

    await agentEngine.updateAgent(agentId, agent);
    
    res.json({ message: 'Agent updated successfully' });
  } catch (error) {
    logger.error('Failed to update agent', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Memory management endpoints
app.get('/agents/:agentId/memories', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit, type } = req.query;
    
    const memories = await memoryManager.getMemories(agentId, {
      limit: limit ? parseInt(limit as string) : undefined,
      type: type as any
    });
    
    res.json({ memories });
  } catch (error) {
    logger.error('Failed to get memories', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to get memories' });
  }
});

app.post('/agents/:agentId/memories', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { memory } = req.body;
    
    if (!memory) {
      return res.status(400).json({ error: 'Memory data is required' });
    }

    const memoryId = await memoryManager.addMemory(agentId, memory);
    
    res.json({ message: 'Memory added successfully', memoryId });
  } catch (error) {
    logger.error('Failed to add memory', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to add memory' });
  }
});

app.post('/agents/:agentId/memories/retrieve', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { query, limit } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const memories = await memoryManager.retrieveRelevantMemories(agentId, query, limit);
    
    res.json({ memories });
  } catch (error) {
    logger.error('Failed to retrieve memories', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to retrieve memories' });
  }
});

// Reflection endpoints
app.post('/agents/:agentId/reflect', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { force } = req.body;
    
    const reflection = await reflectionEngine.generateReflection(agentId, force);
    
    res.json({ reflection });
  } catch (error) {
    logger.error('Failed to generate reflection', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to generate reflection' });
  }
});

app.get('/agents/:agentId/reflections', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit } = req.query;
    
    const reflections = await reflectionEngine.getReflections(agentId, limit ? parseInt(limit as string) : undefined);
    
    res.json({ reflections });
  } catch (error) {
    logger.error('Failed to get reflections', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to get reflections' });
  }
});

// Planning endpoints
app.post('/agents/:agentId/plan', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { planType, context } = req.body;
    
    if (!planType) {
      return res.status(400).json({ error: 'Plan type is required' });
    }

    const plan = await planningEngine.generatePlan(agentId, planType, context);
    
    res.json({ plan });
  } catch (error) {
    logger.error('Failed to generate plan', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to generate plan' });
  }
});

app.get('/agents/:agentId/plan', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const plan = await planningEngine.getCurrentPlan(agentId);
    
    res.json({ plan });
  } catch (error) {
    logger.error('Failed to get current plan', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to get current plan' });
  }
});

// Action execution endpoints
app.post('/agents/:agentId/actions/execute', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { action } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const result = await agentEngine.executeAction(agentId, action);
    
    res.json({ result });
  } catch (error) {
    logger.error('Failed to execute action', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to execute action' });
  }
});

app.post('/agents/:agentId/actions/generate', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { situation, availableActions } = req.body;
    
    if (!situation) {
      return res.status(400).json({ error: 'Situation is required' });
    }

    const action = await agentEngine.generateAction(agentId, situation, availableActions);
    
    res.json({ action });
  } catch (error) {
    logger.error('Failed to generate action', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to generate action' });
  }
});

// Dialogue endpoints
app.post('/agents/:agentId/dialogue/initiate', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { targetAgentId, context } = req.body;
    
    if (!targetAgentId) {
      return res.status(400).json({ error: 'Target agent ID is required' });
    }

    const dialogue = await dialogueManager.initiateDialogue(agentId, targetAgentId, context);
    
    res.json({ dialogue });
  } catch (error) {
    logger.error('Failed to initiate dialogue', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to initiate dialogue' });
  }
});

app.post('/agents/:agentId/dialogue/respond', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { dialogueId, message } = req.body;
    
    if (!dialogueId || !message) {
      return res.status(400).json({ error: 'Dialogue ID and message are required' });
    }

    const response = await dialogueManager.generateResponse(agentId, dialogueId, message);
    
    res.json({ response });
  } catch (error) {
    logger.error('Failed to generate dialogue response', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to generate dialogue response' });
  }
});

// Agent processing endpoints
app.post('/agents/:agentId/process', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { worldState, timeStep } = req.body;
    
    const result = await agentEngine.processAgent(agentId, worldState, timeStep);
    
    res.json({ result });
  } catch (error) {
    logger.error('Failed to process agent', error as Error, { agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to process agent' });
  }
});

app.post('/world/:worldId/agents/process-batch', async (req, res) => {
  try {
    const { worldId } = req.params;
    const { agentIds, worldState, timeStep } = req.body;
    
    if (!Array.isArray(agentIds)) {
      return res.status(400).json({ error: 'Agent IDs array is required' });
    }

    const results = await agentEngine.processBatch(worldId, agentIds, worldState, timeStep);
    
    res.json({ results });
  } catch (error) {
    logger.error('Failed to process agent batch', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to process agent batch' });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', error);
  
  if (error instanceof GenerativeWorldError) {
    res.status(400).json({ error: error.message, code: error.code });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`Agent Runtime Service started on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});