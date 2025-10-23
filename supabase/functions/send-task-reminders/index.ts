import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  user_id: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting send-task-reminders function...');

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get tasks that need reminders sent
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        priority,
        user_id,
        profiles!inner(email, full_name)
      `)
      .eq('reminder_enabled', true)
      .eq('reminder_sent', false)
      .lte('reminder_time', new Date().toISOString())
      .returns<Task[]>();

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw tasksError;
    }

    console.log(`Found ${tasks?.length || 0} tasks that need reminders`);

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to send', count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send emails and update tasks
    const results = await Promise.all(
      tasks.map(async (task) => {
        try {
          // Format priority label
          const priorityLabels = {
            low: 'Baja',
            medium: 'Media',
            high: 'Alta',
          };
          const priorityLabel = priorityLabels[task.priority as keyof typeof priorityLabels] || task.priority;

          // Format due date
          const dueDate = new Date(task.due_date);
          const formattedDate = dueDate.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          // Send email
          const emailResult = await resend.emails.send({
            from: 'PLANIO <onboarding@resend.dev>',
            to: [task.profiles.email],
            subject: `🔔 Recordatorio: ${task.title}`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
                    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                    .task-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                    .task-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .info-row { margin: 10px 0; }
                    .label { font-weight: 600; color: #4b5563; }
                    .priority-high { color: #dc2626; font-weight: bold; }
                    .priority-medium { color: #ea580c; font-weight: bold; }
                    .priority-low { color: #65a30d; font-weight: bold; }
                    .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>🔔 Recordatorio de Tarea</h1>
                      <p>Hola ${task.profiles.full_name || 'Usuario'},</p>
                    </div>
                    <div class="content">
                      <div class="task-title">${task.title}</div>
                      ${task.description ? `<p>${task.description}</p>` : ''}
                      
                      <div class="task-info">
                        <div class="info-row">
                          <span class="label">📅 Fecha límite:</span>
                          <span>${formattedDate}</span>
                        </div>
                        <div class="info-row">
                          <span class="label">⚡ Prioridad:</span>
                          <span class="priority-${task.priority}">${priorityLabel}</span>
                        </div>
                      </div>
                      
                      <p>No olvides completar esta tarea a tiempo. ¡Tú puedes! 💪</p>
                      
                      <div class="footer">
                        <p>Este es un recordatorio automático de PLANIO</p>
                        <p>Organiza tu día, alcanza tus metas 🎯</p>
                      </div>
                    </div>
                  </div>
                </body>
              </html>
            `,
          });

          console.log(`Email sent for task ${task.id}:`, emailResult);

          // Mark reminder as sent
          const { error: updateError } = await supabaseAdmin
            .from('tasks')
            .update({ reminder_sent: true })
            .eq('id', task.id);

          if (updateError) {
            console.error(`Error updating task ${task.id}:`, updateError);
            return { taskId: task.id, success: false, error: updateError };
          }

          return { taskId: task.id, success: true };
        } catch (error) {
          console.error(`Error processing task ${task.id}:`, error);
          return { taskId: task.id, success: false, error };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Reminders sent: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        message: 'Reminders processing completed',
        total: tasks.length,
        successful: successCount,
        failed: failureCount,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-task-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
