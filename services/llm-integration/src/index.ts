import express from 'express';
import cors from 'cors';
import { BedrockService } from './bedrock/bedrock-service';
import { PromptManager } from './prompts/prompt-manager';
import { CacheService } from './cache/cache-service';
import { createLogger } from '../../shared/utils';
import { LLMIntegrationError } from '../../shared/types';

const logger = createLogger('llm-integration-service');
const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Services
const bedrockService = new BedrockService();
const promptManager = new PromptManager();
const cacheService = new CacheService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'llm-integration', timestamp: new Date().toISOString() });
});

// Generate embedding endpoint
app.post('/embeddings', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required and must be a string' });
    }

    const embedding = await bedrockService.generateEmbedding(text);
    
    res.json({ embedding });
  } catch (error) {
    logger.error('Failed to generate embedding', error as Error, { text: req.body.text?.substring(0, 100) });
    res.status(500).json({ error: 'Failed to generate embedding' });
  }
});

// Memory retrieval scoring endpoint
app.post('/memory/score', async (req, res) => {
  try {
    const { query, memories } = req.body;
    
    if (!query || !Array.isArray(memories)) {
      return res.status(400).json({ error: 'Query and memories array are required' });
    }

    const queryEmbedding = await bedrockService.generateEmbedding(query);
    const scoredMemories = await bedrockService.scoreMemories(queryEmbedding, memories);
    
    res.json({ scoredMemories });
  } catch (error) {
    logger.error('Failed to score memories', error as Error);
    res.status(500).json({ error: 'Failed to score memories' });
  }
});

// Reflection generation endpoint
app.post('/reflection/generate', async (req, res) => {
  try {
    const { agentId, recentMemories, agentContext } = req.body;
    
    if (!agentId || !Array.isArray(recentMemories)) {
      return res.status(400).json({ error: 'Agent ID and recent memories are required' });
    }

    const reflection = await bedrockService.generateReflection(agentId, recentMemories, agentContext);
    
    res.json({ reflection });
  } catch (error) {
    logger.error('Failed to generate reflection', error as Error, { agentId });
    res.status(500).json({ error: 'Failed to generate reflection' });
  }
});

// Planning generation endpoint
app.post('/planning/generate', async (req, res) => {
  try {
    const { agentId, planType, context, currentPlan } = req.body;
    
    if (!agentId || !planType) {
      return res.status(400).json({ error: 'Agent ID and plan type are required' });
    }

    const plan = await bedrockService.generatePlan(agentId, planType, context, currentPlan);
    
    res.json({ plan });
  } catch (error) {
    logger.error('Failed to generate plan', error as Error, { agentId, planType });
    res.status(500).json({ error: 'Failed to generate plan' });
  }
});

// Action generation endpoint
app.post('/action/generate', async (req, res) => {
  try {
    const { agentId, situation, availableActions, agentContext } = req.body;
    
    if (!agentId || !situation) {
      return res.status(400).json({ error: 'Agent ID and situation are required' });
    }

    const action = await bedrockService.generateAction(agentId, situation, availableActions, agentContext);
    
    res.json({ action });
  } catch (error) {
    logger.error('Failed to generate action', error as Error, { agentId });
    res.status(500).json({ error: 'Failed to generate action' });
  }
});

// Dialogue generation endpoint
app.post('/dialogue/generate', async (req, res) => {
  try {
    const { speakerId, listenerId, context, conversationHistory } = req.body;
    
    if (!speakerId || !listenerId || !context) {
      return res.status(400).json({ error: 'Speaker ID, listener ID, and context are required' });
    }

    const dialogue = await bedrockService.generateDialogue(speakerId, listenerId, context, conversationHistory);
    
    res.json({ dialogue });
  } catch (error) {
    logger.error('Failed to generate dialogue', error as Error, { speakerId, listenerId });
    res.status(500).json({ error: 'Failed to generate dialogue' });
  }
});

// Importance scoring endpoint
app.post('/importance/score', async (req, res) => {
  try {
    const { content, agentContext } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const importance = await bedrockService.scoreImportance(content, agentContext);
    
    res.json({ importance });
  } catch (error) {
    logger.error('Failed to score importance', error as Error);
    res.status(500).json({ error: 'Failed to score importance' });
  }
});

// Batch processing endpoint
app.post('/batch/process', async (req, res) => {
  try {
    const { requests } = req.body;
    
    if (!Array.isArray(requests)) {
      return res.status(400).json({ error: 'Requests array is required' });
    }

    const results = await bedrockService.processBatch(requests);
    
    res.json({ results });
  } catch (error) {
    logger.error('Failed to process batch', error as Error);
    res.status(500).json({ error: 'Failed to process batch' });
  }
});

// Cache management endpoints
app.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get cache stats', error as Error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

app.delete('/cache/clear', async (req, res) => {
  try {
    await cacheService.clear();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    logger.error('Failed to clear cache', error as Error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', error);
  
  if (error instanceof LLMIntegrationError) {
    res.status(400).json({ error: error.message, code: error.code });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`LLM Integration Service started on port ${port}`);
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