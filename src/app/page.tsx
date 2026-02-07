'use client';

import { useState, useEffect, useCallback, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { mealService, mealItemService, calendarService } from '@/lib/database';
import type { Meal, MealItem, CalendarDay } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

export const dynamic = 'force-dynamic';

type ViewMode = 'day' | 'week' | 'month';

export default function Home() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
  const [tomorrowReminders, setTomorrowReminders] = useState<{ meal: Meal; mealType: string; prepNotes: string[] }[]>([]);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load meals and meal items
      const [mealsData, mealItemsData] = await Promise.all([
        mealService.getAll(),
        mealItemService.getAll()
      ]);
      setMeals(mealsData);
      setMealItems(mealItemsData);

      // Load calendar based on view mode
      const startDate = getStartDate();
      const endDate = getEndDate();
      const calendarData = await calendarService.getWeek(startDate, endDate);
      
      // Generate all dates in range
      const allDates = getAllDatesInRange(startDate, endDate);
      const calendarMap = new Map(calendarData.map(day => [day.date, day]));
      
      const fullCalendar = allDates.map(date => {
        const existingDay = calendarMap.get(date);
        return existingDay || {
          id: '',
          date,
          breakfast: undefined,
          lunch: undefined,
          dinner: undefined,
          created_at: '',
          updated_at: ''
        };
      });
      
      setCalendar(fullCalendar);

      // Load tomorrow's reminders
      await loadTomorrowReminders(mealsData, mealItemsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

  const loadTomorrowReminders = async (mealsData: Meal[], mealItemsData: MealItem[]) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const tomorrowData = await calendarService.getByDate(tomorrowStr);
      
      if (tomorrowData) {
        const reminders: { meal: Meal; mealType: string; prepNotes: string[] }[] = [];
        
        const checkMeal = (mealId: string | undefined, mealType: string) => {
          if (mealId) {
            const meal = mealsData.find(m => m.id === mealId);
            if (meal) {
              // Get prep notes from all meal items in this meal
              const notes: string[] = [];
              meal.meal_items.forEach(itemId => {
                const item = mealItemsData.find(mi => mi.id === itemId);
                if (item?.prep_notes) {
                  notes.push(`${item.name}: ${item.prep_notes}`);
                }
              });
              if (notes.length > 0) {
                reminders.push({ meal, mealType, prepNotes: notes });
              }
            }
          }
        };
        
        checkMeal(tomorrowData.breakfast, 'Breakfast');
        checkMeal(tomorrowData.lunch, 'Lunch');
        checkMeal(tomorrowData.dinner, 'Dinner');
        
        setTomorrowReminders(reminders);
      } else {
        setTomorrowReminders([]);
      }
    } catch {
      // Silently fail for reminders
      setTomorrowReminders([]);
    }
  };

  const getStartDate = (): string => {
    const date = new Date(currentDate);
    if (viewMode === 'day') {
      return date.toISOString().split('T')[0];
    } else if (viewMode === 'week') {
      date.setDate(date.getDate() - date.getDay());
      return date.toISOString().split('T')[0];
    } else {
      // Month view - first day of month
      date.setDate(1);
      return date.toISOString().split('T')[0];
    }
  };

  const getEndDate = (): string => {
    const date = new Date(currentDate);
    if (viewMode === 'day') {
      return date.toISOString().split('T')[0];
    } else if (viewMode === 'week') {
      date.setDate(date.getDate() - date.getDay() + 6);
      return date.toISOString().split('T')[0];
    } else {
      // Month view - last day of month
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      return date.toISOString().split('T')[0];
    }
  };

  const getAllDatesInRange = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  useEffect(() => {
    loadData();
  }, [currentDate, viewMode, loadData]);

  const handleMealClick = (mealId: string | undefined) => {
    if (mealId) {
      router.push(`/meals/${mealId}`);
    }
  };

  const handleAddMeal = (date: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    setSelectedDate(date);
    setSelectedMealType(mealType);
    setShowMealModal(true);
  };

  const handleSelectMeal = async (mealId: string) => {
    try {
      await calendarService.updateMeal(selectedDate, selectedMealType, mealId);
      await loadData();
      setShowMealModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add meal to calendar');
    }
  };

  const handleCreateNewMeal = () => {
    setShowMealModal(false);
    router.push(`/meals?date=${selectedDate}&type=${selectedMealType}`);
  };

  const handleRemoveMeal = async (date: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    try {
      await calendarService.updateMeal(date, mealType, null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove meal');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, mealId: string, sourceDate: string, sourceMealType: 'breakfast' | 'lunch' | 'dinner') => {
    e.dataTransfer.setData('mealId', mealId);
    e.dataTransfer.setData('sourceDate', sourceDate);
    e.dataTransfer.setData('sourceMealType', sourceMealType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetDate: string, targetMealType: 'breakfast' | 'lunch' | 'dinner') => {
    e.preventDefault();
    const mealId = e.dataTransfer.getData('mealId');
    const sourceDate = e.dataTransfer.getData('sourceDate');
    const sourceMealType = e.dataTransfer.getData('sourceMealType') as 'breakfast' | 'lunch' | 'dinner';
    
    if (!mealId) return;

    try {
      // If moving to a different slot, remove from source and add to target
      if (sourceDate !== targetDate || sourceMealType !== targetMealType) {
        // Remove from source (if it had a source - could be from meal list)
        if (sourceDate && sourceMealType) {
          await calendarService.updateMeal(sourceDate, sourceMealType, null);
        }
        // Add to target
        await calendarService.updateMeal(targetDate, targetMealType, mealId);
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move meal');
    }
  };

  const handleAutoSuggest = async () => {
    // Auto-suggest: randomly assign available meals to empty slots
    try {
      const breakfastMeals = meals.filter(m => m.meal_type === 'breakfast' || m.meal_type === 'any');
      const lunchMeals = meals.filter(m => m.meal_type === 'lunch' || m.meal_type === 'any');
      const dinnerMeals = meals.filter(m => m.meal_type === 'dinner' || m.meal_type === 'any');

      for (const day of calendar) {
        if (!day.breakfast && breakfastMeals.length > 0) {
          const randomMeal = breakfastMeals[Math.floor(Math.random() * breakfastMeals.length)];
          await calendarService.updateMeal(day.date, 'breakfast', randomMeal.id);
        }
        if (!day.lunch && lunchMeals.length > 0) {
          const randomMeal = lunchMeals[Math.floor(Math.random() * lunchMeals.length)];
          await calendarService.updateMeal(day.date, 'lunch', randomMeal.id);
        }
        if (!day.dinner && dinnerMeals.length > 0) {
          const randomMeal = dinnerMeals[Math.floor(Math.random() * dinnerMeals.length)];
          await calendarService.updateMeal(day.date, 'dinner', randomMeal.id);
        }
      }
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-suggest meals');
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getMealItemNames = (meal: Meal): string[] => {
    return meal.meal_items
      .map(id => mealItems.find(mi => mi.id === id)?.name)
      .filter((name): name is string => name !== undefined);
  };

  // Get meal image - use custom image or first meal item image
  const getMealImage = (meal: Meal): string | null => {
    if (meal.image) return meal.image;
    for (const itemId of meal.meal_items) {
      const item = mealItems.find(mi => mi.id === itemId);
      if (item?.image) return item.image;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Tomorrow's Meal Preparation Reminders */}
        {tomorrowReminders.length > 0 && (
          <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] text-white">
            <div className="px-4 sm:px-6 py-3">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Prepare for Tomorrow&apos;s Meals</h3>
                  <div className="space-y-2">
                    {tomorrowReminders.map(({ meal, mealType, prepNotes }, index) => (
                      <div key={index} className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{mealType}:</span>
                          <span>{meal.name}</span>
                        </div>
                        <div className="text-sm text-white/90 space-y-1">
                          {prepNotes.map((note, idx) => (
                            <p key={idx} className="pl-4 border-l-2 border-white/50">{note}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setTomorrowReminders([])}
                  className="text-white/80 hover:text-white p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header - only show on mobile */}
        <div className="md:hidden bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-soft">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="6" strokeWidth="1.5" />
                <circle cx="7" cy="9" r="2" strokeWidth="1.5" />
                <circle cx="17" cy="9" r="2" strokeWidth="1.5" />
                <circle cx="7" cy="15" r="2" strokeWidth="1.5" />
                <circle cx="17" cy="15" r="2" strokeWidth="1.5" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[var(--foreground)]">Meal Planner</span>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="bg-[var(--surface)] border-b border-[var(--border)]">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              {/* Left side - Date Navigation & Today */}
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 hover:bg-[var(--surface-secondary)] rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)] text-center">
                  {currentDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric',
                    ...(viewMode === 'day' && { day: 'numeric' })
                  })}
                </h2>
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 hover:bg-[var(--surface-secondary)] rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-sm bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] transition-colors"
                >
                  Today
                </button>
              </div>

              {/* Right side - View Mode & Auto */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
                <div className="flex items-center bg-[var(--surface-secondary)] rounded-xl p-1">
                  {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors capitalize ${
                        viewMode === mode
                          ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-soft'
                          : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAutoSuggest}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-dark)] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Auto
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 sm:px-6 py-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Calendar View */}
        <main className="flex-1 px-2 sm:px-4 md:px-6 py-4 sm:py-6">
          {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
            <span className="ml-3 text-[var(--text-muted)]">Loading...</span>
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-2xl shadow-soft-lg overflow-hidden">
            {viewMode === 'day' && (
              <DayView
                date={currentDate}
                calendar={calendar}
                meals={meals}
                mealItems={mealItems}
                onMealClick={handleMealClick}
                onAddMeal={handleAddMeal}
                onRemoveMeal={handleRemoveMeal}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                getMealItemNames={getMealItemNames}
                getMealImage={getMealImage}
              />
            )}
            {viewMode === 'week' && (
              <WeekView
                calendar={calendar}
                meals={meals}
                mealItems={mealItems}
                onMealClick={handleMealClick}
                onAddMeal={handleAddMeal}
                onRemoveMeal={handleRemoveMeal}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                getMealItemNames={getMealItemNames}
                getMealImage={getMealImage}
              />
            )}
            {viewMode === 'month' && (
              <MonthView
                calendar={calendar}
                meals={meals}
                mealItems={mealItems}
                currentDate={currentDate}
                onMealClick={handleMealClick}
                onAddMeal={handleAddMeal}
                getMealImage={getMealImage}
              />
            )}
          </div>
        )}
      </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Meal Selection Modal */}
      {showMealModal && (
        <MealSelectionModal
          meals={meals}
          mealItems={mealItems}
          mealType={selectedMealType}
          onSelectMeal={handleSelectMeal}
          onCreateNew={handleCreateNewMeal}
          onClose={() => setShowMealModal(false)}
          getMealItemNames={getMealItemNames}
          getMealImage={getMealImage}
        />
      )}
    </div>
  );
}

// Meal Selection Modal Component with Search and Sort
function MealSelectionModal({
  meals,
  mealItems,
  mealType,
  onSelectMeal,
  onCreateNew,
  onClose,
  getMealItemNames,
  getMealImage
}: {
  meals: Meal[];
  mealItems: MealItem[];
  mealType: 'breakfast' | 'lunch' | 'dinner';
  onSelectMeal: (mealId: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
  getMealItemNames: (meal: Meal) => string[];
  getMealImage: (meal: Meal) => string | null;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'recent'>('name');
  const [filterType, setFilterType] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'any'>('all');

  const mealTypeColors: Record<string, string> = {
    breakfast: 'bg-[var(--breakfast-bg)] text-[var(--breakfast-text)]',
    lunch: 'bg-[var(--lunch-bg)] text-[var(--lunch-text)]',
    dinner: 'bg-[var(--dinner-bg)] text-[var(--dinner-text)]',
    any: 'bg-purple-100 text-purple-700'
  };

  // Filter and sort meals
  const filteredMeals = meals
    .filter(m => {
      const itemNames = getMealItemNames(m);
      const matchesSearch = searchQuery === '' || 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        itemNames.some(name => name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = filterType === 'all' || m.meal_type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'type') return a.meal_type.localeCompare(b.meal_type);
      if (sortBy === 'recent') return b.created_at.localeCompare(a.created_at);
      return 0;
    });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-2xl shadow-soft-lg max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              Select {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--foreground)] p-1 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meals..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
                autoFocus
              />
            </div>

            {/* Filter by Type */}
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

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)]"
            >
              <option value="name">Sort: A-Z</option>
              <option value="type">Sort: Type</option>
              <option value="recent">Sort: Recent</option>
            </select>
          </div>
        </div>

        {/* Meal List */}
        <div className="flex-1 overflow-y-auto">
          {filteredMeals.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-[var(--border)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-[var(--text-muted)]">
                {searchQuery 
                  ? `No meals found matching "${searchQuery}"`
                  : 'No meals available'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filteredMeals.map((meal) => {
                const itemNames = getMealItemNames(meal);
                const mealImage = getMealImage(meal);
                return (
                  <div
                    key={meal.id}
                    onClick={() => onSelectMeal(meal.id)}
                    className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors"
                  >
                    {/* Thumbnail */}
                    {mealImage ? (
                      <img 
                        src={mealImage} 
                        alt={meal.name} 
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[var(--surface-secondary)] flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-[var(--border)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-[var(--foreground)] truncate">{meal.name}</h3>
                        <span className={`flex-shrink-0 w-2 h-2 rounded-full ${meal.is_veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] truncate">
                        {itemNames.length > 0 ? itemNames.join(', ') : 'No items'}
                      </p>
                    </div>

                    {/* Type Badge */}
                    <span className={`flex-shrink-0 px-2 py-1 text-xs rounded-lg capitalize ${mealTypeColors[meal.meal_type]}`}>
                      {meal.meal_type === 'any' ? 'Any' : meal.meal_type}
                    </span>

                    {/* Arrow */}
                    <svg className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-sm text-[var(--text-muted)]">
            {filteredMeals.length} meal{filteredMeals.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-[var(--surface-secondary)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onCreateNew}
              className="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] transition-colors"
            >
              + Create New
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Day View Component with Drag & Drop
function DayView({ 
  date, 
  calendar, 
  meals,
  mealItems,
  onMealClick, 
  onAddMeal, 
  onRemoveMeal,
  onDragStart,
  onDragOver,
  onDrop,
  getMealItemNames,
  getMealImage
}: {
  date: Date;
  calendar: CalendarDay[];
  meals: Meal[];
  mealItems: MealItem[];
  onMealClick: (mealId: string | undefined) => void;
  onAddMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onRemoveMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, mealId: string, date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  getMealItemNames: (meal: Meal) => string[];
  getMealImage: (meal: Meal) => string | null;
}) {
  const dateStr = date.toISOString().split('T')[0];
  const day = calendar.find(d => d.date === dateStr);
  
  const mealTypes: Array<'breakfast' | 'lunch' | 'dinner'> = ['breakfast', 'lunch', 'dinner'];
  const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

  const mealBgColors = {
    breakfast: 'bg-[var(--breakfast-bg)]',
    lunch: 'bg-[var(--lunch-bg)]',
    dinner: 'bg-[var(--dinner-bg)]'
  };

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-6">
        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </h3>
      <div className="space-y-4">
        {mealTypes.map((type) => {
          const mealId = day?.[type];
          const meal = meals.find(m => m.id === mealId);
          const itemNames = meal ? getMealItemNames(meal) : [];
          const mealImage = meal ? getMealImage(meal) : null;
          
          return (
            <div 
              key={type} 
              className="border border-[var(--border)] rounded-xl p-4"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, dateStr, type)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-medium text-[var(--foreground)]">{mealLabels[type]}</h4>
                {mealId ? (
                  <button
                    onClick={() => onRemoveMeal(dateStr, type)}
                    className="text-red-500 hover:text-red-600 text-sm"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => onAddMeal(dateStr, type)}
                    className="text-[var(--primary)] hover:text-[var(--primary-dark)] text-sm font-medium"
                  >
                    Add Meal
                  </button>
                )}
              </div>
              {meal ? (
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, mealId!, dateStr, type)}
                  onClick={() => onMealClick(mealId)}
                  className={`cursor-grab active:cursor-grabbing flex items-center gap-3 p-3 ${mealBgColors[type]} rounded-xl hover:opacity-80 transition-all`}
                >
                  {mealImage && (
                    <img src={mealImage} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)]">{meal.name}</p>
                    {itemNames.length > 0 && (
                      <p className="text-sm text-[var(--text-muted)] mt-1 truncate">
                        {itemNames.join(' + ')}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 border-2 border-dashed border-[var(--border)] rounded-xl text-center text-[var(--text-muted)]">
                  <p className="text-sm">Drop a meal here or click Add Meal</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week View Component with Drag & Drop
function WeekView({ 
  calendar, 
  meals, 
  mealItems,
  onMealClick, 
  onAddMeal, 
  onRemoveMeal,
  onDragStart,
  onDragOver,
  onDrop,
  getMealItemNames,
  getMealImage
}: {
  calendar: CalendarDay[];
  meals: Meal[];
  mealItems: MealItem[];
  onMealClick: (mealId: string | undefined) => void;
  onAddMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onRemoveMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, mealId: string, date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  getMealItemNames: (meal: Meal) => string[];
  getMealImage: (meal: Meal) => string | null;
}) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mealTypes: Array<'breakfast' | 'lunch' | 'dinner'> = ['breakfast', 'lunch', 'dinner'];
  const mealColors = { 
    breakfast: 'bg-[var(--breakfast-bg)]', 
    lunch: 'bg-[var(--lunch-bg)]', 
    dinner: 'bg-[var(--dinner-bg)]' 
  };
  const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

  return (
    <>
      {/* Mobile View - Vertical Cards */}
      <div className="block md:hidden space-y-3 p-4">
        {calendar.map((day) => {
          const date = new Date(day.date);
          const dayName = days[date.getDay()];
          const dayNumber = date.getDate();
          
          return (
            <div key={day.date} className="border border-[var(--border)] rounded-xl p-3 bg-[var(--surface)]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border)]">
                <span className="text-sm font-medium text-[var(--text-muted)]">{dayName}</span>
                <span className="text-base font-bold text-[var(--foreground)]">{dayNumber}</span>
              </div>
              
              <div className="space-y-2">
                {mealTypes.map((type) => {
                  const mealId = day[type];
                  const meal = meals.find(m => m.id === mealId);
                  const mealImage = meal ? getMealImage(meal) : null;
                  
                  return (
                    <div 
                      key={type} 
                      className="flex items-center gap-3"
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, day.date, type)}
                    >
                      <span className="text-xs text-[var(--text-muted)] w-8">{mealLabels[type].slice(0, 1)}</span>
                      {meal ? (
                        <div
                          draggable
                          onDragStart={(e) => onDragStart(e, mealId!, day.date, type)}
                          onClick={() => onMealClick(mealId)}
                          className={`flex-1 cursor-grab active:cursor-grabbing px-3 py-2 rounded-xl ${mealColors[type]} hover:opacity-80 transition-opacity flex items-center justify-between`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {mealImage && (
                              <img src={mealImage} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-[var(--foreground)] truncate">{meal.name}</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveMeal(day.date, type); }}
                            className="text-red-500 hover:text-red-600 ml-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddMeal(day.date, type)}
                          className="flex-1 px-3 py-2 text-sm text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl hover:border-[var(--primary-light)]"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-3 py-3 text-left text-sm font-medium text-[var(--text-muted)] border-b border-[var(--border)]"></th>
              {calendar.map((day) => {
                const date = new Date(day.date);
                const isToday = day.date === new Date().toISOString().split('T')[0];
                return (
                  <th key={day.date} className={`px-2 py-3 text-center text-sm font-medium border-b border-[var(--border)] min-w-[120px] ${isToday ? 'bg-[var(--primary-light)]/20' : ''}`}>
                    <div className="text-[var(--text-muted)]">{days[date.getDay()]}</div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>{date.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {mealTypes.map((type) => (
              <tr key={type} className="border-b border-[var(--border)]">
                <td className="px-3 py-2 text-sm font-medium text-[var(--text-muted)] capitalize">{mealLabels[type]}</td>
                {calendar.map((day) => {
                  const mealId = day[type];
                  const meal = meals.find(m => m.id === mealId);
                  const mealImage = meal ? getMealImage(meal) : null;
                  const isToday = day.date === new Date().toISOString().split('T')[0];
                  return (
                    <td 
                      key={`${day.date}-${type}`} 
                      className={`p-2 ${isToday ? 'bg-[var(--primary-light)]/10' : ''}`}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, day.date, type)}
                    >
                      {meal ? (
                        <div
                          draggable
                          onDragStart={(e) => onDragStart(e, mealId!, day.date, type)}
                          onClick={() => onMealClick(mealId)}
                          className={`group relative cursor-grab active:cursor-grabbing px-2 py-2 rounded-xl ${mealColors[type]} hover:opacity-90 transition-opacity`}
                        >
                          <div className="flex items-center gap-2">
                            {mealImage && (
                              <img src={mealImage} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <p className="text-sm font-medium text-[var(--foreground)] truncate pr-4 flex-1">{meal.name}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveMeal(day.date, type); }}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddMeal(day.date, type)}
                          className="w-full px-2 py-3 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] border border-dashed border-[var(--border)] rounded-xl hover:border-[var(--primary-light)] transition-colors"
                        >
                          + Add
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Month View Component
function MonthView({ 
  calendar, 
  meals,
  mealItems,
  currentDate, 
  onMealClick, 
  onAddMeal,
  getMealImage
}: {
  calendar: CalendarDay[];
  meals: Meal[];
  mealItems: MealItem[];
  currentDate: Date;
  onMealClick: (mealId: string | undefined) => void;
  onAddMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  getMealImage: (meal: Meal) => string | null;
}) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  
  for (let d = new Date(startDate); d <= lastDay || currentWeek.length > 0; d.setDate(d.getDate() + 1)) {
    currentWeek.push(d.toISOString().split('T')[0]);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-7 gap-3 mb-4">
        {days.map(day => (
          <div key={day} className="p-2 text-center text-sm font-semibold text-[var(--text-muted)]">
            {day}
          </div>
        ))}
      </div>
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 gap-3 mb-3">
          {week.map((dateStr) => {
            const date = new Date(dateStr);
            const day = calendar.find(d => d.date === dateStr);
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            
            return (
              <div
                key={dateStr}
                className={`min-h-[110px] p-3 border border-[var(--border)] rounded-xl ${
                  !isCurrentMonth ? 'opacity-50' : ''
                } ${isToday ? 'ring-2 ring-[var(--primary)]' : ''}`}
              >
                <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1.5">
                  {day?.breakfast && (() => {
                    const meal = meals.find(m => m.id === day.breakfast);
                    const image = meal ? getMealImage(meal) : null;
                    return (
                      <div
                        onClick={() => onMealClick(day.breakfast)}
                        className="flex items-center gap-1.5 text-xs p-1.5 bg-[var(--breakfast-bg)] rounded-lg cursor-pointer hover:opacity-80 text-[var(--breakfast-text)]"
                      >
                        {image && <img src={image} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />}
                        <span className="truncate">{meal?.name || 'Breakfast'}</span>
                      </div>
                    );
                  })()}
                  {day?.lunch && (() => {
                    const meal = meals.find(m => m.id === day.lunch);
                    const image = meal ? getMealImage(meal) : null;
                    return (
                      <div
                        onClick={() => onMealClick(day.lunch)}
                        className="flex items-center gap-1.5 text-xs p-1.5 bg-[var(--lunch-bg)] rounded-lg cursor-pointer hover:opacity-80 text-[var(--lunch-text)]"
                      >
                        {image && <img src={image} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />}
                        <span className="truncate">{meal?.name || 'Lunch'}</span>
                      </div>
                    );
                  })()}
                  {day?.dinner && (() => {
                    const meal = meals.find(m => m.id === day.dinner);
                    const image = meal ? getMealImage(meal) : null;
                    return (
                      <div
                        onClick={() => onMealClick(day.dinner)}
                        className="flex items-center gap-1.5 text-xs p-1.5 bg-[var(--dinner-bg)] rounded-lg cursor-pointer hover:opacity-80 text-[var(--dinner-text)]"
                      >
                        {image && <img src={image} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />}
                        <span className="truncate">{meal?.name || 'Dinner'}</span>
                      </div>
                    );
                  })()}
                  {(!day?.breakfast || !day?.lunch || !day?.dinner) && (
                    <button
                      onClick={() => onAddMeal(dateStr, 'breakfast')}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)]"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
