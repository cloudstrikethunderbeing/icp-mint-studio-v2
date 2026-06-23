import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";
import fs from "fs";
import path from "path";

const network = process.env.DFX_NETWORK || "local";
const envKey = network === "ic" ? "live" : "draft";

const canisterIdsPath = path.resolve("canister-ids.json");
let canisterIds = {};
if (fs.existsSync(canisterIdsPath)) {
  try {
    canisterIds = JSON.parse(fs.readFileSync(canisterIdsPath, "utf-8"));
  } catch {
    // ignore parse errors
  }
}

const ids = canisterIds[envKey] || {};

const backendId = process.env.CANISTER_ID_BACKEND || ids.backend || "";
const frontendId = process.env.CANISTER_ID_FRONTEND || ids.frontend || "";

const ii_url =
  process.env.DFX_NETWORK === "local"
    ? `http://uqzsh-gqaaa-aaaaq-qaada-cai.localhost:8081/authorize`
    : `https://id.ai/authorize`;

process.env.II_URL = process.env.II_URL || ii_url;
process.env.STORAGE_GATEWAY_URL =
  process.env.STORAGE_GATEWAY_URL || "https://blob.caffeine.ai";

// Build pipeline must set CANISTER_ID_BACKEND and CANISTER_ID_FRONTEND
// for draft vs live environments. These are injected by vite-plugin-environment.
// Fallbacks are defined in src/config/canisters.ts if env vars are missing.

export default defineConfig({
  logLevel: "error",
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "./index.html",
      },
    },
    sourcemap: false,
    minify: false,
  },
  css: {
    postcss: "./postcss.config.js",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  define: {
    "import.meta.env.CANISTER_ID_BACKEND": JSON.stringify(backendId),
    "import.meta.env.CANISTER_ID_FRONTEND": JSON.stringify(frontendId),
  },
  plugins: [
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    environment(["II_URL"]),
    environment(["STORAGE_GATEWAY_URL"]),
    react(),
  ],
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(new URL("../declarations", import.meta.url)),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
    dedupe: ["@icp-sdk/core"]
  },
});
