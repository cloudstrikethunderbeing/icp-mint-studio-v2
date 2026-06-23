// Hardcoded canister IDs — build pipeline env var injection is broken.
// Draft deployment (pretty-amber-68k-draft.caffeine.xyz):
const DRAFT_BACKEND_ID = "rqo43-haaaa-aaaai-q3zia-cai";
const DRAFT_FRONTEND_ID = "nzbzg-eiaaa-aaaai-q34ua-cai";

// Live deployment (icp-mint-studio-n3x.caffeine.xyz):
const LIVE_BACKEND_ID = "ksicd-uqaaa-aaaak-qy63a-cai";
const LIVE_FRONTEND_ID = "k3lj7-cyaaa-aaaak-qy62q-cai";

const isDraft =
  typeof window !== "undefined" && window.location.hostname.includes("draft");

export const CANISTERS = {
  backend: isDraft ? DRAFT_BACKEND_ID : LIVE_BACKEND_ID,
  frontend: isDraft ? DRAFT_FRONTEND_ID : LIVE_FRONTEND_ID,
};
