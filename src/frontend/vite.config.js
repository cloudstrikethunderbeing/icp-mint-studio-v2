import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";
import fs from "fs";
import path from "path";

const network = process.env.DFX_NETWORK || "local";
const isLive = network === "ic" || network === "live";
const envKey = isLive ? "live" : "draft";

// ── Hardcoded live canister IDs ──
const LIVE_BACKEND_ID = "kd6s6-ziaaa-aaaam-ajfwa-cai";
const LIVE_FRONTEND_ID = "ke7uk-uqaaa-aaaam-ajfwq-cai";

// ── Banner ──
if (isLive) {
  console.log("╔══════════════════════════════════════╗");
  console.log("║      BUILDING FOR LIVE               ║");
  console.log("╚══════════════════════════════════════╝");
} else {
  console.log("╔══════════════════════════════════════╗");
  console.log("║      BUILDING FOR DRAFT              ║");
  console.log("╚══════════════════════════════════════╝");
}

let backendId;
let frontendId;

if (isLive) {
  backendId = LIVE_BACKEND_ID;
  frontendId = LIVE_FRONTEND_ID;
  console.log("[vite.config] Using hardcoded LIVE canister IDs");
} else {
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
  // Env vars take precedence; canister-ids.json draft block is the fallback only.
  backendId = process.env.CANISTER_ID_BACKEND || ids.backend || "";
  frontendId = process.env.CANISTER_ID_FRONTEND || ids.frontend || "";
  console.log("[vite.config] Draft build: env var CANISTER_ID_* first, canister-ids.json fallback");
}

if (!backendId || !frontendId) {
  console.error("[vite.config] ERROR: Canister IDs are empty. Build cannot proceed.");
  console.error(`  backendId: ${backendId || "<empty>"}`);
  console.error(`  frontendId: ${frontendId || "<empty>"}`);
  process.exit(1);
}

console.log(`[vite.config] Network: ${network}`);
console.log(`[vite.config] CANISTER_ID_BACKEND: ${backendId}`);
console.log(`[vite.config] CANISTER_ID_FRONTEND: ${frontendId}`);

const ii_url =
  process.env.DFX_NETWORK === "local"
    ? `http://uqzsh-gqaaa-aaaaq-qaada-cai.localhost:8081/authorize`
    : `https://rdmx6-jaaaa-aaaaa-aaauq-cai.icp0.io`;

process.env.II_URL = process.env.II_URL || ii_url;
process.env.STORAGE_GATEWAY_URL =
  process.env.STORAGE_GATEWAY_URL || "https://blob.caffeine.ai";

// Draft branch resolution precedence (live branch uses hardcoded constants above):
//   1. process.env.CANISTER_ID_BACKEND / CANISTER_ID_FRONTEND (highest priority)
//   2. canister-ids.json draft block (fallback only)
// If both env var and JSON value are empty/unset, the empty-guard above exits with code 1.

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
    "import.meta.env.IS_DRAFT": JSON.stringify(!isLive),
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
