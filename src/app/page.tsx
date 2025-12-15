'use client';

import { useState, useEffect, useCallback, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mealService, calendarService } from '@/lib/database';
import type { Meal, CalendarDay } from '@/lib/supabase';
import AppBar from '@/components/AppBar';

export const dynamic = 'force-dynamic';

type ViewMode = 'day' | 'week' | 'month';

export default function Home() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
  const [tomorrowReminders, setTomorrowReminders] = useState<{ meal: Meal; mealType: string }[]>([]);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load meals
      const mealsData = await mealService.getAll();
      setMeals(mealsData);

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
      await loadTomorrowReminders(mealsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

  const loadTomorrowReminders = async (mealsData: Meal[]) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const tomorrowData = await calendarService.getByDate(tomorrowStr);
      
      if (tomorrowData) {
        const reminders: { meal: Meal; mealType: string }[] = [];
        
        const checkMeal = (mealId: string | undefined, mealType: string) => {
          if (mealId) {
            const meal = mealsData.find(m => m.id === mealId);
            if (meal?.prep_notes) {
              reminders.push({ meal, mealType });
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
    // Simple auto-suggest: randomly assign available meals to empty slots
    try {
      const breakfastMeals = meals.filter(m => m.type === 'breakfast');
      const lunchMeals = meals.filter(m => m.type === 'lunch');
      const dinnerMeals = meals.filter(m => m.type === 'dinner');

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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Tomorrow's Meal Preparation Reminders */}
      {tomorrowReminders.length > 0 && (
        <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] text-white">
          <div className="container mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">🔔 Prepare for Tomorrow&apos;s Meals</h3>
                <div className="space-y-2">
                  {tomorrowReminders.map(({ meal, mealType }, index) => (
                    <div key={index} className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{mealType}:</span>
                        <span>{meal.name}</span>
                      </div>
                      <p className="text-sm text-white/90 pl-4 border-l-2 border-white/50">
                        {meal.prep_notes}
                      </p>
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

      {/* App Bar */}
      <AppBar
        rightContent={
          <>
            <button
              onClick={goToToday}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleAutoSuggest}
              className="hidden sm:block px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-dark)] transition-colors"
            >
              Auto Suggest
            </button>
            <Link
              href="/meals"
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-[var(--surface-secondary)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors text-center"
            >
              <span className="hidden sm:inline">Manage Meals</span>
              <span className="sm:hidden">Meals</span>
            </Link>
          </>
        }
      />

      {/* Calendar Controls */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-[var(--surface-secondary)] rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)] text-center sm:text-left">
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
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 bg-[var(--surface-secondary)] rounded-xl p-1 w-full sm:w-auto justify-center">
              {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors capitalize flex-1 sm:flex-none ${
                    viewMode === mode
                      ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-soft'
                      : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Calendar View */}
      <main className="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
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
                onMealClick={handleMealClick}
                onAddMeal={handleAddMeal}
                onRemoveMeal={handleRemoveMeal}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            )}
            {viewMode === 'week' && (
              <WeekView
                calendar={calendar}
                meals={meals}
                onMealClick={handleMealClick}
                onAddMeal={handleAddMeal}
                onRemoveMeal={handleRemoveMeal}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            )}
            {viewMode === 'month' && (
              <MonthView
                calendar={calendar}
                meals={meals}
                currentDate={currentDate}
                onMealClick={handleMealClick}
                onAddMeal={handleAddMeal}
              />
            )}
          </div>
        )}
      </main>

      {/* Meal Selection Modal */}
      {showMealModal && (
        <MealSelectionModal
          meals={meals}
          mealType={selectedMealType}
          onSelectMeal={handleSelectMeal}
          onCreateNew={handleCreateNewMeal}
          onClose={() => setShowMealModal(false)}
        />
      )}
    </div>
  );
}

// Meal Selection Modal Component with Search
function MealSelectionModal({
  meals,
  mealType,
  onSelectMeal,
  onCreateNew,
  onClose
}: {
  meals: Meal[];
  mealType: 'breakfast' | 'lunch' | 'dinner';
  onSelectMeal: (mealId: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllMeals, setShowAllMeals] = useState(false);

  // Filter meals based on search and type
  const filteredMeals = meals.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = showAllMeals || m.type === mealType;
    return matchesSearch && matchesType;
  });

  // Group meals by type when showing all
  const groupedMeals = showAllMeals ? {
    breakfast: filteredMeals.filter(m => m.type === 'breakfast'),
    lunch: filteredMeals.filter(m => m.type === 'lunch'),
    dinner: filteredMeals.filter(m => m.type === 'dinner')
  } : { [mealType]: filteredMeals };

  const mealTypeColors = {
    breakfast: 'bg-[var(--breakfast-bg)] text-[var(--breakfast-text)]',
    lunch: 'bg-[var(--lunch-bg)] text-[var(--lunch-text)]',
    dinner: 'bg-[var(--dinner-bg)] text-[var(--dinner-text)]'
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-2xl shadow-soft-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              Select {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Meal
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

          {/* Search Input */}
          <div className="relative mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meals by name or ingredient..."
              className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent bg-[var(--surface-secondary)] text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
              autoFocus
            />
          </div>

          {/* Toggle to show all meals */}
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={showAllMeals}
              onChange={(e) => setShowAllMeals(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            Show all meals (not just {mealType})
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filteredMeals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--text-muted)] mb-4">
                {searchQuery 
                  ? `No meals found matching "${searchQuery}"`
                  : `No ${mealType} meals available. Create one now!`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMeals).map(([type, typeMeals]) => (
                typeMeals.length > 0 && (
                  <div key={type}>
                    {showAllMeals && (
                      <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                        {type}
                      </h3>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {typeMeals.map((meal) => (
                        <div
                          key={meal.id}
                          onClick={() => onSelectMeal(meal.id)}
                          className="p-4 border border-[var(--border)] rounded-xl cursor-pointer hover:bg-[var(--surface-secondary)] hover:border-[var(--primary-light)] transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-[var(--foreground)]">{meal.name}</h3>
                            {showAllMeals && (
                              <span className={`px-2 py-0.5 text-xs rounded-lg capitalize ${mealTypeColors[meal.type]}`}>
                                {meal.type}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {meal.ingredients.slice(0, 3).map((ing, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs bg-[var(--surface-secondary)] text-[var(--text-muted)] rounded-lg"
                              >
                                {ing}
                              </span>
                            ))}
                            {meal.ingredients.length > 3 && (
                              <span className="px-2 py-1 text-xs text-[var(--text-muted)]">
                                +{meal.ingredients.length - 3} more
                              </span>
                            )}
                          </div>
                          {meal.prep_notes && (
                            <div className="mt-2 text-xs text-[var(--accent)] flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                              Has prep notes
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3">
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
            + Create New Meal
          </button>
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
  onMealClick, 
  onAddMeal, 
  onRemoveMeal,
  onDragStart,
  onDragOver,
  onDrop
}: {
  date: Date;
  calendar: CalendarDay[];
  meals: Meal[];
  onMealClick: (mealId: string | undefined) => void;
  onAddMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onRemoveMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, mealId: string, date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
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
                  className={`cursor-grab active:cursor-grabbing p-3 ${mealBgColors[type]} rounded-xl hover:opacity-80 transition-all`}
                >
                  <p className="font-medium text-[var(--foreground)]">{meal.name}</p>
                  {meal.prep_notes && (
                    <p className="text-xs text-[var(--accent)] mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {meal.prep_notes}
                    </p>
                  )}
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
  onMealClick, 
  onAddMeal, 
  onRemoveMeal,
  onDragStart,
  onDragOver,
  onDrop
}: {
  calendar: CalendarDay[];
  meals: Meal[];
  onMealClick: (mealId: string | undefined) => void;
  onAddMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onRemoveMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, mealId: string, date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
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
      <div className="block md:hidden space-y-4 p-4">
        {calendar.map((day) => {
          const date = new Date(day.date);
          const dayName = days[date.getDay()];
          const dayNumber = date.getDate();
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });
          
          return (
            <div key={day.date} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)]">
              <div className="mb-4 pb-3 border-b border-[var(--border)]">
                <div className="text-sm font-semibold text-[var(--text-muted)]">{dayName}</div>
                <div className="text-lg font-bold text-[var(--foreground)]">{monthName} {dayNumber}</div>
              </div>
              
              <div className="space-y-3">
                {mealTypes.map((type) => {
                  const mealId = day[type];
                  const meal = meals.find(m => m.id === mealId);
                  
                  return (
                    <div 
                      key={type} 
                      className="border border-[var(--border)] rounded-xl p-3"
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, day.date, type)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[var(--foreground)] capitalize">
                          {mealLabels[type]}
                        </span>
                        {mealId && (
                          <button
                            onClick={() => onRemoveMeal(day.date, type)}
                            className="text-xs text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {meal ? (
                        <div
                          draggable
                          onDragStart={(e) => onDragStart(e, mealId!, day.date, type)}
                          onClick={() => onMealClick(mealId)}
                          className={`cursor-grab active:cursor-grabbing p-2 rounded-xl ${mealColors[type]} hover:opacity-80 transition-opacity`}
                        >
                          <p className="text-sm font-medium text-[var(--foreground)]">{meal.name}</p>
                          {meal.prep_notes && (
                            <p className="text-xs text-[var(--accent)] mt-1 flex items-center gap-1">
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                              <span className="truncate">{meal.prep_notes}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddMeal(day.date, type)}
                          className="w-full p-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] border-2 border-dashed border-[var(--border)] rounded-xl hover:border-[var(--primary-light)] transition-colors"
                        >
                          + Add {mealLabels[type]}
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
              <th className="p-4 text-left text-sm font-medium text-[var(--text-muted)] border-b border-[var(--border)]">Time</th>
              {calendar.map((day) => {
                const date = new Date(day.date);
                return (
                  <th key={day.date} className="p-4 text-center text-sm font-medium text-[var(--text-muted)] border-b border-[var(--border)] min-w-[120px]">
                    <div>{days[date.getDay()]}</div>
                    <div className="text-lg font-semibold text-[var(--foreground)]">{date.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {mealTypes.map((type) => (
              <tr key={type} className="border-b border-[var(--border)]">
                <td className="p-4 font-medium text-[var(--foreground)] capitalize">{type}</td>
                {calendar.map((day) => {
                  const mealId = day[type];
                  const meal = meals.find(m => m.id === mealId);
                  return (
                    <td 
                      key={`${day.date}-${type}`} 
                      className="p-2"
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, day.date, type)}
                    >
                      {meal ? (
                        <div
                          draggable
                          onDragStart={(e) => onDragStart(e, mealId!, day.date, type)}
                          onClick={() => onMealClick(mealId)}
                          className={`cursor-grab active:cursor-grabbing p-2 rounded-xl ${mealColors[type]} hover:opacity-80 transition-opacity`}
                        >
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">{meal.name}</p>
                          {meal.prep_notes && (
                            <p className="text-xs text-[var(--accent)] mt-1 flex items-center gap-1" title={meal.prep_notes}>
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                              <span className="truncate max-w-[80px]">{meal.prep_notes}</span>
                            </p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveMeal(day.date, type);
                            }}
                            className="text-xs text-red-500 hover:text-red-600 mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddMeal(day.date, type)}
                          className="w-full p-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] border-2 border-dashed border-[var(--border)] rounded-xl hover:border-[var(--primary-light)] transition-colors min-h-[60px]"
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
  currentDate, 
  onMealClick, 
  onAddMeal
}: {
  calendar: CalendarDay[];
  meals: Meal[];
  currentDate: Date;
  onMealClick: (mealId: string | undefined) => void;
  onAddMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
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
      <div className="grid grid-cols-7 gap-2 mb-4">
        {days.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-[var(--text-muted)]">
            {day}
          </div>
        ))}
      </div>
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 gap-2">
          {week.map((dateStr) => {
            const date = new Date(dateStr);
            const day = calendar.find(d => d.date === dateStr);
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            
            return (
              <div
                key={dateStr}
                className={`min-h-[100px] p-2 border border-[var(--border)] rounded-xl ${
                  !isCurrentMonth ? 'opacity-50' : ''
                } ${isToday ? 'ring-2 ring-[var(--primary)]' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {day?.breakfast && (
                    <div
                      onClick={() => onMealClick(day.breakfast)}
                      className="text-xs p-1 bg-[var(--breakfast-bg)] rounded-lg cursor-pointer hover:opacity-80 truncate text-[var(--breakfast-text)]"
                    >
                      {meals.find(m => m.id === day.breakfast)?.name || 'Breakfast'}
                    </div>
                  )}
                  {day?.lunch && (
                    <div
                      onClick={() => onMealClick(day.lunch)}
                      className="text-xs p-1 bg-[var(--lunch-bg)] rounded-lg cursor-pointer hover:opacity-80 truncate text-[var(--lunch-text)]"
                    >
                      {meals.find(m => m.id === day.lunch)?.name || 'Lunch'}
                    </div>
                  )}
                  {day?.dinner && (
                    <div
                      onClick={() => onMealClick(day.dinner)}
                      className="text-xs p-1 bg-[var(--dinner-bg)] rounded-lg cursor-pointer hover:opacity-80 truncate text-[var(--dinner-text)]"
                    >
                      {meals.find(m => m.id === day.dinner)?.name || 'Dinner'}
                    </div>
                  )}
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
