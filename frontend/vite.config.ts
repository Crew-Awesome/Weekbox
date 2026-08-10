import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

/**
 * Plugin para inyectar los tokens de Neutralino en desarrollo,
 * permitiendo presionar F5 sin perder la conexión con el backend nativo.
 */
const neutralinoAuthPlugin = () => {
  return {
    name: 'neutralino-auth',
    transformIndexHtml(html: string) {
      try {
        const authPath = path.resolve(__dirname, '../.tmp/auth_info.json');
        if (fs.existsSync(authPath)) {
          const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
          return html.replace(
            '<head>',
            `<head>\n    <script>\n      window.NL_PORT = ${auth.nlPort};\n      window.NL_TOKEN = '${auth.nlToken}';\n      window.NL_ARGS = ['--load-dir-res'];\n    </script>`
          );
        }
      } catch (err) {
        console.warn('[Vite] No se pudo inyectar auth de Neutralino:', err);
      }
      return html;
    }
  };
};

/**
 * Configuración principal de Vite para el entorno de desarrollo y compilación del frontend.
 * @see https://vite.dev/config/
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), neutralinoAuthPlugin()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared/shared.tsx')
    }
  },
  server: {
    /** Permite exponer el servidor en la red local para acceder desde dispositivos móviles vía Expo Go */
    host: true,
    port: 5173,
    strictPort: true,
    fs: {
      allow: ['..']
    }
  },
  build: {
    /** Directorio de salida donde Neutralino espera los archivos estáticos */
    outDir: '../app',
    /** Mantiene archivos existentes en el directorio de salida al compilar */
    emptyOutDir: false
  }
});

