import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repositoryFile = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const legalOutput = fileURLToPath(new URL("./dist/legal", import.meta.url));

const legalAssets = () => ({
  name: "qc-remote-legal-assets",
  closeBundle() {
    mkdirSync(legalOutput, { recursive: true });
    copyFileSync(repositoryFile("THIRD_PARTY-NOTICES.md"), `${legalOutput}/THIRD_PARTY-NOTICES.md`);
    copyFileSync(repositoryFile("legal/THIRD_PARTY-LICENSE-INVENTORY.json"), `${legalOutput}/THIRD_PARTY-LICENSE-INVENTORY.json`);
    copyFileSync(repositoryFile("legal/THIRD_PARTY-LICENSE-TEXTS.txt"), `${legalOutput}/THIRD_PARTY-LICENSE-TEXTS.txt`);
    copyFileSync(repositoryFile("legal/THIRD_PARTY-SOURCE-OFFER.md"), `${legalOutput}/THIRD_PARTY-SOURCE-OFFER.md`);
    copyFileSync(repositoryFile("legal/COMMUNITY-PROTOCOL-LICENSE.txt"), `${legalOutput}/COMMUNITY-PROTOCOL-LICENSE.txt`);
  }
});

export default defineConfig(() => ({
  define: {
    __QC_DIRECT_GEMINI_ENABLED__: JSON.stringify(process.env.VITE_QC_PUBLIC_RELEASE !== "1")
  },
  plugins: [react(), legalAssets()],
  // Theme assets are imported explicitly so local visual references can never
  // leak into development servers or release bundles through publicDir.
  publicDir: false,
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  },
  envPrefix: ["VITE_", "TAURI_"]
}));
