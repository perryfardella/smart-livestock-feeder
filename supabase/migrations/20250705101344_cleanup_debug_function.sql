-- Migration: Cleanup debug function
-- Purpose: Remove the temporary debug function used for troubleshooting invitation RLS policies
-- Author: Perry
-- Date: 2025-07-05

-- Remove the temporary debug function
DROP FUNCTION IF EXISTS public.debug_invitation_access(uuid);
