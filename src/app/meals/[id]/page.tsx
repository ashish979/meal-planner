'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { mealService, ingredientService } from '@/lib/database';
import type { Meal, Ingredient } from '@/lib/supabase';
import AppBar from '@/components/AppBar';

export const dynamic = 'force-dynamic';

export default function MealDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const mealId = params.id as string;
  
  const [meal, setMeal] = useState<Meal | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMealData();
  }, [mealId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMealData = async () => {
    try {
      setLoading(true);
      
      // Load meal
      const meals = await mealService.getAll();
      const foundMeal = meals.find(m => m.id === mealId);
      
      if (!foundMeal) {
        setError('Meal not found');
        return;
      }
      
      setMeal(foundMeal);
      
      // Load ingredients to get names
      const allIngredients = await ingredientService.getAll();
      setIngredients(allIngredients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meal data');
    } finally {
      setLoading(false);
    }
  };

  const getIngredientName = (ingredientId: string): string => {
    const ingredient = ingredients.find(ing => ing.id === ingredientId);
    return ingredient?.name || ingredientId;
  };

  const mealTypeColors = {
    breakfast: 'bg-[var(--breakfast-bg)] text-[var(--breakfast-text)]',
    lunch: 'bg-[var(--lunch-bg)] text-[var(--lunch-text)]',
    dinner: 'bg-[var(--dinner-bg)] text-[var(--dinner-text)]'
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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* App Bar */}
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
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">{meal.name}</h1>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded-xl capitalize ${mealTypeColors[meal.type]}`}>
                    {meal.type}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Prep Notes Section */}
          {meal.prep_notes && (
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-start gap-3 p-4 bg-[var(--accent-light)]/30 rounded-xl border border-[var(--accent-light)]">
                <svg className="w-6 h-6 text-[var(--accent)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--accent-dark)] mb-1">Preparation Notes</h3>
                  <p className="text-[var(--accent-dark)]">{meal.prep_notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Ingredients Section */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">Ingredients</h2>
            
            {meal.ingredients.length === 0 ? (
              <p className="text-[var(--text-muted)]">No ingredients listed for this meal.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meal.ingredients.map((ingredientId, index) => (
                  <div
                    key={index}
                    className="p-4 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--foreground)] font-medium">
                        {getIngredientName(ingredientId)}
                      </span>
                    </div>
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

