import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';
import { handleStandaloneApi } from './utils/standaloneEngine.js';

export const LIVE_BACKEND_URL = (typeof localStorage !== 'undefined' && localStorage.getItem('nexus_backend_url')) || 'https://officer-biography-humidity-dude.trycloudflare.com';

// Intercept fetch for GitHub Pages or static host deployments to route to central backend
const originalFetch = window.fetch;
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);

  if (url.includes('/api/')) {
    const isStaticFrontend = window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('netlify.app') ||
      window.location.protocol === 'file:';
    if (isStaticFrontend) {
      try {
        const apiPathAndQuery = url.substring(url.indexOf('/api/'));
        const fullUrl = `${LIVE_BACKEND_URL}${apiPathAndQuery}`;
        const res = await originalFetch(fullUrl, init);
        return res;
      } catch (err) {
        console.warn('Central live backend unreachable, using standalone fallback:', err);
        const mockRes = await handleStandaloneApi(url, init);
        if (mockRes) return mockRes;
      }
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

