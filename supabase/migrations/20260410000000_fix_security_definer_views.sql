-- Fix SECURITY DEFINER views
-- These views should use SECURITY INVOKER instead to enforce proper RLS

-- Drop and recreate recent_security_events view without SECURITY DEFINER
DROP VIEW IF EXISTS public.recent_security_events CASCADE;

CREATE OR REPLACE VIEW public.recent_security_events
WITH (security_invoker = true)
AS
SELECT 
  id,
  created_at,
  event_type,
  user_id,
  metadata
FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;

-- Drop and recreate auth_migration_status view without SECURITY DEFINER
DROP VIEW IF EXISTS public.auth_migration_status CASCADE;

CREATE OR REPLACE VIEW public.auth_migration_status
WITH (security_invoker = true)
AS
SELECT 
  version,
  inserted_at
FROM auth.schema_migrations
ORDER BY inserted_at DESC;

-- Grant appropriate permissions
GRANT SELECT ON public.recent_security_events TO authenticated;
GRANT SELECT ON public.auth_migration_status TO authenticated;

-- Add RLS policies for these views
ALTER VIEW public.recent_security_events SET (security_invoker = true);
ALTER VIEW public.auth_migration_status SET (security_invoker = true);
