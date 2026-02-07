# Supabase Setup Guide

## Database Architecture

The app uses a 4-table architecture:

### 1. Ingredients
Basic items like vegetables, pulses, flour, etc.
- Examples: Wheat Flour, Rice, Potato, Tomato, Chickpeas, Paneer

### 2. Meal Items
Individual dishes made from ingredients.
- Examples: Chapati, Vegetable Curry, Dal Tadka, Fried Noodles, Scrambled Eggs

### 3. Meals
Combination of meal items for a complete meal.
- Examples: 
  - "Chapati with Dal" = Chapati + Dal Tadka
  - "Rice with Rajma" = Steamed Rice + Rajma
  - "Paneer Thali" = Chapati + Paneer Butter Masala + Raita

### 4. Calendar Days
Schedule meals for breakfast, lunch, dinner on specific dates.

## Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 2. Run the Schema

1. Go to SQL Editor in Supabase dashboard
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the SQL to create tables and sample data

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the App

```bash
pnpm dev
```

## Data Flow

```
Ingredients → Meal Items → Meals → Calendar Days
     ↑              ↑           ↑
   (basic       (recipes/    (complete     (scheduled
   items)       dishes)       meals)       for dates)
```

## Example Usage

1. **Add Ingredients**: Add basic items like "Wheat Flour", "Dal", "Rice"
2. **Create Meal Items**: Create dishes like "Chapati" (uses Wheat Flour), "Dal Tadka" (uses Dal, Onion, etc.)
3. **Create Meals**: Combine meal items: "Dal Chawal" = "Steamed Rice" + "Dal Tadka"
4. **Schedule**: Add "Dal Chawal" to your calendar for lunch on Monday

## API Structure

- `ingredientService` - CRUD for ingredients
- `mealItemService` - CRUD for meal items
- `mealService` - CRUD for meals
- `calendarService` - Calendar scheduling
