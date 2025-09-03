import React, { useRef, useState } from 'react'
import { e2eLogger } from '../utils/E2ELogger'
import { ErrorNotification } from '../utils/ErrorNotification'
import { SettingsPanel } from './SettingsPanel'
import UnifiedModelSelector from './UnifiedModelSelector'

interface ToolbarProps {
  onToolSelect: (tool: string, options?: any) => void
  onImageUpload: (file: File) => void
  isProcessing: boolean
}

const Toolbar: React.FC<ToolbarProps> = ({ onToolSelect, onImageUpload, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showBgControls, setShowBgControls] = useState(false)
  const [bgSensitivity, setBgSensitivity] = useState(0.5)
  const [bgEdgeFeather, setBgEdgeFeather] = useState(2)
  const [bgPreserveEdges, setBgPreserveEdges] = useState(true)
  const [currentTool, setCurrentTool] = useState<string | null>(null)
  
  // Layer Anything settings
  const [showLayerControls, setShowLayerControls] = useState(false)
  const [layerTextEnabled, setLayerTextEnabled] = useState(true)
  const [layerObjectsEnabled, setLayerObjectsEnabled] = useState(true)
  const [layerBackgroundEnabled, setLayerBackgroundEnabled] = useState(true)
  const [layerConfidenceThreshold, setLayerConfidenceThreshold] = useState(0.7)
  const [layerRefinement, setLayerRefinement] = useState(true)

  const tools = [
    { id: 'upload', icon: '📁', label: 'Upload' },
    { id: 'layer-anything', icon: '⚡', label: 'Layer Anything' },
    { id: 'bg-remover', icon: '✂️', label: 'BG Remover' },
    { id: 'bg-generator', icon: '🎨', label: 'BG Generator' },
    { id: 'magic-eraser', icon: '🧽', label: 'Magic Eraser' },
    { id: 'magic-grab', icon: '👆', label: 'Magic Grab' },
    { id: 'grab-text', icon: '📝', label: 'Grab Text' },
    { id: 'magic-edit', icon: '✏️', label: 'Magic Edit' },
    { id: 'magic-expand', icon: '⬜', label: 'Magic Expand' }
  ]

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    
    if (!file) {
      e2eLogger.debug('Toolbar', 'no_file_selected')
      return
    }

    // File validation
    if (!file.type.startsWith('image/')) {
      e2eLogger.error('Toolbar', 'invalid_file_type', {
        type: file.type,
        name: file.name,
        size: file.size
      })
      ErrorNotification.show(`Invalid file type: ${file.type}. Please select an image file (JPG, PNG, GIF, etc.)`)
      return
    }

    // File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      e2eLogger.error('Toolbar', 'file_too_large', {
        size: file.size,
        maxSize,
        name: file.name
      })
      ErrorNotification.show(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Please select an image under 10MB`)
      return
    }

    try {
      e2eLogger.info('Toolbar', 'file_selected', {
        name: file.name,
        size: file.size,
        type: file.type
      })
      onImageUpload(file)
    } catch (error) {
      e2eLogger.error('Toolbar', 'upload_failed', {
        error: error instanceof Error ? error.message : String(error),
        file: file.name
      })
      ErrorNotification.show('Failed to upload image. Please try again or select a different file.')
    } finally {
      // Reset the file input to allow selecting the same file again
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleToolClick = (toolId: string) => {
    setCurrentTool(toolId)
    
    if (toolId === 'upload') {
      fileInputRef.current?.click()
    } else if (toolId === 'layer-anything') {
      // Toggle Layer Anything controls
      setShowLayerControls(!showLayerControls)
    } else if (toolId === 'bg-remover') {
      // Toggle background removal controls
      setShowBgControls(!showBgControls)
    } else {
      // Handle tools that require additional parameters
      let options = {};
      
      switch (toolId) {
        case 'bg-generator':
          const bgPrompt = prompt('Enter background description:');
          if (!bgPrompt) return;
          options = { prompt: bgPrompt };
          break;
          
        case 'magic-eraser':
          // No options needed - will trigger mask drawing overlay
          break;
          
        case 'magic-grab':
          // No prompt needed - will show selection overlay
          break;
          
        case 'grab-text':
          // No additional parameters needed
          break;
          
        case 'magic-edit':
          const editPrompt = prompt('Enter edit instruction:');
          if (!editPrompt) return;
          options = { prompt: editPrompt };
          break;
          
        case 'magic-expand':
          const direction = prompt('Enter direction (left, right, top, bottom):');
          const pixels = prompt('Enter pixels to expand:');
          if (!direction || !pixels) return;
          options = { prompt: `${direction}:${pixels}` };
          break;
          
        case 'bg-remover':
          // Handled by the controls below
          break;
      }
      
      onToolSelect(toolId, options)
    }
  }

  const handleBgRemove = () => {
    onToolSelect('bg-remover', {
      sensitivity: bgSensitivity,
      edgeFeather: bgEdgeFeather,
      preserveEdges: bgPreserveEdges
    })
    setShowBgControls(false)
  }

  const handleLayerAnything = () => {
    const options = {
      extractText: layerTextEnabled,
      extractObjects: layerObjectsEnabled,
      extractBackground: layerBackgroundEnabled,
      confidenceThreshold: layerConfidenceThreshold,
      refineEdges: layerRefinement
    }
    
    onToolSelect('layer-anything', options)
    setShowLayerControls(false)
  }

  const handleLayerAll = () => {
    const options = {
      extractText: true,
      extractObjects: true,
      extractBackground: true,
      confidenceThreshold: 0.6,
      refineEdges: true,
      layerAll: true
    }
    
    onToolSelect('layer-anything', options)
    setShowLayerControls(false)
  }

  return (
    <div className="toolbar">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      {/* App Title */}
      <div
        style={{
          textAlign: 'center',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px'
        }}
      >
        Magic Image Editor
      </div>
      <div
        style={{
          height: '1px',
          backgroundColor: '#444',
          margin: '4px 0 8px 0'
        }}
      />
      <div className="toolbar-tools">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            disabled={isProcessing && tool.id !== 'upload'}
            title={tool.label}
          >
            <span>{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
      </div>
      
      {/* Unified Model Selector */}
      <UnifiedModelSelector
        currentTool={currentTool}
        onModelChange={(toolId, modelId) => {
          e2eLogger.info('Toolbar', 'model_changed', { toolId, modelId });
        }}
      />
      
      <SettingsPanel
        isOpen={showBgControls}
        onClose={() => setShowBgControls(false)}
        title="Background Removal Settings"
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
            Sensitivity: {bgSensitivity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={bgSensitivity}
            onChange={(e) => setBgSensitivity(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, #e0e0e0 0%, #e0e0e0 ${bgSensitivity * 100}%, #007bff ${bgSensitivity * 100}%, #007bff 100%)`,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginTop: '4px' }}>
            <span>Strict</span>
            <span>Balanced</span>
            <span>Lenient</span>
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
            Edge Feather: {bgEdgeFeather}px
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={bgEdgeFeather}
            onChange={(e) => setBgEdgeFeather(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, #e0e0e0 0%, #e0e0e0 ${(bgEdgeFeather / 10) * 100}%, #007bff ${(bgEdgeFeather / 10) * 100}%, #007bff 100%)`,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginTop: '4px' }}>
            <span>Sharp</span>
            <span>Smooth</span>
          </div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={bgPreserveEdges}
              onChange={(e) => setBgPreserveEdges(e.target.checked)}
              style={{ marginRight: '8px', transform: 'scale(1.2)' }}
            />
            <span>Preserve fine details and edges</span>
          </label>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleBgRemove}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
          >
            Apply Changes
          </button>
          <button
            onClick={() => setShowBgControls(false)}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              background: '#f8f9fa',
              color: '#333',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          >
            Cancel
          </button>
        </div>
      </SettingsPanel>

      <SettingsPanel
        isOpen={showLayerControls}
        onClose={() => setShowLayerControls(false)}
        title="Layer Anything Settings"
      >
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
            What to Layer
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layerTextEnabled}
                onChange={(e) => setLayerTextEnabled(e.target.checked)}
                style={{ marginRight: '8px', transform: 'scale(1.2)' }}
              />
              <span>📝 Extract Text (OCR)</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layerObjectsEnabled}
                onChange={(e) => setLayerObjectsEnabled(e.target.checked)}
                style={{ marginRight: '8px', transform: 'scale(1.2)' }}
              />
              <span>🎪 Extract Objects</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layerBackgroundEnabled}
                onChange={(e) => setLayerBackgroundEnabled(e.target.checked)}
                style={{ marginRight: '8px', transform: 'scale(1.2)' }}
              />
              <span>🖼️ Extract Background</span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
            Confidence Threshold: {layerConfidenceThreshold.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.3"
            max="0.95"
            step="0.05"
            value={layerConfidenceThreshold}
            onChange={(e) => setLayerConfidenceThreshold(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, #e0e0e0 0%, #e0e0e0 ${((layerConfidenceThreshold - 0.3) / 0.65) * 100}%, #007bff ${((layerConfidenceThreshold - 0.3) / 0.65) * 100}%, #007bff 100%)`,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginTop: '4px' }}>
            <span>Lower Quality</span>
            <span>Higher Quality</span>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={layerRefinement}
              onChange={(e) => setLayerRefinement(e.target.checked)}
              style={{ marginRight: '8px', transform: 'scale(1.2)' }}
            />
            <span>✨ Refine layer edges and masks</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={handleLayerAll}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
          >
            ⚡ Layer All
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleLayerAnything}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
          >
            Apply Settings
          </button>
          <button
            onClick={() => setShowLayerControls(false)}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              background: '#f8f9fa',
              color: '#333',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          >
            Cancel
          </button>
        </div>
      </SettingsPanel>
    </div>
  )
}

export default Toolbar
