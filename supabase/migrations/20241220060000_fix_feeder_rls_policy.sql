-- Migration: Fix RLS policy for orphaning feeders
-- Purpose: Fix the row-level security policy to allow setting user_id to NULL
-- Author: System
-- Date: 2024-12-20

-- Drop the problematic policy
drop policy if exists "Users can update their own feeders" on public.feeders;

-- Create separate policies for regular updates vs orphaning
-- Policy for regular feeder updates (not changing user_id)
create policy "Users can update feeder details"
  on public.feeders
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy specifically for orphaning feeders (setting user_id to null)
create policy "Users can orphan their feeders"
  on public.feeders
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (user_id is null); 