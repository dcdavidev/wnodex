# AGENTS.md

Repository memory for the `wnodex` monorepo. Keep this file short; put detail in `.agents/skills/`.

## What This Repo Is

`wnodex` (Web Node Express) is a production-ready Express.js server framework published as the `wnodex` npm package. The repository is a pnpm + turbo monorepo whose root package `@wnodex/workspace` is private and holds tooling only.

- Publishable package: `packages/wnodex` (ESM only, `"type": "module"`, compiled with `tsc` to `dist/`).
- Runtime deps: express 4, helmet, cors, compression, hpp, express-rate-limit, express-session, passport, cookie-parser, pino, pino-pretty.
- Tests: Vitest + supertest in `packages/wnodex/tests/`.

## Skills

Read the matching skill before working in an area:

| Skill                                          | Use for                                                                          |
| :--------------------------------------------- | :------------------------------------------------------------------------------- |
| `.agents/skills/wnodex/SKILL.md`               | Using the package: dual functional/class API, config, logging, errors, lifecycle |
| `.agents/skills/wnodex-config/SKILL.md`        | `wnodex/config` & `wnodex/constants`, `loadConfig`, pure env parsers, defaults   |
| `.agents/skills/wnodex-errors/SKILL.md`        | `wnodex/errors`, `BaseError`, `HttpError`, `ConfigError`, `ValidationError`, 404 |
| `.agents/skills/wnodex-logger/SKILL.md`        | `wnodex/logger`, `createLogger`, Pino formatting, redaction, child loggers       |
| `.agents/skills/wnodex-middlewares/SKILL.md`   | Middleware ecosystem, defaults, mount order, recipes                             |
| `.agents/skills/wnodex-health-checks/SKILL.md` | `/health`, `/health/live`, `/health/ready`, plugin authoring, K8s probes         |
| `.agents/skills/wnodex-server/SKILL.md`        | `wnodex/server`, `startServer`, graceful shutdown, `cleanupHooks`, OS signals    |
| `.agents/skills/wnodex-development/SKILL.md`   | Contributing here: layout, conventions, gates, release flow                      |

Each skill has a `references/` directory with deep detail. Load those only when needed.

## Environment

Requires Node >= 24 and `pnpm@12.14.0` (pinned via `packageManager`).

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
```

If `corepack enable` cannot write to the global bin dir, run pnpm as `corepack pnpm <command>`.

## Commands

| Command                        | Purpose                          |
| :----------------------------- | :------------------------------- |
| `pnpm run check-types`         | `tsc --noEmit` via turbo         |
| `pnpm run lint` / `lint:check` | ESLint write / check             |
| `pnpm run fmt` / `fmt:check`   | Prettier write / check           |
| `pnpm run spellcheck`          | CSpell                           |
| `pnpm run test`                | Vitest via turbo                 |
| `pnpm run check` / `check:ci`  | All gates, writing / non-writing |
| `pnpm run release:dry`         | Simulate a dropdx release        |

Turbo shells out to the package manager. If it fails with `Unable to find package manager binary`, put `pnpm` on `PATH` or use `corepack pnpm run <task>`.

## Conventions That Matter

- ESM with `.js` extensions in relative imports, even from `.ts` files.
- JSDoc on every exported symbol; each file starts with an `@file` / `@module` header.
- Export a `createX(options?)` factory plus a default `x` instance.
- Read config from `config/env.js`, never `process.env` (except in `config/env.ts`).
- Read defaults from `constants/index.ts`; never hardcode port, body limit, or timeout values.
- Passing an options object auto-enables that middleware; `enableX: false` always wins.
- Strict TS: prefix intentionally unused params with `_`.
- Tests: import from `../src/index.js`, use `supertest` on the app, pass `createLogger({ level: 'silent' })`, use `loadConfig({ port: 0 })` and close servers.
- Commit messages must follow Conventional Commits (commitlint runs on `commit-msg`).

## Gotchas

- `app.get(name)` with one string argument is an Express settings lookup, not a route. Post-creation routes go through an internal router mounted before the 404 handler.
- Compression, cookie parser, session, and Passport are opt-in; Helmet, CORS, HPP, rate limit, body parser, and health checks are on by default.
- Enabling session without a secret throws `ConfigError`.
- `createDatabaseHealthPlugin` and `createHealthProbePlugin` default `critical` to `true`, unlike the `HealthPlugin` interface where it defaults to `false`.
- The default session store is in-memory; not suitable for multi-instance deployments.
- CSpell: add legitimate new terms to `.config/cspell/custom.txt` in lowercase.
