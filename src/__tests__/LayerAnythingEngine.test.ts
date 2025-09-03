/**
 * Test suite for Layer Anything Engine
 * Comprehensive tests for the core layering functionality
 */

import { layerAnythingEngine, LayerAnythingEngine, BaseLayerMeta, TextLayerMeta, ObjectLayerMeta } from '../services/LayerAnythingEngine';
import { ocrService } from '../services/OCRService';
import { segmentationService } from '../services/SegmentationService';

// Mock dependencies
jest.mock('../services/OCRService');
jest.mock('../services/SegmentationService');
jest.mock('../utils/E2ELogger');

describe('LayerAnythingEngine', () => {
  let engine: LayerAnythingEngine;
  const mockImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const mockImageDimensions = { width: 800, height: 600 };

  beforeEach(() => {
    engine = new LayerAnythingEngine();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize layer graph from image', async () => {
      const graphId = await engine.initializeFromImage(mockImageUrl, mockImageDimensions);
      
      expect(graphId).toBeDefined();
      expect(typeof graphId).toBe('string');
      
      const layers = engine.getLayers();
      expect(layers).toHaveLength(1); // Should have background layer
      expect(layers[0].type).toBe('background');
    });

    it('should create background layer with correct properties', async () => {
      await engine.initializeFromImage(mockImageUrl, mockImageDimensions);
      
      const layers = engine.getLayers();
      const backgroundLayer = layers[0];
      
      expect(backgroundLayer.type).toBe('background');
      expect(backgroundLayer.name).toBe('Background');
      expect(backgroundLayer.visible).toBe(true);
      expect(backgroundLayer.locked).toBe(false);
      expect(backgroundLayer.opacity).toBe(1);
      expect(backgroundLayer.bbox).toEqual({
        x: 0,
        y: 0,
        width: mockImageDimensions.width,
        height: mockImageDimensions.height
      });
    });
  });

  describe('Text Layer Creation', () => {
    beforeEach(async () => {
      await engine.initializeFromImage(mockImageUrl, mockImageDimensions);
    });

    it('should create text layer from OCR result', async () => {
      const mockOCRBlock = {
        text: 'Sample text',
        bbox: { x: 100, y: 100, width: 200, height: 50 },
        confidence: 0.9,
        type: 'paragraph' as const,
        language: 'en'
      };

      const layerId = await engine.createTextLayer(mockOCRBlock);
      
      expect(layerId).toBeDefined();
      
      const layer = engine.getLayer(layerId) as TextLayerMeta;
      expect(layer).toBeDefined();
      expect(layer.type).toBe('text');
      expect(layer.text).toBe('Sample text');
      expect(layer.bbox).toEqual(mockOCRBlock.bbox);
      expect(layer.scores?.ocr).toBe(0.9);
      expect(layer.granularity).toBe('paragraph');
    });

    it('should generate appropriate layer name for text', async () => {
      const mockOCRBlock = {
        text: 'This is a very long text that should be truncated in the layer name',
        bbox: { x: 0, y: 0, width: 100, height: 20 },
        confidence: 0.8,
        type: 'line' as const
      };

      const layerId = await engine.createTextLayer(mockOCRBlock);
      const layer = engine.getLayer(layerId);
      
      expect(layer?.name).toContain('This is a very long');
      expect(layer?.name).toContain('...');
    });

    it('should estimate font properties', async () => {
      const mockOCRBlock = {
        text: 'Test',
        bbox: { x: 0, y: 0, width: 100, height: 24 },
        confidence: 0.8,
        type: 'word' as const
      };

      const layerId = await engine.createTextLayer(mockOCRBlock);
      const layer = engine.getLayer(layerId) as TextLayerMeta;
      
      expect(layer.fontEstimate).toBeDefined();
      expect(layer.fontEstimate?.size).toBeGreaterThan(0);
      expect(layer.fontEstimate?.family).toBeDefined();
      expect(layer.textGeometry).toBeDefined();
    });
  });

  describe('Object Layer Creation', () => {
    beforeEach(async () => {
      await engine.initializeFromImage(mockImageUrl, mockImageDimensions);
    });

    it('should create object layer from mask and bbox', async () => {
      const mockMask = {
        counts: [100, 50, 100],
        size: [200, 100] as [number, number]
      };
      const mockBBox = { x: 50, y: 50, width: 200, height: 100 };

      const layerId = await engine.createObjectLayer(mockMask, mockBBox, {
        category: 'person'
      });
      
      expect(layerId).toBeDefined();
      
      const layer = engine.getLayer(layerId) as ObjectLayerMeta;
      expect(layer).toBeDefined();
      expect(layer.type).toBe('object');
      expect(layer.category).toBe('person');
      expect(layer.bbox).toEqual(mockBBox);
      expect(layer.mask).toEqual(mockMask);
    });

    it('should set default category if not provided', async () => {
      const mockMask = {
        counts: [100, 50, 100],
        size: [200, 100] as [number, number]
      };
      const mockBBox = { x: 0, y: 0, width: 100, height: 100 };

      const layerId = await engine.createObjectLayer(mockMask, mockBBox);
      const layer = engine.getLayer(layerId) as ObjectLayerMeta;
      
      expect(layer.name).toBe('Object');
    });
  });

  describe('Layer Management', () => {
    let textLayerId: string;
    let objectLayerId: string;

    beforeEach(async () => {
      await engine.initializeFromImage(mockImageUrl, mockImageDimensions);
      
      // Create test layers
      textLayerId = await engine.createTextLayer({
        text: 'Test text',
        bbox: { x: 100, y: 100, width: 200, height: 50 },
        confidence: 0.9,
        type: 'paragraph'
      });

      objectLayerId = await engine.createObjectLayer(
        { counts: [100, 50], size: [150, 100] },
        { x: 200, y: 200, width: 150, height: 100 }
      );
    });

    it('should move layer correctly', () => {
      const delta = { x: 50, y: 30 };
      const success = engine.moveLayer(textLayerId, delta);
      
      expect(success).toBe(true);
      
      const layer = engine.getLayer(textLayerId);
      expect(layer?.currentTransform.offsetX).toBe(delta.x);
      expect(layer?.currentTransform.offsetY).toBe(delta.y);
    });

    it('should resize layer correctly', () => {
      const scale = 1.5;
      const success = engine.resizeLayer(textLayerId, scale);
      
      expect(success).toBe(true);
      
      const layer = engine.getLayer(textLayerId);
      expect(layer?.currentTransform.scale).toBe(scale);
    });

    it('should not move locked layer', async () => {
      // Lock the layer
      const layer = engine.getLayer(textLayerId);
      if (layer) {
        layer.locked = true;
      }

      const success = engine.moveLayer(textLayerId, { x: 10, y: 10 });
      expect(success).toBe(false);
    });

    it('should return layers sorted by z-index', () => {
      const layers = engine.getLayers();
      
      // Should have background (z=0), text (z=1), object (z=2)
      expect(layers).toHaveLength(3);
      expect(layers[0].zIndex).toBeLessThan(layers[1].zIndex);
      expect(layers[1].zIndex).toBeLessThan(layers[2].zIndex);
    });
  });

  describe('Background Layer Management', () => {
    beforeEach(async () => {
      await engine.initializeFromImage(mockImageUrl, mockImageDimensions);
    });

    it('should update background layer with excluded layers', async () => {
      const textLayerId = await engine.createTextLayer({
        text: 'Test',
        bbox: { x: 0, y: 0, width: 100, height: 20 },
        confidence: 0.8,
        type: 'word'
      });

      await engine.updateBackgroundLayer([textLayerId]);
      
      const layers = engine.getLayers();
      const backgroundLayer = layers[0];
      
      expect(backgroundLayer.type).toBe('background');
      expect((backgroundLayer as any).excludedLayers).toContain(textLayerId);
    });
  });

  describe('Export Functionality', () => {
    beforeEach(async () => {
      await engine.initializeFromImage(mockImageUrl, mockImageDimensions);
    });

    it('should export layer graph to JSON', async () => {
      await engine.createTextLayer({
        text: 'Export test',
        bbox: { x: 0, y: 0, width: 100, height: 20 },
        confidence: 0.8,
        type: 'word'
      });

      const exportData = engine.exportToJSON();
      
      expect(exportData).toBeDefined();
      expect(typeof exportData).toBe('string');
      
      const parsed = JSON.parse(exportData);
      expect(parsed.layers).toBeDefined();
      expect(parsed.sourceImage).toBeDefined();
      expect(parsed.exportedAt).toBeDefined();
    });

    it('should include all layer metadata in export', async () => {
      const layerId = await engine.createTextLayer({
        text: 'Metadata test',
        bbox: { x: 10, y: 10, width: 100, height: 20 },
        confidence: 0.95,
        type: 'word'
      });

      const exportData = engine.exportToJSON();
      const parsed = JSON.parse(exportData);
      
      const exportedLayers = parsed.layers;
      const textLayer = exportedLayers.find((l: any) => l[1].id === layerId);
      
      expect(textLayer).toBeDefined();
      expect(textLayer[1].text).toBe('Metadata test');
      expect(textLayer[1].scores.ocr).toBe(0.95);
      expect(textLayer[1].history).toBeDefined();
      expect(textLayer[1].createdAt).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when creating layer without initialization', async () => {
      const uninitializedEngine = new LayerAnythingEngine();
      
      await expect(uninitializedEngine.createTextLayer({
        text: 'Test',
        bbox: { x: 0, y: 0, width: 100, height: 20 },
        confidence: 0.8,
        type: 'word'
      })).rejects.toThrow('Layer graph not initialized');
    });

    it('should handle invalid layer operations gracefully', () => {
      const success = engine.moveLayer('non-existent-id', { x: 10, y: 10 });
      expect(success).toBe(false);
    });

    it('should return null for non-existent layer', () => {
      const layer = engine.getLayer('non-existent-id');
      expect(layer).toBeNull();
    });
  });

  describe('Layer History Tracking', () => {
    beforeEach(async () => {
      await engine.initializeFromImage(mockImageUrl, mockImageDimensions);
    });

    it('should track layer creation in history', async () => {
      const layerId = await engine.createTextLayer({
        text: 'History test',
        bbox: { x: 0, y: 0, width: 100, height: 20 },
        confidence: 0.8,
        type: 'word'
      });

      const layer = engine.getLayer(layerId);
      
      expect(layer?.history).toHaveLength(1);
      expect(layer?.history[0].operation).toBe('create_text_layer');
      expect(layer?.history[0].timestamp).toBeDefined();
    });

    it('should track layer movements in history', async () => {
      const layerId = await engine.createTextLayer({
        text: 'Move test',
        bbox: { x: 0, y: 0, width: 100, height: 20 },
        confidence: 0.8,
        type: 'word'
      });

      engine.moveLayer(layerId, { x: 10, y: 20 });
      
      const layer = engine.getLayer(layerId);
      
      expect(layer?.history).toHaveLength(2);
      expect(layer?.history[1].operation).toBe('move_layer');
      expect(layer?.history[1].params).toEqual({ delta: { x: 10, y: 20 } });
    });
  });

  describe('Performance and Memory', () => {
    beforeEach(async () => {
      await engine.initializeFromImage(mockImageUrl, mockImageDimensions);
    });

    it('should handle multiple layers efficiently', async () => {
      const startTime = performance.now();
      
      // Create multiple layers
      const layerPromises = [];
      for (let i = 0; i < 50; i++) {
        layerPromises.push(engine.createTextLayer({
          text: `Layer ${i}`,
          bbox: { x: i * 10, y: i * 5, width: 100, height: 20 },
          confidence: 0.8,
          type: 'word'
        }));
      }
      
      await Promise.all(layerPromises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
      
      const layers = engine.getLayers();
      expect(layers).toHaveLength(51); // 50 text + 1 background
    });

    it('should calculate area percentages correctly', async () => {
      const layerId = await engine.createTextLayer({
        text: 'Area test',
        bbox: { x: 0, y: 0, width: 80, height: 60 }, // 4800 pixels
        confidence: 0.8,
        type: 'word'
      });

      const layer = engine.getLayer(layerId);
      
      // Image is 800x600 = 480000 pixels
      // Layer is 80x60 = 4800 pixels
      // Percentage should be 1%
      expect(layer?.areaPct).toBeCloseTo(1, 1);
    });
  });
});