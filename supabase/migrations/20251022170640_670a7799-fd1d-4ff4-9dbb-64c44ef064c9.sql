-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  icon TEXT NOT NULL DEFAULT 'Briefcase',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Add project_id to tasks table
ALTER TABLE public.tasks ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);

-- Create trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default project for existing users
INSERT INTO public.projects (user_id, name, color, icon)
SELECT id, 'General', '#8B5CF6', 'Briefcase'
FROM public.profiles
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects WHERE user_id = profiles.id
);

-- Update existing tasks to use the default project
UPDATE public.tasks t
SET project_id = (
  SELECT p.id 
  FROM public.projects p 
  WHERE p.user_id = t.user_id 
  LIMIT 1
)
WHERE project_id IS NULL;

-- Make project_id required after populating existing data
ALTER TABLE public.tasks ALTER COLUMN project_id SET NOT NULL;

-- Enable realtime for projects
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;