/*
 * Migration: Convert feeding_sessions.time from TIME to VARCHAR(5)
 * Purpose: Standardize time format to HH:MM across frontend and backend
 * Changes: time column type and format, add validation constraint
 */

-- Step 1: Add new varchar column
ALTER TABLE public.feeding_sessions 
ADD COLUMN time_varchar VARCHAR(5);

-- Step 2: Convert existing TIME data to HH:MM format
UPDATE public.feeding_sessions 
SET time_varchar = TO_CHAR(time, 'HH24:MI');

-- Step 3: Drop the old column
ALTER TABLE public.feeding_sessions 
DROP COLUMN time;

-- Step 4: Rename the new column
ALTER TABLE public.feeding_sessions 
RENAME COLUMN time_varchar TO time;

-- Step 5: Add constraints
ALTER TABLE public.feeding_sessions 
ALTER COLUMN time SET NOT NULL;

ALTER TABLE public.feeding_sessions 
ADD CONSTRAINT valid_time_format 
CHECK (time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$');

-- Update the comment to reflect the new format
COMMENT ON COLUMN public.feeding_sessions.time IS 'Time of day when feeding occurs (HH:MM format)'; 