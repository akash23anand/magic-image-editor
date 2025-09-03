/**
 * Tesseract.js OCR Service
 * Browser-side WASM OCR for text extraction
 * Based on: https://github.com/naptha/tesseract.js
 */

import { createWorker } from 'tesseract.js';
import { e2eLogger } from '../utils/E2ELogger';

export class TesseractService {
  private worker: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) {
      console.log('TesseractService: Already initialized, skipping');
      return;
    }

    console.log('TesseractService: Starting initialization...');
    e2eLogger.info('TesseractService', 'initialize_start');

    try {
      // Enhanced debugging for path resolution
      console.log('TesseractService: === PATH DEBUGGING START ===');
      console.log('TesseractService: Current location:', {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        protocol: window.location.protocol
      });
      
      // Check if local tessdata exists with detailed debugging
      console.log('TesseractService: Checking for local tessdata...');
      const possiblePaths = [
        '/tessdata/eng.traineddata',
        './tessdata/eng.traineddata',
        '../tessdata/eng.traineddata',
        'tessdata/eng.traineddata',
        '/public/tessdata/eng.traineddata',
        './public/tessdata/eng.traineddata'
      ];
      
      const pathResults = [];
      for (const path of possiblePaths) {
        try {
          const response = await fetch(path);
          pathResults.push({
            path,
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            url: response.url
          });
          console.log(`TesseractService: Path check ${path}: ${response.status} ${response.statusText}`);
        } catch (fetchError) {
          pathResults.push({
            path,
            error: fetchError instanceof Error ? fetchError.message : String(fetchError),
            type: fetchError instanceof TypeError ? 'TypeError' : 'Other'
          });
          console.log(`TesseractService: Path check ${path} failed:`, fetchError);
        }
      }
      
      console.log('TesseractService: All path check results:', pathResults);
      
      // Check if tessdata directory exists
      try {
        const tessdataDirResponse = await fetch('/tessdata/');
        console.log('TesseractService: Tessdata directory check:', tessdataDirResponse.status, tessdataDirResponse.statusText);
        if (tessdataDirResponse.ok) {
          const text = await tessdataDirResponse.text();
          console.log('TesseractService: Tessdata directory listing (first 200 chars):', text.substring(0, 200));
        }
      } catch (dirError) {
        console.log('TesseractService: Tessdata directory check failed:', dirError);
      }

      // Set TESSDATA_PREFIX environment variable for Tesseract.js
      // This is crucial for Tesseract.js to find the language data
      if (typeof window !== 'undefined') {
        // @ts-ignore - Tesseract.js specific environment setup
        (window as any).TESSDATA_PREFIX = '/tessdata/';
        console.log('TesseractService: Set TESSDATA_PREFIX to:', (window as any).TESSDATA_PREFIX);
      }

      // Enhanced debugging for CDN selection
      console.log('TesseractService: Testing CDN availability...');
      
      // Test multiple CDN options
      const cdnOptions = [
        'https://tessdata.projectnaptha.com/4.0.0/',
        'https://raw.githubusercontent.com/tesseract-ocr/tessdata/main/',
        'https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata@main/',
      ];
      
      // Test CDN availability
      for (const cdnUrl of cdnOptions) {
        try {
          const testUrl = `${cdnUrl}eng.traineddata`;
          const response = await fetch(testUrl, { method: 'HEAD' });
          console.log(`TesseractService: CDN test ${cdnUrl}: ${response.status} ${response.statusText}`);
        } catch (error) {
          console.log(`TesseractService: CDN test ${cdnUrl} failed:`, error);
        }
      }
      
      // Enhanced configuration to use local tessdata files
      console.log('TesseractService: Configuring to use local tessdata files');
      
      // Check if local tessdata is available
      let useLocalTessdata = false;
      try {
        const localResponse = await fetch('/tessdata/eng.traineddata', { method: 'HEAD' });
        if (localResponse.ok) {
          console.log('TesseractService: Local tessdata file found, using local configuration');
          useLocalTessdata = true;
        } else {
          console.log('TesseractService: Local tessdata not found, will use CDN fallback');
        }
      } catch (error) {
        console.log('TesseractService: Error checking local tessdata:', error);
      }

      const config = {
        workerPath: 'https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js',
        corePath: 'https://unpkg.com/tesseract.js-core@5.1.1/tesseract-core.wasm.js',
        cachePath: '/tmp/',
        gzip: false,
        ...(useLocalTessdata && { langPath: '/tessdata/' }), // Use local files if available
      };
      
      console.log('TesseractService: Final configuration:', config);
      
      console.log('TesseractService: Creating worker with configuration:', config);

      this.worker = await createWorker('eng', 1, {
        logger: (m: any) => {
          console.log('Tesseract:', m);
          e2eLogger.debug('TesseractService', 'worker_log', m);
          
          // Enhanced logging for debugging
          if (m.status === 'loading tesseract core') {
            console.log('TesseractService: Loading core WASM...', m.progress);
          } else if (m.status === 'initializing tesseract') {
            console.log('TesseractService: Initializing Tesseract engine...', m.progress);
          } else if (m.status === 'loading language traineddata') {
            console.log('TesseractService: Loading language data...', m.progress);
            if (m.progress === 0) {
              console.log('TesseractService: Language data URL:', m.data?.url || 'default');
              console.log('TesseractService: Language data source:', m.data?.url ? 'Custom' : 'Tesseract.js default');
            }
          } else if (m.status === 'initialized') {
            console.log('TesseractService: Worker initialized successfully');
          } else if (m.status === 'recognizing text') {
            console.log('TesseractService: Recognizing text...', m.progress);
          }
        },
        ...config,
        // Enhanced error handler with better debugging
        errorHandler: (error: any) => {
          console.error('TesseractService: Worker error:', error);
          e2eLogger.error('TesseractService', 'worker_error', {
            error: error.message || String(error),
            errorType: error.constructor?.name || typeof error,
            configUsed: config.langPath ? 'Local tessdata' : 'Tesseract.js default',
            langPath: config.langPath || 'default',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          });
        }
      });
      
      this.isInitialized = true;
      console.log('TesseractService: Initialization complete');
      e2eLogger.info('TesseractService', 'initialize_complete');
    } catch (error) {
      console.error('TesseractService: Primary initialization failed:', error);
      console.error('TesseractService: Primary error details:', {
        error: error,
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        currentUrl: window.location.href,
        baseUrl: window.location.origin
      });
      
      e2eLogger.error('TesseractService', 'initialize_primary_failed', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error?.constructor?.name,
        errorStack: error instanceof Error ? error.stack : undefined,
        currentUrl: window.location.href,
        baseUrl: window.location.origin,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      
     // Simplified fallback - now primary approach uses CDN
      console.error('TesseractService: Primary initialization failed:', error);
      throw new Error(`Tesseract.js initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async extractText(
    imageData: ImageData,
    options: {
      language?: string;
      quality?: 'fast' | 'balanced' | 'accurate';
      preprocess?: boolean;
      preserveFormatting?: boolean;
    } = {}
  ): Promise<{
    imageData: ImageData;
    text: string;
    metadata: Record<string, any>;
    textData?: {
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
    };
  }> {
    const {
      language = 'eng',
      quality = 'balanced',
      preprocess = true,
      preserveFormatting = true
    } = options;

    console.log('TesseractService: Starting text extraction...', { options });
    e2eLogger.info('TesseractService', 'extractText_start', {
      width: imageData.width,
      height: imageData.height,
      dataLength: imageData.data.length,
      hasAlpha: imageData.data.length === imageData.width * imageData.height * 4,
      options
    });
    
    // Validate image data
    if (!imageData || !imageData.data || imageData.data.length === 0) {
      const error = 'Invalid ImageData: empty or null';
      console.error('TesseractService:', error);
      e2eLogger.error('TesseractService', 'extractText_invalid_image', { error });
      throw new Error(error);
    }

    if (imageData.width === 0 || imageData.height === 0) {
      const error = `Invalid ImageData dimensions: ${imageData.width}x${imageData.height}`;
      console.error('TesseractService:', error);
      e2eLogger.error('TesseractService', 'extractText_invalid_dimensions', { error });
      throw new Error(error);
    }

    try {
      await this.initialize();
      console.log('TesseractService: Initialization complete, proceeding with text extraction');
    } catch (initError) {
      console.error('TesseractService: Initialization failed:', initError);
      e2eLogger.error('TesseractService', 'extractText_init_failed', {
        error: initError instanceof Error ? initError.message : String(initError)
      });
      throw new Error(`Text extraction failed: ${initError instanceof Error ? initError.message : String(initError)}`);
    }

    // Convert ImageData to canvas for Tesseract
    console.log('TesseractService: Creating canvas from ImageData...');
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const error = 'Failed to get 2D context from canvas';
      console.error('TesseractService:', error);
      e2eLogger.error('TesseractService', 'extractText_canvas_error', { error });
      throw new Error(error);
    }

    try {
      // Apply preprocessing if enabled
      let processedImageData = imageData;
      if (preprocess) {
        processedImageData = this.preprocessImage(imageData);
      }
      
      ctx.putImageData(processedImageData, 0, 0);
      console.log('TesseractService: ImageData successfully drawn to canvas');
    } catch (drawError) {
      console.error('TesseractService: Error drawing ImageData to canvas:', drawError);
      e2eLogger.error('TesseractService', 'extractText_draw_error', {
        error: drawError instanceof Error ? drawError.message : String(drawError)
      });
      throw new Error(`Failed to prepare image for OCR: ${drawError instanceof Error ? drawError.message : String(drawError)}`);
    }

    try {
      e2eLogger.debug('TesseractService', 'recognizing_text', {
        canvasSize: `${canvas.width}x${canvas.height}`,
        imageType: 'ImageData',
        channels: imageData.data.length / (imageData.width * imageData.height)
      });
      
      console.log('TesseractService: Starting text recognition...');
      const startTime = performance.now();
      
      // Quality-based parameter configuration
      const qualitySettings = {
        fast: {
          tessedit_pageseg_mode: 6, // Single uniform block
          tessedit_ocr_engine_mode: 1, // LSTM only
          preserve_interword_spaces: preserveFormatting ? 1 : 0,
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,!?-:;()\'"',
        },
        balanced: {
          tessedit_pageseg_mode: 6, // Prefer single block for coherent paragraphs
          tessedit_ocr_engine_mode: 3, // LSTM + legacy
          preserve_interword_spaces: preserveFormatting ? 1 : 0,
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,!?-:;()\'"\'',
        },
        accurate: {
          tessedit_pageseg_mode: 6, // Single block for best consistency here
          tessedit_ocr_engine_mode: 3, // LSTM + legacy
          preserve_interword_spaces: preserveFormatting ? 1 : 0,
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,!?-:;()\'"\'',
          tessedit_do_invert: 0, // Skip inversion
          tessedit_fix_fuzzy_spaces: 1, // Fix spacing issues
          tessedit_unrej_any_wd: 1, // Accept any word
        }
      };
      
      const parameters = qualitySettings[quality];
      
      // Configure Tesseract with quality-based parameters
      await this.worker.setParameters(parameters);
      
      const { data: { text, confidence, blocks, paragraphs, lines, words } } = await this.worker.recognize(canvas);
      
      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);
      
      console.log(`TesseractService: Text recognition complete in ${processingTime}ms`);
      console.log(`TesseractService: Found ${text.length} characters, ${words?.length || 0} words, ${lines?.length || 0} lines`);
      
      e2eLogger.info('TesseractService', 'text_recognized', {
        textLength: text.length,
        confidence: Math.round(confidence),
        blocksCount: blocks?.length || 0,
        paragraphsCount: paragraphs?.length || 0,
        linesCount: lines?.length || 0,
        wordsCount: words?.length || 0,
        processingTimeMs: processingTime,
        quality,
        language,
        preprocess
      });
      
      // Build paragraph blocks (main, meta/timestamp, and any additional paragraph separated by gaps)
      const textData = this.createParagraphBlocks({ blocks, lines }, imageData.width, imageData.height);
      // Use the first block as the primary text for metadata (full text remains accessible via textData)
      const finalText = (textData?.blocks?.[0]?.text || text || '').trim();
      
      const metadata = {
        model: 'Tesseract.js',
        confidence: Math.round(confidence),
        blocks: blocks?.length || 0,
        paragraphs: paragraphs?.length || 0,
        lines: lines?.length || 0,
        words: finalText.split(/\s+/).filter((w: string) => w.length > 0).length,
        processingTimeMs: processingTime,
        quality,
        language,
        preprocess,
        extractedText: finalText.substring(0, 200) + (finalText.length > 200 ? '...' : '')
      };

      console.log('TesseractService: Text extraction complete', {
        textLength: finalText.length,
        confidence: metadata.confidence,
        processingTime: metadata.processingTimeMs,
        textDataBlocks: textData.blocks.length
      });

      e2eLogger.info('TesseractService', 'extractText_complete', metadata);

      return {
        imageData: imageData, // Return original image data
        text: finalText,
        metadata: metadata,
        textData: textData
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('TesseractService: OCR processing failed:', error);
      console.error('TesseractService: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        imageDimensions: `${imageData.width}x${imageData.height}`
      });
      
      e2eLogger.error('TesseractService', 'extractText_failed', {
        error: errorMessage,
        imageDimensions: `${imageData.width}x${imageData.height}`,
        dataLength: imageData.data.length,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw new Error(`Text extraction failed: ${errorMessage}`);
    }
  }

  private preprocessImage(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Draw original image
    ctx.putImageData(imageData, 0, 0);
    
    // Light-touch preprocessing only; avoid global binarization that can blow up glyph boxes
    ctx.filter = 'grayscale(100%) contrast(110%) brightness(105%)';
    ctx.drawImage(canvas, 0, 0);
    return ctx.getImageData(0, 0, width, height);
  }

  private createStructuredTextData(blocks: any[], fullText: string): any {
    if (!blocks || blocks.length === 0) {
      return { blocks: [] };
    }

    return {
      blocks: blocks.map((block: any) => {
        const paragraphs = block.paragraphs || [{
          text: block.text,
          confidence: block.confidence,
          bbox: block.bbox,
          lines: block.lines
        }];
        
        const allLines = paragraphs.flatMap((para: any) => {
          if (para.lines && para.lines.length > 0) {
            return para.lines;
          }
          return [{
            text: para.text || '',
            confidence: para.confidence || 0,
            bbox: para.bbox || block.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
            words: para.words || []
          }];
        });

        const linesWithWords = allLines.map((line: any) => {
          let words = line.words || [];
          
          if (words.length === 0 && line.text) {
            const lineText = line.text.trim();
            if (lineText) {
              const textWords = lineText.split(/\s+/);
              const lineWidth = line.bbox?.x1 - line.bbox?.x0 || 100;
              const wordWidth = lineWidth / Math.max(textWords.length, 1);
              
              words = textWords.map((wordText: string, index: number) => ({
                text: wordText,
                confidence: line.confidence || 0,
                bbox: {
                  x0: (line.bbox?.x0 || 0) + (index * wordWidth),
                  y0: line.bbox?.y0 || 0,
                  x1: (line.bbox?.x0 || 0) + ((index + 1) * wordWidth),
                  y1: line.bbox?.y1 || 0
                }
              }));
            }
          }
          
          return {
            text: line.text || '',
            confidence: line.confidence || 0,
            bbox: line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
            words: words
          };
        });

        return {
          text: block.text || '',
          confidence: block.confidence || 0,
          bbox: block.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
          lines: linesWithWords
        };
      })
    };
  }

  /**
   * Create robust paragraph blocks from Tesseract line output.
   * - Groups lines by vertical proximity and horizontal overlap
   * - Detects a meta/timestamp block separately
   * - Returns multiple blocks (top paragraph, meta, next paragraph, ...)
   */
  private createParagraphBlocks(
    data: { blocks?: any[]; lines?: any[] },
    imageW: number,
    imageH: number
  ): { blocks: any[] } {
    const aggLines: any[] = [];
    if (Array.isArray(data.lines)) aggLines.push(...data.lines);
    if (Array.isArray(data.blocks)) {
      for (const b of data.blocks) if (Array.isArray(b?.lines)) aggLines.push(...b.lines);
    }
    if (aggLines.length === 0) return { blocks: [] };

    // Normalize + filter minimal info
    const lines = aggLines
      .filter(l => !!l && !!l.bbox && typeof l.bbox.x0 === 'number')
      .map(l => ({
        text: (l.text || '').toString(),
        confidence: typeof l.confidence === 'number' ? l.confidence : 0,
        bbox: { x0: l.bbox.x0, y0: l.bbox.y0, x1: l.bbox.x1, y1: l.bbox.y1 },
        words: l.words || []
      }));

    if (lines.length === 0) return { blocks: [] };

    const h = (bb: any) => Math.max(1, bb.y1 - bb.y0);
    const w = (bb: any) => Math.max(1, bb.x1 - bb.x0);
    const area = (bb: any) => h(bb) * w(bb);
    const areaImg = Math.max(1, imageW * imageH);

    // Compute stats
    const heights = lines.map(l => h(l.bbox)).sort((a,b)=>a-b);
    const medianH = heights[Math.floor(heights.length/2)] || 1;
    const p90 = heights[Math.floor(heights.length*0.9)] || medianH;
    const maxH = Math.min(imageH * 0.2, Math.max(medianH * 2.8, p90 * 1.3));

    // Light filtering: drop obviously noisy lines
    const filtered = lines.filter(l => l.confidence >= 45 && h(l.bbox) <= maxH && area(l.bbox) > areaImg * 0.00005);
    if (filtered.length === 0) return { blocks: [] };

    // Sort top-to-bottom
    filtered.sort((a,b)=> (a.bbox.y0 - b.bbox.y0) || (a.bbox.x0 - b.bbox.x0));

    // Group by vertical gaps + horizontal overlap continuity
    const groups: any[][] = [];
    const overlap = (a:any,b:any) => Math.max(0, Math.min(a.bbox.x1, b.bbox.x1) - Math.max(a.bbox.x0, b.bbox.x0));
    // Be generous on vertical spacing to avoid splitting paragraphs too aggressively
    const gapThresh = Math.max(2, medianH * 1.2);
    const horizThresh = 0.2; // 20% overlap is enough
    let cur: any[] = [];
    for (const line of filtered) {
      if (cur.length === 0) { cur.push(line); continue; }
      const prev = cur[cur.length - 1];
      const vGap = line.bbox.y0 - prev.bbox.y1;
      const ov = overlap(line, prev) / Math.max(w(line.bbox), w(prev.bbox));
      if (vGap > gapThresh || ov < horizThresh) {
        groups.push(cur);
        cur = [line];
      } else {
        cur.push(line);
      }
    }
    if (cur.length) groups.push(cur);

    // Merge adjacent groups separated by small gaps and strong horizontal overlap
    type TmpBlock = { lines: any[]; bbox: { x0:number; y0:number; x1:number; y1:number } };
    const tmpBlocks: TmpBlock[] = groups.map(g => ({
      lines: g,
      bbox: {
        x0: Math.min(...g.map((l:any)=>l.bbox.x0)),
        y0: Math.min(...g.map((l:any)=>l.bbox.y0)),
        x1: Math.max(...g.map((l:any)=>l.bbox.x1)),
        y1: Math.max(...g.map((l:any)=>l.bbox.y1)),
      }
    })).sort((a,b)=> a.bbox.y0 - b.bbox.y0);

    const hovRatio = (A:TmpBlock,B:TmpBlock) => {
      const ov = Math.max(0, Math.min(A.bbox.x1,B.bbox.x1) - Math.max(A.bbox.x0,B.bbox.x0));
      const wA = A.bbox.x1 - A.bbox.x0; const wB = B.bbox.x1 - B.bbox.x0;
      return ov / Math.max(1, Math.max(wA, wB));
    };
    const mergedBlocks: TmpBlock[] = [];
    for (const b of tmpBlocks) {
      if (mergedBlocks.length === 0) { mergedBlocks.push(b); continue; }
      const last = mergedBlocks[mergedBlocks.length-1];
      const vGap = b.bbox.y0 - last.bbox.y1;
      if (vGap <= medianH * 0.6 && hovRatio(last,b) >= 0.4) {
        last.lines = [...last.lines, ...b.lines];
        last.bbox = {
          x0: Math.min(last.bbox.x0, b.bbox.x0),
          y0: Math.min(last.bbox.y0, b.bbox.y0),
          x1: Math.max(last.bbox.x1, b.bbox.x1),
          y1: Math.max(last.bbox.y1, b.bbox.y1),
        };
      } else {
        mergedBlocks.push(b);
      }
    }

    // Score groups and detect meta group
    const metaRegex = /(AM|PM|Views|·|\d{1,2}:\d{2}|\bJan\b|\bFeb\b|\bMar\b|\bApr\b|\bMay\b|\bJun\b|\bJul\b|\bAug\b|\bSep\b|\bOct\b|\bNov\b|\bDec\b)/i;
    function toBlock(g: any[]) {
      let bb = {
        x0: Math.min(...g.map((l:any)=>l.bbox.x0)),
        y0: Math.min(...g.map((l:any)=>l.bbox.y0)),
        x1: Math.max(...g.map((l:any)=>l.bbox.x1)),
        y1: Math.max(...g.map((l:any)=>l.bbox.y1)),
      };
      // Expand bbox slightly to avoid visual clipping
      const padY = Math.max(1, Math.round(medianH * 0.15));
      const padX = Math.max(1, Math.round((imageW + imageH) * 0.0002));
      bb = {
        x0: Math.max(0, bb.x0 - padX),
        y0: Math.max(0, bb.y0 - padY),
        x1: Math.min(imageW, bb.x1 + padX),
        y1: Math.min(imageH, bb.y1 + padY),
      };
      const txt = g.map((l:any)=>(l.text||'').replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
      const conf = Math.round(g.reduce((s:number,l:any)=>s+(l.confidence||0),0)/Math.max(1,g.length));
      return { text: txt, confidence: conf, bbox: bb, lines: g };
    }

    // Build all candidate blocks
    const allBlocks = mergedBlocks
      .map(m => toBlock(m.lines))
      .filter(b => b.text && area(b.bbox) < areaImg * 0.95)
      // drop tiny one-char noise
      .filter(b => !(b.text.length <= 2 && area(b.bbox) < areaImg * 0.001 && b.confidence < 70));
    if (allBlocks.length === 0) return { blocks: [] };

    // Choose main paragraph: most lines, then largest area
    const byLines = (b:any) => b.lines.length;
    const byArea  = (b:any) => area(b.bbox);
    const nonMeta = allBlocks.filter(b => !metaRegex.test(b.text));
    const metaBlocks = allBlocks.filter(b => metaRegex.test(b.text));

    const main = nonMeta.reduce((best:any,b:any)=> (byLines(b)>byLines(best) || (byLines(b)===byLines(best)&&byArea(b)>byArea(best)))?b:best, nonMeta[0] || allBlocks[0]);

    const otherParas = nonMeta.filter(b => b!==main && (b.lines.length >= 2 || byArea(b) > areaImg * 0.002));
    const sortedOthers = otherParas.sort((a:any,b:any)=> a.bbox.y0 - b.bbox.y0);
    const sortedMeta = metaBlocks.sort((a:any,b:any)=> a.bbox.y0 - b.bbox.y0);

    const blocksOut = [main, ...sortedOthers, ...sortedMeta];
    return { blocks: blocksOut };
  }

  // Build one consolidated paragraph block from Tesseract output, filtering noise
  private createSingleParagraphData(
    data: { blocks?: any[]; lines?: any[] },
    imageW: number,
    imageH: number
  ): { blocks: any[] } {
    const lines: any[] = (data.lines && data.lines.length ? data.lines : [])
      .filter(l => !!l && !!l.bbox);

    const blocks: any[] = (data.blocks && data.blocks.length ? data.blocks : [])
      .filter(b => !!b && !!b.bbox);

    // Prefer Tesseract lines for fine control
    const Lraw = lines.length ? lines : blocks.flatMap(b => b.lines || []);
    // Separate obvious meta/timestamp lines from paragraph candidates
    const metaToken = /(AM|PM|Views|·|\d{1,2}:\d{2}|\bJan\b|\bFeb\b|\bMar\b|\bApr\b|\bMay\b|\bJun\b|\bJul\b|\bAug\b|\bSep\b|\bOct\b|\bNov\b|\bDec\b)/i;
    const L = Lraw.filter(l => !metaToken.test((l.text || '')));
    if (!L || L.length === 0) return { blocks: [] };

    const areaImg = imageW * imageH;
    const toArea = (bb: any) => Math.max(1, (bb.x1 - bb.x0) * (bb.y1 - bb.y0));
    const toHeight = (bb: any) => Math.max(1, bb.y1 - bb.y0);
    const conf = (x: any) => (typeof x.confidence === 'number' ? x.confidence : 0);

    // Filter: confidence and reasonable size
    const minConf = 50; // 0-100 (slightly relaxed to avoid dropping tail lines)
    const minArea = Math.max(80, areaImg * 0.00015);
    let candidates = L.filter(l => conf(l) >= minConf && toArea(l.bbox) >= minArea);
    if (candidates.length === 0) candidates = L; // fallback

    // Robust height filter: remove lines whose height is far above median (e.g., blown-up glyph boxes)
    const heights = candidates.map(l => toHeight(l.bbox)).sort((a,b)=>a-b);
    const medianH = heights[Math.floor(heights.length/2)] || 1;
    const p90 = heights[Math.floor(heights.length*0.9)] || medianH;
    // Allow slightly taller lines (bold, leading), still guard against blown-up glyphs
    const maxReasonableH = Math.min(imageH * 0.18, Math.max(medianH * 2.4, p90 * 1.2));
    candidates = candidates.filter(l => toHeight(l.bbox) <= maxReasonableH);

    // Sort top-to-bottom
    candidates.sort((a, b) => (a.bbox.y0 - b.bbox.y0) || (a.bbox.x0 - b.bbox.x0));

    // Estimate main column by robust median of x0/x1
    const xs0 = candidates.map(l => l.bbox.x0).sort((a,b)=>a-b);
    const xs1 = candidates.map(l => l.bbox.x1).sort((a,b)=>a-b);
    const med = (arr: number[]) => arr[Math.floor(arr.length/2)] || 0;
    const q1 = (arr: number[]) => arr[Math.floor(arr.length*0.25)] || 0;
    const q3 = (arr: number[]) => arr[Math.floor(arr.length*0.75)] || 0;
    // Use interquartile range for robustness
    const colX0 = q1(xs0);
    const colX1 = q3(xs1);
    const colWidth = Math.max(1, colX1 - colX0);

    // Keep lines overlapping the main column sufficiently
    const main = candidates.filter(l => {
      const w = l.bbox.x1 - l.bbox.x0;
      const overlap = Math.max(0, Math.min(l.bbox.x1, colX1) - Math.max(l.bbox.x0, colX0));
      return overlap / Math.max(w, colWidth) > 0.25;
    });
    let set = main.length >= 3 ? main : candidates;

    // Stitch: include adjacent lines that sit directly below and horizontally overlap paragraph bbox
    // This recovers tail lines that slightly shift column or have lower confidence
    const baseBBox = (linesArr: any[]) => ({
      x0: Math.min(...linesArr.map((l:any)=>l.bbox.x0)),
      y0: Math.min(...linesArr.map((l:any)=>l.bbox.y0)),
      x1: Math.max(...linesArr.map((l:any)=>l.bbox.x1)),
      y1: Math.max(...linesArr.map((l:any)=>l.bbox.y1))
    });
    const paragraphBBox = () => baseBBox(set);
    const isBelow = (l:any, bb:any) => l.bbox.y0 >= bb.y0 - medianH*0.5 && l.bbox.y0 <= bb.y1 + medianH*2.2;
    const horizOverlap = (l:any, bb:any) => {
      const overlap = Math.max(0, Math.min(l.bbox.x1, bb.x1) - Math.max(l.bbox.x0, bb.x0));
      const w = l.bbox.x1 - l.bbox.x0; return overlap/Math.max(1,w) > 0.25;
    };
    const rest = candidates.filter(l => !set.includes(l));
    if (rest.length) {
      const bb = paragraphBBox();
      // Allow stitching both above and below the current block
      const isBelowWide = (l:any) => l.bbox.y0 >= bb.y0 - medianH*0.5 && l.bbox.y0 <= bb.y1 + medianH*6.0;
      const isAboveWide = (l:any) => l.bbox.y1 >= bb.y0 - medianH*6.0 && l.bbox.y1 <= bb.y0 + medianH*0.8;
      const augBelow = rest.filter(l => isBelowWide(l) && horizOverlap(l, bb));
      const augAbove = rest.filter(l => isAboveWide(l) && horizOverlap(l, bb));
      const combined = [...set, ...augAbove, ...augBelow];
      // Dedupe by reference
      const uniq = Array.from(new Set(combined));
      set = uniq.sort((a:any,b:any)=> (a.bbox.y0 - b.bbox.y0) || (a.bbox.x0 - b.bbox.x0));
    }

    // Compose text with newlines and build block bbox
    const text = set.map(l => (l.text || '').replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
    const bbox = {
      x0: Math.min(...set.map(l => l.bbox.x0)),
      y0: Math.min(...set.map(l => l.bbox.y0)),
      x1: Math.max(...set.map(l => l.bbox.x1)),
      y1: Math.max(...set.map(l => l.bbox.y1)),
    };

    // Guard: if block covers nearly whole image, treat as failure → return empty
    const blockArea = toArea(bbox);
    if (blockArea > areaImg * 0.85) return { blocks: [] };

    const avgConf = Math.round(set.reduce((s,l)=>s+conf(l),0) / Math.max(1,set.length));

    const blocksOut: any[] = [
      {
        text,
        confidence: avgConf,
        bbox,
        lines: set.map(l => ({
          text: l.text || '',
          confidence: conf(l),
          bbox: l.bbox,
          words: l.words || []
        }))
      }
    ];

    // Heuristic: detect a date/time/views line as a separate block
    const metaRegex = /(AM|PM|Views|·|\d{1,2}:\d{2})/i;
    const notInSet = (l:any) => !set.includes(l);
    const restAll = Lraw.filter(notInSet);
    if (restAll.length) {
      const paraBottom = bbox.y1;
      // lines near/below paragraph bottom with indicative tokens
      const metaLines = restAll.filter(l => {
        const h = toHeight(l.bbox);
        const withinVerticalBand = l.bbox.y0 >= paraBottom - medianH * 0.5 && l.bbox.y0 <= paraBottom + medianH * 3.5;
        const hasMetaTokens = metaRegex.test((l.text || ''));
        const reasonableHeight = h <= medianH * 1.6; // avoid oversized artifacts
        return reasonableHeight && (hasMetaTokens || withinVerticalBand);
      }).sort((a,b)=> (a.bbox.y0 - b.bbox.y0) || (a.bbox.x0 - b.bbox.x0));

      if (metaLines.length) {
        const metaText = metaLines.map(l => (l.text || '').replace(/\s+/g,' ').trim()).filter(Boolean).join(' ');
        const metaBBox = {
          x0: Math.min(...metaLines.map((l:any)=>l.bbox.x0)),
          y0: Math.min(...metaLines.map((l:any)=>l.bbox.y0)),
          x1: Math.max(...metaLines.map((l:any)=>l.bbox.x1)),
          y1: Math.max(...metaLines.map((l:any)=>l.bbox.y1)),
        };
        const metaWidthRatio = (metaBBox.x1 - metaBBox.x0) / Math.max(1, imageW);
        const metaArea = toArea(metaBBox);
        // Guard: ensure it's not tiny noise nor entire-image artifact
        if (metaText && metaArea > areaImg * 0.00005 && metaWidthRatio > 0.15 && metaArea < areaImg * 0.5) {
          blocksOut.push({
            text: metaText,
            confidence: Math.round(metaLines.reduce((s,l)=>s+conf(l),0) / Math.max(1, metaLines.length)),
            bbox: metaBBox,
            lines: metaLines.map(l => ({
              text: l.text || '',
              confidence: conf(l),
              bbox: l.bbox,
              words: l.words || []
            }))
          });
        }
      }
    }

    return { blocks: blocksOut };
  }

  // Simple box blur radius r (1-2) for denoising before threshold
  private boxBlur(img: ImageData, r: number) {
    const { data, width, height } = img;
    if (r <= 0) return;
    const copy = new Uint8ClampedArray(data);
    const pass = (src: Uint8ClampedArray, dst: Uint8ClampedArray, horiz: boolean) => {
      for (let y=0; y<height; y++) {
        for (let x=0; x<width; x++) {
          let rs=0, gs=0, bs=0, as=0, count=0;
          for (let k=-r; k<=r; k++) {
            const xx = horiz ? Math.max(0, Math.min(width-1, x+k)) : x;
            const yy = horiz ? y : Math.max(0, Math.min(height-1, y+k));
            const idx = (yy*width+xx)*4;
            rs+=src[idx]; gs+=src[idx+1]; bs+=src[idx+2]; as+=src[idx+3]; count++;
          }
          const di=(y*width+x)*4; dst[di]=rs/count; dst[di+1]=gs/count; dst[di+2]=bs/count; dst[di+3]=as/count;
        }
      }
    };
    const tmp = new Uint8ClampedArray(data.length);
    pass(copy,tmp,true); pass(tmp,data,false);
  }

  // Otsu threshold on grayscale image
  private otsuThreshold(img: ImageData) {
    const { data } = img;
    const hist = new Array(256).fill(0);
    for (let i=0;i<data.length;i+=4) hist[data[i]]++;
    let sum=0; for (let i=0;i<256;i++) sum+=i*hist[i];
    let sumB=0, wB=0, wF=0, varMax=0, thresh=0;
    const total = img.width*img.height;
    for (let t=0;t<256;t++){
      wB+=hist[t]; if (wB===0) continue; wF=total-wB; if (wF===0) break; sumB+=t*hist[t];
      const mB=sumB/wB; const mF=(sum-sumB)/wF; const vb=wB*wF*(mB-mF)*(mB-mF); if (vb>varMax){varMax=vb;thresh=t;}
    }
    for (let i=0;i<data.length;i+=4){ const g=data[i]; const v=g>thresh?255:0; data[i]=data[i+1]=data[i+2]=v; }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton
export const tesseractService = new TesseractService();
// Debug method for testing grab-text functionality
export async function debugGrabText(imageUrl?: string): Promise<void> {
  console.log('=== Tesseract Debug Test ===');
  
  try {
    // Create a test image with text if no URL provided
    let testImageData: ImageData;
    
    if (imageUrl) {
      console.log('Loading image from URL:', imageUrl);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      testImageData = ctx.getImageData(0, 0, img.width, img.height);
    } else {
      console.log('Creating test image with text...');
      // Create a simple test image with text
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      
      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Black text
      ctx.fillStyle = 'black';
      ctx.font = '24px Arial';
      ctx.fillText('Hello World', 50, 100);
      ctx.fillText('Test Text 123', 50, 130);
      
      testImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    console.log('Test image created:', testImageData.width, 'x', testImageData.height);
    
    // Test Tesseract
    const service = new TesseractService();
    const result = await service.extractText(testImageData);
    
    console.log('=== Tesseract Debug Results ===');
    console.log('Extracted text:', result.text);
    console.log('Confidence:', result.metadata.confidence);
    console.log('Blocks:', result.metadata.blocks);
    console.log('Words:', result.metadata.words);
    console.log('Processing time:', result.metadata.processingTimeMs, 'ms');
    
  } catch (error) {
    console.error('Tesseract Debug Test Failed:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

// Debug function to test tessdata accessibility
export async function debugTessdataAccess(): Promise<void> {
  console.log('=== Tessdata Access Debug ===');
  
  try {
    console.log('Current location:', window.location.href);
    
    // Test multiple paths
    const testPaths = [
      '/tessdata/eng.traineddata',
      './tessdata/eng.traineddata',
      '../tessdata/eng.traineddata',
      'tessdata/eng.traineddata',
      '/public/tessdata/eng.traineddata',
      './public/tessdata/eng.traineddata'
    ];
    
    console.log('Testing tessdata accessibility...');
    
    for (const path of testPaths) {
      try {
        const response = await fetch(path, { method: 'HEAD' });
        console.log(`✓ ${path}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const fullResponse = await fetch(path);
          const blob = await fullResponse.blob();
          console.log(`  Size: ${blob.size} bytes, Type: ${blob.type}`);
        }
      } catch (error) {
        console.log(`✗ ${path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Test directory listing
    try {
      const dirResponse = await fetch('/tessdata/');
      console.log('Directory listing response:', dirResponse.status, dirResponse.statusText);
      if (dirResponse.ok) {
        const text = await dirResponse.text();
        console.log('Directory contents:', text.substring(0, 500));
      }
    } catch (error) {
      console.log('Directory listing failed:', error);
    }
    
    // Test file existence via different methods
    try {
      const img = new Image();
      img.src = '/tessdata/eng.traineddata';
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('Image loading successful - file exists');
          resolve(true);
        };
        img.onerror = () => {
          console.log('Image loading failed - file may not exist or not an image');
          resolve(false);
        };
        setTimeout(reject, 5000);
      });
    } catch (error) {
      console.log('Image test failed:', error);
    }
    
  } catch (error) {
    console.error('Debug test failed:', error);
  }
}

// Make debug functions available globally for testing
if (typeof window !== 'undefined') {
  (window as any).debugGrabText = debugGrabText;
  (window as any).debugTessdataAccess = debugTessdataAccess;
}
