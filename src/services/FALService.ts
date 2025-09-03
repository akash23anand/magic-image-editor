/**
 * FAL.ai Service
 * Client-side integration using @fal-ai/client for image generation and editing
 * Reads credentials from import.meta.env.FAL_Key (exposed via Vite envPrefix)
 */

import { e2eLogger } from '../utils/E2ELogger';

// Lazy import to avoid bundling if unused
let falClient: typeof import('@fal-ai/client') | null = null;

async function getFal() {
  if (!falClient) {
    try {
      falClient = await import('@fal-ai/client');
    } catch (err) {
      throw new Error("Missing '@fal-ai/client'. Run: npm i @fal-ai/client");
    }
    const creds = (import.meta as any).env?.FAL_Key as string | undefined;
    if (!creds) {
      throw new Error('FAL credentials missing. Set FAL_Key in .env and restart dev server.');
    }
    falClient.fal.config({ credentials: creds });
  }
  return falClient.fal;
}

async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob from canvas'));
    }, 'image/png');
  });
}

async function resizeImageDataToMax(imageData: ImageData, maxSide: number): Promise<{ blob: Blob; width: number; height: number }> {
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(imageData, 0, 0);

  const scale = Math.min(1, maxSide / Math.max(imageData.width, imageData.height));
  if (scale === 1) {
    return { blob: await imageDataToBlob(imageData), width: imageData.width, height: imageData.height };
  }

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = Math.max(1, Math.round(imageData.width * scale));
  dstCanvas.height = Math.max(1, Math.round(imageData.height * scale));
  const dstCtx = dstCanvas.getContext('2d')!;
  dstCtx.imageSmoothingEnabled = true;
  dstCtx.imageSmoothingQuality = 'high';
  dstCtx.drawImage(srcCanvas, 0, 0, dstCanvas.width, dstCanvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    dstCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to create resized blob'))), 'image/png', 0.92);
  });
  return { blob, width: dstCanvas.width, height: dstCanvas.height };
}

async function blobFromUrl(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch FAL image: ${res.statusText}`);
  return await res.blob();
}

export class FALService {
  // Default model slugs. You can adjust these to your preferred FAL models.
  // Ensure these slugs match available models in your FAL account.
  private models = {
    bgGenerator: (import.meta as any).env?.FAL_BG_MODEL || 'fal-ai/flux-pro/v1.1',
    inpaint: (import.meta as any).env?.FAL_INPAINT_MODEL || 'fal-ai/flux-pro/inpainting',
    // These may need adjustment per FAL docs; left as placeholders by design
    edit: (import.meta as any).env?.FAL_EDIT_MODEL || 'fal-ai/instruct-pix2pix',
    outpaint: (import.meta as any).env?.FAL_OUTPAINT_MODEL || 'fal-ai/flux-pro/outpainting'
  };

  setModels(models: Partial<typeof this.models>) {
    this.models = { ...this.models, ...models };
  }

  async generateBackground(
    prompt: string,
    width: number = 512,
    height: number = 512,
  ): Promise<Blob> {
    const fal = await getFal();
    e2eLogger.info('FALService', 'txt2img_start', { model: this.models.bgGenerator });

    // Many FAL generation routes expect a discrete image_size option instead of raw width/height.
    // Map our canvas aspect ratio to a generic size label to avoid schema validation errors.
    const aspect = width / Math.max(1, height);
    const image_size = Math.abs(aspect - 1) < 0.05 ? 'square' : (aspect > 1 ? 'landscape' : 'portrait');

    const result = await fal.subscribe(this.models.bgGenerator, {
      input: {
        prompt,
        image_size
      }
    });

    const url = (result as any)?.images?.[0]?.url || (result as any)?.image?.url;
    if (!url) throw new Error('FAL: No image URL returned');
    return await blobFromUrl(url);
  }

  async inpaint(
    imageData: ImageData,
    maskData: ImageData,
    prompt: string = ''
  ): Promise<Blob> {
    const fal = await getFal();
    e2eLogger.info('FALService', 'inpaint_start', { model: this.models.inpaint });

    const [imageBlob, maskBlob] = await Promise.all([
      imageDataToBlob(imageData),
      imageDataToBlob(maskData)
    ]);

    const imageFile = new File([imageBlob], 'image.png', { type: 'image/png' });
    const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });

    const [imageRef, maskRef] = await Promise.all([
      fal.storage.upload(imageFile),
      fal.storage.upload(maskFile)
    ]);

    const result = await fal.subscribe(this.models.inpaint, {
      input: {
        prompt,
        image_url: imageRef.url,
        mask_url: maskRef.url
      }
    });

    const url = (result as any)?.images?.[0]?.url || (result as any)?.image?.url;
    if (!url) throw new Error('FAL: No image URL returned from inpaint');
    return await blobFromUrl(url);
  }

  async edit(
    imageData: ImageData,
    prompt: string
  ): Promise<Blob> {
    // Depending on model, this may be instruct-pix2pix like
    const fal = await getFal();
    e2eLogger.info('FALService', 'edit_start', { model: this.models.edit });

    // Resize large images to improve acceptance and avoid 413
    const { blob: imageBlob } = await resizeImageDataToMax(imageData, 1280);
    const imageFile = new File([imageBlob], 'image.png', { type: 'image/png' });
    const imageRef = await fal.storage.upload(imageFile);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(imageBlob);
    });

    // Attempt 1: nano-banana/edit expects `prompt` and `image_urls: [url]`
    try {
      const result = await fal.subscribe(this.models.edit, {
        input: {
          prompt,
          image_urls: [imageRef.url]
        }
      });

      const url = (result as any)?.images?.[0]?.url || (result as any)?.image?.url;
      if (!url) throw new Error('FAL: No image URL returned from edit');
      return await blobFromUrl(url);
    } catch (error1: any) {
      e2eLogger.warn('FALService', 'edit_variant1_failed', {
        message: error1?.message || String(error1),
        details: error1?.response || undefined
      });

      // Attempt 2: some routes accept `image_urls` with a data URL instead of remote URL
      try {
        const result2 = await fal.subscribe(this.models.edit, {
          input: {
            prompt,
            image_urls: [dataUrl]
          }
        });

        const url2 = (result2 as any)?.images?.[0]?.url || (result2 as any)?.image?.url;
        if (!url2) throw new Error('FAL: No image URL returned from edit (variant2)');
        return await blobFromUrl(url2);
      } catch (error2: any) {
        e2eLogger.warn('FALService', 'edit_variant2_failed', {
          message: error2?.message || String(error2),
          details: error2?.response || undefined
        });

        // Attempt 3: some routes use `image` and `instruction`
        try {
          const result3 = await fal.subscribe(this.models.edit, {
            input: {
              instruction: prompt,
              image: imageRef.url
            }
          });

          const url3 = (result3 as any)?.images?.[0]?.url || (result3 as any)?.image?.url;
          if (!url3) throw new Error('FAL: No image URL returned from edit (variant3)');
          return await blobFromUrl(url3);
        } catch (error3: any) {
          e2eLogger.error('FALService', 'edit_failed', {
            message: error3?.message || String(error3),
            name: error3?.name,
            stack: error3?.stack,
            details: error3?.response || error3
          });
          throw error3;
        }
      }
    }
  }

  async outpaint(
    imageData: ImageData,
    direction: 'left' | 'right' | 'top' | 'bottom',
    pixels: number,
    prompt: string = 'seamless continuation'
  ): Promise<Blob> {
    const fal = await getFal();
    e2eLogger.info('FALService', 'outpaint_start', { model: this.models.outpaint, direction, pixels });

    const imageBlob = await imageDataToBlob(imageData);
    const imageFile = new File([imageBlob], 'image.png', { type: 'image/png' });
    const imageRef = await fal.storage.upload(imageFile);

    const result = await fal.subscribe(this.models.outpaint, {
      input: {
        prompt,
        image_url: imageRef.url,
        // Provide hints for outpainting region; different models vary
        direction,
        pixels,
        // Some models may accept target_size instead
        target_width: direction === 'left' || direction === 'right' ? imageData.width + pixels : imageData.width,
        target_height: direction === 'top' || direction === 'bottom' ? imageData.height + pixels : imageData.height,
      }
    });

    const url = (result as any)?.images?.[0]?.url || (result as any)?.image?.url;
    if (!url) throw new Error('FAL: No image URL returned from outpaint');
    return await blobFromUrl(url);
  }
}

export const falService = new FALService();
