-- Add categories table for personalized task categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, name)
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Users can view own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- Add status and category to tasks
ALTER TABLE public.tasks 
  ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Insert default categories for existing users
INSERT INTO public.categories (user_id, name, color, icon)
SELECT DISTINCT user_id, 'Personal', 'hsl(210, 100%, 50%)', 'User'
FROM public.tasks
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE categories.user_id = tasks.user_id
);

INSERT INTO public.categories (user_id, name, color, icon)
SELECT DISTINCT user_id, 'Educación', 'hsl(150, 70%, 50%)', 'GraduationCap'
FROM public.tasks
WHERE EXISTS (SELECT 1 FROM public.categories WHERE categories.user_id = tasks.user_id);

INSERT INTO public.categories (user_id, name, color, icon)
SELECT DISTINCT user_id, 'Gym', 'hsl(0, 80%, 60%)', 'Dumbbell'
FROM public.tasks
WHERE EXISTS (SELECT 1 FROM public.categories WHERE categories.user_id = tasks.user_id);

-- Enable realtime for categories
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;