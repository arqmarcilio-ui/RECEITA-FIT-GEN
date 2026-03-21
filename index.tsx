
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error handler for debugging
window.onerror = (msg, url, lineNo, columnNo, error) => {
  console.error("[Global Error]", msg, "at", url, ":", lineNo, ":", columnNo, error);
  return false;
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
