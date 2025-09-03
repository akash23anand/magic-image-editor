/**
 * Coordinate conversion helpers for consistent transformation between canvas and image space
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformInfo {
  scale: number;
  offsetX: number;
  offsetY: number;
  imageWidth: number;
  imageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Calculate the transform info for fitting an image into a canvas
 */
export function calculateTransform(
  imageDimensions: ImageDimensions,
  canvasDimensions: CanvasDimensions
): TransformInfo {
  const { width: imageWidth, height: imageHeight } = imageDimensions;
  const { width: canvasWidth, height: canvasHeight } = canvasDimensions;

  // Calculate scale to fit image in canvas while maintaining aspect ratio
  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;
  const scale = Math.min(scaleX, scaleY);

  // Calculate the actual dimensions of the scaled image
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;

  // Calculate offsets to center the image in the canvas
  const offsetX = (canvasWidth - scaledWidth) / 2;
  const offsetY = (canvasHeight - scaledHeight) / 2;

  return {
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight,
    canvasWidth,
    canvasHeight
  };
}

/**
 * Convert a point from canvas coordinates to image coordinates
 * Simplified naming: c2i
 */
export function canvasToImage(point: Point, transform: TransformInfo): Point {
  return {
    x: Math.round((point.x - transform.offsetX) / transform.scale),
    y: Math.round((point.y - transform.offsetY) / transform.scale)
  };
}

/**
 * Convert a point from image coordinates to canvas coordinates
 * Simplified naming: i2c
 */
export function imageToCanvas(point: Point, transform: TransformInfo): Point {
  return {
    x: point.x * transform.scale + transform.offsetX,
    y: point.y * transform.scale + transform.offsetY
  };
}

// Simplified aliases for easier use
export const c2i = canvasToImage;
export const i2c = imageToCanvas;

/**
 * Convert a rectangle from canvas coordinates to image coordinates
 */
export function canvasRectToImage(rect: Rectangle, transform: TransformInfo): Rectangle {
  const topLeft = canvasToImage({ x: rect.x, y: rect.y }, transform);
  const bottomRight = canvasToImage({ x: rect.x + rect.width, y: rect.y + rect.height }, transform);
  
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: Math.max(1, bottomRight.x - topLeft.x),
    height: Math.max(1, bottomRight.y - topLeft.y)
  };
}

/**
 * Convert a rectangle from image coordinates to canvas coordinates
 */
export function imageRectToCanvas(rect: Rectangle, transform: TransformInfo): Rectangle {
  const topLeft = imageToCanvas({ x: rect.x, y: rect.y }, transform);
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: rect.width * transform.scale,
    height: rect.height * transform.scale
  };
}

/**
 * Clamp a rectangle to image bounds
 */
export function clampRectToImage(rect: Rectangle, imageDimensions: ImageDimensions): Rectangle {
  const x = Math.max(0, Math.min(rect.x, imageDimensions.width));
  const y = Math.max(0, Math.min(rect.y, imageDimensions.height));
  const width = Math.max(0, Math.min(rect.width, imageDimensions.width - x));
  const height = Math.max(0, Math.min(rect.height, imageDimensions.height - y));

  return { x, y, width, height };
}

/**
 * Check if a point is within the image bounds on the canvas
 */
export function isPointInImage(point: Point, transform: TransformInfo): boolean {
  const imagePoint = canvasToImage(point, transform);
  return (
    imagePoint.x >= 0 &&
    imagePoint.x <= transform.imageWidth &&
    imagePoint.y >= 0 &&
    imagePoint.y <= transform.imageHeight
  );
}

/**
 * Get the visible image area on the canvas
 */
export function getImageAreaOnCanvas(transform: TransformInfo): Rectangle {
  return {
    x: transform.offsetX,
    y: transform.offsetY,
    width: transform.imageWidth * transform.scale,
    height: transform.imageHeight * transform.scale
  };
}