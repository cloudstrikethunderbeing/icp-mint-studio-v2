import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// ── Cover: no hard-wired backend canister ID in frontend app code ────────────
// The accepted requirement is that every deploy uses the newest
// platform-injected backend/frontend canister IDs, with no hard-wired canister
// ID left in deploy files or app code. The frontend resolves the backend ID at
// runtime from /env.json (config/env.ts), so no source or deploy file may pin a
// concrete backend canister.
//
// This is a static-source assertion, not a runtime one: it reads the frontend
// source tree and deploy config and fails if the known live canister literal
// reappears, or if the deleted canister-ids.json artifact is imported again.
// The backend's LIVE_CANISTER_ID self-liveness marker is intentionally out of
// scope — it is a backend self-identity check, not frontend wiring.

const FRONTEND_ROOT = join(__dirname, "..", "..");
const SRC_ROOT = join(FRONTEND_ROOT, "src");

// The live backend canister literal that must never be pinned in frontend code.
const LIVE_CANISTER_LITERAL = "kd6s6-ziaaa-aaaam-ajfwa-cai";

// Deploy/config files that must not carry a hard-wired backend canister ID.
const DEPLOY_FILES = [
  "vite.config.js",
  "env.json",
  "package.json",
  "index.html",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // Skip generated bindings and test files; they are not app wiring.
      if (entry === "declarations" || entry === "__tests__") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs|json|html)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("no hard-wired backend canister ID in frontend", () => {
  it("does not pin the live canister literal anywhere in frontend source", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      const text = readFileSync(file, "utf8");
      if (text.includes(LIVE_CANISTER_LITERAL)) {
        offenders.push(relative(FRONTEND_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("does not pin the live canister literal in deploy/config files", () => {
    const offenders: string[] = [];
    for (const name of DEPLOY_FILES) {
      const file = join(FRONTEND_ROOT, name);
      let text: string;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue; // optional file
      }
      if (text.includes(LIVE_CANISTER_LITERAL)) {
        offenders.push(name);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("does not import the deleted canister-ids.json artifact", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      const text = readFileSync(file, "utf8");
      if (/canister-ids\.json/.test(text)) {
        offenders.push(relative(FRONTEND_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("leaves the deploy env.json canister IDs empty for runtime injection", () => {
    const env = JSON.parse(
      readFileSync(join(FRONTEND_ROOT, "env.json"), "utf8"),
    ) as Record<string, unknown>;
    // The platform overwrites these at deploy time; a committed non-empty value
    // would be a hard-wired canister ID.
    expect(env.backend_canister_id).toBe("");
    expect(env.frontend_canister_id ?? "").toBe("");
  });
});
