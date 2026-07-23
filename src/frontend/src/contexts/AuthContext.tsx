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
  useRef,
  useState,
} from "react";
import { createAuthenticatedActor } from "../backendSingleton";
import { RECONCILE_LOGIN_EVENT } from "../main";

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
    console.log("[LOGIN] AuthProvider mounted");
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
    console.log("[LOGIN] identity value changed:", {
      identityIsNull,
      principalText,
      isAnonymous: isAnon,
      iiIsAuthenticated,
    });
    console.log("[LOGIN] loginStatus transition:", {
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
      console.log(
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
      console.log(
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: authState is intentionally excluded; we guard with refs to prevent duplicate work without reading stale state
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

    console.log("[AUTH] identity effect run:", {
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
      console.log("[AUTH] unauthenticated (no identity or anonymous)");
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
      console.log("[AUTH] anonymous identity, unauthenticated");
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
        console.log(
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
            console.log(
              "[AUTH] re-check calling hasRealAdmin() for principal:",
              principalText,
            );
            const realAdminResult = await reActor.hasRealAdmin();
            console.log(
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
            console.error("[AUTH] admin re-check error:", err);
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
      console.log(
        "[AUTH] already ready for principal:",
        principalText,
        "skipping",
      );
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
      console.log(
        "[AUTH] initialization already in flight for principal:",
        principalText,
        "skipping duplicate",
      );
      return;
    }

    console.log("[AUTH] initializing actor for principal:", principalText);
    pendingPrincipalRef.current = principalText;
    // Set loading at the START so any consumer sees the loading state
    // immediately, before the async admin resolution begins.
    setIsAdmin(false);
    setIsAdminLoading(true);
    setHasRealAdmin(false);
    setHasRealAdminLoading(true);

    let newActor: backendInterface;
    try {
      newActor = createAuthenticatedActor(identity);
    } catch (err) {
      console.error("[AUTH] actor creation failed:", err);
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

    // Actor created synchronously — the user is now authenticated. Flip
    // authState to "ready" IMMEDIATELY so isAuthenticated becomes true
    // without waiting for the async admin resolution. This is the single
    // point that exposes the authenticated state to the UI. Admin status
    // (isAdmin) resolves in the background and updates
    // independently; it must NOT block the authenticated state.
    setActor(newActor);
    setAuthState("ready");
    lastReadyPrincipalRef.current = principalText;
    pendingPrincipalRef.current = null;
    console.log("[AUTH] authState -> ready for principal:", principalText);

    // Resolve admin status directly from backend, no caching. This runs
    // in the background and only updates isAdmin/isAdminLoading.
    // It does NOT gate authState — that was already set to "ready" above.
    //
    // ROOT-CAUSE FIX for the "UI does not re-render after II login without
    // a manual refresh" bug: the prior `cancelled` flag was set to true on
    // EVERY effect cleanup, including re-runs triggered by an `identity`
    // REFERENCE change (II re-delegation) for the SAME principal. That
    // cancelled the in-flight `setIsAdmin(true)` even though the principal
    // had not changed, so the admin state never landed and consumers
    // stayed on the unauthenticated/creator view until a manual refresh
    // (where `identity` is stable and the effect runs only once).
    //
    // The fix: do NOT cancel the admin IIFE on cleanup. Instead, guard the
    // state updates with `adminResolvedForRef` so a stale completion (from
    // a previous principal) cannot overwrite a newer resolution, and guard
    // against applying admin state after logout by checking that the
    // current principal is still this principal. This lets the in-flight
    // admin resolution complete and trigger a consumer re-render even when
    // the effect re-runs for the same principal with a new identity ref.
    (async () => {
      try {
        console.log("[AUTH] calling isAdmin() for principal:", principalText);
        const adminResult = await newActor.isAdmin();
        console.log(
          "[AUTH] isAdmin() result:",
          adminResult,
          "principal:",
          principalText,
        );
        console.log(
          "[AUTH] calling hasRealAdmin() for principal:",
          principalText,
        );
        const realAdminResult = await newActor.hasRealAdmin();
        console.log(
          "[AUTH] hasRealAdmin() result:",
          realAdminResult,
          "principal:",
          principalText,
        );
        // Only apply if admin has not already been resolved for this
        // principal by a newer run, AND the active principal is still
        // this principal (not logged out / changed).
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
        console.error(
          "[AUTH] admin check error:",
          err,
          "principal:",
          principalText,
        );
        if (
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

    // No cleanup that cancels the admin IIFE. The IIFE is self-guarding:
    // it checks adminResolvedForRef and lastReadyPrincipalRef before
    // applying state, so a stale completion for a previous principal is
    // ignored, and a completion after logout (lastReadyPrincipalRef
    // cleared) is ignored. This is the fix for failure mode (b): the
    // async IIFE was setting state AFTER a cleanup cancelled it, dropping
    // the setIsAdmin(true) update that consumers need to re-render.
  }, [identity, iiIsAuthenticated]);

  // Derived auth state — computed from current identity + authState
  const principalText = identity?.getPrincipal().toText() ?? null;
  const isAnonymous = !principalText || principalText === "2vxsx-fae";
  const isAuthenticated =
    iiIsAuthenticated && !isAnonymous && authState === "ready";
  const principal = isAuthenticated ? principalText : null;
  useEffect(() => {
    console.log(
      "[COMMIT] AuthProvider committed isAuthenticated:",
      isAuthenticated,
    );
  }, [isAuthenticated]);
  console.log("[RENDER] AuthProvider render:", {
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
    console.log("[LOGIN] login() invoked");
    console.log("[LOGIN] calling iiLogin()");
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
    console.log(
      "[LOGIN] iiLogin dispatched (void return); awaiting wrapper state transition",
    );
  }, [iiLogin]);

  const logout = useCallback(() => {
    try {
      clear();
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
      console.log("[AUTH] refreshAdmin() calling isAdmin()");
      const adminResult = await actor.isAdmin();
      setIsAdmin(adminResult);
      console.log("[AUTH] refreshAdmin() calling hasRealAdmin()");
      const realAdminResult = await actor.hasRealAdmin();
      setHasRealAdmin(realAdminResult);
      console.log(
        "[AUTH] refreshAdmin() hasRealAdmin() result:",
        realAdminResult,
      );
    } catch (err) {
      console.error("[AUTH] refreshAdmin() error:", err);
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
      console.error("[AUTH] setupAdmin() error:", err);
      return false;
    }
  }, [actor, refreshAdmin]);

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export type { AuthContextValue };

export function useAuth() {
  return useContext(AuthContext);
}
