'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mealService, calendarService } from '@/lib/database';
import { fetchMealData } from '@/lib/meal-api';
import type { Meal } from '@/lib/supabase';
import AppBar from '@/components/AppBar';

export const dynamic = 'force-dynamic';

function MealsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
  const [isVeg, setIsVeg] = useState(true);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [image, setImage] = useState<string>('');
  const [prepNotes, setPrepNotes] = useState<string>('');
  const [autoFetched, setAutoFetched] = useState(false);

  // Check if we need to add meal to calendar or edit
  const dateParam = searchParams.get('date');
  const typeParam = searchParams.get('type') as 'breakfast' | 'lunch' | 'dinner' | null;
  const editParam = searchParams.get('edit');
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  useEffect(() => {
    loadMeals();
    if (dateParam && typeParam) {
      setShowCreateForm(true);
      setMealType(typeParam);
    } else if (editParam) {
      setEditingMealId(editParam);
      setShowCreateForm(true);
    }
  }, [dateParam, typeParam, editParam]);

  useEffect(() => {
    if (editingMealId && meals.length > 0) {
      const mealToEdit = meals.find(m => m.id === editingMealId);
      if (mealToEdit) {
        setMealName(mealToEdit.name);
        setMealType(mealToEdit.type);
        setIsVeg(mealToEdit.is_veg ?? true);
        setIngredients(mealToEdit.ingredients);
        setImage(mealToEdit.image || '');
        setPrepNotes(mealToEdit.prep_notes || '');
        setAutoFetched(false);
      }
    }
  }, [editingMealId, meals]);

  const loadMeals = async () => {
    try {
      setLoading(true);
      const mealsData = await mealService.getAll();
      setMeals(mealsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFetch = async () => {
    if (!mealName.trim()) return;
    
    try {
      setCreating(true);
      const mealData = await fetchMealData(mealName);
      setMealType(mealData.type);
      setIsVeg(mealData.isVeg);
      setIngredients(mealData.ingredients);
      setImage(mealData.image || '');
      setAutoFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meal data');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateMeal = async () => {
    if (!mealName.trim() || ingredients.length === 0) {
      setError('Please provide meal name and at least one ingredient');
      return;
    }

    try {
      setCreating(true);
      
      if (editingMealId) {
        // Update existing meal
        const updatedMeal = await mealService.update(editingMealId, mealName, mealType, ingredients, isVeg, image, prepNotes || undefined);
        setMeals(meals.map(m => m.id === editingMealId ? updatedMeal : m));
        setShowCreateForm(false);
        resetForm();
        setEditingMealId(null);
        router.push(`/meals/${editingMealId}`);
      } else {
        // Create new meal
        const newMeal = await mealService.create(mealName, mealType, ingredients, isVeg, image, prepNotes || undefined);
        
        // If date and type are provided, add to calendar
        if (dateParam && typeParam) {
          await calendarService.updateMeal(dateParam, typeParam, newMeal.id);
          router.push('/');
        } else {
          setMeals([...meals, newMeal]);
          setShowCreateForm(false);
          resetForm();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save meal');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meal?')) return;
    
    try {
      await mealService.delete(id);
      setMeals(meals.filter(m => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete meal');
    }
  };

  const resetForm = () => {
    setMealName('');
    setMealType('breakfast');
    setIsVeg(true);
    setIngredients([]);
    setImage('');
    setPrepNotes('');
    setAutoFetched(false);
    setEditingMealId(null);
  };

  const addIngredient = (ingredient: string) => {
    if (ingredient.trim() && !ingredients.includes(ingredient.trim())) {
      setIngredients([...ingredients, ingredient.trim()]);
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* App Bar */}
      <AppBar
        showBackButton
        backHref="/"
        rightContent={
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] transition-colors"
          >
            {showCreateForm ? 'Cancel' : '+ New Meal'}
          </button>
        }
      />

      <main className="container mx-auto px-4 sm:px-6 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center justify-between">
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-600">✕</button>
            </div>
          </div>
        )}

        {/* Create Meal Form */}
        {showCreateForm && (
          <div className="mb-6 bg-[var(--surface)] rounded-2xl shadow-soft-lg p-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              {editingMealId ? 'Edit Meal' : 'Create New Meal'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Meal Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="e.g., Grilled Chicken Salad"
                    className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent bg-[var(--surface-secondary)] text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
                  />
                  <button
                    onClick={handleAutoFetch}
                    disabled={!mealName.trim() || creating}
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Fetching...' : 'Auto Fetch'}
                  </button>
                </div>
              </div>

              {autoFetched && (
                <div className="p-4 bg-[var(--lunch-bg)] border border-[var(--lunch-border)] rounded-xl">
                  <p className="text-sm text-[var(--lunch-text)]">
                    ✓ Auto-fetched meal data. You can edit the details below.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Meal Type
                  </label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as 'breakfast' | 'lunch' | 'dinner')}
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent bg-[var(--surface-secondary)] text-[var(--foreground)]"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Category
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={isVeg}
                        onChange={() => setIsVeg(true)}
                        className="mr-2 text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <span className="text-[var(--foreground)]">Vegetarian</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!isVeg}
                        onChange={() => setIsVeg(false)}
                        className="mr-2 text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <span className="text-[var(--foreground)]">Non-Vegetarian</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Ingredients
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add ingredient"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addIngredient(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent bg-[var(--surface-secondary)] text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {ingredients.map((ing, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-[var(--primary-light)]/30 text-[var(--primary-dark)] rounded-full text-sm"
                    >
                      {ing}
                      <button
                        onClick={() => removeIngredient(index)}
                        className="ml-2 text-[var(--primary)] hover:text-[var(--primary-dark)]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {image && (
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Meal Image
                  </label>
                  <div className="flex items-center gap-4">
                    <img src={image} alt={mealName} className="w-32 h-32 object-cover rounded-xl" />
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="Image URL"
                      className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent bg-[var(--surface-secondary)] text-[var(--foreground)]"
                    />
                  </div>
                </div>
              )}

              {/* Prep Notes Section */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Preparation Notes (Optional)
                  </span>
                </label>
                <textarea
                  value={prepNotes}
                  onChange={(e) => setPrepNotes(e.target.value)}
                  placeholder="Add notes for meal preparation (e.g., 'Marinate chicken overnight', 'Soak beans the day before'). These will appear as reminders when this meal is scheduled for tomorrow."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent bg-[var(--surface-secondary)] text-[var(--foreground)] placeholder:text-[var(--text-muted)] resize-none"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  💡 These notes will appear as a reminder banner when this meal is scheduled for tomorrow.
                </p>
              </div>

              <button
                onClick={handleCreateMeal}
                disabled={creating || !mealName.trim()}
                className="w-full px-6 py-3 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating 
                  ? (editingMealId ? 'Updating...' : 'Creating...') 
                  : editingMealId 
                    ? 'Update Meal' 
                    : dateParam 
                      ? 'Create & Add to Calendar' 
                      : 'Create Meal'}
              </button>
            </div>
          </div>
        )}

        {/* Meals List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
            <span className="ml-3 text-[var(--text-muted)]">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meals.map((meal) => {
              const mealTypeColors = {
                breakfast: 'bg-[var(--breakfast-bg)] text-[var(--breakfast-text)]',
                lunch: 'bg-[var(--lunch-bg)] text-[var(--lunch-text)]',
                dinner: 'bg-[var(--dinner-bg)] text-[var(--dinner-text)]'
              };
              return (
                <div
                  key={meal.id}
                  className="bg-[var(--surface)] rounded-2xl shadow-soft overflow-hidden cursor-pointer hover:shadow-soft-lg transition-all border border-[var(--border)] hover:border-[var(--primary-light)]"
                  onClick={() => router.push(`/meals/${meal.id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">{meal.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-lg capitalize ${mealTypeColors[meal.type]}`}>
                            {meal.type}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeal(meal.id);
                        }}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-[var(--text-muted)] mb-2">Ingredients:</p>
                      <div className="flex flex-wrap gap-1">
                        {meal.ingredients.slice(0, 5).map((ingId, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-[var(--surface-secondary)] text-[var(--text-muted)] rounded-lg"
                          >
                            {ingId}
                          </span>
                        ))}
                        {meal.ingredients.length > 5 && (
                          <span className="px-2 py-1 text-xs text-[var(--text-muted)]">
                            +{meal.ingredients.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && meals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">No meals yet. Create your first meal!</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MealsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    }>
      <MealsPageContent />
    </Suspense>
  );
}

