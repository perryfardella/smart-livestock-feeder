-- Migration: Add DELETE policy for feeders table
-- Purpose: Allow users to delete their own feeders (RLS policy was missing)
-- Author: System
-- Date: 2025-01-07
-- 
-- This migration adds back the DELETE policy for the feeders table that was
-- dropped in the orphaned feeders migration but never recreated. This is needed
-- now that we've changed from soft delete (orphaning) to actual deletion.

-- Add DELETE policy for feeders table
create policy "Users can delete their own feeders"
  on public.feeders
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Add comment to document the policy
comment on policy "Users can delete their own feeders" on public.feeders is 
'Allow users to delete feeders they own - triggers cascade deletes for all related data (memberships, permissions, invitations, schedules)'; 