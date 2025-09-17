-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meals table
CREATE TABLE IF NOT EXISTS meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('breakfast', 'lunch', 'dinner')),
  ingredients JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calendar_days table
CREATE TABLE IF NOT EXISTS calendar_days (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  breakfast UUID REFERENCES meals(id) ON DELETE SET NULL,
  lunch UUID REFERENCES meals(id) ON DELETE SET NULL,
  dinner UUID REFERENCES meals(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_meals_type ON meals(type);
CREATE INDEX IF NOT EXISTS idx_calendar_days_date ON calendar_days(date);

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

CREATE TRIGGER update_meals_updated_at 
  BEFORE UPDATE ON meals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_days_updated_at 
  BEFORE UPDATE ON calendar_days 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO ingredients (name, category) VALUES
  ('Eggs', 'Protein'),
  ('Bread', 'Carbs'),
  ('Milk', 'Dairy'),
  ('Chicken', 'Protein'),
  ('Rice', 'Carbs'),
  ('Vegetables', 'Vegetables')
ON CONFLICT DO NOTHING;

-- Insert sample meals (using proper JSON array syntax)
INSERT INTO meals (name, type, ingredients) VALUES
  ('Scrambled Eggs', 'breakfast', jsonb_build_array(
    (SELECT id FROM ingredients WHERE name = 'Eggs'),
    (SELECT id FROM ingredients WHERE name = 'Milk')
  )),
  ('Chicken Rice Bowl', 'lunch', jsonb_build_array(
    (SELECT id FROM ingredients WHERE name = 'Chicken'),
    (SELECT id FROM ingredients WHERE name = 'Rice'),
    (SELECT id FROM ingredients WHERE name = 'Vegetables')
  )),
  ('Grilled Chicken', 'dinner', jsonb_build_array(
    (SELECT id FROM ingredients WHERE name = 'Chicken'),
    (SELECT id FROM ingredients WHERE name = 'Vegetables')
  ))
ON CONFLICT DO NOTHING;
