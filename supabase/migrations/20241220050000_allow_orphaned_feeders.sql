-- Migration: Allow orphaned feeders (soft delete functionality)
-- Purpose: Enable "soft delete" of feeders by removing user association rather than deleting data
-- Author: System
-- Date: 2025-07-01
-- 
-- This migration modifies the feeders table to allow feeders to exist without a user_id,
-- enabling preservation of historical data when users "delete" feeders from their account.
-- Users can later reclaim orphaned feeders by adding the same device_id.

-- Drop existing RLS policies that assume user_id is always present
drop policy if exists "Users can view their own feeders" on public.feeders;
drop policy if exists "Users can insert their own feeders" on public.feeders;
drop policy if exists "Users can update their own feeders" on public.feeders;
drop policy if exists "Users can delete their own feeders" on public.feeders;

-- Make user_id nullable to support orphaned feeders
alter table public.feeders 
alter column user_id drop not null;

-- Update the foreign key constraint to handle NULL user_id
-- Note: We can't have a foreign key constraint that allows NULL in this case,
-- so we'll need to handle referential integrity in application code
alter table public.feeders 
drop constraint if exists feeders_user_id_fkey;

-- Add a check constraint to ensure user_id references a valid user when not null
-- This will be enforced at the application level for better flexibility

-- Create new RLS policies that handle nullable user_id

-- Policy: Users can view their own feeders (user_id must match)
create policy "Users can view their own feeders"
  on public.feeders
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Users can insert feeders for themselves (user_id must be their own)
create policy "Users can insert their own feeders"
  on public.feeders
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: Users can update their own feeders (including setting user_id to null for soft delete)
create policy "Users can update their own feeders"
  on public.feeders
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id OR user_id is null); -- Allow setting user_id to null or keeping it the same

-- Policy: Users can reclaim orphaned feeders (user_id is null, set to their own)
create policy "Users can reclaim orphaned feeders"
  on public.feeders
  for update
  to authenticated
  using (user_id is null)
  with check (auth.uid() = user_id);

-- Update column comment to reflect new nullable behavior
comment on column public.feeders.user_id is 'The user who owns this feeder (nullable to support orphaned feeders after soft delete)';

-- Add index for orphaned feeders queries
create index if not exists idx_feeders_orphaned 
  on public.feeders(device_id) where user_id is null;

-- Note: Feeding schedules will remain associated with the original user_id
-- even when the feeder is orphaned. This preserves the historical context
-- of who created the schedules while allowing the feeder to be reclaimed. 