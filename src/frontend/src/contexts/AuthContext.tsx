import type { backendInterface } from "@/backend";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
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
  isFetching: boolean;
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
  authState: "loading",
  isFetching: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    identity,
    isAuthenticated: iiIsAuthenticated,
    login: iiLogin,
    clear,
  } = useInternetIdentity();
  const navigate = useNavigate();

  const [authState, setAuthState] = useState<
    "loading" | "ready" | "unauthenticated"
  >("loading");

  const [actor, setActor] = useState<backendInterface | null>(null);

  // Admin state — single source of truth, no caching, no derived permissions
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // Track the last principal we initialized for to prevent duplicate work
  // while allowing re-initialization when identity changes
  const lastPrincipalRef = useRef<string | null>(null);

  // Post-auth redirect guard — reset on logout so it works after re-login
  const redirectCheckedRef = useRef(false);

  // Core identity effect: only depend on raw II values to avoid stale closures.
  // All derived values (principalText, isAnonymous, isAuthenticated) are computed
  // inside the effect from the current identity reference.
  // biome-ignore lint/correctness/useExhaustiveDependencies: authState is intentionally excluded; we guard with lastPrincipalRef to prevent duplicate work
  useEffect(() => {
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
      lastPrincipal: lastPrincipalRef.current,
    });

    if (!identity) {
      console.log("[AUTH] no identity, unauthenticated");
      setActor(null);
      setAuthState("unauthenticated");
      setIsAdmin(false);
      setIsAdminLoading(false);
      lastPrincipalRef.current = null;
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
      lastPrincipalRef.current = null;
      return;
    }

    // Only skip if we're already initialized for this exact principal.
    // If principal changed, we MUST re-initialize even if a previous
    // init was in flight (the cleanup will cancel the old one).
    if (lastPrincipalRef.current === principalText && authState === "ready") {
      console.log(
        "[AUTH] already initialized for principal:",
        principalText,
        "skipping",
      );
      return;
    }

    console.log("[AUTH] initializing actor for principal:", principalText);
    lastPrincipalRef.current = principalText;
    setAuthState("loading");
    setIsAdmin(false);
    setIsAdminLoading(true);

    let newActor: backendInterface;
    try {
      newActor = createAuthenticatedActor(identity);
    } catch (err) {
      console.error("[AUTH] actor creation failed:", err);
      setActor(null);
      setAuthState("unauthenticated");
      setIsAdmin(false);
      setIsAdminLoading(false);
      lastPrincipalRef.current = null;
      return;
    }

    setActor(newActor);

    // Resolve admin status directly from backend, no caching
    let cancelled = false;
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
        if (!cancelled) {
          setIsAdmin(adminResult);
        }
      } catch (err) {
        console.error(
          "[AUTH] isAdmin() error:",
          err,
          "principal:",
          principalText,
        );
        if (!cancelled) {
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) {
          setIsAdminLoading(false);
          // Only mark ready after actor exists AND admin resolution is done
          setAuthState("ready");
          console.log(
            "[AUTH] authState -> ready for principal:",
            principalText,
          );
        }
      }
    })();

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
    iiLogin();
  }, [iiLogin]);

  const logout = useCallback(() => {
    try {
      clear();
      // Reset principal tracking and redirect guard on logout
      lastPrincipalRef.current = null;
      redirectCheckedRef.current = false;
      navigate({ to: "/" });
    } catch {
      window.location.href = "/";
    }
  }, [clear, navigate]);

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
        authState,
        isFetching: authState === "loading",
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
