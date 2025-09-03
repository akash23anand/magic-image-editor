import React, { useState, useRef, useEffect } from 'react';
import {
  calculateTransform,
  canvasRectToImage,
  clampRectToImage,
  TransformInfo
} from '../utils/CoordinateHelpers';

interface SelectionOverlayProps {
  imageUrl: string | null;
  onSelectionComplete: (selection: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
  isActive: boolean;
}

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  imageUrl,
  onSelectionComplete,
  onCancel,
  isActive
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState({ x: 0, y: 0 });
  const [transform, setTransform] = useState<TransformInfo | null>(null);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      const transformInfo = calculateTransform(
        { width: img.width, height: img.height },
        { width: 800, height: 600 }
      );
      setTransform(transformInfo);
    };

    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!isActive) {
      setIsSelecting(false);
      setStartPoint({ x: 0, y: 0 });
      setEndPoint({ x: 0, y: 0 });
    }
  }, [isActive]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setStartPoint({ x, y });
    setEndPoint({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !isActive) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setEndPoint({ x, y });
  };

  const handleMouseUp = () => {
    if (!isSelecting || !isActive) return;

    setIsSelecting(false);

    // Calculate selection rectangle
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    // Only process if selection is meaningful (not just a click)
    if (width > 5 && height > 5 && transform) {
      // Convert canvas coordinates to image coordinates
      const canvasRect = { x, y, width, height };
      const imageRect = canvasRectToImage(canvasRect, transform);
      
      // Clamp to image bounds
      const clampedRect = clampRectToImage(imageRect, {
        width: transform.imageWidth,
        height: transform.imageHeight
      });

      console.log('Selection coordinates:', {
        canvas: canvasRect,
        image: imageRect,
        clamped: clampedRect,
        transform
      });

      onSelectionComplete({
        x: Math.round(clampedRect.x),
        y: Math.round(clampedRect.y),
        width: Math.round(clampedRect.width),
        height: Math.round(clampedRect.height)
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isActive) {
      onCancel();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  // Calculate selection rectangle
  const selectionRect = {
    x: Math.min(startPoint.x, endPoint.x),
    y: Math.min(startPoint.y, endPoint.y),
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y)
  };

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        cursor: isActive ? 'crosshair' : 'default',
        pointerEvents: isActive ? 'auto' : 'none',
        zIndex: 5
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Selection rectangle overlay */}
      {isActive && isSelecting && selectionRect.width > 0 && selectionRect.height > 0 && (
        <div
          style={{
            position: 'absolute',
            left: `${selectionRect.x}px`,
            top: `${selectionRect.y}px`,
            width: `${selectionRect.width}px`,
            height: `${selectionRect.height}px`,
            border: '2px dashed #007bff',
            borderStyle: 'dashed',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            pointerEvents: 'none',
            animation: 'pulse 1s infinite'
          }}
        />
      )}

      {/* Instructions overlay */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            padding: '10px 15px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '5px',
            fontSize: '14px',
            pointerEvents: 'none'
          }}
        >
          Click and drag to select an area • Press ESC to cancel
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default SelectionOverlay;