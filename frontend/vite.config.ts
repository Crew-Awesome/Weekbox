import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Configuración principal de Vite para el entorno de desarrollo y compilación del frontend.
 * @see https://vite.dev/config/
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    /** Permite exponer el servidor en la red local para acceder desde dispositivos móviles vía Expo Go */
    host: true
  },
  build: {
    /** Directorio de salida donde Neutralino espera los archivos estáticos */
    outDir: '../app',
    /** Mantiene archivos existentes en el directorio de salida al compilar */
    emptyOutDir: false
  }
});

