import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

interface BrandedAuthGateProps {
  subtitle?: string;
}

export default function BrandedAuthGate({ subtitle }: BrandedAuthGateProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[30vh] gap-3 px-4 text-center"
      data-ocid="branded_auth_gate.panel"
    >
      <div className="flex flex-col items-center gap-3">
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
          data-ocid="branded_auth_gate.heading"
        >
          ICP Mint Studio
        </h2>
        {subtitle && (
          <p
            className="text-sm text-muted-foreground max-w-xs"
            data-ocid="branded_auth_gate.subtitle"
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
