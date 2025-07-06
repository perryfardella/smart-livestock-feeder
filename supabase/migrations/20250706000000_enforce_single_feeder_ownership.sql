-- Migration: Enforce single feeder ownership
-- Purpose: Remove testing allowance for multiple users owning the same device
-- Author: System  
-- Date: 2025-07-06
-- 
-- This migration adds a unique constraint on device_id to enforce that only one user
-- can own a feeder device at any time. Users can still share access through the
-- permissions system, but there will be exactly one owner per device.

-- Step 1: Check for and resolve any existing duplicate device_id entries
-- If there are multiple users with the same device_id, we need to handle this
-- before adding the unique constraint

DO $$
DECLARE
    duplicate_count integer;
    duplicate_devices text[];
BEGIN
    -- Count how many duplicate device_ids exist
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT device_id
        FROM public.feeders
        WHERE user_id IS NOT NULL
        GROUP BY device_id
        HAVING COUNT(*) > 1
    ) duplicates;

    -- If duplicates exist, log them and provide guidance
    IF duplicate_count > 0 THEN
        -- Get the duplicate device_ids
        SELECT ARRAY_AGG(device_id) INTO duplicate_devices
        FROM (
            SELECT device_id
            FROM public.feeders
            WHERE user_id IS NOT NULL
            GROUP BY device_id
            HAVING COUNT(*) > 1
        ) duplicates;

        -- Log warning about duplicates
        RAISE NOTICE 'Found % duplicate device_ids that need manual resolution: %', 
            duplicate_count, duplicate_devices;
        
        -- Provide guidance on resolution
        RAISE NOTICE 'Before applying unique constraint, resolve duplicates by:';
        RAISE NOTICE '1. Deciding which user should be the owner for each device';
        RAISE NOTICE '2. Converting other users to invited members using the permissions system';
        RAISE NOTICE '3. Removing or orphaning the duplicate feeder entries';
        
        -- Don't proceed with the constraint if duplicates exist
        RAISE EXCEPTION 'Cannot add unique constraint while duplicate device_ids exist. Please resolve duplicates first.';
    END IF;

    RAISE NOTICE 'No duplicate device_ids found. Proceeding with unique constraint.';
END $$;

-- Step 2: Add the unique constraint on device_id
-- This will prevent multiple users from owning the same device going forward

ALTER TABLE public.feeders 
ADD CONSTRAINT feeders_device_id_unique 
UNIQUE (device_id);

-- Step 3: Update the index that was created for the testing scenario
-- Remove the composite index that was used during testing
DROP INDEX IF EXISTS idx_feeders_user_device;

-- Step 4: Update table comments to reflect the new constraint
COMMENT ON CONSTRAINT feeders_device_id_unique ON public.feeders IS 
'Ensures each device can only be owned by one user at a time. Users can share access through the permissions system.';

-- Step 5: Update the column comment to reflect single ownership
COMMENT ON COLUMN public.feeders.device_id IS 
'Unique hardware device identifier. Each device can only be owned by one user at a time.';

-- Step 6: Add a helpful function to check ownership conflicts before they happen
CREATE OR REPLACE FUNCTION public.check_device_ownership_conflict(
    device_id_param text,
    user_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if device is already owned by a different user
    RETURN EXISTS (
        SELECT 1 FROM public.feeders f
        WHERE f.device_id = device_id_param
        AND f.user_id IS NOT NULL
        AND f.user_id != user_id_param
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_device_ownership_conflict(text, uuid) TO authenticated;

COMMENT ON FUNCTION public.check_device_ownership_conflict(text, uuid) IS 
'Checks if a device is already owned by a different user before attempting to create a feeder';

-- Step 7: Create a function to help with the transition from multiple ownership to single ownership
CREATE OR REPLACE FUNCTION public.get_device_ownership_conflicts()
RETURNS TABLE (
    device_id text,
    owner_count bigint,
    owners text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.device_id,
        COUNT(*) as owner_count,
        ARRAY_AGG(f.user_id::text) as owners
    FROM public.feeders f
    WHERE f.user_id IS NOT NULL
    GROUP BY f.device_id
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC;
END;
$$;

-- Grant execute permission to authenticated users (useful for admin debugging)
GRANT EXECUTE ON FUNCTION public.get_device_ownership_conflicts() TO authenticated;

COMMENT ON FUNCTION public.get_device_ownership_conflicts() IS 
'Returns devices that have multiple owners - useful for identifying conflicts that need resolution';

-- Step 8: Add a trigger to provide better error messages on unique constraint violations
CREATE OR REPLACE FUNCTION public.handle_device_ownership_conflict()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- This will be called if there's a unique constraint violation
    -- The constraint itself will prevent the insert, but we can provide a better error message
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM public.feeders f
            WHERE f.device_id = NEW.device_id
            AND f.user_id IS NOT NULL
            AND f.user_id != NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Device ID % is already owned by another user. Each device can only have one owner. You can request access through the permissions system instead.', NEW.device_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER check_device_ownership_before_insert
    BEFORE INSERT OR UPDATE ON public.feeders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_device_ownership_conflict();

COMMENT ON TRIGGER check_device_ownership_before_insert ON public.feeders IS 
'Provides user-friendly error messages when attempting to create duplicate device ownership';

-- Step 9: Log the successful completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully enforced single feeder ownership:';
    RAISE NOTICE '- Added unique constraint on device_id';
    RAISE NOTICE '- Updated indexes and comments';
    RAISE NOTICE '- Added helper functions for conflict detection';
    RAISE NOTICE '- Added trigger for better error messages';
    RAISE NOTICE 'Users can now only own one feeder per device, but can share access through the permissions system.';
END $$; 