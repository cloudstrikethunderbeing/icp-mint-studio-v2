import type { backendInterface } from "@/backend";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createAuthenticatedActor } from "../backendSingleton";
import { RECONCILE_LOGIN_EVENT } from "../main";
import { devError, devLog, devWarn } from "../utils/devLog";

interface AuthContextValue {
  authState: "loading" | "ready" | "unauthenticated";
  isAuthenticated: boolean;
  principal: string | null;
  identity: ReturnType<typeof useInternetIdentity>["identity"] | null;
  actor: backendInterface | null;
  login: () => void;
  logout: () => void;
  isAdmin: boolean;
  isAdminLoading: boolean;
  hasRealAdmin: boolean;
  hasRealAdminLoading: boolean;
  isFetching: boolean;
  setupAdmin: () => Promise<boolean>;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  principal: null,
  identity: null,
  actor: null,
  login: () => {},
  logout: () => {},
  isAdmin: false,
  isAdminLoading: false,
  hasRealAdmin: false,
  hasRealAdminLoading: false,
  authState: "loading",
  isFetching: false,
  setupAdmin: async () => false,
  refreshAdmin: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    identity,
    isAuthenticated: iiIsAuthenticated,
    login: iiLogin,
    clear,
    loginStatus,
    isLoginSuccess,
    isLoginError,
  } = useInternetIdentity();

  // [RECON] Tracks whether the user just attempted a login (iiLogin() was
  // called). Set true right before iiLogin() in the login callback, and reset
  // to false after dispatching the reconcile event. This ensures the
  // reconciliation event fires ONLY in response to a real login attempt that
  // ended in 'loginError' — never on initial mount, never on logout, and never
  // in a loop (the ref is cleared after a single dispatch).
  const loginAttemptedRef = useRef(false);

  // [LOGIN] Provider-mount observer — confirms the AuthProvider is alive
  // when login is attempted. Mount-only (empty dep array).
  useEffect(() => {
    devLog("[LOGIN] AuthProvider mounted");
  }, []);

  // [LOGIN] Identity-value observer — runs on every change of identity,
  // iiIsAuthenticated, AND loginStatus, registered BEFORE the main identity
  // effect (lines 119-409) so it fires first. Reveals whether the II
  // provider ever updates identity after iiLogin() is called. Observer
  // only — does not touch state or refs.
  // loginStatus is included so the observer re-runs when the wrapper
  // transitions to 'success' after the II popup closes and delegation is
  // persisted — this is the post-login state transition that drives the
  // core identity effect (which depends on identity/iiIsAuthenticated) to
  // pick up the new non-anonymous identity WITHOUT a manual page refresh.
  useEffect(() => {
    const identityIsNull = identity == null;
    const principalText =
      identity != null ? identity.getPrincipal().toText() : "null";
    const isAnon = !principalText || principalText === "2vxsx-fae";
    devLog("[LOGIN] identity value changed:", {
      identityIsNull,
      principalText,
      isAnonymous: isAnon,
      iiIsAuthenticated,
    });
    devLog("[LOGIN] loginStatus transition:", {
      loginStatus,
      isLoginSuccess,
      iiIsAuthenticated,
      principalText,
    });

    // [RECON] Provider-remount reconciliation. The wrapper's
    // withAttributes={false} branch calls _initialize_access_control() (a
    // canister method this backend does NOT implement) BEFORE publishing the
    // identity; when it rejects, the wrapper sets loginStatus='loginError'
    // and NEVER publishes the identity — even though the II popup completed
    // and the delegation was persisted. The wrapper exposes no refresh API.
    // The proven recovery path is provider remount, which re-runs the
    // wrapper's mount effect and rehydrates the persisted delegation.
    //
    // Fire ONLY when ALL of these hold:
    //   - loginStatus === 'loginError' (the confirmed dominant failure mode)
    //   - identity is still null/anonymous (wrapper never published it)
    //   - loginAttemptedRef is true (we just called iiLogin())
    // The ref guarantees a single dispatch per login attempt and prevents
    // loops, initial-mount firing, and logout firing. After dispatching, the
    // ref is reset so the next login attempt can trigger reconciliation again.
    if (
      isLoginError &&
      loginAttemptedRef.current &&
      (identityIsNull || isAnon)
    ) {
      devLog(
        "[RECON] loginError after login attempt with no published identity; dispatching reconcile event",
        {
          loginStatus,
          identityIsNull,
          isAnon,
          principalText,
        },
      );
      loginAttemptedRef.current = false;
      window.dispatchEvent(new CustomEvent(RECONCILE_LOGIN_EVENT));
    } else if (isLoginError && !loginAttemptedRef.current) {
      // Defensive: a loginError with no prior login attempt (e.g. stale
      // state on mount) must NOT trigger reconciliation. Log only.
      devLog(
        "[RECON] loginError observed but loginAttemptedRef is false; not reconciling",
        { loginStatus, identityIsNull, isAnon, principalText },
      );
    }
  }, [identity, iiIsAuthenticated, loginStatus, isLoginSuccess, isLoginError]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [authState, setAuthState] = useState<
    "loading" | "ready" | "unauthenticated"
  >("loading");

  const [actor, setActor] = useState<backendInterface | null>(null);

  // Admin state — single source of truth, no caching, no derived permissions
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  // hasRealAdmin mirrors setupAdmin()'s effectivelyEmpty claim logic: true
  // when adminPrincipals contains a real admin (any PID that is not one of
  // the two LIVE_ADMIN PIDs), false when effectively empty. Used by the
  // Settings page draft-only "no admin set" card so it agrees with the
  // backend's claim gate.
  const [hasRealAdmin, setHasRealAdmin] = useState(false);
  const [hasRealAdminLoading, setHasRealAdminLoading] = useState(false);

  // Track the last principal we fully initialized for (authState reached
  // "ready"). Using a ref avoids stale-closure skips: the guard compares
  // against a ref value that is only set AFTER admin resolution completes,
  // never against a stale `authState` from the effect closure.
  const lastReadyPrincipalRef = useRef<string | null>(null);
  // Track the principal we are CURRENTLY initializing for, so a rapid
  // re-render (same principal) does not launch a second concurrent IIFE
  // whose cleanup would cancel the first.
  const pendingPrincipalRef = useRef<string | null>(null);
  // Track the principal for which admin resolution (isAdmin) has
  // COMPLETED. If the effect re-runs for an already-ready principal whose
  // admin resolution was cancelled by cleanup before completing, we must
  // re-launch it — otherwise isAdmin stays false forever (the root cause of
  // the "creator UI shows until manual refresh" bug).
  const adminResolvedForRef = useRef<string | null>(null);
  // Mirror of `actor` state for use inside the core effect's re-launch
  // path. Reading `actor` directly in the effect would require adding it to
  // the dep array, which re-triggers the effect right after setActor() and
  // causes a duplicate admin fetch. A ref stays current without re-running.
  const actorRef = useRef<backendInterface | null>(null);
  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  // Mirror of `authState` for use inside the core effect's early-return
  // guard. The effect intentionally excludes `authState` from its dep array
  // (to avoid stale-closure skips and duplicate work), so reading
  // `authState` directly in the effect would capture a stale value. This
  // ref stays current via a separate sync effect and lets the guard check
  // the LIVE authState without re-triggering the core effect.
  const authStateRef = useRef(authState);
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  // Post-auth redirect guard — reset on logout so it works after re-login
  const redirectCheckedRef = useRef(false);

  // Core identity effect: only depend on raw II values to avoid stale closures.
  // All derived values (principalText, isAnonymous, isAuthenticated) are computed
  // inside the effect from the current identity reference.
  useEffect(() => {
    // Early-return guard: if there is no identity, tear down auth state and
    // exit BEFORE any ref checks or actor creation. This prevents the
    // disconnect crash where createAuthenticatedActor was invoked with a
    // null identity. Use loose equality so the II provider's `undefined`
    // initial value (not `null`) is also caught here.
    if (identity == null) {
      setActor(null);
      setAuthState("unauthenticated");
      setIsAdmin(false);
      setIsAdminLoading(false);
      setHasRealAdmin(false);
      setHasRealAdminLoading(false);
      return;
    }

    const hasIdentity = !!identity;
    const pText = identity?.getPrincipal().toText() ?? null;
    const isAnon = !pText || pText === "2vxsx-fae";
    const isAuthed = iiIsAuthenticated && !isAnon;

    devLog("[AUTH] identity effect run:", {
      hasIdentity,
      iiIsAuthenticated,
      principalText: pText,
      isAnonymous: isAnon,
      isAuthenticated: isAuthed,
      lastReadyPrincipal: lastReadyPrincipalRef.current,
      pendingPrincipal: pendingPrincipalRef.current,
    });

    // Unauthenticated states: clear everything and reset tracking refs so
    // the next login re-initializes from scratch.
    if (!identity || !isAuthed) {
      devLog("[AUTH] unauthenticated (no identity or anonymous)");
      setActor(null);
      setAuthState("unauthenticated");
      setIsAdmin(false);
      setIsAdminLoading(false);
      setHasRealAdmin(false);
      setHasRealAdminLoading(false);
      lastReadyPrincipalRef.current = null;
      pendingPrincipalRef.current = null;
      adminResolvedForRef.current = null;
      return;
    }

    const p = identity.getPrincipal();
    const principalText = p.toText();

    if (p.isAnonymous() || principalText === "2vxsx-fae") {
      devLog("[AUTH] anonymous identity, unauthenticated");
      setActor(null);
      setAuthState("unauthenticated");
      setIsAdmin(false);
      setIsAdminLoading(false);
      setHasRealAdmin(false);
      setHasRealAdminLoading(false);
      lastReadyPrincipalRef.current = null;
      pendingPrincipalRef.current = null;
      adminResolvedForRef.current = null;
      return;
    }

    // Skip ONLY if we have already fully initialized (reached "ready") for
    // this exact principal. This guard uses refs, not the stale `authState`
    // closure, so it cannot incorrectly skip a fresh login. A principal
    // change always re-initializes because lastReadyPrincipalRef differs.
    if (lastReadyPrincipalRef.current === principalText) {
      // Already ready for this principal. But if admin resolution was
      // cancelled by a prior cleanup before it completed (e.g. II
      // re-delegation changed the identity ref while the principal stayed
      // the same, cancelling the in-flight IIFE), isAdmin is
      // still false and the UI is stuck on the creator view. Re-launch
      // admin resolution here using the CURRENT actor from state. This is
      // the fix for failure modes (a) and (c): a cancelled admin fetch must
      // be retried, not silently dropped.
      if (adminResolvedForRef.current !== principalText && actorRef.current) {
        devLog(
          "[AUTH] re-launching cancelled admin resolution for principal:",
          principalText,
        );
        setIsAdminLoading(true);
        setHasRealAdminLoading(true);
        const reActor = actorRef.current;
        // Same self-guarding pattern as the primary admin IIFE: no
        // `reCancelled` flag. The IIFE checks adminResolvedForRef and
        // lastReadyPrincipalRef before applying state, so a stale
        // completion is ignored and a completion after logout is ignored.
        (async () => {
          try {
            const adminResult = await reActor.isAdmin();
            devLog(
              "[AUTH] re-check calling hasRealAdmin() for principal:",
              principalText,
            );
            const realAdminResult = await reActor.hasRealAdmin();
            devLog(
              "[AUTH] hasRealAdmin() re-check result:",
              realAdminResult,
              "principal:",
              principalText,
            );
            if (
              adminResolvedForRef.current !== principalText &&
              lastReadyPrincipalRef.current === principalText
            ) {
              setIsAdmin(adminResult);
              setHasRealAdmin(realAdminResult);
              adminResolvedForRef.current = principalText;
              setIsAdminLoading(false);
              setHasRealAdminLoading(false);
            }
          } catch (err) {
            devError("[AUTH] admin re-check error:", err);
            if (
              adminResolvedForRef.current !== principalText &&
              lastReadyPrincipalRef.current === principalText
            ) {
              setIsAdmin(false);
              setHasRealAdmin(false);
              adminResolvedForRef.current = principalText;
              setIsAdminLoading(false);
              setHasRealAdminLoading(false);
            }
          }
        })();
        // No cleanup — the IIFE is self-guarding.
      }
      devLog("[AUTH] already ready for principal:", principalText, "skipping");
      // Only short-circuit when authState is ALREADY "ready" for this
      // principal. If authState is not yet "ready" (the post-login case
      // where the same principal text appears but the identity just
      // transitioned from anonymous/undefined to authenticated, or a prior
      // run was cancelled before reaching "ready"), fall through to the
      // initialization path below so setActor / setAuthState("ready") /
      // setIsAdmin actually execute and trigger a consumer re-render.
      if (authStateRef.current === "ready") {
        return;
      }
      // authState is not "ready" for this principal yet — drop the stale
      // lastReadyPrincipalRef marker so the initialization path below
      // proceeds instead of being blocked by the pendingPrincipalRef
      // guard. This is the fix for the "UI does not re-render after II
      // login without a manual refresh" bug.
      lastReadyPrincipalRef.current = null;
    }

    // If an initialization for this same principal is already in flight
    // (rapid re-render with same identity ref), do not launch a second
    // IIFE — its cleanup would cancel the first and leave authState stuck.
    if (pendingPrincipalRef.current === principalText) {
      devLog(
        "[AUTH] initialization already in flight for principal:",
        principalText,
        "skipping duplicate",
      );
      return;
    }

    devLog("[AUTH] initializing actor for principal:", principalText);
    pendingPrincipalRef.current = principalText;
    // Set loading at the START so any consumer sees the loading state
    // immediately, before the async admin resolution begins.
    setIsAdmin(false);
    setIsAdminLoading(true);
    setHasRealAdmin(false);
    setHasRealAdminLoading(true);

    // createAuthenticatedActor is async (resolves the backend canister ID
    // from /env.json at runtime). Wrap the actor-creation + immediate
    // post-creation state transitions in an async IIFE so we can await it
    // without making the effect callback itself async (which would change
    // its return type and break the effect contract). The admin-resolution
    // IIFE below is unchanged.
    let cancelled = false;
    (async () => {
      let newActor: backendInterface;
      try {
        newActor = await createAuthenticatedActor(identity);
      } catch (err) {
        if (cancelled) return;
        devError("[AUTH] actor creation failed:", err);
        setActor(null);
        // Actor creation failure is a hard auth error — surface as
        // unauthenticated so the UI is not stuck on "loading" forever.
        // Clear pending so a retry (e.g. after refresh) can re-attempt.
        setAuthState("unauthenticated");
        setIsAdmin(false);
        setIsAdminLoading(false);
        setHasRealAdmin(false);
        setHasRealAdminLoading(false);
        pendingPrincipalRef.current = null;
        adminResolvedForRef.current = null;
        return;
      }

      if (cancelled) return;

      // Actor created — the user is now authenticated. Flip authState
      // to "ready" IMMEDIATELY so isAuthenticated becomes true without
      // waiting for the async admin resolution. This is the single point
      // that exposes the authenticated state to the UI. Admin status
      // (isAdmin) resolves in the background and updates independently;
      // it must NOT block the authenticated state.
      setActor(newActor);
      setAuthState("ready");
      lastReadyPrincipalRef.current = principalText;
      pendingPrincipalRef.current = null;
      devLog("[AUTH] authState -> ready for principal:", principalText);

      // Resolve admin status directly from backend, no caching. This runs
      // in the background and only updates isAdmin/isAdminLoading. It does
      // NOT gate authState — that was already set to "ready" above.
      try {
        devLog("[AUTH] calling isAdmin() for principal:", principalText);
        const adminResult = await newActor.isAdmin();
        devLog(
          "[AUTH] isAdmin() result:",
          adminResult,
          "principal:",
          principalText,
        );
        devLog("[AUTH] calling hasRealAdmin() for principal:", principalText);
        const realAdminResult = await newActor.hasRealAdmin();
        devLog(
          "[AUTH] hasRealAdmin() result:",
          realAdminResult,
          "principal:",
          principalText,
        );
        // Only apply if admin has not already been resolved for this
        // principal by a newer run, AND the active principal is still
        // this principal (not logged out / changed).
        if (
          !cancelled &&
          adminResolvedForRef.current !== principalText &&
          lastReadyPrincipalRef.current === principalText
        ) {
          setIsAdmin(adminResult);
          setHasRealAdmin(realAdminResult);
          adminResolvedForRef.current = principalText;
          setIsAdminLoading(false);
          setHasRealAdminLoading(false);
        }
      } catch (err) {
        devError("[AUTH] admin check error:", err, "principal:", principalText);
        if (
          !cancelled &&
          adminResolvedForRef.current !== principalText &&
          lastReadyPrincipalRef.current === principalText
        ) {
          // Admin resolution failed — fall back to non-admin so the UI
          // still renders the authenticated state. The user is NOT
          // stranded: authState is already "ready" from above.
          setIsAdmin(false);
          setHasRealAdmin(false);
          // Mark resolved so a re-run does not loop forever; the false
          // values are the final answer for this principal.
          adminResolvedForRef.current = principalText;
          setIsAdminLoading(false);
          setHasRealAdminLoading(false);
        }
      }
    })();

    // Cleanup: mark this run cancelled so a stale async completion (from
    // a previous principal or after logout) cannot apply state. This is
    // safe because the IIFE checks `cancelled` before every state update.
    return () => {
      cancelled = true;
    };
  }, [identity, iiIsAuthenticated]);

  // Derived auth state — computed from current identity + authState
  const principalText = identity?.getPrincipal().toText() ?? null;
  const isAnonymous = !principalText || principalText === "2vxsx-fae";
  const isAuthenticated =
    iiIsAuthenticated && !isAnonymous && authState === "ready";
  const principal = isAuthenticated ? principalText : null;
  useEffect(() => {
    devLog("[COMMIT] AuthProvider committed isAuthenticated:", isAuthenticated);
  }, [isAuthenticated]);
  devLog("[RENDER] AuthProvider render:", {
    authState,
    isAdmin,
    actor: !!actor,
    isAuthenticated,
  });

  // Post-auth redirect guard
  useEffect(() => {
    if (redirectCheckedRef.current) return;
    if (isAuthenticated && principal && authState === "ready") {
      const redirectTarget = sessionStorage.getItem("postAuthRedirect");
      if (redirectTarget) {
        sessionStorage.removeItem("postAuthRedirect");
        redirectCheckedRef.current = true;
        navigate({ to: redirectTarget });
      }
    }
  }, [isAuthenticated, principal, authState, navigate]);

  const login = useCallback(() => {
    // Reset redirect guard so it works after re-login
    redirectCheckedRef.current = false;
    devLog("[LOGIN] login() invoked");
    devLog("[LOGIN] calling iiLogin()");
    // The wrapper's iiLogin() returns void (not a Promise) and exposes NO
    // onSuccess/onError callbacks. It internally awaits authClient.signIn()
    // and updates its own internal state (identity, loginStatus) via
    // handleLoginSuccess/handleLoginError after signIn() resolves. There is
    // nothing to await or .then() here — that path is dead.
    //
    // The post-login identity update is handled reactively: the identity-value
    // observer effect above (which depends on loginStatus) re-runs when the
    // wrapper transitions to 'success', and the core identity effect (which
    // depends on identity/iiIsAuthenticated) then picks up the new
    // non-anonymous identity and flips authState to "ready" — all without a
    // manual page refresh.
    //
    // [RECON] Mark that a login attempt is in flight so the identity-value
    // observer effect knows a subsequent 'loginError' (with no published
    // identity) is a real post-login failure worth reconciling via provider
    // remount — not a stale mount-time state.
    loginAttemptedRef.current = true;
    iiLogin();
    devLog(
      "[LOGIN] iiLogin dispatched (void return); awaiting wrapper state transition",
    );
  }, [iiLogin]);

  const logout = useCallback(() => {
    try {
      clear();
      // P10: Clear persisted notifications from localStorage on logout so a
      // different user (or the same user on a fresh session) does not see
      // the previous user's notification history. Iterate keys in reverse
      // so removal during iteration does not skip entries. The key pattern
      // is icpms_notifications_${principalId} (see useNotifications.ts).
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith("icpms_notifications_")) {
          localStorage.removeItem(key);
        }
      }
      // Reset principal tracking and redirect guard on logout
      lastReadyPrincipalRef.current = null;
      pendingPrincipalRef.current = null;
      adminResolvedForRef.current = null;
      setActor(null);
      redirectCheckedRef.current = false;
      // Clear stale React Query cache so disconnect returns to login cleanly
      // with no application error and no manual refresh.
      queryClient.clear();
      navigate({ to: "/" });
    } catch {
      window.location.href = "/";
    }
  }, [clear, navigate, queryClient]);

  // Re-fetch isAdmin() from the backend using the
  // current actor. Used after setupAdmin() so the UI updates immediately
  // without a page refresh.
  const refreshAdmin = useCallback(async () => {
    if (!actor) return;
    try {
      devLog("[AUTH] refreshAdmin() calling isAdmin()");
      const adminResult = await actor.isAdmin();
      setIsAdmin(adminResult);
      devLog("[AUTH] refreshAdmin() calling hasRealAdmin()");
      const realAdminResult = await actor.hasRealAdmin();
      setHasRealAdmin(realAdminResult);
      devLog("[AUTH] refreshAdmin() hasRealAdmin() result:", realAdminResult);
    } catch (err) {
      devError("[AUTH] refreshAdmin() error:", err);
      setIsAdmin(false);
      setHasRealAdmin(false);
    }
  }, [actor]);

  // One-time draft-only admin setup. Calls actor.setupAdmin() and, on
  // success (returns true), re-fetches admin state so the UI unlocks
  // immediately without a page refresh.
  const setupAdmin = useCallback(async () => {
    if (!actor) return false;
    try {
      const result = await actor.setupAdmin();
      if (result) {
        await refreshAdmin();
      }
      return result;
    } catch (err) {
      devError("[AUTH] setupAdmin() error:", err);
      return false;
    }
  }, [actor, refreshAdmin]);

  // [RENDER-DEPS] Observation-only instrumentation. Captures the reference
  // identity of EACH of the 13 useMemo deps on EVERY AuthProvider render,
  // diffs against the previous render, and logs which fields flipped
  // reference (memoization-defeating) vs which changed value (legitimate)
  // vs which stayed stable. Does NOT touch the useMemo, its deps array, or
  // its value object. Wrap/extend only — observation only.
  //
  // Object/function fields use a reference-based identity signature; primitive
  // fields use the value itself as the identity. This distinguishes
  // "same value, new reference" (memo bug) from "new value" (legit re-render).
  const renderDepsCounterRef = useRef(0);
  const prevDepsRef = useRef<Record<string, unknown> | null>(null);
  // Compute current dep identities in render order (must run before useMemo).
  // eslint-disable-next-line react-hooks/rules-of-hooks -- top-level render code, not a hook call
  const currentDeps: Record<string, unknown> = {
    isAuthenticated,
    principal,
    identity: identity ?? null,
    actor,
    login,
    logout,
    isAdmin,
    isAdminLoading,
    hasRealAdmin,
    hasRealAdminLoading,
    authState,
    setupAdmin,
    refreshAdmin,
  };
  // Primitive fields use value-as-identity; object/function fields use
  // reference-as-identity. The signature is the value itself for primitives
  // (so a value change is detectable) and the reference for objects/functions
  // (so a reference flip is detectable even when the value is structurally
  // equal). We store the raw reference for object/function fields so the diff
  // can detect "same value, new reference" via Object.is.
  const PRIMITIVE_DEP_FIELDS = new Set([
    "isAuthenticated",
    "principal",
    "isAdmin",
    "isAdminLoading",
    "hasRealAdmin",
    "hasRealAdminLoading",
    "authState",
  ]);
  const identityChanged: string[] = [];
  const valueChanged: string[] = [];
  const prevDeps = prevDepsRef.current;
  for (const field of Object.keys(currentDeps)) {
    const curr = currentDeps[field];
    if (prevDeps === null) {
      // First render — no previous to diff against. Treat as stable baseline.
      continue;
    }
    const prev = prevDeps[field];
    const isPrimitive = PRIMITIVE_DEP_FIELDS.has(field);
    if (isPrimitive) {
      // For primitives, identity === value. A change is a legitimate value
      // change (no separate reference concept).
      if (!Object.is(prev, curr)) {
        valueChanged.push(field);
      }
    } else {
      // For object/function fields, detect reference flip (identity change)
      // AND value change separately. Reference flip with same value === memo
      // bug; reference flip with different value === legit change.
      const refChanged = !Object.is(prev, curr);
      if (refChanged) {
        identityChanged.push(field);
        // For functions there is no cheap "value" concept; for the identity
        // object we compare by principal text. We do not attempt deep value
        // comparison for object/function fields — a reference flip is the
        // signal the user asked for. We still surface it under identityChanged
        // so the user can see "same value, new reference" by correlating with
        // the [RENDER] marker's value log.
      }
    }
  }
  prevDepsRef.current = currentDeps;
  renderDepsCounterRef.current += 1;
  const renderDepsCount = renderDepsCounterRef.current;
  const allStable =
    prevDeps !== null &&
    identityChanged.length === 0 &&
    valueChanged.length === 0;
  // [RENDER-DEPS-ACTOR] Observation-only instrumentation. The single most
  // important signal for the actor-flicker question: on EVERY AuthProvider
  // render, log the actor reference identity (a per-reference counter so the
  // value is greppable and stable across renders) AND whether the actor is
  // the SAME reference as the previous render. If actor flips reference on
  // SettingsPage visits, that cascades through refreshAdmin -> setupAdmin and
  // defeats the useMemo. Wrap/extend only — observation only; does NOT touch
  // the useMemo, its deps array, or its value object.
  //
  // We use a WeakMap keyed by the actor object reference to assign each
  // distinct actor instance a stable small integer. A null actor is assigned
  // id 0. This lets the log show "actor #3 (same)" vs "actor #4 (FLIPPED)"
  // without relying on Object.is alone (which only gives a boolean).
  const actorInstanceIdMapRef = useRef<WeakMap<object, number>>(new WeakMap());
  const actorInstanceIdNextRef = useRef(1);
  const prevActorRefRef = useRef<backendInterface | null>(null);
  const actorInstanceId =
    actor == null
      ? 0
      : (actorInstanceIdMapRef.current.get(actor) ??
        (() => {
          const id = actorInstanceIdNextRef.current;
          actorInstanceIdNextRef.current += 1;
          actorInstanceIdMapRef.current.set(actor, id);
          return id;
        })());
  const actorRefChanged = !Object.is(prevActorRefRef.current, actor);
  prevActorRefRef.current = actor;
  devLog("[RENDER-DEPS-ACTOR] AuthProvider actor reference:", {
    render: renderDepsCount,
    actorInstanceId,
    actorIsNull: actor == null,
    refChanged: actorRefChanged, // true = actor reference FLIPPED this render (memo-defeating cascade source)
    sameAsPrev: !actorRefChanged,
  });

  devLog("[RENDER-DEPS] AuthProvider useMemo deps diff:", {
    render: renderDepsCount,
    identityChanged, // reference flipped (memoization-defeating) — even if value is the same
    valueChanged, // legitimate value change (primitives only)
    allStable, // true if all 13 deps stable (no flip, no value change)
    isFirstRender: prevDeps === null,
  });
  // [RENDER-DEPS] A reference flip (identityChanged non-empty) is the bug
  // signal we care about most — it defeats the useMemo and cascades through
  // refreshAdmin -> setupAdmin. ALSO emit it as a console.warn (in addition
  // to the console.log above) so it surfaces even under default console
  // verbosity filtering. The allStable / valueChanged / first-render cases
  // keep console.log only. Observation-only — does not touch state or the
  // useMemo.
  if (identityChanged.length > 0) {
    devWarn(
      "[RENDER-DEPS] AuthProvider identityChanged (reference flip — memo-defeating):",
      {
        render: renderDepsCount,
        identityChanged,
        actorInstanceId,
        actorRefChanged,
      },
    );
  }

  const value = useMemo(
    () => ({
      isAuthenticated,
      principal,
      identity: identity ?? null,
      actor,
      login,
      logout,
      isAdmin,
      isAdminLoading,
      hasRealAdmin,
      hasRealAdminLoading,
      authState,
      isFetching: authState === "loading",
      setupAdmin,
      refreshAdmin,
    }),
    [
      isAuthenticated,
      principal,
      identity,
      actor,
      login,
      logout,
      isAdmin,
      isAdminLoading,
      hasRealAdmin,
      hasRealAdminLoading,
      authState,
      setupAdmin,
      refreshAdmin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export type { AuthContextValue };

export function useAuth() {
  return useContext(AuthContext);
}
