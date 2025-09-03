import React, { useRef, useState, useEffect } from 'react'
import { e2eLogger } from '../utils/E2ELogger'
import { ErrorNotification } from '../utils/ErrorNotification'
import { SettingsPanel } from './SettingsPanel'
import OutpaintingModelSelector from './OutpaintingModelSelector'
import UnifiedModelSelector from './UnifiedModelSelector'

interface EnhancedToolbarProps {
  onToolSelect: (tool: string, options?: any) => void
  onImageUpload: (file: File) => void
  isProcessing: boolean
}

const EnhancedToolbar: React.FC<EnhancedToolbarProps> = ({ onToolSelect, onImageUpload, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showBgControls, setShowBgControls] = useState(false)
  const [bgSensitivity, setBgSensitivity] = useState(0.5)
  const [bgEdgeFeather, setBgEdgeFeather] = useState(2)
  const [bgPreserveEdges, setBgPreserveEdges] = useState(true)
  const [showExpandControls, setShowExpandControls] = useState(false)
  const [expandDirection, setExpandDirection] = useState<'left' | 'right' | 'top' | 'bottom'>('right')
  const [expandPixels, setExpandPixels] = useState(256)
  const [expandPrompt, setExpandPrompt] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [currentTool, setCurrentTool] = useState<string | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const tools = [
    { id: 'upload', icon: '📁', label: 'Upload', category: 'file' },
    { id: 'bg-remover', icon: '✂️', label: 'Remove BG', category: 'edit' },
    { id: 'bg-generator', icon: '🎨', label: 'Generate BG', category: 'create' },
    { id: 'magic-eraser', icon: '🧽', label: 'Magic Eraser', category: 'edit' },
    { id: 'magic-grab', icon: '👆', label: 'Magic Grab', category: 'select' },
    { id: 'grab-text', icon: '📝', label: 'Grab Text', category: 'extract' },
    { id: 'magic-edit', icon: '✏️', label: 'Magic Edit', category: 'edit' },
    { id: 'magic-expand', icon: '⬜', label: 'Expand', category: 'transform' }
  ]

  const categories = [
    { id: 'file', label: 'File', icon: '📁' },
    { id: 'edit', label: 'Edit', icon: '✏️' },
    { id: 'create', label: 'Create', icon: '🎨' },
    { id: 'select', label: 'Select', icon: '👆' },
    { id: 'extract', label: 'Extract', icon: '📝' },
    { id: 'transform', label: 'Transform', icon: '⬜' }
  ]

  const [activeCategory, setActiveCategory] = useState('file')

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && toolbarRef.current) {
        const deltaX = e.clientX - dragStart.x
        const deltaY = e.clientY - dragStart.y
        setPosition(prev => ({
          x: Math.max(0, Math.min(window.innerWidth - 60, prev.x + deltaX)),
          y: Math.max(0, Math.min(window.innerHeight - 60, prev.y + deltaY))
        }))
        setDragStart({ x: e.clientX, y: e.clientY })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    
    if (!file) {
      e2eLogger.debug('EnhancedToolbar', 'no_file_selected')
      return
    }

    if (!file.type.startsWith('image/')) {
      e2eLogger.error('EnhancedToolbar', 'invalid_file_type', {
        type: file.type,
        name: file.name,
        size: file.size
      })
      ErrorNotification.show(`Invalid file type: ${file.type}. Please select an image file (JPG, PNG, GIF, etc.)`)
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      e2eLogger.error('EnhancedToolbar', 'file_too_large', {
        size: file.size,
        maxSize,
        name: file.name
      })
      ErrorNotification.show(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Please select an image under 10MB`)
      return
    }

    try {
      e2eLogger.info('EnhancedToolbar', 'file_selected', {
        name: file.name,
        size: file.size,
        type: file.type
      })
      onImageUpload(file)
    } catch (error) {
      e2eLogger.error('EnhancedToolbar', 'upload_failed', {
        error: error instanceof Error ? error.message : String(error),
        file: file.name
      })
      ErrorNotification.show('Failed to upload image. Please try again or select a different file.')
    } finally {
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleToolClick = (toolId: string) => {
    setCurrentTool(toolId)
    
    if (toolId === 'upload') {
      fileInputRef.current?.click()
    } else if (toolId === 'bg-remover') {
      setShowBgControls(true)
    } else {
      let options = {}
      
      switch (toolId) {
        case 'bg-generator':
          const bgPrompt = prompt('Enter background description:')
          if (!bgPrompt) return
          options = { prompt: bgPrompt }
          break
          
        case 'magic-eraser':
          alert('Please draw a mask on the image to erase selected areas')
          options = { mask: null }
          break
          
        case 'magic-grab':
          // No prompt needed - will show selection overlay
          break
          
        case 'grab-text':
          break
          
        case 'magic-edit':
          const editPrompt = prompt('Enter edit instruction:')
          if (!editPrompt) return
          options = { prompt: editPrompt }
          break
          
        case 'magic-expand':
          setShowExpandControls(true)
          return
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

  const handleMagicExpand = () => {
    const prompt = expandPrompt ? `${expandDirection}:${expandPixels}:${expandPrompt}` : `${expandDirection}:${expandPixels}`
    onToolSelect('magic-expand', { prompt })
    setShowExpandControls(false)
  }

  const filteredTools = tools.filter(tool => tool.category === activeCategory || activeCategory === 'file')

  return (
    <>
      <div
        ref={toolbarRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          transition: isDragging ? 'none' : 'all 0.2s ease',
          minWidth: isMinimized ? '50px' : '280px',
          maxWidth: '320px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderBottom: isMinimized ? 'none' : '1px solid #f0f0f0',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={(e) => {
            setIsDragging(true)
            setDragStart({ x: e.clientX, y: e.clientY })
          }}
        >
          {!isMinimized && (
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
              Tools
            </h3>
          )}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                color: '#666',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {isMinimized ? '▶' : '◀'}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: 'none',
                      borderRadius: '16px',
                      background: activeCategory === category.id ? '#007bff' : '#f8f9fa',
                      color: activeCategory === category.id ? 'white' : '#333',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    {category.icon} {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {filteredTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id)}
                    disabled={isProcessing && tool.id !== 'upload'}
                    title={tool.label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px 8px',
                      fontSize: '24px',
                      background: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      cursor: isProcessing && tool.id !== 'upload' ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: isProcessing && tool.id !== 'upload' ? 0.5 : 1,
                      minHeight: '60px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isProcessing || tool.id === 'upload') {
                        e.currentTarget.style.backgroundColor = '#f8f9fa'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <span>{tool.icon}</span>
                    <span style={{ fontSize: '10px', marginTop: '4px', color: '#666' }}>
                      {tool.label}
                    </span>
                  </button>
                ))}
              </div>
              
              {/* Unified Model Selector */}
              <UnifiedModelSelector
                currentTool={currentTool}
                onModelChange={(toolId, modelId) => {
                  e2eLogger.info('EnhancedToolbar', 'model_changed', { toolId, modelId });
                }}
              />
            </div>
          </>
        )}
      </div>

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
        isOpen={showExpandControls}
        onClose={() => setShowExpandControls(false)}
        title="Magic Expand Settings"
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
            Expansion Direction
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {(['left', 'right', 'top', 'bottom'] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setExpandDirection(dir)}
                style={{
                  padding: '8px',
                  fontSize: '14px',
                  background: expandDirection === dir ? '#007bff' : '#f8f9fa',
                  color: expandDirection === dir ? 'white' : '#333',
                  border: expandDirection === dir ? 'none' : '1px solid #dee2e6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
            Pixels to Expand: {expandPixels}px
          </label>
          <input
            type="range"
            min="64"
            max="512"
            step="64"
            value={expandPixels}
            onChange={(e) => setExpandPixels(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, #e0e0e0 0%, #e0e0e0 ${((expandPixels - 64) / (512 - 64)) * 100}%, #007bff ${((expandPixels - 64) / (512 - 64)) * 100}%, #007bff 100%)`,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginTop: '4px' }}>
            <span>64px</span>
            <span>256px</span>
            <span>512px</span>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
            Scene Description (Optional)
          </label>
          <input
            type="text"
            value={expandPrompt}
            onChange={(e) => setExpandPrompt(e.target.value)}
            placeholder="e.g., cityscape with tall buildings"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#007bff'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Helps AI models generate contextually appropriate content
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleMagicExpand}
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
            Expand Image
          </button>
          <button
            onClick={() => setShowExpandControls(false)}
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
    </>
  )
}

export default EnhancedToolbar