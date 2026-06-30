
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  position_title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'Português',
  company_context TEXT,
  vacancy_reason TEXT,
  missions JSONB NOT NULL DEFAULT '[]'::jsonb,
  not_expected JSONB NOT NULL DEFAULT '[]'::jsonb,
  dimensions JSONB NOT NULL DEFAULT '[]'::jsonb,
  disqualifying_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  behavioral_profile TEXT,
  stakeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
  selection_process TEXT,
  compensation TEXT,
  work_model TEXT,
  next_steps TEXT,
  briefing_transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.candidate_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  raw_response JSONB NOT NULL,
  interview_transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.candidate_evaluations TO service_role;
ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_candidate_evaluations_project ON public.candidate_evaluations(project_id);
CREATE INDEX idx_projects_created ON public.projects(created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_candidate_evaluations_updated_at BEFORE UPDATE ON public.candidate_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
