// Canister IDs are injected at build time via environment variables.
// vite.config.js reads process.env.CANISTER_ID_BACKEND / CANISTER_ID_FRONTEND
// and falls back to canister-ids.json if env vars are not set.
// This module re-exports the values that vite-plugin-environment exposes.

import canisterIds from "../../canister-ids.json";

const envBackend = import.meta.env.CANISTER_ID_BACKEND as string | undefined;
const envFrontend = import.meta.env.CANISTER_ID_FRONTEND as string | undefined;

const fallback = canisterIds.draft;

export const CANISTERS = {
  backend: envBackend || fallback.backend || "",
  frontend: envFrontend || fallback.frontend || "",
};
