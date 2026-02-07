import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if environment variables are available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Database types

// Basic ingredients: vegetables, pulses, flour, etc.
export interface Ingredient {
  id: string
  name: string
  category: string
  created_at: string
  updated_at: string
}

// Meal items: individual dishes made from ingredients
// e.g., Vegetable Curry, Chapati, Fried Noodles
export interface MealItem {
  id: string
  name: string
  description?: string
  ingredients: string[]  // Array of ingredient IDs
  is_veg: boolean
  image?: string
  prep_time_minutes?: number
  prep_notes?: string  // Notes for meal preparation (shown as reminder)
  created_at: string
  updated_at: string
}

// Meals: combination of meal items for a complete meal
// e.g., Chapati + Vegetable Curry
export interface Meal {
  id: string
  name: string
  description?: string
  meal_items: string[]  // Array of meal_item IDs
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'any'
  is_veg: boolean
  image?: string
  created_at: string
  updated_at: string
}

// Calendar days: schedule meals for breakfast, lunch, dinner
export interface CalendarDay {
  id: string
  date: string
  breakfast?: string
  lunch?: string
  dinner?: string
  created_at: string
  updated_at: string
}

// Extended types with resolved references (for UI display)
export interface MealItemWithIngredients extends MealItem {
  ingredientDetails?: Ingredient[]
}

export interface MealWithItems extends Meal {
  mealItemDetails?: MealItem[]
}

export interface CalendarDayWithMeals extends CalendarDay {
  breakfast_meal?: Meal
  lunch_meal?: Meal
  dinner_meal?: Meal
}
