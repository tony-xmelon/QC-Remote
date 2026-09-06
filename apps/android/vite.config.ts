import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  publicDir: fileURLToPath(new URL("../../packages/typescript/qc-theme/assets", import.meta.url)),
  base: "./",
  build: { outDir: "dist", emptyOutDir: true }
});
