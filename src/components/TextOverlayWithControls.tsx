import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import TextOverlay from './TextOverlay';
import OverlayControls from './OverlayControls';
import OverlayControlsPortal from './OverlayControlsPortal';

interface TextOverlayWithControlsProps {
  imageUrl: string | null;
  textData: {
    blocks: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
      lines: Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
        words: Array<{
          text: string;
          confidence: number;
          bbox: { x0: number; y0: number; x1: number; y1: number };
        }>;
      }>;
    }>;
  } | null;
  onTextUpdate?: (updatedText: string) => void;
}

export interface TextOverlayWithControlsRef {
  repositionControls: () => void;
}

type HighlightMode = 'block' | 'line' | 'word';

const TextOverlayWithControls = forwardRef<TextOverlayWithControlsRef, TextOverlayWithControlsProps>(({
  imageUrl,
  textData,
  onTextUpdate
}, ref) => {
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('line');
  const [noiseThreshold, setNoiseThreshold] = useState<number>(70);
  const [minArea, setMinArea] = useState<number>(100);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    repositionControls: () => {
      controlsRef.current?.reposition();
    }
  }));

  const getStats = () => {
    if (!textData) return null;
    
    const blocks = textData.blocks || [];
    const lines = blocks.flatMap((b: any) => b.lines || []);
    const words = lines.flatMap((l: any) => l.words || []);
    
    const filteredBlocks = blocks.filter((b: any) => 
      b.confidence >= noiseThreshold && 
      (b.bbox.x1 - b.bbox.x0) * (b.bbox.y1 - b.bbox.y0) >= minArea
    );
    const filteredLines = lines.filter((l: any) => 
      l.confidence >= noiseThreshold && 
      (l.bbox.x1 - l.bbox.x0) * (l.bbox.y1 - l.bbox.y0) >= minArea
    );
    const filteredWords = words.filter((w: any) => 
      w.confidence >= noiseThreshold && 
      (w.bbox.x1 - w.bbox.x0) * (w.bbox.y1 - w.bbox.y0) >= minArea
    );
    
    return {
      totalBlocks: blocks.length,
      filteredBlocks: filteredBlocks.length,
      totalLines: lines.length,
      filteredLines: filteredLines.length,
      totalWords: words.length,
      filteredWords: filteredWords.length
    };
  };

  const stats = getStats();

  // Reposition controls when image loads or scale changes
  useEffect(() => {
    if (imageUrl && imageContainerRef.current) {
      const img = new Image();
      img.onload = () => {
        controlsRef.current?.reposition();
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  // Reposition on window resize
  useEffect(() => {
    const handleResize = () => {
      controlsRef.current?.reposition();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={imageContainerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <TextOverlay
        imageUrl={imageUrl}
        textData={textData}
        highlightMode={highlightMode}
        noiseThreshold={noiseThreshold}
        minArea={minArea}
        onTextUpdate={onTextUpdate}
      />
      
      <OverlayControlsPortal>
        <OverlayControls
          ref={controlsRef}
          imageRef={imageContainerRef}
          highlightMode={highlightMode}
          noiseThreshold={noiseThreshold}
          minArea={minArea}
          onHighlightModeChange={setHighlightMode}
          onNoiseThresholdChange={setNoiseThreshold}
          onMinAreaChange={setMinArea}
          stats={stats}
        />
      </OverlayControlsPortal>
    </div>
  );
});

TextOverlayWithControls.displayName = 'TextOverlayWithControls';

export default TextOverlayWithControls;