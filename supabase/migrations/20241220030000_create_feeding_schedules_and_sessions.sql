/*
 * Migration: Create feeding schedules and sessions tables
 * Purpose: Store feeding schedule configurations and their associated feeding sessions
 * Tables: feeding_schedules, feeding_sessions
 * Features: RLS enabled, foreign key relationships, proper indexing
 */

-- Create enum for feeding intervals
create type feeding_interval as enum ('daily', 'weekly', 'biweekly', 'four-weekly');

-- Create feeding_schedules table
create table public.feeding_schedules (
  id uuid default gen_random_uuid() primary key,
  feeder_id uuid not null references public.feeders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  start_date timestamptz not null,
  end_date timestamptz,
  interval feeding_interval not null default 'daily',
  days_of_week integer[] not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  
  -- Constraints
  constraint valid_days_of_week check (
    days_of_week <@ array[0,1,2,3,4,5,6]
  ),
  constraint valid_date_range check (end_date is null or end_date > start_date)
);

comment on table public.feeding_schedules is 'Stores feeding schedule configurations for livestock feeders including timing, intervals, and active days.';
comment on column public.feeding_schedules.feeder_id is 'References the feeder this schedule belongs to';
comment on column public.feeding_schedules.user_id is 'References the user who owns this schedule';
comment on column public.feeding_schedules.start_date is 'When the feeding schedule starts (includes time)';
comment on column public.feeding_schedules.end_date is 'Optional end date/time for the schedule';
comment on column public.feeding_schedules.interval is 'How often the feeding occurs (daily, weekly, biweekly, four-weekly)';
comment on column public.feeding_schedules.days_of_week is 'Array of day numbers (0=Sunday, 6=Saturday) when feeding occurs for non-daily schedules';

-- Create feeding_sessions table
create table public.feeding_sessions (
  id uuid default gen_random_uuid() primary key,
  feeding_schedule_id uuid not null references public.feeding_schedules (id) on delete cascade,
  time time not null,
  feed_amount numeric(10,2) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  
  -- Constraints
  constraint positive_feed_amount check (feed_amount > 0)
);

comment on table public.feeding_sessions is 'Stores individual feeding sessions within a schedule, defining specific times and amounts for each feeding.';
comment on column public.feeding_sessions.feeding_schedule_id is 'References the parent feeding schedule';
comment on column public.feeding_sessions.time is 'Time of day when feeding occurs (HH:MM format)';
comment on column public.feeding_sessions.feed_amount is 'Amount of feed to dispense in kilograms';

-- Create indexes for performance
create index idx_feeding_schedules_feeder_id on public.feeding_schedules (feeder_id);
create index idx_feeding_schedules_user_id on public.feeding_schedules (user_id);
create index idx_feeding_schedules_start_date on public.feeding_schedules (start_date);
create index idx_feeding_sessions_schedule_id on public.feeding_sessions (feeding_schedule_id);
create index idx_feeding_sessions_time on public.feeding_sessions (time);

-- Create updated_at trigger function if it doesn't exist
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at columns
create trigger update_feeding_schedules_updated_at
  before update on public.feeding_schedules
  for each row execute function public.update_updated_at_column();

create trigger update_feeding_sessions_updated_at
  before update on public.feeding_sessions
  for each row execute function public.update_updated_at_column();

-- Enable Row Level Security
alter table public.feeding_schedules enable row level security;
alter table public.feeding_sessions enable row level security;

-- RLS Policies for feeding_schedules

-- Allow authenticated users to select their own feeding schedules
create policy "Users can select their own feeding schedules"
  on public.feeding_schedules
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Allow authenticated users to insert feeding schedules for their own feeders
create policy "Users can insert feeding schedules for their feeders"
  on public.feeding_schedules
  for insert
  to authenticated
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.feeders
      where feeders.id = feeder_id and feeders.user_id = auth.uid()
    )
  );

-- Allow authenticated users to update their own feeding schedules
create policy "Users can update their own feeding schedules"
  on public.feeding_schedules
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow authenticated users to delete their own feeding schedules
create policy "Users can delete their own feeding schedules"
  on public.feeding_schedules
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policies for feeding_sessions

-- Allow authenticated users to select sessions for their feeding schedules
create policy "Users can select sessions for their feeding schedules"
  on public.feeding_sessions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.feeding_schedules
      where feeding_schedules.id = feeding_schedule_id 
      and feeding_schedules.user_id = auth.uid()
    )
  );

-- Allow authenticated users to insert sessions for their feeding schedules
create policy "Users can insert sessions for their feeding schedules"
  on public.feeding_sessions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.feeding_schedules
      where feeding_schedules.id = feeding_schedule_id 
      and feeding_schedules.user_id = auth.uid()
    )
  );

-- Allow authenticated users to update sessions for their feeding schedules
create policy "Users can update sessions for their feeding schedules"
  on public.feeding_sessions
  for update
  to authenticated
  using (
    exists (
      select 1 from public.feeding_schedules
      where feeding_schedules.id = feeding_schedule_id 
      and feeding_schedules.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.feeding_schedules
      where feeding_schedules.id = feeding_schedule_id 
      and feeding_schedules.user_id = auth.uid()
    )
  );

-- Allow authenticated users to delete sessions for their feeding schedules
create policy "Users can delete sessions for their feeding schedules"
  on public.feeding_sessions
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.feeding_schedules
      where feeding_schedules.id = feeding_schedule_id 
      and feeding_schedules.user_id = auth.uid()
    )
  ); 