import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Utility functions for the generative world system

export function generateId(): string {
  return uuidv4();
}

export function generateTimestamp(): string {
  return new Date().toISOString();
}

export function calculateRecencyScore(timestamp: string, currentTime: string): number {
  const memoryTime = new Date(timestamp).getTime();
  const now = new Date(currentTime).getTime();
  const hoursSince = (now - memoryTime) / (1000 * 60 * 60);
  
  // Exponential decay with half-life of 24 hours
  return Math.exp(-0.693 * hoursSince / 24);
}

export function calculateRelevanceScore(queryEmbedding: number[], memoryEmbedding: number[]): number {
  if (!queryEmbedding || !memoryEmbedding || queryEmbedding.length !== memoryEmbedding.length) {
    return 0;
  }
  
  // Cosine similarity
  let dotProduct = 0;
  let queryMagnitude = 0;
  let memoryMagnitude = 0;
  
  for (let i = 0; i < queryEmbedding.length; i++) {
    dotProduct += queryEmbedding[i] * memoryEmbedding[i];
    queryMagnitude += queryEmbedding[i] * queryEmbedding[i];
    memoryMagnitude += memoryEmbedding[i] * memoryEmbedding[i];
  }
  
  queryMagnitude = Math.sqrt(queryMagnitude);
  memoryMagnitude = Math.sqrt(memoryMagnitude);
  
  if (queryMagnitude === 0 || memoryMagnitude === 0) {
    return 0;
  }
  
  return dotProduct / (queryMagnitude * memoryMagnitude);
}

export function calculateCombinedScore(
  relevanceScore: number,
  recencyScore: number,
  importanceScore: number,
  weights: { relevance: number; recency: number; importance: number } = {
    relevance: 1.0,
    recency: 1.0,
    importance: 1.0
  }
): number {
  const normalizedImportance = importanceScore / 10; // Normalize to 0-1 scale
  
  return (
    weights.relevance * relevanceScore +
    weights.recency * recencyScore +
    weights.importance * normalizedImportance
  ) / (weights.relevance + weights.recency + weights.importance);
}

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[{}]/g, '') // Remove potential JSON injection
    .trim()
    .substring(0, 10000); // Limit length
}

export function validateWorldId(worldId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(worldId);
}

export function validateAgentId(agentId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(agentId);
}

export function parseLocation(locationString: string): { x: number; y: number; area: string } {
  try {
    const parsed = JSON.parse(locationString);
    return {
      x: Number(parsed.x) || 0,
      y: Number(parsed.y) || 0,
      area: String(parsed.area) || 'unknown'
    };
  } catch {
    return { x: 0, y: 0, area: 'unknown' };
  }
}

export function formatLocation(location: { x: number; y: number; area: string }): string {
  return JSON.stringify(location);
}

export function calculateDistance(
  loc1: { x: number; y: number },
  loc2: { x: number; y: number }
): number {
  const dx = loc1.x - loc2.x;
  const dy = loc1.y - loc2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isWithinRange(
  loc1: { x: number; y: number },
  loc2: { x: number; y: number },
  range: number
): boolean {
  return calculateDistance(loc1, loc2) <= range;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        resolve(result);
        return;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          reject(lastError);
          return;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  });
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(' ');
  
  // Simple keyword extraction - remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);
  
  const keywords = words
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, maxKeywords);
  
  return [...new Set(keywords)]; // Remove duplicates
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function createLogger(serviceName: string) {
  return {
    info: (message: string, data?: any) => {
      console.log(JSON.stringify({
        timestamp: generateTimestamp(),
        level: 'INFO',
        service: serviceName,
        message,
        data
      }));
    },
    warn: (message: string, data?: any) => {
      console.warn(JSON.stringify({
        timestamp: generateTimestamp(),
        level: 'WARN',
        service: serviceName,
        message,
        data
      }));
    },
    error: (message: string, error?: Error, data?: any) => {
      console.error(JSON.stringify({
        timestamp: generateTimestamp(),
        level: 'ERROR',
        service: serviceName,
        message,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined,
        data
      }));
    },
    debug: (message: string, data?: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(JSON.stringify({
          timestamp: generateTimestamp(),
          level: 'DEBUG',
          service: serviceName,
          message,
          data
        }));
      }
    }
  };
}