import { supabase, type Ingredient, type Meal, type CalendarDay } from './supabase'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
  }
  return true
}

// Ingredients operations
export const ingredientService = {
  // Get all ingredients
  async getAll(): Promise<Ingredient[]> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('ingredients')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data || []
  },

  // Add new ingredient
  async create(name: string, category: string): Promise<Ingredient> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('ingredients')
      .insert([{ name, category }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete ingredient
  async delete(id: string): Promise<void> {
    isSupabaseConfigured()
    const { error } = await supabase!
      .from('ingredients')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Update ingredient
  async update(id: string, name: string, category: string): Promise<Ingredient> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('ingredients')
      .update({ name, category })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Meals operations
export const mealService = {
  // Get all meals
  async getAll(): Promise<Meal[]> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meals')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data || []
  },

  // Get meals by type
  async getByType(type: 'breakfast' | 'lunch' | 'dinner'): Promise<Meal[]> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meals')
      .select('*')
      .eq('type', type)
      .order('name')
    
    if (error) throw error
    return data || []
  },

  // Add new meal
  async create(name: string, type: 'breakfast' | 'lunch' | 'dinner', ingredients: string[], isVeg: boolean = true, image?: string): Promise<Meal> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meals')
      .insert([{ name, type, ingredients, is_veg: isVeg, image }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete meal
  async delete(id: string): Promise<void> {
    isSupabaseConfigured()
    const { error } = await supabase!
      .from('meals')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Update meal
  async update(id: string, name: string, type: 'breakfast' | 'lunch' | 'dinner', ingredients: string[]): Promise<Meal> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meals')
      .update({ name, type, ingredients })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Calendar operations
export const calendarService = {
  // Get calendar for a specific week
  async getWeek(startDate: string, endDate: string): Promise<CalendarDay[]> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('calendar_days')
      .select(`
        *,
        breakfast_meal:meals!calendar_days_breakfast_fkey(*),
        lunch_meal:meals!calendar_days_lunch_fkey(*),
        dinner_meal:meals!calendar_days_dinner_fkey(*)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
    
    if (error) throw error
    return data || []
  },

  // Get calendar for a specific date
  async getByDate(date: string): Promise<CalendarDay | null> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('calendar_days')
      .select(`
        *,
        breakfast_meal:meals!calendar_days_breakfast_fkey(*),
        lunch_meal:meals!calendar_days_lunch_fkey(*),
        dinner_meal:meals!calendar_days_dinner_fkey(*)
      `)
      .eq('date', date)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
    return data
  },

  // Create or update calendar day
  async upsertDay(date: string, breakfast?: string, lunch?: string, dinner?: string): Promise<CalendarDay> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('calendar_days')
      .upsert([{ date, breakfast, lunch, dinner }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update specific meal for a date
  async updateMeal(date: string, mealType: 'breakfast' | 'lunch' | 'dinner', mealId: string | null): Promise<CalendarDay> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('calendar_days')
      .upsert([{ date, [mealType]: mealId }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete calendar day
  async deleteDay(date: string): Promise<void> {
    isSupabaseConfigured()
    const { error } = await supabase!
      .from('calendar_days')
      .delete()
      .eq('date', date)
    
    if (error) throw error
  }
}
