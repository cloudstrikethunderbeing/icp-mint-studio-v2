import { createActor } from "@/backend";
import type { backendInterface } from "@/backend";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  principal: string | null;
  identity: ReturnType<typeof useInternetIdentity>["identity"] | null;
  actor: backendInterface | null;
  login: () => void;
  logout: () => void;
  isAdmin: boolean;
  showAdminBanner: boolean;
  dismissAdminBanner: () => void;
  claimAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  principal: null,
  identity: null,
  actor: null,
  login: () => {},
  logout: () => {},
  isAdmin: false,
  showAdminBanner: false,
  dismissAdminBanner: () => {},
  claimAdmin: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    identity,
    isAuthenticated: iiIsAuthenticated,
    login: iiLogin,
    clear,
  } = useInternetIdentity();
  const { actor, isFetching } = useActor(createActor);

  // Must check BOTH iiIsAuthenticated AND that the principal is NOT anonymous.
  // The anonymous principal text is "2vxsx-fae" — this prevents anonymous principal bypass.
  const principalText = identity ? identity.getPrincipal().toText() : null;
  const isAnonymous = !principalText || principalText === "2vxsx-fae";
  const isAuthenticated = iiIsAuthenticated && !isAnonymous;

  const principal = isAuthenticated ? principalText : null;
  const resolvedActor =
    isAuthenticated && !isFetching ? (actor as backendInterface | null) : null;

  const [showAdminBanner, setShowAdminBanner] = useState(false);
  const [_adminBannerDismissed, setAdminBannerDismissed] = useState(false);

  // Admin detection — cached via React Query (staleTime: Infinity)
  const { data: isAdmin = false } = useQuery<boolean>({
    queryKey: ["isAdmin", principal],
    queryFn: async () => {
      if (!resolvedActor) return false;
      return resolvedActor.isAdmin();
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: !!resolvedActor && isAuthenticated,
  });

  // Reset admin state on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setShowAdminBanner(false);
    }
  }, [isAuthenticated]);

  const dismissAdminBanner = useCallback(() => {
    setShowAdminBanner(false);
    setAdminBannerDismissed(true);
  }, []);

  // claimAdmin removed — admin is set at deploy time, not via public endpoint
  const claimAdmin = useCallback(async () => {
    // no-op: admin assignment is deploy-time only
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        principal,
        identity: identity ?? null,
        actor: resolvedActor,
        login: () => iiLogin(),
        logout: () => clear(),
        isAdmin,
        showAdminBanner,
        dismissAdminBanner,
        claimAdmin,
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
