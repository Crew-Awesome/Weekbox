/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

/**
 * Injects Neutralino tokens during development,
 * allowing page reloads (F5) without losing connection to the native backend.
 */
const neutralinoAuthPlugin = () => {
  return {
    name: "neutralino-auth",
    transformIndexHtml(html: string) {
      try {
        const authPath = path.resolve(
          import.meta.dirname,
          "../.tmp/auth_info.json",
        );
        if (fs.existsSync(authPath)) {
          const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
          return html.replace(
            "<head>",
            `<head>\n    <script>\n      window.NL_PORT = ${auth.nlPort};\n      window.NL_TOKEN = '${auth.nlToken}';\n      window.NL_ARGS = ['--load-dir-res'];\n    </script>`,
          );
        }
      } catch (err) {
        console.warn("Could not inject Neutralino auth:", err);
      }
      return html;
    },
  };
};

/**
 * Cleans residual Vite build files (JS, CSS, source maps) from the previous build/
 * without deleting the entire app/ directory (which contains the native backend and config).
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

export default defineConfig({
  build: {
    sourcemap: true, // Required by Sentry package
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
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "./src/shared/shared.tsx"),
      "@features": path.resolve(import.meta.dirname, "./src/features/index.ts"),
      "@utils": path.resolve(import.meta.dirname, "./src/utils/utils.tsx"),
      "@core": path.resolve(import.meta.dirname, "./src/core/index.ts"),
      "@fs": path.resolve(
        import.meta.dirname,
        "./src/core/backend/fs/index.ts",
      ),
      "@http": path.resolve(
        import.meta.dirname,
        "./src/core/backend/http/index.ts",
      ),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    fs: {
      allow: [".."],
    },
  },
  test: {
    globals: true,
  },
});
