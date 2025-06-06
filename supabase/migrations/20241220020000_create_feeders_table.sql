-- Migration: Create feeders table for user-owned feeding devices
-- Purpose: Link users to their feeding devices and store feeder metadata
-- Author: System
-- Date: 2024-12-20
-- 
-- This migration creates a feeders table to establish the relationship between
-- users and their IoT feeding devices. This allows users to claim ownership of
-- devices, give them friendly names, and store configuration/metadata.

-- Create the feeders table
create table if not exists public.feeders (
  -- Primary key for unique identification of each feeder
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to the user who owns this feeder
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- The actual hardware device ID that matches sensor_data.device_id
  -- TODO: Add unique constraint later - currently allowing multiple users per device for testing
  device_id text not null,
  
  -- User-friendly name for the feeder (e.g., "Chicken Coop Feeder")
  name text not null,
  
  -- Optional description of the feeder
  description text,
  
  -- Optional location description (e.g., "Back paddock", "Barn A")
  location text,
  
  -- Whether the feeder is currently active/enabled
  is_active boolean not null default true,
  
  -- Configuration settings stored as JSON
  settings jsonb default '{}',
  
  -- Audit fields
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for optimal query performance
-- Index on user_id for filtering feeders by user
create index if not exists idx_feeders_user_id 
  on public.feeders(user_id);

-- Index on device_id for lookups from sensor data
create index if not exists idx_feeders_device_id 
  on public.feeders(device_id);

-- Index on is_active for filtering active feeders
create index if not exists idx_feeders_is_active 
  on public.feeders(is_active);

-- Composite index for user + device queries
-- TODO: Remove this index when device_id becomes unique per user
create index if not exists idx_feeders_user_device 
  on public.feeders(user_id, device_id);

-- Enable Row Level Security (RLS) as required by Supabase best practices
alter table public.feeders enable row level security;

-- RLS Policy: Users can only see their own feeders
create policy "Users can view their own feeders"
  on public.feeders
  for select
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policy: Users can only insert feeders for themselves
create policy "Users can insert their own feeders"
  on public.feeders
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- RLS Policy: Users can only update their own feeders
create policy "Users can update their own feeders"
  on public.feeders
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own feeders
create policy "Users can delete their own feeders"
  on public.feeders
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create a trigger to automatically update updated_at on row changes
create trigger update_feeders_updated_at
  before update on public.feeders
  for each row
  execute function public.update_updated_at_column();

-- Add a comment to the table for documentation
comment on table public.feeders is 'Stores user-owned feeding devices with metadata and configuration';

-- Add comments to columns for clarity
comment on column public.feeders.user_id is 'The user who owns this feeder';
comment on column public.feeders.device_id is 'The hardware device ID that matches sensor_data.device_id (temporarily allows duplicates for testing)';
comment on column public.feeders.name is 'User-friendly name for the feeder';
comment on column public.feeders.description is 'Optional description of the feeder';
comment on column public.feeders.location is 'Optional location description';
comment on column public.feeders.is_active is 'Whether the feeder is currently active/enabled';
comment on column public.feeders.settings is 'Configuration settings stored as JSON';
comment on column public.feeders.created_at is 'When this feeder was added to the system';
comment on column public.feeders.updated_at is 'When this feeder was last modified';

-- TODO: Future migration needed to enforce unique device ownership
-- When ready for production, create a migration to:
-- 1. Clean up duplicate device assignments
-- 2. Add unique constraint on device_id
-- 3. Remove the composite index idx_feeders_user_device
-- 4. Update application logic to handle device ownership properly 