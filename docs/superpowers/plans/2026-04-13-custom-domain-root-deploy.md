# Custom Domain Root Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `https://118.fishknowsss.com/` the canonical production entry instead of the old `/118-Studio-Manager/vc/` path.

**Architecture:** Keep the app UI unchanged and only adjust build/deploy path handling. Update the regression tests first so the deployment contract reflects the custom-domain root path, then change Vite and the GitHub Pages workflow to publish the VC build at `/`.

**Tech Stack:** Vite, React, GitHub Pages, GitHub Actions, Vitest

---

### Task 1: Lock the deployment contract with tests

**Files:**
- Modify: `tests/current-app-regressions.test.tsx`

- [ ] Update the workflow regression to assert the root entry points at `/` for the VC deploy instead of `/118-Studio-Manager/vc/`.
- [ ] Run the targeted Vitest case and confirm it fails against the current workflow.

### Task 2: Switch the build and deployment to the custom-domain root

**Files:**
- Modify: `vite.config.ts`
- Modify: `.github/workflows/deploy.yml`
- Modify: `README.md`

- [ ] Change the Vite production fallback base from `/118-Studio-Manager/vc/` to `/`.
- [ ] Update the GitHub Pages workflow so the `vc` branch publishes the built app at the site root and the generated root `index.html` no longer redirects to the old repo subpath.
- [ ] Refresh README deployment notes so they describe `118.fishknowsss.com` as the canonical VC entry.

### Task 3: Verify the new deployment contract

**Files:**
- Verify: `tests/current-app-regressions.test.tsx`
- Verify: `.github/workflows/deploy.yml`
- Verify: `vite.config.ts`

- [ ] Run the targeted regression test and confirm it passes.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
