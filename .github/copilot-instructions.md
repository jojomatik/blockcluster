# Copilot Cloud Agent Instructions for `blockcluster`

## What this repository is
`blockcluster` is a Nuxt 4 application (Vue 3 + Vuetify 3) for managing Minecraft servers in the browser. It combines UI and backend in one Node/Nitro server (`server/` + `app/`) and uses Socket.IO for live updates.

- **Project type:** full-stack TypeScript web app + Docker image
- **Runtime:** Node.js (CI uses **26.12.1**), Yarn Classic (**1.22.x**), Java only for managed Minecraft servers / Docker image contents
- **Main frameworks/libraries:** Nuxt 4, Vite, Vitest, ESLint, Socket.IO, Storybook
- **Repo size/shape:** medium monorepo-style layout without workspaces; key code under `app/`, `server/`, `shared/`, tests under `tests/`

## Use this execution order (validated)
Always run commands from the repository root.

1. **Bootstrap**
   ```bash
   npm install -g --ignore-scripts yarn@1.22.22
   yarn install --frozen-lockfile --prefer-offline
   ```
2. **Validation / CI parity**
   ```bash
   yarn test:release-notes
   GIT_SHA=$(git rev-parse --short HEAD) GIT_REF=$(git rev-parse --abbrev-ref HEAD) yarn build
   yarn lint
   yarn test:unit
   ```
3. **Run built app**
   ```bash
   NITRO_PORT=8081 yarn start
   ```
4. **Run dev server**
   ```bash
   GIT_SHA=$(git rev-parse --short HEAD) yarn dev
   ```

### What was verified and timing (in this environment)
- `yarn install --frozen-lockfile --prefer-offline` ✅ (~77s first install, ~20s in fresh clone with warm caches)
- `yarn test:release-notes` ✅ (~1s)
- `yarn build` with `GIT_SHA`/`GIT_REF` ✅ (~49s, ~36s in fresh clone)
- `yarn lint` ✅ (~6–9s)
- `yarn test:unit` ✅ (148 tests passed, ~21–24s)
- `NITRO_PORT=8081 yarn start` ✅; `/api/version` and `/api/servers` responded

## Failure modes you should avoid
- **Yarn missing by default on Node 26 images/shells:** `yarn: command not found`  
  **Mitigation:** always install Yarn Classic first (`npm install -g --ignore-scripts yarn@1.22.22`).
- **Build before install fails:** `nuxi: not found` (exit 127) in a clean clone.  
  **Mitigation:** always run `yarn install` before `yarn build`/`yarn lint`/`yarn test:unit`.
- **Docker build may fail on low disk environments:** observed `ENOSPC` / `No space left on device` during multi-stage JRE/Yarn layers.  
  **Mitigation:** free Docker disk (`docker system df`, then prune as appropriate) and retry.

## Script inventory (high-value)
From root `package.json`:
- `dev` → `nuxi dev --port 8081`
- `build` → `nuxi build`
- `start` → `node .output/server/index.mjs`
- `test:unit` → Vitest with coverage
- `lint` → ESLint (`--max-warnings 0`)
- `test:release-notes` → semantic-release dry-run verification
- `storybook`, `build-storybook`, `chromatic`

## Architecture and where to edit
- **Frontend pages/components:** `app/pages/**`, `app/components/**`
- **Backend API routes:** `server/api/**` (H3 handlers)
- **Backend runtime/bootstrap:** `server/backend.ts`, `server/plugins/backend.ts`
- **Shared domain models/utils:** `shared/**` (imported by both app and server)
- **Socket client plugin:** `app/plugins/socket.client.ts`
- **Route param validation helper:** `server/utils/api.ts` (`findServer(event)` throws 404 when missing)
- **Localization:** `locales/{en,de,fr}.json`

## Config and quality gates (search here first)
- **Nuxt config:** `nuxt.config.ts`
- **TypeScript:** `tsconfig.json`
- **Vitest:** `vitest.config.ts`
- **ESLint:** `eslint.config.mjs`
- **Storybook:** `.storybook/main.ts`
- **Docker:** `Dockerfile`, `docker-compose.yml`, `docker-compose.dev.yml`
- **Release automation config:** `release.config.js`, `scripts/check-release-notes.ts`

## CI/PR checks to replicate locally
Primary workflow: `.github/workflows/build.yml`
- Runs on PRs to `main`, `beta`, `next`
- Job order: install → `yarn test:release-notes` → `yarn build` → `yarn lint` → `yarn test:unit`
- Then Docker build + smoke test action (`.github/actions/smoke-test/action.yml`)

Other workflows:
- `.github/workflows/publish.yml` (build/test + Docker publish + semantic-release)
- `.github/workflows/chromatic.yml` (storybook/chromatic)

## Root layout quick list
Top-level important files/dirs:
`.github/`, `app/`, `server/`, `shared/`, `tests/`, `locales/`, `public/`, `scripts/`, `.storybook/`, `nuxt.config.ts`, `package.json`, `vitest.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `Dockerfile`, `docker-compose*.yml`, `README.md`.

## Practical guidance for future agents
Trust this file as the default operating playbook. Only search the repository when:
1. the task touches an area not mapped above, or
2. these instructions are incomplete for your exact change, or
3. a command here starts failing in your current environment.
