import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

interface TextOverlayProps {
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
  highlightMode?: 'block' | 'line' | 'word';
  noiseThreshold?: number;
  minArea?: number;
}

type HighlightMode = 'block' | 'line' | 'word';

const TextOverlay: React.FC<TextOverlayProps> = ({ 
  imageUrl, 
  textData, 
  onTextUpdate,
  highlightMode = 'line',
  noiseThreshold = 70,
  minArea = 100
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const mountedRef = useRef(true);
  const [extractedText, setExtractedText] = useState<string>('');
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    
    if (canvasRef.current && !fabricRef.current) {
      fabricRef.current = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: 'transparent',
        selection: true,
        preserveObjectStacking: true,
        containerClass: 'text-overlay-canvas'
      });
      
      // Ensure pointer events flow to Fabric so text can be edited
      const canvasElement = fabricRef.current as any;
      if (canvasElement.wrapperEl) {
        canvasElement.wrapperEl.style.pointerEvents = 'auto';
      }
      if (canvasElement.upperCanvasEl) {
        canvasElement.upperCanvasEl.style.pointerEvents = 'auto';
      }
    }

    return () => {
      mountedRef.current = false;
      if (fabricRef.current) {
        try {
          fabricRef.current.dispose();
        } catch (error) {
          console.warn('Error disposing fabric canvas:', error);
        }
        fabricRef.current = null;
      }
    };
  }, []);

  // Load image to get dimensions but don't draw it
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!fabricRef.current || !imageSize || !mountedRef.current) return;

    console.log('TextOverlay: useEffect triggered with textData:', textData);

    const canvas = fabricRef.current;
    if (!canvas) return;

    try {
      canvas.clear();
      
      // Calculate scale based on image dimensions
      const scaleX = canvas.width! / imageSize.width;
      const scaleY = canvas.height! / imageSize.height;
      const scale = Math.min(scaleX, scaleY);
      
      const offsetX = (canvas.width! - imageSize.width * scale) / 2;
      const offsetY = (canvas.height! - imageSize.height * scale) / 2;

      if (textData) {
        console.log('TextOverlay: Processing textData for overlays');
        addTextOverlays(textData, scale, canvas, { width: imageSize.width, height: imageSize.height, offsetX, offsetY });
      } else {
        console.log('TextOverlay: No textData provided');
      }
      
      canvas.renderAll();
    } catch (error) {
      console.error('TextOverlay: Error processing overlays:', error);
    }
  }, [imageSize, textData, highlightMode, noiseThreshold, minArea]);

  const addTextOverlays = (data: any, scale: number, canvas: fabric.Canvas, imageInfo: { width: number; height: number; offsetX: number; offsetY: number }) => {
    const { offsetX, offsetY } = imageInfo;

    console.log('TextOverlay: Processing text data structure:', data);
    console.log('Adding text overlays with scale:', scale, 'offset:', offsetX, offsetY);
    console.log('Highlight mode:', highlightMode, 'Noise threshold:', noiseThreshold, 'Min area:', minArea);

    // Normalize UI inputs
    const to01 = (v: number) => (v > 1 ? v / 100 : v);
    const s = scale ?? 1;

    const minConfUI = noiseThreshold ?? 0;        // 0–100
    const minAreaCanvasPx2 = minArea ?? 0;        // px² (canvas)

    const minConf = to01(minConfUI);               // 0–1
    const minAreaImagePx2 = minAreaCanvasPx2 / (s * s); // convert to image px²

    // Get the actual data structure - handle both direct and nested formats
    const textData = data?.textData || data;
    const blocks = textData?.blocks || [];
    
    console.log('TextOverlay: Found blocks:', blocks.length);
    
    if (blocks.length === 0) {
      console.warn('TextOverlay: No blocks found in text data');
      return;
    }

    // Clear existing overlays
    const existingOverlays = canvas.getObjects().filter(obj => obj.data?.isTextOverlay);
    existingOverlays.forEach(obj => canvas.remove(obj));

    // Add overlays based on highlight mode
    let totalOverlays = 0;
    
    try {
      if (highlightMode === 'block') {
        blocks.forEach((block: any, blockIndex: number) => {
          if (block && block.bbox) {
            addBlockOverlay(block, blockIndex, scale, offsetX, offsetY, canvas);
            totalOverlays++;
          }
        });
      } else if (highlightMode === 'line') {
        blocks.forEach((block: any, blockIndex: number) => {
          const lines = block?.lines || [];
          lines.forEach((line: any, lineIndex: number) => {
            if (line && line.bbox) {
              addLineOverlay(line, blockIndex, lineIndex, scale, offsetX, offsetY, canvas);
              totalOverlays++;
            }
          });
        });
      } else if (highlightMode === 'word') {
        blocks.forEach((block: any, blockIndex: number) => {
          const lines = block?.lines || [];
          lines.forEach((line: any, lineIndex: number) => {
            const words = line?.words || [];
            words.forEach((word: any, wordIndex: number) => {
              if (word && word.bbox) {
                addWordOverlay(word, blockIndex, lineIndex, wordIndex, scale, offsetX, offsetY, canvas);
                totalOverlays++;
              }
            });
          });
        });
      }
      
      console.log(`TextOverlay: Successfully added ${totalOverlays} text overlays to canvas`);
    } catch (error) {
      console.error('TextOverlay: Error adding overlays:', error);
    }
  };

  const addBlockOverlay = (block: any, blockIndex: number, scale: number, offsetX: number, offsetY: number, canvas: fabric.Canvas) => {
    if (!block || !block.bbox) {
      console.warn('TextOverlay: Invalid block data for overlay', block);
      return;
    }

    const bbox = block.bbox;
    const x0 = Number(bbox.x0) || 0;
    const y0 = Number(bbox.y0) || 0;
    const x1 = Number(bbox.x1) || 1;
    const y1 = Number(bbox.y1) || 1;
    
    // Expand by 1px to avoid visual clipping from rounding
    const width = Math.max(50, (x1 - x0) * scale + 2);
    const height = Math.max(20, (y1 - y0) * scale + 2);
    
    const leftPos = x0 * scale + offsetX - 1;
    const topPos = y0 * scale + offsetY - 1;
    
    // Light outline only (avoid heavy overlay)
    const rect = new fabric.Rect({
      left: leftPos,
      top: topPos,
      width: width,
      height: height,
      fill: 'rgba(255, 255, 0, 0.05)',
      stroke: '#ff6600',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      data: { isTextOverlay: true, type: 'block', blockIndex }
    });

    // Fixed-size text that scales gently with canvas, not bbox height
    const text = new fabric.IText(block.text || '', {
      left: leftPos + 5,
      top: topPos + 5,
      width: width - 10,
      fontSize: Math.max(12, Math.min(18, 12 * scale)),
      lineHeight: 1.2,
      fill: '#000000',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      editable: true,
      selectable: true,
      hasControls: false,
      hasBorders: true,
      lockMovementX: true,
      lockMovementY: true,
      fontFamily: 'Arial',
      textAlign: 'left',
      data: {
        isTextOverlay: true,
        type: 'block',
        blockIndex,
        originalText: block.text || '',
        confidence: block.confidence || 0
      }
    });

    canvas.add(rect);
    canvas.add(text);
    
    setupTextInteractions(text, canvas);
  };

  const addLineOverlay = (line: any, blockIndex: number, lineIndex: number, scale: number, offsetX: number, offsetY: number, canvas: fabric.Canvas) => {
    if (!line || !line.bbox) {
      console.warn('TextOverlay: Invalid line data for overlay', line);
      return;
    }

    const bbox = line.bbox;
    const x0 = Number(bbox.x0) || 0;
    const y0 = Number(bbox.y0) || 0;
    const x1 = Number(bbox.x1) || 1;
    const y1 = Number(bbox.y1) || 1;
    
    const width = Math.max(30, (x1 - x0) * scale);
    const height = Math.max(15, (y1 - y0) * scale);
    
    const leftPos = x0 * scale + offsetX;
    const topPos = y0 * scale + offsetY;
    
    const rect = new fabric.Rect({
      left: leftPos,
      top: topPos,
      width: width,
      height: height,
      fill: 'rgba(173, 216, 230, 0.3)',
      stroke: '#0066cc',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      data: { isTextOverlay: true, type: 'line', blockIndex, lineIndex }
    });

    const text = new fabric.IText(line.text || '', {
      left: leftPos + 3,
      top: topPos + 2,
      width: width - 6,
      fontSize: Math.max(11, height * 0.8),
      fill: '#000000',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      editable: true,
      selectable: true,
      hasControls: false,
      hasBorders: true,
      lockMovementX: true,
      lockMovementY: true,
      fontFamily: 'Arial',
      data: {
        isTextOverlay: true,
        type: 'line',
        blockIndex,
        lineIndex,
        originalText: line.text || '',
        confidence: line.confidence || 0
      }
    });

    canvas.add(rect);
    canvas.add(text);
    
    setupTextInteractions(text, canvas);
  };

  const addWordOverlay = (word: any, blockIndex: number, lineIndex: number, wordIndex: number, scale: number, offsetX: number, offsetY: number, canvas: fabric.Canvas) => {
    if (!word || !word.bbox) {
      console.warn('TextOverlay: Invalid word data for overlay', word);
      return;
    }

    const bbox = word.bbox;
    const x0 = Number(bbox.x0) || 0;
    const y0 = Number(bbox.y0) || 0;
    const x1 = Number(bbox.x1) || 1;
    const y1 = Number(bbox.y1) || 1;
    
    const width = Math.max(20, (x1 - x0) * scale);
    const height = Math.max(10, (y1 - y0) * scale);
    
    const leftPos = x0 * scale + offsetX;
    const topPos = y0 * scale + offsetY;
    
    const text = new fabric.IText(word.text || '', {
      left: leftPos,
      top: topPos,
      width: width,
      fontSize: Math.max(12, height * 0.8),
      fill: '#000000',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: '#0066cc',
      cornerColor: '#0066cc',
      cornerSize: 4,
      transparentCorners: false,
      editable: true,
      selectable: true,
      hasControls: false,
      hasBorders: true,
      lockMovementX: true,
      lockMovementY: true,
      padding: 1,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      data: {
        isTextOverlay: true,
        type: 'word',
        originalText: word.text || '',
        confidence: word.confidence || 0,
        blockIndex,
        lineIndex,
        wordIndex
      }
    });

    setupTextInteractions(text, canvas);
    canvas.add(text);
  };

  const setupTextInteractions = (text: fabric.IText, canvas: fabric.Canvas) => {
    // Enhanced highlighting with better visual feedback
    text.on('mouseover', () => {
      text.set({
        backgroundColor: 'rgba(255, 255, 0, 0.9)',
        fill: '#0000ff',
        borderColor: '#ff6600',
        fontWeight: 'bold'
      });
      canvas.renderAll();
    });

    text.on('mouseout', () => {
      text.set({
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        fill: '#000000',
        borderColor: '#0066cc',
        fontWeight: 'normal'
      });
      canvas.renderAll();
    });

    // Enhanced editing feedback
    text.on('mousedown', () => {
      text.set({
        backgroundColor: 'rgba(173, 216, 230, 0.9)',
        borderColor: '#00ff00'
      });
      canvas.renderAll();
    });

    text.on('changed', () => {
      updateExtractedText(canvas);
      if (onTextUpdate) {
        const allText = getAllText(canvas);
        onTextUpdate(allText);
      }
    });

    // Add click handler for better interaction
    text.on('mouseup', () => {
      text.enterEditing();
    });
  };

  const getAllText = (canvas: fabric.Canvas): string => {
    const textObjects = canvas.getObjects('i-text');
    return textObjects
      .filter(obj => obj.data?.isTextOverlay)
      .map(obj => (obj as fabric.IText).text || '')
      .join(' ');
  };

  const updateExtractedText = (canvas: fabric.Canvas) => {
    const allText = getAllText(canvas);
    setExtractedText(allText);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto'
        }}
      />
      
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        maxWidth: '200px',
        zIndex: 1000,
        pointerEvents: 'auto'
      }}>
        <div><strong>Instructions:</strong></div>
        <div>• Click text to edit</div>
        <div>• Hover to highlight</div>
        <div>• Use floating controls</div>
        <div>• Drag controls to move</div>
      </div>
    </div>
  );
};

export default TextOverlay;
