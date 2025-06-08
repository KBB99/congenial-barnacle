import { MemoryStream, ReflectionInsight, ReflectionError } from '../../../shared/types';
import { db } from '../../../shared/database';
import { createLogger, generateId, generateTimestamp } from '../../../shared/utils';

const logger = createLogger('reflection-engine');

interface ReflectionTrigger {
  importanceThreshold: number;
  timeWindow: number; // hours
  minMemories: number;
}

export class ReflectionEngine {
  private llmServiceUrl: string;
  private defaultTrigger: ReflectionTrigger;

  constructor() {
    this.llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://localhost:3002';
    this.defaultTrigger = {
      importanceThreshold: 150, // As per Stanford research
      timeWindow: 24, // Last 24 hours
      minMemories: 3 // Minimum memories needed for reflection
    };
  }

  async generateReflection(agentId: string, force: boolean = false): Promise<ReflectionInsight | null> {
    try {
      // Check if reflection should be triggered
      if (!force && !await this.shouldTriggerReflection(agentId)) {
        logger.debug('Reflection not triggered', { agentId });
        return null;
      }

      // Get recent memories for reflection
      const recentMemories = await this.getRecentMemories(agentId);
      
      if (recentMemories.length < this.defaultTrigger.minMemories) {
        logger.debug('Insufficient memories for reflection', { agentId, memoryCount: recentMemories.length });
        return null;
      }

      // Get agent context
      const agent = await db.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Generate reflection using LLM
      const reflection = await this.callReflectionService(agentId, recentMemories, agent);

      // Store reflection as a new memory
      await this.storeReflection(agentId, agent.worldId, reflection, recentMemories);

      logger.info('Reflection generated successfully', { 
        agentId, 
        importance: reflection.importance,
        evidenceCount: reflection.evidence.length 
      });

      return reflection;
    } catch (error) {
      logger.error('Failed to generate reflection', error as Error, { agentId });
      throw new ReflectionError('Failed to generate reflection', { agentId });
    }
  }

  async getReflections(agentId: string, limit?: number): Promise<MemoryStream[]> {
    try {
      const memories = await db.getMemoriesByAgent(agentId, limit);
      return memories.filter(memory => memory.type === 'reflection');
    } catch (error) {
      logger.error('Failed to get reflections', error as Error, { agentId });
      throw new ReflectionError('Failed to get reflections', { agentId });
    }
  }

  async shouldTriggerReflection(agentId: string): Promise<boolean> {
    try {
      const recentMemories = await this.getRecentMemories(agentId);
      
      if (recentMemories.length < this.defaultTrigger.minMemories) {
        return false;
      }

      // Calculate sum of importance scores
      const importanceSum = recentMemories.reduce((sum, memory) => sum + memory.importance, 0);
      
      const shouldTrigger = importanceSum >= this.defaultTrigger.importanceThreshold;
      
      logger.debug('Reflection trigger check', { 
        agentId, 
        importanceSum, 
        threshold: this.defaultTrigger.importanceThreshold,
        shouldTrigger 
      });

      return shouldTrigger;
    } catch (error) {
      logger.error('Failed to check reflection trigger', error as Error, { agentId });
      return false;
    }
  }

  async generateReflectionQuestions(agentId: string, memories: MemoryStream[]): Promise<string[]> {
    try {
      // Analyze memories to generate salient questions
      const memoryContents = memories.map(m => m.content).join('\n');
      
      const questions = [
        "What patterns do I notice in my recent experiences?",
        "How have my relationships changed recently?",
        "What have I learned about myself?",
        "What goals should I focus on next?",
        "How do my recent actions align with my values?"
      ];

      // In a full implementation, this would use LLM to generate context-specific questions
      // For now, return default questions that work well for most situations
      
      logger.debug('Generated reflection questions', { agentId, questionCount: questions.length });
      return questions;
    } catch (error) {
      logger.error('Failed to generate reflection questions', error as Error, { agentId });
      throw new ReflectionError('Failed to generate reflection questions', { agentId });
    }
  }

  async synthesizeInsights(agentId: string, questions: string[], memories: MemoryStream[]): Promise<ReflectionInsight[]> {
    try {
      const insights: ReflectionInsight[] = [];

      for (const question of questions) {
        // Find memories relevant to this question
        const relevantMemories = await this.findRelevantMemoriesForQuestion(question, memories);
        
        if (relevantMemories.length > 0) {
          // Generate insight for this question
          const insight = await this.generateInsightForQuestion(agentId, question, relevantMemories);
          if (insight) {
            insights.push(insight);
          }
        }
      }

      logger.debug('Synthesized insights', { agentId, insightCount: insights.length });
      return insights;
    } catch (error) {
      logger.error('Failed to synthesize insights', error as Error, { agentId });
      throw new ReflectionError('Failed to synthesize insights', { agentId });
    }
  }

  private async getRecentMemories(agentId: string): Promise<MemoryStream[]> {
    const cutoffTime = new Date(Date.now() - this.defaultTrigger.timeWindow * 60 * 60 * 1000).toISOString();
    const allMemories = await db.getMemoriesByAgent(agentId);
    
    return allMemories.filter(memory => 
      memory.timestamp >= cutoffTime && 
      memory.type !== 'reflection' // Don't include previous reflections
    );
  }

  private async callReflectionService(agentId: string, memories: MemoryStream[], agentContext: any): Promise<ReflectionInsight> {
    try {
      const response = await fetch(`${this.llmServiceUrl}/reflection/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          recentMemories: memories,
          agentContext
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.reflection;
    } catch (error) {
      logger.error('Failed to call reflection service', error as Error, { agentId });
      throw new ReflectionError('Failed to call reflection service', { agentId });
    }
  }

  private async storeReflection(
    agentId: string, 
    worldId: string, 
    reflection: ReflectionInsight, 
    sourceMemories: MemoryStream[]
  ): Promise<string> {
    const memoryId = generateId();
    const timestamp = generateTimestamp();

    // Create memory object for the reflection
    const reflectionMemory: MemoryStream = {
      memoryId,
      agentId,
      worldId,
      type: 'reflection',
      content: reflection.insight,
      timestamp,
      importance: reflection.importance,
      lastAccessed: timestamp,
      relatedMemories: sourceMemories.map(m => m.memoryId),
      embedding: [], // Will be generated by memory manager
      tags: ['reflection', 'insight']
    };

    await db.putMemory(reflectionMemory);

    // Update source memories to reference this reflection
    for (const sourceMemory of sourceMemories) {
      if (!sourceMemory.relatedMemories.includes(memoryId)) {
        sourceMemory.relatedMemories.push(memoryId);
        await db.putMemory(sourceMemory);
      }
    }

    logger.debug('Reflection stored as memory', { memoryId, agentId, relatedCount: sourceMemories.length });
    return memoryId;
  }

  private async findRelevantMemoriesForQuestion(question: string, memories: MemoryStream[]): Promise<MemoryStream[]> {
    // Simple keyword matching for now
    // In a full implementation, this would use embedding similarity
    const questionWords = question.toLowerCase().split(' ');
    const relevantMemories = memories.filter(memory => {
      const memoryWords = memory.content.toLowerCase().split(' ');
      return questionWords.some(qWord => memoryWords.some(mWord => mWord.includes(qWord)));
    });

    return relevantMemories.slice(0, 5); // Limit to top 5 relevant memories
  }

  private async generateInsightForQuestion(
    agentId: string, 
    question: string, 
    memories: MemoryStream[]
  ): Promise<ReflectionInsight | null> {
    try {
      // Simple insight generation based on memory patterns
      const memoryContents = memories.map(m => m.content);
      const averageImportance = memories.reduce((sum, m) => sum + m.importance, 0) / memories.length;

      // Generate a basic insight
      const insight = `Reflecting on "${question}": Based on recent experiences, I notice patterns in ${memoryContents.length} related memories.`;
      
      return {
        insight,
        evidence: memories.map(m => m.memoryId),
        importance: Math.round(averageImportance)
      };
    } catch (error) {
      logger.warn('Failed to generate insight for question', { agentId, question, error: (error as Error).message });
      return null;
    }
  }

  async getReflectionStatistics(agentId: string): Promise<any> {
    try {
      const reflections = await this.getReflections(agentId);
      
      const stats = {
        totalReflections: reflections.length,
        averageImportance: 0,
        lastReflection: null as string | null,
        reflectionFrequency: 0, // reflections per day
        topInsights: [] as string[]
      };

      if (reflections.length > 0) {
        stats.averageImportance = reflections.reduce((sum, r) => sum + r.importance, 0) / reflections.length;
        stats.lastReflection = reflections[0].timestamp; // Most recent first
        
        // Calculate frequency (rough estimate)
        const oldestReflection = reflections[reflections.length - 1];
        const daysSinceFirst = (new Date().getTime() - new Date(oldestReflection.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        stats.reflectionFrequency = reflections.length / Math.max(daysSinceFirst, 1);

        // Get top insights (highest importance)
        stats.topInsights = reflections
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 3)
          .map(r => r.content);
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get reflection statistics', error as Error, { agentId });
      throw new ReflectionError('Failed to get reflection statistics', { agentId });
    }
  }

  async forceReflection(agentId: string, context?: string): Promise<ReflectionInsight> {
    try {
      logger.info('Forcing reflection generation', { agentId, context });
      
      const reflection = await this.generateReflection(agentId, true);
      
      if (!reflection) {
        throw new Error('Failed to generate forced reflection');
      }

      return reflection;
    } catch (error) {
      logger.error('Failed to force reflection', error as Error, { agentId });
      throw new ReflectionError('Failed to force reflection', { agentId });
    }
  }
}