# Generative World - Integration & Testing Guide

This guide covers Phase 4 of the Generative World system: Integration & Testing. This phase connects all components and creates a working end-to-end system with comprehensive testing.

## 🏗️ Architecture Overview

The integrated system consists of:

- **Frontend**: Next.js application with real-time WebSocket connections
- **Backend Services**: Three microservices (Agent Runtime, World Management, LLM Integration)
- **Database**: PostgreSQL with Redis cache
- **API Gateway**: Nginx load balancer
- **Real-time Communication**: WebSocket connections for live updates

## 🚀 Quick Start

### Local Development

1. **Start the development environment:**
   ```bash
   ./scripts/development/start-dev.sh
   ```

2. **Seed the database with sample data:**
   ```bash
   ./scripts/development/seed-data.sh
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:8080
   - Individual services: 3001, 3002, 3003

### Testing

1. **Run integration tests:**
   ```bash
   ./scripts/testing/integration-tests.sh
   ```

2. **Run E2E tests:**
   ```bash
   ./scripts/testing/e2e-tests.sh
   ```

## 📁 Directory Structure

```
scripts/
├── development/           # Local development setup
│   ├── docker-compose.yml    # Multi-service Docker setup
│   ├── nginx.conf            # API Gateway configuration
│   ├── init-db.sql           # Database initialization
│   ├── start-dev.sh          # Development startup script
│   └── seed-data.sh          # Database seeding script
├── deploy/               # Production deployment
│   ├── build-images.sh       # Container image building
│   ├── deploy-services.sh    # Service deployment
│   └── setup-environment.sh  # Environment setup
└── testing/              # Testing scripts
    ├── integration-tests.sh  # Integration test runner
    └── e2e-tests.sh          # E2E test runner

tests/
├── integration/          # API and service integration tests
│   ├── api-tests.ts          # REST API testing
│   ├── websocket-tests.ts    # WebSocket testing
│   └── workflow-tests.ts     # End-to-end workflows
└── e2e/                 # Browser-based E2E tests
    ├── world-creation.test.ts    # World management UI
    ├── agent-management.test.ts  # Agent interaction UI
    └── real-time-updates.test.ts # Real-time sync testing
```

## 🔧 Development Environment

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- npm or yarn

### Services

The development environment includes:

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js application |
| API Gateway | 8080 | Nginx load balancer |
| LLM Integration | 3001 | Bedrock/LLM service |
| World Management | 3002 | World and location service |
| Agent Runtime | 3003 | Agent behavior and WebSocket |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache and session store |

### Environment Variables

Create a `.env` file in the project root:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/generative_world
REDIS_URL=redis://localhost:6379

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

## 🧪 Testing Strategy

### Integration Tests

Located in `tests/integration/`, these tests verify:

- **API Connectivity**: REST endpoint functionality
- **WebSocket Communication**: Real-time message handling
- **Service Integration**: Cross-service communication
- **Database Operations**: Data persistence and retrieval
- **Error Handling**: Graceful failure scenarios

**Run integration tests:**
```bash
./scripts/testing/integration-tests.sh
```

### E2E Tests

Located in `tests/e2e/`, these tests verify:

- **World Creation Workflow**: Complete world setup process
- **Agent Management**: Spawning, interaction, and deletion
- **Real-time Updates**: Multi-client synchronization
- **UI Interactions**: Frontend component behavior

**Run E2E tests:**
```bash
# All E2E tests
./scripts/testing/e2e-tests.sh

# Specific test suites
./scripts/testing/e2e-tests.sh world-creation
./scripts/testing/e2e-tests.sh agent-management
./scripts/testing/e2e-tests.sh real-time

# With visible browser (for debugging)
HEADLESS=false ./scripts/testing/e2e-tests.sh
```

## 🔄 Key Integration Points

### Frontend-Backend Communication

- **REST APIs**: CRUD operations for worlds, agents, and data
- **WebSocket**: Real-time updates for agent positions, chat, and world state
- **Error Handling**: Graceful degradation and retry logic

### Service-to-Service Communication

- **Agent Runtime ↔ World Management**: Agent positioning and world state
- **Agent Runtime ↔ LLM Integration**: AI responses and behavior generation
- **World Management ↔ LLM Integration**: World description and context

### Database Integration

- **PostgreSQL**: Primary data storage with ACID compliance
- **Redis**: Caching layer for session management and real-time data
- **Connection Pooling**: Efficient database connection management

## 🌐 Real-time Features

### WebSocket Message Types

```typescript
// Client → Server
{
  type: 'subscribe',
  channel: 'world-updates' | 'agent-updates' | 'memory-updates',
  worldId?: string,
  agentId?: string
}

// Server → Client
{
  type: 'world-update',
  worldId: string,
  agents: Agent[],
  timestamp: number
}

{
  type: 'agent-update',
  agentId: string,
  position: { x: number, y: number },
  state: AgentState,
  timestamp: number
}
```

### Synchronization Features

- **Agent Positions**: Real-time movement updates
- **Chat Messages**: Live conversation synchronization
- **Memory Formation**: Dynamic memory creation and sharing
- **Time Controls**: Synchronized simulation speed and pause/resume
- **World State**: Live world configuration changes

## 🚀 Production Deployment

### Prerequisites

- AWS CLI configured
- Terraform installed
- Docker installed

### Deployment Steps

1. **Setup environment:**
   ```bash
   ./scripts/deploy/setup-environment.sh dev
   ```

2. **Build container images:**
   ```bash
   ./scripts/deploy/build-images.sh
   ```

3. **Deploy services:**
   ```bash
   ./scripts/deploy/deploy-services.sh
   ```

### Environment Configuration

The deployment supports multiple environments:

- **dev**: Development environment with minimal resources
- **staging**: Pre-production environment for testing
- **prod**: Production environment with high availability

## 📊 Monitoring and Health Checks

### Health Endpoints

- **API Gateway**: `GET /health`
- **World Management**: `GET /api/worlds/health`
- **Agent Runtime**: `GET /api/agents/health`
- **LLM Integration**: `GET /api/llm/health`

### Monitoring

- **Application Logs**: Centralized logging via CloudWatch
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Automated error detection and alerting
- **Resource Usage**: CPU, memory, and database performance

## 🔧 Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check Docker status
docker-compose ps

# View service logs
docker-compose logs -f <service-name>

# Restart specific service
docker-compose restart <service-name>
```

**Database connection issues:**
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready -U postgres

# Reset database
docker-compose down -v
./scripts/development/start-dev.sh
```

**WebSocket connection failures:**
```bash
# Check nginx configuration
docker-compose exec nginx nginx -t

# Restart API gateway
docker-compose restart nginx
```

### Test Failures

**Integration test failures:**
```bash
# Run with verbose output
npm test -- --verbose --testPathPattern="integration/"

# Check service availability
curl -f http://localhost:8080/health
```

**E2E test failures:**
```bash
# Run with visible browser for debugging
HEADLESS=false ./scripts/testing/e2e-tests.sh

# Check frontend accessibility
curl -f http://localhost:3000
```

## 🎯 Testing Scenarios

### Complete Workflows

1. **World Creation to Agent Interaction:**
   - Create world through frontend
   - Spawn agents via UI
   - Send messages and observe responses
   - Verify memory formation and planning

2. **Multi-user Real-time Sync:**
   - Open multiple browser sessions
   - Perform actions in one session
   - Verify updates appear in other sessions

3. **Time Control Integration:**
   - Pause/resume simulation
   - Change time speed
   - Verify agent behavior adapts

4. **Error Recovery:**
   - Simulate network interruptions
   - Test service failures
   - Verify graceful degradation

## 📈 Performance Considerations

### Optimization Areas

- **Database Indexing**: Optimized queries for agent and world data
- **Caching Strategy**: Redis for frequently accessed data
- **WebSocket Scaling**: Connection pooling and message batching
- **Image Optimization**: Efficient container builds and caching

### Load Testing

```bash
# API load testing
npm run test:load

# WebSocket connection testing
npm run test:websocket-load

# Database performance testing
npm run test:db-performance
```

## 🔐 Security Considerations

### Authentication & Authorization

- **API Security**: Request validation and rate limiting
- **WebSocket Security**: Connection authentication
- **Database Security**: Encrypted connections and access controls

### Data Protection

- **Input Validation**: Sanitization of user inputs
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy headers

## 📚 Additional Resources

- [Architecture Documentation](./generative-world-architecture.md)
- [API Documentation](./services/README.md)
- [Frontend Documentation](./frontend/README.md)
- [Infrastructure Documentation](./infrastructure/README.md)

## 🤝 Contributing

When adding new features or tests:

1. **Add Integration Tests**: Verify API functionality
2. **Add E2E Tests**: Test user workflows
3. **Update Documentation**: Keep guides current
4. **Test Locally**: Verify full integration before deployment

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review service logs for error details
3. Verify all prerequisites are met
4. Test with a clean environment setup

---

**🌍 Your Generative World is ready for integration and testing!**