'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { mealService, mealItemService, ingredientService } from '@/lib/database';
import type { Meal, MealItem, Ingredient } from '@/lib/supabase';
import AppBar from '@/components/AppBar';

export const dynamic = 'force-dynamic';

export default function MealDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const mealId = params.id as string;
  
  const [meal, setMeal] = useState<Meal | null>(null);
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMealData();
  }, [mealId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMealData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [mealsData, mealItemsData, ingredientsData] = await Promise.all([
        mealService.getAll(),
        mealItemService.getAll(),
        ingredientService.getAll()
      ]);
      
      const foundMeal = mealsData.find(m => m.id === mealId);
      
      if (!foundMeal) {
        setError('Meal not found');
        return;
      }
      
      setMeal(foundMeal);
      setMealItems(mealItemsData);
      setIngredients(ingredientsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meal data');
    } finally {
      setLoading(false);
    }
  };

  const getMealItem = (id: string): MealItem | undefined => {
    return mealItems.find(item => item.id === id);
  };

  const getIngredientName = (id: string): string => {
    const ingredient = ingredients.find(ing => ing.id === id);
    return ingredient?.name || id;
  };

  const mealTypeColors = {
    breakfast: 'bg-[var(--breakfast-bg)] text-[var(--breakfast-text)]',
    lunch: 'bg-[var(--lunch-bg)] text-[var(--lunch-text)]',
    dinner: 'bg-[var(--dinner-bg)] text-[var(--dinner-text)]',
    any: 'bg-purple-100 text-purple-700'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          <span className="ml-3 text-[var(--text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Meal not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] transition-colors"
          >
            Back to Calendar
          </button>
        </div>
      </div>
    );
  }

  // Get the meal items that are part of this meal
  const includedMealItems = meal.meal_items
    .map(id => getMealItem(id))
    .filter((item): item is MealItem => item !== undefined);

  // Calculate total prep time
  const totalPrepTime = includedMealItems.reduce((sum, item) => sum + (item.prep_time_minutes || 0), 0);

  // Collect all prep notes from meal items
  const prepNotes = includedMealItems
    .filter(item => item.prep_notes)
    .map(item => ({ name: item.name, notes: item.prep_notes! }));

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppBar
        showBackButton
        backHref="/meals"
        rightContent={
          <Link
            href={`/meals?edit=${meal.id}`}
            className="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] transition-colors"
          >
            Edit Meal
          </Link>
        }
      />

      <main className="container mx-auto px-4 sm:px-6 py-8">
        <div className="bg-[var(--surface)] rounded-2xl shadow-soft-lg overflow-hidden">
          {/* Meal Header */}
          {meal.image && (
            <img
              src={meal.image}
              alt={meal.name}
              className="w-full h-64 object-cover"
            />
          )}
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">{meal.name}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 text-sm font-medium rounded-xl capitalize ${mealTypeColors[meal.meal_type]}`}>
                    {meal.meal_type === 'any' ? 'Any Time' : meal.meal_type}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-xl ${
                    meal.is_veg 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {meal.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                  </span>
                  {totalPrepTime > 0 && (
                    <span className="px-3 py-1 text-sm font-medium rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)]">
                      ~{totalPrepTime} min total
                    </span>
                  )}
                </div>
              </div>
            </div>
            {meal.description && (
              <p className="mt-4 text-[var(--text-muted)]">{meal.description}</p>
            )}
          </div>

          {/* Prep Notes Section */}
          {prepNotes.length > 0 && (
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-start gap-3 p-4 bg-[var(--accent-light)]/30 rounded-xl border border-[var(--accent-light)]">
                <svg className="w-6 h-6 text-[var(--accent)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[var(--accent-dark)] mb-2">Preparation Notes</h3>
                  <div className="space-y-2">
                    {prepNotes.map((note, idx) => (
                      <div key={idx} className="text-[var(--accent-dark)]">
                        <span className="font-medium">{note.name}:</span> {note.notes}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Meal Items Section */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              Meal Items ({includedMealItems.length})
            </h2>
            
            {includedMealItems.length === 0 ? (
              <p className="text-[var(--text-muted)]">No meal items in this meal.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {includedMealItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-[var(--foreground)]">{item.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded-lg ${
                          item.is_veg 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.is_veg ? 'Veg' : 'Non-Veg'}
                        </span>
                        {item.prep_time_minutes && (
                          <span className="text-xs text-[var(--text-muted)]">
                            {item.prep_time_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-[var(--text-muted)] mb-2">{item.description}</p>
                    )}

                    {item.ingredients.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Ingredients:</p>
                        <div className="flex flex-wrap gap-1">
                          {item.ingredients.map((ingId) => (
                            <span
                              key={ingId}
                              className="px-2 py-0.5 text-xs bg-[var(--surface)] text-[var(--foreground)] rounded-lg border border-[var(--border)]"
                            >
                              {getIngredientName(ingId)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
