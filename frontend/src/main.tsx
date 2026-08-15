import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <HashRouter>
        <Routes>
          <Route path="/" element={<App />} />
        </Routes>
      </HashRouter>
    </StrictMode>
  );
}
