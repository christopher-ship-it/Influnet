-- Project workspace: extended fields, assets, stage migration, collaborator insert policy

ALTER TABLE public.campaign_projects
  ADD COLUMN IF NOT EXISTS deliverables TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations (id) ON DELETE SET NULL;

-- Migrate legacy stage keys to collaboration workspace stages
UPDATE public.campaign_projects SET current_stage = 'collaboration_started'
  WHERE current_stage IN ('lead_received', 'start_project');

UPDATE public.campaign_projects SET current_stage = 'project_discussion'
  WHERE current_stage IN ('discussion_started', 'requirements_finalized', 'budget_confirmed', 'agreement_approved');

UPDATE public.campaign_projects SET current_stage = 'shooting_in_progress'
  WHERE current_stage = 'content_creation';

UPDATE public.campaign_projects SET current_stage = 'sent_for_review'
  WHERE current_stage IN ('content_review', 'client_review');

UPDATE public.campaign_projects SET current_stage = 'final_approval'
  WHERE current_stage = 'content_published';

UPDATE public.campaign_projects SET current_stage = 'revisions'
  WHERE current_stage = 'final_iteration';

UPDATE public.campaign_projects SET current_stage = 'final_payment'
  WHERE current_stage = 'payment_received';

UPDATE public.campaign_projects SET current_stage = 'project_completed'
  WHERE current_stage IN ('project_done', 'project_completed');

ALTER TABLE public.campaign_projects
  ALTER COLUMN current_stage SET DEFAULT 'collaboration_started';

-- Project file / link assets
CREATE TABLE IF NOT EXISTS public.project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL REFERENCES public.campaign_projects (id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL DEFAULT '',
  file_url TEXT,
  link_url TEXT,
  asset_type TEXT NOT NULL DEFAULT 'file',
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_assets_project_idx
  ON public.project_assets (project_id, created_at DESC);

ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_assets_select ON public.project_assets;
CREATE POLICY project_assets_select ON public.project_assets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_projects p
      WHERE p.id = project_id
        AND (p.owner_user_id = auth.uid() OR p.counterparty_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS project_assets_insert ON public.project_assets;
CREATE POLICY project_assets_insert ON public.project_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.campaign_projects p
      WHERE p.id = project_id
        AND (p.owner_user_id = auth.uid() OR p.counterparty_user_id = auth.uid())
    )
  );

-- Storage bucket for project deliverables
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-assets',
  'project-assets',
  true,
  26214400,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip', 'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS project_assets_storage_read ON storage.objects;
CREATE POLICY project_assets_storage_read ON storage.objects
  FOR SELECT USING (bucket_id = 'project-assets');

DROP POLICY IF EXISTS project_assets_storage_insert ON storage.objects;
CREATE POLICY project_assets_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-assets');
