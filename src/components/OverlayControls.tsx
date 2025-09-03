import React, { useLayoutEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

export interface OverlayControlsRef {
  reposition: () => void;
}

interface OverlayControlsProps {
  imageRef: React.RefObject<HTMLElement>;
  highlightMode: 'block' | 'line' | 'word';
  noiseThreshold: number;
  minArea: number;
  onHighlightModeChange: (mode: 'block' | 'line' | 'word') => void;
  onNoiseThresholdChange: (threshold: number) => void;
  onMinAreaChange: (area: number) => void;
  stats: {
    totalBlocks: number;
    filteredBlocks: number;
    totalLines: number;
    filteredLines: number;
    totalWords: number;
    filteredWords: number;
  } | null;
}

type Position = { left: number; top: number };

const OverlayControls = forwardRef<OverlayControlsRef, OverlayControlsProps>(({
  imageRef,
  highlightMode,
  noiseThreshold,
  minArea,
  onHighlightModeChange,
  onNoiseThresholdChange,
  onMinAreaChange,
  stats
}, ref) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ left: 16, top: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const MARGIN = 12;
  const MIN_EDGE = 8;

  const place = () => {
    const img = imageRef.current?.getBoundingClientRect();
    const pnl = panelRef.current?.getBoundingClientRect();
    if (!img || !pnl) return;

    const tryLeft = () => ({ left: img.left - pnl.width - MARGIN, top: img.top + MARGIN });
    const tryRight = () => ({ left: img.right + MARGIN, top: img.top + MARGIN });
    const tryAbove = () => ({ 
      left: Math.max(MIN_EDGE, img.left + MARGIN), 
      top: Math.max(MIN_EDGE, img.top - pnl.height - MARGIN) 
    });
    const tryBelow = () => ({ 
      left: Math.max(MIN_EDGE, img.left + MARGIN), 
      top: Math.min(window.innerHeight - pnl.height - MIN_EDGE, img.bottom + MARGIN) 
    });

    const fits = (pos: Position) =>
      pos.left >= MIN_EDGE && 
      pos.left + pnl.width <= window.innerWidth - MIN_EDGE &&
      pos.top >= MIN_EDGE && 
      pos.top + pnl.height <= window.innerHeight - MIN_EDGE;

    let next = tryLeft();
    if (!fits(next)) next = tryRight();
    if (!fits(next)) next = tryAbove();
    if (!fits(next)) next = tryBelow();

    setPosition(next);
  };

  useImperativeHandle(ref, () => ({
    reposition: place
  }));

  useLayoutEffect(() => {
    place();
    
    const resizeObserver = new ResizeObserver(place);
    if (imageRef.current) {
      resizeObserver.observe(imageRef.current);
    }
    
    window.addEventListener('resize', place);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [imageRef]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current) return;
    
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      left: e.clientX - dragOffset.x,
      top: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        zIndex: 1000,
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,.25)',
        background: 'rgba(0,0,0,.8)',
        color: 'white',
        fontSize: '12px',
        minWidth: '200px',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      <div style={{ marginBottom: '10px', fontWeight: 'bold', cursor: 'grab' }}>
        Highlight Controls
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Mode:</label>
        <select 
          value={highlightMode} 
          onChange={(e) => onHighlightModeChange(e.target.value as 'block' | 'line' | 'word')}
          style={{ width: '100%', padding: '4px', fontSize: '12px' }}
        >
          <option value="line">Line (Recommended)</option>
          <option value="block">Block</option>
          <option value="word">Word</option>
        </select>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Min Confidence: {noiseThreshold}%
        </label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={noiseThreshold} 
          onChange={(e) => onNoiseThresholdChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Min Area: {minArea}px²
        </label>
        <input 
          type="range" 
          min="10" 
          max="500" 
          value={minArea} 
          onChange={(e) => onMinAreaChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      
      {stats && (
        <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '10px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Stats:</div>
          <div>Blocks: {stats.filteredBlocks}/{stats.totalBlocks}</div>
          <div>Lines: {stats.filteredLines}/{stats.totalLines}</div>
          <div>Words: {stats.filteredWords}/{stats.totalWords}</div>
        </div>
      )}
      
      <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.7 }}>
        Drag to reposition
      </div>
    </div>
  );
});

OverlayControls.displayName = 'OverlayControls';

export default OverlayControls;