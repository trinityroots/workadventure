# CLAUDE.md - WorkAdventure Monorepo

WorkAdventure is a TypeScript monorepo (npm workspaces) for building collaborative virtual worlds.

## Instruction scope

- The closest `CLAUDE.md` to a changed file takes precedence.
- Directories without their own `CLAUDE.md` inherit this file and the shared guides below.
- Package scripts and `.github/workflows/continuous_integration.yml` are the source of truth when a documented command drifts.
- Run package scripts from that package's directory unless the command explicitly uses `--workspace`.

## Main projects

- `play/CLAUDE.md`: Svelte/Phaser frontend, pusher, and Room API server.
- `back/CLAUDE.md`: backend API.
- `map-storage/CLAUDE.md`: map storage backend.
- `messages/CLAUDE.md`: protobuf sources and generated TypeScript.
- `libs/CLAUDE.md`: shared `@workadventure/*` libraries.
- `tests/CLAUDE.md`: Playwright end-to-end tests.

## Shared guidance

- `docs/agent/dev-setup.md`
- `docs/agent/lint-format.md`
- `docs/agent/testing-vitest.md`
- `docs/agent/typescript-style.md`
- `docs/agent/error-handling.md`
- `docs/agent/svelte.md`
- `docs/agent/i18n.md`
- `docs/agent/common-issues.md`
- `docs/agent/devtools.md`
