/**
 * LayerManager - Manages multiple grabbed objects as layers
 * Similar to Photoshop's layer system
 */

// Simple ID generator
let idCounter = 0;
const generateId = () => `layer-${Date.now()}-${++idCounter}`;

export interface Layer {
  id: string;
  name: string;
  canvas: OffscreenCanvas | HTMLCanvasElement;
  position: { x: number; y: number };
  visible: boolean;
  opacity: number;
  selected: boolean;
  originalPosition: { x: number; y: number };
  zIndex: number;
}

export class LayerManager {
  private layers: Map<string, Layer> = new Map();
  private layerOrder: string[] = [];
  private selectedLayerId: string | null = null;
  private nextZIndex: number = 1;

  /**
   * Add a new layer
   */
  addLayer(options: {
    canvas: OffscreenCanvas | HTMLCanvasElement;
    position: { x: number; y: number };
    name?: string;
  }): string {
    const id = generateId();
    const layer: Layer = {
      id,
      name: options.name || `Layer ${this.layers.size + 1}`,
      canvas: options.canvas,
      position: { ...options.position },
      originalPosition: { ...options.position },
      visible: true,
      opacity: 1,
      selected: false,
      zIndex: this.nextZIndex++
    };

    // Deselect all other layers
    this.layers.forEach(l => l.selected = false);

    this.layers.set(id, layer);
    this.layerOrder.push(id);
    this.selectedLayerId = id;

    return id;
  }

  /**
   * Remove a layer
   */
  removeLayer(id: string): boolean {
    if (!this.layers.has(id)) return false;

    this.layers.delete(id);
    this.layerOrder = this.layerOrder.filter(layerId => layerId !== id);

    if (this.selectedLayerId === id) {
      this.selectedLayerId = this.layerOrder.length > 0 
        ? this.layerOrder[this.layerOrder.length - 1] 
        : null;
    }

    return true;
  }

  /**
   * Move a layer to a new position
   */
  moveLayer(id: string, position: { x: number; y: number }): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;

    layer.position = { ...position };
    return true;
  }

  /**
   * Nudge a layer by a certain amount
   */
  nudgeLayer(id: string, dx: number, dy: number): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;

    layer.position.x += dx;
    layer.position.y += dy;
    return true;
  }

  /**
   * Toggle layer visibility
   */
  toggleLayerVisibility(id: string): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;

    layer.visible = !layer.visible;
    return true;
  }

  /**
   * Set layer opacity
   */
  setLayerOpacity(id: string, opacity: number): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;

    layer.opacity = Math.max(0, Math.min(1, opacity));
    return true;
  }

  /**
   * Select a layer
   */
  selectLayer(id: string): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;

    // Deselect all layers
    this.layers.forEach(l => l.selected = false);
    
    layer.selected = true;
    this.selectedLayerId = id;
    
    // Move to top
    this.moveLayerToTop(id);
    
    return true;
  }

  /**
   * Duplicate a layer
   */
  duplicateLayer(id: string): string | null {
    const layer = this.layers.get(id);
    if (!layer) return null;

    // Create a copy of the canvas
    const newCanvas = document.createElement('canvas');
    newCanvas.width = layer.canvas.width;
    newCanvas.height = layer.canvas.height;
    const ctx = newCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(layer.canvas as any, 0, 0);

    // Add new layer with offset position
    const newId = this.addLayer({
      canvas: newCanvas,
      position: {
        x: layer.position.x + 20,
        y: layer.position.y + 20
      },
      name: `${layer.name} copy`
    });

    return newId;
  }

  /**
   * Move layer to top of stack
   */
  moveLayerToTop(id: string): boolean {
    const layer = this.layers.get(id);
    if (!layer) return false;

    layer.zIndex = this.nextZIndex++;
    return true;
  }

  /**
   * Get all layers in z-order
   */
  getLayers(): Layer[] {
    return Array.from(this.layers.values())
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Get selected layer
   */
  getSelectedLayer(): Layer | null {
    return this.selectedLayerId ? this.layers.get(this.selectedLayerId) || null : null;
  }

  /**
   * Render all layers to a canvas
   */
  renderToCanvas(
    targetCanvas: HTMLCanvasElement,
    baseImage?: HTMLImageElement | HTMLCanvasElement
  ): void {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    // Draw base image if provided
    if (baseImage) {
      ctx.drawImage(baseImage, 0, 0);
    }

    // Draw all visible layers in z-order
    const layers = this.getLayers();
    for (const layer of layers) {
      if (!layer.visible) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layer.canvas as any, layer.position.x, layer.position.y);
      
      // Draw selection outline if selected
      if (layer.selected) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          layer.position.x - 1,
          layer.position.y - 1,
          layer.canvas.width + 2,
          layer.canvas.height + 2
        );
      }
      
      ctx.restore();
    }
  }

  /**
   * Get layer at a specific point
   */
  getLayerAtPoint(x: number, y: number): Layer | null {
    // Check layers in reverse z-order (top to bottom)
    const layers = this.getLayers().reverse();
    
    for (const layer of layers) {
      if (!layer.visible) continue;
      
      const { position, canvas } = layer;
      if (
        x >= position.x &&
        x <= position.x + canvas.width &&
        y >= position.y &&
        y <= position.y + canvas.height
      ) {
        return layer;
      }
    }
    
    return null;
  }

  /**
   * Clear all layers
   */
  clear(): void {
    this.layers.clear();
    this.layerOrder = [];
    this.selectedLayerId = null;
    this.nextZIndex = 1;
  }

  /**
   * Export layer data for serialization
   */
  exportLayers(): any[] {
    return this.getLayers().map(layer => ({
      id: layer.id,
      name: layer.name,
      position: layer.position,
      visible: layer.visible,
      opacity: layer.opacity,
      imageData: this.canvasToDataURL(layer.canvas)
    }));
  }

  /**
   * Import layers from serialized data
   */
  async importLayers(data: any[]): Promise<void> {
    this.clear();
    
    for (const layerData of data) {
      const canvas = await this.dataURLToCanvas(layerData.imageData);
      if (!canvas) continue;
      
      const id = this.addLayer({
        canvas,
        position: layerData.position,
        name: layerData.name
      });
      
      const layer = this.layers.get(id);
      if (layer) {
        layer.visible = layerData.visible;
        layer.opacity = layerData.opacity;
      }
    }
  }

  private canvasToDataURL(canvas: OffscreenCanvas | HTMLCanvasElement): string {
    if (canvas instanceof HTMLCanvasElement) {
      return canvas.toDataURL();
    } else {
      // For OffscreenCanvas, we need to convert to blob first
      // This is a simplified version - in production, this would be async
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas as any, 0, 0);
        return tempCanvas.toDataURL();
      }
      return '';
    }
  }

  private async dataURLToCanvas(dataURL: string): Promise<HTMLCanvasElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas);
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataURL;
    });
  }
}

// Export singleton instance
export const layerManager = new LayerManager();
