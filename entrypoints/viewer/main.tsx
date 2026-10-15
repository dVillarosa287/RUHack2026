import React from 'react';
import ReactDOM from 'react-dom/client';
import { loadAppFont, watchTheme } from '@/lib/theme';
import { App } from './App';
import './style.css';

watchTheme(document);
void loadAppFont();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
