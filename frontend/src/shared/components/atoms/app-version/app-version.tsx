import React, { useState, useEffect } from "react";
import Core from "@core";

/**
 * @description Atom: App Version.
 * Displays the application version number fetched dynamically from the native platform (Neutralinojs).
 * @returns {JSX.Element | null} React Component.
 */
export const AppVersion: React.FC = () => {
  const [version, setVersion] = useState<string | null>("...");

  useEffect(() => {
    Core.platform.getVersion().then((v) => {
      setVersion(v);
    });
  }, []);

  if (!version) return null;

  return (
    <div className="absolute top-6 right-8 text-sm font-semibold text-white/50 z-20 pointer-events-none">
      v{String(version)}
    </div>
  );
};
