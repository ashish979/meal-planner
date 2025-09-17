'use client';

import { useState, useEffect } from 'react';

type Ingredient = {
  id: string;
  name: string;
  category: string;
};

type Meal = {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner';
  ingredients: string[];
};

type CalendarDay = {
  date: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
};

export default function Home() {
  const [activeSection, setActiveSection] = useState<'ingredients' | 'meals' | 'calendar'>('ingredients');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Ingredients state
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: '1', name: 'Eggs', category: 'Protein' },
    { id: '2', name: 'Bread', category: 'Carbs' },
    { id: '3', name: 'Milk', category: 'Dairy' },
    { id: '4', name: 'Chicken', category: 'Protein' },
    { id: '5', name: 'Rice', category: 'Carbs' },
    { id: '6', name: 'Vegetables', category: 'Vegetables' },
  ]);
  
  // Meals state
  const [meals, setMeals] = useState<Meal[]>([
    { id: '1', name: 'Scrambled Eggs', type: 'breakfast', ingredients: ['1', '3'] },
    { id: '2', name: 'Chicken Rice Bowl', type: 'lunch', ingredients: ['4', '5', '6'] },
    { id: '3', name: 'Grilled Chicken', type: 'dinner', ingredients: ['4', '6'] },
  ]);
  
  // Calendar state
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  
  // Form states
  const [newIngredient, setNewIngredient] = useState({ name: '', category: '' });
  const [newMeal, setNewMeal] = useState<{ name: string; type: 'breakfast' | 'lunch' | 'dinner'; ingredients: string[] }>({ name: '', type: 'breakfast', ingredients: [] });

  // Generate calendar for current week
  const generateWeekCalendar = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push({
        date: date.toISOString().split('T')[0],
        breakfast: undefined,
        lunch: undefined,
        dinner: undefined,
      });
    }
    setCalendar(week);
  };

  // Initialize calendar on component mount
  useEffect(() => {
    if (calendar.length === 0) {
      generateWeekCalendar();
    }
  }, [calendar.length]);

  const addIngredient = () => {
    if (newIngredient.name && newIngredient.category) {
      const ingredient: Ingredient = {
        id: Date.now().toString(),
        name: newIngredient.name,
        category: newIngredient.category,
      };
      setIngredients([...ingredients, ingredient]);
      setNewIngredient({ name: '', category: '' });
    }
  };

  const deleteIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
    // Also remove from meals
    setMeals(meals.map(meal => ({
      ...meal,
      ingredients: meal.ingredients.filter(ingId => ingId !== id)
    })));
  };

  const addMeal = () => {
    if (newMeal.name) {
      const meal: Meal = {
        id: Date.now().toString(),
        name: newMeal.name,
        type: newMeal.type,
        ingredients: newMeal.ingredients,
      };
      setMeals([...meals, meal]);
      setNewMeal({ name: '', type: 'breakfast', ingredients: [] });
    }
  };

  const deleteMeal = (id: string) => {
    setMeals(meals.filter(meal => meal.id !== id));
  };

  // const toggleMealIngredient = (mealId: string, ingredientId: string) => {
  //   setMeals(meals.map(meal => {
  //     if (meal.id === mealId) {
  //       const hasIngredient = meal.ingredients.includes(ingredientId);
  //       return {
  //         ...meal,
  //         ingredients: hasIngredient 
  //           ? meal.ingredients.filter(id => id !== ingredientId)
  //           : [...meal.ingredients, ingredientId]
  //       };
  //     }
  //     return meal;
  //   }));
  // };

  const assignMealToCalendar = (date: string, mealType: 'breakfast' | 'lunch' | 'dinner', mealId: string) => {
    setCalendar(calendar.map(day => {
      if (day.date === date) {
        return { ...day, [mealType]: mealId };
      }
      return day;
    }));
  };

  const getIngredientName = (id: string) => {
    return ingredients.find(ing => ing.id === id)?.name || 'Unknown';
  };

  // const getMealName = (id: string) => {
  //   return meals.find(meal => meal.id === id)?.name || 'Unknown';
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <nav className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">Meal Planner</span>
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => setActiveSection('ingredients')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'ingredients'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Ingredients
              </button>
              <button
                onClick={() => setActiveSection('meals')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'meals'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Meals
              </button>
              <button
                onClick={() => setActiveSection('calendar')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeSection === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Calendar
              </button>
            </div>
          </nav>
          
          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex flex-col space-y-2 pt-4">
                <button
                  onClick={() => {
                    setActiveSection('ingredients');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors text-left ${
                    activeSection === 'ingredients'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Ingredients
                </button>
                <button
                  onClick={() => {
                    setActiveSection('meals');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors text-left ${
                    activeSection === 'meals'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Meals
                </button>
                <button
                  onClick={() => {
                    setActiveSection('calendar');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors text-left ${
                    activeSection === 'calendar'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Calendar
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Ingredients Section */}
        {activeSection === 'ingredients' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Kitchen Ingredients</h2>
            
            {/* Add Ingredient Form */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Add New Ingredient</h3>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <input
                  type="text"
                  placeholder="Ingredient name"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm sm:text-base"
                />
                <input
                  type="text"
                  placeholder="Category (e.g., Protein, Carbs)"
                  value={newIngredient.category}
                  onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value })}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm sm:text-base"
                />
                <button
                  onClick={addIngredient}
                  className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Ingredients Table - Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base">{ingredient.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{ingredient.category}</p>
                    </div>
                    <button
                      onClick={() => deleteIngredient(ingredient.id)}
                      className="text-red-600 hover:text-red-800 transition-colors text-sm font-medium ml-3"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Ingredients Table - Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient) => (
                    <tr key={ingredient.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{ingredient.name}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{ingredient.category}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => deleteIngredient(ingredient.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Meals Section */}
        {activeSection === 'meals' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Meal Options</h2>
            
            {/* Add Meal Form */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Add New Meal</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <input
                    type="text"
                    placeholder="Meal name"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                    className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm sm:text-base"
                  />
                  <select
                    value={newMeal.type}
                    onChange={(e) => {
                      const value = e.target.value as 'breakfast' | 'lunch' | 'dinner';
                      setNewMeal({ ...newMeal, type: value });
                    }}
                    className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm sm:text-base"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                  <button
                    onClick={addMeal}
                    className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
                  >
                    Add Meal
                  </button>
                </div>
                
                {/* Ingredient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Ingredients:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ingredients.map((ingredient) => (
                      <label key={ingredient.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newMeal.ingredients.includes(ingredient.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewMeal({ ...newMeal, ingredients: [...newMeal.ingredients, ingredient.id] });
                            } else {
                              setNewMeal({ ...newMeal, ingredients: newMeal.ingredients.filter(id => id !== ingredient.id) });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{ingredient.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Meals Display */}
            <div className="space-y-4 sm:space-y-6">
              {['breakfast', 'lunch', 'dinner'].map((mealType) => (
                <div key={mealType}>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 capitalize">
                    {mealType} Options
                  </h3>
                  
                  {/* Mobile Card View */}
                  <div className="block sm:hidden space-y-3">
                    {meals
                      .filter(meal => meal.type === mealType)
                      .map((meal) => (
                        <div key={meal.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-base">{meal.name}</h4>
                            <button
                              onClick={() => deleteMeal(meal.id)}
                              className="text-red-600 hover:text-red-800 transition-colors text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {meal.ingredients.map((ingredientId) => (
                              <span
                                key={ingredientId}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full"
                              >
                                {getIngredientName(ingredientId)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Ingredients</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meals
                          .filter(meal => meal.type === mealType)
                          .map((meal) => (
                            <tr key={meal.id} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="py-3 px-4 text-gray-900 dark:text-white">{meal.name}</td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {meal.ingredients.map((ingredientId) => (
                                    <span
                                      key={ingredientId}
                                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full"
                                    >
                                      {getIngredientName(ingredientId)}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => deleteMeal(meal.id)}
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Section */}
        {activeSection === 'calendar' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Weekly Meal Calendar</h2>
            
            {/* Mobile Calendar - Vertical Stack */}
            <div className="block sm:hidden space-y-4">
              {calendar.map((day) => {
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                const dayNumber = date.getDate();
                const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                
                return (
                  <div key={day.date} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="text-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-600">
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">{dayName}</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{monthName} {dayNumber}</div>
                    </div>
                    
                    {/* Breakfast */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Breakfast
                      </label>
                      <select
                        value={day.breakfast || ''}
                        onChange={(e) => assignMealToCalendar(day.date, 'breakfast', e.target.value)}
                        className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select meal</option>
                        {meals
                          .filter(meal => meal.type === 'breakfast')
                          .map(meal => (
                            <option key={meal.id} value={meal.id}>{meal.name}</option>
                          ))}
                      </select>
                    </div>
                    
                    {/* Lunch */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Lunch
                      </label>
                      <select
                        value={day.lunch || ''}
                        onChange={(e) => assignMealToCalendar(day.date, 'lunch', e.target.value)}
                        className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select meal</option>
                        {meals
                          .filter(meal => meal.type === 'lunch')
                          .map(meal => (
                            <option key={meal.id} value={meal.id}>{meal.name}</option>
                          ))}
                      </select>
                    </div>
                    
                    {/* Dinner */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Dinner
                      </label>
                      <select
                        value={day.dinner || ''}
                        onChange={(e) => assignMealToCalendar(day.date, 'dinner', e.target.value)}
                        className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select meal</option>
                        {meals
                          .filter(meal => meal.type === 'dinner')
                          .map(meal => (
                            <option key={meal.id} value={meal.id}>{meal.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Calendar - Grid Layout */}
            <div className="hidden sm:grid grid-cols-7 gap-4">
              {calendar.map((day) => {
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNumber = date.getDate();
                
                return (
                  <div key={day.date} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <div className="text-center mb-3">
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">{dayName}</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{dayNumber}</div>
                    </div>
                    
                    {/* Breakfast */}
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Breakfast
                      </label>
                      <select
                        value={day.breakfast || ''}
                        onChange={(e) => assignMealToCalendar(day.date, 'breakfast', e.target.value)}
                        className="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select meal</option>
                        {meals
                          .filter(meal => meal.type === 'breakfast')
                          .map(meal => (
                            <option key={meal.id} value={meal.id}>{meal.name}</option>
                          ))}
                      </select>
                    </div>
                    
                    {/* Lunch */}
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Lunch
                      </label>
                      <select
                        value={day.lunch || ''}
                        onChange={(e) => assignMealToCalendar(day.date, 'lunch', e.target.value)}
                        className="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select meal</option>
                        {meals
                          .filter(meal => meal.type === 'lunch')
                          .map(meal => (
                            <option key={meal.id} value={meal.id}>{meal.name}</option>
                          ))}
                      </select>
                    </div>
                    
                    {/* Dinner */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Dinner
                      </label>
                      <select
                        value={day.dinner || ''}
                        onChange={(e) => assignMealToCalendar(day.date, 'dinner', e.target.value)}
                        className="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select meal</option>
                        {meals
                          .filter(meal => meal.type === 'dinner')
                          .map(meal => (
                            <option key={meal.id} value={meal.id}>{meal.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
