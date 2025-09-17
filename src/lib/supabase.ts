import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if environment variables are available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Database types
export interface Ingredient {
  id: string
  name: string
  category: string
  created_at: string
  updated_at: string
}

export interface Meal {
  id: string
  name: string
  type: 'breakfast' | 'lunch' | 'dinner'
  ingredients: string[]
  created_at: string
  updated_at: string
}

export interface CalendarDay {
  id: string
  date: string
  breakfast?: string
  lunch?: string
  dinner?: string
  created_at: string
  updated_at: string
}
