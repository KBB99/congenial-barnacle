const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Mock data
const mockWorlds = [
  {
    worldId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Smallville',
    description: 'A small town simulation with various characters and locations',
    status: 'running',
    agentCount: 3,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    currentTime: new Date().toISOString(),
    settings: {
      timeSpeed: 1.0,
      maxAgents: 50,
      worldSize: { width: 1000, height: 1000 },
      physics: { gravity: false, collision: true }
    }
  },
  {
    worldId: '550e8400-e29b-41d4-a716-446655440001',
    name: 'University Campus',
    description: 'A university campus with students, professors, and various academic buildings',
    status: 'paused',
    agentCount: 2,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    currentTime: new Date().toISOString(),
    settings: {
      timeSpeed: 1.0,
      maxAgents: 100,
      worldSize: { width: 1500, height: 1200 },
      physics: { gravity: false, collision: true }
    }
  }
];

const mockAgents = [
  {
    agentId: '660e8400-e29b-41d4-a716-446655440000',
    worldId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Alice Johnson',
    description: 'A friendly barista who works at the coffee shop',
    currentLocation: { x: 300, y: 400, area: 'Coffee Shop' },
    currentAction: 'Making coffee',
    relationships: {},
    goals: ['Serve customers well', 'Learn about coffee brewing'],
    traits: ['friendly', 'curious', 'helpful'],
    currentPlan: {
      dailyPlan: ['Open shop', 'Serve customers', 'Clean equipment', 'Close shop'],
      hourlyPlan: ['Prepare morning coffee', 'Greet customers'],
      currentStep: 'Prepare morning coffee'
    },
    status: 'active'
  },
  {
    agentId: '660e8400-e29b-41d4-a716-446655440001',
    worldId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Bob Smith',
    description: 'A retired librarian who spends his days reading',
    currentLocation: { x: 700, y: 300, area: 'Library' },
    currentAction: 'Reading a book',
    relationships: {},
    goals: ['Help visitors find books', 'Organize library'],
    traits: ['wise', 'patient', 'knowledgeable'],
    currentPlan: {
      dailyPlan: ['Organize books', 'Help visitors', 'Read quietly'],
      hourlyPlan: ['Sort returned books', 'Assist patrons'],
      currentStep: 'Sort returned books'
    },
    status: 'active'
  }
];

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mock-api-gateway' });
});

app.get('/api/worlds/health', (req, res) => {
  res.json({ status: 'healthy', service: 'world-management' });
});

app.get('/api/agents/health', (req, res) => {
  res.json({ status: 'healthy', service: 'agent-runtime' });
});

app.get('/api/llm/health', (req, res) => {
  res.json({ status: 'healthy', service: 'llm-integration' });
});

// World API endpoints
app.get('/api/worlds', (req, res) => {
  res.json({
    success: true,
    data: mockWorlds
  });
});

app.get('/api/worlds/:worldId', (req, res) => {
  const world = mockWorlds.find(w => w.worldId === req.params.worldId);
  if (!world) {
    return res.status(404).json({ success: false, error: 'World not found' });
  }
  res.json({
    success: true,
    data: world
  });
});

app.post('/api/worlds', (req, res) => {
  const newWorld = {
    worldId: `world-${Date.now()}`,
    name: req.body.name || 'New World',
    description: req.body.description || 'A new generative world',
    status: 'running',
    agentCount: 0,
    createdAt: new Date().toISOString(),
    config: req.body.config || { size: { width: 1000, height: 1000 } }
  };
  
  mockWorlds.push(newWorld);
  
  // Broadcast world creation to connected clients
  io.emit('world-created', newWorld);
  
  res.status(201).json({
    success: true,
    data: newWorld
  });
});

// Agent API endpoints
app.get('/api/worlds/:worldId/agents', (req, res) => {
  const worldAgents = mockAgents.filter(a => a.worldId === req.params.worldId);
  res.json({
    success: true,
    data: worldAgents
  });
});

app.post('/api/worlds/:worldId/agents', (req, res) => {
  const newAgent = {
    agentId: `agent-${Date.now()}`,
    worldId: req.params.worldId,
    name: req.body.name || 'New Agent',
    description: req.body.description || 'A new agent',
    position: req.body.position || { x: 100, y: 100 },
    status: 'active',
    personality: req.body.personality || {}
  };
  
  mockAgents.push(newAgent);
  
  // Broadcast agent creation to connected clients
  io.emit('agent-created', newAgent);
  
  res.status(201).json({
    success: true,
    data: newAgent
  });
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe', (data) => {
    console.log('Client subscribed to:', data);
    socket.join(data.channel);
    
    // Send initial data based on subscription
    if (data.channel === 'world-updates' && data.worldId) {
      const worldAgents = mockAgents.filter(a => a.worldId === data.worldId);
      socket.emit('world-update', {
        type: 'world-update',
        worldId: data.worldId,
        agents: worldAgents,
        timestamp: Date.now()
      });
    }
  });
  
  socket.on('unsubscribe', (data) => {
    console.log('Client unsubscribed from:', data);
    socket.leave(data.channel);
    socket.emit('unsubscribed', { channel: data.channel });
  });
  
  socket.on('ping', (data) => {
    socket.emit('pong', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Simulate periodic updates
setInterval(() => {
  // Simulate agent movement
  mockAgents.forEach(agent => {
    agent.currentLocation.x += (Math.random() - 0.5) * 10;
    agent.currentLocation.y += (Math.random() - 0.5) * 10;
    
    // Keep agents within bounds
    agent.currentLocation.x = Math.max(0, Math.min(1000, agent.currentLocation.x));
    agent.currentLocation.y = Math.max(0, Math.min(1000, agent.currentLocation.y));
  });
  
  // Broadcast updates to all connected clients
  io.emit('agents-updated', {
    type: 'agents-updated',
    agents: mockAgents,
    timestamp: Date.now()
  });
}, 5000); // Update every 5 seconds

// Heartbeat
setInterval(() => {
  io.emit('heartbeat', {
    type: 'heartbeat',
    timestamp: Date.now()
  });
}, 30000); // Every 30 seconds

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server running on ws://localhost:${PORT}`);
  console.log(`🌍 Ready to serve Generative World frontend!`);
});