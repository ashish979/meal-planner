# Meal Planner

**Plan the week's breakfast, lunch and dinner on a calendar, build meals from reusable dishes, and get reminded what to prep tonight.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?logo=supabase&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![Weekly calendar view](docs/media/01-calendar-week.png)

![Walkthrough](docs/media/walkthrough.gif)

## Why I built this

Deciding "what's for dinner" every day, and remembering to soak the beans the night before, is a daily chore. I wanted one place to compose meals from dishes I already cook, drop them on a calendar, and be nudged about prep steps the day before.

## Features

- **Day / week / month calendar** with breakfast, lunch and dinner slots; drag and drop meals between slots
- **Auto-suggest:** fill every empty slot with a random meal of the matching type
- **Prep reminders:** per-dish notes ("Soak kidney beans overnight") surface in a banner for tomorrow's meals
- **Three-level library:** ingredients, then dishes (meal items), then meals (combinations of dishes)
- **Search, filter and sort** in the meal picker and library pages; veg / non-veg indicators; grid and list views
- **Meal detail page** with ingredients, prep times and notes
- **Responsive:** sidebar on desktop, bottom navigation on mobile
- **Runs without credentials** via a bundled mock Supabase server with demo data

## Screenshots

| | |
|---|---|
| ![Month view](docs/media/02-calendar-month.png)<br>Month view | ![Meal picker](docs/media/03-assign-meal-modal.png)<br>Assigning a meal |
| ![Meals](docs/media/04-meals-list.png)<br>Meals library | ![Meal items](docs/media/05-meal-items.png)<br>Dishes library |
| ![Meal detail](docs/media/06-meal-detail.png)<br>Meal detail with prep notes | <img src="docs/media/07-mobile-calendar.png" width="220"><br>Mobile |

## Architecture

```mermaid
flowchart LR
  UI["Next.js pages (client components)\ncalendar · meals · meal items"] --> SVC["lib/database.ts\nservices"]
  SVC --> SB[("Supabase Postgres\ningredients · meal_items · meals · calendar_days")]
```

Details, ER and sequence diagrams: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (`@supabase/supabase-js`) · pnpm

## Quick start

```bash
pnpm install
```

**Zero-setup demo (no accounts, no env vars):**

```bash
pnpm demo
```

This starts a mock Supabase server with fictional data (`scripts/demo/mock-supabase.mjs`) together with the dev server. Data is in memory and resets on restart.

**With your own Supabase project:** run [`supabase-schema.sql`](supabase-schema.sql) in the SQL editor, copy `.env.example` to `.env.local`, fill in the values, then `pnpm dev`. More in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

Open http://localhost:3000.

## Configuration

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon (public) key |

## Deployment

Deploy to Vercel (or any Node host): set the two variables above, `pnpm build`, `pnpm start`. The app has no authentication; enable Supabase Auth and row-level security before exposing it publicly.

## Project structure

```
src/app/            pages: calendar (/), /meals, /meals/[id], /meal-items
src/components/     Sidebar, BottomNav, AppBar
src/lib/            supabase client + types, database service layer
supabase-schema.sql schema and sample data
scripts/demo/       mock Supabase server with fictional data
docs/               architecture notes and media
```

## Roadmap

- Authentication and per-user data with row-level security
- Shopping list generated from the week's ingredients
- Timezone-safe date handling
- Tests and a working lint setup
- Drag to reorder and copy a week

## Author

Ashish Agrawal · [github.com/ashish979](https://github.com/ashish979)

Released under the [MIT License](LICENSE).
