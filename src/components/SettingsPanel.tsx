import React, { useEffect, useRef } from 'react';
import { e2eLogger } from '../utils/E2ELogger';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  position?: { x: number; y: number };
  children: React.ReactNode;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  title,
  position,
  children
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && panelRef.current) {
      // Auto-position the panel to avoid obstruction
      const rect = panelRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      let left = position?.x || 20;
      let top = position?.y || 20;

      // Adjust if panel goes off-screen
      if (left + rect.width > viewport.width) {
        left = viewport.width - rect.width - 20;
      }
      if (top + rect.height > viewport.height) {
        top = viewport.height - rect.height - 20;
      }

      panelRef.current.style.left = `${left}px`;
      panelRef.current.style.top = `${top}px`;
    }
  }, [isOpen, position]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999,
          backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          padding: '20px',
          minWidth: '280px',
          maxWidth: '350px',
          maxHeight: '80vh',
          overflow: 'auto',
          zIndex: 1000,
          animation: 'slideIn 0.2s ease-out',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>
        {children}
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};