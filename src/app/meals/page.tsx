'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mealService, mealItemService, calendarService } from '@/lib/database';
import type { Meal, MealItem } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

export const dynamic = 'force-dynamic';

type ViewMode = 'grid' | 'list';

function MealsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'any'>('all');

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMealItems, setFormMealItems] = useState<string[]>([]);
  const [formMealType, setFormMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'any'>('any');
  const [formImage, setFormImage] = useState('');

  // Calendar params
  const dateParam = searchParams.get('date');
  const typeParam = searchParams.get('type') as 'breakfast' | 'lunch' | 'dinner' | null;
  const editParam = searchParams.get('edit');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (dateParam && typeParam) {
      setFormMealType(typeParam);
      setShowDialog(true);
    }
  }, [dateParam, typeParam]);

  useEffect(() => {
    if (editParam && meals.length > 0) {
      const meal = meals.find(m => m.id === editParam);
      if (meal) openEditDialog(meal);
    }
  }, [editParam, meals]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mealsData, mealItemsData] = await Promise.all([
        mealService.getAll(),
        mealItemService.getAll()
      ]);
      setMeals(mealsData);
      setMealItems(mealItemsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filtered meals
  const filteredMeals = useMemo(() => {
    let items = [...meals];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(meal =>
        meal.name.toLowerCase().includes(query) ||
        meal.description?.toLowerCase().includes(query)
      );
    }

    if (filterType !== 'all') {
      items = items.filter(meal => meal.meal_type === filterType);
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [meals, searchQuery, filterType]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormMealItems([]);
    setFormMealType('any');
    setFormImage('');
    setEditingMeal(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (meal: Meal) => {
    setFormName(meal.name);
    setFormDescription(meal.description || '');
    setFormMealItems(meal.meal_items || []);
    setFormMealType(meal.meal_type);
    setFormImage(meal.image || '');
    setEditingMeal(meal);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    resetForm();
    if (editParam || dateParam) {
      router.push('/meals');
    }
  };

  // Get selected meal items with their details
  const getSelectedItems = () => mealItems.filter(item => formMealItems.includes(item.id));

  // Generate meal name from selected items
  const generateMealName = (items: MealItem[]): string => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0].name;
    if (items.length === 2) return `${items[0].name} with ${items[1].name}`;
    return `${items[0].name} with ${items[1].name} & more`;
  };

  // Get images from selected meal items (first 2)
  const getSelectedItemImages = (): string[] => {
    return getSelectedItems()
      .filter(item => item.image)
      .slice(0, 2)
      .map(item => item.image as string);
  };

  const handleSave = async () => {
    if (formMealItems.length === 0) {
      setError('Select at least one meal item');
      return;
    }

    try {
      setSaving(true);
      const selectedItems = getSelectedItems();
      const isVeg = selectedItems.every(item => item.is_veg);
      
      // Use provided name or generate from meal items
      const mealName = formName.trim() || generateMealName(selectedItems);

      if (editingMeal) {
        const updated = await mealService.update(
          editingMeal.id,
          mealName,
          formMealItems,
          formMealType,
          isVeg,
          formDescription || undefined,
          formImage || undefined
        );
        setMeals(meals.map(m => m.id === editingMeal.id ? updated : m));
        closeDialog();
      } else {
        const created = await mealService.create(
          mealName,
          formMealItems,
          formMealType,
          isVeg,
          formDescription || undefined,
          formImage || undefined
        );
        
        if (dateParam && typeParam) {
          await calendarService.updateMeal(dateParam, typeParam, created.id);
          router.push('/');
        } else {
          setMeals([...meals, created]);
          closeDialog();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this meal?')) return;
    try {
      await mealService.delete(id);
      setMeals(meals.filter(m => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const toggleMealItem = (itemId: string) => {
    if (formMealItems.includes(itemId)) {
      setFormMealItems(formMealItems.filter(id => id !== itemId));
    } else {
      setFormMealItems([...formMealItems, itemId]);
    }
  };

  const getMealItemName = (id: string): string => {
    return mealItems.find(mi => mi.id === id)?.name || id;
  };

  // Get meal image - use custom image or first meal item image
  const getMealImage = (meal: Meal): string | null => {
    if (meal.image) return meal.image;
    // Get first meal item with an image
    for (const itemId of meal.meal_items) {
      const item = mealItems.find(mi => mi.id === itemId);
      if (item?.image) return item.image;
    }
    return null;
  };

  const mealTypeColors: Record<string, string> = {
    breakfast: 'bg-yellow-100 text-yellow-700',
    lunch: 'bg-green-100 text-green-700',
    dinner: 'bg-pink-100 text-pink-700',
    any: 'bg-purple-100 text-purple-700'
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Header */}
        <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Meals</h1>
              <p className="text-sm text-[var(--text-muted)]">{filteredMeals.length} meals</p>
            </div>
            <button
              onClick={openCreateDialog}
              className="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] transition-colors"
            >
              + New Meal
            </button>
          </div>
        </div>

        <main className="flex-1 px-4 sm:px-6 py-6">

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center justify-between">
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500">✕</button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meals..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)]"
              />
            </div>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="px-3 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)]"
            >
              <option value="all">All Types</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="any">Any Time</option>
            </select>

            {/* View Toggle */}
            <div className="flex border border-[var(--border)] rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMeals.map((meal) => {
              const mealImage = getMealImage(meal);
              return (
                <div
                  key={meal.id}
                  onClick={() => openEditDialog(meal)}
                  className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden cursor-pointer hover:border-[var(--primary-light)] hover:shadow-soft transition-all"
                >
                  {mealImage ? (
                    <img src={mealImage} alt={meal.name} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-[var(--surface-secondary)] flex items-center justify-center">
                      <svg className="w-10 h-10 text-[var(--border)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-medium text-[var(--foreground)] truncate">{meal.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 text-xs rounded-lg ${mealTypeColors[meal.meal_type]}`}>
                        {meal.meal_type === 'any' ? 'Any' : meal.meal_type}
                      </span>
                      <span className={`w-2.5 h-2.5 rounded-full ${meal.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-2">{meal.meal_items.length} items</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--surface-secondary)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)] hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)] hidden md:table-cell">Items</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredMeals.map((meal) => {
                  const mealImage = getMealImage(meal);
                  return (
                  <tr key={meal.id} className="hover:bg-[var(--surface-secondary)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {mealImage ? (
                          <img src={mealImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center">
                            <span className="text-sm text-[var(--text-muted)]">{meal.name[0]}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-[var(--foreground)]">{meal.name}</span>
                          <span className={`ml-2 w-2.5 h-2.5 inline-block rounded-full ${meal.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`px-2 py-1 text-xs rounded-lg ${mealTypeColors[meal.meal_type]}`}>
                        {meal.meal_type === 'any' ? 'Any' : meal.meal_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] hidden md:table-cell">
                      {meal.meal_items.slice(0, 2).map(id => getMealItemName(id)).join(', ')}
                      {meal.meal_items.length > 2 && ` +${meal.meal_items.length - 2}`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditDialog(meal)} className="text-[var(--primary)] hover:text-[var(--primary-dark)] mr-3">Edit</button>
                      <button onClick={() => handleDelete(meal.id)} className="text-red-500 hover:text-red-600">Delete</button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredMeals.length === 0 && (
              <div className="text-center py-12 text-[var(--text-muted)]">No meals found</div>
            )}
          </div>
        )}

        {!loading && meals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)] mb-4">No meals yet</p>
            <button onClick={openCreateDialog} className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)]">
              + Create First Meal
            </button>
          </div>
        )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-soft-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                {editingMeal ? 'Edit Meal' : 'New Meal'}
              </h2>
              <button onClick={closeDialog} className="text-[var(--text-muted)] hover:text-[var(--foreground)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Meal Items Selection - moved to top */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Select Meal Items * ({formMealItems.length} selected)
                </label>
                {mealItems.length === 0 ? (
                  <div className="p-3 border-2 border-dashed border-[var(--border)] rounded-lg text-center text-sm">
                    <p className="text-[var(--text-muted)]">No meal items available</p>
                    <button
                      onClick={() => { closeDialog(); router.push('/meal-items'); }}
                      className="text-[var(--primary)] text-sm mt-1"
                    >
                      Create Meal Items →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                    {mealItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleMealItem(item.id)}
                        className={`p-2 text-left rounded-lg border text-sm transition-all ${
                          formMealItems.includes(item.id)
                            ? 'border-[var(--primary)] bg-[var(--primary-light)]/20'
                            : 'border-[var(--border)] bg-[var(--surface-secondary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.image ? (
                            <img src={item.image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-[var(--border)] flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-[var(--text-muted)]">{item.name[0]}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-[var(--foreground)] truncate block">{item.name}</span>
                          </div>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview Section - shows when items are selected */}
              {formMealItems.length > 0 && (
                <div className="p-3 bg-[var(--surface-secondary)] rounded-xl">
                  <p className="text-xs text-[var(--text-muted)] mb-2">Preview</p>
                  <div className="flex items-center gap-3">
                    {/* Show meal item images or custom image */}
                    {formImage ? (
                      <img src={formImage} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                    ) : getSelectedItemImages().length > 0 ? (
                      <div className="flex -space-x-2">
                        {getSelectedItemImages().map((img, idx) => (
                          <img key={idx} src={img} alt="" className="w-12 h-12 rounded-lg object-cover border-2 border-[var(--surface-secondary)]" />
                        ))}
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[var(--border)] flex items-center justify-center">
                        <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--foreground)] truncate">
                        {formName.trim() || generateMealName(getSelectedItems())}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {getSelectedItems().map(i => i.name).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Name - Optional */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Name <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={formMealItems.length > 0 ? generateMealName(getSelectedItems()) : "Auto-generated from items"}
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface-secondary)] text-[var(--foreground)]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description (optional)"
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface-secondary)] text-[var(--foreground)]"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Custom Image <span className="text-[var(--text-muted)] font-normal">(optional - uses item images by default)</span>
                </label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface-secondary)] text-[var(--foreground)]"
                />
              </div>

              {/* Meal Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Meal Type</label>
                <div className="flex flex-wrap gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'any'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormMealType(type)}
                      className={`px-3 py-1.5 text-sm rounded-lg capitalize ${
                        formMealType === type
                          ? mealTypeColors[type]
                          : 'bg-[var(--surface-secondary)] text-[var(--foreground)]'
                      }`}
                    >
                      {type === 'any' ? 'Any Time' : type}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)]">
              <button
                onClick={closeDialog}
                className="flex-1 px-4 py-2.5 bg-[var(--surface-secondary)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || formMealItems.length === 0}
                className="flex-1 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingMeal ? 'Update' : dateParam ? 'Create & Add' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
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
