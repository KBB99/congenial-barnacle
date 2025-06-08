#!/bin/bash

# Generative World Database Seeding Script

set -e

echo "🌱 Seeding Generative World Database..."

# Check if PostgreSQL is running
if ! docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start the development environment first."
    exit 1
fi

# Navigate to the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📊 Current database status:"
docker-compose exec -T postgres psql -U postgres -d generative_world -c "SELECT COUNT(*) as world_count FROM worlds;"
docker-compose exec -T postgres psql -U postgres -d generative_world -c "SELECT COUNT(*) as agent_count FROM agents;"

echo ""
echo "🔄 Adding additional sample data..."

# Add more sample worlds
docker-compose exec -T postgres psql -U postgres -d generative_world << 'EOF'
-- Insert additional sample worlds
INSERT INTO worlds (id, name, description, config) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440002',
    'Corporate Office',
    'A modern office building with employees, meetings, and corporate culture',
    '{
        "size": {"width": 800, "height": 600},
        "locations": [
            {"name": "Reception", "x": 400, "y": 100, "type": "entrance"},
            {"name": "Conference Room A", "x": 200, "y": 300, "type": "meeting"},
            {"name": "Open Office", "x": 600, "y": 300, "type": "workspace"},
            {"name": "Break Room", "x": 400, "y": 500, "type": "social"}
        ],
        "time_speed": 1.0
    }'
) ON CONFLICT (id) DO NOTHING;

-- Insert additional agents
INSERT INTO agents (id, world_id, name, description, personality, position) VALUES
(
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440000',
    'Emma Wilson',
    'A local artist who frequents the coffee shop and enjoys people-watching',
    '{
        "traits": ["creative", "observant", "introverted"],
        "interests": ["painting", "photography", "nature"],
        "occupation": "artist",
        "age": 31
    }',
    '{"x": 320, "y": 420}'
),
(
    '660e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440001',
    'Mike Rodriguez',
    'An enthusiastic computer science student working on his thesis',
    '{
        "traits": ["ambitious", "curious", "hardworking"],
        "interests": ["programming", "gaming", "robotics"],
        "occupation": "student",
        "age": 22
    }',
    '{"x": 400, "y": 500}'
),
(
    '660e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440002',
    'Jennifer Park',
    'A project manager who keeps the office running smoothly',
    '{
        "traits": ["organized", "diplomatic", "efficient"],
        "interests": ["productivity", "team building", "yoga"],
        "occupation": "project manager",
        "age": 35
    }',
    '{"x": 600, "y": 300}'
);

-- Insert more memory streams
INSERT INTO memory_streams (agent_id, content, importance_score) VALUES
(
    '660e8400-e29b-41d4-a716-446655440003',
    'I sketched the coffee shop scene today, captured some interesting interactions',
    7.5
),
(
    '660e8400-e29b-41d4-a716-446655440003',
    'The lighting in the park was perfect for photography this afternoon',
    6.0
),
(
    '660e8400-e29b-41d4-a716-446655440004',
    'Professor Chen gave excellent feedback on my machine learning project',
    8.0
),
(
    '660e8400-e29b-41d4-a716-446655440004',
    'Spent 4 hours debugging my neural network implementation',
    5.5
),
(
    '660e8400-e29b-41d4-a716-446655440005',
    'Successfully coordinated the quarterly team meeting',
    6.5
);

-- Insert sample conversations
INSERT INTO conversations (world_id, participants, messages) VALUES
(
    '550e8400-e29b-41d4-a716-446655440000',
    '["660e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440003"]',
    '[
        {
            "speaker": "660e8400-e29b-41d4-a716-446655440000",
            "content": "Good morning! The usual cappuccino?",
            "timestamp": "2024-01-15T09:00:00Z"
        },
        {
            "speaker": "660e8400-e29b-41d4-a716-446655440003",
            "content": "Yes please, and maybe a croissant. I love the morning light in here.",
            "timestamp": "2024-01-15T09:01:00Z"
        }
    ]'
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    '["660e8400-e29b-41d4-a716-446655440002", "660e8400-e29b-41d4-a716-446655440004"]',
    '[
        {
            "speaker": "660e8400-e29b-41d4-a716-446655440004",
            "content": "Professor, I have a question about the neural network architecture.",
            "timestamp": "2024-01-15T14:00:00Z"
        },
        {
            "speaker": "660e8400-e29b-41d4-a716-446655440002",
            "content": "Of course! What specific aspect are you working on?",
            "timestamp": "2024-01-15T14:01:00Z"
        }
    ]'
);

-- Insert more plans
INSERT INTO plans (agent_id, goal, steps, priority) VALUES
(
    '660e8400-e29b-41d4-a716-446655440003',
    'Complete the town square painting series',
    '[
        {"action": "Observe morning light patterns", "status": "completed"},
        {"action": "Sketch composition layouts", "status": "in_progress"},
        {"action": "Mix color palette", "status": "pending"},
        {"action": "Begin painting", "status": "pending"}
    ]',
    1
),
(
    '660e8400-e29b-41d4-a716-446655440004',
    'Finish thesis project on reinforcement learning',
    '[
        {"action": "Complete literature review", "status": "completed"},
        {"action": "Implement RL algorithm", "status": "in_progress"},
        {"action": "Run experiments", "status": "pending"},
        {"action": "Write thesis chapters", "status": "pending"}
    ]',
    1
);

-- Update timestamps
UPDATE worlds SET updated_at = NOW();
UPDATE agents SET updated_at = NOW();
EOF

echo ""
echo "✅ Additional sample data added successfully!"

echo ""
echo "📊 Updated database status:"
docker-compose exec -T postgres psql -U postgres -d generative_world -c "SELECT COUNT(*) as world_count FROM worlds;"
docker-compose exec -T postgres psql -U postgres -d generative_world -c "SELECT COUNT(*) as agent_count FROM agents;"
docker-compose exec -T postgres psql -U postgres -d generative_world -c "SELECT COUNT(*) as memory_count FROM memory_streams;"
docker-compose exec -T postgres psql -U postgres -d generative_world -c "SELECT COUNT(*) as conversation_count FROM conversations;"

echo ""
echo "🌍 Sample worlds available:"
docker-compose exec -T postgres psql -U postgres -d generative_world -c "SELECT name, description FROM worlds;"

echo ""
echo "🤖 Sample agents available:"
docker-compose exec -T postgres psql -U postgres -d generative_world -c "SELECT a.name, w.name as world, a.description FROM agents a JOIN worlds w ON a.world_id = w.id;"

echo ""
echo "🌱 Database seeding complete!"