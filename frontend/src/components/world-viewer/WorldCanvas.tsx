'use client';

import { useRef, useEffect } from 'react';
import { World, Agent } from '@/lib/types';

interface WorldCanvasProps {
  world: World;
  agents: Agent[];
  viewport: { x: number; y: number; zoom: number };
  selectedAgentId: string | null;
  onAgentClick?: (agentId: string) => void;
}

export function WorldCanvas({ 
  world, 
  agents, 
  viewport, 
  selectedAgentId, 
  onAgentClick 
}: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context and apply viewport transformation
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw world background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, world.settings.worldSize.width, world.settings.worldSize.height);

    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1 / viewport.zoom;
    const gridSize = 50;
    
    for (let x = 0; x <= world.settings.worldSize.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, world.settings.worldSize.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= world.settings.worldSize.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(world.settings.worldSize.width, y);
      ctx.stroke();
    }

    // Draw world border
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2 / viewport.zoom;
    ctx.strokeRect(0, 0, world.settings.worldSize.width, world.settings.worldSize.height);

    // Draw agents
    agents.forEach(agent => {
      const isSelected = agent.agentId === selectedAgentId;
      
      // Agent circle
      ctx.beginPath();
      ctx.arc(agent.currentLocation.x, agent.currentLocation.y, 15, 0, 2 * Math.PI);
      
      // Agent color based on status
      if (agent.status === 'active') {
        ctx.fillStyle = isSelected ? '#3b82f6' : '#10b981';
      } else {
        ctx.fillStyle = '#6b7280';
      }
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3 / viewport.zoom;
        ctx.stroke();
      }

      // Agent name
      ctx.fillStyle = '#1f2937';
      ctx.font = `${12 / viewport.zoom}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(
        agent.name,
        agent.currentLocation.x,
        agent.currentLocation.y - 25
      );

      // Current action
      if (agent.currentAction) {
        ctx.fillStyle = '#6b7280';
        ctx.font = `${10 / viewport.zoom}px Inter, sans-serif`;
        ctx.fillText(
          agent.currentAction,
          agent.currentLocation.x,
          agent.currentLocation.y + 35
        );
      }
    });

    // Restore context
    ctx.restore();
  }, [world, agents, viewport, selectedAgentId]);

  return (
    <canvas
      ref={canvasRef}
      className="world-canvas w-full h-full"
      width={800}
      height={600}
    />
  );
}