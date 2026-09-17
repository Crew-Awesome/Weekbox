import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import { Home, Library, Instances } from "@pages";
import "./index.css";

if (typeof window !== "undefined") {
  const isIgnoredError = (msg?: string, stack?: string) => {
    const text = `${msg || ""} ${stack || ""}`.toLowerCase();
    return text.includes("starttime") || text.includes("reportallchanges");
  };

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const text = args
      .map((a) =>
        typeof a === "object" && a !== null
          ? a?.stack || a?.message || JSON.stringify(a)
          : String(a),
      )
      .join(" ");
    if (isIgnoredError(text)) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener(
    "error",
    (event) => {
      if (isIgnoredError(event.message, event.error?.stack)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true,
  );

  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    if (isIgnoredError(String(message), error?.stack)) {
      return true;
    }
    if (typeof originalOnError === "function") {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      const reason = event.reason;
      if (
        isIgnoredError(
          reason?.message || String(reason),
          reason?.stack
        )
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
}

async function startApplication() {
  if (typeof window !== "undefined") {
    const rawArgs = window.NL_ARGS || [];
    try {
      const res = await fetch("http://127.0.0.1:45555/deeplink", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(rawArgs),
      });

      if (res && res.ok) {
        console.log("[SingleInstance] Forwarded to existing instance. Exiting secondary process.");
        try {
          const { platform } = await import("@platform");
          await platform.window.close();
        } catch {
          window.close();
        }
        return;
      }
    } catch {
      // No primary instance listening; continue as primary instance
    }
  }

  const rootElement = document.getElementById("root");
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <HashRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="library" element={<Library />} />
              <Route path="library/*" element={<Library />} />
              <Route path="instances" element={<Instances />} />
              <Route path="instances/*" element={<Instances />} />
              <Route path="engines" element={<Navigate to="/instances" replace />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </StrictMode>,
    );
  }
}

startApplication();
