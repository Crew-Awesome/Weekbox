import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

/**
 * Plugin para inyectar los tokens de Neutralino en desarrollo,
 * permitiendo presionar F5 sin perder la conexión con el backend nativo.
 */
const neutralinoAuthPlugin = () => {
  return {
    name: "neutralino-auth",
    transformIndexHtml(html: string) {
      try {
        const authPath = path.resolve(import.meta.dirname, "../.tmp/auth_info.json");
        if (fs.existsSync(authPath)) {
          const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
          return html.replace(
            "<head>",
            `<head>\n    <script>\n      window.NL_PORT = ${auth.nlPort};\n      window.NL_TOKEN = '${auth.nlToken}';\n      window.NL_ARGS = ['--load-dir-res'];\n    </script>`,
          );
        }
      } catch (err) {
        console.warn("[Vite] No se pudo inyectar auth de Neutralino:", err);
      }
      return html;
    },
  };
};

/**
 * Plugin para limpiar archivos residuales (JS, CSS) del build anterior
 * sin borrar todo el directorio app/ (ya que contiene el backend y config).
 */
const cleanAssetsPlugin = () => {
  return {
    name: "clean-assets",
    enforce: "pre" as const,
    buildStart() {
      const assetsPath = path.resolve(import.meta.dirname, "../app/assets");
      if (fs.existsSync(assetsPath)) {
        const files = fs.readdirSync(assetsPath);
        for (const file of files) {
          // Solo borramos js, css o sourcemaps residuales generados por Vite,
          // mantenemos otros recursos fijos si los hubiera.
          if (
            file.endsWith(".js") ||
            file.endsWith(".css") ||
            file.endsWith(".map") ||
            file.endsWith(".webp")
          ) {
            fs.unlinkSync(path.join(assetsPath, file));
          }
        }
      }
    },
  };
};

/**
 * Configuración principal de Vite para el entorno de desarrollo y compilación del frontend.
 * @see https://vite.dev/config/
 */
export default defineConfig({
  build: {
    sourcemap: true, // Sentry necesita sourcemaps
    outDir: "../app",
    emptyOutDir: false,
  },
  plugins: [
    react(),
    tailwindcss(),
    neutralinoAuthPlugin(),
    cleanAssetsPlugin(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG || "your-org",
      project: process.env.SENTRY_PROJECT || "your-project",
      authToken: process.env.SENTRY_AUTH_TOKEN
    }),
  ],
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "./src/shared/shared.tsx"),
      "@features": path.resolve(import.meta.dirname, "./src/features/index.ts"),
      "@utils": path.resolve(import.meta.dirname, "./src/utils/utils.tsx"),
      "@core": path.resolve(import.meta.dirname, "./src/core/index.ts"),
      "@fs": path.resolve(import.meta.dirname, "./src/core/backend/fs/index.ts"),
      "@http": path.resolve(import.meta.dirname, "./src/core/backend/http/index.ts"),
    },
  },
  server: {
    /** Permite exponer el servidor en la red local para acceder desde dispositivos móviles vía Expo Go */
    host: true,
    port: 5173,
    strictPort: true,
    fs: {
      allow: [".."],
    },
  },
  build: {
    /** Directorio de salida donde Neutralino espera los archivos estáticos */
    outDir: "../app",
    /** Mantiene archivos existentes en el directorio de salida al compilar */
    emptyOutDir: false,
  },
});

