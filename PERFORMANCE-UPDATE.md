# Attendly performance update (phase 1)

This source update focuses on navigation smoothness and avoiding duplicate session work without changing database schemas or weakening authentication.

## Changes
- Removed the empty root `app/template.tsx`. A Next.js template intentionally remounts its subtree on navigation; this file had no useful behavior.
- Added persistent `app/admin/layout.tsx`, `app/teacher/layout.tsx`, and `app/student/layout.tsx` layouts so the dashboard shell/sidebar remains mounted while navigating between role pages.
- Moved the per-page `DashboardShell` wrappers into those shared layouts.
- Added role-level `loading.tsx` boundaries and a reusable skeleton, so loading content appears inside the persistent dashboard shell.
- Wrapped the per-request session lookup in React `cache()` so layout and page role checks share one session lookup during the same server render. This does not cache sessions across requests and does not weaken role checks.

## Important limitation
This is a navigation/shell improvement, not a claim that every server response is now fast. Pages still query Neon and render their own server-side data. The observed 410–493 ms attendance query and occasional 1,567 ms session lookup need to be re-measured after this change. The next performance pass should optimize the dashboard's unbounded historical attendance query and verify that Vercel Functions run near the Neon database region.

## Validation
All 96 TypeScript/TSX source files were syntax-transpiled without syntax errors. A full Next.js production build was not run in this environment because project dependencies were not installed here.
