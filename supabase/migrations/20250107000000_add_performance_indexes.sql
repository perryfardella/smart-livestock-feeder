-- Migration: Add performance indexes and optimizations
-- Purpose: Improve query performance across the application based on usage patterns
-- Author: System
-- Date: 2025-01-07
-- 
-- This migration adds strategic indexes and optimizations to improve performance
-- for the most common query patterns in the application:
-- 1. Sensor data time-based queries (high volume)
-- 2. Permission system lookups
-- 3. Dashboard feeder status queries
-- 4. Invitation management
-- 5. Feeding schedule queries

-- ============================================================================
-- SENSOR DATA OPTIMIZATIONS
-- ============================================================================

-- Add composite index for recent sensor data queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_sensor_data_recent_activity
ON public.sensor_data (device_id, sensor_type, timestamp DESC);

-- Add index for connection status queries (latest per device)
CREATE INDEX IF NOT EXISTS idx_sensor_data_latest_per_device
ON public.sensor_data (device_id, timestamp DESC);

-- Add index for sensor type statistics and filtering
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_type_value
ON public.sensor_data (device_id, sensor_type, sensor_value, timestamp DESC);

-- Add index for timestamp range queries with device filtering
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp_range
ON public.sensor_data (timestamp DESC, device_id);

-- ============================================================================
-- FEEDER MEMBERSHIPS OPTIMIZATIONS
-- ============================================================================

-- Add composite index for permission checking (most common RLS pattern)
CREATE INDEX IF NOT EXISTS idx_feeder_memberships_permission_check
ON public.feeder_memberships (feeder_id, user_id, status)
WHERE status = 'accepted';

-- Add index for finding all feeders accessible to a user (dashboard query)
CREATE INDEX IF NOT EXISTS idx_feeder_memberships_user_feeders
ON public.feeder_memberships (user_id, feeder_id, status, role)
WHERE status = 'accepted';

-- Add index for membership management queries
CREATE INDEX IF NOT EXISTS idx_feeder_memberships_management
ON public.feeder_memberships (feeder_id, status, role, invited_at DESC);

-- ============================================================================
-- FEEDER INVITATIONS OPTIMIZATIONS
-- ============================================================================

-- Add index for email-based invitation lookups (signup flow)
CREATE INDEX IF NOT EXISTS idx_feeder_invitations_email_lookup
ON public.feeder_invitations (invitee_email, status, expires_at DESC)
WHERE status = 'pending';

-- Add index for token-based invitation acceptance
CREATE INDEX IF NOT EXISTS idx_feeder_invitations_token_lookup
ON public.feeder_invitations (invitation_token, status, expires_at)
WHERE status = 'pending';

-- Add index for cleanup of expired invitations
CREATE INDEX IF NOT EXISTS idx_feeder_invitations_cleanup
ON public.feeder_invitations (expires_at, status)
WHERE status = 'pending';

-- Add index for feeder owner invitation management
CREATE INDEX IF NOT EXISTS idx_feeder_invitations_feeder_management
ON public.feeder_invitations (feeder_id, inviter_id, status, created_at DESC);

-- ============================================================================
-- FEEDING SCHEDULES OPTIMIZATIONS
-- ============================================================================

-- Add index for active schedule queries (MQTT conversion)
CREATE INDEX IF NOT EXISTS idx_feeding_schedules_active
ON public.feeding_schedules (feeder_id, start_date, end_date);

-- Add index for user schedule management
CREATE INDEX IF NOT EXISTS idx_feeding_schedules_user_management
ON public.feeding_schedules (user_id, feeder_id, created_at DESC);

-- Add index for schedule sessions lookup
CREATE INDEX IF NOT EXISTS idx_feeding_sessions_schedule_time
ON public.feeding_sessions (feeding_schedule_id, time);

-- ============================================================================
-- FEEDERS TABLE OPTIMIZATIONS
-- ============================================================================

-- Add index for active feeder queries
CREATE INDEX IF NOT EXISTS idx_feeders_active_user
ON public.feeders (user_id, is_active, created_at DESC)
WHERE is_active = true;

-- Add index for device status queries
CREATE INDEX IF NOT EXISTS idx_feeders_device_status
ON public.feeders (device_id, is_active, updated_at DESC);

-- Add index for location-based queries (if needed for future features)
CREATE INDEX IF NOT EXISTS idx_feeders_location
ON public.feeders (location)
WHERE location IS NOT NULL;

-- ============================================================================
-- OPTIMIZE EXISTING FUNCTION PERFORMANCE
-- ============================================================================

-- Create a more efficient function for getting feeder connection status
-- This avoids the LATERAL join for better performance
CREATE OR REPLACE FUNCTION public.get_feeder_connection_status_batch(
    device_ids TEXT[]
)
RETURNS TABLE(
    device_id TEXT,
    last_communication TIMESTAMPTZ,
    is_online BOOLEAN,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH latest_sensor_data AS (
        SELECT DISTINCT ON (s.device_id) 
            s.device_id,
            s.timestamp
        FROM public.sensor_data s
        WHERE s.device_id = ANY(device_ids)
        ORDER BY s.device_id, s.timestamp DESC
    )
    SELECT 
        lsd.device_id,
        lsd.timestamp as last_communication,
        CASE 
            WHEN lsd.timestamp IS NULL THEN FALSE
            WHEN lsd.timestamp > (NOW() - INTERVAL '10 minutes') THEN TRUE
            ELSE FALSE
        END as is_online,
        CASE 
            WHEN lsd.timestamp IS NULL THEN 'offline'
            WHEN lsd.timestamp > (NOW() - INTERVAL '10 minutes') THEN 'online'
            ELSE 'offline'
        END as status
    FROM latest_sensor_data lsd;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_feeder_connection_status_batch(TEXT[]) TO authenticated;

-- ============================================================================
-- MATERIALIZED VIEW FOR DASHBOARD PERFORMANCE
-- ============================================================================

-- Create a materialized view for dashboard feeder status (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.feeder_status_summary AS
SELECT 
    f.id as feeder_id,
    f.device_id,
    f.user_id,
    f.name,
    f.is_active,
    f.updated_at as feeder_updated_at,
    lsd.timestamp as last_communication,
    CASE 
        WHEN lsd.timestamp IS NULL THEN FALSE
        WHEN lsd.timestamp > (NOW() - INTERVAL '10 minutes') THEN TRUE
        ELSE FALSE
    END as is_online,
    CASE 
        WHEN lsd.timestamp IS NULL THEN 'offline'
        WHEN lsd.timestamp > (NOW() - INTERVAL '10 minutes') THEN 'online'
        ELSE 'offline'
    END as status
FROM public.feeders f
LEFT JOIN LATERAL (
    SELECT s.timestamp
    FROM public.sensor_data s
    WHERE s.device_id = f.device_id
    ORDER BY s.timestamp DESC
    LIMIT 1
) lsd ON true;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_feeder_status_summary_unique
ON public.feeder_status_summary (feeder_id);

-- Create additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_feeder_status_summary_user
ON public.feeder_status_summary (user_id, is_active, status);

CREATE INDEX IF NOT EXISTS idx_feeder_status_summary_device
ON public.feeder_status_summary (device_id, status);

-- ============================================================================
-- STATISTICS AND MAINTENANCE
-- ============================================================================

-- Update table statistics to help query planner
ANALYZE public.sensor_data;
ANALYZE public.feeders;
ANALYZE public.feeder_memberships;
ANALYZE public.feeder_invitations;
ANALYZE public.feeding_schedules;
ANALYZE public.feeding_sessions;

-- ============================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

-- Function to get slow query statistics
CREATE OR REPLACE FUNCTION public.get_table_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    table_size TEXT,
    index_size TEXT,
    total_size TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins + n_tup_upd + n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) + pg_indexes_size(schemaname||'.'||tablename)) as total_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_table_stats() TO authenticated;

-- ============================================================================
-- AUTOMATIC MAINTENANCE SETUP
-- ============================================================================

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_feeder_status_summary()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.feeder_status_summary;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.refresh_feeder_status_summary() TO authenticated;

-- ============================================================================
-- CLEANUP AND MONITORING
-- ============================================================================

-- Function to clean up old sensor data (keep last 90 days by default)
CREATE OR REPLACE FUNCTION public.cleanup_old_sensor_data(
    retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.sensor_data
    WHERE timestamp < (NOW() - INTERVAL '1 day' * retention_days);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Update statistics after cleanup
    ANALYZE public.sensor_data;
    
    RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.cleanup_old_sensor_data(INTEGER) TO authenticated;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.get_feeder_connection_status_batch(TEXT[]) IS 
'Efficiently gets connection status for multiple feeders in a single query';

COMMENT ON MATERIALIZED VIEW public.feeder_status_summary IS 
'Cached feeder status information for fast dashboard loading. Refresh every 5 minutes.';

COMMENT ON FUNCTION public.refresh_feeder_status_summary() IS 
'Refreshes the feeder status summary materialized view. Should be called periodically.';

COMMENT ON FUNCTION public.cleanup_old_sensor_data(INTEGER) IS 
'Removes old sensor data beyond retention period. Default 90 days.';

-- ============================================================================
-- COMPLETION LOG
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Performance optimization migration completed successfully:';
    RAISE NOTICE '✅ Added sensor data indexes for time-based queries';
    RAISE NOTICE '✅ Added permission system indexes for RLS performance';
    RAISE NOTICE '✅ Added invitation management indexes';
    RAISE NOTICE '✅ Added feeding schedule indexes';
    RAISE NOTICE '✅ Added feeder status indexes';
    RAISE NOTICE '✅ Created batch connection status function';
    RAISE NOTICE '✅ Created materialized view for dashboard performance';
    RAISE NOTICE '✅ Added monitoring and maintenance functions';
    RAISE NOTICE '📊 Updated table statistics for query optimization';
    RAISE NOTICE '🔧 Remember to set up periodic refresh of materialized view';
END $$; 