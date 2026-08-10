import React, { useState, useEffect } from 'react';
import { ProgressBar } from '../../shared/components/atoms/progress-bar/progress-bar';
import { AppVersion } from '../../shared/components/atoms/app-version/app-version';
import loadingBg from '/assets/images/loading.webp';

export interface LoadingScreenProps {
  /** Indica si la pantalla de carga debe iniciar el ciclo */
  isLoading?: boolean;
}

/**
 * @description Pantalla de Carga (Feature).
 * Maneja independientemente la lógica de ocultarse al llegar al 100% usando un fade-out suave.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading = true }) => {
  const [progress, setProgress] = useState(0);
  const [action, setAction] = useState('Iniciando entorno...');
  
  // Estados para controlar el desmontaje suave
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(isLoading);

  // Efecto simulado de carga progresiva por el momento
  useEffect(() => {
    if (!isLoading) return;
    
    let current = 0;
    const interval = setInterval(() => {
      // Avanza rápido al principio, luego más lento como placeholder
      const step = Math.random() * (current > 80 ? 2 : 12);
      current += step;
      
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        
        // Al llegar a 100%, esperar un momento, hacer fade-out y desaparece
        setAction('¡Listo!');
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => setIsMounted(false), 500); // 500ms para coincidir con la transición CSS
        }, 500);
      }
      
      setProgress(current);
      
      if (current < 100) {
        if (current < 20) setAction('Comprobando versión...');
        else if (current < 50) setAction('Cargando módulos base...');
        else if (current < 85) setAction('Sincronizando biblioteca...');
        else setAction('Preparando interfaz gráfica...');
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isMounted) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end items-center pb-24 transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundImage: `url(${loadingBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Capa de oscurecimiento (Gradient) para que el texto resalte */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1415]/90 via-[#0e1415]/20 to-[#0e1415]/50 z-0" />
      
      {/* Versión de la app (Solo visible en la pantalla de carga) */}
      <AppVersion />
      
      {/* Barra de progreso */}
      <div className="relative z-10 w-full px-8 md:px-32 flex justify-center">
        <ProgressBar progress={progress} actionText={action} />
      </div>
    </div>
  );
};
