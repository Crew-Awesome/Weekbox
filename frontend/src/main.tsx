import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import * as Sentry from "@sentry/react";
import App from "./App";
import Features from "@features";
import "./index.css";

/**
 * Initializes Sentry for application monitoring, capturing errors,
 * performance metrics (Tracing), and session replays. Configured via environment variables.
 */
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <HashRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<Features.Home />} />
            <Route path="library" element={<Features.Library />} />
            <Route path="engines" element={<Features.Engines />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </StrictMode>,
  );
}
