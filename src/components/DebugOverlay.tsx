import React from 'react';
import { Rectangle } from '../utils/CoordinateHelpers';

interface DebugOverlayProps {
  promptBox: Rectangle | null;
  maskOutline: Rectangle | null;
  isVisible: boolean;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({ promptBox, maskOutline, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10
      }}
    >
      {/* Prompt box - red stroked rectangle */}
      {promptBox && (
        <div
          style={{
            position: 'absolute',
            left: `${promptBox.x}px`,
            top: `${promptBox.y}px`,
            width: `${promptBox.width}px`,
            height: `${promptBox.height}px`,
            border: '2px solid red',
            boxSizing: 'border-box',
            pointerEvents: 'none'
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '-20px',
              left: '0',
              color: 'red',
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: '2px 4px',
              borderRadius: '2px'
            }}
          >
            Prompt Box
          </span>
        </div>
      )}

      {/* Mask outline - green outline */}
      {maskOutline && (
        <div
          style={{
            position: 'absolute',
            left: `${maskOutline.x}px`,
            top: `${maskOutline.y}px`,
            width: `${maskOutline.width}px`,
            height: `${maskOutline.height}px`,
            border: '2px solid #00ff00',
            boxSizing: 'border-box',
            pointerEvents: 'none'
          }}
        >
          <span
            style={{
              position: 'absolute',
              bottom: '-20px',
              right: '0',
              color: '#00ff00',
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: '2px 4px',
              borderRadius: '2px'
            }}
          >
            Mask Outline
          </span>
        </div>
      )}

      {/* Debug info panel */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}
      >
        <div>Debug Mode Active (Cmd+Shift+D to toggle)</div>
        {promptBox && (
          <div style={{ marginTop: '5px' }}>
            Prompt: {Math.round(promptBox.x)}, {Math.round(promptBox.y)} | {Math.round(promptBox.width)}x{Math.round(promptBox.height)}
          </div>
        )}
        {maskOutline && (
          <div style={{ marginTop: '5px' }}>
            Mask: {Math.round(maskOutline.x)}, {Math.round(maskOutline.y)} | {Math.round(maskOutline.width)}x{Math.round(maskOutline.height)}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugOverlay;