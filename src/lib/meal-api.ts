// Meal API integration for auto-fetching meal data
// You can integrate with Edamam, Spoonacular, or other meal APIs

export interface MealApiResponse {
  name: string;
  ingredients: string[];
  image?: string;
  type: 'breakfast' | 'lunch' | 'dinner';
  isVeg: boolean;
}

// Simple classification based on meal name patterns
const classifyMealType = (mealName: string): 'breakfast' | 'lunch' | 'dinner' => {
  const name = mealName.toLowerCase();
  
  // Breakfast patterns
  if (name.includes('egg') || name.includes('cereal') || name.includes('pancake') || 
      name.includes('waffle') || name.includes('toast') || name.includes('oatmeal') ||
      name.includes('breakfast') || name.includes('bagel') || name.includes('muffin')) {
    return 'breakfast';
  }
  
  // Dinner patterns (heavier meals)
  if (name.includes('steak') || name.includes('roast') || name.includes('grilled') ||
      name.includes('dinner') || name.includes('pasta') || name.includes('lasagna')) {
    return 'dinner';
  }
  
  // Default to lunch
  return 'lunch';
};

// Simple ingredient extraction (can be enhanced with API)
const extractIngredients = (mealName: string): string[] => {
  const name = mealName.toLowerCase();
  const ingredients: string[] = [];
  
  // Common ingredient patterns
  const commonIngredients = [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp',
    'rice', 'pasta', 'bread', 'potato', 'tomato', 'onion', 'garlic',
    'cheese', 'milk', 'egg', 'butter', 'oil', 'salt', 'pepper',
    'vegetables', 'lettuce', 'carrot', 'broccoli', 'spinach'
  ];
  
  commonIngredients.forEach(ing => {
    if (name.includes(ing)) {
      ingredients.push(ing.charAt(0).toUpperCase() + ing.slice(1));
    }
  });
  
  return ingredients.length > 0 ? ingredients : ['Ingredients to be added'];
};

// Check if meal is vegetarian
const isVegetarian = (mealName: string, ingredients: string[]): boolean => {
  const name = mealName.toLowerCase();
  const nonVegKeywords = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'meat', 'bacon', 'sausage'];
  
  const hasNonVeg = nonVegKeywords.some(keyword => 
    name.includes(keyword) || ingredients.some(ing => ing.toLowerCase().includes(keyword))
  );
  
  return !hasNonVeg;
};

// Fetch meal data (placeholder - can be replaced with actual API call)
export const fetchMealData = async (mealName: string): Promise<MealApiResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In production, replace this with actual API call:
  // const response = await fetch(`https://api.edamam.com/api/recipes/v2?q=${mealName}&app_id=YOUR_APP_ID&app_key=YOUR_APP_KEY`);
  // const data = await response.json();
  
  const ingredients = extractIngredients(mealName);
  const type = classifyMealType(mealName);
  const isVeg = isVegetarian(mealName, ingredients);
  
  // Placeholder image URL (in production, fetch from API)
  const image = `https://source.unsplash.com/400x300/?${encodeURIComponent(mealName)}`;
  
  return {
    name: mealName,
    ingredients,
    image,
    type,
    isVeg
  };
};

// Fetch meal image from Unsplash (free alternative)
export const fetchMealImage = async (mealName: string): Promise<string> => {
  try {
    // Using Unsplash Source API (free, no key required for basic usage)
    return `https://source.unsplash.com/400x300/?${encodeURIComponent(mealName + ' food')}`;
  } catch (error) {
    console.error('Error fetching meal image:', error);
    return '/placeholder-meal.jpg'; // Fallback image
  }
};

