import React, { useState, useEffect } from 'react';
import { modelConfigService, ModelConfig } from '../services/ModelConfigService';
import { e2eLogger } from '../utils/E2ELogger';

interface UnifiedModelSelectorProps {
  currentTool: string | null;
  onModelChange?: (toolId: string, modelId: string) => void;
}

const UnifiedModelSelector: React.FC<UnifiedModelSelectorProps> = ({ 
  currentTool, 
  onModelChange 
}) => {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (currentTool) {
      const model = modelConfigService.getSelectedModel(currentTool);
      setSelectedModel(model);
    }
  }, [currentTool]);

  if (!currentTool || currentTool === 'upload') {
    return null;
  }

  const toolModels = modelConfigService.getToolModels(currentTool);
  if (!toolModels) {
    return null;
  }

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    modelConfigService.setSelectedModel(currentTool, modelId);
    setIsExpanded(false);
    
    if (onModelChange) {
      onModelChange(currentTool, modelId);
    }
    
    e2eLogger.info('UnifiedModelSelector', 'model_changed', {
      tool: currentTool,
      model: modelId
    });
  };

  const currentModel = toolModels.models.find(m => m.id === selectedModel);
  const recommendedModel = toolModels.models.find(m => m.recommended);

  const renderQualityStars = (quality: number) => {
    return '⭐'.repeat(quality) + '☆'.repeat(5 - quality);
  };

  const renderSpeedBolts = (speed: number) => {
    return '⚡'.repeat(speed);
  };

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case 'browser': return '🌐';
      case 'local': return '💻';
      case 'api': return '🔌';
      case 'fallback': return '🔄';
      default: return '❓';
    }
  };

  const getModelTypeColor = (type: string) => {
    switch (type) {
      case 'browser': return '#4CAF50';
      case 'local': return '#2196F3';
      case 'api': return '#FF9800';
      case 'fallback': return '#9E9E9E';
      default: return '#757575';
    }
  };

  return (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <label style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          AI Model
        </label>
        {recommendedModel && currentModel?.id !== recommendedModel.id && (
          <span style={{
            fontSize: '11px',
            color: '#007bff',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onClick={() => handleModelSelect(recommendedModel.id)}>
            Use Recommended
          </span>
        )}
      </div>

      <div 
        style={{
          position: 'relative',
          cursor: 'pointer',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#007bff';
          e.currentTarget.style.boxShadow = '0 0 0 1px #007bff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#ddd';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>
            {currentModel && getModelTypeIcon(currentModel.type)}
          </span>
          <div>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {currentModel?.name || 'Select Model'}
              {currentModel?.recommended && (
                <span style={{
                  fontSize: '10px',
                  background: '#28a745',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: '600'
                }}>
                  RECOMMENDED
                </span>
              )}
            </div>
            {currentModel && (
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                {renderQualityStars(currentModel.quality)} {renderSpeedBolts(currentModel.speed)}
              </div>
            )}
          </div>
        </div>
        <span style={{
          fontSize: '12px',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </span>
      </div>

      {isExpanded && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          right: '0',
          marginTop: '4px',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {toolModels.models.map((model) => {
            const isSelected = model.id === selectedModel;
            const isAvailable = modelConfigService.isModelAvailable(currentTool, model.id);
            
            return (
              <div
                key={model.id}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  opacity: isAvailable ? 1 : 0.5,
                  background: isSelected ? '#f8f9fa' : 'white',
                  transition: 'background 0.2s'
                }}
                onClick={() => isAvailable && handleModelSelect(model.id)}
                onMouseEnter={(e) => {
                  if (isAvailable && !isSelected) {
                    e.currentTarget.style.background = '#f0f0f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ 
                    fontSize: '20px',
                    marginTop: '2px'
                  }}>
                    {getModelTypeIcon(model.type)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{ 
                        fontWeight: isSelected ? '600' : '500',
                        fontSize: '14px'
                      }}>
                        {model.name}
                      </span>
                      {model.recommended && (
                        <span style={{
                          fontSize: '10px',
                          background: '#28a745',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontWeight: '600'
                        }}>
                          RECOMMENDED
                        </span>
                      )}
                      {isSelected && (
                        <span style={{
                          fontSize: '10px',
                          background: '#007bff',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontWeight: '600'
                        }}>
                          SELECTED
                        </span>
                      )}
                    </div>
                    
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666',
                      marginBottom: '4px'
                    }}>
                      {renderQualityStars(model.quality)} {renderSpeedBolts(model.speed)}
                    </div>
                    
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#888',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: getModelTypeColor(model.type)
                      }}></span>
                      <span style={{ textTransform: 'capitalize' }}>{model.type}</span>
                      {model.size && <span>• {model.size}</span>}
                      {model.requirements && <span>• {model.requirements}</span>}
                    </div>

                    {!isAvailable && (
                      <div style={{
                        fontSize: '11px',
                        color: '#d32f2f',
                        marginTop: '4px',
                        fontStyle: 'italic'
                      }}>
                        {model.type === 'api' || model.type === 'local' 
                          ? 'Requires server setup'
                          : 'Model not downloaded'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UnifiedModelSelector;