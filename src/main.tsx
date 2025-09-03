import './ort-env'; // Must be imported before any ORT usage
import { ortSelfTest } from './debug/ort-selftest';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Run ORT self-test on startup
ortSelfTest().catch(console.error);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)