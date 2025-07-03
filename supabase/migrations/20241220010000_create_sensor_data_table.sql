-- Migration: Create sensor_data table for IoT sensor readings
-- Purpose: Store sensor readings from IoT devices in a normalized format
-- Author: System
-- Date: 2025-06-05
-- 
-- This migration creates a sensor_data table to store IoT sensor readings
-- in a long/narrow format where each sensor reading is stored as a separate row.
-- This approach allows for flexible storage of different sensor types without
-- requiring schema changes when new sensor types are introduced.

-- Create the sensor_data table
create table if not exists public.sensor_data (
  -- Primary key for unique identification of each sensor reading
  id bigserial primary key,
  
  -- Device identifier extracted from the MQTT topic
  device_id text not null,
  
  -- Type/name of the sensor (e.g., 'victronenergy.system._0.Dc.Battery.Soc')
  sensor_type text not null,
  
  -- The actual sensor reading value
  sensor_value numeric not null,
  
  -- Timestamp when the reading was taken (can be overridden by the application)
  timestamp timestamptz default now(),
  
  -- Audit field for when the record was created in the database
  created_at timestamptz default now()
);

-- Create indexes for optimal query performance
-- Index on device_id for filtering by specific devices
create index if not exists idx_sensor_data_device_id 
  on public.sensor_data(device_id);

-- Index on sensor_type for filtering by sensor types
create index if not exists idx_sensor_data_sensor_type 
  on public.sensor_data(sensor_type);

-- Index on timestamp for time-based queries and ordering
create index if not exists idx_sensor_data_timestamp 
  on public.sensor_data(timestamp desc);

-- Composite index for common query patterns (device + sensor type + time)
create index if not exists idx_sensor_data_device_sensor_time 
  on public.sensor_data(device_id, sensor_type, timestamp desc);

-- Enable Row Level Security (RLS) as required by Supabase best practices
alter table public.sensor_data enable row level security;

-- RLS Policy: Allow anonymous users to insert sensor data
-- This enables IoT devices to write sensor data without authentication
create policy "Allow anonymous insert on sensor_data"
  on public.sensor_data
  for insert
  to anon
  with check (true);

-- RLS Policy: Allow authenticated users to insert sensor data
-- This enables authenticated applications to write sensor data
create policy "Allow authenticated insert on sensor_data"
  on public.sensor_data
  for insert
  to authenticated
  with check (true);

-- RLS Policy: Allow anonymous users to select sensor data
-- This enables public dashboards or displays to read sensor data
create policy "Allow anonymous select on sensor_data"
  on public.sensor_data
  for select
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to select sensor data
-- This enables authenticated applications to read sensor data
create policy "Allow authenticated select on sensor_data"
  on public.sensor_data
  for select
  to authenticated
  using (true);

-- RLS Policy: Allow authenticated users to update sensor data
-- This enables corrections or updates to sensor readings if needed
create policy "Allow authenticated update on sensor_data"
  on public.sensor_data
  for update
  to authenticated
  using (true)
  with check (true);

-- RLS Policy: Allow authenticated users to delete sensor data
-- This enables data cleanup or removal of erroneous readings
create policy "Allow authenticated delete on sensor_data"
  on public.sensor_data
  for delete
  to authenticated
  using (true);

-- Add a comment to the table for documentation
comment on table public.sensor_data is 'Stores IoT sensor readings in a normalized format where each sensor reading is a separate row';

-- Add comments to columns for clarity
comment on column public.sensor_data.device_id is 'Unique identifier for the IoT device sending the sensor data';
comment on column public.sensor_data.sensor_type is 'The type or name of the sensor (e.g., battery voltage, solar panel output)';
comment on column public.sensor_data.sensor_value is 'The numerical value of the sensor reading';
comment on column public.sensor_data.timestamp is 'When the sensor reading was taken (defaults to insertion time)';
comment on column public.sensor_data.created_at is 'When this record was created in the database';