# Repository Guidelines

## Project Structure & Module Organization
- `src/` TypeScript React app. Key folders: `components/` (UI + admin), `pages/` (routes), `services/` (API/Supabase, caching, realtime), `hooks/`, `types/`, `utils/`, `styles/`.
- `public/` static assets; `dist/` build output (do not edit).
- `supabase/` SQL schemas and edge functions (e.g., `functions/send-email/`).
- `scripts/` local utilities (`clean-logs.js`, `find-unused.js`).
- Deployment config: `vercel.json`. Docs: `.md_hub/`.

## Build, Test, and Development Commands
- `npm install` Install dependencies.
- `npm run dev` Start Vite dev server at `http://localhost:5173`.
- `npm run build` Production build to `dist/`.
- `npm run preview` Serve the production build locally.
- `npm run lint` ESLint on `ts/tsx` with zero warnings allowed.
- `npm run analyze:deps` Check unused/missing deps; `npm run analyze:unused` find unused files.
- `npm run build:analyze` Build and open bundle stats; `npm run clean:logs` remove noisy logs.

## Coding Style & Naming Conventions
- Language: TypeScript + React (functional components). Indent 2 spaces.
- Styling: Tailwind utility-first; shared rules in `src/styles/design-system.css`.
- Naming: Components `PascalCase` in `src/components/*.tsx`; hooks `useXxx`; services `camelCase` functions in `src/services/*.ts`.
- Imports: prefer named exports; colocate small helpers with feature, otherwise use `utils/`.
- Linting: keep `npm run lint` clean before commits.

## Testing Guidelines
- No unit test framework is configured yet. Validate changes by:
  - Running `npm run dev` and exercising key routes (login, dashboard, workshops, admin pages).
  - Building with `npm run build` and sanity-checking via `npm run preview`.
  - Watching the console for runtime errors and typecheck warnings.

## Commit & Pull Request Guidelines
- Commit style observed: `feat:`, `fix:`, `UI:`, `UX:`. Prefer Conventional Commits (`feat/fix/chore/docs/refactor:`) with concise scope.
- PRs should include: clear description, linked issue, screenshots/GIFs for UI changes, and notes on env/config.
- Before opening a PR: run `lint`, `build`, and test both dev and preview locally.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local` with Vite vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (and service role only in server-side contexts).
- Review Supabase migrations under `supabase/` and keep app code in sync with schema changes.

