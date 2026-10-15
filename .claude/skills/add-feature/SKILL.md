---
name: add-feature
description: Add a new field, entity, or page to Meal Planner following the repo's patterns (schema, types, service, page, mock server). Use when extending the data model or UI.
---

# Add a feature the repo's way

1. **Schema:** edit `supabase-schema.sql` (table/column, index, `updated_at` trigger). For existing deployments also give the user an `ALTER TABLE` snippet; the schema file drops tables.
2. **Types:** add/extend the interface in `src/lib/supabase.ts`.
3. **Service:** add methods to the matching service in `src/lib/database.ts` (`isSupabaseConfigured()` first, `if (error) throw error`, treat `PGRST116` as "not found" for `.single()`).
4. **UI:** load via the service in a `useCallback` loader in the page; keep pages as client components; style with Tailwind + CSS variables from `globals.css`; make sure it works at 390px (BottomNav) and 1440px.
5. **Mock server:** if the feature adds a column, add it to the seed data in `scripts/demo/mock-supabase.mjs`; new tables need an entry in `tables`. The mock supports `eq/gte/lte/order`, insert, upsert, patch, delete, and the calendar meal embeds only.
6. **Verify:** `pnpm exec tsc --noEmit`, run the app against the mock server, exercise the flow in a browser.
7. **Docs:** update `docs/ARCHITECTURE.md` (ER diagram) and `CLAUDE.md` if the model or conventions changed.
