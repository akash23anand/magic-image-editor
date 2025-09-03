/**
 * Layer Anything Demo - Showcase application for the Layer Anything tool
 * Demonstrates all features from the PRP implementation
 */

import React, { useState, useCallback } from 'react';
import LayerAnythingEditor from '../components/LayerAnythingEditor';
import { BaseLayerMeta } from '../services/LayerAnythingEngine';
import { e2eLogger } from '../utils/E2ELogger';

interface DemoImage {
  id: string;
  name: string;
  url: string;
  description: string;
  category: 'text' | 'people' | 'objects' | 'mixed';
}

const DEMO_IMAGES: DemoImage[] = [
  {
    id: 'tweet',
    name: 'Social Media Post',
    url: '/demo-images/tweet-example.png',
    description: 'Text-heavy social media post with multiple text layers',
    category: 'text'
  },
  {
    id: 'portrait',
    name: 'Portrait Photo',
    url: '/demo-images/portrait-example.jpg',
    description: 'Person portrait for object segmentation demo',
    category: 'people'
  },
  {
    id: 'mixed-scene',
    name: 'Mixed Scene',
    url: '/demo-images/mixed-scene.jpg',
    description: 'Complex scene with people, animals, and text',
    category: 'mixed'
  },
  {
    id: 'product',
    name: 'Product Photo',
    url: '/demo-images/product-example.jpg',
    description: 'Product photo with text and objects',
    category: 'objects'
  }
];

const LayerAnythingDemo: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [layers, setLayers] = useState<BaseLayerMeta[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [exportData, setExportData] = useState<string | null>(null);

  const handleImageSelect = useCallback((imageUrl: string) => {
    setSelectedImage(imageUrl);
    setLayers([]);
    setExportData(null);
    
    e2eLogger.info('LayerAnythingDemo', 'image_selected', { imageUrl });
  }, []);

  const handleLayerChange = useCallback((newLayers: BaseLayerMeta[]) => {
    setLayers(newLayers);
    e2eLogger.info('LayerAnythingDemo', 'layers_updated', { 
      layerCount: newLayers.length,
      layerTypes: newLayers.map(l => l.type)
    });
  }, []);

  const handleExport = useCallback((data: string, format: string) => {
    setExportData(data);
    
    // Create download link
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `layer-anything-export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    e2eLogger.info('LayerAnythingDemo', 'export_downloaded', { format });
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          handleImageSelect(result);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [handleImageSelect]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e9ecef',
        padding: '16px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '700',
              color: '#212529'
            }}>
              Layer Anything Demo
            </h1>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '14px', 
              color: '#6c757d'
            }}>
              Advanced on-canvas layering with AI-powered text and object detection
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              style={{
                padding: '8px 16px',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showInstructions ? 'Hide' : 'Show'} Instructions
            </button>
            
            <label
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                border: 'none'
              }}
            >
              Upload Image
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Instructions Panel */}
        {showInstructions && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#212529' }}>
              How to Use Layer Anything
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#495057' }}>
                  🎯 Selection Tools
                </h4>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#6c757d' }}>
                  <li>Press <kbd>V</kbd> for Select tool</li>
                  <li>Draw boxes around regions</li>
                  <li>Right-click for options</li>
                </ul>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#495057' }}>
                  📝 Text Detection
                </h4>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#6c757d' }}>
                  <li>Press <kbd>T</kbd> for Grab Text</li>
                  <li>Click on text to layer it</li>
                  <li>Press <kbd>Shift+T</kbd> to find all text</li>
                </ul>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#495057' }}>
                  🎪 Object Segmentation
                </h4>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#6c757d' }}>
                  <li>Press <kbd>O</kbd> for Grab Object</li>
                  <li>Click on objects to segment</li>
                  <li>Press <kbd>Shift+O</kbd> to auto-detect</li>
                </ul>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#495057' }}>
                  ⚡ Automation
                </h4>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#6c757d' }}>
                  <li>Press <kbd>Shift+A</kbd> to layer everything</li>
                  <li>Use one-click detection buttons</li>
                  <li>Refine with <kbd>R</kbd> tool</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Demo Images Selection */}
        {!selectedImage && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#212529' }}>
              Choose a Demo Image
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px' 
            }}>
              {DEMO_IMAGES.map((image) => (
                <div
                  key={image.id}
                  onClick={() => handleImageSelect(image.url)}
                  style={{
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#007bff';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,123,255,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#dee2e6';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: '100%',
                    height: '120px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    {image.category === 'text' && '📝'}
                    {image.category === 'people' && '👤'}
                    {image.category === 'objects' && '📦'}
                    {image.category === 'mixed' && '🎨'}
                  </div>
                  
                  <h4 style={{ 
                    margin: '0 0 4px 0', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: '#212529'
                  }}>
                    {image.name}
                  </h4>
                  
                  <p style={{ 
                    margin: 0, 
                    fontSize: '12px', 
                    color: '#6c757d',
                    lineHeight: '1.4'
                  }}>
                    {image.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Editor */}
        {selectedImage && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <LayerAnythingEditor
              imageUrl={selectedImage}
              onLayerChange={handleLayerChange}
              onExport={handleExport}
            />
          </div>
        )}

        {/* Layer Statistics */}
        {layers.length > 0 && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#212529' }}>
              Layer Statistics
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '16px' 
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#007bff' }}>
                  {layers.length}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Total Layers</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>
                  {layers.filter(l => l.type === 'text').length}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Text Layers</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffc107' }}>
                  {layers.filter(l => l.type === 'object').length}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Object Layers</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#6c757d' }}>
                  {layers.filter(l => l.visible).length}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Visible Layers</div>
              </div>
            </div>
            
            {/* Export Button */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                onClick={() => handleExport(JSON.stringify(layers, null, 2), 'json')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                📥 Export Layers (JSON)
              </button>
            </div>
          </div>
        )}

        {/* Reset Button */}
        {selectedImage && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button
              onClick={() => {
                setSelectedImage(null);
                setLayers([]);
                setExportData(null);
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Back to Image Selection
            </button>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        maxWidth: '200px'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '8px' }}>Keyboard Shortcuts</div>
        <div>V - Select | T - Text | O - Object</div>
        <div>R - Refine | B - Background</div>
        <div>Shift+T - Find All Text</div>
        <div>Shift+O - Find Objects</div>
        <div>Shift+A - Layer Everything</div>
      </div>

      <style>{`
        kbd {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 3px;
          padding: 2px 4px;
          font-size: 11px;
          font-family: monospace;
        }
      `}</style>
    </div>
  );
};

export default LayerAnythingDemo;