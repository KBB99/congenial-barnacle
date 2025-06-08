'use client';

import { useState } from 'react';
import { Plus, Settings, Users, MapPin, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { World, Agent } from '@/lib/types';
import { worldApi, agentApi } from '@/lib/api';

interface WorldEditorProps {
  world: World;
  agents: Agent[];
  onWorldUpdate: () => void;
  onAgentUpdate: () => void;
}

type EditorTab = 'settings' | 'agents' | 'objects';

export function WorldEditor({
  world,
  agents,
  onWorldUpdate,
  onAgentUpdate,
}: WorldEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('settings');
  const [showAddAgent, setShowAddAgent] = useState(false);

  const updateWorldMutation = useMutation({
    mutationFn: (updates: Partial<World>) => worldApi.updateWorld(world.worldId, updates),
    onSuccess: onWorldUpdate,
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => agentApi.deleteAgent(world.worldId, agentId),
    onSuccess: onAgentUpdate,
  });

  const tabs = [
    { id: 'settings' as const, name: 'World Settings', icon: Settings },
    { id: 'agents' as const, name: 'Agents', icon: Users, count: agents.length },
    { id: 'objects' as const, name: 'Objects', icon: MapPin },
  ];

  const handleDeleteAgent = (agentId: string) => {
    const agent = agents.find(a => a.agentId === agentId);
    if (agent && window.confirm(`Delete agent "${agent.name}"?`)) {
      deleteAgentMutation.mutate(agentId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="text-lg font-medium text-gray-900">World Editor</h2>
        <p className="text-sm text-gray-600 mt-1">
          Modify your world settings and manage agents
        </p>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <nav className="flex space-x-8 px-4" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
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
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">World Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">World Name</label>
                  <input
                    type="text"
                    value={world.name}
                    onChange={(e) => updateWorldMutation.mutate({ name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    value={world.description}
                    onChange={(e) => updateWorldMutation.mutate({ description: e.target.value })}
                    rows={3}
                    className="form-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Time Speed</label>
                    <select
                      value={world.settings.timeSpeed}
                      onChange={(e) => updateWorldMutation.mutate({
                        settings: {
                          ...world.settings,
                          timeSpeed: parseFloat(e.target.value),
                        },
                      })}
                      className="form-input"
                    >
                      <option value={0.25}>0.25×</option>
                      <option value={0.5}>0.5×</option>
                      <option value={1}>1×</option>
                      <option value={1.5}>1.5×</option>
                      <option value={2}>2×</option>
                      <option value={5}>5×</option>
                      <option value={10}>10×</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Max Agents</label>
                    <input
                      type="number"
                      value={world.settings.maxAgents}
                      onChange={(e) => updateWorldMutation.mutate({
                        settings: {
                          ...world.settings,
                          maxAgents: parseInt(e.target.value),
                        },
                      })}
                      min="1"
                      max="1000"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">World Width</label>
                    <input
                      type="number"
                      value={world.settings.worldSize.width}
                      onChange={(e) => updateWorldMutation.mutate({
                        settings: {
                          ...world.settings,
                          worldSize: {
                            ...world.settings.worldSize,
                            width: parseInt(e.target.value),
                          },
                        },
                      })}
                      min="400"
                      max="2000"
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label">World Height</label>
                    <input
                      type="number"
                      value={world.settings.worldSize.height}
                      onChange={(e) => updateWorldMutation.mutate({
                        settings: {
                          ...world.settings,
                          worldSize: {
                            ...world.settings.worldSize,
                            height: parseInt(e.target.value),
                          },
                        },
                      })}
                      min="300"
                      max="1500"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Agents</h3>
              <button
                onClick={() => setShowAddAgent(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Agent</span>
              </button>
            </div>

            <div className="space-y-3">
              {agents.map(agent => (
                <div key={agent.agentId} className="panel">
                  <div className="panel-body">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{agent.name}</h4>
                        <p className="text-sm text-gray-600">{agent.description}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          Location: ({agent.currentLocation.x}, {agent.currentLocation.y})
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAgent(agent.agentId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Agent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {agents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No agents in this world yet.</p>
                  <button
                    onClick={() => setShowAddAgent(true)}
                    className="btn-primary mt-4"
                  >
                    Add Your First Agent
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'objects' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">World Objects</h3>
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Object management coming soon!</p>
              <p className="text-sm mt-2">
                You'll be able to add buildings, furniture, and other objects to your world.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}