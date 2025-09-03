/**
 * Tool Palette - Professional tool selection interface
 * Implements the comprehensive tool palette from the PRP
 */

import React, { useState, useCallback } from 'react';
import { e2eLogger } from '../utils/E2ELogger';

export type ToolType = 
  | 'select' 
  | 'grab-text' 
  | 'grab-object' 
  | 'background' 
  | 'refine'
  | 'auto-find-text'
  | 'auto-find-objects'
  | 'auto-layer-everything';

export interface ToolConfig {
  id: ToolType;
  name: string;
  icon: string;
  shortcut: string;
  description: string;
  category: 'selection' | 'detection' | 'refinement' | 'automation';
}

export interface ToolPaletteProps {
  selectedTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

const TOOLS: ToolConfig[] = [
  // Selection Tools
  {
    id: 'select',
    name: 'Select',
    icon: '🎯',
    shortcut: 'V',
    description: 'Box, lasso, and point selection tools',
    category: 'selection'
  },
  
  // Detection Tools
  {
    id: 'grab-text',
    name: 'Grab Text',
    icon: '📝',
    shortcut: 'T',
    description: 'Detect and layer text regions',
    category: 'detection'
  },
  {
    id: 'grab-object',
    name: 'Grab Object',
    icon: '🎪',
    shortcut: 'O',
    description: 'Segment and layer objects',
    category: 'detection'
  },
  {
    id: 'background',
    name: 'Background',
    icon: '🖼️',
    shortcut: 'B',
    description: 'Extract and manage background',
    category: 'detection'
  },
  
  // Refinement Tools
  {
    id: 'refine',
    name: 'Refine',
    icon: '✨',
    shortcut: 'R',
    description: 'Refine layer edges and masks',
    category: 'refinement'
  },
  
  // Automation Tools
  {
    id: 'auto-find-text',
    name: 'Find All Text',
    icon: '🔍',
    shortcut: 'Shift+T',
    description: 'Automatically detect all text regions',
    category: 'automation'
  },
  {
    id: 'auto-find-objects',
    name: 'Find Objects',
    icon: '👥',
    shortcut: 'Shift+O',
    description: 'Auto-detect people, animals, and objects',
    category: 'automation'
  },
  {
    id: 'auto-layer-everything',
    name: 'Layer Everything',
    icon: '⚡',
    shortcut: 'Shift+A',
    description: 'Automatically layer all detected elements',
    category: 'automation'
  }
];

interface ToolButtonProps {
  tool: ToolConfig;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  tool,
  isSelected,
  isDisabled,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getCategoryColor = (category: ToolConfig['category']): string => {
    switch (category) {
      case 'selection': return '#2196F3';
      case 'detection': return '#4CAF50';
      case 'refinement': return '#FF9800';
      case 'automation': return '#9C27B0';
      default: return '#757575';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        disabled={isDisabled}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '48px',
          height: '48px',
          border: isSelected ? `2px solid ${getCategoryColor(tool.category)}` : '2px solid transparent',
          borderRadius: '8px',
          backgroundColor: isSelected ? `${getCategoryColor(tool.category)}20` : 
                          isHovered && !isDisabled ? '#f5f5f5' : 'transparent',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          opacity: isDisabled ? 0.4 : 1,
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
        title={`${tool.name} (${tool.shortcut})\n${tool.description}`}
      >
        <span style={{ marginBottom: '2px' }}>{tool.icon}</span>
        <span style={{ 
          fontSize: '8px', 
          color: '#666',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {tool.shortcut}
        </span>
        
        {/* Category indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: getCategoryColor(tool.category),
            opacity: 0.7
          }}
        />
      </button>

      {/* Tooltip */}
      {isHovered && !isDisabled && (
        <div
          style={{
            position: 'absolute',
            left: '56px',
            top: '0px',
            backgroundColor: '#333',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '2px' }}>
            {tool.name} ({tool.shortcut})
          </div>
          <div style={{ opacity: 0.9 }}>
            {tool.description}
          </div>
          
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              left: '-4px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderRight: '4px solid #333'
            }}
          />
        </div>
      )}
    </div>
  );
};

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  selectedTool,
  onToolSelect,
  isProcessing = false,
  disabled = false
}) => {
  const handleToolSelect = useCallback((tool: ToolType) => {
    if (disabled || isProcessing) return;
    
    onToolSelect(tool);
    e2eLogger.info('ToolPalette', 'tool_selected', { 
      tool,
      previousTool: selectedTool 
    });
  }, [disabled, isProcessing, onToolSelect, selectedTool]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || isProcessing) return;
      
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const tool = TOOLS.find(t => {
        if (e.shiftKey) {
          return t.shortcut === `Shift+${e.key.toUpperCase()}`;
        } else {
          return t.shortcut === e.key.toUpperCase();
        }
      });

      if (tool) {
        e.preventDefault();
        handleToolSelect(tool.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isProcessing, handleToolSelect]);

  const groupedTools = TOOLS.reduce((groups, tool) => {
    if (!groups[tool.category]) {
      groups[tool.category] = [];
    }
    groups[tool.category].push(tool);
    return groups;
  }, {} as Record<string, ToolConfig[]>);

  return (
    <div
      style={{
        width: '64px',
        backgroundColor: '#fafafa',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      {/* App Title */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '10px',
          fontWeight: 700,
          color: '#333',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          lineHeight: 1.2
        }}
      >
        Magic Image Editor
      </div>
      <div
        style={{
          height: '1px',
          backgroundColor: '#e0e0e0',
          margin: '2px 4px 6px 4px'
        }}
      />
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '10px',
          fontWeight: '600',
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '4px'
        }}
      >
        Tools
      </div>

      {/* Tool Groups */}
      {Object.entries(groupedTools).map(([category, tools]) => (
        <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Category Label */}
          <div
            style={{
              fontSize: '8px',
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '2px',
              textAlign: 'center'
            }}
          >
            {category}
          </div>
          
          {/* Tools in Category */}
          {tools.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              isSelected={selectedTool === tool.id}
              isDisabled={disabled || isProcessing}
              onClick={() => handleToolSelect(tool.id)}
            />
          ))}
          
          {/* Separator */}
          {category !== 'automation' && (
            <div
              style={{
                height: '1px',
                backgroundColor: '#e0e0e0',
                margin: '4px 8px'
              }}
            />
          )}
        </div>
      ))}

      {/* Processing Indicator */}
      {isProcessing && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#4CAF50',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      )}

      {/* Status Indicator */}
      <div
        style={{
          marginTop: 'auto',
          textAlign: 'center',
          fontSize: '8px',
          color: disabled ? '#f44336' : isProcessing ? '#ff9800' : '#4caf50',
          fontWeight: '500'
        }}
      >
        {disabled ? 'DISABLED' : isProcessing ? 'PROCESSING' : 'READY'}
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ToolPalette;
