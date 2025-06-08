'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { World, Agent, Location } from '@/lib/types';
import { AgentAvatar } from './AgentAvatar';
import { WorldCanvas } from './WorldCanvas';
import { ViewportControls } from './ViewportControls';
import { useWebSocket } from '@/hooks/useWebSocket';

interface WorldViewerProps {
  world: World;
  agents: Agent[];
  selectedAgentId: string | null;
  onAgentSelect: (agentId: string | null) => void;
  onAgentUpdate: () => void;
  onWorldUpdate: () => void;
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export function WorldViewer({
  world,
  agents,
  selectedAgentId,
  onAgentSelect,
  onAgentUpdate,
  onWorldUpdate,
}: WorldViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket();

  // Update canvas size when container resizes
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left - viewport.x) / viewport.zoom;
    const y = (screenY - rect.top - viewport.y) / viewport.zoom;
    
    return { x, y };
  }, [viewport]);

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    return {
      x: worldX * viewport.zoom + viewport.x,
      y: worldY * viewport.zoom + viewport.y,
    };
  }, [viewport]);

  // Handle mouse events for panning and selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    // Check if clicking on an agent
    const clickedAgent = agents.find(agent => {
      const distance = Math.sqrt(
        Math.pow(agent.currentLocation.x - worldPos.x, 2) +
        Math.pow(agent.currentLocation.y - worldPos.y, 2)
      );
      return distance < 20; // 20px click radius
    });

    if (clickedAgent) {
      onAgentSelect(clickedAgent.agentId);
    } else {
      onAgentSelect(null);
      // Start panning
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
    }
  }, [agents, viewport, screenToWorld, onAgentSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * zoomFactor));
    
    // Zoom towards mouse position
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      setViewport(prev => ({
        x: mouseX - (mouseX - prev.x) * (newZoom / prev.zoom),
        y: mouseY - (mouseY - prev.y) * (newZoom / prev.zoom),
        zoom: newZoom,
      }));
    }
  }, [viewport]);

  // Center view on world
  const centerView = useCallback(() => {
    setViewport({
      x: (canvasSize.width - world.settings.worldSize.width) / 2,
      y: (canvasSize.height - world.settings.worldSize.height) / 2,
      zoom: Math.min(
        canvasSize.width / world.settings.worldSize.width,
        canvasSize.height / world.settings.worldSize.height
      ) * 0.8,
    });
  }, [canvasSize, world.settings.worldSize]);

  // Center view on initial load
  useEffect(() => {
    centerView();
  }, [centerView]);

  // Render the world
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply viewport transformation
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
  }, [world, agents, selectedAgentId, viewport, canvasSize]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-100">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="world-canvas cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Viewport Controls */}
      <ViewportControls
        viewport={viewport}
        onViewportChange={setViewport}
        onCenterView={centerView}
        worldSize={world.settings.worldSize}
        canvasSize={canvasSize}
      />

      {/* Connection Status */}
      <div className="absolute top-4 left-4">
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* World Info */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-sm p-3">
        <div className="text-sm text-gray-600 space-y-1">
          <div>Agents: {agents.length}</div>
          <div>Status: <span className="capitalize">{world.status}</span></div>
          <div>Speed: {world.settings.timeSpeed}×</div>
          <div>Zoom: {Math.round(viewport.zoom * 100)}%</div>
        </div>
      </div>

      {/* Selected Agent Info */}
      {selectedAgentId && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-sm p-4 max-w-sm">
          {(() => {
            const agent = agents.find(a => a.agentId === selectedAgentId);
            if (!agent) return null;
            
            return (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">{agent.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Location: ({Math.round(agent.currentLocation.x)}, {Math.round(agent.currentLocation.y)})</div>
                  <div>Action: {agent.currentAction || 'Idle'}</div>
                  <div>Status: <span className="capitalize">{agent.status}</span></div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}