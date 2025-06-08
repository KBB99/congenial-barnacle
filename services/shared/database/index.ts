import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { 
  World, 
  Agent, 
  MemoryStream, 
  WorldObject, 
  Event, 
  Snapshot,
  GenerativeWorldError 
} from '../types';
import { createLogger, retryWithBackoff } from '../utils';

const logger = createLogger('database');

export class DatabaseClient {
  private client: DynamoDBDocumentClient;
  private tablePrefix: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tablePrefix = `${process.env.PROJECT_NAME || 'generative-world'}-${process.env.ENVIRONMENT || 'dev'}`;
  }

  private getTableName(tableName: string): string {
    return `${this.tablePrefix}-${tableName}`;
  }

  // World operations
  async getWorld(worldId: string): Promise<World | null> {
    try {
      const result = await retryWithBackoff(async () => {
        return await this.client.send(new GetCommand({
          TableName: this.getTableName('worlds'),
          Key: { worldId }
        }));
      });

      return result.Item as World || null;
    } catch (error) {
      logger.error('Failed to get world', error as Error, { worldId });
      throw new GenerativeWorldError('Failed to retrieve world', 'DATABASE_ERROR', { worldId });
    }
  }

  async putWorld(world: World): Promise<void> {
    try {
      await retryWithBackoff(async () => {
        return await this.client.send(new PutCommand({
          TableName: this.getTableName('worlds'),
          Item: world
        }));
      });

      logger.info('World saved successfully', { worldId: world.worldId });
    } catch (error) {
      logger.error('Failed to save world', error as Error, { worldId: world.worldId });
      throw new GenerativeWorldError('Failed to save world', 'DATABASE_ERROR', { worldId: world.worldId });
    }
  }

  async updateWorldStatus(worldId: string, status: World['status']): Promise<void> {
    try {
      await retryWithBackoff(async () => {
        return await this.client.send(new UpdateCommand({
          TableName: this.getTableName('worlds'),
          Key: { worldId },
          UpdateExpression: 'SET #status = :status, lastModified = :lastModified',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': status,
            ':lastModified': new Date().toISOString()
          }
        }));
      });

      logger.info('World status updated', { worldId, status });
    } catch (error) {
      logger.error('Failed to update world status', error as Error, { worldId, status });
      throw new GenerativeWorldError('Failed to update world status', 'DATABASE_ERROR', { worldId, status });
    }
  }

  async getWorldsByStatus(status: World['status']): Promise<World[]> {
    try {
      const result = await retryWithBackoff(async () => {
        return await this.client.send(new QueryCommand({
          TableName: this.getTableName('worlds'),
          IndexName: 'StatusIndex',
          KeyConditionExpression: '#status = :status',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': status
          }
        }));
      });

      return result.Items as World[] || [];
    } catch (error) {
      logger.error('Failed to get worlds by status', error as Error, { status });
      throw new GenerativeWorldError('Failed to retrieve worlds by status', 'DATABASE_ERROR', { status });
    }
  }

  // Agent operations
  async getAgent(agentId: string): Promise<Agent | null> {
    try {
      const result = await retryWithBackoff(async () => {
        return await this.client.send(new GetCommand({
          TableName: this.getTableName('agents'),
          Key: { agentId }
        }));
      });

      return result.Item as Agent || null;
    } catch (error) {
      logger.error('Failed to get agent', error as Error, { agentId });
      throw new GenerativeWorldError('Failed to retrieve agent', 'DATABASE_ERROR', { agentId });
    }
  }

  async putAgent(agent: Agent): Promise<void> {
    try {
      await retryWithBackoff(async () => {
        return await this.client.send(new PutCommand({
          TableName: this.getTableName('agents'),
          Item: agent
        }));
      });

      logger.info('Agent saved successfully', { agentId: agent.agentId });
    } catch (error) {
      logger.error('Failed to save agent', error as Error, { agentId: agent.agentId });
      throw new GenerativeWorldError('Failed to save agent', 'DATABASE_ERROR', { agentId: agent.agentId });
    }
  }

  async getAgentsByWorld(worldId: string): Promise<Agent[]> {
    try {
      const result = await retryWithBackoff(async () => {
        return await this.client.send(new QueryCommand({
          TableName: this.getTableName('agents'),
          IndexName: 'WorldIdIndex',
          KeyConditionExpression: 'worldId = :worldId',
          ExpressionAttributeValues: {
            ':worldId': worldId
          }
        }));
      });

      return result.Items as Agent[] || [];
    } catch (error) {
      logger.error('Failed to get agents by world', error as Error, { worldId });
      throw new GenerativeWorldError('Failed to retrieve agents by world', 'DATABASE_ERROR', { worldId });
    }
  }

  async updateAgentLocation(agentId: string, location: Agent['currentLocation']): Promise<void> {
    try {
      await retryWithBackoff(async () => {
        return await this.client.send(new UpdateCommand({
          TableName: this.getTableName('agents'),
          Key: { agentId },
          UpdateExpression: 'SET currentLocation = :location',
          ExpressionAttributeValues: {
            ':location': location
          }
        }));
      });

      logger.debug('Agent location updated', { agentId, location });
    } catch (error) {
      logger.error('Failed to update agent location', error as Error, { agentId, location });
      throw new GenerativeWorldError('Failed to update agent location', 'DATABASE_ERROR', { agentId, location });
    }
  }

  // Memory operations
  async getMemory(memoryId: string): Promise<MemoryStream | null> {
    try {
      const result = await retryWithBackoff(async () => {
        return await this.client.send(new GetCommand({
          TableName: this.getTableName('memory-streams'),
          Key: { memoryId }
        }));
      });

      return result.Item as MemoryStream || null;
    } catch (error) {
      logger.error('Failed to get memory', error as Error, { memoryId });
      throw new GenerativeWorldError('Failed to retrieve memory', 'DATABASE_ERROR', { memoryId });
    }
  }

  async putMemory(memory: MemoryStream): Promise<void> {
    try {
      await retryWithBackoff(async () => {
        return await this.client.send(new PutCommand({
          TableName: this.getTableName('memory-streams'),
          Item: memory
        }));
      });

      logger.debug('Memory saved successfully', { memoryId: memory.memoryId, agentId: memory.agentId });
    } catch (error) {
      logger.error('Failed to save memory', error as Error, { memoryId: memory.memoryId });
      throw new GenerativeWorldError('Failed to save memory', 'DATABASE_ERROR', { memoryId: memory.memoryId });
    }
  }

  async getMemoriesByAgent(agentId: string, limit?: number): Promise<MemoryStream[]> {
    try {
      const result = await retryWithBackoff(async () => {
        return await this.client.send(new QueryCommand({
          TableName: this.getTableName('memory-streams'),
          IndexName: 'AgentIdIndex',
          KeyConditionExpression: 'agentId = :agentId',
          ExpressionAttributeValues: {
            ':agentId': agentId
          },
          ScanIndexForward: false, // Most recent first
          Limit: limit
        }));
      });

      return result.Items as MemoryStream[] || [];
    } catch (error) {
      logger.error('Failed to get memories by agent', error as Error, { agentId });
      throw new GenerativeWorldError('Failed to retrieve memories by agent', 'DATABASE_ERROR', { agentId });
    }
  }

  async getMemoriesByType(type: MemoryStream['type'], limit?: number): Promise<MemoryStream[]> {
    try {
      const result = await retryWithBackoff(async () => {
        return await this.client.send(new QueryCommand({
          TableName: this.getTableName('memory-streams'),
          IndexName: 'TypeIndex',
          KeyConditionExpression: '#type = :type',
          ExpressionAttributeNames: {
            '#type': 'type'
          },
          ExpressionAttributeValues: {
            ':type': type
          },
          ScanIndexForward: false, // Most recent first
          Limit: limit
        }));
      });

      return result.Items as MemoryStream[] || [];
    } catch (error) {
      logger.error('Failed to get memories by type', error as Error, { type });
      throw new GenerativeWorldError('Failed to retrieve memories by type', 'DATABASE_ERROR', { type });
    }
  }

  async updateMemoryAccess(memoryId: string): Promise<void> {
    try {
      await retryWithBackoff(async () => {
        return await this.client.send(new UpdateCommand({
          TableName: this.getTableName('memory-streams'),
          Key: { memoryId },
          UpdateExpression: 'SET lastAccessed = :lastAccessed',
          ExpressionAttributeValues: {
            ':lastAccessed': new Date().toISOString()
          }
        }));
      });

      logger.debug('Memory access updated', { memoryId });
    } catch (error) {
      logger.error('Failed to update memory access', error as Error, { memoryId });
      throw new GenerativeWorldError('Failed to update memory access', 'DATABASE_ERROR', { memoryId });
    }
  }

  // Event operations
  async putEvent(event: Event): Promise<void> {
    try {
      await retryWithBackoff(async () => {
        return await this.client.send(new PutCommand({
          TableName: this.getTableName('events'),
          Item: event
        }));
      });

      logger.debug('Event saved successfully', { eventId: event.eventId, worldId: event.worldId });
    } catch (error) {
      logger.error('Failed to save event', error as Error, { eventId: event.eventId });
      throw new GenerativeWorldError('Failed to save event', 'DATABASE_ERROR', { eventId: event.eventId });
    }
  }

  async getEventsByWorld(worldId: string, limit?: number): Promise<Event[]> {
    try {
      const result = await retryWithBackoff(async () => {
        return await this.client.send(new QueryCommand({
          TableName: this.getTableName('events'),
          IndexName: 'WorldIdTimestampIndex',
          KeyConditionExpression: 'worldId = :worldId',
          ExpressionAttributeValues: {
            ':worldId': worldId
          },
          ScanIndexForward: false, // Most recent first
          Limit: limit
        }));
      });

      return result.Items as Event[] || [];
    } catch (error) {
      logger.error('Failed to get events by world', error as Error, { worldId });
      throw new GenerativeWorldError('Failed to retrieve events by world', 'DATABASE_ERROR', { worldId });
    }
  }

  // World object operations
  async getWorldObjectsByWorld(worldId: string): Promise<WorldObject[]> {
    try {
      const result = await retryWithBackoff(async () => {
        return await this.client.send(new QueryCommand({
          TableName: this.getTableName('world-objects'),
          IndexName: 'WorldIdIndex',
          KeyConditionExpression: 'worldId = :worldId',
          ExpressionAttributeValues: {
            ':worldId': worldId
          }
        }));
      });

      return result.Items as WorldObject[] || [];
    } catch (error) {
      logger.error('Failed to get world objects', error as Error, { worldId });
      throw new GenerativeWorldError('Failed to retrieve world objects', 'DATABASE_ERROR', { worldId });
    }
  }

  async putWorldObject(worldObject: WorldObject): Promise<void> {
    try {
      await retryWithBackoff(async () => {
        return await this.client.send(new PutCommand({
          TableName: this.getTableName('world-objects'),
          Item: worldObject
        }));
      });

      logger.debug('World object saved successfully', { objectId: worldObject.objectId });
    } catch (error) {
      logger.error('Failed to save world object', error as Error, { objectId: worldObject.objectId });
      throw new GenerativeWorldError('Failed to save world object', 'DATABASE_ERROR', { objectId: worldObject.objectId });
    }
  }

  // Snapshot operations
  async getSnapshotsByWorld(worldId: string): Promise<Snapshot[]> {
    try {
      const result = await retryWithBackoff(async () => {
        return await this.client.send(new QueryCommand({
          TableName: this.getTableName('snapshots'),
          IndexName: 'WorldIdIndex',
          KeyConditionExpression: 'worldId = :worldId',
          ExpressionAttributeValues: {
            ':worldId': worldId
          }
        }));
      });

      return result.Items as Snapshot[] || [];
    } catch (error) {
      logger.error('Failed to get snapshots by world', error as Error, { worldId });
      throw new GenerativeWorldError('Failed to retrieve snapshots by world', 'DATABASE_ERROR', { worldId });
    }
  }

  async putSnapshot(snapshot: Snapshot): Promise<void> {
    try {
      await retryWithBackoff(async () => {
        return await this.client.send(new PutCommand({
          TableName: this.getTableName('snapshots'),
          Item: snapshot
        }));
      });

      logger.info('Snapshot saved successfully', { snapshotId: snapshot.snapshotId });
    } catch (error) {
      logger.error('Failed to save snapshot', error as Error, { snapshotId: snapshot.snapshotId });
      throw new GenerativeWorldError('Failed to save snapshot', 'DATABASE_ERROR', { snapshotId: snapshot.snapshotId });
    }
  }

  // Batch operations
  async batchPutMemories(memories: MemoryStream[]): Promise<void> {
    // DynamoDB batch operations are limited to 25 items
    const chunks = [];
    for (let i = 0; i < memories.length; i += 25) {
      chunks.push(memories.slice(i, i + 25));
    }

    for (const chunk of chunks) {
      try {
        await retryWithBackoff(async () => {
          const putRequests = chunk.map(memory => ({
            PutRequest: {
              Item: memory
            }
          }));

          return await this.client.send({
            RequestItems: {
              [this.getTableName('memory-streams')]: putRequests
            }
          } as any);
        });

        logger.debug('Batch memories saved successfully', { count: chunk.length });
      } catch (error) {
        logger.error('Failed to batch save memories', error as Error, { count: chunk.length });
        throw new GenerativeWorldError('Failed to batch save memories', 'DATABASE_ERROR', { count: chunk.length });
      }
    }
  }
}

// Singleton instance
export const db = new DatabaseClient();