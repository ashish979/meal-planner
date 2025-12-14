'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mealService, calendarService } from '@/lib/database';
import type { Meal, CalendarDay } from '@/lib/supabase';

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Meal Planner</h1>
              <button
                onClick={goToToday}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Today
              </button>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <button
                onClick={handleAutoSuggest}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <span className="hidden sm:inline">Auto Suggest Week</span>
                <span className="sm:hidden">Auto Suggest</span>
              </button>
              <Link
                href="/meals"
                className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-center"
              >
                Manage Meals
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Calendar Controls */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white text-center sm:text-left">
                {currentDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric',
                  ...(viewMode === 'day' && { day: 'numeric' })
                })}
              </h2>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-full sm:w-auto justify-center">
              {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors capitalize flex-1 sm:flex-none ${
                    viewMode === mode
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
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
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Calendar View */}
      <main className="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading...</span>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {viewMode === 'day' && (
              <DayView
                date={currentDate}
                calendar={calendar}
                meals={meals}
                onMealClick={handleMealClick}
                onAddMeal={handleAddMeal}
                onRemoveMeal={handleRemoveMeal}
              />
            )}
            {viewMode === 'week' && (
              <WeekView
                calendar={calendar}
                meals={meals}
                onMealClick={handleMealClick}
                onAddMeal={handleAddMeal}
                onRemoveMeal={handleRemoveMeal}
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

// Meal Selection Modal Component
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
  const filteredMeals = meals.filter(m => m.type === mealType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Select {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Meal
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filteredMeals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No {mealType} meals available. Create one now!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMeals.map((meal) => (
                <div
                  key={meal.id}
                  onClick={() => onSelectMeal(meal.id)}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{meal.name}</h3>
                  <div className="flex flex-wrap gap-1">
                    {meal.ingredients.slice(0, 3).map((ing, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {ing}
                      </span>
                    ))}
                    {meal.ingredients.length > 3 && (
                      <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                        +{meal.ingredients.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create New Meal
          </button>
        </div>
      </div>
    </div>
  );
}

// Day View Component
function DayView({ 
  date, 
  calendar, 
  meals, 
  onMealClick, 
  onAddMeal, 
  onRemoveMeal 
}: {
  date: Date;
  calendar: CalendarDay[];
  meals: Meal[];
  onMealClick: (mealId: string | undefined) => void;
  onAddMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onRemoveMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
}) {
  const dateStr = date.toISOString().split('T')[0];
  const day = calendar.find(d => d.date === dateStr);
  
  const mealTypes: Array<'breakfast' | 'lunch' | 'dinner'> = ['breakfast', 'lunch', 'dinner'];
  const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </h3>
      <div className="space-y-4">
        {mealTypes.map((type) => {
          const mealId = day?.[type];
          const meal = meals.find(m => m.id === mealId);
          
          return (
            <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{mealLabels[type]}</h4>
                {mealId ? (
                  <button
                    onClick={() => onRemoveMeal(dateStr, type)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => onAddMeal(dateStr, type)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Add Meal
                  </button>
                )}
              </div>
              {meal ? (
                <div
                  onClick={() => onMealClick(mealId)}
                  className="cursor-pointer p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <p className="font-medium text-gray-900 dark:text-white">{meal.name}</p>
                </div>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 text-sm">No meal scheduled</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ 
  calendar, 
  meals, 
  onMealClick, 
  onAddMeal, 
  onRemoveMeal 
}: {
  calendar: CalendarDay[];
  meals: Meal[];
  onMealClick: (mealId: string | undefined) => void;
  onAddMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  onRemoveMeal: (date: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
}) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mealTypes: Array<'breakfast' | 'lunch' | 'dinner'> = ['breakfast', 'lunch', 'dinner'];
  const mealColors = { breakfast: 'bg-yellow-100 dark:bg-yellow-900/30', lunch: 'bg-green-100 dark:bg-green-900/30', dinner: 'bg-blue-100 dark:bg-blue-900/30' };
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
            <div key={day.date} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-600">
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">{dayName}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{monthName} {dayNumber}</div>
              </div>
              
              <div className="space-y-3">
                {mealTypes.map((type) => {
                  const mealId = day[type];
                  const meal = meals.find(m => m.id === mealId);
                  
                  return (
                    <div key={type} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {mealLabels[type]}
                        </span>
                        {mealId && (
                          <button
                            onClick={() => onRemoveMeal(day.date, type)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {meal ? (
                        <div
                          onClick={() => onMealClick(mealId)}
                          className={`cursor-pointer p-2 rounded-lg ${mealColors[type]} hover:opacity-80 transition-opacity`}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{meal.name}</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddMeal(day.date, type)}
                          className="w-full p-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
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
              <th className="p-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">Time</th>
              {calendar.map((day) => {
                const date = new Date(day.date);
                return (
                  <th key={day.date} className="p-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 min-w-[120px]">
                    <div>{days[date.getDay()]}</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{date.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {mealTypes.map((type) => (
              <tr key={type} className="border-b border-gray-200 dark:border-gray-700">
                <td className="p-4 font-medium text-gray-900 dark:text-white capitalize">{type}</td>
                {calendar.map((day) => {
                  const mealId = day[type];
                  const meal = meals.find(m => m.id === mealId);
                  return (
                    <td key={`${day.date}-${type}`} className="p-2">
                      {meal ? (
                        <div
                          onClick={() => onMealClick(mealId)}
                          className={`cursor-pointer p-2 rounded-lg ${mealColors[type]} hover:opacity-80 transition-opacity`}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{meal.name}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveMeal(day.date, type);
                            }}
                            className="text-xs text-red-600 hover:text-red-800 mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddMeal(day.date, type)}
                          className="w-full p-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
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
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
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
                className={`min-h-[100px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg ${
                  !isCurrentMonth ? 'opacity-50' : ''
                } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {day?.breakfast && (
                    <div
                      onClick={() => onMealClick(day.breakfast)}
                      className="text-xs p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded cursor-pointer hover:opacity-80 truncate"
                    >
                      {meals.find(m => m.id === day.breakfast)?.name || 'Breakfast'}
                    </div>
                  )}
                  {day?.lunch && (
                    <div
                      onClick={() => onMealClick(day.lunch)}
                      className="text-xs p-1 bg-green-100 dark:bg-green-900/30 rounded cursor-pointer hover:opacity-80 truncate"
                    >
                      {meals.find(m => m.id === day.lunch)?.name || 'Lunch'}
                    </div>
                  )}
                  {day?.dinner && (
                    <div
                      onClick={() => onMealClick(day.dinner)}
                      className="text-xs p-1 bg-blue-100 dark:bg-blue-900/30 rounded cursor-pointer hover:opacity-80 truncate"
                    >
                      {meals.find(m => m.id === day.dinner)?.name || 'Dinner'}
                    </div>
                  )}
                  {(!day?.breakfast || !day?.lunch || !day?.dinner) && (
                    <button
                      onClick={() => onAddMeal(dateStr, 'breakfast')}
                      className="text-xs text-gray-400 hover:text-gray-600"
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
