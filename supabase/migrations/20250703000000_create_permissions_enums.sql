-- Migration: Create enums and types for permissions system
-- Purpose: Establish foundational types for feeder permissions and team management
-- Author: System
-- Date: 2025-07-03
-- 
-- This migration creates the enum types that will be used throughout the permissions
-- system for role-based access control, invitation management, and membership status tracking.

-- Enum for predefined feeder roles
-- Hierarchy: viewer < scheduler < manager < owner
create type feeder_role as enum (
  'viewer',     -- Read-only access to sensor data, schedules, camera feeds
  'scheduler',  -- Can manage feeding schedules and trigger manual feeds  
  'manager',    -- Can edit feeder settings in addition to scheduling
  'owner'       -- Full permissions including team management (original owner)
);

-- Enum for membership status tracking
-- Tracks the lifecycle of a user's membership to a feeder
create type membership_status as enum (
  'pending',    -- Invitation sent but not yet responded to
  'accepted',   -- User has accepted the invitation and has access
  'declined',   -- User has declined the invitation
  'revoked'     -- Access has been revoked by the feeder owner
);

-- Enum for invitation status tracking  
-- Tracks the lifecycle of invitations sent to users
create type invitation_status as enum (
  'pending',    -- Invitation sent but not yet responded to
  'accepted',   -- User has accepted the invitation
  'declined',   -- User has declined the invitation
  'expired',    -- Invitation has passed its expiration date
  'revoked'     -- Invitation has been cancelled by the sender
);

-- Enum for granular permission types
-- These can be combined to create custom permission sets
create type permission_type as enum (
  'view_sensor_data',           -- View real-time and historical sensor data
  'view_feeding_schedules',     -- View existing feeding schedules
  'create_feeding_schedules',   -- Create new feeding schedules
  'edit_feeding_schedules',     -- Modify existing feeding schedules
  'delete_feeding_schedules',   -- Delete feeding schedules
  'manual_feed_release',        -- Trigger manual feeding via MQTT
  'view_camera_feeds',          -- Access camera feeds (future feature)
  'edit_feeder_settings',       -- Modify feeder configuration and settings
  'invite_other_users',         -- Send invitations to new team members
  'manage_permissions'          -- Modify permissions of other team members
);

-- Add comments for documentation
comment on type feeder_role is 'Predefined roles for feeder team members with hierarchical permissions';
comment on type membership_status is 'Status of a user membership to a feeder team';  
comment on type invitation_status is 'Status of an invitation sent to a potential team member';
comment on type permission_type is 'Individual permission types that can be granted to team members';

-- Add detailed comments for each enum value
comment on type feeder_role is 'Roles: viewer (read-only), scheduler (+ manage schedules), manager (+ edit settings), owner (+ team management)';
comment on type membership_status is 'Status: pending (invited), accepted (active member), declined (rejected invite), revoked (access removed)';
comment on type invitation_status is 'Status: pending (awaiting response), accepted (completed), declined (rejected), expired (timed out), revoked (cancelled)'; 