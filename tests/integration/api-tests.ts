import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';

describe('Generative World API Integration Tests', () => {
  let api: AxiosInstance;
  const baseURL = process.env.API_BASE_URL || 'http://localhost:8080';
  
  beforeAll(() => {
    api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  describe('Health Checks', () => {
    test('API Gateway health check', async () => {
      const response = await api.get('/health');
      expect(response.status).toBe(200);
      expect(response.data).toContain('healthy');
    });

    test('World Management service health', async () => {
      const response = await api.get('/api/worlds/health');
      expect(response.status).toBe(200);
    });

    test('Agent Runtime service health', async () => {
      const response = await api.get('/api/agents/health');
      expect(response.status).toBe(200);
    });

    test('LLM Integration service health', async () => {
      const response = await api.get('/api/llm/health');
      expect(response.status).toBe(200);
    });
  });

  describe('World Management API', () => {
    let testWorldId: string;

    test('Create a new world', async () => {
      const worldData = {
        name: 'Test World',
        description: 'A test world for integration testing',
        config: {
          size: { width: 1000, height: 1000 },
          locations: [
            { name: 'Test Location', x: 500, y: 500, type: 'test' }
          ],
          time_speed: 1.0
        }
      };

      const response = await api.post('/api/worlds', worldData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe(worldData.name);
      
      testWorldId = response.data.id;
    });

    test('Get world by ID', async () => {
      const response = await api.get(`/api/worlds/${testWorldId}`);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testWorldId);
      expect(response.data.name).toBe('Test World');
    });

    test('List all worlds', async () => {
      const response = await api.get('/api/worlds');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    test('Update world', async () => {
      const updateData = {
        description: 'Updated test world description'
      };

      const response = await api.patch(`/api/worlds/${testWorldId}`, updateData);
      expect(response.status).toBe(200);
      expect(response.data.description).toBe(updateData.description);
    });

    test('Delete world', async () => {
      const response = await api.delete(`/api/worlds/${testWorldId}`);
      expect(response.status).toBe(204);

      // Verify deletion
      try {
        await api.get(`/api/worlds/${testWorldId}`);
        fail('World should have been deleted');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('Agent Management API', () => {
    let testWorldId: string;
    let testAgentId: string;

    beforeAll(async () => {
      // Create a test world for agent tests
      const worldResponse = await api.post('/api/worlds', {
        name: 'Agent Test World',
        description: 'World for testing agents',
        config: { size: { width: 1000, height: 1000 } }
      });
      testWorldId = worldResponse.data.id;
    });

    afterAll(async () => {
      // Clean up test world
      if (testWorldId) {
        await api.delete(`/api/worlds/${testWorldId}`);
      }
    });

    test('Create a new agent', async () => {
      const agentData = {
        worldId: testWorldId,
        name: 'Test Agent',
        description: 'A test agent for integration testing',
        personality: {
          traits: ['friendly', 'curious'],
          interests: ['testing', 'integration'],
          occupation: 'tester',
          age: 25
        },
        position: { x: 100, y: 100 }
      };

      const response = await api.post('/api/agents', agentData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe(agentData.name);
      expect(response.data.worldId).toBe(testWorldId);
      
      testAgentId = response.data.id;
    });

    test('Get agent by ID', async () => {
      const response = await api.get(`/api/agents/${testAgentId}`);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testAgentId);
      expect(response.data.name).toBe('Test Agent');
    });

    test('List agents in world', async () => {
      const response = await api.get(`/api/worlds/${testWorldId}/agents`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    test('Update agent position', async () => {
      const newPosition = { x: 200, y: 200 };
      const response = await api.patch(`/api/agents/${testAgentId}`, {
        position: newPosition
      });
      
      expect(response.status).toBe(200);
      expect(response.data.position).toEqual(newPosition);
    });

    test('Send message to agent', async () => {
      const messageData = {
        content: 'Hello, test agent!',
        sender: 'integration-test'
      };

      const response = await api.post(`/api/agents/${testAgentId}/messages`, messageData);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('response');
    });

    test('Get agent memory', async () => {
      const response = await api.get(`/api/agents/${testAgentId}/memory`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('Get agent plans', async () => {
      const response = await api.get(`/api/agents/${testAgentId}/plans`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('LLM Integration API', () => {
    test('Generate text completion', async () => {
      const promptData = {
        prompt: 'Complete this sentence: The weather today is',
        maxTokens: 50,
        temperature: 0.7
      };

      const response = await api.post('/api/llm/complete', promptData);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('completion');
      expect(typeof response.data.completion).toBe('string');
    });

    test('Generate agent response', async () => {
      const responseData = {
        agentPersonality: {
          traits: ['friendly', 'helpful'],
          occupation: 'assistant'
        },
        context: 'User asked about the weather',
        message: 'What\'s the weather like today?'
      };

      const response = await api.post('/api/llm/agent-response', responseData);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('response');
      expect(typeof response.data.response).toBe('string');
    });

    test('Generate reflection', async () => {
      const reflectionData = {
        memories: [
          'I had coffee this morning',
          'I met a new person at the park',
          'The weather was sunny'
        ],
        agentPersonality: {
          traits: ['thoughtful', 'observant']
        }
      };

      const response = await api.post('/api/llm/reflect', reflectionData);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('reflection');
      expect(typeof response.data.reflection).toBe('string');
    });
  });

  describe('Error Handling', () => {
    test('Handle 404 for non-existent world', async () => {
      try {
        await api.get('/api/worlds/non-existent-id');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    test('Handle 400 for invalid world data', async () => {
      try {
        await api.post('/api/worlds', { invalid: 'data' });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    test('Handle 404 for non-existent agent', async () => {
      try {
        await api.get('/api/agents/non-existent-id');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });
});