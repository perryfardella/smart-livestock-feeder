-- Migration: Add function to check if user exists by email
-- Purpose: Create a security definer function to safely check if a user exists in auth.users
-- Author: Perry
-- Date: 2025-07-03
-- 
-- This migration creates a helper function that can safely access auth.users
-- to check if a user exists for proper invitation email flow.

-- Function to check if a user exists by email
create or replace function public.user_exists_by_email(email_param text)
returns boolean
language plpgsql
security definer -- This allows access to auth.users
set search_path = public, auth
as $$
begin
  -- Check if user exists with the given email
  return exists (
    select 1 from auth.users au
    where au.email = email_param
    and au.email is not null
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.user_exists_by_email(text) to authenticated;

-- Add comment for documentation
comment on function public.user_exists_by_email(text) is 'Safely checks if a user exists in auth.users by email address'; 