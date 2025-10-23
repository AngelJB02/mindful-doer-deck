-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the send-task-reminders function to run every hour
SELECT cron.schedule(
  'send-task-reminders-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://eafyhgxvpmlvhbglwadk.supabase.co/functions/v1/send-task-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZnloZ3h2cG1sdmhiZ2x3YWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTM2MDYsImV4cCI6MjA3NjE2OTYwNn0.ITGHO5exdOpDdo6mIC59pOOAgYRoMGCfylQ_jGZf6Zs"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);