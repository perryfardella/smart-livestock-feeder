-- Migration: Add function to get feeders with connection status efficiently
-- Purpose: Optimize dashboard loading by calculating feeder status at database level
-- Author: System
-- Date: 2025-07-01

-- Function to get feeders with their connection status for a specific user
CREATE OR REPLACE FUNCTION public.get_feeders_with_status(user_uuid UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  device_id TEXT,
  name TEXT,
  description TEXT,
  location TEXT,
  timezone TEXT,
  is_active BOOLEAN,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_communication TIMESTAMPTZ,
  is_online BOOLEAN,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
    CASE 
      WHEN latest_sensor.timestamp IS NULL THEN FALSE
      WHEN latest_sensor.timestamp > (NOW() - INTERVAL '10 minutes') THEN TRUE
      ELSE FALSE
    END as is_online,
    CASE 
      WHEN latest_sensor.timestamp IS NULL THEN 'offline'
      WHEN latest_sensor.timestamp > (NOW() - INTERVAL '10 minutes') THEN 'online'
      ELSE 'offline'
    END as status
  FROM public.feeders f
  LEFT JOIN LATERAL (
    SELECT s.timestamp
    FROM public.sensor_data s
    WHERE s.device_id = f.device_id
    ORDER BY s.timestamp DESC
    LIMIT 1
  ) latest_sensor ON true
  WHERE f.user_id = user_uuid
  ORDER BY f.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_feeders_with_status(UUID) TO authenticated;

-- Add comment to document the function
COMMENT ON FUNCTION public.get_feeders_with_status(UUID) IS 'Efficiently retrieves all feeders for a user with their current connection status calculated at database level';

-- Create an RLS-friendly wrapper function that uses auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_feeders_with_status()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  device_id TEXT,
  name TEXT,
  description TEXT,
  location TEXT,
  timezone TEXT,
  is_active BOOLEAN,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_communication TIMESTAMPTZ,
  is_online BOOLEAN,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Call the main function with the authenticated user's ID
  RETURN QUERY
  SELECT * FROM public.get_feeders_with_status(auth.uid());
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_feeders_with_status() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_user_feeders_with_status() IS 'RLS-friendly wrapper for get_feeders_with_status that uses the authenticated user ID'; 