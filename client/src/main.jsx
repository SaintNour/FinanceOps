import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'react-day-picker/style.css';
import App from './App.jsx';
import { applyTheme, getInitialTheme } from './lib/theme.js';

applyTheme(getInitialTheme());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
