# World Simulation Engine Guide

## Overview

The World Simulation Engine is a core component of the Generative World system that manages time progression, agent processing, event scheduling, and world state management. It provides a flexible framework for running simulations at various speeds while maintaining consistency and enabling user control.

## Architecture

### Core Components

1. **TimeController** - Manages simulation time and tick generation
2. **SimulationLoop** - Orchestrates agent processing and world updates
3. **EventScheduler** - Handles scheduled and recurring events
4. **WorldStateManager** - Maintains and updates world state

## Implementation Status

### ✅ Completed Components

#### 1. TimeController (`services/world-management/src/simulation/time-controller.ts`)
- Real-time and accelerated time modes (1x to 100x speed)
- Pause/resume functionality
- Time skip capabilities
- Day phase tracking (dawn, morning, afternoon, evening, night)
- Event-driven architecture with tick events

#### 2. SimulationLoop (`services/world-management/src/simulation/simulation-loop.ts`)
- Agent batch processing with concurrency control
- Integration points for LLM services
- Performance monitoring and metrics
- State management and synchronization
- WebSocket update broadcasting

#### 3. EventScheduler (`services/world-management/src/simulation/event-scheduler.ts`)
- One-time and recurring event scheduling
- Priority-based event processing
- Time-based event triggers
- Event cancellation and management

#### 4. WorldStateManager (`services/world-management/src/simulation/world-state-manager.ts`)
- Comprehensive world state tracking
- Agent and object management
- Relationship tracking
- Conversation management
- State snapshots and history

### 🚧 Integration Points Needed

1. **Amazon Bedrock Integration**
   - Connect agent processing to actual LLM calls
   - Implement prompt templates for agent cognition
   - Add caching layer for LLM responses

2. **Backend Service Integration**
   - Wire up agent-runtime service
   - Connect to llm-integration service
   - Implement database persistence

3. **Frontend Integration**
   - Add simulation controls to UI
   - Display real-time agent thoughts
   - Show time progression

## Usage Examples

### Basic Simulation Setup

```typescript
import { SimulationLoop, TimeController, EventScheduler, WorldStateManager } from './simulation';

// Create simulation for a world
const simulation = new SimulationLoop({
  worldId: 'world-123',
  tickRate: 10,        // 10 ticks per second
  timeMultiplier: 60,  // 60x speed (1 second = 1 minute)
  batchSize: 10,       // Process 10 agents per batch
  maxConcurrentAgents: 5
});

// Start the simulation
await simulation.start();

// Control simulation speed
simulation.setSpeed(1);    // Real-time
simulation.setSpeed(60);   // 1 minute per second
simulation.setSpeed(3600); // 1 hour per second

// Pause and resume
simulation.pause();
simulation.resume();

// Skip time
simulation.skipTime(60); // Skip 60 minutes
```

### Event Scheduling

```typescript
const scheduler = new EventScheduler();

// Schedule a one-time event
scheduler.schedule({
  type: EventType.WORLD_EVENT,
  scheduledTime: new Date('2024-01-01T12:00:00'),
  priority: EventPriority.HIGH,
  payload: {
    event: 'market_opens',
    location: 'town_square'
  }
});

// Schedule recurring events
scheduler.scheduleRecurring({
  type: EventType.WORLD_EVENT,
  payload: { event: 'sunrise' },
  time: '06:00',      // Every day at 6 AM
  interval: '24h',    // Repeat every 24 hours
  priority: EventPriority.NORMAL
});

// Process events
const currentTime = new Date();
const readyEvents = scheduler.processEvents(currentTime);
```

### World State Management

```typescript
const stateManager = new WorldStateManager('world-123');

// Update time and weather
stateManager.updateTime(new Date());
stateManager.updateWeather({
  condition: 'rainy',
  temperature: 15,
  humidity: 80
});

// Manage agents
stateManager.setAgent({
  agentId: 'agent-1',
  name: 'Alice',
  currentLocation: { x: 100, y: 200, area: 'coffee_shop' },
  // ... other properties
});

// Get nearby agents
const nearbyAgents = stateManager.getNearbyAgents('agent-1', 50);

// Manage relationships
stateManager.setRelationship('agent-1', 'agent-2', 'friend');

// Start conversations
const conversationId = stateManager.startConversation(
  ['agent-1', 'agent-2'],
  'coffee_shop',
  'discussing the weather'
);
```

## Enhanced Mock API Server

An enhanced version of the mock API server has been created that demonstrates the simulation engine concepts:

```bash
# Run the enhanced mock server
node scripts/development/enhanced-mock-api-server.js
```

### New API Endpoints

- `POST /api/simulation/start` - Start the simulation
- `POST /api/simulation/pause` - Pause the simulation
- `POST /api/simulation/resume` - Resume the simulation
- `POST /api/simulation/stop` - Stop the simulation
- `POST /api/simulation/speed` - Set simulation speed
- `GET /api/simulation/state` - Get current simulation state

### WebSocket Events

- `simulation-state` - Broadcasts simulation state changes
- `world-update` - Sends world and agent updates
- `control` - Accepts simulation control commands

## Next Steps for Full Integration

### 1. Connect to Amazon Bedrock

```typescript
// In agent processing
async processAgent(agent: Agent) {
  // Get LLM service
  const llmService = new BedrockService();
  
  // Generate agent thoughts
  const thought = await llmService.generateAction(
    agent.agentId,
    `${agent.name} is at ${agent.currentLocation.area}`,
    ['move', 'interact', 'communicate', 'observe']
  );
  
  // Update agent state
  agent.currentAction = thought.description;
  agent.lastThought = thought.reasoning;
}
```

### 2. Implement Agent Memory System

```typescript
// Store observations
const observation = `Saw ${otherAgent.name} at the coffee shop`;
await memoryManager.addMemory(agent.agentId, {
  type: 'observation',
  content: observation,
  importance: await llmService.scoreImportance(observation)
});

// Retrieve relevant memories
const memories = await memoryManager.retrieveRelevantMemories(
  agent.agentId,
  currentSituation,
  10 // top 10 memories
);
```

### 3. Add World Dynamics

```typescript
// Random events
if (Math.random() < 0.01) { // 1% chance per tick
  const event = await generateWorldEvent(world, currentTime);
  scheduler.schedule(event);
}

// Weather changes
if (currentTime.getHours() === 12 && Math.random() < 0.3) {
  stateManager.updateWeather({
    condition: 'cloudy',
    temperature: temperature + (Math.random() - 0.5) * 5
  });
}
```

### 4. Frontend Time Controls

```jsx
// React component for simulation controls
function SimulationControls({ worldId }) {
  const [simState, setSimState] = useState(null);
  
  const handleSpeedChange = (speed) => {
    fetch('/api/simulation/speed', {
      method: 'POST',
      body: JSON.stringify({ multiplier: speed })
    });
  };
  
  return (
    <div className="simulation-controls">
      <button onClick={() => fetch('/api/simulation/start', { method: 'POST' })}>
        Start
      </button>
      <button onClick={() => fetch('/api/simulation/pause', { method: 'POST' })}>
        Pause
      </button>
      <select onChange={(e) => handleSpeedChange(e.target.value)}>
        <option value="1">1x (Real-time)</option>
        <option value="60">60x (1 min/sec)</option>
        <option value="3600">3600x (1 hour/sec)</option>
      </select>
      <div>Current Time: {simState?.currentTime}</div>
    </div>
  );
}
```

## Performance Considerations

1. **Batch Processing**: Agents are processed in configurable batches to prevent overwhelming the system
2. **Caching**: LLM responses should be cached to reduce API calls and costs
3. **Tick Rate**: Adjust tick rate based on world complexity (10 ticks/second for small worlds, 1 tick/second for large worlds)
4. **Time Multiplier**: Higher speeds may require reducing processing complexity

## Monitoring and Debugging

The simulation engine provides detailed logging and metrics:

```typescript
// Get simulation statistics
const state = simulation.getState();
console.log({
  isRunning: state.isRunning,
  currentTime: state.currentTime,
  processedTicks: state.processedTicks,
  averageTickDuration: state.averageTickDuration
});

// Get event statistics
const eventStats = scheduler.getStats();
console.log({
  queuedEvents: eventStats.queuedEvents,
  recurringEvents: eventStats.recurringEvents,
  nextEvent: eventStats.nextEvent
});

// Get world statistics
const worldStats = stateManager.getStats();
console.log({
  agentCount: worldStats.agentCount,
  activeConversations: worldStats.activeConversations,
  version: worldStats.version
});
```

## Conclusion

The World Simulation Engine provides a robust foundation for running agent-based simulations with time management. While the core components are implemented, integration with Amazon Bedrock and the frontend UI is needed to create a fully functional system with LLM-powered agents.