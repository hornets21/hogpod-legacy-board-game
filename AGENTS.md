# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js App Router project for a 3D board game. The main page and game reducer live in `app/page.jsx`. Reusable UI components are in `components/`, with board-specific 3D scene code under `components/board3d/`. Shared game rules and board coordinates belong in `lib/`. Static assets, including 3D models, are served from `public/` (for example, `public/models/dice.glb`). Design notes and project documentation are in `docs/`. There is currently no dedicated test directory.

## Build, Test, and Development Commands

- `npm run dev` — start the local development server on port `3005`.
- `npm run build` — compile, lint, type-check, and prerender the production app.
- `npm run start` — serve the most recent production build.

There is no test script or testing framework configured yet. Run `npm run build` before handing off changes. If `.next/trace` is locked, stop the running Next.js process and retry the build.

## Coding Style & Naming Conventions

Use four-space indentation only where the surrounding file does; otherwise preserve the existing two-space JSX/JavaScript style. Use semicolons, double-quoted strings, and functional React components. Name components in PascalCase (`PlayerTokens`), functions and variables in camelCase (`handleRoll`), and constants in UPPER_SNAKE_CASE (`WALK_SPEED`). Keep client-only modules marked with `"use client"`. Preserve existing Tailwind utility conventions and avoid broad, unrelated formatting changes.

## Testing Guidelines

No automated tests or coverage thresholds are configured. Manually verify the main game flow in the browser: setup, dice roll, token movement, combat/traps, turn ending, and reset behavior. For 3D changes, check that models load, movement visibly animates, and low-performance rendering remains usable.

## Commit & Pull Request Guidelines

Recent commits use concise imperative descriptions, often scoped to the feature (for example, `Enhance DiceModel with fallback primitive rendering`). Follow that style and keep each commit focused. Pull requests should explain the gameplay or UI impact, list verification commands, link related issues when applicable, and include screenshots or a short recording for visible 3D/UI changes.

## Architecture & Change Safety

Keep game-state transitions in the reducer and keep rendering/animation concerns in their board components. Maintain synchronization between the rolled value, `BoardCanvas`, and token animation. Do not replace existing uncommitted work without inspecting the diff first, and keep binary assets referenced by their stable paths under `public/`.
