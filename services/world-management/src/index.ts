import express from 'express';
import cors from 'cors';
import { WorldManager } from './world/world-manager';
import { TimeManager } from './time/time-manager';
import { EventProcessor } from './events/event-processor';
import { createLogger } from '../../shared/utils';
import { WorldManagementError } from '../../shared/types';

const logger = createLogger('world-management-service');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Services
const worldManager = new WorldManager();
const timeManager = new TimeManager();
const eventProcessor = new EventProcessor();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'world-management', timestamp: new Date().toISOString() });
});

// World lifecycle endpoints
app.post('/worlds', async (req, res) => {
  try {
    const { world } = req.body;
    
    if (!world || !world.name) {
      return res.status(400).json({ error: 'World with name is required' });
    }

    const worldId = await worldManager.createWorld(world);
    
    res.json({ message: 'World created successfully', worldId });
  } catch (error) {
    logger.error('Failed to create world', error as Error);
    res.status(500).json({ error: 'Failed to create world' });
  }
});

app.get('/worlds/:worldId', async (req, res) => {
  try {
    const { worldId } = req.params;
    const world = await worldManager.getWorld(worldId);
    
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }
    
    res.json({ world });
  } catch (error) {
    logger.error('Failed to get world', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to get world' });
  }
});

app.put('/worlds/:worldId', async (req, res) => {
  try {
    const { worldId } = req.params;
    const { updates } = req.body;
    
    if (!updates) {
      return res.status(400).json({ error: 'Updates are required' });
    }

    await worldManager.updateWorld(worldId, updates);
    
    res.json({ message: 'World updated successfully' });
  } catch (error) {
    logger.error('Failed to update world', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to update world' });
  }
});

app.delete('/worlds/:worldId', async (req, res) => {
  try {
    const { worldId } = req.params;
    
    await worldManager.deleteWorld(worldId);
    
    res.json({ message: 'World deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete world', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to delete world' });
  }
});

// World state management endpoints
app.post('/worlds/:worldId/start', async (req, res) => {
  try {
    const { worldId } = req.params;
    
    await worldManager.startWorld(worldId);
    
    res.json({ message: 'World started successfully' });
  } catch (error) {
    logger.error('Failed to start world', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to start world' });
  }
});

app.post('/worlds/:worldId/pause', async (req, res) => {
  try {
    const { worldId } = req.params;
    
    await worldManager.pauseWorld(worldId);
    
    res.json({ message: 'World paused successfully' });
  } catch (error) {
    logger.error('Failed to pause world', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to pause world' });
  }
});

app.post('/worlds/:worldId/resume', async (req, res) => {
  try {
    const { worldId } = req.params;
    
    await worldManager.resumeWorld(worldId);
    
    res.json({ message: 'World resumed successfully' });
  } catch (error) {
    logger.error('Failed to resume world', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to resume world' });
  }
});

app.post('/worlds/:worldId/stop', async (req, res) => {
  try {
    const { worldId } = req.params;
    
    await worldManager.stopWorld(worldId);
    
    res.json({ message: 'World stopped successfully' });
  } catch (error) {
    logger.error('Failed to stop world', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to stop world' });
  }
});

// Agent management endpoints
app.post('/worlds/:worldId/agents', async (req, res) => {
  try {
    const { worldId } = req.params;
    const { agent } = req.body;
    
    if (!agent) {
      return res.status(400).json({ error: 'Agent data is required' });
    }

    const agentId = await worldManager.spawnAgent(worldId, agent);
    
    res.json({ message: 'Agent spawned successfully', agentId });
  } catch (error) {
    logger.error('Failed to spawn agent', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to spawn agent' });
  }
});

app.get('/worlds/:worldId/agents', async (req, res) => {
  try {
    const { worldId } = req.params;
    
    const agents = await worldManager.getWorldAgents(worldId);
    
    res.json({ agents });
  } catch (error) {
    logger.error('Failed to get world agents', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to get world agents' });
  }
});

app.delete('/worlds/:worldId/agents/:agentId', async (req, res) => {
  try {
    const { worldId, agentId } = req.params;
    
    await worldManager.removeAgent(worldId, agentId);
    
    res.json({ message: 'Agent removed successfully' });
  } catch (error) {
    logger.error('Failed to remove agent', error as Error, { worldId: req.params.worldId, agentId: req.params.agentId });
    res.status(500).json({ error: 'Failed to remove agent' });
  }
});

// Time management endpoints
app.get('/worlds/:worldId/time', async (req, res) => {
  try {
    const { worldId } = req.params;
    
    const timeState = await timeManager.getTimeState(worldId);
    
    res.json({ timeState });
  } catch (error) {
    logger.error('Failed to get time state', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to get time state' });
  }
});

app.post('/worlds/:worldId/time/advance', async (req, res) => {
  try {
    const { worldId } = req.params;
    const { steps } = req.body;
    
    const newTime = await timeManager.advanceTime(worldId, steps || 1);
    
    res.json({ message: 'Time advanced successfully', newTime });
  } catch (error) {
    logger.error('Failed to advance time', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to advance time' });
  }
});

app.post('/worlds/:worldId/time/speed', async (req, res) => {
  try {
    const { worldId } = req.params;
    const { speed } = req.body;
    
    if (typeof speed !== 'number' || speed < 0) {
      return res.status(400).json({ error: 'Valid speed is required' });
    }

    await timeManager.setTimeSpeed(worldId, speed);
    
    res.json({ message: 'Time speed updated successfully' });
  } catch (error) {
    logger.error('Failed to set time speed', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to set time speed' });
  }
});

// Event processing endpoints
app.post('/worlds/:worldId/events', async (req, res) => {
  try {
    const { worldId } = req.params;
    const { event } = req.body;
    
    if (!event) {
      return res.status(400).json({ error: 'Event data is required' });
    }

    const eventId = await eventProcessor.processEvent(worldId, event);
    
    res.json({ message: 'Event processed successfully', eventId });
  } catch (error) {
    logger.error('Failed to process event', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to process event' });
  }
});

app.get('/worlds/:worldId/events', async (req, res) => {
  try {
    const { worldId } = req.params;
    const { limit } = req.query;
    
    const events = await eventProcessor.getWorldEvents(worldId, limit ? parseInt(limit as string) : undefined);
    
    res.json({ events });
  } catch (error) {
    logger.error('Failed to get world events', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to get world events' });
  }
});

// World processing endpoint
app.post('/worlds/:worldId/process', async (req, res) => {
  try {
    const { worldId } = req.params;
    
    const result = await worldManager.processWorldStep(worldId);
    
    res.json({ result });
  } catch (error) {
    logger.error('Failed to process world step', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to process world step' });
  }
});

// Snapshot management endpoints
app.post('/worlds/:worldId/snapshots', async (req, res) => {
  try {
    const { worldId } = req.params;
    const { name, description } = req.body;
    
    const snapshotId = await worldManager.createSnapshot(worldId, name, description);
    
    res.json({ message: 'Snapshot created successfully', snapshotId });
  } catch (error) {
    logger.error('Failed to create snapshot', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

app.get('/worlds/:worldId/snapshots', async (req, res) => {
  try {
    const { worldId } = req.params;
    
    const snapshots = await worldManager.getSnapshots(worldId);
    
    res.json({ snapshots });
  } catch (error) {
    logger.error('Failed to get snapshots', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to get snapshots' });
  }
});

app.post('/worlds/:worldId/snapshots/:snapshotId/restore', async (req, res) => {
  try {
    const { worldId, snapshotId } = req.params;
    
    await worldManager.restoreSnapshot(worldId, snapshotId);
    
    res.json({ message: 'Snapshot restored successfully' });
  } catch (error) {
    logger.error('Failed to restore snapshot', error as Error, { worldId: req.params.worldId, snapshotId: req.params.snapshotId });
    res.status(500).json({ error: 'Failed to restore snapshot' });
  }
});

// Statistics endpoints
app.get('/worlds/:worldId/stats', async (req, res) => {
  try {
    const { worldId } = req.params;
    
    const stats = await worldManager.getWorldStatistics(worldId);
    
    res.json({ stats });
  } catch (error) {
    logger.error('Failed to get world statistics', error as Error, { worldId: req.params.worldId });
    res.status(500).json({ error: 'Failed to get world statistics' });
  }
});

app.get('/worlds', async (req, res) => {
  try {
    const { status } = req.query;
    
    const worlds = await worldManager.listWorlds(status as any);
    
    res.json({ worlds });
  } catch (error) {
    logger.error('Failed to list worlds', error as Error);
    res.status(500).json({ error: 'Failed to list worlds' });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', error);
  
  if (error instanceof WorldManagementError) {
    res.status(400).json({ error: error.message, code: error.code });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`World Management Service started on port ${port}`);
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