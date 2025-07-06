-- Smart Livestock Feeder - Database Maintenance Script
-- Purpose: Regular maintenance tasks to keep the database performant
-- Usage: Run this script weekly via cron job or scheduled task
-- Author: System
-- Date: 2025-01-07

-- Set up the script context
DO $$
BEGIN
    RAISE NOTICE '🔧 Starting Smart Livestock Feeder database maintenance...';
    RAISE NOTICE '📅 Maintenance started at: %', NOW();
END $$;

-- ============================================================================
-- 1. REFRESH MATERIALIZED VIEWS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📊 Refreshing materialized views...';
    
    -- Refresh the feeder status summary view
    BEGIN
        PERFORM public.refresh_feeder_status_summary();
        RAISE NOTICE '✅ Feeder status summary refreshed successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Error refreshing feeder status summary: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- 2. CLEAN UP OLD DATA
-- ============================================================================

DO $$
DECLARE
    deleted_sensor_count INTEGER;
    deleted_invitation_count INTEGER;
BEGIN
    RAISE NOTICE '🗑️ Cleaning up old data...';
    
    -- Clean up sensor data older than 90 days
    BEGIN
        SELECT public.cleanup_old_sensor_data(90) INTO deleted_sensor_count;
        RAISE NOTICE '✅ Deleted % old sensor data records', deleted_sensor_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Error cleaning up sensor data: %', SQLERRM;
    END;
    
    -- Clean up expired invitations
    BEGIN
        DELETE FROM public.feeder_invitations 
        WHERE status = 'pending' AND expires_at < NOW();
        
        GET DIAGNOSTICS deleted_invitation_count = ROW_COUNT;
        RAISE NOTICE '✅ Deleted % expired invitations', deleted_invitation_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Error cleaning up expired invitations: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- 3. UPDATE TABLE STATISTICS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📈 Updating table statistics...';
    
    -- Update statistics for all main tables
    ANALYZE public.sensor_data;
    ANALYZE public.feeders;
    ANALYZE public.feeder_memberships;
    ANALYZE public.feeder_invitations;
    ANALYZE public.feeding_schedules;
    ANALYZE public.feeding_sessions;
    ANALYZE public.commissioned_feeders;
    
    RAISE NOTICE '✅ Table statistics updated successfully';
END $$;

-- ============================================================================
-- 4. VACUUM TABLES (OPTIONAL - PostgreSQL auto-vacuum usually handles this)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🧹 Running vacuum on high-activity tables...';
    
    -- Vacuum the sensor data table (most active)
    VACUUM (ANALYZE) public.sensor_data;
    
    -- Vacuum the feeder invitations table
    VACUUM (ANALYZE) public.feeder_invitations;
    
    RAISE NOTICE '✅ Vacuum completed successfully';
END $$;

-- ============================================================================
-- 5. PERFORMANCE MONITORING
-- ============================================================================

DO $$
DECLARE
    table_stats RECORD;
    total_size_mb NUMERIC;
BEGIN
    RAISE NOTICE '📊 Generating performance report...';
    
    -- Calculate total database size
    SELECT 
        ROUND(SUM(pg_total_relation_size(schemaname||'.'||tablename)) / 1024.0 / 1024.0, 2)
    INTO total_size_mb
    FROM pg_stat_user_tables
    WHERE schemaname = 'public';
    
    RAISE NOTICE '💾 Total database size: % MB', total_size_mb;
    
    -- Report on largest tables
    RAISE NOTICE '📋 Largest tables by size:';
    FOR table_stats IN
        SELECT 
            schemaname||'.'||tablename as table_name,
            ROUND(pg_total_relation_size(schemaname||'.'||tablename) / 1024.0 / 1024.0, 2) as size_mb,
            n_tup_ins + n_tup_upd + n_tup_del as activity_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 5
    LOOP
        RAISE NOTICE '  - %: % MB (% operations)', 
            table_stats.table_name, 
            table_stats.size_mb, 
            table_stats.activity_count;
    END LOOP;
END $$;

-- ============================================================================
-- 6. INDEX USAGE ANALYSIS
-- ============================================================================

DO $$
DECLARE
    index_stats RECORD;
    unused_indexes INTEGER;
BEGIN
    RAISE NOTICE '🔍 Analyzing index usage...';
    
    -- Count unused indexes
    SELECT COUNT(*) INTO unused_indexes
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    AND idx_scan = 0;
    
    RAISE NOTICE '📊 Index usage summary:';
    RAISE NOTICE '  - Unused indexes: %', unused_indexes;
    
    -- Report on most used indexes
    RAISE NOTICE '📋 Most used indexes:';
    FOR index_stats IN
        SELECT 
            schemaname||'.'||tablename as table_name,
            indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        AND idx_scan > 0
        ORDER BY idx_scan DESC
        LIMIT 10
    LOOP
        RAISE NOTICE '  - %.%: % scans, % reads', 
            index_stats.table_name, 
            index_stats.indexname, 
            index_stats.idx_scan,
            index_stats.idx_tup_read;
    END LOOP;
END $$;

-- ============================================================================
-- 7. CONNECTION AND ACTIVITY MONITORING
-- ============================================================================

DO $$
DECLARE
    connection_count INTEGER;
    active_queries INTEGER;
BEGIN
    RAISE NOTICE '🔗 Monitoring database connections...';
    
    -- Count active connections
    SELECT COUNT(*) INTO connection_count
    FROM pg_stat_activity
    WHERE datname = current_database();
    
    -- Count active queries
    SELECT COUNT(*) INTO active_queries
    FROM pg_stat_activity
    WHERE datname = current_database()
    AND state = 'active';
    
    RAISE NOTICE '📊 Connection summary:';
    RAISE NOTICE '  - Total connections: %', connection_count;
    RAISE NOTICE '  - Active queries: %', active_queries;
END $$;

-- ============================================================================
-- 8. COMPLETION SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Database maintenance completed successfully!';
    RAISE NOTICE '📅 Maintenance finished at: %', NOW();
    RAISE NOTICE '🔧 Next maintenance should be run in 1 week';
    RAISE NOTICE '💡 For issues, check the performance optimization guide at docs/performance-optimization-guide.md';
END $$;

-- ============================================================================
-- 9. OPTIONAL: PERFORMANCE HEALTH CHECK
-- ============================================================================

-- This query can be used to check overall database health
-- Uncomment to run as part of maintenance

/*
DO $$
BEGIN
    RAISE NOTICE '🏥 Running performance health check...';
    
    -- Check for long-running queries
    IF EXISTS (
        SELECT 1 FROM pg_stat_activity 
        WHERE datname = current_database() 
        AND state = 'active' 
        AND query_start < NOW() - INTERVAL '5 minutes'
    ) THEN
        RAISE NOTICE '⚠️  WARNING: Long-running queries detected (>5 minutes)';
    ELSE
        RAISE NOTICE '✅ No long-running queries detected';
    END IF;
    
    -- Check for bloated tables (needs pg_stat_user_tables)
    -- This is a simplified check - full bloat analysis requires additional tools
    IF EXISTS (
        SELECT 1 FROM pg_stat_user_tables 
        WHERE schemaname = 'public' 
        AND n_dead_tup > n_live_tup * 0.1
    ) THEN
        RAISE NOTICE '⚠️  WARNING: Some tables may need vacuum (high dead tuple count)';
    ELSE
        RAISE NOTICE '✅ Table health looks good';
    END IF;
END $$;
*/ 