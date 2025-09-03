import React from 'react';
import { createPortal } from 'react-dom';

interface OverlayControlsPortalProps {
  children: React.ReactNode;
}

export default function OverlayControlsPortal({ children }: OverlayControlsPortalProps) {
  const el = document.getElementById('overlay-root') ?? document.body;
  return createPortal(children, el);
}