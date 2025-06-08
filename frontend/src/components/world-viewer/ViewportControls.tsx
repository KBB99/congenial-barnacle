'use client';

import { ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

interface ViewportControlsProps {
  viewport: { x: number; y: number; zoom: number };
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  onCenterView: () => void;
  worldSize: { width: number; height: number };
  canvasSize: { width: number; height: number };
}

export function ViewportControls({
  viewport,
  onViewportChange,
  onCenterView,
  worldSize,
  canvasSize,
}: ViewportControlsProps) {
  const zoomIn = () => {
    const newZoom = Math.min(5, viewport.zoom * 1.2);
    onViewportChange({
      ...viewport,
      zoom: newZoom,
    });
  };

  const zoomOut = () => {
    const newZoom = Math.max(0.1, viewport.zoom / 1.2);
    onViewportChange({
      ...viewport,
      zoom: newZoom,
    });
  };

  const fitToScreen = () => {
    const scaleX = canvasSize.width / worldSize.width;
    const scaleY = canvasSize.height / worldSize.height;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    
    onViewportChange({
      x: (canvasSize.width - worldSize.width * scale) / 2,
      y: (canvasSize.height - worldSize.height * scale) / 2,
      zoom: scale,
    });
  };

  const resetView = () => {
    onViewportChange({ x: 0, y: 0, zoom: 1 });
  };

  return (
    <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
      <button
        onClick={zoomIn}
        className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        title="Zoom In"
      >
        <ZoomIn className="w-5 h-5" />
      </button>
      
      <button
        onClick={zoomOut}
        className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        title="Zoom Out"
      >
        <ZoomOut className="w-5 h-5" />
      </button>
      
      <button
        onClick={fitToScreen}
        className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        title="Fit to Screen"
      >
        <Maximize className="w-5 h-5" />
      </button>
      
      <button
        onClick={onCenterView}
        className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        title="Center View"
      >
        <RotateCcw className="w-5 h-5" />
      </button>
    </div>
  );
}