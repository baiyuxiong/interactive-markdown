import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@interactive-markdown/core": path.resolve(root, "../core/src/index.ts"),
      "@interactive-markdown/react": path.resolve(root, "../react/src/index.ts"),
    },
  },
  server: { port: 5173 },
  build: { outDir: "dist" },
});
