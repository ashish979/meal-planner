'use client';

import { useState, useEffect, useMemo } from 'react';
import { mealItemService, ingredientService } from '@/lib/database';
import type { MealItem, Ingredient } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

export const dynamic = 'force-dynamic';

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'prep_time_minutes' | 'created_at';
type SortOrder = 'asc' | 'desc';

export default function MealItemsPage() {
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // View & Filter state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterVeg, setFilterVeg] = useState<'all' | 'veg' | 'non-veg'>('all');

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MealItem | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIngredients, setFormIngredients] = useState<string[]>([]);
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formImage, setFormImage] = useState('');
  const [formPrepTime, setFormPrepTime] = useState<number | ''>('');
  const [formPrepNotes, setFormPrepNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, ingredientsData] = await Promise.all([
        mealItemService.getAll(),
        ingredientService.getAll()
      ]);
      setMealItems(itemsData);
      setIngredients(ingredientsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let items = [...mealItems];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    // Veg filter
    if (filterVeg === 'veg') {
      items = items.filter(item => item.is_veg);
    } else if (filterVeg === 'non-veg') {
      items = items.filter(item => !item.is_veg);
    }

    // Sort
    items.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortField === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === 'prep_time_minutes') {
        aVal = a.prep_time_minutes || 0;
        bVal = b.prep_time_minutes || 0;
      } else if (sortField === 'created_at') {
        aVal = a.created_at;
        bVal = b.created_at;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [mealItems, searchQuery, filterVeg, sortField, sortOrder]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormIngredients([]);
    setFormIsVeg(true);
    setFormImage('');
    setFormPrepTime('');
    setFormPrepNotes('');
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (item: MealItem) => {
    setFormName(item.name);
    setFormDescription(item.description || '');
    setFormIngredients(item.ingredients || []);
    setFormIsVeg(item.is_veg);
    setFormImage(item.image || '');
    setFormPrepTime(item.prep_time_minutes || '');
    setFormPrepNotes(item.prep_notes || '');
    setEditingItem(item);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Please provide a name');
      return;
    }

    try {
      setSaving(true);
      
      if (editingItem) {
        const updated = await mealItemService.update(
          editingItem.id,
          formName,
          formDescription || undefined,
          formIngredients,
          formIsVeg,
          formImage || undefined,
          formPrepTime || undefined,
          formPrepNotes || undefined
        );
        setMealItems(mealItems.map(m => m.id === editingItem.id ? updated : m));
      } else {
        const created = await mealItemService.create(
          formName,
          formDescription || undefined,
          formIngredients,
          formIsVeg,
          formImage || undefined,
          formPrepTime || undefined,
          formPrepNotes || undefined
        );
        setMealItems([...mealItems, created]);
      }
      
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this meal item?')) return;
    
    try {
      await mealItemService.delete(id);
      setMealItems(mealItems.filter(m => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const toggleIngredient = (ingredientId: string) => {
    if (formIngredients.includes(ingredientId)) {
      setFormIngredients(formIngredients.filter(id => id !== ingredientId));
    } else {
      setFormIngredients([...formIngredients, ingredientId]);
    }
  };

  const getIngredientName = (id: string): string => {
    return ingredients.find(ing => ing.id === id)?.name || id;
  };

  // Group ingredients by category
  const ingredientsByCategory = ingredients.reduce((acc, ing) => {
    if (!acc[ing.category]) acc[ing.category] = [];
    acc[ing.category].push(ing);
    return acc;
  }, {} as Record<string, Ingredient[]>);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Header */}
        <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Meal Items</h1>
              <p className="text-sm text-[var(--text-muted)]">
                {filteredItems.length} items
              </p>
            </div>
            <button
              onClick={openCreateDialog}
              className="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] transition-colors"
            >
              + New Item
            </button>
          </div>
        </div>

        <main className="flex-1 px-4 sm:px-6 py-6">

        {/* Error Message */}
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
                placeholder="Search meal items..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            {/* Filter */}
            <select
              value={filterVeg}
              onChange={(e) => setFilterVeg(e.target.value as typeof filterVeg)}
              className="px-3 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)]"
            >
              <option value="all">All</option>
              <option value="veg">Veg</option>
              <option value="non-veg">Non-Veg</option>
            </select>

            {/* Sort */}
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field as SortField);
                setSortOrder(order as SortOrder);
              }}
              className="px-3 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)]"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="prep_time_minutes-asc">Prep Time ↑</option>
              <option value="prep_time_minutes-desc">Prep Time ↓</option>
              <option value="created_at-desc">Newest</option>
              <option value="created_at-asc">Oldest</option>
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
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => openEditDialog(item)}
                className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden cursor-pointer hover:border-[var(--primary-light)] hover:shadow-soft transition-all"
              >
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-[var(--surface-secondary)] flex items-center justify-center">
                    <svg className="w-10 h-10 text-[var(--border)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-[var(--foreground)] truncate">{item.name}</h3>
                    <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full mt-1 ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {item.prep_time_minutes && (
                      <span className="text-sm text-[var(--text-muted)]">{item.prep_time_minutes} min</span>
                    )}
                    {item.ingredients.length > 0 && (
                      <span className="text-xs text-[var(--text-muted)]">{item.ingredients.length} ing</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--surface-secondary)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)] cursor-pointer hover:text-[var(--foreground)]" onClick={() => toggleSort('name')}>
                    Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)] hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)] hidden md:table-cell cursor-pointer hover:text-[var(--foreground)]" onClick={() => toggleSort('prep_time_minutes')}>
                    Prep {sortField === 'prep_time_minutes' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)] hidden lg:table-cell">Ingredients</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--surface-secondary)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center">
                            <span className="text-sm text-[var(--text-muted)]">{item.name[0]}</span>
                          </div>
                        )}
                        <span className="font-medium text-[var(--foreground)]">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="ml-2 text-[var(--text-muted)]">{item.is_veg ? 'Veg' : 'Non-Veg'}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] hidden md:table-cell">
                      {item.prep_time_minutes ? `${item.prep_time_minutes} min` : '-'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[var(--text-muted)]">{item.ingredients.length} items</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditDialog(item)}
                        className="text-[var(--primary)] hover:text-[var(--primary-dark)] mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-[var(--text-muted)]">No items found</div>
            )}
          </div>
        )}

        {!loading && filteredItems.length === 0 && mealItems.length > 0 && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            No items match your filters
          </div>
        )}

        {!loading && mealItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)] mb-4">No meal items yet</p>
            <button
              onClick={openCreateDialog}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)]"
            >
              + Create First Item
            </button>
          </div>
        )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-soft-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                {editingItem ? 'Edit Meal Item' : 'New Meal Item'}
              </h2>
              <button onClick={closeDialog} className="text-[var(--text-muted)] hover:text-[var(--foreground)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Dialog Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Vegetable Curry"
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
                  placeholder="Brief description"
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface-secondary)] text-[var(--foreground)]"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Image URL</label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface-secondary)] text-[var(--foreground)]"
                />
                {formImage && (
                  <img src={formImage} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />
                )}
              </div>

              {/* Type & Prep Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Type</label>
                  <div className="flex gap-3">
                    <label className="flex items-center text-sm">
                      <input
                        type="radio"
                        checked={formIsVeg}
                        onChange={() => setFormIsVeg(true)}
                        className="mr-1.5"
                      />
                      Veg
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="radio"
                        checked={!formIsVeg}
                        onChange={() => setFormIsVeg(false)}
                        className="mr-1.5"
                      />
                      Non-Veg
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="30"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface-secondary)] text-[var(--foreground)]"
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Ingredients ({formIngredients.length} selected)
                </label>
                <div className="border border-[var(--border)] rounded-lg p-2 max-h-40 overflow-y-auto bg-[var(--surface-secondary)]">
                  {Object.entries(ingredientsByCategory).map(([category, categoryIngredients]) => (
                    <div key={category} className="mb-2 last:mb-0">
                      <div className="text-xs font-medium text-[var(--text-muted)] mb-1">{category}</div>
                      <div className="flex flex-wrap gap-1">
                        {categoryIngredients.map((ing) => (
                          <button
                            key={ing.id}
                            type="button"
                            onClick={() => toggleIngredient(ing.id)}
                            className={`px-2 py-0.5 text-xs rounded transition-colors ${
                              formIngredients.includes(ing.id)
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]'
                            }`}
                          >
                            {ing.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prep Notes */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Prep Notes</label>
                <textarea
                  value={formPrepNotes}
                  onChange={(e) => setFormPrepNotes(e.target.value)}
                  placeholder="e.g., Soak dal overnight"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface-secondary)] text-[var(--foreground)] resize-none"
                />
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)]">
              <button
                onClick={closeDialog}
                className="flex-1 px-4 py-2.5 bg-[var(--surface-secondary)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="flex-1 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
