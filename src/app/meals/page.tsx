'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mealService, calendarService } from '@/lib/database';
import { fetchMealData } from '@/lib/meal-api';
import type { Meal } from '@/lib/supabase';

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
        const updatedMeal = await mealService.update(editingMealId, mealName, mealType, ingredients, isVeg, image);
        setMeals(meals.map(m => m.id === editingMealId ? updatedMeal : m));
        setShowCreateForm(false);
        resetForm();
        setEditingMealId(null);
        router.push(`/meals/${editingMealId}`);
      } else {
        // Create new meal
        const newMeal = await mealService.create(mealName, mealType, ingredients, isVeg, image);
        
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Meals</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Calendar
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showCreateForm ? 'Cancel' : '+ New Meal'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-red-800 dark:text-red-300">{error}</p>
              <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400">✕</button>
            </div>
          </div>
        )}

        {/* Create Meal Form */}
        {showCreateForm && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingMealId ? 'Edit Meal' : 'Create New Meal'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meal Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="e.g., Grilled Chicken Salad"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={handleAutoFetch}
                    disabled={!mealName.trim() || creating}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Fetching...' : 'Auto Fetch'}
                  </button>
                </div>
              </div>

              {autoFetched && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300 mb-2">
                    ✓ Auto-fetched meal data. You can edit the details below.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meal Type
                  </label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as 'breakfast' | 'lunch' | 'dinner')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={isVeg}
                        onChange={() => setIsVeg(true)}
                        className="mr-2"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Vegetarian</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!isVeg}
                        onChange={() => setIsVeg(false)}
                        className="mr-2"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Non-Vegetarian</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {ingredients.map((ing, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                    >
                      {ing}
                      <button
                        onClick={() => removeIngredient(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {image && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meal Image
                  </label>
                  <div className="flex items-center gap-4">
                    <img src={image} alt={mealName} className="w-32 h-32 object-cover rounded-lg" />
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="Image URL"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateMeal}
                disabled={creating || !mealName.trim()}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => router.push(`/meals/${meal.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{meal.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded capitalize">
                          {meal.type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMeal(meal.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ingredients:</p>
                    <div className="flex flex-wrap gap-1">
                      {meal.ingredients.slice(0, 5).map((ingId, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {ingId}
                        </span>
                      ))}
                      {meal.ingredients.length > 5 && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          +{meal.ingredients.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && meals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No meals yet. Create your first meal!</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MealsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <MealsPageContent />
    </Suspense>
  );
}

