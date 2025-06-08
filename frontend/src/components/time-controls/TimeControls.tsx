'use client';

import { useState } from 'react';
import { Play, Pause, Square, SkipForward, SkipBack, Clock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { World } from '@/lib/types';
import { worldApi } from '@/lib/api';

interface TimeControlsProps {
  world: World;
  onUpdate: () => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 5, 10];

export function TimeControls({ world, onUpdate }: TimeControlsProps) {
  const [isChangingSpeed, setIsChangingSpeed] = useState(false);

  const pauseMutation = useMutation({
    mutationFn: () => worldApi.pauseWorld(world.worldId),
    onSuccess: onUpdate,
  });

  const resumeMutation = useMutation({
    mutationFn: () => worldApi.resumeWorld(world.worldId),
    onSuccess: onUpdate,
  });

  const updateSpeedMutation = useMutation({
    mutationFn: (speed: number) => 
      worldApi.updateWorld(world.worldId, {
        settings: {
          ...world.settings,
          timeSpeed: speed,
        },
      }),
    onSuccess: onUpdate,
  });

  const handlePlayPause = () => {
    if (world.status === 'running') {
      pauseMutation.mutate();
    } else {
      resumeMutation.mutate();
    }
  };

  const handleSpeedChange = (speed: number) => {
    setIsChangingSpeed(true);
    updateSpeedMutation.mutate(speed, {
      onSettled: () => setIsChangingSpeed(false),
    });
  };

  const isLoading = pauseMutation.isPending || resumeMutation.isPending || isChangingSpeed;

  return (
    <div className="flex items-center space-x-2">
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        disabled={isLoading}
        className={`p-2 rounded-lg transition-colors ${
          world.status === 'running'
            ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
            : 'bg-green-100 text-green-600 hover:bg-green-200'
        } disabled:opacity-50`}
        title={world.status === 'running' ? 'Pause Simulation' : 'Start Simulation'}
      >
        {isLoading ? (
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : world.status === 'running' ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5" />
        )}
      </button>

      {/* Speed Control */}
      <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 px-3 py-1">
        <Clock className="w-4 h-4 text-gray-500" />
        <select
          value={world.settings.timeSpeed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          disabled={isLoading}
          className="text-sm border-none bg-transparent focus:outline-none disabled:opacity-50"
        >
          {SPEED_OPTIONS.map(speed => (
            <option key={speed} value={speed}>
              {speed}×
            </option>
          ))}
        </select>
      </div>

      {/* Current Time Display */}
      <div className="text-sm text-gray-600 bg-white rounded-lg border border-gray-200 px-3 py-2">
        <div className="flex items-center space-x-2">
          <span className="font-mono">
            {new Date(world.currentTime).toLocaleTimeString()}
          </span>
          <span className={`w-2 h-2 rounded-full ${
            world.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`} />
        </div>
      </div>
    </div>
  );
}