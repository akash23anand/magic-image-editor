/**
 * Layers Panel - Figma-style layer management interface
 * Implements the comprehensive layer panel from the PRP
 */

import React, { useState, useCallback } from 'react';
import { BaseLayerMeta, LayerType } from '../services/LayerAnythingEngine';
import { e2eLogger } from '../utils/E2ELogger';

export interface LayersPanelProps {
  layers: BaseLayerMeta[];
  selectedLayerId?: string;
  onLayerSelect: (layerId: string) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerLockToggle: (layerId: string) => void;
  onLayerRename: (layerId: string, newName: string) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerDuplicate: (layerId: string) => void;
  onLayerReorder: (layerId: string, newIndex: number) => void;
  onLayerGroup: (layerIds: string[]) => void;
  onLayerUngroup: (groupId: string) => void;
}

interface LayerItemProps {
  layer: BaseLayerMeta;
  isSelected: boolean;
  onSelect: () => void;
  onVisibilityToggle: () => void;
  onLockToggle: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  isSelected,
  onSelect,
  onVisibilityToggle,
  onLockToggle,
  onRename,
  onDelete,
  onDuplicate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);

  const handleDoubleClick = useCallback(() => {
    if (!layer.locked) {
      setIsEditing(true);
      setEditName(layer.name);
    }
  }, [layer.locked, layer.name]);

  const handleNameSubmit = useCallback(() => {
    if (editName.trim() && editName !== layer.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  }, [editName, layer.name, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(layer.name);
    }
  }, [handleNameSubmit, layer.name]);

  const getLayerIcon = (type: LayerType): string => {
    switch (type) {
      case 'text': return '📝';
      case 'object': return '🎯';
      case 'background': return '🖼️';
      default: return '📄';
    }
  };

  const getLayerTypeColor = (type: LayerType): string => {
    switch (type) {
      case 'text': return '#4CAF50';
      case 'object': return '#2196F3';
      case 'background': return '#9E9E9E';
      default: return '#757575';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
        borderLeft: isSelected ? '3px solid #2196F3' : '3px solid transparent',
        cursor: 'pointer',
        userSelect: 'none',
        borderBottom: '1px solid #e0e0e0'
      }}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
    >
      {/* Visibility Toggle */}
      <button
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '2px',
          marginRight: '8px',
          opacity: layer.visible ? 1 : 0.3
        }}
        onClick={(e) => {
          e.stopPropagation();
          onVisibilityToggle();
        }}
        title={layer.visible ? 'Hide layer' : 'Show layer'}
      >
        👁
      </button>

      {/* Lock Toggle */}
      <button
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '2px',
          marginRight: '8px',
          opacity: layer.locked ? 1 : 0.3
        }}
        onClick={(e) => {
          e.stopPropagation();
          onLockToggle();
        }}
        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
      >
        {layer.locked ? '🔒' : '─'}
      </button>

      {/* Layer Type Icon */}
      <span
        style={{
          fontSize: '16px',
          marginRight: '8px',
          color: getLayerTypeColor(layer.type)
        }}
        title={`${layer.type} layer`}
      >
        {getLayerIcon(layer.type)}
      </span>

      {/* Layer Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              border: '1px solid #2196F3',
              borderRadius: '2px',
              padding: '2px 4px',
              fontSize: '12px',
              outline: 'none'
            }}
            autoFocus
          />
        ) : (
          <span
            style={{
              fontSize: '12px',
              color: layer.locked ? '#9e9e9e' : '#333',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block'
            }}
          >
            {layer.name}
          </span>
        )}
      </div>

      {/* Layer Metadata */}
      {layer.scores?.confidence && (
        <span
          style={{
            fontSize: '10px',
            color: '#666',
            marginLeft: '8px',
            padding: '2px 4px',
            backgroundColor: '#f5f5f5',
            borderRadius: '2px'
          }}
          title={`Confidence: ${Math.round(layer.scores.confidence * 100)}%`}
        >
          {Math.round(layer.scores.confidence * 100)}%
        </span>
      )}

      {/* Context Menu Trigger */}
      <button
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '12px',
          padding: '2px 4px',
          marginLeft: '4px',
          opacity: 0.5
        }}
        onClick={(e) => {
          e.stopPropagation();
          // Show context menu (implement later)
        }}
        title="More options"
      >
        ⋮
      </button>
    </div>
  );
};

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerVisibilityToggle,
  onLayerLockToggle,
  onLayerRename,
  onLayerDelete,
  onLayerDuplicate,
  onLayerReorder,
  onLayerGroup,
  onLayerUngroup
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);

  // Filter layers based on search term
  const filteredLayers = layers.filter(layer =>
    layer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    layer.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort layers by z-index (top to bottom in UI)
  const sortedLayers = [...filteredLayers].sort((a, b) => b.zIndex - a.zIndex);

  const handleLayerSelect = useCallback((layerId: string) => {
    onLayerSelect(layerId);
    setSelectedLayers([layerId]);
    
    e2eLogger.info('LayersPanel', 'layer_selected', { layerId });
  }, [onLayerSelect]);

  const handleMultiSelect = useCallback((layerId: string, ctrlKey: boolean) => {
    if (ctrlKey) {
      setSelectedLayers(prev => 
        prev.includes(layerId) 
          ? prev.filter(id => id !== layerId)
          : [...prev, layerId]
      );
    } else {
      handleLayerSelect(layerId);
    }
  }, [handleLayerSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedLayerId) return;

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        onLayerDelete(selectedLayerId);
        e2eLogger.info('LayersPanel', 'layer_deleted_via_keyboard', { layerId: selectedLayerId });
        break;
      case 'd':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onLayerDuplicate(selectedLayerId);
          e2eLogger.info('LayersPanel', 'layer_duplicated_via_keyboard', { layerId: selectedLayerId });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Select previous layer
        const currentIndex = sortedLayers.findIndex(l => l.id === selectedLayerId);
        if (currentIndex > 0) {
          handleLayerSelect(sortedLayers[currentIndex - 1].id);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        // Select next layer
        const nextIndex = sortedLayers.findIndex(l => l.id === selectedLayerId);
        if (nextIndex < sortedLayers.length - 1) {
          handleLayerSelect(sortedLayers[nextIndex + 1].id);
        }
        break;
    }
  }, [selectedLayerId, sortedLayers, onLayerDelete, onLayerDuplicate, handleLayerSelect]);

  return (
    <div
      style={{
        width: '280px',
        height: '100%',
        backgroundColor: '#fafafa',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#ffffff'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: '#333'
            }}
          >
            Layers
          </h3>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px'
              }}
              title="Layer options"
            >
              ≡
            </button>
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px'
              }}
              title="Add layer"
            >
              +
            </button>
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px'
              }}
              title="Search layers"
            >
              🔍
            </button>
          </div>
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search layers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
            outline: 'none'
          }}
        />
      </div>

      {/* Layer List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#ffffff'
        }}
      >
        {sortedLayers.length === 0 ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#666',
              fontSize: '12px'
            }}
          >
            {searchTerm ? 'No layers match your search' : 'No layers yet'}
          </div>
        ) : (
          sortedLayers.map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              isSelected={layer.id === selectedLayerId}
              onSelect={() => handleLayerSelect(layer.id)}
              onVisibilityToggle={() => onLayerVisibilityToggle(layer.id)}
              onLockToggle={() => onLayerLockToggle(layer.id)}
              onRename={(newName) => onLayerRename(layer.id, newName)}
              onDelete={() => onLayerDelete(layer.id)}
              onDuplicate={() => onLayerDuplicate(layer.id)}
            />
          ))
        )}
      </div>

      {/* Footer with Layer Stats */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#f5f5f5',
          fontSize: '11px',
          color: '#666'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{layers.length} layers</span>
          <span>
            {layers.filter(l => l.visible).length} visible
          </span>
        </div>
      </div>
    </div>
  );
};

export default LayersPanel;