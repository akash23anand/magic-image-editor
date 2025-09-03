import { U2NetService } from '../services/U2NetService';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: any;
}

export class U2NetModelValidator {
  private service: U2NetService;

  constructor() {
    this.service = new U2NetService();
  }

  async validateModel(): Promise<ValidationResult> {
    try {
      console.log('Starting U²-Net model validation...');
      
      // Test model loading
      await this.service.initialize();
      
      // Create a simple test image
      const testImage = this.createTestImage();
      
      // Test inference
      const result = await this.service.removeBackground(testImage, {
        sensitivity: 0.5,
        edgeFeather: 0,
        preserveEdges: false
      });
      
      console.log('Model validation successful:', {
        imageSize: `${result.imageData.width}x${result.imageData.height}`,
        metadata: result.metadata
      });
      
      return {
        valid: true,
        details: {
          modelLoaded: true,
          inferenceSuccessful: true,
          outputSize: `${result.imageData.width}x${result.imageData.height}`
        }
      };
    } catch (error) {
      console.error('Model validation failed:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private createTestImage(): ImageData {
    const width = 320;
    const height = 320;
    const data = new Uint8ClampedArray(width * height * 4);
    
    // Create a simple test pattern
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;     // R
      data[i + 1] = 0;   // G
      data[i + 2] = 0;   // B
      data[i + 3] = 255; // A
    }
    
    return new ImageData(data, width, height);
  }
}

// Export validator for debugging
export const modelValidator = new U2NetModelValidator();