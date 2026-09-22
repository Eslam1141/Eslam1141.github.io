import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    // Two levels up from web/coach-loading/ is the repo root.
    outDir: "../../widgets",
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/mount.tsx"),
      name: "CoachLoadingWidget",
      formats: ["iife"],
      fileName: () => "coach-loading.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name === "style.css" ? "coach-loading.css" : (assetInfo.name ?? "[name][extname]"),
      },
    },
  },
});
