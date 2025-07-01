-- Migration: Fix RLS policy for orphaning feeders (final fix)
-- Purpose: Properly allow setting user_id to NULL without RLS violations
-- Author: System
-- Date: 2024-12-20

-- Drop all existing update policies for feeders
drop policy if exists "Users can update feeder details" on public.feeders;
drop policy if exists "Users can orphan their feeders" on public.feeders;
drop policy if exists "Users can update their own feeders" on public.feeders;

-- Create a single, comprehensive update policy that handles both cases
create policy "Users can update and orphan their feeders"
  on public.feeders
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    -- Allow normal updates (keeping the same user_id) OR setting user_id to null (orphaning)
    auth.uid() = user_id OR user_id is null
  ); 