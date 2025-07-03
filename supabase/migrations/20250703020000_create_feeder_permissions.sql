-- Migration: Create feeder permissions table for fine-grained access control
-- Purpose: Enable granular permission management beyond role templates
-- Author: Perry
-- Date: 2025-07-03
-- 
-- This migration creates the feeder_permissions table which allows fine-tuning
-- of individual permissions for each feeder membership, going beyond role templates.

-- Create the feeder_permissions table
create table public.feeder_permissions (
  -- Primary key for unique identification
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to the membership this permission applies to
  membership_id uuid not null references public.feeder_memberships(id) on delete cascade,
  
  -- The specific permission being granted/denied
  permission_type permission_type not null,
  
  -- Whether this permission is granted (true) or denied (false)
  granted boolean not null default false,
  
  -- Audit timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Ensure one permission per membership (no duplicates)
  unique(membership_id, permission_type)
);

-- Create indexes for optimal query performance

-- Index for finding all permissions for a membership
create index idx_feeder_permissions_membership_id 
  on public.feeder_permissions(membership_id);

-- Index for filtering by permission type
create index idx_feeder_permissions_permission_type 
  on public.feeder_permissions(permission_type);

-- Index for filtering by granted status
create index idx_feeder_permissions_granted 
  on public.feeder_permissions(granted);

-- Composite index for membership + granted permissions (most common query)
create index idx_feeder_permissions_membership_granted 
  on public.feeder_permissions(membership_id, permission_type) 
  where granted = true;

-- Enable Row Level Security (RLS)
alter table public.feeder_permissions enable row level security;

-- RLS Policy: Users can view permissions for their own memberships
create policy "Users can view their own membership permissions"
  on public.feeder_permissions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.feeder_memberships fm
      where fm.id = membership_id
      and fm.user_id = auth.uid()
    )
  );

-- RLS Policy: Feeder owners can view all permissions for their feeders
create policy "Feeder owners can view feeder permissions"
  on public.feeder_permissions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.feeder_memberships fm
      join public.feeders f on f.id = fm.feeder_id
      where fm.id = membership_id
      and f.user_id = auth.uid()
    )
  );

-- RLS Policy: Feeder owners can create permissions for their feeders
create policy "Feeder owners can create feeder permissions"
  on public.feeder_permissions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.feeder_memberships fm
      join public.feeders f on f.id = fm.feeder_id
      where fm.id = membership_id
      and f.user_id = auth.uid()
    )
  );

-- RLS Policy: Feeder owners can update permissions for their feeders
create policy "Feeder owners can update feeder permissions"
  on public.feeder_permissions
  for update
  to authenticated
  using (
    exists (
      select 1 from public.feeder_memberships fm
      join public.feeders f on f.id = fm.feeder_id
      where fm.id = membership_id
      and f.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.feeder_memberships fm
      join public.feeders f on f.id = fm.feeder_id
      where fm.id = membership_id
      and f.user_id = auth.uid()
    )
  );

-- RLS Policy: Feeder owners can delete permissions for their feeders
create policy "Feeder owners can delete feeder permissions"
  on public.feeder_permissions
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.feeder_memberships fm
      join public.feeders f on f.id = fm.feeder_id
      where fm.id = membership_id
      and f.user_id = auth.uid()
    )
  );

-- Create trigger for automatic updated_at timestamp
create trigger update_feeder_permissions_updated_at
  before update on public.feeder_permissions
  for each row
  execute function public.update_updated_at_column();

-- Helper function to check if a user has a specific permission for a feeder
create or replace function public.has_feeder_permission(
  feeder_id_param uuid,
  permission_type_param permission_type,
  user_id_param uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
as $$
begin
  -- Check if user is the feeder owner (owners have all permissions)
  if exists (
    select 1 from public.feeders f
    where f.id = feeder_id_param
    and f.user_id = user_id_param
  ) then
    return true;
  end if;

  -- Check if user has the specific permission through membership
  return exists (
    select 1 
    from public.feeder_memberships fm
    join public.feeder_permissions fp on fm.id = fp.membership_id
    where fm.feeder_id = feeder_id_param
    and fm.user_id = user_id_param
    and fm.status = 'accepted'
    and fp.permission_type = permission_type_param
    and fp.granted = true
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.has_feeder_permission(uuid, permission_type, uuid) to authenticated;

-- Helper function to get all permissions for a user on a feeder
create or replace function public.get_user_feeder_permissions(
  feeder_id_param uuid,
  user_id_param uuid default auth.uid()
)
returns table(
  permission_type permission_type,
  granted boolean,
  source text
)
language plpgsql
security definer
as $$
begin
  -- Check if user is the feeder owner
  if exists (
    select 1 from public.feeders f
    where f.id = feeder_id_param
    and f.user_id = user_id_param
  ) then
    -- Return all permissions as granted for owner
    return query
    select 
      unnest(enum_range(null::permission_type)) as permission_type,
      true as granted,
      'owner' as source;
    return;
  end if;

  -- Return explicit permissions from membership
  return query
  select 
    fp.permission_type,
    fp.granted,
    'membership' as source
  from public.feeder_memberships fm
  join public.feeder_permissions fp on fm.id = fp.membership_id
  where fm.feeder_id = feeder_id_param
  and fm.user_id = user_id_param
  and fm.status = 'accepted';
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_user_feeder_permissions(uuid, uuid) to authenticated;

-- Helper function to apply role template permissions to a membership
create or replace function public.apply_role_permissions(
  membership_id_param uuid,
  role_param feeder_role
)
returns void
language plpgsql
security definer
as $$
declare
  permission_list permission_type[];
begin
  -- Define permission templates for each role
  case role_param
    when 'viewer' then
      permission_list := array[
        'view_sensor_data',
        'view_feeding_schedules', 
        'view_camera_feeds'
      ]::permission_type[];
    
    when 'scheduler' then
      permission_list := array[
        'view_sensor_data',
        'view_feeding_schedules',
        'create_feeding_schedules',
        'edit_feeding_schedules', 
        'delete_feeding_schedules',
        'manual_feed_release',
        'view_camera_feeds'
      ]::permission_type[];
    
    when 'manager' then
      permission_list := array[
        'view_sensor_data',
        'view_feeding_schedules',
        'create_feeding_schedules',
        'edit_feeding_schedules',
        'delete_feeding_schedules', 
        'manual_feed_release',
        'view_camera_feeds',
        'edit_feeder_settings'
      ]::permission_type[];
    
    when 'owner' then
      -- Owners get all permissions (handled at feeder level, not membership level)
      permission_list := array[]::permission_type[];
  end case;

  -- Clear existing permissions for this membership
  delete from public.feeder_permissions 
  where membership_id = membership_id_param;

  -- Insert new permissions based on role
  if array_length(permission_list, 1) > 0 then
    insert into public.feeder_permissions (membership_id, permission_type, granted)
    select membership_id_param, unnest(permission_list), true;
  end if;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.apply_role_permissions(uuid, feeder_role) to authenticated;

-- Add table and column comments for documentation
comment on table public.feeder_permissions is 'Fine-grained permission control for feeder memberships';
comment on column public.feeder_permissions.membership_id is 'Membership this permission applies to';
comment on column public.feeder_permissions.permission_type is 'Specific permission being controlled';
comment on column public.feeder_permissions.granted is 'Whether this permission is granted (true) or denied (false)';

comment on function public.has_feeder_permission(uuid, permission_type, uuid) is 'Checks if a user has a specific permission for a feeder';
comment on function public.get_user_feeder_permissions(uuid, uuid) is 'Returns all permissions for a user on a feeder with their source';
comment on function public.apply_role_permissions(uuid, feeder_role) is 'Applies role template permissions to a membership'; 