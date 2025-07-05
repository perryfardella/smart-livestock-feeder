-- Migration: Create admin management functions
-- Purpose: Allow admin users to manage admin privileges for other users
-- Author: System
-- Date: 2025-01-05
-- 
-- This migration creates functions to safely manage admin privileges by updating
-- user app_metadata. Only existing admins can promote or demote other users.

-- Function to add admin privileges to a user by email
create or replace function public.add_admin_by_email(
  email_param text
)
returns boolean
language plpgsql
security definer -- This allows access to auth.users
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  current_metadata jsonb;
begin
  -- Check if current user is admin
  if not (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean then
    raise exception 'Access denied: Admin privileges required';
  end if;

  -- Find the target user by email
  select id into target_user_id
  from auth.users
  where email = email_param
  and email is not null;

  -- Return false if user not found
  if target_user_id is null then
    return false;
  end if;

  -- Get current metadata
  select raw_app_meta_data into current_metadata
  from auth.users
  where id = target_user_id;

  -- Set current_metadata to empty object if null
  if current_metadata is null then
    current_metadata := '{}'::jsonb;
  end if;

  -- Update the user's app_metadata to include is_admin = true
  update auth.users
  set raw_app_meta_data = current_metadata || '{"is_admin": true}'::jsonb
  where id = target_user_id;

  return true;
end;
$$;

-- Function to remove admin privileges from a user by email
create or replace function public.remove_admin_by_email(
  email_param text
)
returns boolean
language plpgsql
security definer -- This allows access to auth.users
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  current_metadata jsonb;
begin
  -- Check if current user is admin
  if not (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean then
    raise exception 'Access denied: Admin privileges required';
  end if;

  -- Find the target user by email
  select id into target_user_id
  from auth.users
  where email = email_param
  and email is not null;

  -- Return false if user not found
  if target_user_id is null then
    return false;
  end if;

  -- Prevent self-demotion (admins cannot remove their own admin status)
  if target_user_id = auth.uid() then
    raise exception 'Cannot remove admin privileges from yourself';
  end if;

  -- Get current metadata
  select raw_app_meta_data into current_metadata
  from auth.users
  where id = target_user_id;

  -- Set current_metadata to empty object if null
  if current_metadata is null then
    current_metadata := '{}'::jsonb;
  end if;

  -- Update the user's app_metadata to remove is_admin or set it to false
  update auth.users
  set raw_app_meta_data = current_metadata || '{"is_admin": false}'::jsonb
  where id = target_user_id;

  return true;
end;
$$;

-- Function to get all admin users
create or replace function public.get_admin_users()
returns table(
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer -- This allows access to auth.users
set search_path = public, auth
as $$
begin
  -- Check if current user is admin
  if not (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean then
    raise exception 'Access denied: Admin privileges required';
  end if;

  -- Return all users with admin privileges
  return query
  select 
    au.id,
    au.email::text,
    au.created_at,
    au.last_sign_in_at
  from auth.users au
  where (au.raw_app_meta_data ->> 'is_admin')::boolean = true
  and au.email is not null
  order by au.created_at desc;
end;
$$;

-- Function to check if a user is admin by email
create or replace function public.is_user_admin_by_email(
  email_param text
)
returns boolean
language plpgsql
security definer -- This allows access to auth.users
set search_path = public, auth
as $$
begin
  -- Check if current user is admin
  if not (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean then
    raise exception 'Access denied: Admin privileges required';
  end if;

  -- Check if the specified user is an admin
  return exists (
    select 1 from auth.users au
    where au.email = email_param
    and (au.raw_app_meta_data ->> 'is_admin')::boolean = true
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.add_admin_by_email(text) to authenticated;
grant execute on function public.remove_admin_by_email(text) to authenticated;
grant execute on function public.get_admin_users() to authenticated;
grant execute on function public.is_user_admin_by_email(text) to authenticated;

-- Add comments for documentation
comment on function public.add_admin_by_email(text) is 'Adds admin privileges to a user by email address (admin only)';
comment on function public.remove_admin_by_email(text) is 'Removes admin privileges from a user by email address (admin only, cannot self-demote)';
comment on function public.get_admin_users() is 'Returns all users with admin privileges (admin only)';
comment on function public.is_user_admin_by_email(text) is 'Checks if a user has admin privileges by email address (admin only)'; 