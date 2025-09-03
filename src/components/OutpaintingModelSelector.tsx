import React, { useState, useEffect } from 'react';
import { outpaintingService, OutpaintingModel } from '../services/OutpaintingService';
import { e2eLogger } from '../utils/E2ELogger';

interface OutpaintingModelSelectorProps {
  onModelChange?: (modelId: string) => void;
}

const OutpaintingModelSelector: React.FC<OutpaintingModelSelectorProps> = ({ onModelChange }) => {
  const [models, setModels] = useState<OutpaintingModel[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const availableModels = await outpaintingService.getAvailableModels();
      setModels(availableModels);
      setCurrentModel(outpaintingService.getCurrentModel());
      e2eLogger.info('OutpaintingModelSelector', 'models_loaded', { 
        count: availableModels.length,
        enabled: availableModels.filter(m => m.enabled).length 
      });
    } catch (error) {
      e2eLogger.error('OutpaintingModelSelector', 'load_models_error', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (modelId: string) => {
    try {
      await outpaintingService.setCurrentModel(modelId);
      setCurrentModel(modelId);
      onModelChange?.(modelId);
      e2eLogger.info('OutpaintingModelSelector', 'model_selected', { modelId });
    } catch (error) {
      e2eLogger.error('OutpaintingModelSelector', 'model_change_error', {
        error: error instanceof Error ? error.message : String(error)
      });
      alert(`Failed to switch model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getQualityBadge = (quality: string) => {
    const colors = {
      low: '#dc3545',
      medium: '#ffc107',
      high: '#28a745',
      best: '#007bff'
    };
    
    return (
      <span style={{
        backgroundColor: colors[quality as keyof typeof colors] || '#6c757d',
        color: 'white',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        marginLeft: '8px'
      }}>
        {quality.toUpperCase()}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      browser: '#17a2b8',
      local: '#6610f2',
      api: '#e83e8c'
    };
    
    return (
      <span style={{
        backgroundColor: colors[type as keyof typeof colors] || '#6c757d',
        color: 'white',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        marginLeft: '4px'
      }}>
        {type.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '10px', textAlign: 'center' }}>
        Loading models...
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '15px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          Outpainting Model
        </h4>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '4px 8px'
          }}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <select
        value={currentModel}
        onChange={(e) => handleModelChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '14px',
          borderRadius: '4px',
          border: '1px solid #ced4da',
          backgroundColor: 'white',
          cursor: 'pointer'
        }}
      >
        {models.map((model) => (
          <option 
            key={model.id} 
            value={model.id}
            disabled={!model.enabled}
          >
            {model.name} {!model.enabled && '(Unavailable)'}
          </option>
        ))}
      </select>

      {showDetails && (
        <div style={{ marginTop: '15px' }}>
          {models.map((model) => (
            <div
              key={model.id}
              style={{
                backgroundColor: model.id === currentModel ? '#e7f3ff' : 'white',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '10px',
                opacity: model.enabled ? 1 : 0.6,
                cursor: model.enabled ? 'pointer' : 'not-allowed'
              }}
              onClick={() => model.enabled && handleModelChange(model.id)}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <strong style={{ fontSize: '14px' }}>{model.name}</strong>
                {getQualityBadge(model.quality)}
                {getTypeBadge(model.type)}
                {model.id === currentModel && (
                  <span style={{
                    marginLeft: 'auto',
                    color: '#007bff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    ACTIVE
                  </span>
                )}
              </div>
              
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '13px',
                color: '#6c757d'
              }}>
                {model.description}
              </p>
              
              <div style={{
                display: 'flex',
                gap: '15px',
                fontSize: '12px',
                color: '#6c757d'
              }}>
                <span>📦 {model.size}</span>
                <span>💻 {model.requirements.join(', ')}</span>
              </div>
              
              {!model.enabled && (
                <div style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#856404'
                }}>
                  {model.type === 'local' 
                    ? '⚠️ Local server not running (start with: python server/main.py)'
                    : '⚠️ System requirements not met'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#d1ecf1',
        borderRadius: '4px',
        fontSize: '13px',
        color: '#0c5460'
      }}>
        💡 <strong>Tip:</strong> For best results with complex backgrounds like cityscapes, use 
        SDXL or ControlNet models. Browser models work well for simple patterns but may struggle 
        with detailed scenes.
      </div>
    </div>
  );
};

export default OutpaintingModelSelector;