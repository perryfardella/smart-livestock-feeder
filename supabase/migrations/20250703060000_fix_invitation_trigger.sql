-- Migration: Fix invitation trigger to prevent signup failures
-- Purpose: Make the auto-invitation acceptance more robust during user signup
-- Author: Perry
-- Date: 2025-07-03

-- Drop the existing trigger first
drop trigger if exists handle_new_user_invitations_trigger on auth.users;

-- Create a safer version of the invitation handler function
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
    begin
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

      -- Try to apply role permissions, but don't fail if function doesn't exist
      begin
        perform public.apply_role_permissions(membership_id, invitation_record.role);
      exception when others then
        -- Log the error but don't fail the signup
        raise notice 'Failed to apply role permissions for membership %: %', membership_id, SQLERRM;
      end;

    exception when others then
      -- Log the error but don't fail the entire signup process
      raise notice 'Failed to process invitation % for user %: %', invitation_record.id, new.id, SQLERRM;
    end;
  end loop;

  return new;
end;
$$;

-- Create the trigger again
create trigger handle_new_user_invitations_trigger
  after insert on auth.users
  for each row execute function public.handle_new_user_invitations();

-- Add some helpful comments
comment on function public.handle_new_user_invitations() is 'Auto-accepts pending invitations when user signs up (robust version that will not fail signup)'; 