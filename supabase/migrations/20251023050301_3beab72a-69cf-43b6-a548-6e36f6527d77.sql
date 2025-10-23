-- Add reminder columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_time timestamp with time zone;

-- Add index for efficient querying of pending reminders
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_pending 
ON public.tasks(reminder_time) 
WHERE reminder_enabled = true AND reminder_sent = false;