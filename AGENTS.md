# Project Guidance

## User Preferences

[No preferences yet]

## Verified Commands

**Frontend** (run from `src/frontend/`):

- **install**: `pnpm install --prefer-offline`
- **typecheck**: `pnpm typecheck`
- **lint fix**: `pnpm fix`
- **build**: `pnpm build`

**Backend** (run from `src/backend/`):

- **install**: `mops install`
- **typecheck**: `mops check --fix`
- **build**: `mops build`

**Backend and frontend integration** (run from root):

- **generate bindings**: `pnpm bindgen` This step is necessary to ensure the frontend can call the backend methods.

## Learnings

- "canister-ids.json must have exactly two keys: 'draft' and 'live'. Never add a third key like 'ic' — vite.config.js only reads 'draft' or 'live' based on DFX_NETWORK. If Caffeine adds an 'ic' key, move those values into 'draft' and remove 'ic'."
  - "system func init() is NOT valid Motoko — compiler rejects it with M0129. Use a private helper called directly in the actor body (before system funcs) instead."
  - "postupgrade() does NOT run on fresh canister installs — only on upgrades. Master admin seeding must happen during actor init (directly in the actor body) so it works on both fresh installs and upgrades."
