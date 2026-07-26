/**
 * Dev-only logging helpers.
 *
 * All diagnostic console output in this app MUST go through these helpers
 * so it is automatically gated behind `import.meta.env.DEV`. In production
 * builds every call becomes a no-op and is stripped by the bundler, so no
 * diagnostic data (including principal IDs) leaks to end users.
 *
 * The diagnostic marker prefixes ([RENDER], [AUTH], [LOGIN], [RECON],
 * [COMMIT], [DOM], etc.) are preserved so logs remain greppable in dev.
 *
 * Principal IDs are ALWAYS masked — even in dev — showing only the first 6
 * and last 4 characters, per the security policy.
 */

/**
 * Mask a principal ID (or any sensitive string) to show only the first 6
 * and last 4 characters. Short strings are returned unchanged.
 *
 * Example: "rdmx6-jaaaa-aaaah-qcaiq-cai" -> "rdmx6-...-qcaiq-cai" (approx)
 */
export function maskPrincipal(pid: string | null | undefined): string {
  if (!pid) return "null";
  if (pid.length <= 12) return pid;
  return `${pid.slice(0, 6)}...${pid.slice(-4)}`;
}

/**
 * Recursively mask any string values inside an arbitrary log payload that
 * look like principal IDs (long base32-ish strings with dashes) or that are
 * stored under keys named like `principal*` / `principalText` / `ownerId` /
 * `creatorId` / `claimedBy`. Non-string values are passed through. Arrays
 * and plain objects are walked. This is a best-effort heuristic; for
 * top-level principal fields prefer passing the value through `maskPrincipal`
 * explicitly before logging.
 */
function maskPayload(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    // Heuristic: ICP principals are ~27 chars, contain dashes, and are
    // base32-ish. Mask anything that looks like one.
    if (
      value.length >= 20 &&
      value.includes("-") &&
      /^[a-z0-9-]+$/i.test(value)
    ) {
      return maskPrincipal(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(maskPayload);
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const keyLower = k.toLowerCase();
      if (
        keyLower.includes("principal") ||
        keyLower === "ownid" ||
        keyLower === "ownerid" ||
        keyLower === "creatorid" ||
        keyLower === "claimedby" ||
        keyLower === "principaltext"
      ) {
        out[k] = typeof v === "string" ? maskPrincipal(v) : maskPayload(v);
      } else {
        out[k] = maskPayload(v);
      }
    }
    return out;
  }
  return value;
}

/**
 * Dev-only `console.log`. No-op in production. Principal IDs in the payload
 * are masked.
 */
export function devLog(marker: string, ...args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  if (args.length === 0) {
    console.log(marker);
    return;
  }
  // If the first arg after the marker is a string and the rest is a single
  // object, treat the string as a label and mask the object.
  if (
    args.length === 2 &&
    typeof args[0] === "string" &&
    typeof args[1] === "object"
  ) {
    console.log(`${marker} ${args[0]}`, maskPayload(args[1]));
    return;
  }
  console.log(marker, ...args.map(maskPayload));
}

/**
 * Dev-only `console.warn`. No-op in production. Principal IDs in the payload
 * are masked.
 */
export function devWarn(marker: string, ...args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  if (args.length === 0) {
    console.warn(marker);
    return;
  }
  if (
    args.length === 2 &&
    typeof args[0] === "string" &&
    typeof args[1] === "object"
  ) {
    console.warn(`${marker} ${args[0]}`, maskPayload(args[1]));
    return;
  }
  console.warn(marker, ...args.map(maskPayload));
}

/**
 * Dev-only `console.error`. No-op in production. Principal IDs in the
 * payload are masked.
 *
 * Note: errors that MUST surface in production (e.g. user-facing toast
 * failures) should NOT use this helper — they should use the app's normal
 * error-reporting path (toast/notification). This is only for diagnostic
 * instrumentation.
 */
export function devError(marker: string, ...args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  if (args.length === 0) {
    console.error(marker);
    return;
  }
  if (
    args.length === 2 &&
    typeof args[0] === "string" &&
    typeof args[1] === "object"
  ) {
    console.error(`${marker} ${args[0]}`, maskPayload(args[1]));
    return;
  }
  console.error(marker, ...args.map(maskPayload));
}
