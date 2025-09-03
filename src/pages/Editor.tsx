import React, { useState, useEffect, useRef } from 'react'
import Canvas from '../components/Canvas'
import TextOverlay from '../components/TextOverlay'
import SelectionOverlay from '../components/SelectionOverlay'
import MaskDrawingOverlay from '../components/MaskDrawingOverlay'
import { MagicGrabLayer } from '../components/MagicGrabLayer'
import DebugOverlay from '../components/DebugOverlay'
import Toolbar from '../components/Toolbar'
import ProgressBar from '../components/ProgressBar'
import { unifiedAIService } from '../services/UnifiedAIService'
import { segmentationService } from '../services/SegmentationService'
import { layerManager } from '../utils/LayerManager'
import { calculateTransform, imageRectToCanvas, c2i, i2c, Rectangle } from '../utils/CoordinateHelpers'
import { e2eLogger } from '../utils/E2ELogger'
import { ErrorNotification } from '../utils/ErrorNotification'
import { LayerAnythingEngine } from '../services/LayerAnythingEngine'
import { ocrService } from '../services/OCRService'
// Use named function exports from PixelExtractor utility
import { createTextMask, extractLayer, fillExtractedRegion, rleMaskToImageData, cropImageData, scaleImageData } from '../utils/PixelExtractor'
// Temporary highlight chip overlay (rendered conditionally)
import LayerChipHighlight from '../components/LayerChipHighlight'
type SemanticKind = 'avatar' | 'name_handle' | 'actions' | 'text_block' | 'media' | 'meta' | 'banner'
type BBox = { x: number; y: number; width: number; height: number }
type SemanticRegion = { kind: SemanticKind; bbox: BBox }
const HIGHLIGHT_DURATION_MS = 2000
const Editor: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null)
  const [textData, setTextData] = useState<any>(null)
  const [showTextOverlay, setShowTextOverlay] = useState(false)
  const [showSelectionOverlay, setShowSelectionOverlay] = useState(false)
  const [showMaskDrawingOverlay, setShowMaskDrawingOverlay] = useState(false)
  const [layers, setLayers] = useState<any[]>([])
  const [transform, setTransform] = useState<any>(null)
  const [showDebugOverlay, setShowDebugOverlay] = useState(false)
  const [debugPromptBox, setDebugPromptBox] = useState<Rectangle | null>(null)
  const [debugMaskOutline, setDebugMaskOutline] = useState<Rectangle | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [storedMaskCanvas, setStoredMaskCanvas] = useState<HTMLCanvasElement | null>(null)
  const [pendingEraserImageData, setPendingEraserImageData] = useState<ImageData | null>(null)
  const [layerAnythingEngine] = useState(() => new LayerAnythingEngine())
  // Lightweight per-layer metadata for temporary highlight without changing LayerManager types
  const [layerMeta, setLayerMeta] = useState<Record<string, { kind: SemanticKind; sourceBBox: BBox; highlightUntil: number }>>({})

  const handleImageUpload = (file: File) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        setImageUrl(result)
        setProcessedImageUrl(null) // Reset processed image when new image is uploaded
        e2eLogger.info('Editor', 'image_upload_success', {
          size: file.size,
          type: file.type,
          name: file.name
        })
      } else {
        e2eLogger.error('Editor', 'empty_file_result')
        ErrorNotification.show('Failed to read image file. The file appears to be empty or corrupted.')
      }
    }
    
    reader.onerror = () => {
      e2eLogger.error('Editor', 'file_read_error', {
        file: file.name,
        size: file.size
      })
      ErrorNotification.show(`Failed to read image file: ${file.name}. Please try again or select a different file.`)
    }
    
    reader.onabort = () => {
      e2eLogger.warn('Editor', 'file_read_aborted', { file: file.name })
      ErrorNotification.showWarning('File upload was cancelled.')
    }
    
    try {
      reader.readAsDataURL(file)
    } catch (error) {
      e2eLogger.error('Editor', 'file_reader_exception', {
        error: error instanceof Error ? error.message : String(error)
      })
      ErrorNotification.show('An unexpected error occurred while processing the file. Please try again.')
    }
  }

  const handleToolSelect = async (tool: string, options: any = {}) => {
    if (!imageUrl) {
      ErrorNotification.show('Please upload an image first');
      return;
    }
    
    // Special handling for magic-grab - show selection overlay
    if (tool === 'magic-grab' && !options.prompt) {
      setShowSelectionOverlay(true)
      setShowTextOverlay(false)
      return
    }
    
    // Special handling for magic-eraser - show mask drawing overlay
    if (tool === 'magic-eraser' && !options.mask) {
      // Store the current image data for later use
      const img = new Image()
      img.onload = () => {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = img.width
        tempCanvas.height = img.height
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0)
          const imageData = tempCtx.getImageData(0, 0, img.width, img.height)
          setPendingEraserImageData(imageData)
          setShowMaskDrawingOverlay(true)
          setShowTextOverlay(false)
        }
      }
      img.src = imageUrl
      return
    }
    
    setIsProcessing(true)
    setProgressMessage(`Processing ${tool}...`)
    
    try {
      // Initialize segmentation service if needed
      await segmentationService.initialize()
      
      // Get image data from URL
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })
      
      // Create canvas to get image data
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = img.width
      tempCanvas.height = img.height
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) throw new Error('Failed to get canvas context')
      
      tempCtx.drawImage(img, 0, 0)
      const imageData = tempCtx.getImageData(0, 0, img.width, img.height)
      
      if (tool === 'layer-anything') {
        // Handle Layer Anything processing
        await handleLayerAnything(imageData, img, options)
      } else if (tool === 'grab-text') {
        // For grab-text, we need to use the unified AI service
        const result = await unifiedAIService.processImage(tool, imageData, options)
        setTextData(result.metadata?.textData || null)
        setShowTextOverlay(true)
        setProcessedImageUrl(null) // Don't show processed image, show original with overlay
      } else if (tool === 'magic-grab') {
        // Handle magic grab with new segmentation service
        const selection = options.prompt ? JSON.parse(options.prompt) : { x: 0, y: 0, width: 100, height: 100 };
        
        // Validate selection dimensions
        if (selection.width <= 0 || selection.height <= 0) {
          e2eLogger.error('Editor', 'invalid_selection_dimensions', { selection });
          ErrorNotification.show('Invalid selection dimensions. Please make a valid selection.');
          return;
        }
        
        // Log for debugging
        e2eLogger.info('Editor', 'magic_grab_start', {
          selection,
          transform
        });
        
        // Set debug prompt box
        setDebugPromptBox(selection);
        
        // Perform segmentation
        const segmentResult = await segmentationService.segment(imageData, {
          type: 'box',
          data: selection
        }, {
          sensitivity: 0.7,
          edgeRefinement: true,
          featherAmount: 2,
          morphologicalClose: 2
        });
        
        // Store the mask canvas reference for reuse
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = selection.width;
        maskCanvas.height = selection.height;
        const maskCtx = maskCanvas.getContext('2d');
        
        if (maskCtx && transform && segmentResult.masks.length > 0) {
          // For now, create a simple mask based on the bounding box
          // In a full implementation, we'd convert the RLE mask properly
          const firstMask = segmentResult.masks[0];
          const maskImageData = new ImageData(selection.width, selection.height);
          
          // Fill the mask with white (opaque)
          for (let i = 0; i < maskImageData.data.length; i += 4) {
            maskImageData.data[i] = 255;     // R
            maskImageData.data[i + 1] = 255; // G
            maskImageData.data[i + 2] = 255; // B
            maskImageData.data[i + 3] = 255; // A
          }
          
          const tempMaskCanvas = document.createElement('canvas');
          tempMaskCanvas.width = maskImageData.width;
          tempMaskCanvas.height = maskImageData.height;
          const tempMaskCtx = tempMaskCanvas.getContext('2d');
          
          if (tempMaskCtx) {
            tempMaskCtx.putImageData(maskImageData, 0, 0);
            
            // Draw only the selected region of the mask
            maskCtx.drawImage(
              tempMaskCanvas,
              selection.x, selection.y, selection.width, selection.height,
              0, 0, selection.width, selection.height
            );
            
            // Store mask reference for consistent usage
            setStoredMaskCanvas(maskCanvas);
            
            // Create layer canvas using OffscreenCanvas for better performance
            const layerCanvas = new OffscreenCanvas(selection.width, selection.height);
            const layerCtx = layerCanvas.getContext('2d');
            
            if (layerCtx) {
              // Draw the selected region from the original image (pixel-perfect crop)
              layerCtx.drawImage(
                img,
                selection.x, selection.y, selection.width, selection.height,  // source
                0, 0, selection.width, selection.height                      // destination
              );
              
              // Apply mask using globalCompositeOperation
              layerCtx.globalCompositeOperation = 'destination-in';
              
              // Use the same mask canvas reference
              layerCtx.drawImage(maskCanvas, 0, 0);
              
              // Reset composite operation
              layerCtx.globalCompositeOperation = 'source-over';
              
              // Calculate canvas position using i2c helper
              const canvasPos = i2c({ x: selection.x, y: selection.y }, transform);
              
              // Set debug mask outline
              setDebugMaskOutline({
                x: canvasPos.x,
                y: canvasPos.y,
                width: selection.width * transform.scale,
                height: selection.height * transform.scale
              });
              
              // Convert OffscreenCanvas to regular scaled canvas for layer manager
              const scaledW = Math.max(1, Math.round(selection.width * transform.scale));
              const scaledH = Math.max(1, Math.round(selection.height * transform.scale));
              const regularCanvas = document.createElement('canvas');
              regularCanvas.width = scaledW;
              regularCanvas.height = scaledH;
              const regularCtx = regularCanvas.getContext('2d');
              if (regularCtx) {
                regularCtx.imageSmoothingEnabled = true;
                regularCtx.imageSmoothingQuality = 'high';
                regularCtx.drawImage(layerCanvas as any, 0, 0, selection.width, selection.height, 0, 0, scaledW, scaledH);
              }
              
              // Clamp position to visible image area
              const imgArea = imageRectToCanvas({ x: 0, y: 0, width: transform.imageWidth, height: transform.imageHeight }, transform)
              const clampedPos = {
                x: Math.max(imgArea.x, Math.min(imgArea.x + imgArea.width - scaledW, canvasPos.x)),
                y: Math.max(imgArea.y, Math.min(imgArea.y + imgArea.height - scaledH, canvasPos.y))
              }

              // Add to layer manager
              const layerId = layerManager.addLayer({
                canvas: regularCanvas,
                position: clampedPos,
                name: 'Segmented Layer'
              });
              
              // Get the layer's image data for state
              const layerImageData = regularCtx?.getImageData(0, 0, scaledW, scaledH);
              // Scale mask to match the visual layer size
              const scaledMaskCanvas = document.createElement('canvas');
              scaledMaskCanvas.width = scaledW;
              scaledMaskCanvas.height = scaledH;
              const scaledMaskCtx = scaledMaskCanvas.getContext('2d');
              let maskImageData = maskCtx.getImageData(0, 0, selection.width, selection.height);
              if (scaledMaskCtx) {
                scaledMaskCtx.imageSmoothingEnabled = false;
                scaledMaskCtx.drawImage(maskCanvas, 0, 0, selection.width, selection.height, 0, 0, scaledW, scaledH);
                maskImageData = scaledMaskCtx.getImageData(0, 0, scaledW, scaledH);
              }
              
              // Update layers state
              setLayers(layerManager.getLayers().map(layer => ({
                ...layer,
                imageData: layer.id === layerId ? layerImageData : layers.find(l => l.id === layer.id)?.imageData,
                mask: layer.id === layerId ? maskImageData : layers.find(l => l.id === layer.id)?.mask
              })));
              
              e2eLogger.info('Editor', 'magic_grab_complete', {
                layerId,
                processingTime: segmentResult.metadata.processingTime,
                canvasPos
              });
            }
          }
        }
        
        setShowSelectionOverlay(false)
        setShowTextOverlay(false)
      } else {
        // For other tools, use unified AI service
        const result = await unifiedAIService.processImage(tool, imageData, options)
        const canvas = document.createElement('canvas')
        canvas.width = result.imageData.width
        canvas.height = result.imageData.height
        const ctx = canvas.getContext('2d')!
        ctx.putImageData(result.imageData, 0, 0)
        
        setProcessedImageUrl(canvas.toDataURL('image/png'))
        setShowTextOverlay(false)
        setTextData(null)
        console.log(`Completed ${tool}:`, result.metadata)
      }
      setProgressMessage(`${tool} completed successfully!`)
      setTimeout(() => setProgressMessage(''), 2000)
    } catch (error) {
      console.error(`Error processing ${tool}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Processing failed'
      setProgressMessage(`Error: ${errorMessage}`)
      ErrorNotification.show(`Error processing ${tool}: ${errorMessage}`)
      setTimeout(() => setProgressMessage(''), 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLayerAnything = async (imageData: ImageData, img: HTMLImageElement, options: any) => {
    try {
      // Initialize Layer Anything Engine
      await layerAnythingEngine.initializeFromImage(img.src, {
        width: img.width,
        height: img.height
      })

      // Create a working canvas that we'll extract from
      const workingCanvas = document.createElement('canvas')
      workingCanvas.width = img.width
      workingCanvas.height = img.height
      const workingCtx = workingCanvas.getContext('2d')
      if (!workingCtx) throw new Error('Failed to create working canvas')
      
      // Draw the original image
      workingCtx.drawImage(img, 0, 0)

      const extractedLayers: any[] = []

      // If layerAll flag is set, run semantic slicer first to get deterministic regions
      if (options.layerAll) {
        setProgressMessage('Analyzing layout (semantic slicer)...')
        // Run OCR and a light detection to support rules
        const ocrResult = await ocrService.recognize(imageData, { level: 'paragraph', confidence: 0.6 })
        const detectionResult = await segmentationService.detect(imageData, {
          labels: ['person', 'object', 'button', 'icon'],
          threshold: 0.5
        })
        const regions = semanticSlicer({ width: img.width, height: img.height }, ocrResult, detectionResult)

        for (const region of regions) {
          // Build a basic mask: full-opaque box; future: refined per-kind
          const regionImageData = workingCtx.getImageData(region.bbox.x, region.bbox.y, region.bbox.width, region.bbox.height)
          const mask = new ImageData(region.bbox.width, region.bbox.height)
          for (let i = 0; i < mask.data.length; i += 4) {
            mask.data[i] = 255; mask.data[i + 1] = 255; mask.data[i + 2] = 255; mask.data[i + 3] = 255
          }
          const extracted = extractLayer(workingCanvas, region.bbox, mask)
          fillExtractedRegion(workingCanvas, region.bbox, 'blur')

          extractedLayers.push({
            type: 'semantic',
            kind: region.kind,
            extracted,
            metadata: { bbox: region.bbox }
          })
        }
      }

      // Track OCR result so we can enable inline editing overlay
      let ocrForOverlay: any | null = null;

      // Extract text if enabled
      if (options.extractText) {
        setProgressMessage('Extracting text layers...')
        const ocrResult = await ocrService.recognize(imageData, {
          level: 'paragraph',
          confidence: options.confidenceThreshold || 0.7
        })
        ocrForOverlay = ocrResult; // Save for overlay

        for (const block of ocrResult.blocks) {
          if (block.confidence >= (options.confidenceThreshold || 0.7)) {
            // For 'layer all', treat entire paragraph as a solid block for clean grouping
            const useFullBlock = !!options.layerAll
            const regionData = workingCtx.getImageData(block.bbox.x, block.bbox.y, block.bbox.width, block.bbox.height)
            const textMask = useFullBlock
              ? (() => { const m = new ImageData(block.bbox.width, block.bbox.height); for (let i = 0; i < m.data.length; i += 4) { m.data[i]=255; m.data[i+1]=255; m.data[i+2]=255; m.data[i+3]=255; } return m; })()
              : createTextMask(regionData, block.bbox)

            // Extract text block
            const extracted = extractLayer(workingCanvas, block.bbox, textMask)
            
            // Fill the background where text was
            fillExtractedRegion(workingCanvas, block.bbox, 'blur')

            // Store layer metadata
            await layerAnythingEngine.createTextLayer(block)

            extractedLayers.push({
              type: 'text',
              extracted,
              metadata: block
            })
          }
        }
      }

      // Extract objects if enabled
      if (options.extractObjects && !options.layerAll) {
        setProgressMessage('Detecting and segmenting objects...')
        const detectionResult = await segmentationService.detect(imageData, {
          labels: ['person', 'dog', 'cat', 'car', 'object'],
          threshold: options.confidenceThreshold || 0.7
        })

        for (const detection of detectionResult.detections) {
          if (detection.confidence >= (options.confidenceThreshold || 0.7)) {
            // Segment each detected object
            const segResult = await segmentationService.segment(imageData, {
              type: 'box',
              data: detection.bbox
            })

            if (segResult.masks.length > 0) {
              // Convert RLE mask to ImageData and crop to detection bbox to avoid scaling artifacts
              const fullMask = rleMaskToImageData(segResult.masks[0].mask)
              const maskImageData = cropImageData(fullMask, detection.bbox)
              
              // Extract object pixels using cropped mask
              const extracted = extractLayer(workingCanvas, detection.bbox, maskImageData)
              
              // Fill the background where object was
              fillExtractedRegion(workingCanvas, detection.bbox, 'blur')

              // Store layer metadata
              await layerAnythingEngine.createObjectLayer(
                segResult.masks[0].mask,
                detection.bbox,
                {
                  category: detection.category,
                  refineEdges: options.refineEdges
                }
              )

              extractedLayers.push({
                type: 'object',
                extracted,
                metadata: detection
              })
            }
          }
        }
      }

      // Now create actual layers from extracted content
      const newLayers: any[] = []

      for (const extractedLayer of extractedLayers) {
        const { extracted, metadata } = extractedLayer
        
        if (!transform) continue;

        // Scale the extracted pixels to match canvas display scale
        const scaledImage = scaleImageData(extracted.imageData, transform.scale)
        const scaledMask = extracted.mask ? scaleImageData(extracted.mask, transform.scale) : undefined

        // Create a canvas for this layer at scaled size
        const layerCanvas = document.createElement('canvas')
        layerCanvas.width = scaledImage.width
        layerCanvas.height = scaledImage.height
        const layerCtx = layerCanvas.getContext('2d')

        if (layerCtx) {
          layerCtx.putImageData(scaledImage, 0, 0)

          // Calculate and clamp canvas position to the visible image area
          const rawPos = i2c({ x: extracted.bbox.x, y: extracted.bbox.y }, transform)
          const imgArea = imageRectToCanvas({ x: 0, y: 0, width: transform.imageWidth, height: transform.imageHeight }, transform)
          const clampedPos = {
            x: Math.max(imgArea.x, Math.min(imgArea.x + imgArea.width - scaledImage.width, rawPos.x)),
            y: Math.max(imgArea.y, Math.min(imgArea.y + imgArea.height - scaledImage.height, rawPos.y))
          }

          // Add to layer manager
          const layerId = layerManager.addLayer({
            canvas: layerCanvas,
            position: clampedPos,
            name: extractedLayer.type === 'text'
              ? `Text: ${metadata.text?.substring(0, 20)}...`
              : extractedLayer.type === 'semantic'
                ? `Layer: ${extractedLayer.kind}`
                : `Object: ${metadata.category || 'Unknown'}`
          })

          // Store temporary highlight metadata locally
          setLayerMeta(prev => ({
            ...prev,
            [layerId]: {
              kind: (extractedLayer.kind as SemanticKind) || 'text_block',
              sourceBBox: extracted.bbox,
              highlightUntil: Date.now() + HIGHLIGHT_DURATION_MS
            }
          }))

          // Get the layer from layer manager
          const layerData = layerManager.getLayers().find(l => l.id === layerId)
          
          newLayers.push({
            id: layerId,
            imageData: scaledImage,
            mask: scaledMask,
            name: layerData?.name || '',
            position: layerData?.position || clampedPos,
            visible: layerData?.visible !== false,
            opacity: layerData?.opacity || 1,
            selected: layerData?.selected || false,
            zIndex: layerData?.zIndex || 0
          })
        }
      }

      // Update the main canvas with the modified image (with extracted content removed)
      const finalCanvas = document.createElement('canvas')
      finalCanvas.width = workingCanvas.width
      finalCanvas.height = workingCanvas.height
      const finalCtx = finalCanvas.getContext('2d')
      if (finalCtx) {
        finalCtx.drawImage(workingCanvas, 0, 0)
        setProcessedImageUrl(finalCanvas.toDataURL('image/png'))
      }

      // Update layers state
      setLayers(prev => [...prev, ...newLayers])

      // Show success message
      setProgressMessage(`Layer Anything complete! Created ${newLayers.length} layers.`)
      
      // If we extracted text, enable the editable text overlay
      if (ocrForOverlay) {
        setTextData(ocrForOverlay)
        setShowTextOverlay(true)
      }
      
      e2eLogger.info('Editor', 'layer_anything_complete', {
        layersCreated: newLayers.length,
        options
      })

    } catch (error) {
      console.error('Layer Anything processing failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Processing failed'
      setProgressMessage(`Layer Anything error: ${errorMessage}`)
      ErrorNotification.show(`Layer Anything processing failed: ${errorMessage}`)
    }
  }

  const handleSelectionComplete = async (selection: { x: number; y: number; width: number; height: number }) => {
    // Process the selection with magic grab
    await handleToolSelect('magic-grab', { prompt: JSON.stringify(selection) })
  }

  const handleSelectionCancel = () => {
    setShowSelectionOverlay(false)
  }

  const handleMaskComplete = async (mask: ImageData) => {
    if (!imageUrl) {
      ErrorNotification.show('No image available for erasing')
      return
    }
    
    setShowMaskDrawingOverlay(false)
    setIsProcessing(true)
    setProgressMessage('Processing magic eraser...')
    
    try {
      // Get current image data
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = processedImageUrl || imageUrl
      })
      
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')
      
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      
      // Find the bounding box of the mask
      let minX = mask.width, minY = mask.height, maxX = 0, maxY = 0
      let hasMaskContent = false
      
      // Debug: Check mask dimensions
      console.log('Mask dimensions:', mask.width, 'x', mask.height)
      console.log('Image dimensions:', img.width, 'x', img.height)
      
      for (let y = 0; y < mask.height; y++) {
        for (let x = 0; x < mask.width; x++) {
          const idx = (y * mask.width + x) * 4
          // Only consider pixels with significant alpha value as mask content
          if (mask.data[idx + 3] > 128) {
            hasMaskContent = true
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
          }
        }
      }
      
      if (!hasMaskContent) {
        ErrorNotification.show('No mask content detected')
        return
      }
      
      console.log('Mask bounding box:', { minX, minY, maxX, maxY })
      
      // Calculate the actual masked region dimensions
      const maskRegionWidth = maxX - minX + 1
      const maskRegionHeight = maxY - minY + 1
      
      // Create a layer for the masked content (what will be erased)
      const srcRegionCanvas = document.createElement('canvas')
      srcRegionCanvas.width = maskRegionWidth
      srcRegionCanvas.height = maskRegionHeight
      const srcRegionCtx = srcRegionCanvas.getContext('2d')
      
      if (srcRegionCtx && transform) {
        // Copy the masked region from the original image
        srcRegionCtx.drawImage(
          img,
          minX, minY, maskRegionWidth, maskRegionHeight,
          0, 0, maskRegionWidth, maskRegionHeight
        )
        
        // Build unscaled region mask
        const regionMask = srcRegionCtx.createImageData(maskRegionWidth, maskRegionHeight)
        for (let y = 0; y < maskRegionHeight; y++) {
          for (let x = 0; x < maskRegionWidth; x++) {
            const srcIdx = ((y + minY) * mask.width + (x + minX)) * 4
            const dstIdx = (y * maskRegionWidth + x) * 4
            regionMask.data[dstIdx]     = 255
            regionMask.data[dstIdx + 1] = 255
            regionMask.data[dstIdx + 2] = 255
            regionMask.data[dstIdx + 3] = mask.data[srcIdx + 3]
          }
        }
        
        // Apply mask alpha to source region (unscaled)
        const regionImageData = srcRegionCtx.getImageData(0, 0, maskRegionWidth, maskRegionHeight)
        for (let i = 0; i < regionImageData.data.length; i += 4) {
          if (regionMask.data[i + 3] === 0) regionImageData.data[i + 3] = 0
        }
        srcRegionCtx.putImageData(regionImageData, 0, 0)

        // Scale region and mask to display scale for correct placement
        const scaledW = Math.max(1, Math.round(maskRegionWidth * transform.scale))
        const scaledH = Math.max(1, Math.round(maskRegionHeight * transform.scale))
        const layerCanvas = document.createElement('canvas')
        layerCanvas.width = scaledW
        layerCanvas.height = scaledH
        const layerCtx = layerCanvas.getContext('2d')!
        layerCtx.imageSmoothingEnabled = true
        layerCtx.imageSmoothingQuality = 'high'
        layerCtx.drawImage(srcRegionCanvas, 0, 0, maskRegionWidth, maskRegionHeight, 0, 0, scaledW, scaledH)

        // Scale mask similarly
        const maskScaleCanvas = document.createElement('canvas')
        maskScaleCanvas.width = scaledW
        maskScaleCanvas.height = scaledH
        const maskScaleCtx = maskScaleCanvas.getContext('2d')!
        const maskSrcCanvas = document.createElement('canvas')
        maskSrcCanvas.width = maskRegionWidth
        maskSrcCanvas.height = maskRegionHeight
        maskSrcCanvas.getContext('2d')!.putImageData(regionMask, 0, 0)
        maskScaleCtx.imageSmoothingEnabled = false
        maskScaleCtx.drawImage(maskSrcCanvas, 0, 0, maskRegionWidth, maskRegionHeight, 0, 0, scaledW, scaledH)
        const scaledMaskImageData = maskScaleCtx.getImageData(0, 0, scaledW, scaledH)

        // Calculate and clamp canvas position
        const rawPos = i2c({ x: minX, y: minY }, transform)
        const imgArea = imageRectToCanvas({ x: 0, y: 0, width: transform.imageWidth, height: transform.imageHeight }, transform)
        const canvasPos = {
          x: Math.max(imgArea.x, Math.min(imgArea.x + imgArea.width - scaledW, rawPos.x)),
          y: Math.max(imgArea.y, Math.min(imgArea.y + imgArea.height - scaledH, rawPos.y))
        }
        
        // Add to layer manager
        const layerId = layerManager.addLayer({
          canvas: layerCanvas,
          position: canvasPos,
          name: 'Erased Content'
        })
        
        // Update layers state with scaled data
        const layerImageData = layerCtx.getImageData(0, 0, scaledW, scaledH)
        setLayers(layerManager.getLayers().map(layer => ({
          ...layer,
          imageData: layer.id === layerId ? layerImageData : layers.find(l => l.id === layer.id)?.imageData,
          mask: layer.id === layerId ? scaledMaskImageData : layers.find(l => l.id === layer.id)?.mask
        })))
        
        // Process with magic eraser directly - it will handle content removal and filling
        const result = await unifiedAIService.processImage('magic-eraser', imageData, { mask })
        
        // Set the processed image (with erased areas filled)
        const resultCanvas = document.createElement('canvas')
        resultCanvas.width = result.imageData.width
        resultCanvas.height = result.imageData.height
        const resultCtx = resultCanvas.getContext('2d')!
        resultCtx.putImageData(result.imageData, 0, 0)
        
        setProcessedImageUrl(resultCanvas.toDataURL('image/png'))
        
        e2eLogger.info('Editor', 'magic_eraser_complete', {
          layerId,
          maskRegion: { x: minX, y: minY, width: maskRegionWidth, height: maskRegionHeight }
        })
      }
      
      setProgressMessage('Magic eraser completed!')
      setTimeout(() => setProgressMessage(''), 2000)
    } catch (error) {
      console.error('Error processing magic eraser:', error)
      const errorMessage = error instanceof Error ? error.message : 'Processing failed'
      setProgressMessage(`Error: ${errorMessage}`)
      ErrorNotification.show(`Error processing magic eraser: ${errorMessage}`)
      setTimeout(() => setProgressMessage(''), 5000)
    } finally {
      setIsProcessing(false)
      setPendingEraserImageData(null)
    }
  }

  const handleMaskCancel = () => {
    setShowMaskDrawingOverlay(false)
    setPendingEraserImageData(null)
  }

  // Update transform when image changes
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      const transformInfo = calculateTransform(
        { width: img.width, height: img.height },
        { width: 800, height: 600 }
      );
      setTransform(transformInfo);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const selectedLayer = layerManager.getSelectedLayer();
      if (!selectedLayer) return;

      let handled = false;
      const nudgeAmount = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'ArrowLeft':
          layerManager.nudgeLayer(selectedLayer.id, -nudgeAmount, 0);
          handled = true;
          break;
        case 'ArrowRight':
          layerManager.nudgeLayer(selectedLayer.id, nudgeAmount, 0);
          handled = true;
          break;
        case 'ArrowUp':
          layerManager.nudgeLayer(selectedLayer.id, 0, -nudgeAmount);
          handled = true;
          break;
        case 'ArrowDown':
          layerManager.nudgeLayer(selectedLayer.id, 0, nudgeAmount);
          handled = true;
          break;
        case 'Delete':
        case 'Backspace':
          layerManager.removeLayer(selectedLayer.id);
          handled = true;
          break;
        case 'j':
          if (e.ctrlKey || e.metaKey) {
            layerManager.duplicateLayer(selectedLayer.id);
            handled = true;
          }
          break;
      }

      if (handled) {
        e.preventDefault();
        setLayers(layerManager.getLayers().map(layer => ({
          ...layer,
          imageData: layers.find(l => l.id === layer.id)?.imageData,
          mask: layers.find(l => l.id === layer.id)?.mask
        })));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layers]);

  // Debug overlay keyboard shortcut
  useEffect(() => {
    const handleDebugKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+D (Mac) or Ctrl+Shift+D (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebugOverlay(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleDebugKeyDown);
    return () => window.removeEventListener('keydown', handleDebugKeyDown);
  }, []);

  return (
    <div className="editor-container">
      <Toolbar
        onToolSelect={handleToolSelect}
        onImageUpload={handleImageUpload}
        isProcessing={isProcessing}
      />
      <div className="canvas-container">
        <div style={{ position: 'relative', width: '800px', height: '600px' }}>
          {/* Always show the canvas as the base layer */}
          <Canvas imageUrl={processedImageUrl || imageUrl} />
          
          {/* Temporary highlight chips for newly created layers */}
          {Object.entries(layerMeta).map(([id, meta]) => {
            const show = Date.now() < meta.highlightUntil
            if (!show) return null
            const pos = transform ? i2c({ x: meta.sourceBBox.x, y: meta.sourceBBox.y }, transform) : { x: meta.sourceBBox.x, y: meta.sourceBBox.y }
            const size = transform ? { w: meta.sourceBBox.width * transform.scale, h: meta.sourceBBox.height * transform.scale } : { w: meta.sourceBBox.width, h: meta.sourceBBox.height }
            return (
              <LayerChipHighlight
                key={`chip-${id}`}
                x={pos.x}
                y={pos.y}
                width={size.w}
                height={size.h}
                label={`Layer: ${meta.kind}`}
              />
            )
          })}

          {/* Show text overlay on top of the canvas (editable) */}
          {showTextOverlay && textData && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '800px',
              height: '600px'
            }}>
              <TextOverlay
                imageUrl={imageUrl}
                textData={textData}
                highlightMode={'block'}
                onTextUpdate={(updatedText) => console.log('Updated text:', updatedText)}
              />
            </div>
          )}
          
          {/* Show mask drawing overlay on top of the canvas */}
          {showMaskDrawingOverlay && (
            <MaskDrawingOverlay
              imageUrl={imageUrl}
              onMaskComplete={handleMaskComplete}
              onCancel={handleMaskCancel}
              isActive={showMaskDrawingOverlay}
            />
          )}
        </div>
        
        {showSelectionOverlay && (
          <SelectionOverlay
            imageUrl={imageUrl}
            onSelectionComplete={handleSelectionComplete}
            onCancel={handleSelectionCancel}
            isActive={showSelectionOverlay}
          />
        )}
        
        
        {/* Render all layers */}
        {layers.map(layer => (
          <MagicGrabLayer
            key={layer.id}
            layer={layer}
            imageData={layer.imageData}
            mask={layer.mask}
            onDragStart={(id, x, y) => {
              console.log('Drag start:', id, x, y);
            }}
            onDrag={(id, x, y) => {
              layerManager.moveLayer(id, { x, y });
              setLayers(layerManager.getLayers().map(l => ({
                ...l,
                imageData: layers.find(ll => ll.id === l.id)?.imageData,
                mask: layers.find(ll => ll.id === l.id)?.mask
              })));
              // Clear highlight when user moves a layer
              setLayerMeta(prev => {
                const next = { ...prev }
                if (next[id]) next[id].highlightUntil = 0
                return next
              })
            }}
            onDragEnd={(id) => {
              console.log('Drag end:', id);
            }}
            onSelect={(id) => {
              layerManager.selectLayer(id);
              setLayers(layerManager.getLayers().map(l => ({
                ...l,
                imageData: layers.find(ll => ll.id === l.id)?.imageData,
                mask: layers.find(ll => ll.id === l.id)?.mask
              })));
              // Clear highlight on select
              setLayerMeta(prev => {
                const next = { ...prev }
                if (next[id]) next[id].highlightUntil = 0
                return next
              })
            }}
          />
        ))}
        
        {/* Debug overlay */}
        <DebugOverlay
          promptBox={debugPromptBox}
          maskOutline={debugMaskOutline}
          isVisible={showDebugOverlay}
        />
        
        {isProcessing && (
          <ProgressBar message={progressMessage} />
        )}
      </div>
    </div>
  )
}

export default Editor

/**
 * Semantic slicer: returns deterministic social-post regions.
 * Enhanced with OCR-based detection and better heuristics.
 */
function semanticSlicer(
  imgSize: { width: number; height: number },
  ocr: any,
  detections: any
): SemanticRegion[] {
  const W = imgSize.width
  const H = imgSize.height
  const regions: SemanticRegion[] = []

  // Use OCR blocks to better identify regions
  const ocrBlocks = ocr?.blocks || []
  
  // Find avatar region - typically a circular area in top-left
  // Look for the leftmost, topmost non-text region
  let avatarBBox: BBox | null = null
  
  // First, try to find avatar from detections
  const personDetections = (detections?.detections || []).filter((d: any) =>
    d.category === 'person' && d.bbox.y < H * 0.25 && d.bbox.x < W * 0.25
  )
  
  if (personDetections.length > 0) {
    // Use the first person detection as avatar
    const avatar = personDetections[0]
    avatarBBox = {
      x: avatar.bbox.x,
      y: avatar.bbox.y,
      width: Math.min(avatar.bbox.width, avatar.bbox.height), // Make it square
      height: Math.min(avatar.bbox.width, avatar.bbox.height)
    }
  } else {
    // Fallback: assume avatar is in top-left corner
    const avatarSize = Math.round(Math.min(W, H) * 0.08)
    avatarBBox = {
      x: Math.round(W * 0.04),
      y: Math.round(H * 0.03),
      width: avatarSize,
      height: avatarSize
    }
  }
  
  regions.push({
    kind: 'avatar',
    bbox: avatarBBox
  })

  // Find name/handle - look for text blocks near avatar
  const nameHandleBlocks = ocrBlocks.filter((block: any) => {
    const isNearAvatar = block.bbox.x > avatarBBox!.x + avatarBBox!.width &&
                        block.bbox.x < avatarBBox!.x + avatarBBox!.width + W * 0.5 &&
                        block.bbox.y < avatarBBox!.y + avatarBBox!.height * 1.5
    return isNearAvatar && block.confidence > 0.5
  })

  if (nameHandleBlocks.length > 0) {
    // Merge nearby name/handle blocks
    let minX = nameHandleBlocks[0].bbox.x
    let minY = nameHandleBlocks[0].bbox.y
    let maxX = nameHandleBlocks[0].bbox.x + nameHandleBlocks[0].bbox.width
    let maxY = nameHandleBlocks[0].bbox.y + nameHandleBlocks[0].bbox.height
    
    for (const block of nameHandleBlocks) {
      minX = Math.min(minX, block.bbox.x)
      minY = Math.min(minY, block.bbox.y)
      maxX = Math.max(maxX, block.bbox.x + block.bbox.width)
      maxY = Math.max(maxY, block.bbox.y + block.bbox.height)
    }
    
    regions.push({
      kind: 'name_handle',
      bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    })
  } else {
    // Fallback positioning
    regions.push({
      kind: 'name_handle',
      bbox: {
        x: avatarBBox.x + avatarBBox.width + Math.round(W * 0.02),
        y: avatarBBox.y,
        width: Math.round(W * 0.4),
        height: avatarBBox.height
      }
    })
  }

  // Find actions (buttons/icons) - typically on the right side of header
  const actionY = avatarBBox.y
  const actionHeight = avatarBBox.height
  regions.push({
    kind: 'actions',
    bbox: {
      x: Math.round(W * 0.65),
      y: actionY,
      width: Math.round(W * 0.3),
      height: actionHeight
    }
  })

  // Find main text content - merge all text blocks in the middle section
  const headerBottom = avatarBBox.y + avatarBBox.height + H * 0.02
  const textBlocks = ocrBlocks.filter((block: any) =>
    block.bbox.y > headerBottom &&
    block.bbox.y < H * 0.6 &&
    block.confidence > 0.4
  )

  if (textBlocks.length > 0) {
    // Merge all text blocks into one region
    let minX = W, minY = H, maxX = 0, maxY = 0
    
    for (const block of textBlocks) {
      minX = Math.min(minX, block.bbox.x)
      minY = Math.min(minY, block.bbox.y)
      maxX = Math.max(maxX, block.bbox.x + block.bbox.width)
      maxY = Math.max(maxY, block.bbox.y + block.bbox.height)
    }
    
    // Add some padding
    minX = Math.max(0, minX - 10)
    minY = Math.max(headerBottom, minY - 10)
    maxX = Math.min(W, maxX + 10)
    maxY = Math.min(H * 0.6, maxY + 10)
    
    regions.push({
      kind: 'text_block',
      bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    })
  } else {
    // Fallback text region
    regions.push({
      kind: 'text_block',
      bbox: {
        x: Math.round(W * 0.04),
        y: Math.round(headerBottom),
        width: Math.round(W * 0.92),
        height: Math.round(H * 0.25)
      }
    })
  }

  // Find media region - look for large rectangular areas or detected objects
  const mediaDetections = (detections?.detections || []).filter((d: any) =>
    d.bbox.y > H * 0.3 && d.bbox.y < H * 0.8 &&
    d.bbox.width > W * 0.5 && d.bbox.height > H * 0.2
  )

  if (mediaDetections.length > 0) {
    // Use the largest detection as media
    const media = mediaDetections.reduce((largest: any, current: any) =>
      (current.bbox.width * current.bbox.height > largest.bbox.width * largest.bbox.height) ? current : largest
    )
    regions.push({
      kind: 'media',
      bbox: media.bbox
    })
  } else {
    // Fallback: assume media is in the middle section
    const lastTextRegion = regions.find(r => r.kind === 'text_block')
    const mediaTop = lastTextRegion ?
      lastTextRegion.bbox.y + lastTextRegion.bbox.height + H * 0.02 :
      H * 0.4
    
    regions.push({
      kind: 'media',
      bbox: {
        x: Math.round(W * 0.04),
        y: Math.round(mediaTop),
        width: Math.round(W * 0.92),
        height: Math.round(H * 0.35)
      }
    })
  }

  // Find meta information (date/time/views) - usually at the bottom
  const bottomTextBlocks = ocrBlocks.filter((block: any) =>
    block.bbox.y > H * 0.8 && block.confidence > 0.4
  )

  if (bottomTextBlocks.length > 0) {
    // Merge bottom text blocks
    let minX = W, minY = H, maxX = 0, maxY = 0
    
    for (const block of bottomTextBlocks) {
      minX = Math.min(minX, block.bbox.x)
      minY = Math.min(minY, block.bbox.y)
      maxX = Math.max(maxX, block.bbox.x + block.bbox.width)
      maxY = Math.max(maxY, block.bbox.y + block.bbox.height)
    }
    
    regions.push({
      kind: 'meta',
      bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    })
  } else {
    // Fallback meta region
    const mediaRegion = regions.find(r => r.kind === 'media')
    if (mediaRegion) {
      regions.push({
        kind: 'meta',
        bbox: {
          x: mediaRegion.bbox.x,
          y: mediaRegion.bbox.y + mediaRegion.bbox.height + H * 0.01,
          width: mediaRegion.bbox.width,
          height: Math.round(H * 0.05)
        }
      })
    }
  }

  // Check for banner at the very top
  const topTextBlocks = ocrBlocks.filter((block: any) =>
    block.bbox.y < H * 0.05 && block.bbox.width > W * 0.7
  )
  
  if (topTextBlocks.length > 0) {
    regions.push({
      kind: 'banner',
      bbox: {
        x: 0,
        y: 0,
        width: W,
        height: Math.round(H * 0.05)
      }
    })
  }

  // Clamp all bboxes to image bounds
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
  for (const r of regions) {
    r.bbox.x = clamp(r.bbox.x, 0, W - 1)
    r.bbox.y = clamp(r.bbox.y, 0, H - 1)
    r.bbox.width = clamp(r.bbox.width, 1, W - r.bbox.x)
    r.bbox.height = clamp(r.bbox.height, 1, H - r.bbox.y)
  }

  // Remove any regions that are too small
  return regions.filter(r => r.bbox.width > 10 && r.bbox.height > 10)
}
