export const CANISTERS = {
  backend:
    import.meta.env.VITE_CANISTER_ID_BACKEND ||
    import.meta.env.VITE_CANISTER_ID_LIVE_BACKEND ||
    "ksicd-uqaaa-aaaak-qy63a-cai",
  frontend:
    import.meta.env.VITE_CANISTER_ID_FRONTEND ||
    import.meta.env.VITE_CANISTER_ID_LIVE_FRONTEND ||
    "k3lj7-cyaaa-aaaak-qy62q-cai",
};
