-- Migration: Create feeder invitations table for email-based team invitations
-- Purpose: Manage email invitations for both existing and new users to join feeder teams
-- Author: Perry
-- Date: 2025-07-03
-- 
-- This migration creates the feeder_invitations table which handles the invitation flow
-- for sharing feeder access via email. Supports both existing users and new signups.

-- Create the feeder_invitations table
create table public.feeder_invitations (
  -- Primary key for unique identification
  id uuid primary key default gen_random_uuid(),
  
  -- Feeder being shared
  feeder_id uuid not null references public.feeders(id) on delete cascade,
  
  -- User who sent the invitation (feeder owner)
  inviter_id uuid not null references auth.users(id) on delete cascade,
  
  -- Email address of the person being invited
  invitee_email text not null,
  
  -- User ID if the invitee already has an account (set when email matches existing user)
  invitee_id uuid references auth.users(id) on delete set null,
  
  -- Role that will be assigned upon acceptance
  role feeder_role not null default 'viewer',
  
  -- Secure token for email links and validation
  invitation_token uuid not null default gen_random_uuid(),
  
  -- When this invitation expires
  expires_at timestamptz not null default (now() + interval '7 days'),
  
  -- Current status of the invitation
  status invitation_status not null default 'pending',
  
  -- When invitation was accepted/declined
  responded_at timestamptz,
  
  -- Whether this invitation required user signup
  signup_completed boolean default false,
  
  -- Audit timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Prevent duplicate invitations for same feeder+email
  unique(feeder_id, invitee_email)
);

-- Create indexes for optimal query performance

-- Index for finding invitations by feeder
create index idx_feeder_invitations_feeder_id 
  on public.feeder_invitations(feeder_id);

-- Index for finding invitations by inviter
create index idx_feeder_invitations_inviter_id 
  on public.feeder_invitations(inviter_id);

-- Index for finding invitations by email
create index idx_feeder_invitations_invitee_email 
  on public.feeder_invitations(invitee_email);

-- Index for finding invitations by user ID (for existing users)
create index idx_feeder_invitations_invitee_id 
  on public.feeder_invitations(invitee_id);

-- Index for finding invitations by token (for email links)
create index idx_feeder_invitations_invitation_token 
  on public.feeder_invitations(invitation_token);

-- Index for filtering by status
create index idx_feeder_invitations_status 
  on public.feeder_invitations(status);

-- Index for finding expired invitations (cleanup job)
create index idx_feeder_invitations_expires_at 
  on public.feeder_invitations(expires_at);

-- Composite index for pending invitations by email (signup flow)
create index idx_feeder_invitations_email_pending 
  on public.feeder_invitations(invitee_email, status) 
  where status = 'pending';

-- Enable Row Level Security (RLS)
alter table public.feeder_invitations enable row level security;

-- RLS Policy: Users can view invitations sent to their email
create policy "Users can view their own invitations"
  on public.feeder_invitations
  for select
  to authenticated
  using (
    invitee_email = (auth.jwt() -> 'email')::text
    or invitee_id = auth.uid()
  );

-- RLS Policy: Feeder owners can view invitations for their feeders
create policy "Feeder owners can view feeder invitations"
  on public.feeder_invitations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.feeders f
      where f.id = feeder_id
      and f.user_id = auth.uid()
    )
  );

-- RLS Policy: Inviters can view their sent invitations
create policy "Inviters can view their sent invitations"
  on public.feeder_invitations
  for select
  to authenticated
  using (auth.uid() = inviter_id);

-- RLS Policy: Feeder owners can create invitations
create policy "Feeder owners can create invitations"
  on public.feeder_invitations
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.feeders f
      where f.id = feeder_id
      and f.user_id = auth.uid()
    )
    and inviter_id = auth.uid()
  );

-- RLS Policy: Users can update their own invitation responses
create policy "Users can update their own invitation responses"
  on public.feeder_invitations
  for update
  to authenticated
  using (
    invitee_email = (auth.jwt() -> 'email')::text
    or invitee_id = auth.uid()
  )
  with check (
    invitee_email = (auth.jwt() -> 'email')::text
    or invitee_id = auth.uid()
  );

-- RLS Policy: Feeder owners can update invitations for their feeders
create policy "Feeder owners can update feeder invitations"
  on public.feeder_invitations
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

-- RLS Policy: Feeder owners can delete invitations for their feeders
create policy "Feeder owners can delete feeder invitations"
  on public.feeder_invitations
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
create trigger update_feeder_invitations_updated_at
  before update on public.feeder_invitations
  for each row
  execute function public.update_updated_at_column();

-- Helper function to accept an invitation by token
create or replace function public.accept_invitation(
  invitation_token_param uuid
)
returns boolean
language plpgsql
security definer
as $$
declare
  invitation_record public.feeder_invitations;
  membership_id uuid;
begin
  -- Get the invitation record
  select * into invitation_record
  from public.feeder_invitations
  where invitation_token = invitation_token_param
  and status = 'pending'
  and expires_at > now();

  -- Return false if invitation not found or expired
  if invitation_record is null then
    return false;
  end if;

  -- Validate that the current user matches the invitation
  if auth.uid() != invitation_record.invitee_id 
     and (auth.jwt() -> 'email')::text != invitation_record.invitee_email then
    return false;
  end if;

  -- Update invitation status
  update public.feeder_invitations
  set 
    status = 'accepted',
    responded_at = now(),
    invitee_id = auth.uid(),
    updated_at = now()
  where id = invitation_record.id;

  -- Create the membership
  insert into public.feeder_memberships (
    feeder_id,
    user_id,
    invited_by,
    role,
    status,
    invited_at,
    accepted_at
  ) values (
    invitation_record.feeder_id,
    auth.uid(),
    invitation_record.inviter_id,
    invitation_record.role,
    'accepted',
    invitation_record.created_at,
    now()
  ) returning id into membership_id;

  -- Apply role permissions to the new membership
  perform public.apply_role_permissions(membership_id, invitation_record.role);

  return true;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.accept_invitation(uuid) to authenticated;

-- Helper function to decline an invitation by token
create or replace function public.decline_invitation(
  invitation_token_param uuid
)
returns boolean
language plpgsql
security definer
as $$
declare
  invitation_record public.feeder_invitations;
begin
  -- Get the invitation record
  select * into invitation_record
  from public.feeder_invitations
  where invitation_token = invitation_token_param
  and status = 'pending'
  and expires_at > now();

  -- Return false if invitation not found or expired
  if invitation_record is null then
    return false;
  end if;

  -- Validate that the current user matches the invitation
  if auth.uid() != invitation_record.invitee_id 
     and (auth.jwt() -> 'email')::text != invitation_record.invitee_email then
    return false;
  end if;

  -- Update invitation status
  update public.feeder_invitations
  set 
    status = 'declined',
    responded_at = now(),
    invitee_id = auth.uid(),
    updated_at = now()
  where id = invitation_record.id;

  return true;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.decline_invitation(uuid) to authenticated;

-- Function to auto-accept invitations when a new user signs up
create or replace function public.handle_new_user_invitations()
returns trigger
language plpgsql
security definer
as $$
declare
  invitation_record public.feeder_invitations;
  membership_id uuid;
begin
  -- Find and process all pending invitations for this email
  for invitation_record in 
    select * from public.feeder_invitations
    where invitee_email = new.email
    and status = 'pending'
    and expires_at > now()
  loop
    -- Update invitation status
    update public.feeder_invitations
    set 
      status = 'accepted',
      responded_at = now(),
      invitee_id = new.id,
      signup_completed = true,
      updated_at = now()
    where id = invitation_record.id;

    -- Create the membership
    insert into public.feeder_memberships (
      feeder_id,
      user_id,
      invited_by,
      role,
      status,
      invited_at,
      accepted_at
    ) values (
      invitation_record.feeder_id,
      new.id,
      invitation_record.inviter_id,
      invitation_record.role,
      'accepted',
      invitation_record.created_at,
      now()
    ) returning id into membership_id;

    -- Apply role permissions to the new membership
    perform public.apply_role_permissions(membership_id, invitation_record.role);
  end loop;

  return new;
end;
$$;

-- Create trigger to auto-accept invitations on user signup
create trigger handle_new_user_invitations_trigger
  after insert on auth.users
  for each row execute function public.handle_new_user_invitations();

-- Helper function to check if an email has pending invitations
create or replace function public.has_pending_invitations(email_param text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.feeder_invitations
    where invitee_email = email_param
    and status = 'pending'
    and expires_at > now()
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.has_pending_invitations(text) to authenticated;

-- Function to cleanup expired invitations (call from scheduled job)
create or replace function public.cleanup_expired_invitations()
returns integer
language plpgsql
security definer
as $$
declare
  affected_count integer;
begin
  update public.feeder_invitations
  set 
    status = 'expired',
    updated_at = now()
  where status = 'pending'
  and expires_at <= now();
  
  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

-- Grant execute permission to authenticated users for cleanup
grant execute on function public.cleanup_expired_invitations() to authenticated;

-- Add table and column comments for documentation
comment on table public.feeder_invitations is 'Email-based invitations for sharing feeder access with team members';
comment on column public.feeder_invitations.feeder_id is 'Feeder being shared';
comment on column public.feeder_invitations.inviter_id is 'User who sent the invitation';
comment on column public.feeder_invitations.invitee_email is 'Email address of person being invited';
comment on column public.feeder_invitations.invitee_id is 'User ID if invitee has an account';
comment on column public.feeder_invitations.role is 'Role to assign upon acceptance';
comment on column public.feeder_invitations.invitation_token is 'Secure token for email links';
comment on column public.feeder_invitations.expires_at is 'When invitation expires';
comment on column public.feeder_invitations.status is 'Current invitation status';
comment on column public.feeder_invitations.signup_completed is 'Whether invitation required user signup';

comment on function public.accept_invitation(uuid) is 'Accepts an invitation by token and creates membership';
comment on function public.decline_invitation(uuid) is 'Declines an invitation by token';
comment on function public.handle_new_user_invitations() is 'Auto-accepts pending invitations when user signs up';
comment on function public.has_pending_invitations(text) is 'Checks if email has pending invitations';
comment on function public.cleanup_expired_invitations() is 'Marks expired invitations as expired (for scheduled cleanup)'; 