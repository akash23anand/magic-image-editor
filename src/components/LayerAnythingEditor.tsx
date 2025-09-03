/**
 * Layer Anything Editor - Main component integrating all Layer Anything functionality
 * Implements the complete layering system from the PRP
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import LayerAnythingCanvas, { LayerAnythingCanvasRef, HighlightRegion } from './LayerAnythingCanvas';
import LayersPanel from './LayersPanel';
import ToolPalette, { ToolType } from './ToolPalette';
import { SettingsPanel } from './SettingsPanel';
import { layerAnythingEngine, BaseLayerMeta, Transform, BBox } from '../services/LayerAnythingEngine';
import { ocrService } from '../services/OCRService';
import { segmentationService } from '../services/SegmentationService';
import { e2eLogger } from '../utils/E2ELogger';

export interface LayerAnythingEditorProps {
  imageUrl?: string;
  onLayerChange?: (layers: BaseLayerMeta[]) => void;
  onExport?: (data: string, format: string) => void;
}

interface SelectionState {
  isActive: boolean;
  startPoint?: { x: number; y: number };
  currentPoint?: { x: number; y: number };
  bbox?: BBox;
}

export const LayerAnythingEditor: React.FC<LayerAnythingEditorProps> = ({
  imageUrl,
  onLayerChange,
  onExport
}) => {
  // Refs
  const canvasRef = useRef<LayerAnythingCanvasRef>(null);
  
  // State
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [layers, setLayers] = useState<BaseLayerMeta[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [selectionState, setSelectionState] = useState<SelectionState>({ isActive: false });
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [settingsPosition, setSettingsPosition] = useState({ x: 0, y: 0 });

  // Initialize engine when image changes
  useEffect(() => {
    if (imageUrl) {
      initializeWithImage(imageUrl);
    }
  }, [imageUrl]);

  const initializeWithImage = async (url: string) => {
    try {
      setIsProcessing(true);
      setProcessingMessage('Loading image...');

      // Load image to get dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      // Initialize layer graph
      const graphId = await layerAnythingEngine.initializeFromImage(url, {
        width: img.width,
        height: img.height
      });

      // Update layers
      const initialLayers = layerAnythingEngine.getLayers();
      setLayers(initialLayers);
      
      if (onLayerChange) {
        onLayerChange(initialLayers);
      }

      e2eLogger.info('LayerAnythingEditor', 'initialized', {
        graphId,
        imageDimensions: { width: img.width, height: img.height },
        layerCount: initialLayers.length
      });
    } catch (error) {
      e2eLogger.error('LayerAnythingEditor', 'initialization_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Tool selection handler
  const handleToolSelect = useCallback((tool: ToolType) => {
    setSelectedTool(tool);
    
    // Clear any active selections when switching tools
    if (canvasRef.current) {
      canvasRef.current.clearHighlights();
    }
    
    setSelectionState({ isActive: false });
    
    e2eLogger.info('LayerAnythingEditor', 'tool_selected', { tool });
  }, []);

  // Canvas mouse handlers
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || isProcessing) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const canvasPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    const imagePoint = canvasRef.current.canvasToImage(canvasPoint);

    switch (selectedTool) {
      case 'select':
        setSelectionState({
          isActive: true,
          startPoint: imagePoint,
          currentPoint: imagePoint
        });
        break;
        
      case 'grab-text':
        handleTextGrab(imagePoint);
        break;
        
      case 'grab-object':
        handleObjectGrab(imagePoint);
        break;
    }
  }, [selectedTool, isProcessing]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !selectionState.isActive) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const canvasPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    const imagePoint = canvasRef.current.canvasToImage(canvasPoint);

    if (selectedTool === 'select' && selectionState.startPoint) {
      const bbox: BBox = {
        x: Math.min(selectionState.startPoint.x, imagePoint.x),
        y: Math.min(selectionState.startPoint.y, imagePoint.y),
        width: Math.abs(imagePoint.x - selectionState.startPoint.x),
        height: Math.abs(imagePoint.y - selectionState.startPoint.y)
      };

      setSelectionState(prev => ({
        ...prev,
        currentPoint: imagePoint,
        bbox
      }));

      // Update selection highlight
      const highlight: HighlightRegion = {
        id: 'selection',
        bbox,
        color: '#2196F3',
        opacity: 0.3,
        type: 'selection'
      };

      canvasRef.current.addHighlight(highlight);
    }
  }, [selectedTool, selectionState]);

  const handleCanvasMouseUp = useCallback(() => {
    if (selectedTool === 'select' && selectionState.bbox) {
      // Process selection
      handleSelection(selectionState.bbox);
    }
    
    setSelectionState({ isActive: false });
  }, [selectedTool, selectionState]);

  // Tool-specific handlers
  const handleTextGrab = async (point: { x: number; y: number }) => {
    try {
      setIsProcessing(true);
      setProcessingMessage('Detecting text...');

      if (!canvasRef.current) return;

      // Get image data from canvas
      const canvas = canvasRef.current.getCanvas();
      if (!canvas) return;

      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Perform OCR
      const ocrResult = await ocrService.recognize(imageData, {
        level: 'paragraph',
        confidence: 0.6
      });

      // Find text block at clicked point
      const clickedBlock = ocrResult.blocks.find(block => 
        point.x >= block.bbox.x && 
        point.x <= block.bbox.x + block.bbox.width &&
        point.y >= block.bbox.y && 
        point.y <= block.bbox.y + block.bbox.height
      );

      if (clickedBlock) {
        // Create text layer
        const layerId = await layerAnythingEngine.createTextLayer(clickedBlock);
        
        // Update layers
        const updatedLayers = layerAnythingEngine.getLayers();
        setLayers(updatedLayers);
        setSelectedLayerId(layerId);
        
        if (onLayerChange) {
          onLayerChange(updatedLayers);
        }

        e2eLogger.info('LayerAnythingEditor', 'text_layer_created', {
          layerId,
          text: clickedBlock.text,
          confidence: clickedBlock.confidence
        });
      }
    } catch (error) {
      e2eLogger.error('LayerAnythingEditor', 'text_grab_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const handleObjectGrab = async (point: { x: number; y: number }) => {
    try {
      setIsProcessing(true);
      setProcessingMessage('Segmenting object...');

      if (!canvasRef.current) return;

      // Get image data from canvas
      const canvas = canvasRef.current.getCanvas();
      if (!canvas) return;

      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Perform segmentation
      const segResult = await segmentationService.segment(imageData, {
        type: 'point',
        data: [point]
      });

      if (segResult.masks.length > 0) {
        const mask = segResult.masks[0];
        
        // Create object layer
        const layerId = await layerAnythingEngine.createObjectLayer(
          mask.mask,
          mask.bbox,
          { category: 'object' }
        );
        
        // Update layers
        const updatedLayers = layerAnythingEngine.getLayers();
        setLayers(updatedLayers);
        setSelectedLayerId(layerId);
        
        if (onLayerChange) {
          onLayerChange(updatedLayers);
        }

        e2eLogger.info('LayerAnythingEditor', 'object_layer_created', {
          layerId,
          bbox: mask.bbox,
          confidence: mask.confidence
        });
      }
    } catch (error) {
      e2eLogger.error('LayerAnythingEditor', 'object_grab_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const handleSelection = async (bbox: BBox) => {
    // Process selection based on current tool
    switch (selectedTool) {
      case 'select':
        // Show selection options
        setSettingsPosition({ x: bbox.x, y: bbox.y });
        setShowSettingsPanel(true);
        break;
    }
  };

  // Auto-detection handlers
  const handleAutoFindText = async () => {
    try {
      setIsProcessing(true);
      setProcessingMessage('Finding all text...');

      if (!canvasRef.current) return;

      const canvas = canvasRef.current.getCanvas();
      if (!canvas) return;

      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const ocrResult = await ocrService.recognize(imageData, {
        level: 'paragraph',
        confidence: 0.5
      });

      // Create layers for all detected text
      for (const block of ocrResult.blocks) {
        await layerAnythingEngine.createTextLayer(block);
      }

      const updatedLayers = layerAnythingEngine.getLayers();
      setLayers(updatedLayers);
      
      if (onLayerChange) {
        onLayerChange(updatedLayers);
      }

      e2eLogger.info('LayerAnythingEditor', 'auto_text_detection_complete', {
        textBlocksFound: ocrResult.blocks.length
      });
    } catch (error) {
      e2eLogger.error('LayerAnythingEditor', 'auto_text_detection_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const handleAutoFindObjects = async () => {
    try {
      setIsProcessing(true);
      setProcessingMessage('Finding objects...');

      if (!canvasRef.current) return;

      const canvas = canvasRef.current.getCanvas();
      if (!canvas) return;

      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const detectionResult = await segmentationService.detect(imageData, {
        labels: ['person', 'dog', 'cat', 'car', 'object'],
        threshold: 0.3
      });

      // Create layers for detected objects
      for (const detection of detectionResult.detections) {
        // Use detection bbox as a box prompt for segmentation
        const segResult = await segmentationService.segment(imageData, {
          type: 'box',
          data: detection.bbox
        });

        if (segResult.masks.length > 0) {
          await layerAnythingEngine.createObjectLayer(
            segResult.masks[0].mask,
            detection.bbox,
            { category: detection.category }
          );
        }
      }

      const updatedLayers = layerAnythingEngine.getLayers();
      setLayers(updatedLayers);
      
      if (onLayerChange) {
        onLayerChange(updatedLayers);
      }

      e2eLogger.info('LayerAnythingEditor', 'auto_object_detection_complete', {
        objectsFound: detectionResult.detections.length
      });
    } catch (error) {
      e2eLogger.error('LayerAnythingEditor', 'auto_object_detection_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Layer management handlers
  const handleLayerSelect = useCallback((layerId: string) => {
    setSelectedLayerId(layerId);
    e2eLogger.info('LayerAnythingEditor', 'layer_selected', { layerId });
  }, []);

  const handleLayerVisibilityToggle = useCallback((layerId: string) => {
    const layer = layerAnythingEngine.getLayer(layerId);
    if (layer) {
      layer.visible = !layer.visible;
      layer.updatedAt = new Date().toISOString();
      
      const updatedLayers = layerAnythingEngine.getLayers();
      setLayers(updatedLayers);
      
      if (onLayerChange) {
        onLayerChange(updatedLayers);
      }
    }
  }, [onLayerChange]);

  const handleLayerLockToggle = useCallback((layerId: string) => {
    const layer = layerAnythingEngine.getLayer(layerId);
    if (layer) {
      layer.locked = !layer.locked;
      layer.updatedAt = new Date().toISOString();
      
      const updatedLayers = layerAnythingEngine.getLayers();
      setLayers(updatedLayers);
      
      if (onLayerChange) {
        onLayerChange(updatedLayers);
      }
    }
  }, [onLayerChange]);

  const handleLayerRename = useCallback((layerId: string, newName: string) => {
    const layer = layerAnythingEngine.getLayer(layerId);
    if (layer) {
      layer.name = newName;
      layer.updatedAt = new Date().toISOString();
      
      const updatedLayers = layerAnythingEngine.getLayers();
      setLayers(updatedLayers);
      
      if (onLayerChange) {
        onLayerChange(updatedLayers);
      }
    }
  }, [onLayerChange]);

  const handleLayerDelete = useCallback((layerId: string) => {
    // Implementation would remove layer from engine
    // For now, just update UI
    const updatedLayers = layers.filter(l => l.id !== layerId);
    setLayers(updatedLayers);
    
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
    
    if (onLayerChange) {
      onLayerChange(updatedLayers);
    }
  }, [layers, selectedLayerId, onLayerChange]);

  const handleLayerDuplicate = useCallback((layerId: string) => {
    // Implementation would duplicate layer in engine
    e2eLogger.info('LayerAnythingEditor', 'layer_duplicate_requested', { layerId });
  }, []);

  const handleExport = useCallback((format: 'json' | 'psd' | 'svg') => {
    try {
      const exportData = layerAnythingEngine.exportToJSON();
      
      if (onExport) {
        onExport(exportData, format);
      }
      
      e2eLogger.info('LayerAnythingEditor', 'export_complete', { format });
    } catch (error) {
      e2eLogger.error('LayerAnythingEditor', 'export_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [onExport]);

  // Handle automation tools
  useEffect(() => {
    switch (selectedTool) {
      case 'auto-find-text':
        handleAutoFindText();
        setSelectedTool('select'); // Reset to select tool
        break;
      case 'auto-find-objects':
        handleAutoFindObjects();
        setSelectedTool('select'); // Reset to select tool
        break;
      case 'auto-layer-everything':
        // Run both text and object detection
        Promise.all([handleAutoFindText(), handleAutoFindObjects()]);
        setSelectedTool('select'); // Reset to select tool
        break;
    }
  }, [selectedTool]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Tool Palette */}
      <div style={{ padding: '16px' }}>
        <ToolPalette
          selectedTool={selectedTool}
          onToolSelect={handleToolSelect}
          isProcessing={isProcessing}
          disabled={!imageUrl}
        />
      </div>

      {/* Main Canvas Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          position: 'relative'
        }}
      >
        {imageUrl ? (
          <div
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
          >
            <LayerAnythingCanvas
              ref={canvasRef}
              imageUrl={imageUrl}
              onTransformChange={setTransform}
            />
          </div>
        ) : (
          <div
            style={{
              width: '800px',
              height: '600px',
              border: '2px dashed #ccc',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: '18px'
            }}
          >
            Upload an image to start layering
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '20px 30px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              zIndex: 1000
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                border: '2px solid #e0e0e0',
                borderTop: '2px solid #2196F3',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
            <span style={{ fontSize: '14px', color: '#333' }}>
              {processingMessage}
            </span>
          </div>
        )}
      </div>

      {/* Layers Panel */}
      <div style={{ padding: '16px' }}>
        <LayersPanel
          layers={layers}
          selectedLayerId={selectedLayerId || undefined}
          onLayerSelect={handleLayerSelect}
          onLayerVisibilityToggle={handleLayerVisibilityToggle}
          onLayerLockToggle={handleLayerLockToggle}
          onLayerRename={handleLayerRename}
          onLayerDelete={handleLayerDelete}
          onLayerDuplicate={handleLayerDuplicate}
          onLayerReorder={() => {}} // TODO: Implement
          onLayerGroup={() => {}} // TODO: Implement
          onLayerUngroup={() => {}} // TODO: Implement
        />
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
        title="Selection Options"
        position={settingsPosition}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => {
              if (selectionState.bbox) {
                handleTextGrab({
                  x: selectionState.bbox.x + selectionState.bbox.width / 2,
                  y: selectionState.bbox.y + selectionState.bbox.height / 2
                });
              }
              setShowSettingsPanel(false);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            📝 Grab as Text
          </button>
          <button
            onClick={() => {
              if (selectionState.bbox) {
                handleObjectGrab({
                  x: selectionState.bbox.x + selectionState.bbox.width / 2,
                  y: selectionState.bbox.y + selectionState.bbox.height / 2
                });
              }
              setShowSettingsPanel(false);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            🎯 Grab as Object
          </button>
        </div>
      </SettingsPanel>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LayerAnythingEditor;