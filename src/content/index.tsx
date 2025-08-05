import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

// Create a root element to mount the React app
const rootEl = document.createElement('div');
rootEl.id = 'ai-studio-notifier-root';
document.body.appendChild(rootEl);

// Render the App component
const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);