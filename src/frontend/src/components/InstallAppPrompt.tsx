import { Button } from "@/components/ui/button";
import { Download, Monitor, Smartphone, Tablet } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type InstallState =
  | { kind: "prompt"; prompt: () => void }
  | { kind: "ios" }
  | { kind: "android" }
  | { kind: "desktop" }
  | { kind: "other" }
  | null;

function detectPlatform(): "ios" | "android" | "windows" | "macos" | "other" {
  const ua = navigator.userAgent;
  const platform = navigator.platform?.toLowerCase() ?? "";

  if (
    /iphone|ipad|ipod/i.test(ua) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  ) {
    return "ios";
  }
  if (/android/i.test(ua)) return "android";
  if (/win32|win64|windows/i.test(platform) || /windows/i.test(ua))
    return "windows";
  if (/macintosh|mac os x/i.test(ua) || /macintel/i.test(platform))
    return "macos";
  return "other";
}

export default function InstallAppPrompt() {
  const [installState, setInstallState] = useState<InstallState>(null);
  const deferredPromptRef = useRef<(Event & { prompt: () => void }) | null>(
    null,
  );
  const platform = detectPlatform();

  useEffect(() => {
    const isInStandaloneMode =
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true || window.matchMedia("(display-mode: standalone)").matches;

    if (isInStandaloneMode) return;

    // Set initial install state based on platform
    if (platform === "ios") {
      setInstallState({ kind: "ios" });
      return;
    }

    if (platform === "android") {
      setInstallState({ kind: "android" });
    } else if (platform === "windows" || platform === "macos") {
      setInstallState({ kind: "desktop" });
    } else {
      setInstallState({ kind: "other" });
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      deferredPromptRef.current = e as Event & { prompt: () => void };
      setInstallState({
        kind: "prompt",
        prompt: () => deferredPromptRef.current?.prompt(),
      });
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => setInstallState(null));

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [platform]);

  if (!installState) return null;

  const platformLabel =
    platform === "ios"
      ? "iOS"
      : platform === "android"
        ? "Android"
        : platform === "windows"
          ? "Windows"
          : platform === "macos"
            ? "macOS"
            : "Your Device";

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 space-y-3"
      data-ocid="install_app.card"
    >
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Download className="w-4 h-4 text-primary" />
        Install ICP Mint Studio
      </h2>
      <p className="text-xs text-muted-foreground">
        Add ICP Mint Studio to your home screen for a faster, app-like
        experience on {platformLabel}.
      </p>

      {installState.kind === "ios" && (
        <div className="rounded-lg bg-muted/40 border border-border px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-foreground font-medium">
            <Smartphone className="w-3.5 h-3.5 text-primary" />
            iOS / Safari
          </div>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>
              Tap the{" "}
              <span className="font-mono bg-muted px-1 rounded text-[10px]">
                Share
              </span>{" "}
              button in Safari
            </li>
            <li>
              Scroll down and tap{" "}
              <span className="text-foreground font-medium">
                Add to Home Screen
              </span>
            </li>
            <li>
              Tap <span className="text-foreground font-medium">Add</span> to
              confirm
            </li>
          </ol>
        </div>
      )}

      {installState.kind === "android" && (
        <div className="rounded-lg bg-muted/40 border border-border px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-foreground font-medium">
            <Smartphone className="w-3.5 h-3.5 text-primary" />
            Android / Chrome
          </div>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>
              Open the Chrome menu{" "}
              <span className="font-mono bg-muted px-1 rounded text-[10px]">
                ⋮
              </span>
            </li>
            <li>
              Tap{" "}
              <span className="text-foreground font-medium">
                Add to Home Screen
              </span>
            </li>
            <li>
              Tap <span className="text-foreground font-medium">Add</span> to
              confirm
            </li>
          </ol>
        </div>
      )}

      {installState.kind === "desktop" && (
        <div className="rounded-lg bg-muted/40 border border-border px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-foreground font-medium">
            <Monitor className="w-3.5 h-3.5 text-primary" />
            {platform === "windows"
              ? "Windows / Edge or Chrome"
              : "macOS / Chrome or Edge"}
          </div>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>
              Look for the{" "}
              <span className="font-mono bg-muted px-1 rounded text-[10px]">
                ⊕
              </span>{" "}
              install icon in the address bar
            </li>
            <li>
              Or open the menu{" "}
              <span className="font-mono bg-muted px-1 rounded text-[10px]">
                ⋮
              </span>{" "}
              →{" "}
              <span className="text-foreground font-medium">
                Install ICP Mint Studio
              </span>
            </li>
          </ol>
        </div>
      )}

      {installState.kind === "prompt" && (
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={() => {
            installState.prompt();
            setInstallState(null);
          }}
          data-ocid="install_app.button"
        >
          <Download className="w-4 h-4 mr-2" />
          Install App
        </Button>
      )}

      {installState.kind === "other" && (
        <div className="rounded-lg bg-muted/40 border border-border px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-foreground font-medium">
            <Tablet className="w-3.5 h-3.5 text-primary" />
            PWA Install
          </div>
          <p className="text-xs text-muted-foreground">
            Open this app in Chrome or Edge, then use the browser menu to
            install it to your home screen.
          </p>
        </div>
      )}
    </div>
  );
}
