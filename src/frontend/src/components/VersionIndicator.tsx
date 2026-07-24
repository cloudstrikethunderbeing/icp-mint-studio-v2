import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { CANISTERS, getBackendCanisterId } from "../config/canisters";

type MismatchState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok" }
  | { status: "mismatch"; runtime: string; envId: string }
  | { status: "error"; message: string };

export function VersionIndicator() {
  const { actor, isAuthenticated } = useAuth();
  const [mismatch, setMismatch] = useState<MismatchState>({ status: "idle" });
  const [envBackendId, setEnvBackendId] = useState<string>("");

  // Resolve the backend canister ID from /env.json at runtime for display.
  // This is the single source of truth — there is no bake-time fallback.
  useEffect(() => {
    let cancelled = false;
    getBackendCanisterId()
      .then((id) => {
        if (!cancelled) setEnvBackendId(id);
      })
      .catch(() => {
        // getBackendCanisterId() throws loudly on missing/malformed /env.json;
        // leave envBackendId empty so the display shows the empty-string state.
        if (!cancelled) setEnvBackendId("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Only run the cross-check once an actor is available. The actor is
    // created after authentication, so we wait for isAuthenticated + actor.
    if (!isAuthenticated || !actor) {
      setMismatch({ status: "idle" });
      return;
    }

    let cancelled = false;
    setMismatch({ status: "checking" });

    (async () => {
      try {
        // Compare two RUNTIME values: what the backend actor reports vs what
        // /env.json says. Both come from the live environment — no bake-time
        // CANISTERS.backend involved.
        const [actorCanisterId, envCanisterId] = await Promise.all([
          actor.getCanisterId(),
          getBackendCanisterId(),
        ]);
        if (cancelled) return;
        if (actorCanisterId !== envCanisterId) {
          setMismatch({
            status: "mismatch",
            runtime: actorCanisterId,
            envId: envCanisterId,
          });
        } else {
          setMismatch({ status: "ok" });
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setMismatch({ status: "error", message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, actor]);

  return (
    <div className="mt-8 p-4 bg-muted/30 rounded-lg text-xs text-muted-foreground">
      <div className="font-semibold mb-2">Deployment Info</div>
      <div>Frontend: {CANISTERS.frontend}</div>
      <div>Backend: {envBackendId}</div>
      <div>Build: {new Date().toISOString()}</div>
      {mismatch.status === "mismatch" && (
        <div
          data-ocid="version-indicator.mismatch-warning"
          className="mt-2 font-bold text-destructive"
          role="alert"
        >
          WARNING: canister ID mismatch detected — this bundle may be deployed
          to the wrong environment
          <div className="mt-1 font-normal text-destructive/80">
            /env.json backend: {mismatch.envId}
          </div>
          <div className="font-normal text-destructive/80">
            Runtime backend: {mismatch.runtime}
          </div>
        </div>
      )}
      {mismatch.status === "error" && (
        <div
          data-ocid="version-indicator.check-error"
          className="mt-2 text-destructive"
          role="alert"
        >
          Could not verify canister ID at runtime: {mismatch.message}
        </div>
      )}
    </div>
  );
}
