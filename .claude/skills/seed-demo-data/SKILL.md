---
name: seed-demo-data
description: Change or extend the fictional demo data used by the mock Supabase server (ingredients, dishes, meals, calendar entries) for screenshots and demos. Use when the demo UI needs different or more realistic content.
---

# Seed demo data

All demo data lives in `scripts/demo/mock-supabase.mjs`; it is generated in memory at startup, with dates relative to today.

- **Ingredients:** the `ingredients` array of `[name, category]`.
- **Dishes:** call `mk(name, description, ingredientNames, isVeg, emoji, color1, color2, prepMinutes, prepNotes?)`. Ingredient names must exist in `ingredients`. `prepNotes` feeds the "Prepare for Tomorrow's Meals" banner. Images are generated SVG data URIs (no network).
- **Meals:** call `meal(name, description, dishNames, 'breakfast'|'lunch'|'dinner'|'any', isVeg)`. Dish names must exist.
- **Calendar:** the loop over `k` (days from today) assigns meals; `k % 5 === 3` leaves gaps so "+ Add" slots show.

Keep data fictional. Restart the mock server after editing. To load the same data into a real Supabase project, use the SQL inserts at the bottom of `supabase-schema.sql` instead.
