import React, { useState, useEffect } from 'react';
import { platform } from '../../../../core/platform';

/**
 * @description Átomo: Versión de la Aplicación.
 * Muestra el número de versión extraído desde la plataforma nativa.
 * @returns {JSX.Element | null} Componente React
 */
export const AppVersion: React.FC = () => {
  const [version, setVersion] = useState<string | null>('...');

  useEffect(() => {
    platform.getVersion().then((v) => {
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
