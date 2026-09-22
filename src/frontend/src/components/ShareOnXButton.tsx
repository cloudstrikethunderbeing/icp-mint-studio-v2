import { Button } from "@/components/ui/button";
import { Twitter } from "lucide-react";

// ── ShareOnXButton ────────────────────────────────────────────────────────────
// Opens a pre-filled X (Twitter) intent tweet that links to the app with the
// caller's referral code, mentions @JackBearSupply, and uses noopener,noreferrer
// per AGENTS.md. The referral code is passed as a prop so the parent owns the
// data source (useGetOrCreateReferralCode or useMyReferralStatus).
//
// NO EXPIRY — referral codes never expire (per AGENTS.md), so the share link
// is stable for the lifetime of the code.

const SHARE_BASE_URL = "https://icp-mint-studio-06n.caffeine.xyz";
const MENTION_HANDLE = "@JackBearSupply";

interface ShareOnXButtonProps {
  referralCode: string;
  /** Optional override for the tweet body. Defaults to a concise referral CTA. */
  text?: string;
  /** Button label override. */
  label?: string;
  /** Visual variant — defaults to "default" (primary). */
  variant?: "default" | "outline" | "secondary";
  /** Optional className passthrough. */
  className?: string;
}

function buildIntentUrl(referralCode: string, text: string): string {
  const shareUrl = `${SHARE_BASE_URL}/?ref=${encodeURIComponent(referralCode)}`;
  const params = new URLSearchParams({
    text,
    url: shareUrl,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function ShareOnXButton({
  referralCode,
  text,
  label = "Share on X",
  variant = "default",
  className,
}: ShareOnXButtonProps) {
  // Compose a concise, on-brand tweet that mentions @JackBearSupply and links
  // back with the referral code. The mention is embedded in the tweet body so
  // it appears in the composer; the url param carries the shareable link.
  const tweetText =
    text ??
    `Just claimed an exclusive NFT on ICP Mint Studio ${MENTION_HANDLE} — use my referral link to get yours:`;

  const intentUrl = referralCode ? buildIntentUrl(referralCode, tweetText) : "";

  function handleClick() {
    if (!intentUrl) return;
    // noopener,noreferrer — prevents the opened tab from accessing window.opener
    // and from sending the Referer header, per AGENTS.md preference.
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={handleClick}
      disabled={!referralCode}
      className={className}
      data-ocid="referral.share_on_x_button"
      aria-label="Share your referral link on X"
    >
      <Twitter className="h-4 w-4" />
      {label}
    </Button>
  );
}
