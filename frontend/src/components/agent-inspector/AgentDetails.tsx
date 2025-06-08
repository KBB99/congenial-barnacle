'use client';

import { Agent } from '@/lib/types';
import { AgentAvatar } from '../world-viewer/AgentAvatar';
import { getStatusColor } from '@/lib/utils';

interface AgentDetailsProps {
  agent: Agent;
  worldId: string;
  onAgentUpdate: () => void;
}

export function AgentDetails({ agent, worldId, onAgentUpdate }: AgentDetailsProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Agent Header */}
          <div className="flex items-center space-x-4">
            <AgentAvatar agent={agent} size="lg" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{agent.name}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(agent.status)}`}>
                {agent.status}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-600">{agent.description}</p>
          </div>

          {/* Current Status */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Current Status</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="text-sm">
                <span className="font-medium">Location:</span> ({Math.round(agent.currentLocation.x)}, {Math.round(agent.currentLocation.y)})
              </div>
              <div className="text-sm">
                <span className="font-medium">Area:</span> {agent.currentLocation.area}
              </div>
              <div className="text-sm">
                <span className="font-medium">Current Action:</span> {agent.currentAction || 'Idle'}
              </div>
            </div>
          </div>

          {/* Personality Traits */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Personality Traits</h3>
            <div className="flex flex-wrap gap-2">
              {agent.traits.map((trait, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Goals</h3>
            <ul className="space-y-1">
              {agent.goals.map((goal, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                  {goal}
                </li>
              ))}
            </ul>
          </div>

          {/* Current Plan */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Current Plan</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Daily Plan</h4>
                <ul className="space-y-1">
                  {agent.currentPlan.dailyPlan.map((item, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-start">
                      <span className="w-1 h-1 bg-green-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Hourly Plan</h4>
                <ul className="space-y-1">
                  {agent.currentPlan.hourlyPlan.map((item, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-start">
                      <span className="w-1 h-1 bg-yellow-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Current Step</h4>
                <p className="text-xs text-gray-600">{agent.currentPlan.currentStep}</p>
              </div>
            </div>
          </div>

          {/* Relationships */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Relationships</h3>
            {Object.keys(agent.relationships).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(agent.relationships).map(([agentId, relationship]) => (
                  <div key={agentId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{agentId}</span>
                    <span className="text-gray-900 font-medium">{relationship}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No relationships established yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}