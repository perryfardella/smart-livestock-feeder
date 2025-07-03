-- Migration: Fix infinite recursion in feeders RLS policies
-- Purpose: Resolve circular dependency between feeders and feeder_memberships RLS policies
-- Author: Perry
-- Date: 2025-07-03
-- 
-- The issue: The feeders SELECT policy references feeder_memberships, but feeder_memberships
-- policies reference feeders, creating infinite recursion when PostgreSQL evaluates RLS.
-- 
-- Solution: Use security definer functions to bypass RLS during policy evaluation,
-- preventing the circular dependency while maintaining proper access controls.

-- ============================================================================
-- CREATE HELPER FUNCTIONS (SECURITY DEFINER TO BYPASS RLS)
-- ============================================================================

-- Function to check if a user has membership access to a feeder
-- This bypasses RLS to prevent circular dependency
create or replace function public.user_has_feeder_membership(
  feeder_id_param uuid,
  user_id_param uuid
)
returns boolean
language plpgsql
security definer -- This bypasses RLS
set search_path = public
as $$
begin
  return exists (
    select 1 from feeder_memberships fm
    where fm.feeder_id = feeder_id_param
    and fm.user_id = user_id_param
    and fm.status = 'accepted'
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.user_has_feeder_membership(uuid, uuid) to authenticated;

-- ============================================================================
-- FIX FEEDERS TABLE RLS POLICIES
-- ============================================================================

-- Drop the problematic recursive policy
drop policy if exists "Users can view accessible feeders" on public.feeders;

-- Create new non-recursive policy using our security definer function
create policy "Users can view accessible feeders"
  on public.feeders
  for select
  to authenticated
  using (
    -- User owns the feeder
    auth.uid() = user_id
    OR
    -- User has accepted membership (using security definer function to avoid recursion)
    public.user_has_feeder_membership(id, auth.uid())
  );

-- ============================================================================
-- SIMPLIFY FEEDER_MEMBERSHIPS RLS POLICIES
-- ============================================================================

-- The feeder_memberships policies should NOT reference the feeders table
-- to avoid circular dependency. Instead, we'll use a more direct approach.

-- Drop the problematic policy that references feeders
drop policy if exists "Feeder owners can view feeder memberships" on public.feeder_memberships;

-- Create a replacement policy that checks ownership differently
-- We'll use the invited_by field and a security definer function
create or replace function public.user_owns_feeder(
  feeder_id_param uuid,
  user_id_param uuid
)
returns boolean
language plpgsql
security definer -- This bypasses RLS
set search_path = public
as $$
begin
  return exists (
    select 1 from feeders f
    where f.id = feeder_id_param
    and f.user_id = user_id_param
  );
end;
$$;

-- Grant execute permission
grant execute on function public.user_owns_feeder(uuid, uuid) to authenticated;

-- Create new policy for feeder owners to view memberships
create policy "Feeder owners can view feeder memberships"
  on public.feeder_memberships
  for select
  to authenticated
  using (
    public.user_owns_feeder(feeder_id, auth.uid())
  );

-- ============================================================================
-- UPDATE OTHER PROBLEMATIC POLICIES
-- ============================================================================

-- Fix other policies that might cause similar issues
-- Update feeder_memberships INSERT policy
drop policy if exists "Feeder owners can create memberships" on public.feeder_memberships;

create policy "Feeder owners can create memberships"
  on public.feeder_memberships
  for insert
  to authenticated
  with check (
    public.user_owns_feeder(feeder_id, auth.uid())
    and invited_by = auth.uid()
  );

-- Update feeder_memberships UPDATE policy  
drop policy if exists "Feeder owners can update feeder memberships" on public.feeder_memberships;

create policy "Feeder owners can update feeder memberships"
  on public.feeder_memberships
  for update
  to authenticated
  using (
    public.user_owns_feeder(feeder_id, auth.uid())
  )
  with check (
    public.user_owns_feeder(feeder_id, auth.uid())
  );

-- Update feeder_memberships DELETE policy
drop policy if exists "Feeder owners can delete feeder memberships" on public.feeder_memberships;

create policy "Feeder owners can delete feeder memberships"
  on public.feeder_memberships
  for delete
  to authenticated
  using (
    public.user_owns_feeder(feeder_id, auth.uid())
  );

-- ============================================================================
-- FIX FEEDER_PERMISSIONS POLICIES
-- ============================================================================

-- Update feeder_permissions policies to use the same approach
drop policy if exists "Feeder owners can view feeder permissions" on public.feeder_permissions;
drop policy if exists "Feeder owners can create feeder permissions" on public.feeder_permissions;
drop policy if exists "Feeder owners can update feeder permissions" on public.feeder_permissions;
drop policy if exists "Feeder owners can delete feeder permissions" on public.feeder_permissions;

-- Helper function to check if user owns feeder through membership
create or replace function public.user_owns_feeder_via_membership(
  membership_id_param uuid,
  user_id_param uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from feeder_memberships fm
    join feeders f on f.id = fm.feeder_id
    where fm.id = membership_id_param
    and f.user_id = user_id_param
  );
end;
$$;

grant execute on function public.user_owns_feeder_via_membership(uuid, uuid) to authenticated;

-- Recreate feeder_permissions policies
create policy "Feeder owners can view feeder permissions"
  on public.feeder_permissions
  for select
  to authenticated
  using (
    public.user_owns_feeder_via_membership(membership_id, auth.uid())
  );

create policy "Feeder owners can create feeder permissions"
  on public.feeder_permissions
  for insert
  to authenticated
  with check (
    public.user_owns_feeder_via_membership(membership_id, auth.uid())
  );

create policy "Feeder owners can update feeder permissions"
  on public.feeder_permissions
  for update
  to authenticated
  using (
    public.user_owns_feeder_via_membership(membership_id, auth.uid())
  )
  with check (
    public.user_owns_feeder_via_membership(membership_id, auth.uid())
  );

create policy "Feeder owners can delete feeder permissions"
  on public.feeder_permissions
  for delete
  to authenticated
  using (
    public.user_owns_feeder_via_membership(membership_id, auth.uid())
  );

-- ============================================================================
-- FIX FEEDER_INVITATIONS POLICIES
-- ============================================================================

-- Update feeder_invitations policies to use the same approach
drop policy if exists "Feeder owners can view feeder invitations" on public.feeder_invitations;
drop policy if exists "Feeder owners can create invitations" on public.feeder_invitations;
drop policy if exists "Feeder owners can update feeder invitations" on public.feeder_invitations;
drop policy if exists "Feeder owners can delete feeder invitations" on public.feeder_invitations;

-- Recreate feeder_invitations policies
create policy "Feeder owners can view feeder invitations"
  on public.feeder_invitations
  for select
  to authenticated
  using (
    public.user_owns_feeder(feeder_id, auth.uid())
  );

create policy "Feeder owners can create invitations"
  on public.feeder_invitations
  for insert
  to authenticated
  with check (
    public.user_owns_feeder(feeder_id, auth.uid())
    and inviter_id = auth.uid()
  );

create policy "Feeder owners can update feeder invitations"
  on public.feeder_invitations
  for update
  to authenticated
  using (
    public.user_owns_feeder(feeder_id, auth.uid())
  )
  with check (
    public.user_owns_feeder(feeder_id, auth.uid())
  );

create policy "Feeder owners can delete feeder invitations"
  on public.feeder_invitations
  for delete
  to authenticated
  using (
    public.user_owns_feeder(feeder_id, auth.uid())
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on function public.user_has_feeder_membership(uuid, uuid) is 'Security definer function to check feeder membership without triggering RLS recursion';
comment on function public.user_owns_feeder(uuid, uuid) is 'Security definer function to check feeder ownership without triggering RLS recursion';
comment on function public.user_owns_feeder_via_membership(uuid, uuid) is 'Security definer function to check feeder ownership via membership ID without triggering RLS recursion'; 