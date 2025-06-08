'use client';

import { Agent } from '@/lib/types';
import { AgentAvatar } from '../world-viewer/AgentAvatar';
import { getStatusColor } from '@/lib/utils';

interface AgentListProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onAgentSelect: (agentId: string | null) => void;
  onAgentUpdate: () => void;
}

export function AgentList({ agents, selectedAgentId, onAgentSelect, onAgentUpdate }: AgentListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {agents.map(agent => (
            <div
              key={agent.agentId}
              onClick={() => onAgentSelect(agent.agentId)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedAgentId === agent.agentId
                  ? 'border-primary-300 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <AgentAvatar agent={agent} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {agent.name}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {agent.description}
                  </p>
                  <div className="text-xs text-gray-500 mt-2">
                    <div>Location: ({Math.round(agent.currentLocation.x)}, {Math.round(agent.currentLocation.y)})</div>
                    {agent.currentAction && (
                      <div className="mt-1">Action: {agent.currentAction}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {agents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No agents in this world yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}