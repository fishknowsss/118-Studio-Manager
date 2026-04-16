# 118 Studio Manager VC

A local-first studio operations app for small media and design teams, built around daily focus, reusable materials, and low-friction backup workflows.

All working data stays in the browser's IndexedDB. Cloud sync is optional and can be self-hosted with Cloudflare Workers.

---

## Overview

The current VC build centers the product around five working views:

- **Home** for daily focus, assignments, and deadlines
- **Materials** for client briefs and shared account folders
- **Graph** for project-task-people relationships
- **Tools** for reusable external references and production utilities
- **Settings** for backup, restore, sync, and operational logs

It is designed for a studio workflow where planning, handoff, and asset access happen in one place without depending on a traditional backend.

---

## Interface Preview

### Home

| Light | Dark |
|---|---|
| ![Home Light](docs/screenshots/vc-dashboard-light.png) | ![Home Dark](docs/screenshots/vc-dashboard-dark.png) |

### Materials

| Light | Dark |
|---|---|
| ![Materials Light](docs/screenshots/vc-materials-light.png) | ![Materials Dark](docs/screenshots/vc-materials-dark.png) |

### Graph

| Light | Dark |
|---|---|
| ![Graph Light](docs/screenshots/vc-graph-light.png) | ![Graph Dark](docs/screenshots/vc-graph-dark.png) |

### Tools

| Light | Dark |
|---|---|
| ![Tools Light](docs/screenshots/vc-tools-light.png) | ![Tools Dark](docs/screenshots/vc-tools-dark.png) |

### Settings

| Light | Dark |
|---|---|
| ![Settings Light](docs/screenshots/vc-settings-light.png) | ![Settings Dark](docs/screenshots/vc-settings-dark.png) |

---

## What's New In This Iteration

- The product is now organized around five primary views instead of the older project/task/people/calendar split.
- The **Materials** workspace now combines client briefs with **folder-based shared account management**, including folder creation, rename, delete, and account move actions.
- The **Home** view has been refined into a true daily operations surface with drag-and-drop task assignment, paged people cards, richer focus cards, and leave tracking.
- The **Graph** view supports multiple layout modes, scoped relationship filters, node search, and focused detail inspection.
- The **Settings** view now covers export/import, cloud restore, manual sync, transfer summaries, and undo-aware recent operation history.

---

## Key Capabilities

### Home

- Prioritized project focus cards with urgency-aware deadline treatment
- A task pool that supports quick actions, contextual edits, and drag-to-assign flows
- A people assignment panel with task counts, skill tags, leave indicators, and page-based navigation
- A mini calendar that surfaces deadlines and leave markers
- Quick jump search across projects, tasks, and people

### Materials

- Client briefs with linked projects, requirements, style notes, prohibitions, and reference links
- Folder-based account storage for team credentials and shared platform access
- Inline account copy actions and folder-to-folder move actions
- Empty-folder support, searchable folder/account lists, and lightweight organization without nested dashboards

### Graph

- Relationship graph built from projects, tasks, and people
- Toggleable scopes for full graph, project-task edges, or task-person edges
- Force, radial, and lane layouts
- Search-driven focus, node selection, zoom/pan, and detail side panel

### Tools

- Curated inspiration links for motion, video, sound, and visual research
- Common web utilities for color, compression, animation, panorama, conversion, and asset processing
- Lightweight launch surface for external tools frequently used in studio production

### Settings

- JSON export/import for full local backup and restore
- CSV export for project and task lists
- Optional Cloudflare-based cloud sync with manual push and remote restore
- Local data summary, transfer summary, and recent operation history
- Full wipe flow with confirmation for destructive actions

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Plain CSS + CSS variables |
| Local persistence | IndexedDB (`studio118db`) |
| Optional sync | Cloudflare Worker + KV |
| Testing | Vitest + jsdom |
| Linting | ESLint |
| Deployment | Static hosting (GitHub Pages, Cloudflare Pages, Vercel, self-hosted) |

---

## Architecture

The app uses a React interface on top of a legacy-style data layer that still provides the single source of truth for persisted entities and derived selectors.

```text
src/
├── App.tsx                     # App shell, theme toggle, view routing
├── views/                      # Top-level views (Home, Materials, Graph, Tools, Settings)
├── features/                   # Domain-specific UI and state helpers
├── components/                 # Shared UI primitives and feedback components
├── content/                    # Static content such as quotes
└── legacy/
    ├── store.ts                # In-memory entity store + subscriptions
    ├── actions.ts              # State mutations and import/export helpers
    ├── selectors.ts            # Derived models for views
    ├── db.ts                   # IndexedDB open/read/write/import/export
    └── utils.ts                # Shared date, backup, and formatting helpers
```

### Architectural notes

- React renders the UI, but entity persistence still flows through the legacy store and IndexedDB helpers.
- Derived view models are centralized in `src/legacy/selectors.ts`.
- Syncable view data such as materials briefs, account records, and account folders lives in the `settings` store through `createSyncableSettingsStore`.
- On first boot with an empty database, the app tries cloud restore first and falls back to seeded demo data.
- Older hash routes are still aliased so historical links continue to resolve into the current five-view structure.

---

## Data And Sync

All persistent data is stored in IndexedDB under `studio118db`.

| Store | Purpose |
|---|---|
| `projects` | Project records, priority, status, deadline, description |
| `tasks` | Task records, assignees, schedule, status, estimate |
| `people` | Team members, skills, status, notes |
| `logs` | Recent operations and activity traces |
| `settings` | Syncable view state such as briefs, account folders, account records, and other keyed settings |
| `leaveRecords` | Per-person leave dates used by the Home view and planner |

### Backup model

Every store registered in `BACKUP_COLLECTION_NAMES` is included in:

- `db.exportAll()`
- `db.importAll()`
- `db.clearAll()`
- Cloud sync payloads

Current backup schema:

```jsonc
{
  "schemaVersion": 3,
  "exportedAt": "2026-04-16T12:00:00.000Z",
  "projects": [],
  "tasks": [],
  "people": [],
  "logs": [],
  "settings": [],
  "leaveRecords": []
}
```

### Optional cloud sync

Cloud sync is not required for the app to work. When configured, it adds:

- debounced auto-sync after local edits
- manual sync plus local JSON download
- remote metadata polling
- cloud-to-local restore for the latest snapshot

The worker exposes:

- `GET /meta`
- `GET /data`
- `PUT /data`

See [cloudflare/sync-worker/](cloudflare/sync-worker/) for the worker setup.

---

## Getting Started

### Requirements

- Node.js `24.14.1`
- npm `11.11.0`

Both are pinned in `package.json` via Volta.

### Install and run

```bash
npm install
npm run dev
```

Default local server:

```text
http://127.0.0.1:5173/
```

One-click launchers:

```bash
./118-start.command
```

```cmd
118-start.cmd
```

---

## Build And Test

```bash
npm run lint
npm run test
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Tests live in `tests/` and cover selectors, sync behavior, materials state migration, dashboard panels, theme regressions, and current React app regressions.

---

## Deployment

This is a static Vite app and can be deployed anywhere that serves static assets.

If you need to build for a subdirectory:

```bash
DEPLOY_BASE=/studio/ npm run build
```

To enable optional cloud sync in deployment, provide:

```bash
VITE_SYNC_API_URL=https://your-worker.example.com
```

For GitHub Pages, add `VITE_SYNC_API_URL` as a GitHub Actions variable if sync should be enabled in the deployed build.
