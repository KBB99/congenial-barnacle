'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { worldApi, agentApi } from '@/lib/api';
import { WorldViewer } from '@/components/world-viewer/WorldViewer';
import { AgentInspector } from '@/components/agent-inspector/AgentInspector';
import { WorldEditor } from '@/components/world-editor/WorldEditor';
import { TimeControls } from '@/components/time-controls/TimeControls';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { useWebSocket, useWorldStateUpdates, useAgentUpdates } from '@/hooks/useWebSocket';
import { 
  Settings, 
  Users, 
  MessageSquare, 
  Edit, 
  Eye, 
  ArrowLeft,
  Maximize2,
  Minimize2 
} from 'lucide-react';
import Link from 'next/link';

export default function WorldPage() {
  const params = useParams();
  const worldId = params.id as string;
  
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'inspector' | 'editor' | 'chat' | null>('inspector');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch world data
  const { data: world, isLoading: worldLoading, error: worldError, refetch: refetchWorld } = useQuery({
    queryKey: ['world', worldId],
    queryFn: () => worldApi.getWorld(worldId),
    enabled: !!worldId,
  });

  // Fetch agents data
  const { data: agents, isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['agents', worldId],
    queryFn: () => agentApi.getAgents(worldId),
    enabled: !!worldId,
  });

  // WebSocket updates
  useWorldStateUpdates(worldId, (data) => {
    refetchWorld();
  });

  useAgentUpdates(worldId, (data) => {
    refetchAgents();
  });

  if (worldLoading || agentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (worldError || !world) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorMessage 
          title="World not found"
          message="The world you're looking for doesn't exist or has been deleted."
          onRetry={() => refetchWorld()}
        />
      </div>
    );
  }

  const togglePanel = (panel: typeof activePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setActivePanel(null);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {world.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {agents?.length || 0} agents • {world.status}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Time Controls */}
              <TimeControls world={world} onUpdate={refetchWorld} />

              {/* Panel Toggles */}
              <div className="flex items-center space-x-1 border-l border-gray-200 pl-4 ml-4">
                <button
                  onClick={() => togglePanel('inspector')}
                  className={`p-2 rounded-lg transition-colors ${
                    activePanel === 'inspector'
                      ? 'bg-primary-100 text-primary-600'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Agent Inspector"
                >
                  <Users className="w-5 h-5" />
                </button>

                <button
                  onClick={() => togglePanel('editor')}
                  className={`p-2 rounded-lg transition-colors ${
                    activePanel === 'editor'
                      ? 'bg-primary-100 text-primary-600'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="World Editor"
                >
                  <Edit className="w-5 h-5" />
                </button>

                <button
                  onClick={() => togglePanel('chat')}
                  className={`p-2 rounded-lg transition-colors ${
                    activePanel === 'chat'
                      ? 'bg-primary-100 text-primary-600'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Chat Interface"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* World Viewer */}
        <div className={`flex-1 ${activePanel && !isFullscreen ? 'mr-96' : ''} transition-all duration-300`}>
          <WorldViewer
            world={world}
            agents={agents || []}
            selectedAgentId={selectedAgentId}
            onAgentSelect={setSelectedAgentId}
            onAgentUpdate={refetchAgents}
            onWorldUpdate={refetchWorld}
          />
        </div>

        {/* Side Panel */}
        {activePanel && !isFullscreen && (
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            {activePanel === 'inspector' && (
              <AgentInspector
                worldId={worldId}
                agents={agents || []}
                selectedAgentId={selectedAgentId}
                onAgentSelect={setSelectedAgentId}
                onAgentUpdate={refetchAgents}
              />
            )}

            {activePanel === 'editor' && (
              <WorldEditor
                world={world}
                agents={agents || []}
                onWorldUpdate={refetchWorld}
                onAgentUpdate={refetchAgents}
              />
            )}

            {activePanel === 'chat' && (
              <ChatInterface
                worldId={worldId}
                agents={agents || []}
                selectedAgentId={selectedAgentId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}