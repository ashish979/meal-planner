-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS calendar_days CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS meal_items CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;

-- ============================================
-- 1. INGREDIENTS TABLE
-- Basic items: vegetables, pulses, flour, etc.
-- ============================================
CREATE TABLE ingredients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. MEAL ITEMS TABLE
-- Individual dishes made from ingredients
-- e.g., Vegetable Curry, Chapati, Fried Noodles
-- ============================================
CREATE TABLE meal_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  ingredients JSONB DEFAULT '[]'::jsonb,  -- Array of ingredient IDs
  is_veg BOOLEAN DEFAULT true,
  image TEXT,
  prep_time_minutes INTEGER,
  prep_notes TEXT,  -- Notes for preparation (shown as reminder)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. MEALS TABLE
-- Combination of meal items for a complete meal
-- e.g., Chapati + Vegetable Curry
-- ============================================
CREATE TABLE meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  meal_items JSONB DEFAULT '[]'::jsonb,  -- Array of meal_item IDs
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'any')),
  is_veg BOOLEAN DEFAULT true,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CALENDAR DAYS TABLE
-- Schedule meals for breakfast, lunch, dinner
-- ============================================
CREATE TABLE calendar_days (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  breakfast UUID REFERENCES meals(id) ON DELETE SET NULL,
  lunch UUID REFERENCES meals(id) ON DELETE SET NULL,
  dinner UUID REFERENCES meals(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_meal_items_name ON meal_items(name);
CREATE INDEX idx_meals_meal_type ON meals(meal_type);
CREATE INDEX idx_calendar_days_date ON calendar_days(date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_ingredients_updated_at 
  BEFORE UPDATE ON ingredients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_items_updated_at 
  BEFORE UPDATE ON meal_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at 
  BEFORE UPDATE ON meals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_days_updated_at 
  BEFORE UPDATE ON calendar_days 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert sample ingredients
INSERT INTO ingredients (name, category) VALUES
  ('Wheat Flour', 'Flour'),
  ('Rice', 'Grains'),
  ('Potato', 'Vegetables'),
  ('Tomato', 'Vegetables'),
  ('Onion', 'Vegetables'),
  ('Garlic', 'Vegetables'),
  ('Ginger', 'Vegetables'),
  ('Green Chili', 'Vegetables'),
  ('Cauliflower', 'Vegetables'),
  ('Carrot', 'Vegetables'),
  ('Spinach', 'Vegetables'),
  ('Chickpeas', 'Pulses'),
  ('Lentils (Dal)', 'Pulses'),
  ('Kidney Beans', 'Pulses'),
  ('Milk', 'Dairy'),
  ('Yogurt', 'Dairy'),
  ('Paneer', 'Dairy'),
  ('Butter', 'Dairy'),
  ('Eggs', 'Protein'),
  ('Chicken', 'Protein'),
  ('Noodles', 'Grains'),
  ('Oil', 'Cooking'),
  ('Salt', 'Spices'),
  ('Turmeric', 'Spices'),
  ('Cumin', 'Spices'),
  ('Coriander', 'Spices'),
  ('Garam Masala', 'Spices'),
  ('Red Chili Powder', 'Spices')
ON CONFLICT DO NOTHING;

-- Insert sample meal items
INSERT INTO meal_items (name, description, is_veg, prep_time_minutes) VALUES
  ('Chapati', 'Soft whole wheat flatbread', true, 20),
  ('Steamed Rice', 'Plain basmati rice', true, 15),
  ('Vegetable Curry', 'Mixed vegetables in spicy gravy', true, 30),
  ('Dal Tadka', 'Yellow lentils with tempering', true, 25),
  ('Paneer Butter Masala', 'Cottage cheese in creamy tomato gravy', true, 35),
  ('Aloo Gobi', 'Potato and cauliflower dry curry', true, 25),
  ('Palak Paneer', 'Spinach with cottage cheese', true, 30),
  ('Fried Noodles', 'Stir-fried noodles with vegetables', true, 20),
  ('Scrambled Eggs', 'Fluffy scrambled eggs with spices', false, 10),
  ('Chicken Curry', 'Spicy chicken in onion-tomato gravy', false, 40),
  ('Poha', 'Flattened rice with vegetables', true, 15),
  ('Upma', 'Savory semolina breakfast', true, 20),
  ('Paratha', 'Layered flatbread', true, 25),
  ('Chole', 'Spicy chickpea curry', true, 35),
  ('Rajma', 'Kidney beans curry', true, 40),
  ('Raita', 'Yogurt with vegetables', true, 5)
ON CONFLICT DO NOTHING;

-- Insert sample meals (combinations of meal items)
INSERT INTO meals (name, description, meal_type, is_veg) VALUES
  ('Chapati with Dal', 'Classic Indian lunch with chapati and dal tadka', 'lunch', true),
  ('Rice with Rajma', 'Comforting rajma chawal', 'lunch', true),
  ('Paneer Thali', 'Chapati with paneer butter masala and raita', 'dinner', true),
  ('South Indian Breakfast', 'Poha with yogurt', 'breakfast', true),
  ('Egg Breakfast', 'Scrambled eggs with paratha', 'breakfast', false),
  ('Noodles Meal', 'Fried noodles as a quick meal', 'any', true),
  ('Dal Rice', 'Simple dal with steamed rice', 'lunch', true),
  ('Chicken Dinner', 'Chicken curry with chapati', 'dinner', false)
ON CONFLICT DO NOTHING;
