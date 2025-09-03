/**
 * Text Overlay Utilities
 * Provides coordinate mapping, noise filtering, and highlight utilities
 */

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TextElement {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface NoiseFilterOptions {
  minConfidence?: number;
  minArea?: number;
  maxAspectRatio?: number;
}

export interface CoordinateMapping {
  scale: number;
  offsetX: number;
  offsetY: number;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Filter text elements based on confidence and area
 */
export function filterNoise(
  element: TextElement,
  options: NoiseFilterOptions = {}
): boolean {
  const {
    minConfidence = 70,
    minArea = 100,
    maxAspectRatio = 10
  } = options;

  const area = (element.bbox.x1 - element.bbox.x0) * (element.bbox.y1 - element.bbox.y0);
  const width = element.bbox.x1 - element.bbox.x0;
  const height = element.bbox.y1 - element.bbox.y0;
  const aspectRatio = Math.max(width / height, height / width);

  return (
    element.confidence >= minConfidence &&
    area >= minArea &&
    aspectRatio <= maxAspectRatio
  );
}

/**
 * Calculate coordinate mapping from image space to canvas space
 */
export function calculateCoordinateMapping(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): CoordinateMapping {
  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;
  const scale = Math.min(scaleX, scaleY);
  
  const offsetX = (canvasWidth - imageWidth * scale) / 2;
  const offsetY = (canvasHeight - imageHeight * scale) / 2;

  return {
    scale,
    offsetX,
    offsetY,
    canvasWidth,
    canvasHeight
  };
}

/**
 * Transform bounding box from image coordinates to canvas coordinates
 */
export function transformBoundingBox(
  bbox: BoundingBox,
  mapping: CoordinateMapping
): BoundingBox {
  return {
    x0: bbox.x0 * mapping.scale + mapping.offsetX,
    y0: bbox.y0 * mapping.scale + mapping.offsetY,
    x1: bbox.x1 * mapping.scale + mapping.offsetX,
    y1: bbox.y1 * mapping.scale + mapping.offsetY
  };
}

/**
 * Merge adjacent bounding boxes
 */
export function mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox {
  if (boxes.length === 0) {
    return { x0: 0, y0: 0, x1: 0, y1: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  boxes.forEach(box => {
    minX = Math.min(minX, box.x0);
    minY = Math.min(minY, box.y0);
    maxX = Math.max(maxX, box.x1);
    maxY = Math.max(maxY, box.y1);
  });

  return {
    x0: minX,
    y0: minY,
    x1: maxX,
    y1: maxY
  };
}

/**
 * Calculate text density for a given area
 */
export function calculateTextDensity(
  elements: TextElement[],
  bbox: BoundingBox
): number {
  const area = (bbox.x1 - bbox.x0) * (bbox.y1 - bbox.y0);
  if (area === 0) return 0;

  const textArea = elements.reduce((total, element) => {
    const elementArea = (element.bbox.x1 - element.bbox.x0) * (element.bbox.y1 - element.bbox.y0);
    return total + elementArea;
  }, 0);

  return textArea / area;
}

/**
 * Group text elements by proximity
 */
export function groupByProximity(
  elements: TextElement[],
  maxDistance: number = 20
): TextElement[][] {
  if (elements.length === 0) return [];

  const groups: TextElement[][] = [];
  const used = new Set<number>();

  elements.forEach((element, index) => {
    if (used.has(index)) return;

    const group: TextElement[] = [element];
    used.add(index);

    // Find nearby elements
    elements.forEach((other, otherIndex) => {
      if (used.has(otherIndex)) return;

      const distance = calculateDistance(element.bbox, other.bbox);
      if (distance <= maxDistance) {
        group.push(other);
        used.add(otherIndex);
      }
    });

    groups.push(group);
  });

  return groups;
}

/**
 * Calculate distance between two bounding boxes
 */
export function calculateDistance(bbox1: BoundingBox, bbox2: BoundingBox): number {
  const center1 = {
    x: (bbox1.x0 + bbox1.x1) / 2,
    y: (bbox1.y0 + bbox1.y1) / 2
  };
  
  const center2 = {
    x: (bbox2.x0 + bbox2.x1) / 2,
    y: (bbox2.y0 + bbox2.y1) / 2
  };

  return Math.sqrt(
    Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
  );
}

/**
 * Optimize text layout for better readability
 */
export function optimizeTextLayout(
  elements: TextElement[],
  options: {
    lineSpacing?: number;
    wordSpacing?: number;
    minLineHeight?: number;
  } = {}
): TextElement[] {
  const {
    lineSpacing = 1.2,
    wordSpacing = 0.5,
    minLineHeight = 12
  } = options;

  // Sort elements by y-coordinate, then x-coordinate
  const sorted = [...elements].sort((a, b) => {
    if (Math.abs(a.bbox.y0 - b.bbox.y0) < minLineHeight) {
      return a.bbox.x0 - b.bbox.x0;
    }
    return a.bbox.y0 - b.bbox.y0;
  });

  return sorted;
}

/**
 * Detect reading direction (horizontal/vertical)
 */
export function detectReadingDirection(elements: TextElement[]): 'horizontal' | 'vertical' {
  if (elements.length < 2) return 'horizontal';

  const horizontalVariance = elements.reduce((sum, element, index) => {
    if (index === 0) return 0;
    const prev = elements[index - 1];
    return sum + Math.abs(element.bbox.y0 - prev.bbox.y0);
  }, 0);

  const verticalVariance = elements.reduce((sum, element, index) => {
    if (index === 0) return 0;
    const prev = elements[index - 1];
    return sum + Math.abs(element.bbox.x0 - prev.bbox.x0);
  }, 0);

  return horizontalVariance < verticalVariance ? 'horizontal' : 'vertical';
}

/**
 * Create highlight styles for different modes
 */
export function getHighlightStyles(mode: 'block' | 'line' | 'word') {
  const styles = {
    block: {
      fill: 'rgba(255, 255, 0, 0.2)',
      stroke: '#ff6600',
      strokeWidth: 2
    },
    line: {
      fill: 'rgba(173, 216, 230, 0.3)',
      stroke: '#0066cc',
      strokeWidth: 1
    },
    word: {
      fill: 'rgba(255, 255, 255, 0.8)',
      stroke: '#0066cc',
      strokeWidth: 1
    }
  };

  return styles[mode];
}

/**
 * Validate text data structure
 */
export function validateTextData(data: any): boolean {
  if (!data || !data.blocks) return false;
  
  return data.blocks.every((block: any) => 
    block.bbox && 
    typeof block.bbox.x0 === 'number' &&
    typeof block.bbox.y0 === 'number' &&
    typeof block.bbox.x1 === 'number' &&
    typeof block.bbox.y1 === 'number' &&
    typeof block.confidence === 'number' &&
    Array.isArray(block.lines)
  );
}

/**
 * Extract all text elements from text data
 */
export function extractAllElements(data: any): {
  blocks: TextElement[];
  lines: TextElement[];
  words: TextElement[];
} {
  const blocks: TextElement[] = [];
  const lines: TextElement[] = [];
  const words: TextElement[] = [];

  const blocksData = data?.blocks || data?.textData?.blocks || [];
  
  blocksData.forEach((block: any) => {
    blocks.push({
      text: block.text || '',
      confidence: block.confidence || 0,
      bbox: block.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 }
    });

    (block.lines || []).forEach((line: any) => {
      lines.push({
        text: line.text || '',
        confidence: line.confidence || 0,
        bbox: line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 }
      });

      (line.words || []).forEach((word: any) => {
        words.push({
          text: word.text || '',
          confidence: word.confidence || 0,
          bbox: word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 }
        });
      });
    });
  });

  return { blocks, lines, words };
}