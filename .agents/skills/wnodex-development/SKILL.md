---
name: wnodex-development
description: This skill should be used when the user asks to "contribute to wnodex", "add a feature to the wnodex package", "fix a bug in wnodex", "add tests for wnodex", "run the wnodex test suite", "build the wnodex package", "release a new wnodex version", "update the wnodex changelog", or mentions the wnodex monorepo layout, its pnpm/turbo scripts, ESLint and Prettier presets, CSpell words, Lefthook hooks, or the dropdx release flow. Covers repository architecture, code conventions, verification commands, and the release workflow.
---

# wnodex Development

## Purpose

This skill covers contributing to the `wnodex` repository itself: the monorepo layout, the toolchain, the coding conventions, and the release flow. It is distinct from the `wnodex` skill, which covers using the package as a consumer.

## When to Use

Activate this skill when modifying the wnodex source, adding tests, running the quality gates, or cutting a release.

## Repository Layout

```text
wnodex/                          # pnpm workspace root (@wnodex/workspace, private)
├── packages/
│   └── wnodex/                  # the published package (name: wnodex)
│       ├── src/                 # TypeScript source, compiled to dist/ by tsc
│       ├── tests/               # Vitest suites
│       ├── CHANGELOG.md
│       └── package.json
├── .agents/skills/              # agent skills (this file lives here)
├── .config/
│   ├── cspell/custom.txt        # project-specific allowed words
│   └── dropdx.config.json       # release engine configuration
├── eslint.config.mjs            # spellbookx preset
├── prettier.config.mjs          # spellbookx preset
├── cspell.config.cjs            # spellbookx config + project words
├── commitlint.config.mjs        # spellbookx preset
├── lefthook.yml                 # pre-commit and commit-msg hooks
├── turbo.json                   # build / check-types / test pipelines
├── pnpm-workspace.yaml
└── skills-lock.json             # provenance for imported skills
```

The root package is private and holds only tooling. The `wnodex` package is the publishable artifact.

### Source Module Map

`packages/wnodex/src/` is organized by concern. Every directory has an `index.ts` barrel that re-exports its members, and the root `index.ts` re-exports every barrel.

| Path           | Responsibility                                                                                                                     |
| :------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`     | Root barrel re-exporting all modules                                                                                               |
| `app.ts`       | `createApp` factory and middleware wiring                                                                                          |
| `server.ts`    | `startServer`, `createServer`, `ServerInstance`                                                                                    |
| `wnodex.ts`    | `Wnodex` class and option normalization                                                                                            |
| `server/`      | `shutdown.ts` graceful shutdown; barrel `index.ts`                                                                                 |
| `config/`      | `env.ts` config resolution, `parsers.ts` pure parsers                                                                              |
| `constants/`   | Default values and `LOG_LEVELS`                                                                                                    |
| `errors/`      | `base-error`, `http-error`, `config-error`, `validation-error`, `error-codes`                                                      |
| `health/`      | MVC split: `health.model`, `health.controller`, `health.routes`, `health.types`, `database.plugin`, `system-metrics`, `formatters` |
| `logger/`      | Pino logger factory                                                                                                                |
| `middlewares/` | One file per middleware plus `security.ts` barrel                                                                                  |

The `health` module follows a deliberate MVC split. Keep model, view (routes), and controller responsibilities separate when extending it.

## Code Conventions

These conventions are consistent throughout the codebase. Match them.

1. **ESM only.** The package sets `"type": "module"`. Use `import`/`export` and `.js` extensions in relative specifiers, even though the files are `.ts`.
2. **JSDoc on every exported symbol.** The style is a short summary, an `@param` per parameter, and `@returns`. The `@file` header at the top of each file names the module, for example `@file Graceful shutdown coordinator.` / `@module server/shutdown`.
3. **Factory plus default-instance pattern.** Export a `createXMiddleware(options?)` factory and a `xMiddleware` default instance. Same for routers and models.
4. **Read configuration, never `process.env`.** Import the resolved `config` from `config/env.js` or accept a `ServerConfig` through options. The one exception is `config/env.ts` itself.
5. **Read defaults from `constants/index.ts`.** Do not hardcode `3000`, `'1mb'`, or `10000`; import the `DEFAULT_*` constant.
6. **Auto-enable from options.** When a middleware's options object is supplied, enable it without requiring the explicit `enableX` flag, and let `enableX: false` win.
7. **Strict TypeScript.** `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` are on. Prefix intentionally unused parameters with `_`, for example `_req`, `_next`.
8. **Typed errors.** Throw `HttpError`, `ConfigError`, or `ValidationError`, not bare `Error`, for conditions callers should distinguish.
9. **No `any`.** Prefer precise types, generics, or `unknown` with narrowing.
10. **Keep comments about why, not what.** Comment a non-obvious invariant or workaround, not the mechanics of the next line.

## Environment Setup

The repository pins `pnpm@12.14.0` through `packageManager` and requires Node 24 or newer.

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
```

If `corepack enable` cannot write to the global bin directory, invoke pnpm through corepack instead: `corepack pnpm <command>`.

## Verification Commands

Run the full gate before considering a change complete.

| Command                | Purpose                                                |
| :--------------------- | :----------------------------------------------------- |
| `pnpm run check-types` | `tsc --noEmit` across packages via turbo               |
| `pnpm run lint`        | ESLint with `--fix`                                    |
| `pnpm run lint:check`  | ESLint without writing                                 |
| `pnpm run fmt`         | Prettier write                                         |
| `pnpm run fmt:check`   | Prettier check                                         |
| `pnpm run spellcheck`  | CSpell                                                 |
| `pnpm run test`        | Vitest via turbo                                       |
| `pnpm run check`       | Types, lint, fmt, and spellcheck together              |
| `pnpm run check:ci`    | The check variant with `:check` (non-writing) commands |

Package-scoped runs work when turbo is unavailable or a single package is being iterated:

```bash
cd packages/wnodex
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm exec vitest run tests/health.test.ts
```

Turbo shells out to the package manager for task execution. If it reports `Unable to find package manager binary`, expose pnpm on `PATH` (or use `corepack pnpm run <task>`) and retry.

## Testing

Tests live in `packages/wnodex/tests/` and run under Vitest with `globals: true`, `environment: 'node'`, and the include pattern `tests/**/*.test.ts`. Coverage uses the V8 provider with `text`, `json`, and `html` reporters.

| File                  | Covers                                                            |
| :-------------------- | :---------------------------------------------------------------- |
| `app-server.test.ts`  | `createApp`, `startServer`, `createServer`, post-creation routing |
| `config.test.ts`      | Env parsers and `loadConfig` precedence                           |
| `errors.test.ts`      | Error hierarchy and `toJSON` serialization                        |
| `health.test.ts`      | Formatters, metrics, plugins, health endpoints                    |
| `logger.test.ts`      | Logger construction across environments                           |
| `middlewares.test.ts` | Every middleware factory and default instance                     |
| `wnodex.test.ts`      | `Wnodex` class lifecycle                                          |

Guidelines for new tests:

1. Import from `../src/index.js`, matching the package's public surface.
2. Use `supertest` against the `app` directly rather than starting a listener, except when testing `startServer` or the `Wnodex` class.
3. Pass `createLogger({ level: 'silent' })` so tests do not emit logs.
4. Use `loadConfig({ port: 0 })` for anything that binds a port, and always close the server (`closeServerGracefully`) in the same test.
5. Do not mock the framework internals. Exercise real code paths; the existing suites demonstrate this.

## Adding a Feature

1. Decide which module owns the behaviour, following the module map above.
2. Add the implementation with JSDoc, importing defaults from `constants` and configuration from `config`.
3. Export the new symbol from the module barrel, and from the root `index.ts` if it belongs in the public surface.
4. Add the corresponding entry to `package.json` `exports` only when introducing a new subpath.
5. Update `README.md` when the change is user-facing.
6. Add tests covering the new behaviour and the failure path.
7. Run `pnpm run check` and `pnpm run test`.

## Spellcheck

CSpell imports `cspell-config-spellbookx` and adds project words from `.config/cspell/custom.txt`. When a legitimate term is flagged, append it to that file in lowercase rather than adding an inline ignore. Current project words include `wnodex`, `spellbookx`, `dropdx`, `dcdavidev`, and `releaserc`.

## Git Hooks

Lefthook runs on commit:

- **pre-commit**, in parallel: ESLint `--fix` then Prettier `--write` on staged files, restaging fixed files.
- **commit-msg**: commitlint against `commitlint-config-spellbookx`.

Commit messages must follow Conventional Commits. Use `pnpm run commit` for the `cz-git` interactive prompt, or write messages like `feat(wnodex): add request-id middleware` and `fix(health): handle plugin rejection`.

## Release Workflow

Releases use `@dcdavidev/dropdx`, configured by `.config/dropdx.config.json` with Conventional Commits, `engine: auto`, and build, git, and publish all enabled.

| Command                  | Effect                                                     |
| :----------------------- | :--------------------------------------------------------- |
| `pnpm run release:dry`   | Simulate the release without side effects                  |
| `pnpm run release`       | Auto-detect the bump from Conventional Commits and release |
| `pnpm run release:patch` | Force a patch bump                                         |
| `pnpm run release:minor` | Force a minor bump                                         |
| `pnpm run release:major` | Force a major bump                                         |

Always run `pnpm run release:dry` first. The release bumps `packages/wnodex/package.json`, regenerates `CHANGELOG.md`, builds, commits, tags, and publishes. Note that `release:dry` reports `dropdx` output; a version bump alone appears in the changelog as `Release version bump`.

## Verification Checklist

1. `pnpm run check` passes with no ESLint, Prettier, or CSpell findings.
2. `pnpm run test` passes; new behaviour has new tests.
3. New exports are reachable from the intended subpath and from the root.
4. `README.md` reflects any user-facing change.
5. Commit messages follow Conventional Commits so the changelog and version bump are correct.
6. For a release, `pnpm run release:dry` reports the expected next version.

## Additional Resources

### Reference Files

- **`references/architecture.md`** — module dependency graph, the `createApp` middleware pipeline in order, and the exact export surfaces of each subpath.

### Related Skills

- **`wnodex`** — using the package: API, configuration, logging, errors, lifecycle.
- **`wnodex-middlewares`** — middleware options, defaults, and ordering.
- **`wnodex-health-checks`** — health endpoints and plugin authoring.
- **`spellbookx-setup`**, **`spellbookx-eslint`**, **`spellbookx-prettier`**, **`spellbookx-cspell`**, **`spellbookx-commitlint`** — toolchain detail.
- **`dropdx`** — release engine detail.
