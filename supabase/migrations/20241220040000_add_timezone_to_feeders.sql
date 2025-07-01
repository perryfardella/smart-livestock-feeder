-- Migration: Add timezone field to feeders table
-- Purpose: Allow users to set timezone for each feeder to handle scheduling properly
-- Author: System
-- Date: 2024-12-20

-- Add timezone column to feeders table
alter table public.feeders 
add column timezone text not null default 'Australia/Sydney';

-- Add index for timezone queries (optional but good for performance)
create index if not exists idx_feeders_timezone 
  on public.feeders(timezone);

-- Add comment to the column for documentation
comment on column public.feeders.timezone is 'IANA timezone identifier for this feeder (e.g., "Australia/Sydney", "America/New_York")';

-- Note: We're using Australia/Sydney as default since the target audience is Australian hobby farmers
-- Users can change this to their preferred timezone when creating or editing feeders 