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

// Simulation state
let simulationState = {
  isRunning: false,
  isPaused: true,
  currentTime: new Date(),
  timeMultiplier: 1,
  tickRate: 10,
  processedTicks: 0
};

// World data with dynamic time
const worlds = new Map();
const agents = new Map();
const worldSimulations = new Map();

// Initialize sample worlds
function initializeSampleData() {
  const smallvilleId = '550e8400-e29b-41d4-a716-446655440000';
  const universityId = '550e8400-e29b-41d4-a716-446655440001';
  
  // Smallville world
  worlds.set(smallvilleId, {
    worldId: smallvilleId,
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
  });

  // University world
  worlds.set(universityId, {
    worldId: universityId,
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
  });

  // Smallville agents
  const aliceId = '660e8400-e29b-41d4-a716-446655440000';
  agents.set(aliceId, {
    agentId: aliceId,
    worldId: smallvilleId,
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
    status: 'active',
    memories: [],
    lastThought: 'I wonder what new coffee blend I should try today.'
  });

  const bobId = '660e8400-e29b-41d4-a716-446655440001';
  agents.set(bobId, {
    agentId: bobId,
    worldId: smallvilleId,
    name: 'Bob Smith',
    description: 'A retired librarian who spends his days reading',
    currentLocation: { x: 700, y: 300, area: 'Library' },
    currentAction: 'Reading a book',
    relationships: { [aliceId]: 'acquaintance' },
    goals: ['Help visitors find books', 'Organize library'],
    traits: ['wise', 'patient', 'knowledgeable'],
    currentPlan: {
      dailyPlan: ['Organize books', 'Help visitors', 'Read quietly'],
      hourlyPlan: ['Sort returned books', 'Assist patrons'],
      currentStep: 'Sort returned books'
    },
    status: 'active',
    memories: [],
    lastThought: 'This book about ancient history is fascinating.'
  });

  const charlieId = '660e8400-e29b-41d4-a716-446655440002';
  agents.set(charlieId, {
    agentId: charlieId,
    worldId: smallvilleId,
    name: 'Charlie Davis',
    description: 'A local artist who paints landscapes',
    currentLocation: { x: 500, y: 500, area: 'Park' },
    currentAction: 'Painting the scenery',
    relationships: { [aliceId]: 'friend', [bobId]: 'acquaintance' },
    goals: ['Create beautiful art', 'Sell paintings at the market'],
    traits: ['creative', 'observant', 'passionate'],
    currentPlan: {
      dailyPlan: ['Set up easel', 'Paint landscapes', 'Visit gallery', 'Meet other artists'],
      hourlyPlan: ['Mix colors', 'Paint the sunset'],
      currentStep: 'Paint the sunset'
    },
    status: 'active',
    memories: [],
    lastThought: 'The light is perfect for capturing the mood of the park.'
  });
}

// Initialize data
initializeSampleData();

// Simulation loop
let simulationInterval = null;

function startSimulation() {
  if (simulationInterval) return;
  
  simulationState.isRunning = true;
  simulationState.isPaused = false;
  
  const tickDuration = 1000 / simulationState.tickRate;
  
  simulationInterval = setInterval(() => {
    processTick();
  }, tickDuration);
  
  console.log('🎮 Simulation started');
}

function pauseSimulation() {
  simulationState.isPaused = true;
  console.log('⏸️  Simulation paused');
}

function resumeSimulation() {
  simulationState.isPaused = false;
  console.log('▶️  Simulation resumed');
}

function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  simulationState.isRunning = false;
  simulationState.isPaused = true;
  console.log('⏹️  Simulation stopped');
}

function processTick() {
  if (simulationState.isPaused) return;
  
  simulationState.processedTicks++;
  
  // Update simulation time
  const now = new Date();
  simulationState.currentTime = new Date(
    simulationState.currentTime.getTime() + 
    (1000 * simulationState.timeMultiplier / simulationState.tickRate)
  );
  
  // Update world times
  worlds.forEach(world => {
    if (world.status === 'running') {
      world.currentTime = simulationState.currentTime.toISOString();
    }
  });
  
  // Process agents
  agents.forEach(agent => {
    const world = worlds.get(agent.worldId);
    if (world && world.status === 'running') {
      processAgent(agent);
    }
  });
  
  // Broadcast updates every second
  if (simulationState.processedTicks % simulationState.tickRate === 0) {
    broadcastWorldUpdates();
  }
}

function processAgent(agent) {
  // Simulate agent movement
  const moveSpeed = 5;
  const dx = (Math.random() - 0.5) * moveSpeed;
  const dy = (Math.random() - 0.5) * moveSpeed;
  
  agent.currentLocation.x = Math.max(0, Math.min(1000, agent.currentLocation.x + dx));
  agent.currentLocation.y = Math.max(0, Math.min(1000, agent.currentLocation.y + dy));
  
  // Simulate agent actions based on time of day
  const hour = simulationState.currentTime.getHours();
  
  if (agent.name === 'Alice Johnson') {
    if (hour >= 6 && hour < 9) {
      agent.currentAction = 'Opening the coffee shop';
      agent.currentLocation.area = 'Coffee Shop';
    } else if (hour >= 9 && hour < 17) {
      agent.currentAction = 'Serving customers';
    } else if (hour >= 17 && hour < 18) {
      agent.currentAction = 'Cleaning up the shop';
    } else {
      agent.currentAction = 'Relaxing at home';
      agent.currentLocation.area = 'Home';
    }
  }
  
  // Generate random thoughts periodically
  if (Math.random() < 0.1) {
    agent.lastThought = generateThought(agent);
  }
  
  // Add memories
  if (Math.random() < 0.05) {
    const memory = {
      timestamp: simulationState.currentTime.toISOString(),
      content: `${agent.currentAction} at ${agent.currentLocation.area}`,
      importance: Math.floor(Math.random() * 5) + 1
    };
    agent.memories.push(memory);
    
    // Keep only last 10 memories for demo
    if (agent.memories.length > 10) {
      agent.memories.shift();
    }
  }
}

function generateThought(agent) {
  const thoughts = {
    'Alice Johnson': [
      'I should try that new coffee blend today.',
      'The customers seem happy this morning.',
      'I wonder how Bob is doing at the library.',
      'This espresso machine needs cleaning.',
      'What a beautiful day outside!'
    ],
    'Bob Smith': [
      'This book is quite interesting.',
      'I should reorganize the history section.',
      'It\'s been quiet in the library today.',
      'I miss the days when more people read books.',
      'Perhaps I\'ll visit Alice for coffee later.'
    ],
    'Charlie Davis': [
      'The light is perfect for painting.',
      'I need more blue paint for the sky.',
      'This landscape is coming together nicely.',
      'I should visit the gallery tomorrow.',
      'Art is the window to the soul.'
    ]
  };
  
  const agentThoughts = thoughts[agent.name] || ['Thinking about life...'];
  return agentThoughts[Math.floor(Math.random() * agentThoughts.length)];
}

function broadcastWorldUpdates() {
  worlds.forEach(world => {
    const worldAgents = Array.from(agents.values()).filter(a => a.worldId === world.worldId);
    
    io.emit('world-update', {
      type: 'world-update',
      worldId: world.worldId,
      currentTime: world.currentTime,
      agents: worldAgents,
      timestamp: Date.now()
    });
  });
  
  io.emit('simulation-state', simulationState);
}

// API Endpoints

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'enhanced-mock-api-gateway',
    simulation: simulationState
  });
});

// World endpoints
app.get('/api/worlds', (req, res) => {
  res.json({
    success: true,
    data: Array.from(worlds.values())
  });
});

app.get('/api/worlds/:worldId', (req, res) => {
  const world = worlds.get(req.params.worldId);
  if (!world) {
    return res.status(404).json({ success: false, error: 'World not found' });
  }
  res.json({
    success: true,
    data: world
  });
});

// Agent endpoints
app.get('/api/worlds/:worldId/agents', (req, res) => {
  const worldAgents = Array.from(agents.values()).filter(a => a.worldId === req.params.worldId);
  res.json({
    success: true,
    data: worldAgents
  });
});

app.get('/api/agents/:agentId', (req, res) => {
  const agent = agents.get(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  res.json({
    success: true,
    data: agent
  });
});

// Simulation control endpoints
app.post('/api/simulation/start', (req, res) => {
  startSimulation();
  res.json({ success: true, state: simulationState });
});

app.post('/api/simulation/pause', (req, res) => {
  pauseSimulation();
  res.json({ success: true, state: simulationState });
});

app.post('/api/simulation/resume', (req, res) => {
  resumeSimulation();
  res.json({ success: true, state: simulationState });
});

app.post('/api/simulation/stop', (req, res) => {
  stopSimulation();
  res.json({ success: true, state: simulationState });
});

app.post('/api/simulation/speed', (req, res) => {
  const { multiplier } = req.body;
  if (multiplier > 0 && multiplier <= 100) {
    simulationState.timeMultiplier = multiplier;
    res.json({ success: true, state: simulationState });
  } else {
    res.status(400).json({ success: false, error: 'Invalid time multiplier' });
  }
});

app.get('/api/simulation/state', (req, res) => {
  res.json({ success: true, data: simulationState });
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial state
  socket.emit('simulation-state', simulationState);
  
  socket.on('subscribe', (data) => {
    console.log('Client subscribed to:', data);
    socket.join(data.channel);
    
    if (data.channel === 'world-updates' && data.worldId) {
      const world = worlds.get(data.worldId);
      const worldAgents = Array.from(agents.values()).filter(a => a.worldId === data.worldId);
      
      socket.emit('world-update', {
        type: 'world-update',
        worldId: data.worldId,
        world,
        agents: worldAgents,
        timestamp: Date.now()
      });
    }
  });
  
  socket.on('control', (data) => {
    console.log('Control command:', data);
    
    switch (data.command) {
      case 'start':
        startSimulation();
        break;
      case 'pause':
        pauseSimulation();
        break;
      case 'resume':
        resumeSimulation();
        break;
      case 'stop':
        stopSimulation();
        break;
      case 'setSpeed':
        if (data.multiplier > 0) {
          simulationState.timeMultiplier = data.multiplier;
        }
        break;
    }
    
    io.emit('simulation-state', simulationState);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Enhanced Mock API Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server running on ws://localhost:${PORT}`);
  console.log(`🌍 Simulation engine ready!`);
  console.log(`⏸️  Simulation is paused. Use API or WebSocket to start.`);
});