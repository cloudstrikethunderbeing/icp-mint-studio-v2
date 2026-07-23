# Project Guidance

## User Preferences

- Draft only — never touch live canisters (kd6s6-ziaaa-aaaam-ajfwa-cai, ke7uk-uqaaa-aaaam-ajfwq-cai)
- Preserve all existing [RENDER]/[AUTH]/[COMMIT]/[DOM]/[LOGIN]/[RECON] diagnostic markers when adding new instrumentation
- Use distinct diagnostic marker prefixes (e.g. [LOGIN], [RECON], [ADMIN-SEED], [ADMIN-RATELIMIT]) for new instrumentation so logs are greppable

## Verified Commands

**Frontend** (run from `src/frontend/`):

- **install**: `pnpm install --prefer-offline`
- **typecheck**: `pnpm typecheck`
- **lint fix**: `pnpm fix`
- **build**: `pnpm build`

**Backend** (run from `src/backend/`):

- **install**: `mops install`
- **typecheck**: `mops check --fix`
- **build**: `mops build`

**Backend and frontend integration** (run from root):

- **generate bindings**: `pnpm bindgen` This step is necessary to ensure the frontend can call the backend methods.

## Learnings

- "canister-ids.json must have exactly two keys: 'draft' and 'live'. Never add a third key like 'ic' — vite.config.js only reads 'draft' or 'live' based on DFX_NETWORK. If Caffeine adds an 'ic' key, move those values into 'draft' and remove 'ic'."
- "system func init() is NOT valid Motoko — compiler rejects it with M0129. Use a private helper called directly in the actor body (before system funcs) instead."
- "postupgrade() does NOT run on fresh canister installs — only on upgrades. Master admin seeding must happen during actor init (directly in the actor body) so it works on both fresh installs and upgrades."
- "The @caffeineai/core-infrastructure package source is NOT installed in the workspace (no node_modules) — signIn()/setIdentity/.then() internals are inside the package and not readable. Instrument the app-side boundary (useInternetIdentity return values) instead of trying to read package internals."
- "To observe a function's return value without altering synchronous behavior, capture it in a const, duck-type check `typeof result.then === 'function'`, then attach observer-only .then()/.catch() handlers; the original call still runs synchronously."
- "When adding new useEffect observers before an existing effect that carries a biome-ignore useExhaustiveDependencies suppression, the suppression line shifts down but remains valid; biome may flag it as 'unused' if surrounding context changes — verify it is pre-existing before touching it."
- "The @caffeineai/core-infrastructure package dist/ IS installed in node_modules and readable (contradicts an older AGENTS.md note). Only dist/ ships, not src/."
- "The wrapper's useInternetIdentity() returns { identity?, login: ()=>void, clear: ()=>void, loginStatus, isInitializing, isLoginIdle, isLoggingIn, isLoginSuccess, isLoginError, isAuthenticated, loginError? }. login() returns void — it internally awaits authClient.signIn() and updates its own internal state via handleLoginSuccess. There are NO onSuccess/onError callback params."
- "To fix the login-refresh defect: destructure loginStatus/isLoginSuccess from useInternetIdentity() and add loginStatus to the identity-value observer effect deps so the post-login state transition is reactive. Do NOT await or .then() iiLogin() — it returns void."
- "biome flags the core identity effect's useExhaustiveDependencies suppression as 'unused' after adding a new useEffect observer above it — this is a pre-existing false positive (the effect intentionally excludes authState/actor via refs) and should not be touched."
- "The @caffeineai/core-infrastructure wrapper's withAttributes={false} login branch (useInternetIdentity.js lines 171-182) calls `await actor._initialize_access_control()` BEFORE the un-awaited handleLoginSuccess(authClient). When the backend canister does not implement the IdentityAttributes mixin, _initialize_access_control() rejects, the .catch() fires handleLoginError, and handleLoginSuccess NEVER runs — so setIdentity/setStatus('success') never fire even though the II popup completed and the delegation was persisted. This is a deterministic defect, not a race."
- "The wrapper exposes NO public refresh/reconciliation function. The only mechanism that re-reads persisted delegation is the mount effect (lines 204-243, deps [createOptions, authClient]) which runs on provider mount. The proven recovery path is provider remount → mount effect re-runs → existingClient.isAuthenticated() true → getIdentity() → setIdentity → setStatus('success')."
- "To reconcile a failed live login without editing node_modules: export a RECONCILE_LOGIN_EVENT constant from main.tsx (the provider's parent), add a providerKey state + window event listener there that increments the key on the event, pass key={providerKey} to InternetIdentityProvider, and dispatch the event from AuthContext (inside the provider) when loginStatus transitions to loginError after a real login attempt (guarded by a loginAttemptedRef to fire exactly once). AuthContext cannot pass props up to the provider, so a CustomEvent is the safe signaling direction."
- "RECONCILE_LOGIN_EVENT is exported from main.tsx (the provider's parent) and imported by AuthContext (inside the provider) — the only safe direction for child-to-provider remount signaling since AuthContext cannot pass props up to InternetIdentityProvider."
- "The provider-remount reconciliation uses a loginAttemptedRef guard (set true in login(), cleared after a single dispatch) to ensure the reconcile event fires exactly once per real login attempt and never on mount, logout, or in a loop."
- "The v220 provider-remount login-refresh fix obsoleted the header.auth_hint instructional span ('After connecting, refresh the page if your account doesn't update automatically.'); the entire conditional block was removed from Header.tsx, leaving the auth button as the only pre-button element in the nav row."
- "The NFT rate-limiter in mixins/nft-api.mo checkRateLimit uses `elapsed > 60` comparing nanoseconds — that is 60 NANOSECONDS, not 60 seconds (pre-existing bug). The window resets on essentially every call. When sharing rateLimitStore across features, this bug lets any co-located limiter be reset by unrelated calls. Give security-critical rate-limiters (e.g. setupAdmin) their own dedicated transient Map to avoid window-reset interactions."
- "seedAdminsIfLive() in main.mo must be called inside postupgrade() to re-seed LIVE_ADMIN PIDs after every upgrade — the migration 20260722_000000.mo resets adminPrincipals to empty, and without the postupgrade call the live canister would have no admins until a manual claim."
- "Diagnostic markers [RENDER]/[AUTH]/[COMMIT]/[DOM]/[LOGIN]/[RECON] are frontend-only (AuthContext.tsx, Header.tsx, main.tsx) — they do not appear in src/backend/main.mo. Do not expect to find them there during backend checks."
- "v222 security fix #1: LIVE_ADMIN_1 and LIVE_ADMIN_2 in main.mo:81-82 are now the user's actual II identities (e4ok7-... and krtlu-...), replacing the old 4upfr-... and 62vwb-... PIDs. The old PIDs were stale and did not match the user's real Internet Identity principals."
- "v222 security fix #2: seedAdminsIfLive() is now called inside postupgrade() (main.mo:140) with a defense-in-depth lockout guard (main.mo:149-152) that re-seeds if adminPrincipals is still empty on live after the call. On draft it remains a no-op. This ensures live canisters always have working admins after every upgrade, even when a migration resets adminPrincipals."
- "v222 security fix #3: setupAdmin() now has per-principal hourly rate-limiting (3 attempts/hour) on a dedicated transient setupAdminRateLimitStore, separate from the shared rateLimitStore. This is required because the NFT limiter's elapsed > 60 nanoseconds bug (see above) would let an attacker reset the setupAdmin count by minting a single NFT if they shared the store. Security-critical rate-limiters must never share a store with the buggy NFT limiter."
