import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Remove the HTML loader once JS executes
const loader = document.getElementById('loading-overlay');
if (loader) {
    loader.style.display = 'none';
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);