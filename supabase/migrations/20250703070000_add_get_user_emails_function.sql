-- Migration: Add function to get user emails safely
-- Purpose: Create a security definer function to retrieve user emails from auth.users
-- Author: Perry
-- Date: 2025-07-03
-- 
-- This migration creates a helper function that can safely access auth.users
-- to retrieve email addresses for display in the team management interface.

-- Function to get user emails by user IDs
create or replace function public.get_user_emails(user_ids uuid[])
returns table(
  user_id uuid,
  email text
)
language plpgsql
security definer -- This allows access to auth.users
set search_path = public, auth
as $$
begin
  -- Return email addresses for the requested user IDs
  return query
  select 
    au.id as user_id,
    au.email::text as email
  from auth.users au
  where au.id = any(user_ids)
  and au.email is not null;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_user_emails(uuid[]) to authenticated;

-- Add comment for documentation
comment on function public.get_user_emails(uuid[]) is 'Safely retrieves email addresses for specified user IDs from auth.users'; 