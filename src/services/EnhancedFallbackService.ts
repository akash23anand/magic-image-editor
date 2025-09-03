/**
 * Enhanced Fallback Service for AI features
 * Provides better fallback implementations when AI backends are unavailable
 */

export class EnhancedFallbackService {
  /**
   * Create enhanced gradient backgrounds based on prompt
   */
  static createEnhancedBackground(
    imageData: ImageData,
    prompt: string,
    direction: 'extend' | 'replace' = 'extend'
  ): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;

    // Parse prompt for better gradient generation
    const promptLower = prompt.toLowerCase();
    
    // Determine gradient colors based on prompt
    const colors = this.getGradientColors(promptLower);
    
    // Create gradient based on direction
    let gradient: CanvasGradient;
    
    if (promptLower.includes('right')) {
      gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    } else if (promptLower.includes('left')) {
      gradient = ctx.createLinearGradient(canvas.width, 0, 0, 0);
    } else if (promptLower.includes('top')) {
      gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
    } else if (promptLower.includes('bottom')) {
      gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    } else {
      gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    }

    // Add color stops
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color);
    });

    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Composite original image if extending
    if (direction === 'extend') {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(imageData, 0, 0);

      // Blend with gradient
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.9;
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Get appropriate gradient colors based on prompt keywords
   */
  private static getGradientColors(prompt: string): string[] {
    const colorMap = {
      'sky': ['#87CEEB', '#E0F6FF', '#FFFFFF'],
      'blue': ['#1e3c72', '#2a5298', '#7e8ba3'],
      'sunset': ['#ff7e5f', '#feb47b', '#ffcd94'],
      'nature': ['#134e5e', '#71b280', '#a8e6cf'],
      'forest': ['#134e5e', '#71b280', '#a8e6cf'],
      'ocean': ['#1a2980', '#26d0ce', '#7de2fc'],
      'purple': ['#667eea', '#764ba2', '#f093fb'],
      'pink': ['#ff9a9e', '#fecfef', '#fecfef'],
      'warm': ['#ffecd2', '#fcb69f', '#ff9a9e'],
      'cool': ['#a8edea', '#fed6e3', '#d299c2'],
      'dark': ['#2c3e50', '#34495e', '#7f8c8d'],
      'black': ['#000000', '#434343', '#666666'],
      'white': ['#ffffff', '#f8f9fa', '#e9ecef'],
      'gradient': ['#667eea', '#764ba2', '#f093fb'],
    };

    // Find matching keywords
    for (const [keyword, colors] of Object.entries(colorMap)) {
      if (prompt.includes(keyword)) {
        return colors;
      }
    }

    // Default gradient
    return ['#f0f0f0', '#e0e0e0', '#d0d0d0'];
  }

  /**
   * Create pattern-based backgrounds
   */
  static createPatternBackground(
    imageData: ImageData,
    prompt: string
  ): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;

    // Create pattern based on prompt
    const patternType = this.getPatternType(prompt);
    
    switch (patternType) {
      case 'dots':
        this.createDotPattern(ctx, canvas.width, canvas.height);
        break;
      case 'stripes':
        this.createStripePattern(ctx, canvas.width, canvas.height);
        break;
      case 'waves':
        this.createWavePattern(ctx, canvas.width, canvas.height);
        break;
      default:
        this.createGradientPattern(ctx, canvas.width, canvas.height, prompt);
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  private static getPatternType(prompt: string): string {
    if (prompt.includes('dot') || prompt.includes('polka')) return 'dots';
    if (prompt.includes('stripe') || prompt.includes('line')) return 'stripes';
    if (prompt.includes('wave') || prompt.includes('curve')) return 'waves';
    return 'gradient';
  }

  private static createDotPattern(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#d0d0d0';
    const spacing = 20;
    for (let x = 0; x < width; x += spacing) {
      for (let y = 0; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x + spacing/2, y + spacing/2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private static createStripePattern(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#f0f0f0');
    gradient.addColorStop(0.5, '#e0e0e0');
    gradient.addColorStop(1, '#f0f0f0');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private static createWavePattern(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      for (let x = 0; x < width; x += 5) {
        const waveY = y + Math.sin(x * 0.02) * 10;
        if (x === 0) {
          ctx.moveTo(x, waveY);
        } else {
          ctx.lineTo(x, waveY);
        }
      }
      ctx.stroke();
    }
  }

  private static createGradientPattern(ctx: CanvasRenderingContext2D, width: number, height: number, prompt: string) {
    const colors = this.getGradientColors(prompt.toLowerCase());
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}