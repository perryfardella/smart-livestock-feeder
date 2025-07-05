-- Migration: Fix feeder name access for pending invitations
-- Purpose: Allow users to see feeder names when they have pending invitations
-- Author: Perry
-- Date: 2025-01-05
-- 
-- This migration fixes the issue where users can't see feeder names in invitation
-- acceptance UI because they don't have permission to access the feeder yet.
-- We add a condition to allow viewing feeder info for pending invitations.

-- ============================================================================
-- UPDATE FEEDERS TABLE RLS POLICY FOR INVITATION ACCESS
-- ============================================================================

-- Drop and recreate the policy to include pending invitation access
drop policy if exists "Users can view accessible feeders" on public.feeders;

-- New policy: Users can view feeders they own OR have accepted membership to OR have pending invitations to
create policy "Users can view accessible feeders"
  on public.feeders
  for select
  to authenticated
  using (
    -- User owns the feeder
    auth.uid() = user_id
    OR
    -- User has accepted membership to the feeder
    exists (
      select 1 from public.feeder_memberships fm
      where fm.feeder_id = feeders.id
      and fm.user_id = auth.uid()
      and fm.status = 'accepted'
    )
    OR
    -- User has a pending invitation to the feeder (allows viewing name for invitation acceptance)
    exists (
      select 1 from public.feeder_invitations fi
      where fi.feeder_id = feeders.id
      and (
        fi.invitee_email = (auth.jwt() -> 'email')::text
        or fi.invitee_id = auth.uid()
      )
      and fi.status = 'pending'
      and fi.expires_at > now()
    )
  );

-- Add comment explaining the policy
comment on policy "Users can view accessible feeders" on public.feeders is 
'Allow users to view feeders they own, have membership access to, or have pending invitations for (enables viewing feeder names in invitation acceptance UI)'; 