-- Migration: Add is_veg and image fields to meals table

-- Add is_veg column (default to true for vegetarian)
ALTER TABLE meals 
ADD COLUMN IF NOT EXISTS is_veg BOOLEAN DEFAULT true;

-- Add image column
ALTER TABLE meals 
ADD COLUMN IF NOT EXISTS image TEXT;

-- Update existing meals to be vegetarian by default
UPDATE meals SET is_veg = true WHERE is_veg IS NULL;

