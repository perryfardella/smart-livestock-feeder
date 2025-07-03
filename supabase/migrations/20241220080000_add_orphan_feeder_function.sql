-- Migration: Add function to orphan feeders with elevated privileges
-- Purpose: Create a function that can bypass RLS to set user_id to null
-- Author: System
-- Date: 2025-07-01

-- Create a function that runs with security definer (elevated privileges)
create or replace function public.orphan_feeder(feeder_id uuid, requesting_user_id uuid)
returns boolean
language plpgsql
security definer -- This allows the function to bypass RLS
as $$
begin
  -- Verify the requesting user owns the feeder
  if not exists (
    select 1 from public.feeders 
    where id = feeder_id and user_id = requesting_user_id
  ) then
    raise exception 'Feeder not found or access denied';
  end if;

  -- Update the feeder to set user_id to null (orphan it)
  update public.feeders 
  set user_id = null, updated_at = now()
  where id = feeder_id and user_id = requesting_user_id;

  -- Check if the update was successful
  if not found then
    raise exception 'Failed to orphan feeder';
  end if;

  return true;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.orphan_feeder(uuid, uuid) to authenticated;

-- Add comment to document the function
comment on function public.orphan_feeder(uuid, uuid) is 'Safely orphans a feeder by setting user_id to null, bypassing RLS restrictions'; 