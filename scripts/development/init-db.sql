-- Initialize the generative world database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Worlds table
CREATE TABLE IF NOT EXISTS worlds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB DEFAULT '{}',
    state JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    personality JSONB DEFAULT '{}',
    position JSONB DEFAULT '{"x": 0, "y": 0}',
    state JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory streams table
CREATE TABLE IF NOT EXISTS memory_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    importance_score FLOAT DEFAULT 0.0,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    participants JSONB NOT NULL DEFAULT '[]',
    messages JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reflections table
CREATE TABLE IF NOT EXISTS reflections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    trigger_memories JSONB DEFAULT '[]',
    importance_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'active',
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_world_id ON agents(world_id);
CREATE INDEX IF NOT EXISTS idx_memory_streams_agent_id ON memory_streams(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_streams_importance ON memory_streams(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_world_id ON conversations(world_id);
CREATE INDEX IF NOT EXISTS idx_reflections_agent_id ON reflections(agent_id);
CREATE INDEX IF NOT EXISTS idx_plans_agent_id ON plans(agent_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);

-- Insert sample data
INSERT INTO worlds (id, name, description, config) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440000',
    'Smallville',
    'A small town simulation with various characters and locations',
    '{
        "size": {"width": 1000, "height": 1000},
        "locations": [
            {"name": "Town Square", "x": 500, "y": 500, "type": "public"},
            {"name": "Coffee Shop", "x": 300, "y": 400, "type": "business"},
            {"name": "Library", "x": 700, "y": 300, "type": "public"},
            {"name": "Park", "x": 200, "y": 600, "type": "recreation"}
        ],
        "time_speed": 1.0
    }'
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    'University Campus',
    'A university campus with students, professors, and various academic buildings',
    '{
        "size": {"width": 1500, "height": 1200},
        "locations": [
            {"name": "Main Hall", "x": 750, "y": 600, "type": "academic"},
            {"name": "Student Center", "x": 400, "y": 500, "type": "social"},
            {"name": "Library", "x": 1000, "y": 400, "type": "academic"},
            {"name": "Dormitory", "x": 300, "y": 800, "type": "residential"}
        ],
        "time_speed": 1.0
    }'
);

INSERT INTO agents (id, world_id, name, description, personality, position) VALUES
(
    '660e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    'Alice Johnson',
    'A friendly barista who works at the coffee shop and loves meeting new people',
    '{
        "traits": ["friendly", "curious", "helpful"],
        "interests": ["coffee", "books", "community events"],
        "occupation": "barista",
        "age": 28
    }',
    '{"x": 300, "y": 400}'
),
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'Bob Smith',
    'A retired librarian who spends his days reading and helping visitors',
    '{
        "traits": ["wise", "patient", "knowledgeable"],
        "interests": ["history", "literature", "gardening"],
        "occupation": "retired librarian",
        "age": 65
    }',
    '{"x": 700, "y": 300}'
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'Dr. Sarah Chen',
    'A computer science professor who is passionate about AI and machine learning',
    '{
        "traits": ["intelligent", "passionate", "innovative"],
        "interests": ["artificial intelligence", "research", "teaching"],
        "occupation": "professor",
        "age": 42
    }',
    '{"x": 750, "y": 600}'
);

-- Insert sample memory streams
INSERT INTO memory_streams (agent_id, content, importance_score) VALUES
(
    '660e8400-e29b-41d4-a716-446655440000',
    'I made an excellent cappuccino this morning that a customer really enjoyed',
    6.5
),
(
    '660e8400-e29b-41d4-a716-446655440000',
    'The coffee shop was unusually busy today, lots of new faces',
    5.0
),
(
    '660e8400-e29b-41d4-a716-446655440001',
    'A young student asked me about local history books today',
    4.5
),
(
    '660e8400-e29b-41d4-a716-446655440001',
    'I organized the fiction section and found some interesting old books',
    3.0
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    'My AI ethics lecture went really well, students were very engaged',
    7.0
);

-- Insert sample plans
INSERT INTO plans (agent_id, goal, steps, priority) VALUES
(
    '660e8400-e29b-41d4-a716-446655440000',
    'Prepare for the morning coffee rush',
    '[
        {"action": "Check coffee bean inventory", "status": "completed"},
        {"action": "Clean espresso machine", "status": "in_progress"},
        {"action": "Set up pastry display", "status": "pending"}
    ]',
    1
),
(
    '660e8400-e29b-41d4-a716-446655440001',
    'Help visitors find books they need',
    '[
        {"action": "Organize returned books", "status": "completed"},
        {"action": "Update catalog system", "status": "in_progress"},
        {"action": "Assist patrons with research", "status": "ongoing"}
    ]',
    2
);

-- Update timestamps
UPDATE worlds SET updated_at = NOW();
UPDATE agents SET updated_at = NOW();