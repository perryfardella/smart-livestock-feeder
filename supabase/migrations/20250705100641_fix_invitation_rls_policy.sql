-- Migration: Fix RLS policy for viewing invitations
-- Purpose: Fix the JWT email extraction issue that's preventing users from viewing their invitations
-- Author: Perry
-- Date: 2025-07-05
-- 
-- The issue: The current RLS policy using (auth.jwt() -> 'email')::text is not working
-- correctly, preventing users from viewing their own invitations even when the email matches.
-- 
-- Solution: Use auth.email() function instead of manual JWT extraction for better reliability.

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.feeder_invitations;

-- Create a new policy that uses auth.email() instead of manual JWT extraction
CREATE POLICY "Users can view their own invitations"
  ON public.feeder_invitations
  FOR SELECT
  TO authenticated
  USING (
    -- Use auth.email() instead of (auth.jwt() -> 'email')::text
    invitee_email = auth.email()
    OR invitee_id = auth.uid()
  );

-- Add a debug function to test the policy (can be removed later)
CREATE OR REPLACE FUNCTION public.debug_invitation_access(
  invitation_token_param uuid
)
RETURNS table(
  can_access boolean,
  current_user_id uuid,
  current_user_email text,
  invitation_email text,
  invitation_user_id uuid,
  matches_email boolean,
  matches_user_id boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Can access check
    (fi.invitee_email = auth.email() OR fi.invitee_id = auth.uid()) as can_access,
    -- Debug info
    auth.uid() as current_user_id,
    auth.email() as current_user_email,
    fi.invitee_email as invitation_email,
    fi.invitee_id as invitation_user_id,
    -- Match checks
    (fi.invitee_email = auth.email()) as matches_email,
    (fi.invitee_id = auth.uid()) as matches_user_id
  FROM public.feeder_invitations fi
  WHERE fi.invitation_token = invitation_token_param
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.debug_invitation_access(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.debug_invitation_access(uuid) IS 'Debug function to test invitation access policy - can be removed after testing';
