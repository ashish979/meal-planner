# CLAUDE.md

## Overview
Meal Planner: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Supabase. Plan breakfast/lunch/dinner on a day/week/month calendar, compose meals from dishes and ingredients, get prep reminders. See `docs/ARCHITECTURE.md`.

## Commands
- `pnpm install` - install (pnpm only; lockfile is `pnpm-lock.yaml`)
- `pnpm dev` - dev server on :3000 (Turbopack)
- `pnpm build` / `pnpm start` - production build / serve
- `pnpm lint` - currently fails with an ESLint flat-config circular-structure error (`eslint.config.mjs` FlatCompat + next config); pre-existing, use `pnpm exec tsc --noEmit` for type checks
- Demo without Supabase: `node scripts/demo/mock-supabase.mjs` then `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=demo pnpm dev`

## Layout
- `src/app/page.tsx` - calendar (largest file; day/week/month views, drag & drop, picker modal, reminders, auto-suggest)
- `src/app/meals/`, `src/app/meals/[id]/`, `src/app/meal-items/` - CRUD and detail pages
- `src/lib/supabase.ts` - client (null when env vars missing) and TypeScript types
- `src/lib/database.ts` - all queries: `ingredientService`, `mealItemService`, `mealService`, `calendarService`
- `src/components/` - Sidebar (desktop), BottomNav (mobile), AppBar
- `supabase-schema.sql` - schema + sample data (DROPs tables first)
- `scripts/demo/` - mock Supabase server; `docs/media/` - screenshots and GIF

## Conventions
- Pages are client components using local `useState` + `useCallback` loaders; no global state library.
- All DB access goes through `src/lib/database.ts`; do not call `supabase` from components.
- Style with Tailwind and the CSS variables in `globals.css` (`--primary`, `--surface`, ...). Light theme only.
- Meal types: `breakfast | lunch | dinner | any`. Dates are `YYYY-MM-DD` strings.

## Gotchas
- Never commit `.env*` (only `.env.example`). Needs `NEXT_PUBLIC_SUPABASE_*` env vars.
- Dates use `toISOString().split('T')[0]` (UTC) in places, so "today"/"tomorrow" can be off by a day near midnight in non-UTC timezones.
- `calendar_days.date` is UNIQUE; `calendarService.updateMeal` does select-then-update/insert (not atomic).
- `ingredients`/`meal_items` arrays on meals are JSON id arrays with no FK integrity: deleting a dish leaves dangling ids.
- No auth or RLS: anon key has full access.
- Calendar week table has a `min-w-[120px]` column per day; the content wrapper needs `min-w-0` or the page overflows horizontally.
