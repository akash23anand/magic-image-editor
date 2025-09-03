import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TextOverlay from '../components/TextOverlay';
import { extractAllElements, filterNoise } from '../utils/textOverlayUtils';

// Mock text data for testing
const mockTextData = {
  blocks: [
    {
      text: "This is a test document with multiple lines of text.",
      confidence: 95,
      bbox: { x0: 50, y0: 50, x1: 400, y1: 100 },
      lines: [
        {
          text: "This is a test document",
          confidence: 98,
          bbox: { x0: 50, y0: 50, x1: 300, y1: 75 },
          words: [
            { text: "This", confidence: 99, bbox: { x0: 50, y0: 50, x1: 80, y1: 75 } },
            { text: "is", confidence: 98, bbox: { x0: 85, y0: 50, x1: 100, y1: 75 } },
            { text: "a", confidence: 97, bbox: { x0: 105, y0: 50, x1: 115, y1: 75 } },
            { text: "test", confidence: 96, bbox: { x0: 120, y0: 50, x1: 150, y1: 75 } },
            { text: "document", confidence: 95, bbox: { x0: 155, y0: 50, x1: 220, y1: 75 } }
          ]
        },
        {
          text: "with multiple lines of text.",
          confidence: 93,
          bbox: { x0: 50, y0: 80, x1: 280, y1: 100 },
          words: [
            { text: "with", confidence: 95, bbox: { x0: 50, y0: 80, x1: 80, y1: 100 } },
            { text: "multiple", confidence: 94, bbox: { x0: 85, y0: 80, x1: 140, y1: 100 } },
            { text: "lines", confidence: 93, bbox: { x0: 145, y0: 80, x1: 180, y1: 100 } },
            { text: "of", confidence: 92, bbox: { x0: 185, y0: 80, x1: 200, y1: 100 } },
            { text: "text.", confidence: 91, bbox: { x0: 205, y0: 80, x1: 240, y1: 100 } }
          ]
        }
      ]
    },
    {
      text: "Low confidence noise",
      confidence: 45,
      bbox: { x0: 10, y0: 10, x1: 30, y1: 25 },
      lines: [
        {
          text: "Low confidence",
          confidence: 45,
          bbox: { x0: 10, y0: 10, x1: 30, y1: 25 },
          words: [
            { text: "Low", confidence: 45, bbox: { x0: 10, y0: 10, x1: 20, y1: 25 } }
          ]
        }
      ]
    }
  ]
};

// Mock image URL
const mockImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('TextOverlay Integration Tests', () => {
  beforeEach(() => {
    // Mock canvas and fabric.js
    HTMLCanvasElement.prototype.getContext = jest.fn();
    global.fabric = {
      Canvas: jest.fn().mockImplementation(() => ({
        clear: jest.fn(),
        add: jest.fn(),
        renderAll: jest.fn(),
        getObjects: jest.fn().mockReturnValue([]),
        dispose: jest.fn(),
        sendToBack: jest.fn(),
        width: 800,
        height: 600
      })),
      Image: {
        fromURL: jest.fn((url, callback) => {
          callback({
            width: 400,
            height: 300,
            scaleX: 1,
            scaleY: 1,
            set: jest.fn(),
            selectable: false,
            evented: false
          });
        })
      },
      IText: jest.fn(),
      Rect: jest.fn()
    };
  });

  describe('TextOverlay Component', () => {
    it('renders without crashing', () => {
      render(
        <TextOverlay 
          imageUrl={mockImageUrl} 
          textData={mockTextData} 
        />
      );
      
      expect(screen.getByText('Highlight Mode:')).toBeInTheDocument();
    });

    it('displays correct statistics', () => {
      render(
        <TextOverlay 
          imageUrl={mockImageUrl} 
          textData={mockTextData} 
        />
      );
      
      expect(screen.getByText(/Total Blocks: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Filtered Blocks: 1/)).toBeInTheDocument();
    });

    it('handles mode switching', () => {
      render(
        <TextOverlay 
          imageUrl={mockImageUrl} 
          textData={mockTextData} 
        />
      );
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'block' } });
      
      expect(select.value).toBe('block');
    });

    it('filters noise correctly', () => {
      const { blocks, lines, words } = extractAllElements(mockTextData);
      
      const filteredBlocks = blocks.filter(block => 
        filterNoise(block, { minConfidence: 70, minArea: 100 })
      );
      
      expect(filteredBlocks).toHaveLength(1);
      expect(filteredBlocks[0].text).toContain('test document');
    });

    it('handles empty text data', () => {
      render(
        <TextOverlay 
          imageUrl={mockImageUrl} 
          textData={null} 
        />
      );
      
      expect(screen.queryByText('Stats:')).not.toBeInTheDocument();
    });

    it('handles text updates', async () => {
      const mockOnTextUpdate = jest.fn();
      
      render(
        <TextOverlay 
          imageUrl={mockImageUrl} 
          textData={mockTextData}
          onTextUpdate={mockOnTextUpdate}
        />
      );
      
      // Simulate text change (would normally be triggered by fabric.js events)
      await waitFor(() => {
        expect(screen.getByText('Instructions:')).toBeInTheDocument();
      });
    });
  });

  describe('Utility Functions', () => {
    it('extracts all elements correctly', () => {
      const { blocks, lines, words } = extractAllElements(mockTextData);
      
      expect(blocks).toHaveLength(2);
      expect(lines).toHaveLength(3);
      expect(words).toHaveLength(10);
    });

    it('filters elements by confidence', () => {
      const { blocks } = extractAllElements(mockTextData);
      const filtered = blocks.filter(block => 
        filterNoise(block, { minConfidence: 80 })
      );
      
      expect(filtered).toHaveLength(1);
    });

    it('filters elements by area', () => {
      const { blocks } = extractAllElements(mockTextData);
      const filtered = blocks.filter(block => 
        filterNoise(block, { minArea: 10000 }) // Very high threshold
      );
      
      expect(filtered).toHaveLength(0);
    });

    it('validates text data structure', () => {
      const { validateTextData } = require('../utils/textOverlayUtils');
      
      expect(validateTextData(mockTextData)).toBe(true);
      expect(validateTextData(null)).toBe(false);
      expect(validateTextData({})).toBe(false);
    });
  });

  describe('Coordinate Mapping', () => {
    it('calculates correct scaling', () => {
      const { calculateCoordinateMapping } = require('../utils/textOverlayUtils');
      
      const mapping = calculateCoordinateMapping(400, 300, 800, 600);
      
      expect(mapping.scale).toBe(2); // 800/400 = 2
      expect(mapping.offsetX).toBe(0);
      expect(mapping.offsetY).toBe(0);
    });

    it('handles aspect ratio differences', () => {
      const { calculateCoordinateMapping } = require('../utils/textOverlayUtils');
      
      const mapping = calculateCoordinateMapping(400, 300, 600, 600);
      
      expect(mapping.scale).toBe(1.5); // min(600/400, 600/300) = 1.5
      expect(mapping.offsetX).toBe(0);
      expect(mapping.offsetY).toBe(75); // (600 - 300*1.5)/2
    });
  });
});