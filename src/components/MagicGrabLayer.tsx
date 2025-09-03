/**
 * MagicGrabLayer - Improved grabbed object component with proper mask application
 * Uses globalCompositeOperation for correct transparency handling
 */

import React, { useRef, useEffect, useState } from 'react';
import { Layer } from '../utils/LayerManager';

interface MagicGrabLayerProps {
  layer: Layer;
  imageData: ImageData | null;
  mask: ImageData | null;
  onDragStart?: (layerId: string, startX: number, startY: number) => void;
  onDrag?: (layerId: string, x: number, y: number) => void;
  onDragEnd?: (layerId: string) => void;
  onSelect?: (layerId: string) => void;
}

export const MagicGrabLayer: React.FC<MagicGrabLayerProps> = ({
  layer,
  imageData,
  mask,
  onDragStart,
  onDrag,
  onDragEnd,
  onSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Early return if imageData is null to prevent rendering errors
  if (!imageData) {
    return null;
  }

  useEffect(() => {
    if (!canvasRef.current || !imageData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match the selection
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create temporary canvas for the image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Put the image data
    tempCtx.putImageData(imageData, 0, 0);

    // Draw the image
    ctx.drawImage(tempCanvas, 0, 0);

    // Apply mask if available and valid
    if (mask && mask.width > 0 && mask.height > 0 && mask.data && mask.data.length > 0) {
      // Apply mask using globalCompositeOperation
      ctx.globalCompositeOperation = 'destination-in';
      
      // Create mask canvas
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = mask.width;
      maskCanvas.height = mask.height;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) return;

      // Put mask data
      maskCtx.putImageData(mask, 0, 0);
      
      // Apply the mask
      ctx.drawImage(maskCanvas, 0, 0);

      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
    }

    // Update the layer's canvas
    if (layer.canvas instanceof HTMLCanvasElement) {
      const layerCtx = layer.canvas.getContext('2d');
      if (layerCtx) {
        layer.canvas.width = canvas.width;
        layer.canvas.height = canvas.height;
        layerCtx.drawImage(canvas, 0, 0);
      }
    }
  }, [imageData, mask, layer]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Require selection before dragging: first click selects, second click drags
    if (!layer.selected) {
      onSelect?.(layer.id);
      return;
    }

    setIsDragging(true);
    setDragOffset({ x, y });
    onDragStart?.(layer.id, layer.position.x, layer.position.y);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const parentRect = canvasRef.current.parentElement?.getBoundingClientRect();
    if (!rect || !parentRect) return;

    const x = e.clientX - parentRect.left - dragOffset.x;
    const y = e.clientY - parentRect.top - dragOffset.y;

    onDrag?.(layer.id, x, y);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragEnd?.(layer.id);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="magic-grab-layer"
      data-layer-id={layer.id}
      style={{
        position: 'absolute',
        left: `${layer.position.x}px`,
        top: `${layer.position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: layer.opacity,
        visibility: layer.visible ? 'visible' : 'hidden',
        filter: layer.selected ? 'drop-shadow(0 0 8px #007bff)' : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
        transition: isDragging ? 'none' : 'filter 0.2s',
        pointerEvents: 'auto',
        zIndex: layer.zIndex
      }}
      onMouseDown={handleMouseDown}
    />
  );
};
