import { CANISTERS } from "../config/canisters";

export function VersionIndicator() {
  return (
    <div className="mt-8 p-4 bg-muted/30 rounded-lg text-xs text-muted-foreground">
      <div className="font-semibold mb-2">Deployment Info</div>
      <div>Frontend: {CANISTERS.frontend}</div>
      <div>Backend: {CANISTERS.backend}</div>
      <div>Build: {new Date().toISOString()}</div>
    </div>
  );
}
