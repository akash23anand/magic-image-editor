import React from 'react';

interface LayerChipHighlightProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

const LayerChipHighlight: React.FC<LayerChipHighlightProps> = ({ x, y, width, height, label }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {/* Dashed outline */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: '2px dashed #007AFF',
          borderRadius: '4px',
          animation: 'fadeOut 2s ease-in-out forwards',
        }}
      />
      
      {/* Label pill */}
      <div
        style={{
          position: 'absolute',
          top: '-10px',
          left: '8px',
          backgroundColor: '#007AFF',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          animation: 'fadeOut 2s ease-in-out forwards',
        }}
      >
        {label}
      </div>
      
      <style>{`
        @keyframes fadeOut {
          0% {
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LayerChipHighlight;