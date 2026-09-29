import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initGlobalErrorCapture } from './lib/error-capture';

// Initialize zero-leak enterprise error capture
initGlobalErrorCapture();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
