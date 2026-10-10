import React from 'react';
import ReactDOM from 'react-dom/client';
import { watchTheme } from '@/lib/theme';
import { App } from './App';
import './style.css';

watchTheme(document);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
