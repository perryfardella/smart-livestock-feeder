-- Migration: Add function to find and reclaim orphaned feeders
-- Purpose: Create functions to safely handle orphaned feeder operations
-- Author: System
-- Date: 2025-07-01

-- Function to find an orphaned feeder by device_id
create or replace function public.find_orphaned_feeder(device_id_param text)
returns table(
  id uuid,
  device_id text,
  name text,
  description text,
  location text,
  timezone text,
  is_active boolean,
  settings jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer -- Bypass RLS to read orphaned feeders
as $$
begin
  return query
  select 
    f.id,
    f.device_id,
    f.name,
    f.description,
    f.location,
    f.timezone,
    f.is_active,
    f.settings,
    f.created_at,
    f.updated_at
  from public.feeders f
  where f.device_id = device_id_param and f.user_id is null;
end;
$$;

-- Function to reclaim an orphaned feeder
create or replace function public.reclaim_orphaned_feeder(
  feeder_id uuid,
  new_user_id uuid,
  new_name text,
  new_description text default null,
  new_location text default null,
  new_timezone text default 'Australia/Sydney',
  new_is_active boolean default true,
  new_settings jsonb default '{}'::jsonb
)
returns table(
  id uuid,
  user_id uuid,
  device_id text,
  name text,
  description text,
  location text,
  timezone text,
  is_active boolean,
  settings jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer -- Bypass RLS to update orphaned feeders
as $$
begin
  -- Verify the feeder is actually orphaned
  if not exists (
    select 1 from public.feeders 
    where feeders.id = feeder_id and feeders.user_id is null
  ) then
    raise exception 'Feeder not found or not orphaned';
  end if;

  -- Update the feeder with new ownership and details
  update public.feeders 
  set 
    user_id = new_user_id,
    name = new_name,
    description = new_description,
    location = new_location,
    timezone = new_timezone,
    is_active = new_is_active,
    settings = new_settings,
    updated_at = now()
  where feeders.id = feeder_id and feeders.user_id is null;

  -- Return the updated feeder
  return query
  select 
    f.id,
    f.user_id,
    f.device_id,
    f.name,
    f.description,
    f.location,
    f.timezone,
    f.is_active,
    f.settings,
    f.created_at,
    f.updated_at
  from public.feeders f
  where f.id = feeder_id;
end;
$$;

-- Grant execute permissions
grant execute on function public.find_orphaned_feeder(text) to authenticated;
grant execute on function public.reclaim_orphaned_feeder(uuid, uuid, text, text, text, text, boolean, jsonb) to authenticated;

-- Add comments
comment on function public.find_orphaned_feeder(text) is 'Finds an orphaned feeder by device_id';
comment on function public.reclaim_orphaned_feeder(uuid, uuid, text, text, text, text, boolean, jsonb) is 'Reclaims an orphaned feeder by assigning it to a new user'; 