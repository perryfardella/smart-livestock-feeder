-- Migration: Update RLS policies for shared feeder access
-- Purpose: Enable users to access feeders shared with them through the membership system
-- Author: Perry
-- Date: 2025-07-03
-- 
-- This migration updates existing RLS policies on feeders and feeding_schedules tables
-- to support shared access via the feeder_memberships system implemented in Phase 1.

-- ============================================================================
-- UPDATE FEEDERS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing select policy and replace with shared access version
drop policy if exists "Users can view their own feeders" on public.feeders;

-- New policy: Users can view feeders they own OR have accepted membership to
create policy "Users can view accessible feeders"
  on public.feeders
  for select
  to authenticated
  using (
    -- User owns the feeder
    auth.uid() = user_id
    OR
    -- User has accepted membership to the feeder
    exists (
      select 1 from public.feeder_memberships fm
      where fm.feeder_id = feeders.id
      and fm.user_id = auth.uid()
      and fm.status = 'accepted'
    )
  );

-- ============================================================================
-- UPDATE FEEDING_SCHEDULES TABLE RLS POLICIES  
-- ============================================================================

-- Drop existing policies that only check ownership
drop policy if exists "Users can select their own feeding schedules" on public.feeding_schedules;
drop policy if exists "Users can insert feeding schedules for their feeders" on public.feeding_schedules;
drop policy if exists "Users can update their own feeding schedules" on public.feeding_schedules;
drop policy if exists "Users can delete their own feeding schedules" on public.feeding_schedules;

-- Policy: Users can view feeding schedules for accessible feeders
create policy "Users can view feeding schedules for accessible feeders"
  on public.feeding_schedules
  for select
  to authenticated
  using (
    -- User owns the schedule
    auth.uid() = user_id
    OR
    -- User has view permission through membership
    public.has_feeder_permission(feeder_id, 'view_feeding_schedules'::permission_type, auth.uid())
  );

-- Policy: Users can create feeding schedules if they have permission
create policy "Users can create feeding schedules with permission"
  on public.feeding_schedules
  for insert
  to authenticated
  with check (
    -- User owns the feeder OR has create permission
    (
      exists (
        select 1 from public.feeders f
        where f.id = feeder_id
        and f.user_id = auth.uid()
      )
      and auth.uid() = user_id
    )
    OR
    (
      public.has_feeder_permission(feeder_id, 'create_feeding_schedules'::permission_type, auth.uid())
      and auth.uid() = user_id
    )
  );

-- Policy: Users can update feeding schedules if they have permission
create policy "Users can update feeding schedules with permission"
  on public.feeding_schedules
  for update
  to authenticated
  using (
    -- User owns the schedule
    auth.uid() = user_id
    OR
    -- User has edit permission through membership
    public.has_feeder_permission(feeder_id, 'edit_feeding_schedules'::permission_type, auth.uid())
  )
  with check (
    -- User owns the schedule
    auth.uid() = user_id
    OR
    -- User has edit permission through membership
    public.has_feeder_permission(feeder_id, 'edit_feeding_schedules'::permission_type, auth.uid())
  );

-- Policy: Users can delete feeding schedules if they have permission
create policy "Users can delete feeding schedules with permission"
  on public.feeding_schedules
  for delete
  to authenticated
  using (
    -- User owns the schedule
    auth.uid() = user_id
    OR
    -- User has delete permission through membership
    public.has_feeder_permission(feeder_id, 'delete_feeding_schedules'::permission_type, auth.uid())
  );

-- ============================================================================
-- UPDATE FEEDING_SESSIONS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies that only check ownership via feeding_schedules
drop policy if exists "Users can select sessions for their feeding schedules" on public.feeding_sessions;
drop policy if exists "Users can insert sessions for their feeding schedules" on public.feeding_sessions;
drop policy if exists "Users can update sessions for their feeding schedules" on public.feeding_sessions;
drop policy if exists "Users can delete sessions for their feeding schedules" on public.feeding_sessions;

-- Policy: Users can view feeding sessions for accessible schedules
create policy "Users can view feeding sessions for accessible schedules"
  on public.feeding_sessions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.feeding_schedules fs
      where fs.id = feeding_schedule_id
      and (
        -- User owns the schedule
        fs.user_id = auth.uid()
        OR
        -- User has view permission through membership
        public.has_feeder_permission(fs.feeder_id, 'view_feeding_schedules'::permission_type, auth.uid())
      )
    )
  );

-- Policy: Users can create feeding sessions if they have permission
create policy "Users can create feeding sessions with permission"
  on public.feeding_sessions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.feeding_schedules fs
      where fs.id = feeding_schedule_id
      and (
        -- User owns the schedule
        fs.user_id = auth.uid()
        OR
        -- User has create/edit permission through membership
        public.has_feeder_permission(fs.feeder_id, 'create_feeding_schedules'::permission_type, auth.uid())
        OR
        public.has_feeder_permission(fs.feeder_id, 'edit_feeding_schedules'::permission_type, auth.uid())
      )
    )
  );

-- Policy: Users can update feeding sessions if they have permission
create policy "Users can update feeding sessions with permission"
  on public.feeding_sessions
  for update
  to authenticated
  using (
    exists (
      select 1 from public.feeding_schedules fs
      where fs.id = feeding_schedule_id
      and (
        -- User owns the schedule
        fs.user_id = auth.uid()
        OR
        -- User has edit permission through membership
        public.has_feeder_permission(fs.feeder_id, 'edit_feeding_schedules'::permission_type, auth.uid())
      )
    )
  )
  with check (
    exists (
      select 1 from public.feeding_schedules fs
      where fs.id = feeding_schedule_id
      and (
        -- User owns the schedule
        fs.user_id = auth.uid()
        OR
        -- User has edit permission through membership
        public.has_feeder_permission(fs.feeder_id, 'edit_feeding_schedules'::permission_type, auth.uid())
      )
    )
  );

-- Policy: Users can delete feeding sessions if they have permission
create policy "Users can delete feeding sessions with permission"
  on public.feeding_sessions
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.feeding_schedules fs
      where fs.id = feeding_schedule_id
      and (
        -- User owns the schedule
        fs.user_id = auth.uid()
        OR
        -- User has delete permission through membership
        public.has_feeder_permission(fs.feeder_id, 'delete_feeding_schedules'::permission_type, auth.uid())
      )
    )
  );

-- ============================================================================
-- UPDATE DATABASE FUNCTIONS FOR SHARED ACCESS
-- ============================================================================

-- Update the get_feeders_with_status function to include shared feeders
-- First drop the existing function to allow changing the return type
drop function if exists public.get_feeders_with_status(uuid);
drop function if exists public.get_user_feeders_with_status();

create or replace function public.get_feeders_with_status(user_uuid uuid)
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
  updated_at timestamptz,
  last_communication timestamptz,
  is_online boolean,
  status text,
  user_role feeder_role,
  is_owner boolean
)
language plpgsql
security definer
as $$
begin
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
    f.updated_at,
    latest_sensor.timestamp as last_communication,
    case 
      when latest_sensor.timestamp is null then false
      when latest_sensor.timestamp > (now() - interval '10 minutes') then true
      else false
    end as is_online,
    case 
      when latest_sensor.timestamp is null then 'offline'
      when latest_sensor.timestamp > (now() - interval '10 minutes') then 'online'
      else 'offline'
    end as status,
    public.get_user_feeder_role(f.id, user_uuid) as user_role,
    (f.user_id = user_uuid) as is_owner
  from public.feeders f
  left join lateral (
    select s.timestamp
    from public.sensor_data s
    where s.device_id = f.device_id
    order by s.timestamp desc
    limit 1
  ) latest_sensor on true
  where 
    -- User owns the feeder
    f.user_id = user_uuid
    or
    -- User has accepted membership to the feeder
    exists (
      select 1 from public.feeder_memberships fm
      where fm.feeder_id = f.id
      and fm.user_id = user_uuid
      and fm.status = 'accepted'
    )
  order by f.created_at desc;
end;
$$;

-- Update the RLS-friendly wrapper function signature to match
create or replace function public.get_user_feeders_with_status()
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
  updated_at timestamptz,
  last_communication timestamptz,
  is_online boolean,
  status text,
  user_role feeder_role,
  is_owner boolean
)
language plpgsql
security definer
as $$
begin
  -- Check if user is authenticated
  if auth.uid() is null then
    raise exception 'User must be authenticated';
  end if;

  -- Call the main function with the authenticated user's ID
  return query
  select * from public.get_feeders_with_status(auth.uid());
end;
$$;

-- Add comments for the updated functions
comment on function public.get_feeders_with_status(uuid) is 'Retrieves all feeders accessible to a user (owned + shared) with connection status and role information';
comment on function public.get_user_feeders_with_status() is 'RLS-friendly wrapper for get_feeders_with_status that includes shared feeder access'; 