import { supabase, type Ingredient, type MealItem, type Meal, type CalendarDay } from './supabase'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
  }
  return true
}

// ============================================
// INGREDIENTS SERVICE
// Basic items: vegetables, pulses, flour, etc.
// ============================================
export const ingredientService = {
  async getAll(): Promise<Ingredient[]> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('ingredients')
      .select('*')
      .order('category')
      .order('name')
    
    if (error) throw error
    return data || []
  },

  async getByCategory(category: string): Promise<Ingredient[]> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('ingredients')
      .select('*')
      .eq('category', category)
      .order('name')
    
    if (error) throw error
    return data || []
  },

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
  },

  async delete(id: string): Promise<void> {
    isSupabaseConfigured()
    const { error } = await supabase!
      .from('ingredients')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// ============================================
// MEAL ITEMS SERVICE
// Individual dishes made from ingredients
// e.g., Vegetable Curry, Chapati, Fried Noodles
// ============================================
export const mealItemService = {
  async getAll(): Promise<MealItem[]> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meal_items')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<MealItem | null> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meal_items')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async create(
    name: string,
    description?: string,
    ingredients: string[] = [],
    isVeg: boolean = true,
    image?: string,
    prepTimeMinutes?: number,
    prepNotes?: string
  ): Promise<MealItem> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meal_items')
      .insert([{
        name,
        description,
        ingredients,
        is_veg: isVeg,
        image,
        prep_time_minutes: prepTimeMinutes,
        prep_notes: prepNotes
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(
    id: string,
    name: string,
    description?: string,
    ingredients: string[] = [],
    isVeg: boolean = true,
    image?: string,
    prepTimeMinutes?: number,
    prepNotes?: string
  ): Promise<MealItem> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meal_items')
      .update({
        name,
        description,
        ingredients,
        is_veg: isVeg,
        image,
        prep_time_minutes: prepTimeMinutes,
        prep_notes: prepNotes
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    isSupabaseConfigured()
    const { error } = await supabase!
      .from('meal_items')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// ============================================
// MEALS SERVICE
// Combination of meal items for a complete meal
// e.g., Chapati + Vegetable Curry
// ============================================
export const mealService = {
  async getAll(): Promise<Meal[]> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meals')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Meal | null> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meals')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async getByType(mealType: 'breakfast' | 'lunch' | 'dinner' | 'any'): Promise<Meal[]> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meals')
      .select('*')
      .or(`meal_type.eq.${mealType},meal_type.eq.any`)
      .order('name')
    
    if (error) throw error
    return data || []
  },

  async create(
    name: string,
    mealItems: string[] = [],
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'any' = 'any',
    isVeg: boolean = true,
    description?: string,
    image?: string
  ): Promise<Meal> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meals')
      .insert([{
        name,
        description,
        meal_items: mealItems,
        meal_type: mealType,
        is_veg: isVeg,
        image
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(
    id: string,
    name: string,
    mealItems: string[] = [],
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'any' = 'any',
    isVeg: boolean = true,
    description?: string,
    image?: string
  ): Promise<Meal> {
    isSupabaseConfigured()
    const { data, error } = await supabase!
      .from('meals')
      .update({
        name,
        description,
        meal_items: mealItems,
        meal_type: mealType,
        is_veg: isVeg,
        image
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    isSupabaseConfigured()
    const { error } = await supabase!
      .from('meals')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// ============================================
// CALENDAR SERVICE
// Schedule meals for breakfast, lunch, dinner
// ============================================
export const calendarService = {
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
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

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

  async updateMeal(date: string, mealType: 'breakfast' | 'lunch' | 'dinner', mealId: string | null): Promise<CalendarDay> {
    isSupabaseConfigured()
    
    // First, check if a record exists for this date
    const { data: existing } = await supabase!
      .from('calendar_days')
      .select('*')
      .eq('date', date)
      .single()
    
    if (existing) {
      // Record exists, update it
      const updateData: Record<string, string | null> = { [mealType]: mealId }
      const { data, error } = await supabase!
        .from('calendar_days')
        .update(updateData)
        .eq('date', date)
        .select()
        .single()
      
      if (error) throw error
      return data
    } else {
      // Record doesn't exist, only insert if we're adding a meal (not removing)
      if (mealId) {
        const { data, error } = await supabase!
          .from('calendar_days')
          .insert([{ date, [mealType]: mealId }])
          .select()
          .single()
        
        if (error) throw error
        return data
      } else {
        // Trying to remove a meal from a non-existent record, return empty structure
        return {
          id: '',
          date,
          breakfast: undefined,
          lunch: undefined,
          dinner: undefined,
          created_at: '',
          updated_at: ''
        }
      }
    }
  },

  async deleteDay(date: string): Promise<void> {
    isSupabaseConfigured()
    const { error } = await supabase!
      .from('calendar_days')
      .delete()
      .eq('date', date)
    
    if (error) throw error
  }
}
