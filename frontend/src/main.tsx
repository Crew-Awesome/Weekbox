import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Features from "@features";
import "./index.css";

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    if (
      event.message?.includes("reading 'startTime'") ||
      (typeof event.error?.stack === "string" &&
        event.error.stack.includes("reportAllChanges"))
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });
}

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
