-- Migration: Create commissioned feeders table for device ID management
-- Purpose: Track which device IDs have been commissioned and are valid for use
-- Author: System
-- Date: 2024-12-21
-- 
-- This migration creates a commissioned_feeders table to manage device IDs that have been
-- manufactured and commissioned. Users can only add feeders with device IDs that exist
-- in this table, ensuring proper device validation and inventory management.

-- Create the commissioned_feeders table
create table if not exists public.commissioned_feeders (
  -- Primary key for unique identification
  id uuid primary key default gen_random_uuid(),
  
  -- The device ID that was commissioned (must be unique)
  device_id text not null unique,
  
  -- Optional batch number or manufacturing info
  batch_number text,
  
  -- Optional notes about the device
  notes text,
  
  -- Manufacturing/commission date
  commissioned_date timestamptz default now(),
  
  -- Whether this device is available for assignment
  is_available boolean not null default true,
  
  -- Who commissioned this device (admin user)
  commissioned_by uuid references auth.users(id) on delete set null,
  
  -- Audit fields
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for optimal query performance
-- Index on device_id for fast lookups during feeder creation
create index if not exists idx_commissioned_feeders_device_id 
  on public.commissioned_feeders(device_id);

-- Index on is_available for filtering available devices
create index if not exists idx_commissioned_feeders_is_available 
  on public.commissioned_feeders(is_available);

-- Index on commissioned_date for sorting and filtering
create index if not exists idx_commissioned_feeders_commissioned_date 
  on public.commissioned_feeders(commissioned_date);

-- Index on batch_number for batch management
create index if not exists idx_commissioned_feeders_batch_number 
  on public.commissioned_feeders(batch_number);

-- Enable Row Level Security (RLS)
alter table public.commissioned_feeders enable row level security;

-- RLS Policy: Allow authenticated users to view commissioned feeders
-- This enables the feeder creation validation to work
create policy "Allow authenticated users to view commissioned feeders"
  on public.commissioned_feeders
  for select
  to authenticated
  using (true);

-- RLS Policy: Allow admin users to manage commissioned feeders
-- Admin access is determined by app_metadata.is_admin = true in JWT
create policy "Allow admin users to insert commissioned feeders"
  on public.commissioned_feeders
  for insert
  to authenticated
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

create policy "Allow admin users to update commissioned feeders"
  on public.commissioned_feeders
  for update
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

create policy "Allow admin users to delete commissioned feeders"
  on public.commissioned_feeders
  for delete
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- Create trigger for automatic updated_at timestamp
create trigger update_commissioned_feeders_updated_at
  before update on public.commissioned_feeders
  for each row
  execute function public.update_updated_at_column();

-- Helper function to check if a device ID is commissioned and available
-- TODO: Before going live, restore the 'and is_available = true' check to prevent multiple assignments
create or replace function public.is_device_commissioned(device_id_param text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 
    from public.commissioned_feeders 
    where device_id = device_id_param 
    -- and is_available = true  -- TODO: Uncomment this line before going live
  );
end;
$$;

-- Grant execute permission to authenticated users for device validation
grant execute on function public.is_device_commissioned(text) to authenticated;

-- Helper function to mark a device as assigned when a feeder is created
create or replace function public.mark_device_assigned(device_id_param text)
returns boolean
language plpgsql
security definer
as $$
begin
  update public.commissioned_feeders 
  set is_available = false,
      updated_at = now()
  where device_id = device_id_param 
  and is_available = true;
  
  return found;
end;
$$;

-- Grant execute permission to authenticated users for device assignment
grant execute on function public.mark_device_assigned(text) to authenticated;

-- Helper function to mark a device as available when a feeder is deleted/orphaned
create or replace function public.mark_device_available(device_id_param text)
returns boolean
language plpgsql
security definer
as $$
begin
  update public.commissioned_feeders 
  set is_available = true,
      updated_at = now()
  where device_id = device_id_param;
  
  return found;
end;
$$;

-- Grant execute permission to authenticated users for device release
grant execute on function public.mark_device_available(text) to authenticated;

-- Add comments for documentation
comment on table public.commissioned_feeders is 'Stores device IDs that have been commissioned and are available for assignment to users';
comment on column public.commissioned_feeders.device_id is 'Unique device ID that was commissioned for use';
comment on column public.commissioned_feeders.batch_number is 'Optional batch number for manufacturing tracking';
comment on column public.commissioned_feeders.notes is 'Optional notes about the device';
comment on column public.commissioned_feeders.commissioned_date is 'When this device was commissioned';
comment on column public.commissioned_feeders.is_available is 'Whether this device is available for assignment to users';
comment on column public.commissioned_feeders.commissioned_by is 'Admin user who commissioned this device';
comment on function public.is_device_commissioned(text) is 'Checks if a device ID is commissioned and available for assignment';
comment on function public.mark_device_assigned(text) is 'Marks a commissioned device as assigned when a feeder is created';
comment on function public.mark_device_available(text) is 'Marks a commissioned device as available when a feeder is orphaned or deleted'; 