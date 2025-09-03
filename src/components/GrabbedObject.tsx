import React, { useState, useRef, useEffect } from 'react';

interface GrabbedObjectProps {
  imageData: ImageData;
  mask: ImageData;
  originalPosition: { x: number; y: number };
  canvasSize: { width: number; height: number };
  onPositionChange: (x: number, y: number) => void;
  onRelease: () => void;
}

const GrabbedObject: React.FC<GrabbedObjectProps> = ({
  imageData,
  mask,
  originalPosition,
  canvasSize,
  onPositionChange,
  onRelease
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState(originalPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [extractedBounds, setExtractedBounds] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Since the image is already cropped, we just need to apply the mask
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    setExtractedBounds({
      x: 0,
      y: 0,
      width: imageData.width,
      height: imageData.height
    });

    // Clear canvas
    ctx.clearRect(0, 0, imageData.width, imageData.height);

    // Create a temporary canvas to apply the mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Put the image data
    tempCtx.putImageData(imageData, 0, 0);

    // Apply mask using globalCompositeOperation
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.putImageData(mask, 0, 0);

    // Draw the masked image onto our canvas
    ctx.drawImage(tempCanvas, 0, 0);
  }, [imageData, mask]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setDragOffset({
      x: x - position.x,
      y: y - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    // Constrain to canvas bounds
    const newX = Math.max(0, Math.min(canvasSize.width - extractedBounds.width, x));
    const newY = Math.max(0, Math.min(canvasSize.height - extractedBounds.height, y));

    setPosition({ x: newX, y: newY });
    onPositionChange(newX, newY);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onRelease();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10  // Ensure it appears above the canvas
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
          transition: isDragging ? 'none' : 'filter 0.2s'
        }}
        onMouseDown={handleMouseDown}
      />

      {/* Instructions */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 15px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          borderRadius: '5px',
          fontSize: '14px',
          pointerEvents: 'none'
        }}
      >
        Drag to move • Press Enter or Space to place
      </div>
    </div>
  );
};

export default GrabbedObject;