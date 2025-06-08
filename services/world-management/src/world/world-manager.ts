import { World, Agent, Snapshot, WorldManagementError } from '../../../shared/types';
import { db } from '../../../shared/database';
import { createLogger, generateId, generateTimestamp } from '../../../shared/utils';

const logger = createLogger('world-manager');

interface WorldCreationData {
  name: string;
  description?: string;
  settings?: Partial<World['settings']>;
}

interface WorldStatistics {
  agentCount: number;
  activeAgents: number;
  totalMemories: number;
  totalEvents: number;
  uptime: number;
  lastActivity: string;
  averageAgentActivity: number;
}

export class WorldManager {
  private agentRuntimeUrl: string;

  constructor() {
    this.agentRuntimeUrl = process.env.AGENT_RUNTIME_URL || 'http://localhost:3001';
  }

  async createWorld(worldData: WorldCreationData): Promise<string> {
    try {
      const worldId = generateId();
      const timestamp = generateTimestamp();

      const world: World = {
        worldId,
        name: worldData.name,
        description: worldData.description || '',
        createdAt: timestamp,
        lastModified: timestamp,
        status: 'stopped',
        settings: {
          timeSpeed: 1.0,
          maxAgents: 1000,
          worldSize: { width: 1000, height: 1000 },
          physics: { gravity: true, collision: true },
          ...worldData.settings
        },
        currentTime: timestamp,
        agentCount: 0
      };

      await db.putWorld(world);

      // Create initial world event
      await this.createWorldEvent(worldId, 'world_created', 'World was created', {
        worldName: world.name,
        settings: world.settings
      });

      logger.info('World created successfully', { worldId, name: world.name });
      return worldId;
    } catch (error) {
      logger.error('Failed to create world', error as Error, { name: worldData.name });
      throw new WorldManagementError('Failed to create world', { name: worldData.name });
    }
  }

  async getWorld(worldId: string): Promise<World | null> {
    try {
      return await db.getWorld(worldId);
    } catch (error) {
      logger.error('Failed to get world', error as Error, { worldId });
      throw new WorldManagementError('Failed to get world', { worldId });
    }
  }

  async updateWorld(worldId: string, updates: Partial<World>): Promise<void> {
    try {
      const world = await db.getWorld(worldId);
      if (!world) {
        throw new Error('World not found');
      }

      // Apply updates
      Object.assign(world, updates);
      world.lastModified = generateTimestamp();

      await db.putWorld(world);

      logger.info('World updated successfully', { worldId, updates: Object.keys(updates) });
    } catch (error) {
      logger.error('Failed to update world', error as Error, { worldId });
      throw new WorldManagementError('Failed to update world', { worldId });
    }
  }

  async deleteWorld(worldId: string): Promise<void> {
    try {
      const world = await db.getWorld(worldId);
      if (!world) {
        throw new Error('World not found');
      }

      // Stop the world first if it's running
      if (world.status === 'running') {
        await this.stopWorld(worldId);
      }

      // Get all agents in the world
      const agents = await db.getAgentsByWorld(worldId);

      // Remove all agents
      for (const agent of agents) {
        await this.removeAgent(worldId, agent.agentId);
      }

      // Create deletion event
      await this.createWorldEvent(worldId, 'world_deleted', 'World was deleted', {
        worldName: world.name,
        agentCount: agents.length
      });

      // Note: In a full implementation, you would also clean up:
      // - All memories for agents in this world
      // - All events for this world
      // - All snapshots for this world
      // - Any S3 assets for this world

      logger.info('World deleted successfully', { worldId, name: world.name });
    } catch (error) {
      logger.error('Failed to delete world', error as Error, { worldId });
      throw new WorldManagementError('Failed to delete world', { worldId });
    }
  }

  async startWorld(worldId: string): Promise<void> {
    try {
      const world = await db.getWorld(worldId);
      if (!world) {
        throw new Error('World not found');
      }

      if (world.status === 'running') {
        logger.warn('World is already running', { worldId });
        return;
      }

      await db.updateWorldStatus(worldId, 'running');

      await this.createWorldEvent(worldId, 'world_started', 'World simulation started', {
        previousStatus: world.status
      });

      logger.info('World started successfully', { worldId });
    } catch (error) {
      logger.error('Failed to start world', error as Error, { worldId });
      throw new WorldManagementError('Failed to start world', { worldId });
    }
  }

  async pauseWorld(worldId: string): Promise<void> {
    try {
      const world = await db.getWorld(worldId);
      if (!world) {
        throw new Error('World not found');
      }

      if (world.status !== 'running') {
        logger.warn('World is not running', { worldId, status: world.status });
        return;
      }

      await db.updateWorldStatus(worldId, 'paused');

      await this.createWorldEvent(worldId, 'world_paused', 'World simulation paused', {
        pausedAt: generateTimestamp()
      });

      logger.info('World paused successfully', { worldId });
    } catch (error) {
      logger.error('Failed to pause world', error as Error, { worldId });
      throw new WorldManagementError('Failed to pause world', { worldId });
    }
  }

  async resumeWorld(worldId: string): Promise<void> {
    try {
      const world = await db.getWorld(worldId);
      if (!world) {
        throw new Error('World not found');
      }

      if (world.status !== 'paused') {
        logger.warn('World is not paused', { worldId, status: world.status });
        return;
      }

      await db.updateWorldStatus(worldId, 'running');

      await this.createWorldEvent(worldId, 'world_resumed', 'World simulation resumed', {
        resumedAt: generateTimestamp()
      });

      logger.info('World resumed successfully', { worldId });
    } catch (error) {
      logger.error('Failed to resume world', error as Error, { worldId });
      throw new WorldManagementError('Failed to resume world', { worldId });
    }
  }

  async stopWorld(worldId: string): Promise<void> {
    try {
      const world = await db.getWorld(worldId);
      if (!world) {
        throw new Error('World not found');
      }

      if (world.status === 'stopped') {
        logger.warn('World is already stopped', { worldId });
        return;
      }

      await db.updateWorldStatus(worldId, 'stopped');

      await this.createWorldEvent(worldId, 'world_stopped', 'World simulation stopped', {
        previousStatus: world.status,
        stoppedAt: generateTimestamp()
      });

      logger.info('World stopped successfully', { worldId });
    } catch (error) {
      logger.error('Failed to stop world', error as Error, { worldId });
      throw new WorldManagementError('Failed to stop world', { worldId });
    }
  }

  async spawnAgent(worldId: string, agentData: Partial<Agent>): Promise<string> {
    try {
      const world = await db.getWorld(worldId);
      if (!world) {
        throw new Error('World not found');
      }

      if (world.agentCount >= world.settings.maxAgents) {
        throw new Error('World has reached maximum agent capacity');
      }

      const agentId = generateId();
      const agent: Agent = {
        agentId,
        worldId,
        name: agentData.name || `Agent-${agentId.substring(0, 8)}`,
        description: agentData.description || 'A newly spawned agent',
        currentLocation: agentData.currentLocation || { x: 0, y: 0, area: 'spawn' },
        currentAction: 'just spawned',
        relationships: {},
        goals: agentData.goals || [],
        traits: agentData.traits || [],
        currentPlan: {
          dailyPlan: [],
          hourlyPlan: [],
          currentStep: 'getting oriented'
        },
        status: 'active'
      };

      // Create agent in agent runtime service
      await this.createAgentInRuntime(agent);

      // Update world agent count
      world.agentCount += 1;
      world.lastModified = generateTimestamp();
      await db.putWorld(world);

      await this.createWorldEvent(worldId, 'agent_spawned', `Agent ${agent.name} was spawned`, {
        agentId,
        agentName: agent.name,
        location: agent.currentLocation
      });

      logger.info('Agent spawned successfully', { worldId, agentId, name: agent.name });
      return agentId;
    } catch (error) {
      logger.error('Failed to spawn agent', error as Error, { worldId });
      throw new WorldManagementError('Failed to spawn agent', { worldId });
    }
  }

  async removeAgent(worldId: string, agentId: string): Promise<void> {
    try {
      const agent = await db.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      if (agent.worldId !== worldId) {
        throw new Error('Agent does not belong to this world');
      }

      // Mark agent as deleted
      agent.status = 'deleted';
      await db.putAgent(agent);

      // Update world agent count
      const world = await db.getWorld(worldId);
      if (world) {
        world.agentCount = Math.max(0, world.agentCount - 1);
        world.lastModified = generateTimestamp();
        await db.putWorld(world);
      }

      await this.createWorldEvent(worldId, 'agent_removed', `Agent ${agent.name} was removed`, {
        agentId,
        agentName: agent.name
      });

      logger.info('Agent removed successfully', { worldId, agentId, name: agent.name });
    } catch (error) {
      logger.error('Failed to remove agent', error as Error, { worldId, agentId });
      throw new WorldManagementError('Failed to remove agent', { worldId, agentId });
    }
  }

  async getWorldAgents(worldId: string): Promise<Agent[]> {
    try {
      const agents = await db.getAgentsByWorld(worldId);
      return agents.filter(agent => agent.status !== 'deleted');
    } catch (error) {
      logger.error('Failed to get world agents', error as Error, { worldId });
      throw new WorldManagementError('Failed to get world agents', { worldId });
    }
  }

  async processWorldStep(worldId: string): Promise<any> {
    try {
      const world = await db.getWorld(worldId);
      if (!world) {
        throw new Error('World not found');
      }

      if (world.status !== 'running') {
        return { message: 'World is not running', status: world.status };
      }

      // Get all active agents
      const agents = await this.getWorldAgents(worldId);
      const activeAgents = agents.filter(agent => agent.status === 'active');

      if (activeAgents.length === 0) {
        return { message: 'No active agents to process', agentCount: 0 };
      }

      // Build world state
      const worldState = {
        currentTime: generateTimestamp(),
        agents: activeAgents,
        objects: await db.getWorldObjectsByWorld(worldId),
        events: await db.getEventsByWorld(worldId, 10),
        environment: {
          worldSize: world.settings.worldSize,
          physics: world.settings.physics
        }
      };

      // Process agents in batches via agent runtime service
      const agentIds = activeAgents.map(a => a.agentId);
      const results = await this.processAgentBatch(worldId, agentIds, worldState);

      // Update world time
      world.currentTime = worldState.currentTime;
      world.lastModified = generateTimestamp();
      await db.putWorld(world);

      const successCount = results.filter(r => r.status === 'success').length;
      
      logger.debug('World step processed', { 
        worldId, 
        totalAgents: agentIds.length, 
        successCount,
        errorCount: results.length - successCount
      });

      return {
        message: 'World step processed successfully',
        agentCount: agentIds.length,
        successCount,
        errorCount: results.length - successCount,
        worldTime: world.currentTime
      };
    } catch (error) {
      logger.error('Failed to process world step', error as Error, { worldId });
      throw new WorldManagementError('Failed to process world step', { worldId });
    }
  }

  async createSnapshot(worldId: string, name?: string, description?: string): Promise<string> {
    try {
      const world = await db.getWorld(worldId);
      if (!world) {
        throw new Error('World not found');
      }

      const snapshotId = generateId();
      const timestamp = generateTimestamp();

      // In a full implementation, this would:
      // 1. Serialize the entire world state
      // 2. Compress the data
      // 3. Upload to S3
      // 4. Store metadata in DynamoDB

      const snapshot: Snapshot = {
        snapshotId,
        worldId,
        name: name || `Snapshot-${timestamp}`,
        timestamp,
        s3Location: `s3://world-snapshots/${worldId}/${snapshotId}.json.gz`,
        size: 0, // Would be calculated after compression
        agentCount: world.agentCount,
        description: description || 'World snapshot'
      };

      await db.putSnapshot(snapshot);

      await this.createWorldEvent(worldId, 'snapshot_created', `Snapshot ${snapshot.name} was created`, {
        snapshotId,
        snapshotName: snapshot.name
      });

      logger.info('Snapshot created successfully', { worldId, snapshotId, name: snapshot.name });
      return snapshotId;
    } catch (error) {
      logger.error('Failed to create snapshot', error as Error, { worldId });
      throw new WorldManagementError('Failed to create snapshot', { worldId });
    }
  }

  async getSnapshots(worldId: string): Promise<Snapshot[]> {
    try {
      return await db.getSnapshotsByWorld(worldId);
    } catch (error) {
      logger.error('Failed to get snapshots', error as Error, { worldId });
      throw new WorldManagementError('Failed to get snapshots', { worldId });
    }
  }

  async restoreSnapshot(worldId: string, snapshotId: string): Promise<void> {
    try {
      const world = await db.getWorld(worldId);
      if (!world) {
        throw new Error('World not found');
      }

      const snapshot = await db.getSnapshot(snapshotId);
      if (!snapshot || snapshot.worldId !== worldId) {
        throw new Error('Snapshot not found or does not belong to this world');
      }

      // Pause the world during restoration
      const originalStatus = world.status;
      if (world.status === 'running') {
        await this.pauseWorld(worldId);
      }

      // In a full implementation, this would:
      // 1. Download snapshot data from S3
      // 2. Decompress the data
      // 3. Restore all world state (agents, memories, events, etc.)
      // 4. Update world metadata

      await this.createWorldEvent(worldId, 'snapshot_restored', `Snapshot ${snapshot.name} was restored`, {
        snapshotId,
        snapshotName: snapshot.name,
        restoredAt: generateTimestamp()
      });

      // Restore original status if it was running
      if (originalStatus === 'running') {
        await this.resumeWorld(worldId);
      }

      logger.info('Snapshot restored successfully', { worldId, snapshotId, name: snapshot.name });
    } catch (error) {
      logger.error('Failed to restore snapshot', error as Error, { worldId, snapshotId });
      throw new WorldManagementError('Failed to restore snapshot', { worldId, snapshotId });
    }
  }

  async getWorldStatistics(worldId: string): Promise<WorldStatistics> {
    try {
      const world = await db.getWorld(worldId);
      if (!world) {
        throw new Error('World not found');
      }

      const agents = await this.getWorldAgents(worldId);
      const activeAgents = agents.filter(a => a.status === 'active');
      const events = await db.getEventsByWorld(worldId, 100);

      const stats: WorldStatistics = {
        agentCount: world.agentCount,
        activeAgents: activeAgents.length,
        totalMemories: 0, // Would need to count across all agents
        totalEvents: events.length,
        uptime: this.calculateUptime(world),
        lastActivity: world.lastModified,
        averageAgentActivity: 0 // Would calculate based on recent agent actions
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get world statistics', error as Error, { worldId });
      throw new WorldManagementError('Failed to get world statistics', { worldId });
    }
  }

  async listWorlds(status?: World['status']): Promise<World[]> {
    try {
      if (status) {
        return await db.getWorldsByStatus(status);
      } else {
        // In a full implementation, this would scan all worlds
        // For now, return worlds by status
        const running = await db.getWorldsByStatus('running');
        const paused = await db.getWorldsByStatus('paused');
        const stopped = await db.getWorldsByStatus('stopped');
        
        return [...running, ...paused, ...stopped];
      }
    } catch (error) {
      logger.error('Failed to list worlds', error as Error, { status });
      throw new WorldManagementError('Failed to list worlds', { status });
    }
  }

  private async createWorldEvent(worldId: string, type: string, description: string, data: any): Promise<void> {
    const event = {
      eventId: generateId(),
      worldId,
      timestamp: generateTimestamp(),
      type: 'world_event' as const,
      description,
      data,
      consequences: []
    };

    await db.putEvent(event);
  }

  private async createAgentInRuntime(agent: Agent): Promise<void> {
    try {
      const response = await fetch(`${this.agentRuntimeUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agent }),
      });

      if (!response.ok) {
        throw new Error(`Agent runtime service error: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to create agent in runtime', error as Error, { agentId: agent.agentId });
      throw new WorldManagementError('Failed to create agent in runtime', { agentId: agent.agentId });
    }
  }

  private async processAgentBatch(worldId: string, agentIds: string[], worldState: any): Promise<any[]> {
    try {
      const response = await fetch(`${this.agentRuntimeUrl}/world/${worldId}/agents/process-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentIds,
          worldState,
          timeStep: 1
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent runtime service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      logger.error('Failed to process agent batch', error as Error, { worldId, agentCount: agentIds.length });
      throw new WorldManagementError('Failed to process agent batch', { worldId, agentCount: agentIds.length });
    }
  }

  private calculateUptime(world: World): number {
    // Calculate uptime in hours since creation
    const created = new Date(world.createdAt).getTime();
    const now = new Date().getTime();
    return (now - created) / (1000 * 60 * 60);
  }
}