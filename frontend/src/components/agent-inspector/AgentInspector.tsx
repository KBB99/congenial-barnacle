'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Agent } from '@/lib/types';
import { agentApi, memoryApi } from '@/lib/api';
import { AgentList } from './AgentList';
import { AgentDetails } from './AgentDetails';
import { MemoryBrowser } from './MemoryBrowser';
import { Users, Brain, MessageCircle } from 'lucide-react';

interface AgentInspectorProps {
  worldId: string;
  agents: Agent[];
  selectedAgentId: string | null;
  onAgentSelect: (agentId: string | null) => void;
  onAgentUpdate: () => void;
}

type InspectorTab = 'agents' | 'details' | 'memories';

export function AgentInspector({
  worldId,
  agents,
  selectedAgentId,
  onAgentSelect,
  onAgentUpdate,
}: AgentInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('agents');

  const selectedAgent = agents.find(agent => agent.agentId === selectedAgentId);

  // Fetch memories for selected agent
  const { data: memories, isLoading: memoriesLoading } = useQuery({
    queryKey: ['memories', worldId, selectedAgentId],
    queryFn: () => selectedAgentId ? memoryApi.getMemories(worldId, selectedAgentId) : null,
    enabled: !!selectedAgentId,
  });

  const tabs = [
    {
      id: 'agents' as const,
      name: 'Agents',
      icon: Users,
      count: agents.length,
    },
    {
      id: 'details' as const,
      name: 'Details',
      icon: Brain,
      disabled: !selectedAgent,
    },
    {
      id: 'memories' as const,
      name: 'Memories',
      icon: MessageCircle,
      count: memories?.items.length,
      disabled: !selectedAgent,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="text-lg font-medium text-gray-900">Agent Inspector</h2>
        {selectedAgent && (
          <p className="text-sm text-gray-600 mt-1">
            Inspecting: {selectedAgent.name}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <nav className="flex space-x-8 px-4" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : isDisabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.count !== undefined && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isActive
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'agents' && (
          <AgentList
            agents={agents}
            selectedAgentId={selectedAgentId}
            onAgentSelect={onAgentSelect}
            onAgentUpdate={onAgentUpdate}
          />
        )}

        {activeTab === 'details' && selectedAgent && (
          <AgentDetails
            agent={selectedAgent}
            worldId={worldId}
            onAgentUpdate={onAgentUpdate}
          />
        )}

        {activeTab === 'memories' && selectedAgent && (
          <MemoryBrowser
            agent={selectedAgent}
            worldId={worldId}
            memories={memories}
            isLoading={memoriesLoading}
          />
        )}
      </div>
    </div>
  );
}