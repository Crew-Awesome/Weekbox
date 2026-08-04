const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

/**
 * Builds the application assets (JavaScript and CSS) using esbuild.
 * This bundles all modules into single files to avoid connection drops
 * in Neutralino's built-in web server caused by too many concurrent requests.
 *
 * @param {boolean} watch - Whether to start esbuild in watch mode for development.
 * @returns {Promise<void>}
 */
async function buildAssets(watch = false) {
  const outDir = path.resolve(__dirname, "../app/dist");
  fs.mkdirSync(outDir, { recursive: true });
  fs.rmSync(path.join(outDir, "flags"), { recursive: true, force: true });

  const jsOptions = {
    entryPoints: [
      path.resolve(__dirname, "../app/src/backend/core/index-core.js"),
    ],
    bundle: true,
    outfile: path.resolve(outDir, "bundle.js"),
    format: "esm",
    target: ["es2020"],
    minify: !watch,
    sourcemap: watch ? "inline" : false,
  };

  const cssOptions = {
    entryPoints: [path.resolve(__dirname, "../app/src/ui/styles/styles.css")],
    bundle: true,
    outfile: path.resolve(outDir, "bundle.css"),
    loader: { ".svg": "file" },
    assetNames: "flags/[name]-[hash]",
    minify: !watch,
  };

  try {
    if (watch) {
      const jsContext = await esbuild.context(jsOptions);
      const cssContext = await esbuild.context(cssOptions);

      await jsContext.watch();
      await cssContext.watch();
      console.log("[esbuild] Watching for changes...");
    } else {
      await esbuild.build(jsOptions);
      await esbuild.build(cssOptions);
      console.log("[esbuild] Build completed successfully.");
    }
  } catch (err) {
    console.error("[esbuild] Build failed:", err);
    process.exit(1);
  }
}

// Execute the script based on command line arguments
const isWatchMode = process.argv.includes("--watch");
buildAssets(isWatchMode);
