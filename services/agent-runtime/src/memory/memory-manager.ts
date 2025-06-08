import { MemoryStream, MemoryScore, MemoryRetrievalError } from '../../../shared/types';
import { db } from '../../../shared/database';
import { createLogger, generateId, generateTimestamp, calculateRelevanceScore, calculateRecencyScore, calculateCombinedScore } from '../../../shared/utils';

const logger = createLogger('memory-manager');

interface MemoryRetrievalOptions {
  limit?: number;
  type?: MemoryStream['type'];
  minImportance?: number;
  maxAge?: number; // in hours
}

export class MemoryManager {
  private llmServiceUrl: string;

  constructor() {
    this.llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://localhost:3002';
  }

  async addMemory(agentId: string, memoryData: Partial<MemoryStream>): Promise<string> {
    try {
      const memoryId = generateId();
      const timestamp = generateTimestamp();

      // Generate embedding for the memory content
      const embedding = await this.generateEmbedding(memoryData.content || '');

      // Score importance if not provided
      const importance = memoryData.importance || await this.scoreImportance(memoryData.content || '', agentId);

      const memory: MemoryStream = {
        memoryId,
        agentId,
        worldId: memoryData.worldId || '',
        type: memoryData.type || 'observation',
        content: memoryData.content || '',
        timestamp,
        importance,
        lastAccessed: timestamp,
        relatedMemories: memoryData.relatedMemories || [],
        embedding,
        tags: memoryData.tags || []
      };

      await db.putMemory(memory);

      // Check if reflection should be triggered
      await this.checkReflectionTrigger(agentId);

      logger.debug('Memory added successfully', { memoryId, agentId, importance });
      return memoryId;
    } catch (error) {
      logger.error('Failed to add memory', error as Error, { agentId });
      throw new MemoryRetrievalError('Failed to add memory', { agentId });
    }
  }

  async getMemories(agentId: string, options: MemoryRetrievalOptions = {}): Promise<MemoryStream[]> {
    try {
      let memories = await db.getMemoriesByAgent(agentId, options.limit);

      // Apply filters
      if (options.type) {
        memories = memories.filter(m => m.type === options.type);
      }

      if (options.minImportance) {
        memories = memories.filter(m => m.importance >= options.minImportance);
      }

      if (options.maxAge) {
        const cutoffTime = new Date(Date.now() - options.maxAge * 60 * 60 * 1000).toISOString();
        memories = memories.filter(m => m.timestamp >= cutoffTime);
      }

      return memories;
    } catch (error) {
      logger.error('Failed to get memories', error as Error, { agentId });
      throw new MemoryRetrievalError('Failed to get memories', { agentId });
    }
  }

  async retrieveRelevantMemories(agentId: string, query: string, limit: number = 20): Promise<MemoryStream[]> {
    try {
      // Get all memories for the agent
      const allMemories = await db.getMemoriesByAgent(agentId);

      if (allMemories.length === 0) {
        return [];
      }

      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Score all memories using the Stanford algorithm
      const scoredMemories = await this.scoreMemories(queryEmbedding, allMemories);

      // Get top memories and update their access time
      const topMemories = scoredMemories.slice(0, limit);
      const memoryIds = topMemories.map(sm => sm.memoryId);

      // Update last accessed time for retrieved memories
      await Promise.all(memoryIds.map(id => db.updateMemoryAccess(id)));

      // Return the actual memory objects
      const relevantMemories = allMemories.filter(m => memoryIds.includes(m.memoryId));

      logger.debug('Retrieved relevant memories', { 
        agentId, 
        query: query.substring(0, 50), 
        totalMemories: allMemories.length, 
        retrievedCount: relevantMemories.length 
      });

      return relevantMemories;
    } catch (error) {
      logger.error('Failed to retrieve relevant memories', error as Error, { agentId, query: query.substring(0, 50) });
      throw new MemoryRetrievalError('Failed to retrieve relevant memories', { agentId, query: query.substring(0, 50) });
    }
  }

  async scoreMemories(queryEmbedding: number[], memories: MemoryStream[]): Promise<MemoryScore[]> {
    const currentTime = generateTimestamp();
    const scores: MemoryScore[] = [];

    for (const memory of memories) {
      try {
        // Calculate relevance score using embedding similarity
        const relevanceScore = memory.embedding 
          ? calculateRelevanceScore(queryEmbedding, memory.embedding)
          : 0;

        // Calculate recency score with exponential decay
        const recencyScore = calculateRecencyScore(memory.lastAccessed, currentTime);

        // Importance score is already normalized (1-10)
        const importanceScore = memory.importance;

        // Combined score using Stanford's weighting
        const combinedScore = calculateCombinedScore(
          relevanceScore,
          recencyScore,
          importanceScore,
          { relevance: 1.0, recency: 1.0, importance: 1.0 }
        );

        scores.push({
          memoryId: memory.memoryId,
          relevanceScore,
          recencyScore,
          importanceScore,
          combinedScore
        });
      } catch (error) {
        logger.warn('Failed to score memory', { memoryId: memory.memoryId, error: (error as Error).message });
        // Continue with other memories
      }
    }

    // Sort by combined score descending
    return scores.sort((a, b) => b.combinedScore - a.combinedScore);
  }

  async updateMemoryRelations(memoryId: string, relatedMemoryIds: string[]): Promise<void> {
    try {
      const memory = await db.getMemory(memoryId);
      if (!memory) {
        throw new Error('Memory not found');
      }

      memory.relatedMemories = [...new Set([...memory.relatedMemories, ...relatedMemoryIds])];
      await db.putMemory(memory);

      logger.debug('Memory relations updated', { memoryId, relatedCount: memory.relatedMemories.length });
    } catch (error) {
      logger.error('Failed to update memory relations', error as Error, { memoryId });
      throw new MemoryRetrievalError('Failed to update memory relations', { memoryId });
    }
  }

  async getMemoryChain(memoryId: string, depth: number = 3): Promise<MemoryStream[]> {
    try {
      const visited = new Set<string>();
      const chain: MemoryStream[] = [];

      await this.buildMemoryChain(memoryId, depth, visited, chain);

      logger.debug('Built memory chain', { startMemoryId: memoryId, chainLength: chain.length });
      return chain;
    } catch (error) {
      logger.error('Failed to build memory chain', error as Error, { memoryId });
      throw new MemoryRetrievalError('Failed to build memory chain', { memoryId });
    }
  }

  private async buildMemoryChain(
    memoryId: string, 
    remainingDepth: number, 
    visited: Set<string>, 
    chain: MemoryStream[]
  ): Promise<void> {
    if (remainingDepth <= 0 || visited.has(memoryId)) {
      return;
    }

    visited.add(memoryId);
    const memory = await db.getMemory(memoryId);
    
    if (memory) {
      chain.push(memory);

      // Recursively add related memories
      for (const relatedId of memory.relatedMemories) {
        await this.buildMemoryChain(relatedId, remainingDepth - 1, visited, chain);
      }
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.llmServiceUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`LLM service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', error as Error, { textLength: text.length });
      throw new MemoryRetrievalError('Failed to generate embedding', { textLength: text.length });
    }
  }

  private async scoreImportance(content: string, agentId: string): Promise<number> {
    try {
      const response = await fetch(`${this.llmServiceUrl}/importance/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content,
          agentContext: { agentId }
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.importance;
    } catch (error) {
      logger.warn('Failed to score importance, using default', { error: (error as Error).message });
      return 5; // Default importance
    }
  }

  private async checkReflectionTrigger(agentId: string): Promise<void> {
    try {
      // Get recent memories (last 24 hours)
      const recentMemories = await this.getMemories(agentId, { 
        maxAge: 24,
        limit: 100
      });

      // Calculate sum of importance scores
      const importanceSum = recentMemories.reduce((sum, memory) => sum + memory.importance, 0);

      // Trigger reflection if importance sum exceeds threshold (150 as per Stanford research)
      if (importanceSum > 150) {
        logger.info('Reflection trigger threshold exceeded', { agentId, importanceSum });
        
        // Call reflection service (this would be handled by the reflection engine)
        await fetch(`${process.env.AGENT_RUNTIME_URL || 'http://localhost:3001'}/agents/${agentId}/reflect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ force: false }),
        });
      }
    } catch (error) {
      logger.warn('Failed to check reflection trigger', { agentId, error: (error as Error).message });
      // Don't throw - this is a background process
    }
  }

  async getMemoryStatistics(agentId: string): Promise<any> {
    try {
      const memories = await db.getMemoriesByAgent(agentId);
      
      const stats = {
        totalMemories: memories.length,
        byType: {} as Record<string, number>,
        averageImportance: 0,
        oldestMemory: null as string | null,
        newestMemory: null as string | null,
        totalEmbeddings: 0
      };

      if (memories.length > 0) {
        // Count by type
        memories.forEach(memory => {
          stats.byType[memory.type] = (stats.byType[memory.type] || 0) + 1;
          if (memory.embedding) {
            stats.totalEmbeddings++;
          }
        });

        // Calculate average importance
        stats.averageImportance = memories.reduce((sum, m) => sum + m.importance, 0) / memories.length;

        // Find oldest and newest
        const sorted = memories.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        stats.oldestMemory = sorted[0].timestamp;
        stats.newestMemory = sorted[sorted.length - 1].timestamp;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get memory statistics', error as Error, { agentId });
      throw new MemoryRetrievalError('Failed to get memory statistics', { agentId });
    }
  }
}