import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { MemoryStream, MemoryScore, ReflectionInsight, LLMIntegrationError } from '../../../shared/types';
import { createLogger, calculateRelevanceScore, calculateRecencyScore, calculateCombinedScore, hashContent } from '../../../shared/utils';
import { PromptManager } from '../prompts/prompt-manager';
import { CacheService } from '../cache/cache-service';

const logger = createLogger('bedrock-service');

export class BedrockService {
  private client: BedrockRuntimeClient;
  private promptManager: PromptManager;
  private cacheService: CacheService;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.promptManager = new PromptManager();
    this.cacheService = new CacheService();
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const cacheKey = `embedding:${hashContent(text)}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        logger.debug('Using cached embedding');
        return JSON.parse(cached);
      }

      const command = new InvokeModelCommand({
        modelId: 'amazon.titan-embed-text-v1',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          inputText: text.substring(0, 8000) // Titan embedding limit
        })
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const embedding = responseBody.embedding;

      // Cache for 24 hours
      await this.cacheService.set(cacheKey, JSON.stringify(embedding), 86400);

      logger.debug('Generated new embedding', { textLength: text.length });
      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', error as Error, { textLength: text.length });
      throw new LLMIntegrationError('Failed to generate embedding', { textLength: text.length });
    }
  }

  async scoreMemories(queryEmbedding: number[], memories: MemoryStream[]): Promise<MemoryScore[]> {
    const currentTime = new Date().toISOString();
    const scores: MemoryScore[] = [];

    for (const memory of memories) {
      try {
        const relevanceScore = memory.embedding 
          ? calculateRelevanceScore(queryEmbedding, memory.embedding)
          : 0;
        
        const recencyScore = calculateRecencyScore(memory.lastAccessed, currentTime);
        const importanceScore = memory.importance;
        
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

  async generateReflection(
    agentId: string, 
    recentMemories: MemoryStream[], 
    agentContext?: any
  ): Promise<ReflectionInsight> {
    try {
      const cacheKey = `reflection:${agentId}:${hashContent(JSON.stringify(recentMemories.map(m => m.memoryId)))}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        logger.debug('Using cached reflection', { agentId });
        return JSON.parse(cached);
      }

      const prompt = this.promptManager.getReflectionPrompt(recentMemories, agentContext);
      const response = await this.invokeModel('anthropic.claude-3-sonnet-20240229-v1:0', prompt, {
        max_tokens: 1000,
        temperature: 0.7
      });

      const reflection = this.parseReflectionResponse(response);
      
      // Cache for 1 hour
      await this.cacheService.set(cacheKey, JSON.stringify(reflection), 3600);

      logger.info('Generated reflection', { agentId, importance: reflection.importance });
      return reflection;
    } catch (error) {
      logger.error('Failed to generate reflection', error as Error, { agentId });
      throw new LLMIntegrationError('Failed to generate reflection', { agentId });
    }
  }

  async generatePlan(
    agentId: string,
    planType: 'daily' | 'hourly' | 'minute',
    context: any,
    currentPlan?: any
  ): Promise<any> {
    try {
      const cacheKey = `plan:${agentId}:${planType}:${hashContent(JSON.stringify(context))}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        logger.debug('Using cached plan', { agentId, planType });
        return JSON.parse(cached);
      }

      const prompt = this.promptManager.getPlanningPrompt(planType, context, currentPlan);
      const response = await this.invokeModel('anthropic.claude-3-sonnet-20240229-v1:0', prompt, {
        max_tokens: 1500,
        temperature: 0.8
      });

      const plan = this.parsePlanResponse(response, planType);
      
      // Cache for different durations based on plan type
      const cacheDuration = planType === 'daily' ? 3600 : planType === 'hourly' ? 1800 : 300;
      await this.cacheService.set(cacheKey, JSON.stringify(plan), cacheDuration);

      logger.info('Generated plan', { agentId, planType });
      return plan;
    } catch (error) {
      logger.error('Failed to generate plan', error as Error, { agentId, planType });
      throw new LLMIntegrationError('Failed to generate plan', { agentId, planType });
    }
  }

  async generateAction(
    agentId: string,
    situation: string,
    availableActions: string[],
    agentContext?: any
  ): Promise<any> {
    try {
      const prompt = this.promptManager.getActionPrompt(situation, availableActions, agentContext);
      const response = await this.invokeModel('anthropic.claude-3-haiku-20240307-v1:0', prompt, {
        max_tokens: 500,
        temperature: 0.6
      });

      const action = this.parseActionResponse(response);
      
      logger.debug('Generated action', { agentId, actionType: action.type });
      return action;
    } catch (error) {
      logger.error('Failed to generate action', error as Error, { agentId });
      throw new LLMIntegrationError('Failed to generate action', { agentId });
    }
  }

  async generateDialogue(
    speakerId: string,
    listenerId: string,
    context: any,
    conversationHistory?: any[]
  ): Promise<any> {
    try {
      const prompt = this.promptManager.getDialoguePrompt(speakerId, listenerId, context, conversationHistory);
      const response = await this.invokeModel('anthropic.claude-3-sonnet-20240229-v1:0', prompt, {
        max_tokens: 800,
        temperature: 0.9
      });

      const dialogue = this.parseDialogueResponse(response);
      
      logger.debug('Generated dialogue', { speakerId, listenerId });
      return dialogue;
    } catch (error) {
      logger.error('Failed to generate dialogue', error as Error, { speakerId, listenerId });
      throw new LLMIntegrationError('Failed to generate dialogue', { speakerId, listenerId });
    }
  }

  async scoreImportance(content: string, agentContext?: any): Promise<number> {
    try {
      const cacheKey = `importance:${hashContent(content)}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        logger.debug('Using cached importance score');
        return parseInt(cached);
      }

      const prompt = this.promptManager.getImportancePrompt(content, agentContext);
      const response = await this.invokeModel('anthropic.claude-3-haiku-20240307-v1:0', prompt, {
        max_tokens: 50,
        temperature: 0.3
      });

      const importance = this.parseImportanceResponse(response);
      
      // Cache for 24 hours
      await this.cacheService.set(cacheKey, importance.toString(), 86400);

      logger.debug('Scored importance', { importance, contentLength: content.length });
      return importance;
    } catch (error) {
      logger.error('Failed to score importance', error as Error, { contentLength: content.length });
      throw new LLMIntegrationError('Failed to score importance', { contentLength: content.length });
    }
  }

  async processBatch(requests: any[]): Promise<any[]> {
    const results = [];
    const batchSize = 5; // Process in small batches to avoid rate limits

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(async (request) => {
        try {
          switch (request.type) {
            case 'embedding':
              return await this.generateEmbedding(request.text);
            case 'importance':
              return await this.scoreImportance(request.content, request.context);
            case 'action':
              return await this.generateAction(request.agentId, request.situation, request.availableActions, request.context);
            default:
              throw new Error(`Unknown request type: ${request.type}`);
          }
        } catch (error) {
          logger.warn('Batch request failed', { requestType: request.type, error: (error as Error).message });
          return { error: (error as Error).message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('Processed batch requests', { totalRequests: requests.length, successCount: results.filter(r => !r.error).length });
    return results;
  }

  private async invokeModel(modelId: string, prompt: string, parameters: any): Promise<string> {
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: parameters.max_tokens,
        temperature: parameters.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
      return responseBody.content[0].text;
    }
    
    throw new Error('Invalid response format from Bedrock');
  }

  private parseReflectionResponse(response: string): ReflectionInsight {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return {
        insight: parsed.insight || response,
        evidence: parsed.evidence || [],
        importance: parsed.importance || 5
      };
    } catch {
      // Fallback to text parsing
      return {
        insight: response.trim(),
        evidence: [],
        importance: 5
      };
    }
  }

  private parsePlanResponse(response: string, planType: string): any {
    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // Fallback to simple text parsing
      const lines = response.split('\n').filter(line => line.trim());
      return {
        type: planType,
        items: lines,
        timestamp: new Date().toISOString()
      };
    }
  }

  private parseActionResponse(response: string): any {
    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // Fallback to simple action parsing
      return {
        type: 'general',
        description: response.trim(),
        parameters: {}
      };
    }
  }

  private parseDialogueResponse(response: string): any {
    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // Fallback to simple dialogue parsing
      return {
        content: response.trim(),
        emotion: 'neutral',
        intent: 'conversation'
      };
    }
  }

  private parseImportanceResponse(response: string): number {
    // Extract number from response
    const match = response.match(/(\d+)/);
    if (match) {
      const importance = parseInt(match[1]);
      return Math.max(1, Math.min(10, importance)); // Clamp to 1-10 range
    }
    return 5; // Default importance
  }
}