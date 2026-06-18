import { useTheme } from "next-themes";

/**
 * DisconnectPage — unified unauthenticated endpoint.
 *
 * Rules:
 * - No shell wrappers (no Layout, no Header, no BottomNav)
 * - No auth state reads (no role inference, no redirects, no login CTA)
 * - Pure branded screen with logo, title, and tagline only
 * - Rendered OUTSIDE the Layout tree in App.tsx
 */
export default function DisconnectPage() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <img
          src={
            resolvedTheme === "light"
              ? "/assets/logo-inverted.jpg"
              : "/assets/logo.jpg"
          }
          alt="ICP Mint Studio"
          className="h-16 w-auto rounded-lg"
          loading="eager"
        />
        <h2
          className="text-xl font-bold text-foreground tracking-tight"
          data-ocid="disconnect.heading"
        >
          ICP Mint Studio
        </h2>
        <p
          className="text-sm text-muted-foreground max-w-xs"
          data-ocid="disconnect.subtitle"
        >
          Mint, claim, and collect NFTs on the Internet Computer.
        </p>
      </div>
    </div>
  );
}
