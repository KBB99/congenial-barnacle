import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';

describe('End-to-End Workflow Tests', () => {
  let api: AxiosInstance;
  let ws: WebSocket;
  const baseURL = process.env.API_BASE_URL || 'http://localhost:8080';
  const wsUrl = process.env.WS_URL || 'ws://localhost:8080/ws';

  beforeAll(async () => {
    api = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Wait for services to be ready
    await waitForServices();
  });

  afterAll(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  async function waitForServices() {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await api.get('/health');
        return;
      } catch (error) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    throw new Error('Services did not become ready in time');
  }

  function connectWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      socket.on('open', () => resolve(socket));
      socket.on('error', reject);
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
    });
  }

  describe('Complete World Creation Workflow', () => {
    let worldId: string;
    let agentId: string;

    test('Create world, spawn agent, and verify real-time updates', async () => {
      // Step 1: Create a new world
      const worldData = {
        name: 'Integration Test World',
        description: 'A world created during integration testing',
        config: {
          size: { width: 1000, height: 1000 },
          locations: [
            { name: 'Town Center', x: 500, y: 500, type: 'public' },
            { name: 'Coffee Shop', x: 300, y: 400, type: 'business' }
          ],
          time_speed: 1.0
        }
      };

      const worldResponse = await api.post('/api/worlds', worldData);
      expect(worldResponse.status).toBe(201);
      worldId = worldResponse.data.id;

      // Step 2: Connect to WebSocket for real-time updates
      ws = await connectWebSocket();

      // Subscribe to world updates
      const subscribeMessage = {
        type: 'subscribe',
        channel: 'world-updates',
        worldId: worldId
      };
      ws.send(JSON.stringify(subscribeMessage));

      // Step 3: Create an agent in the world
      const agentData = {
        worldId: worldId,
        name: 'Test Agent Alice',
        description: 'An agent created for workflow testing',
        personality: {
          traits: ['friendly', 'curious', 'helpful'],
          interests: ['coffee', 'conversation', 'exploration'],
          occupation: 'explorer',
          age: 28
        },
        position: { x: 500, y: 500 }
      };

      const agentResponse = await api.post('/api/agents', agentData);
      expect(agentResponse.status).toBe(201);
      agentId = agentResponse.data.id;

      // Step 4: Verify agent appears in world
      const worldAgentsResponse = await api.get(`/api/worlds/${worldId}/agents`);
      expect(worldAgentsResponse.status).toBe(200);
      expect(worldAgentsResponse.data).toHaveLength(1);
      expect(worldAgentsResponse.data[0].id).toBe(agentId);

      // Step 5: Wait for WebSocket update about new agent
      await new Promise<void>((resolve) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'world-update' && message.agents.length > 0) {
            expect(message.worldId).toBe(worldId);
            expect(message.agents[0].id).toBe(agentId);
            resolve();
          }
        });
      });
    }, 60000);

    test('Agent interaction and memory formation workflow', async () => {
      // Step 1: Send message to agent
      const messageData = {
        content: 'Hello! What do you think about this coffee shop?',
        sender: 'integration-tester'
      };

      const messageResponse = await api.post(`/api/agents/${agentId}/messages`, messageData);
      expect(messageResponse.status).toBe(200);
      expect(messageResponse.data).toHaveProperty('response');

      // Step 2: Verify memory was created
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for memory processing

      const memoryResponse = await api.get(`/api/agents/${agentId}/memory`);
      expect(memoryResponse.status).toBe(200);
      expect(memoryResponse.data.length).toBeGreaterThan(0);

      // Find the memory related to our interaction
      const interactionMemory = memoryResponse.data.find((memory: any) => 
        memory.content.includes('coffee shop') || memory.content.includes('integration-tester')
      );
      expect(interactionMemory).toBeDefined();

      // Step 3: Move agent and verify position update
      const newPosition = { x: 300, y: 400 }; // Move to coffee shop
      const moveResponse = await api.patch(`/api/agents/${agentId}`, {
        position: newPosition
      });
      expect(moveResponse.status).toBe(200);
      expect(moveResponse.data.position).toEqual(newPosition);

      // Step 4: Verify WebSocket position update
      await new Promise<void>((resolve) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'agent-update' && message.agentId === agentId) {
            expect(message.position).toEqual(newPosition);
            resolve();
          }
        });
      });
    }, 45000);

    test('Agent planning and reflection workflow', async () => {
      // Step 1: Trigger planning by giving agent a goal
      const planningMessage = {
        content: 'I want you to explore the coffee shop and then return to the town center',
        sender: 'goal-setter'
      };

      await api.post(`/api/agents/${agentId}/messages`, planningMessage);

      // Step 2: Wait for plan creation
      await new Promise(resolve => setTimeout(resolve, 3000));

      const plansResponse = await api.get(`/api/agents/${agentId}/plans`);
      expect(plansResponse.status).toBe(200);
      expect(plansResponse.data.length).toBeGreaterThan(0);

      const explorationPlan = plansResponse.data.find((plan: any) => 
        plan.goal.includes('explore') || plan.goal.includes('coffee')
      );
      expect(explorationPlan).toBeDefined();
      expect(explorationPlan.steps).toBeDefined();
      expect(Array.isArray(explorationPlan.steps)).toBe(true);

      // Step 3: Add more memories to trigger reflection
      const memories = [
        'I noticed the coffee shop has a cozy atmosphere',
        'The barista seemed friendly when I walked by',
        'There were several people having conversations',
        'The aroma of fresh coffee was delightful'
      ];

      for (const memory of memories) {
        await api.post(`/api/agents/${agentId}/messages`, {
          content: memory,
          sender: 'observation'
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 4: Wait for reflection to be generated
      await new Promise(resolve => setTimeout(resolve, 5000));

      const reflectionsResponse = await api.get(`/api/agents/${agentId}/reflections`);
      expect(reflectionsResponse.status).toBe(200);
      
      if (reflectionsResponse.data.length > 0) {
        const coffeeReflection = reflectionsResponse.data.find((reflection: any) => 
          reflection.content.includes('coffee') || reflection.content.includes('shop')
        );
        expect(coffeeReflection).toBeDefined();
      }
    }, 60000);

    afterAll(async () => {
      // Clean up test data
      if (agentId) {
        await api.delete(`/api/agents/${agentId}`).catch(() => {});
      }
      if (worldId) {
        await api.delete(`/api/worlds/${worldId}`).catch(() => {});
      }
    });
  });

  describe('Time Control Workflow', () => {
    let worldId: string;

    beforeAll(async () => {
      const worldResponse = await api.post('/api/worlds', {
        name: 'Time Control Test World',
        description: 'Testing time controls',
        config: { size: { width: 500, height: 500 }, time_speed: 1.0 }
      });
      worldId = worldResponse.data.id;
    });

    afterAll(async () => {
      if (worldId) {
        await api.delete(`/api/worlds/${worldId}`).catch(() => {});
      }
    });

    test('Pause and resume world simulation', async () => {
      // Pause the world
      const pauseResponse = await api.post(`/api/worlds/${worldId}/pause`);
      expect(pauseResponse.status).toBe(200);

      const pausedWorld = await api.get(`/api/worlds/${worldId}`);
      expect(pausedWorld.data.state.paused).toBe(true);

      // Resume the world
      const resumeResponse = await api.post(`/api/worlds/${worldId}/resume`);
      expect(resumeResponse.status).toBe(200);

      const resumedWorld = await api.get(`/api/worlds/${worldId}`);
      expect(resumedWorld.data.state.paused).toBe(false);
    });

    test('Change simulation speed', async () => {
      const speedData = { timeSpeed: 2.0 };
      
      const speedResponse = await api.patch(`/api/worlds/${worldId}`, speedData);
      expect(speedResponse.status).toBe(200);
      expect(speedResponse.data.config.time_speed).toBe(2.0);
    });
  });

  describe('Error Recovery Workflow', () => {
    test('Handle service failures gracefully', async () => {
      // Test with invalid world ID
      try {
        await api.get('/api/worlds/invalid-uuid');
        throw new Error('Should have failed');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }

      // Test with malformed agent data
      try {
        await api.post('/api/agents', { invalid: 'data' });
        throw new Error('Should have failed');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    test('WebSocket reconnection handling', async () => {
      const socket = await connectWebSocket();
      
      // Force close connection
      socket.close();
      
      // Verify connection is closed
      expect(socket.readyState).toBe(WebSocket.CLOSED);
      
      // Reconnect
      const newSocket = await connectWebSocket();
      expect(newSocket.readyState).toBe(WebSocket.OPEN);
      
      newSocket.close();
    });
  });
});