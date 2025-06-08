'use client';

import { Agent, MemoryStream, PaginatedResponse } from '@/lib/types';
import { getMemoryTypeColor, getImportanceColor, formatRelativeTime } from '@/lib/utils';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface MemoryBrowserProps {
  agent: Agent;
  worldId: string;
  memories: PaginatedResponse<MemoryStream> | null;
  isLoading: boolean;
}

export function MemoryBrowser({ agent, worldId, memories, isLoading }: MemoryBrowserProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Memory Stream</h3>
            <span className="text-sm text-gray-500">
              {memories?.total || 0} memories
            </span>
          </div>

          {memories && memories.items.length > 0 ? (
            <div className="space-y-3">
              {memories.items.map(memory => (
                <div
                  key={memory.memoryId}
                  className={`memory-card ${memory.type}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getMemoryTypeColor(memory.type)}`}>
                        {memory.type}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getImportanceColor(memory.importance)}`}>
                        {memory.importance}/10
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(memory.timestamp)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-900 mb-2">
                    {memory.content}
                  </p>

                  {memory.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {memory.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No memories found for this agent.</p>
              <p className="text-sm mt-2">
                Memories will appear here as the agent experiences the world.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}