# Generative World Frontend

A comprehensive React/Next.js frontend application that provides users with complete god-mode control over their generative agent worlds with real-time visualization and interaction capabilities.

## Features

### 🎮 God-Mode Controls
- **Complete World Control**: Pause, resume, and manipulate simulation time
- **Agent Management**: Create, edit, delete, and inspect agents in real-time
- **Memory Editing**: Direct access to agent memories, plans, and reflections
- **Environment Modification**: Edit world settings, objects, and physics
- **Time Manipulation**: Control simulation speed and create checkpoints

### 🌍 Real-Time World Visualization
- **Interactive 2D Canvas**: Smooth pan, zoom, and navigation
- **Live Agent Tracking**: Real-time agent movement and action display
- **WebSocket Integration**: Instant updates from backend services
- **Visual Feedback**: Agent status, relationships, and current actions

### 🤖 Agent Inspector
- **Memory Stream Browser**: View and edit agent memories with filtering
- **Relationship Visualization**: Interactive agent relationship graphs
- **Personality Editor**: Modify agent traits, goals, and behaviors
- **Conversation History**: Track agent interactions and dialogues

### 💬 Natural Language Interface
- **Direct Agent Communication**: Chat with individual agents
- **World Commands**: Issue commands to the entire world
- **Query System**: Ask agents about their thoughts and motivations
- **Event Injection**: Inject narrative events through natural language

### ⚙️ World Management
- **Dashboard**: Overview of all worlds with statistics
- **Templates**: Pre-configured world setups (Small Town, Office, University)
- **Import/Export**: Save and load world configurations
- **Snapshots**: Create and restore world state checkpoints

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Query + Zustand
- **Real-time**: WebSocket integration
- **Visualization**: HTML5 Canvas with custom rendering
- **Forms**: React Hook Form with validation
- **Animation**: Framer Motion
- **Icons**: Lucide React

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Dashboard page
│   │   ├── world/[id]/        # World viewer page
│   │   ├── layout.tsx         # Root layout
│   │   ├── providers.tsx      # Context providers
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard components
│   │   │   ├── WorldCard.tsx
│   │   │   └── CreateWorldModal.tsx
│   │   ├── world-viewer/      # World visualization
│   │   │   ├── WorldViewer.tsx
│   │   │   └── ViewportControls.tsx
│   │   ├── agent-inspector/   # Agent management
│   │   │   └── AgentInspector.tsx
│   │   ├── world-editor/      # World editing tools
│   │   │   └── WorldEditor.tsx
│   │   ├── time-controls/     # Time manipulation
│   │   │   └── TimeControls.tsx
│   │   ├── chat/              # Chat interface
│   │   │   └── ChatInterface.tsx
│   │   └── ui/                # Shared UI components
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorMessage.tsx
│   │       └── ErrorBoundary.tsx
│   ├── hooks/                 # Custom React hooks
│   │   └── useWebSocket.tsx   # WebSocket management
│   ├── lib/                   # Utilities and API
│   │   ├── api.ts             # API client
│   │   ├── types.ts           # TypeScript types
│   │   └── utils.ts           # Utility functions
│   └── styles/                # Additional styles
├── public/                    # Static assets
├── package.json              # Dependencies
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
├── Dockerfile                # Docker configuration
└── README.md                 # This file
```

## Key Components

### WorldViewer
The main visualization component that renders the 2D world using HTML5 Canvas:
- Real-time agent rendering with smooth animations
- Interactive viewport controls (pan, zoom, fit-to-screen)
- Agent selection and inspection
- Grid overlay and world boundaries
- Connection status indicator

### AgentInspector
Comprehensive agent management interface:
- Agent list with status indicators
- Detailed agent information display
- Memory stream browser with search and filtering
- Real-time memory updates via WebSocket

### TimeControls
Simulation time manipulation:
- Play/pause simulation
- Speed control (0.25× to 10×)
- Current simulation time display
- Real-time status indicators

### ChatInterface
Natural language interaction system:
- Direct agent communication
- Message history with timestamps
- Agent selection for targeted conversations
- Real-time conversation updates

### WorldEditor
God-mode editing capabilities:
- World settings modification
- Agent creation and deletion
- Physics and environment controls
- Real-time setting updates

## API Integration

The frontend communicates with backend services through:

### REST API
- World management (CRUD operations)
- Agent management and configuration
- Memory stream access and modification
- Snapshot creation and restoration

### WebSocket API
- Real-time agent position updates
- Live memory stream updates
- Conversation broadcasting
- World state synchronization

## Real-Time Features

### WebSocket Integration
- Automatic reconnection with exponential backoff
- Message type routing and subscription system
- Connection state management
- Error handling and recovery

### Live Updates
- Agent movement tracking
- Memory stream updates
- Conversation display
- World state synchronization

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Docker Build
```bash
docker build -t generative-world-frontend .
docker run -p 3000:3000 generative-world-frontend
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## Features in Detail

### God-Mode Controls
- **Time Manipulation**: Complete control over simulation time flow
- **Agent Spawning**: Create agents with custom personalities and goals
- **Memory Editing**: Direct access to agent cognitive processes
- **Environment Control**: Modify world physics and settings
- **Event Injection**: Insert custom events into the simulation

### Real-Time Visualization
- **Canvas Rendering**: High-performance 2D visualization
- **Smooth Animations**: Interpolated agent movement
- **Interactive Controls**: Pan, zoom, and selection
- **Status Indicators**: Visual feedback for all system states

### User Experience
- **Responsive Design**: Works on desktop and tablet devices
- **Keyboard Shortcuts**: Power user functionality
- **Context Menus**: Right-click interactions
- **Tooltips**: Helpful information throughout the interface
- **Loading States**: Clear feedback during operations

## Performance Optimizations

- **React Query**: Intelligent caching and background updates
- **Canvas Optimization**: Efficient rendering with viewport culling
- **WebSocket Management**: Connection pooling and message batching
- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Next.js automatic image optimization

## Accessibility

- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Color Contrast**: WCAG compliant color schemes
- **Focus Management**: Clear focus indicators

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow TypeScript strict mode
2. Use Tailwind CSS for styling
3. Implement proper error boundaries
4. Add loading states for all async operations
5. Include accessibility features
6. Write comprehensive tests

## License

This project is part of the Generative World system architecture.