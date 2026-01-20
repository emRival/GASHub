-- Enable Row-Level Security (RLS) on all tables
-- This is CRITICAL for security in Supabase!

-- =====================================================
-- Enable RLS on all tables
-- =====================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Projects Table Policies
-- =====================================================

-- Users can only SELECT their own projects
CREATE POLICY "Users can view own projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only INSERT projects for themselves
CREATE POLICY "Users can create own projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own projects
CREATE POLICY "Users can update own projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own projects
CREATE POLICY "Users can delete own projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- Endpoints Table Policies
-- =====================================================

-- Users can only SELECT their own endpoints
CREATE POLICY "Users can view own endpoints"
  ON public.endpoints
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only INSERT endpoints for themselves
CREATE POLICY "Users can create own endpoints"
  ON public.endpoints
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own endpoints
CREATE POLICY "Users can update own endpoints"
  ON public.endpoints
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own endpoints
CREATE POLICY "Users can delete own endpoints"
  ON public.endpoints
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- API Keys Table Policies
-- =====================================================

-- Users can only SELECT their own API keys
CREATE POLICY "Users can view own api_keys"
  ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only INSERT API keys for themselves
CREATE POLICY "Users can create own api_keys"
  ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own API keys
CREATE POLICY "Users can update own api_keys"
  ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own API keys
CREATE POLICY "Users can delete own api_keys"
  ON public.api_keys
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- Logs Table Policies
-- =====================================================

-- Users can view logs for their own endpoints
CREATE POLICY "Users can view logs for own endpoints"
  ON public.logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.endpoints
      WHERE endpoints.id = logs.endpoint_id
      AND endpoints.user_id = auth.uid()
    )
  );

-- System can INSERT logs (no user restriction for logging)
-- This allows the repeater to log even from service role
CREATE POLICY "Service can insert logs"
  ON public.logs
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Users can DELETE logs for their own endpoints
CREATE POLICY "Users can delete logs for own endpoints"
  ON public.logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.endpoints
      WHERE endpoints.id = logs.endpoint_id
      AND endpoints.user_id = auth.uid()
    )
  );

-- =====================================================
-- Performance Indexes for RLS
-- =====================================================

-- These indexes speed up RLS policy checks
CREATE INDEX IF NOT EXISTS idx_projects_user_id_active 
  ON public.projects(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_endpoints_user_id_active 
  ON public.endpoints(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id_active 
  ON public.api_keys(user_id) 
  WHERE user_id IS NOT NULL;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Row-Level Security (RLS) enabled on all tables!';
    RAISE NOTICE '🔒 Policies created for user-scoped access';
    RAISE NOTICE '⚡ Performance indexes added';
END $$;
