import type { backendInterface } from "@/backend";
import { CANISTERS } from "@/config/canisters";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { resetNftHydration, useMyActiveNfts } from "../hooks/useQueries";

interface AuthContextValue {
  authState: "loading" | "ready" | "unauthenticated";
  isAuthenticated: boolean;
  principal: string | null;
  identity: ReturnType<typeof useInternetIdentity>["identity"] | null;
  actor: backendInterface | null;
  login: () => void;
  logout: () => void;
  isAdmin: boolean;
  isCollector: boolean;
  showAdminBanner: boolean;
  dismissAdminBanner: () => void;
  claimAdmin: () => Promise<void>;
  isAdminLoading: boolean;
  subscriptionTier: import("@/backend").SubscriptionTier | null;
  isPaidTier: boolean;
  profileReady: boolean;
  creatorId: string | null;
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
  isCollector: false,
  showAdminBanner: false,
  dismissAdminBanner: () => {},
  claimAdmin: async () => {},
  isAdminLoading: false,
  subscriptionTier: null,
  isPaidTier: false,
  authState: "loading",
  profileReady: false,
  creatorId: null,
  isFetching: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    identity,
    isAuthenticated: iiIsAuthenticated,
    login: iiLogin,
    clear,
  } = useInternetIdentity();
  const queryClient = useQueryClient();

  // Must check BOTH iiIsAuthenticated AND that the principal is NOT anonymous.
  // The anonymous principal text is "2vxsx-fae" — this prevents anonymous principal bypass.
  const principalText = identity ? identity.getPrincipal().toText() : null;
  const isAnonymous = !principalText || principalText === "2vxsx-fae";
  const isAuthenticated = iiIsAuthenticated && !isAnonymous;

  const principal = isAuthenticated ? principalText : null;

  const [authState, setAuthState] = useState<
    "loading" | "ready" | "unauthenticated"
  >("loading");

  // Actor is purely a function of identity — no caching, no refs, no skip logic
  const [actor, setActor] = useState<backendInterface | null>(null);
  const [isFetching, _setIsFetching] = useState(false);

  useEffect(() => {
    if (!identity) {
      setActor(null);
      setAuthState("unauthenticated");
      setProfileReady(false);
      setCreatorId(null);
      return;
    }

    const principal = identity.getPrincipal();
    const principalText = principal.toText();

    // HARD GUARD: never create actor with anonymous identity
    console.log("ICP_GUARD", {
      principal: principalText,
      isAnonymous: principal.isAnonymous(),
    });
    if (principal.isAnonymous() || principalText === "2vxsx-fae") {
      setActor(null);
      setAuthState("unauthenticated");
      setProfileReady(false);
      setCreatorId(null);
      return;
    }

    setAuthState("loading");
    setProfileReady(false);
    setCreatorId(null);

    const newActor = createAuthenticatedActor(identity);
    setActor(newActor);
    setAuthState("ready");
  }, [identity]);

  const [showAdminBanner, setShowAdminBanner] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  // hasAdmin query — true if an admin is already configured
  const { data: hasAdminData } = useQuery<boolean>({
    queryKey: ["adminPrincipal", principal],
    queryFn: async () => {
      if (!actor) return true;
      const admin = await actor.getAdminPrincipal();
      return admin !== null;
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: !!actor && isAuthenticated,
  });

  const hasAdminBannerRef = useRef(false);
  useEffect(() => {
    if (
      isAuthenticated &&
      hasAdminData === false &&
      !hasAdminBannerRef.current
    ) {
      hasAdminBannerRef.current = true;
      setShowAdminBanner(true);
    }
  }, [isAuthenticated, hasAdminData]);
  const [_adminBannerDismissed, setAdminBannerDismissed] = useState(false);

  // Admin detection — cached via React Query (staleTime: Infinity)
  const { data: isAdmin = false, isLoading: isAdminQueryLoading } =
    useQuery<boolean>({
      queryKey: ["isAdmin", principal],
      queryFn: async () => {
        if (!actor) return false;
        return actor.isCallerAdmin();
      },
      staleTime: Number.POSITIVE_INFINITY,
      enabled: !!actor && isAuthenticated,
    });

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) setIsAdminLoading(isAdminQueryLoading);
    return () => {
      cancelled = true;
    };
  }, [isAdminQueryLoading]);

  // Profile hydration: fetch or create profile globally, track readiness
  const [profileReady, setProfileReady] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!actor || !isAuthenticated || !principal) {
      setProfileReady(false);
      setCreatorId(null);
      return;
    }
    setProfileReady(false);
    (async () => {
      try {
        const profile = await actor.getCallerProfile();
        if (cancelled) return;
        const resolvedCreatorId = profile?.creatorId ?? principal;
        setCreatorId(resolvedCreatorId);
        setProfileReady(true);
      } catch {
        if (!cancelled) {
          setCreatorId(principal);
          setProfileReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor, isAuthenticated, principal]);

  // Collector detection — authenticated non-admin user with no active NFTs
  const { data: activeNfts } = useMyActiveNfts();

  const { data: callerProfile } = useQuery({
    queryKey: ["callerProfile", principal],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerProfile();
    },
    staleTime: 30_000,
    enabled: !!actor && isAuthenticated && !isAdminQueryLoading,
  });

  const subscriptionTier = callerProfile?.subscriptionTier ?? null;
  const isPaidTier =
    isAdmin ||
    subscriptionTier === "creator" ||
    subscriptionTier === "pro" ||
    subscriptionTier === "org";

  const isCollector =
    isAuthenticated &&
    !isAdmin &&
    !isAdminQueryLoading &&
    (activeNfts?.length ?? 0) === 0 &&
    callerProfile !== undefined &&
    callerProfile !== null &&
    Number(callerProfile.activeSlots) === 0;

  // Reset admin state on logout
  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated && !cancelled) {
      setShowAdminBanner(false);
      hasAdminBannerRef.current = false;
      setAuthState("unauthenticated");
    }
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Post-auth redirect guard: if login was triggered from /collector or /wallet,
  // redirect back there after successful authentication.
  const navigate = useNavigate();
  const redirectCheckedRef = useRef(false);
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

  const dismissAdminBanner = useCallback(() => {
    setShowAdminBanner(false);
    setAdminBannerDismissed(true);
  }, []);

  const claimAdmin = useCallback(async () => {
    if (!actor) throw new Error("No actor");
    await actor.claimAdmin();
  }, [actor]);

  const logout = useCallback(() => {
    try {
      resetNftHydration();
      queryClient.clear();
      clear();
      navigate({ to: "/" });
    } catch {
      window.location.href = "/";
    }
  }, [clear, navigate, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        principal,
        identity: identity ?? null,
        actor,
        login: () => iiLogin(),
        logout,
        isAdmin,
        isCollector: isCollector ?? false,
        showAdminBanner,
        dismissAdminBanner,
        claimAdmin,
        isAdminLoading,
        subscriptionTier,
        isPaidTier,
        authState,
        profileReady,
        creatorId,
        isFetching,
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
