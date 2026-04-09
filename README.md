# 118 Studio Manager

A lightweight studio operations dashboard built with React, TypeScript, Vite, Tailwind CSS, and Dexie.

## Features

- Project, task, and people management
- Daily planner for task assignment
- Calendar view for deadlines and milestones
- Local IndexedDB persistence with JSON backup and restore
- CSV export for projects, tasks, and daily plans
- GitHub Pages deployment via GitHub Actions

## Local Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` in your browser.

## Quality Checks

```bash
npm run lint
npm run build
```

## Deployment

This repository is configured for GitHub Pages. After the repository is pushed to GitHub:

1. Open the repository Settings page.
2. Go to `Pages`.
3. Set the source to `GitHub Actions`.
4. Push to `main` to trigger deployment.

The production build uses a GitHub Pages base path and hash routing so deep links continue to work after deployment.
