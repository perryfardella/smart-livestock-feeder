-- Migration: Create feeder memberships table for team access
-- Purpose: Enable users to share feeder access with team members through role-based permissions
-- Author: Perry
-- Date: 2025-07-03
-- 
-- This migration creates the feeder_memberships table which is the core of the permissions system.
-- It tracks which users have access to which feeders, their roles, and invitation/acceptance status.

-- Create the feeder_memberships table
create table public.feeder_memberships (
  -- Primary key for unique identification
  id uuid primary key default gen_random_uuid(),
  
  -- Foreign key to the feeder being shared
  feeder_id uuid not null references public.feeders(id) on delete cascade,
  
  -- User who has been granted access to the feeder
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- User who sent the invitation (feeder owner or admin)
  invited_by uuid not null references auth.users(id) on delete cascade,
  
  -- Role defines the level of access (viewer, scheduler, manager, owner)
  role feeder_role not null default 'viewer',
  
  -- Current status of the membership
  status membership_status not null default 'pending',
  
  -- Timestamp when invitation was sent
  invited_at timestamptz default now(),
  
  -- Timestamp when invitation was accepted (null if pending/declined)
  accepted_at timestamptz,
  
  -- Audit timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Prevent duplicate memberships (one user per feeder)
  unique(feeder_id, user_id)
);

-- Create indexes for optimal query performance

-- Index for finding all members of a specific feeder
create index idx_feeder_memberships_feeder_id 
  on public.feeder_memberships(feeder_id);

-- Index for finding all feeders a user has access to
create index idx_feeder_memberships_user_id 
  on public.feeder_memberships(user_id);

-- Index for filtering by membership status
create index idx_feeder_memberships_status 
  on public.feeder_memberships(status);

-- Index for filtering by role
create index idx_feeder_memberships_role 
  on public.feeder_memberships(role);

-- Composite index for user + accepted memberships (common query pattern)
create index idx_feeder_memberships_user_accepted 
  on public.feeder_memberships(user_id, status) 
  where status = 'accepted';

-- Index for finding who invited a user
create index idx_feeder_memberships_invited_by 
  on public.feeder_memberships(invited_by);

-- Enable Row Level Security (RLS)
alter table public.feeder_memberships enable row level security;

-- RLS Policy: Users can view their own memberships
create policy "Users can view their own memberships"
  on public.feeder_memberships
  for select
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policy: Feeder owners can view all memberships for their feeders
create policy "Feeder owners can view feeder memberships"
  on public.feeder_memberships
  for select
  to authenticated
  using (
    exists (
      select 1 from public.feeders f
      where f.id = feeder_id
      and f.user_id = auth.uid()
    )
  );

-- RLS Policy: Users who invited others can view those memberships
create policy "Inviters can view their sent invitations"
  on public.feeder_memberships
  for select
  to authenticated
  using (auth.uid() = invited_by);

-- RLS Policy: Feeder owners can create memberships (send invitations)
create policy "Feeder owners can create memberships"
  on public.feeder_memberships
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.feeders f
      where f.id = feeder_id
      and f.user_id = auth.uid()
    )
    and invited_by = auth.uid()
  );

-- RLS Policy: Users can update their own membership status (accept/decline)
create policy "Users can update their own membership status"
  on public.feeder_memberships
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policy: Feeder owners can update memberships for their feeders
create policy "Feeder owners can update feeder memberships"
  on public.feeder_memberships
  for update
  to authenticated
  using (
    exists (
      select 1 from public.feeders f
      where f.id = feeder_id
      and f.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.feeders f
      where f.id = feeder_id
      and f.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete their own memberships (leave feeder)
create policy "Users can delete their own memberships"
  on public.feeder_memberships
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policy: Feeder owners can delete memberships for their feeders
create policy "Feeder owners can delete feeder memberships"
  on public.feeder_memberships
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.feeders f
      where f.id = feeder_id
      and f.user_id = auth.uid()
    )
  );

-- Create trigger for automatic updated_at timestamp
create trigger update_feeder_memberships_updated_at
  before update on public.feeder_memberships
  for each row
  execute function public.update_updated_at_column();

-- Helper function to check if a user has membership access to a feeder
create or replace function public.has_feeder_access(
  feeder_id_param uuid,
  user_id_param uuid default auth.uid()
)
returns boolean
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
    return true;
  end if;

  -- Check if user has accepted membership
  return exists (
    select 1 from public.feeder_memberships fm
    where fm.feeder_id = feeder_id_param
    and fm.user_id = user_id_param
    and fm.status = 'accepted'
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.has_feeder_access(uuid, uuid) to authenticated;

-- Helper function to get user's role for a feeder
create or replace function public.get_user_feeder_role(
  feeder_id_param uuid,
  user_id_param uuid default auth.uid()
)
returns feeder_role
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
    return 'owner'::feeder_role;
  end if;

  -- Get user's membership role
  return (
    select fm.role
    from public.feeder_memberships fm
    where fm.feeder_id = feeder_id_param
    and fm.user_id = user_id_param
    and fm.status = 'accepted'
    limit 1
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_user_feeder_role(uuid, uuid) to authenticated;

-- Add table and column comments for documentation
comment on table public.feeder_memberships is 'Tracks team member access to feeders with role-based permissions';
comment on column public.feeder_memberships.feeder_id is 'Feeder being shared with team members';
comment on column public.feeder_memberships.user_id is 'User who has been granted access';
comment on column public.feeder_memberships.invited_by is 'User who sent the invitation';
comment on column public.feeder_memberships.role is 'Access level: viewer, scheduler, manager, or owner';
comment on column public.feeder_memberships.status is 'Invitation status: pending, accepted, declined, or revoked';
comment on column public.feeder_memberships.invited_at is 'When the invitation was sent';
comment on column public.feeder_memberships.accepted_at is 'When the invitation was accepted (null if not accepted)';

comment on function public.has_feeder_access(uuid, uuid) is 'Checks if a user has access to a feeder (owner or accepted member)';
comment on function public.get_user_feeder_role(uuid, uuid) is 'Returns the user''s role for a specific feeder'; 