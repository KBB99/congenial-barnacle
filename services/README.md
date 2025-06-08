# Generative World System - Phase 2: Core Agent Architecture

This directory contains the Phase 2 implementation of the Generative World System, focusing on the core agent intelligence capabilities based on the Stanford Generative Agents research.

## Overview

Phase 2 implements the three core backend services that power the intelligent agent behavior:

- **Agent Runtime Service** - Core agent intelligence and behavior processing
- **LLM Integration Service** - Amazon Bedrock integration and prompt management  
- **World Management Service** - World lifecycle and coordination

## Architecture

The system implements the Stanford Generative Agents research with the following key components:

### Memory System
- **Memory Stream**: Stores observations, reflections, and plans as timestamped records
- **Retrieval Algorithm**: Combines relevance (embedding similarity), recency (exponential decay), and importance (1-10 scale) scoring
- **Embedding Generation**: Uses Amazon Titan for semantic similarity matching
- **Access Tracking**: Updates last accessed time for retrieved memories

### Reflection Engine
- **Trigger Conditions**: Activates when importance sum exceeds 150 (Stanford threshold)
- **Question Generation**: Creates salient questions about recent experiences
- **Insight Synthesis**: Generates meaningful reflections with evidence citations
- **Memory Integration**: Stores reflections as new memory objects with relationships

### Planning System
- **Hierarchical Planning**: Daily plans → Hourly plans → Minute actions
- **Goal-Driven Behavior**: Aligns actions with agent goals and personality
- **Reactive Replanning**: Dynamically adjusts plans based on observations
- **Context Awareness**: Considers world state and agent relationships

### Dialogue System
- **Inter-Agent Communication**: Natural language conversations between agents
- **Relationship Tracking**: Updates agent relationships based on interactions
- **Emotion and Intent**: Tracks emotional state and conversation intent
- **Memory Integration**: Stores conversations as shared memories

## Services

### Agent Runtime Service (Port 3001)

Core agent intelligence service implementing the Stanford research algorithms.

**Key Features:**
- Memory stream management with retrieval scoring
- Reflection generation with importance thresholds
- Hierarchical planning (daily/hourly/minute)
- Inter-agent dialogue processing
- Action generation and execution

**API Endpoints:**
- `POST /agents` - Create new agent
- `GET /agents/:id/memories` - Retrieve agent memories
- `POST /agents/:id/reflect` - Trigger reflection generation
- `POST /agents/:id/plan` - Generate plans
- `POST /agents/:id/process` - Process agent step

### LLM Integration Service (Port 3002)

Amazon Bedrock integration with intelligent caching and prompt management.

**Key Features:**
- Embedding generation using Titan
- Memory scoring and retrieval
- Reflection and planning prompts
- Response caching for cost optimization
- Batch processing for efficiency

**API Endpoints:**
- `POST /embeddings` - Generate text embeddings
- `POST /memory/score` - Score memory relevance
- `POST /reflection/generate` - Generate reflections
- `POST /planning/generate` - Generate plans
- `POST /batch/process` - Batch LLM requests

### World Management Service (Port 3000)

World lifecycle management and agent coordination.

**Key Features:**
- World creation and state management
- Agent spawning and lifecycle
- Time progression and simulation control
- Event processing and broadcasting
- Snapshot creation and restoration

**API Endpoints:**
- `POST /worlds` - Create new world
- `POST /worlds/:id/start` - Start world simulation
- `POST /worlds/:id/agents` - Spawn agent
- `POST /worlds/:id/process` - Process world step
- `POST /worlds/:id/snapshots` - Create snapshot

## Data Models

### Memory Stream
```typescript
interface MemoryStream {
  memoryId: string;
  agentId: string;
  worldId: string;
  type: 'observation' | 'reflection' | 'plan';
  content: string;
  timestamp: string;
  importance: number; // 1-10 scale
  lastAccessed: string;
  relatedMemories: string[];
  embedding?: number[];
  tags: string[];
}
```

### Agent
```typescript
interface Agent {
  agentId: string;
  worldId: string;
  name: string;
  description: string;
  currentLocation: { x: number; y: number; area: string };
  currentAction: string;
  relationships: Record<string, string>;
  goals: string[];
  traits: string[];
  currentPlan: {
    dailyPlan: string[];
    hourlyPlan: string[];
    currentStep: string;
  };
  status: 'active' | 'inactive' | 'deleted';
}
```

## Stanford Research Implementation

This implementation follows the exact algorithms described in the Stanford Generative Agents paper:

### Memory Retrieval Scoring
```
score = α * relevance + β * recency + γ * importance

Where:
- relevance = cosine_similarity(query_embedding, memory_embedding)
- recency = exponential_decay(hours_since_access, decay_rate=0.693/24)
- importance = llm_scored_importance (1-10 scale)
- α = β = γ = 1.0 (equal weighting)
```

### Reflection Trigger
- Monitors sum of importance scores for recent memories
- Triggers reflection when sum exceeds 150
- Generates 3-5 salient questions about experiences
- Synthesizes insights with evidence citations

### Planning Hierarchy
- **Daily Plans**: 5-8 high-level activities aligned with goals
- **Hourly Plans**: Detailed actions for each hour
- **Minute Plans**: Specific immediate actions
- **Reactive Planning**: Replans based on unexpected observations

## Development Setup

### Prerequisites
- Node.js 18+
- TypeScript 5+
- AWS CLI configured
- Docker (optional)

### Installation

1. **Install dependencies for all services:**
```bash
# Install shared dependencies
cd services/shared && npm install

# Install service dependencies
cd ../agent-runtime && npm install
cd ../llm-integration && npm install
cd ../world-management && npm install
```

2. **Build services:**
```bash
# Build shared library
cd services/shared && npm run build

# Build all services
cd ../agent-runtime && npm run build
cd ../llm-integration && npm run build
cd ../world-management && npm run build
```

3. **Set environment variables:**
```bash
export AWS_REGION=us-east-1
export PROJECT_NAME=generative-world
export ENVIRONMENT=dev
export LLM_SERVICE_URL=http://localhost:3002
export AGENT_RUNTIME_URL=http://localhost:3001
export WORLD_MANAGEMENT_URL=http://localhost:3000
```

### Running Services

**Development mode (with hot reload):**
```bash
# Terminal 1 - LLM Integration Service
cd services/llm-integration && npm run dev

# Terminal 2 - Agent Runtime Service  
cd services/agent-runtime && npm run dev

# Terminal 3 - World Management Service
cd services/world-management && npm run dev
```

**Production mode:**
```bash
cd services/llm-integration && npm start &
cd services/agent-runtime && npm start &
cd services/world-management && npm start &
```

### Docker Deployment

**Build images:**
```bash
cd services/llm-integration && docker build -t generative-world/llm-integration .
cd services/agent-runtime && docker build -t generative-world/agent-runtime .
cd services/world-management && docker build -t generative-world/world-management .
```

**Run with Docker Compose:**
```bash
docker-compose up -d
```

## Testing

### Unit Tests
```bash
# Run tests for all services
cd services/shared && npm test
cd services/agent-runtime && npm test
cd services/llm-integration && npm test
cd services/world-management && npm test
```

### Integration Testing

**Create a test world:**
```bash
curl -X POST http://localhost:3000/worlds \
  -H "Content-Type: application/json" \
  -d '{"world": {"name": "Test World", "description": "A test environment"}}'
```

**Spawn a test agent:**
```bash
curl -X POST http://localhost:3000/worlds/{worldId}/agents \
  -H "Content-Type: application/json" \
  -d '{"agent": {"name": "Alice", "description": "A curious test agent"}}'
```

**Process agent step:**
```bash
curl -X POST http://localhost:3000/worlds/{worldId}/process
```

## Performance Considerations

### Memory Optimization
- Memory retrieval limited to top 20 relevant memories
- Embedding caching reduces redundant API calls
- Batch processing for multiple agent operations
- Lazy loading of agent data

### Cost Optimization
- LLM response caching with semantic similarity matching
- Importance filtering for LLM usage
- Batch processing to reduce API overhead
- Model selection based on task complexity

### Scalability
- Stateless service design for horizontal scaling
- Agent partitioning across service instances
- Database connection pooling
- Asynchronous processing pipelines

## Monitoring

### Health Checks
- `/health` endpoint on all services
- Database connectivity checks
- LLM service availability
- Memory usage monitoring

### Metrics
- Agent processing times
- Memory retrieval performance
- LLM API usage and costs
- Reflection generation frequency
- Planning success rates

### Logging
- Structured JSON logging
- Request/response tracing
- Error tracking with context
- Performance metrics

## Troubleshooting

### Common Issues

**Memory retrieval slow:**
- Check embedding generation performance
- Verify DynamoDB indexes
- Monitor memory cache hit rates

**Reflection not triggering:**
- Verify importance scoring
- Check memory accumulation
- Review trigger thresholds

**Planning failures:**
- Check LLM service connectivity
- Verify prompt formatting
- Review agent context data

**Agent processing errors:**
- Check service dependencies
- Verify database connectivity
- Review error logs

### Debug Mode
```bash
export NODE_ENV=development
export DEBUG=generative-world:*
```

## Contributing

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Comprehensive error handling

### Testing Requirements
- Unit tests for core algorithms
- Integration tests for service interactions
- Performance benchmarks
- Error scenario coverage

### Documentation
- API documentation with examples
- Algorithm implementation notes
- Performance optimization guides
- Deployment instructions

## License

MIT License - see LICENSE file for details.

## References

- [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442)
- [Stanford Generative Agents GitHub](https://github.com/joonspk-research/generative_agents)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)