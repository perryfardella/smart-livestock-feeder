## Accessibility and security of data

- One user is associated with many feeders, but a feeder is only associated with one user (the admin/master user)
  (We currently allow multiple users to be associated with a feeder for testing purposes, once the permissions system is built
  we can remove this functionality - there is already TODO's to handle this in the code.)

## Access by others

- The master user can invite other users who are on the platform already, or off-platform to have access to one, multiple or all of their feeders. Invitations can be done through e-mail, they need to be accepted by the user before being actioned.
- The master can choose to give a user templated-access, ie. read-only, full-write/edit access, or schedule edit access only.
- There will also be a permissions panel where the master user can then fine tweak with switch buttons what an invited user can edit or not.
- The master user can remove a user's access to their feeders at any time
- A team member may remove themselves from an individual feeder, or all features associated with a master at any time.
- A user can be in multiple teams, with multiple masters.

---

## Technical Implementation Specifications

### Database Schema Design

#### 1. Feeder Memberships Table

```sql
create table public.feeder_memberships (
  id uuid primary key default gen_random_uuid(),
  feeder_id uuid not null references public.feeders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role feeder_role not null default 'viewer',
  status membership_status not null default 'pending',
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Prevent duplicate memberships
  unique(feeder_id, user_id)
);
```

#### 2. Permission Templates & Custom Permissions

```sql
-- Enum for predefined roles
create type feeder_role as enum ('viewer', 'scheduler', 'manager', 'owner');

-- Enum for membership status
create type membership_status as enum ('pending', 'accepted', 'declined', 'revoked');

-- Custom permissions table for fine-grained control
create table public.feeder_permissions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.feeder_memberships(id) on delete cascade,
  permission_type permission_type not null,
  granted boolean not null default false,

  unique(membership_id, permission_type)
);

-- Enum for granular permissions
create type permission_type as enum (
  'view_sensor_data',
  'view_feeding_schedules',
  'create_feeding_schedules',
  'edit_feeding_schedules',
  'delete_feeding_schedules',
  'manual_feed_release',
  'view_camera_feeds',
  'edit_feeder_settings',
  'invite_other_users',
  'manage_permissions'
);
```

#### 3. Invitation System

```sql
create table public.feeder_invitations (
  id uuid primary key default gen_random_uuid(),
  feeder_id uuid not null references public.feeders(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  invitee_id uuid references auth.users(id) on delete set null,
  role feeder_role not null default 'viewer',
  invitation_token uuid default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  status invitation_status not null default 'pending',
  created_at timestamptz default now(),

  unique(feeder_id, invitee_email)
);

create type invitation_status as enum ('pending', 'accepted', 'declined', 'expired', 'revoked');
```

### Permission Templates

#### Predefined Role Permissions

```typescript
const ROLE_PERMISSIONS = {
  viewer: ["view_sensor_data", "view_feeding_schedules", "view_camera_feeds"],
  scheduler: [
    "view_sensor_data",
    "view_feeding_schedules",
    "create_feeding_schedules",
    "edit_feeding_schedules",
    "delete_feeding_schedules",
    "manual_feed_release",
    "view_camera_feeds",
  ],
  manager: [
    "view_sensor_data",
    "view_feeding_schedules",
    "create_feeding_schedules",
    "edit_feeding_schedules",
    "delete_feeding_schedules",
    "manual_feed_release",
    "view_camera_feeds",
    "edit_feeder_settings",
  ],
  owner: [
    // All permissions (original feeder owner)
    "view_sensor_data",
    "view_feeding_schedules",
    "create_feeding_schedules",
    "edit_feeding_schedules",
    "delete_feeding_schedules",
    "manual_feed_release",
    "view_camera_feeds",
    "edit_feeder_settings",
    "invite_other_users",
    "manage_permissions",
  ],
} as const;
```

### Updated Row Level Security Policies

#### Enhanced Feeder Access Policies

```sql
-- Users can view feeders they own OR have membership access to
create policy "Users can view accessible feeders"
  on public.feeders
  for select
  to authenticated
  using (
    auth.uid() = user_id OR
    exists (
      select 1 from public.feeder_memberships fm
      where fm.feeder_id = feeders.id
      and fm.user_id = auth.uid()
      and fm.status = 'accepted'
    )
  );
```

#### Permission-Based Schedule Access

```sql
-- Users can view feeding schedules if they have permission
create policy "Users can view feeding schedules with permission"
  on public.feeding_schedules
  for select
  to authenticated
  using (
    auth.uid() = user_id OR
    exists (
      select 1 from public.feeder_memberships fm
      join public.feeder_permissions fp on fm.id = fp.membership_id
      where fm.feeder_id = feeding_schedules.feeder_id
      and fm.user_id = auth.uid()
      and fm.status = 'accepted'
      and fp.permission_type = 'view_feeding_schedules'
      and fp.granted = true
    )
  );
```

### API Layer Changes

#### Permission Checking Middleware

```typescript
// Utility function to check permissions
export async function checkFeederPermission(
  feederId: string,
  userId: string,
  permission: PermissionType
): Promise<boolean> {
  const supabase = await createClient();

  // Check if user is the owner
  const { data: feeder } = await supabase
    .from("feeders")
    .select("user_id")
    .eq("id", feederId)
    .eq("user_id", userId)
    .single();

  if (feeder) return true; // Owner has all permissions

  // Check membership permissions
  const { data: permission_check } = await supabase
    .from("feeder_memberships")
    .select(
      `
      feeder_permissions!inner(granted)
    `
    )
    .eq("feeder_id", feederId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .eq("feeder_permissions.permission_type", permission)
    .eq("feeder_permissions.granted", true)
    .single();

  return !!permission_check;
}
```

### User Interface Components

#### Permissions Management Panel

```typescript
// Components needed:
// 1. FeederMembersList - shows current team members
// 2. InviteUserForm - send invitations via email
// 3. PermissionMatrix - toggle individual permissions
// 4. RoleSelector - quick role assignment
// 5. MembershipCard - individual member management
```

## Implementation Phases

### Phase 1: Core Infrastructure (2-3 weeks)

1. Create database tables and enums
2. Update RLS policies for basic shared access
3. Build permission checking utilities
4. Update existing feeder queries to respect permissions

### Phase 2: Invitation System (2 weeks)

1. Email invitation flow
2. Accept/decline invitation pages
3. Invitation management for feeder owners
4. Email templates and notifications

### Phase 3: Permission Management UI (2-3 weeks)

1. Team members management interface
2. Role assignment and permission toggles
3. Invitation status tracking
4. Self-removal functionality

### Phase 4: Enhanced Features (1-2 weeks)

1. Bulk permission management
2. Permission templates/presets
3. Audit logs for permission changes
4. Advanced notification preferences

## Security Considerations

### Data Isolation

- RLS policies ensure users only see data they have permission to access
- Permission checks at API level provide defense in depth
- Audit trails for all permission changes

### Invitation Security

- Time-limited invitation tokens (7 days expiry)
- Email verification before account linking
- Rate limiting on invitations (max 10 per feeder per day)

### Permission Validation

- Server-side permission validation on all operations
- Graceful degradation when permissions change
- Real-time permission updates via Supabase realtime

## Invitation Flow for New Users

### For Users Without Accounts:

1. **Invitation Created**: Owner sends invitation with email address
2. **Email Sent**: Custom invitation email with signup link + invitation token
3. **User Signs Up**: Special signup flow that includes invitation token
4. **Auto-Accept**: On successful signup, automatically accept pending invitations
5. **Access Granted**: User immediately sees shared feeders in their dashboard

### For Existing Users:

1. **Invitation Created**: Owner sends invitation
2. **Email Sent**: Notification email with accept/decline links
3. **User Response**: User clicks accept/decline in email or app
4. **Access Granted**: Shared feeders appear in user's dashboard

### Email Implementation (MVP - Supabase Auth)

Using Supabase's built-in email system with custom invitation flow:

```typescript
// Send invitation email using Supabase
export async function sendFeederInvitation(
  feederName: string,
  inviterName: string,
  inviteeEmail: string,
  invitationToken: string,
  role: string
) {
  const supabase = await createClient();

  // Check if user exists
  const { data: existingUser } = await supabase
    .from("auth.users")
    .select("id")
    .eq("email", inviteeEmail)
    .single();

  if (existingUser) {
    // Send accept/decline email to existing user
    const acceptUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/invitations/accept?token=${invitationToken}`;
    // Use your email service here
  } else {
    // Send signup invitation email
    const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/sign-up?invitation_token=${invitationToken}&email=${inviteeEmail}`;
    // Use your email service here
  }
}
```

### Technical Implementation Notes

#### Database Modifications:

```sql
-- Add invitation tracking to auth flow
alter table public.feeder_invitations
add column signup_completed boolean default false;

-- Function to auto-accept invitations on signup
create or replace function public.handle_new_user_invitations()
returns trigger as $$
begin
  -- Auto-accept any pending invitations for this email
  update public.feeder_invitations
  set
    status = 'accepted',
    invitee_id = new.id,
    signup_completed = true
  where invitee_email = new.email
  and status = 'pending'
  and expires_at > now();

  -- Create memberships for accepted invitations
  insert into public.feeder_memberships (
    feeder_id, user_id, invited_by, role, status, accepted_at
  )
  select
    feeder_id, new.id, inviter_id, role, 'accepted', now()
  from public.feeder_invitations
  where invitee_id = new.id and signup_completed = true;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to run after user signup
create trigger handle_new_user_invitations_trigger
  after insert on auth.users
  for each row execute function public.handle_new_user_invitations();
```

#### Invitation URLs:

```
# For new users
https://smartfeeder.com/auth/sign-up?invitation_token=uuid&email=user@example.com

# For existing users
https://smartfeeder.com/invitations/accept?token=uuid
```
