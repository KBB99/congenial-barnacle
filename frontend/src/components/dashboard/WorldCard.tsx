'use client';

import { useState } from 'react';
import { Play, Pause, Square, Eye, Settings, Trash2, Users, Clock } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { World } from '@/lib/types';
import { worldApi } from '@/lib/api';
import { formatRelativeTime, getStatusColor } from '@/lib/utils';

interface WorldCardProps {
  world: World;
  onUpdate: () => void;
}

export function WorldCard({ world, onUpdate }: WorldCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const pauseMutation = useMutation({
    mutationFn: () => worldApi.pauseWorld(world.worldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worlds'] });
      onUpdate();
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => worldApi.resumeWorld(world.worldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worlds'] });
      onUpdate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => worldApi.deleteWorld(world.worldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worlds'] });
      onUpdate();
    },
  });

  const handlePlayPause = async () => {
    setIsLoading(true);
    try {
      if (world.status === 'running') {
        await pauseMutation.mutateAsync();
      } else {
        await resumeMutation.mutateAsync();
      }
    } catch (error) {
      console.error('Failed to toggle world state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${world.name}"? This action cannot be undone.`)) {
      try {
        await deleteMutation.mutateAsync();
      } catch (error) {
        console.error('Failed to delete world:', error);
      }
    }
  };

  return (
    <div className="panel hover:shadow-lg transition-shadow">
      <div className="panel-body">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {world.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {world.description}
            </p>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(world.status)}`}>
              {world.status}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span>{world.agentCount} agents</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>{formatRelativeTime(world.lastModified)}</span>
          </div>
        </div>

        {/* World Settings Preview */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              <span className="font-medium">Size:</span> {world.settings.worldSize.width}×{world.settings.worldSize.height}
            </div>
            <div>
              <span className="font-medium">Speed:</span> {world.settings.timeSpeed}×
            </div>
            <div>
              <span className="font-medium">Max Agents:</span> {world.settings.maxAgents}
            </div>
            <div>
              <span className="font-medium">Physics:</span> {world.settings.physics.collision ? 'On' : 'Off'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlayPause}
              disabled={isLoading || pauseMutation.isPending || resumeMutation.isPending}
              className={`p-2 rounded-lg transition-colors ${
                world.status === 'running'
                  ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={world.status === 'running' ? 'Pause World' : 'Resume World'}
            >
              {isLoading || pauseMutation.isPending || resumeMutation.isPending ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : world.status === 'running' ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete World"
            >
              {deleteMutation.isPending ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/world/${world.worldId}`}
              className="btn-primary flex items-center space-x-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              <span>View World</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}