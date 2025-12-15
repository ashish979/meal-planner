-- Migration: Add prep_notes column to meals table
-- This allows users to add preparation notes that will appear as reminders

ALTER TABLE meals ADD COLUMN IF NOT EXISTS prep_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN meals.prep_notes IS 'Notes for meal preparation, shown as reminders for tomorrow''s meals';

