import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';
import { handleStandaloneApi } from './utils/standaloneEngine.js';

// Intercept fetch for GitHub Pages or static host deployments
const originalFetch = window.fetch;
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);

  if (url.includes('/api/')) {
    const isGitHubPages = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';
    if (isGitHubPages) {
      const mockRes = await handleStandaloneApi(url, init);
      if (mockRes) return mockRes;
    } else {
      try {
        const res = await originalFetch(input, init);
        if (res.status === 404 || res.status === 502 || res.status === 503) {
          const mockRes = await handleStandaloneApi(url, init);
          if (mockRes) return mockRes;
        }
        return res;
      } catch {
        const mockRes = await handleStandaloneApi(url, init);
        if (mockRes) return mockRes;
      }
    }
  }

  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

