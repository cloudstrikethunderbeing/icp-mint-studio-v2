const backendId = import.meta.env.CANISTER_ID_BACKEND;
const frontendId = import.meta.env.CANISTER_ID_FRONTEND;

if (!backendId) {
  throw new Error(
    "CANISTER_ID_BACKEND is not defined. Ensure the build pipeline injects the correct canister ID.",
  );
}
if (!frontendId) {
  throw new Error(
    "CANISTER_ID_FRONTEND is not defined. Ensure the build pipeline injects the correct canister ID.",
  );
}

export const CANISTERS = {
  backend: backendId,
  frontend: frontendId,
};
