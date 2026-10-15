---
name: run-locally
description: Start the Meal Planner app locally, either against a real Supabase project or against the bundled mock server with demo data and no credentials. Use when asked to run, preview, or screenshot the app.
---

# Run locally

1. `pnpm install`
2. Pick a data source:
   - **Demo (no credentials):**
     ```bash
     node scripts/demo/mock-supabase.mjs &        # :54321, in-memory fictional data
     NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
     NEXT_PUBLIC_SUPABASE_ANON_KEY=demo pnpm dev
     ```
   - **Real Supabase:** run `supabase-schema.sql` in the SQL editor, copy `.env.example` to `.env.local`, fill in the URL and anon key, then `pnpm dev`.
3. Open http://localhost:3000. Pages: `/` calendar, `/meals`, `/meal-items`, `/meals/<id>`.
4. Type-check with `pnpm exec tsc --noEmit` (`pnpm lint` is currently broken, see CLAUDE.md).

The mock server resets on restart. Never commit `.env.local`.
