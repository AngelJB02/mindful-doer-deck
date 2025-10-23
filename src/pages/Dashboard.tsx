import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCard } from "@/components/TaskCard";
import { TaskDialog } from "@/components/TaskDialog";
import { CategoryManager } from "@/components/CategoryManager";
import { ProjectManager } from "@/components/ProjectManager";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, Settings, ListTodo } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
  status: "pending" | "in_progress" | "completed";
  category_id: string | null;
  project_id: string;
  reminder_enabled?: boolean;
  reminder_time?: string | null;
  reminder_sent?: boolean;
  categories?: {
    name: string;
    color: string;
    icon: string;
  } | null;
}

interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      fetchTasks();
      subscribeToTasks();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });
    
    const projectList = data || [];
    setProjects(projectList);
    if (projectList.length > 0 && !selectedProject) {
      setSelectedProject(projectList[0].id);
    }
  };

  const fetchTasks = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        categories (
          name,
          color,
          icon
        )
      `)
      .eq("project_id", selectedProject)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar tareas",
        description: error.message,
      });
    } else {
      setTasks((data || []) as Task[]);
    }
    setLoading(false);
  };

  const subscribeToTasks = () => {
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      const { error } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", editingTask.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        toast({
          title: "Tarea actualizada",
          description: "Los cambios se guardaron correctamente.",
        });
      }
    } else {
      const { error } = await supabase.from("tasks").insert([
        {
          title: taskData.title || "",
          description: taskData.description,
          priority: taskData.priority,
          due_date: taskData.due_date,
          status: taskData.status,
          category_id: taskData.category_id,
          project_id: taskData.project_id,
          user_id: user?.id,
        },
      ]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        toast({
          title: "Tarea creada",
          description: "Tu tarea se añadió correctamente.",
        });
      }
    }
    setEditingTask(null);
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from("tasks")
      .update({ completed })
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDeleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Tarea eliminada",
        description: "La tarea se eliminó correctamente.",
      });
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    pending: tasks.filter((t) => t.status === "pending").length,
  };

  const tasksByStatus = {
    pending: tasks.filter((t) => t.status === "pending"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    completed: tasks.filter((t) => t.status === "completed"),
  };

  const IconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.Briefcase;
    return <Icon className="h-5 w-5" />;
  };

  const currentProject = projects.find(p => p.id === selectedProject);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">PLANIO</h1>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
              <ListTodo className="w-4 h-4 mr-2" />
              Categorías
            </Button>
            <Button variant="outline" onClick={() => setProjectDialogOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Proyectos
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="mb-6 flex items-center gap-4">
            <div className="flex items-center gap-3">
              {currentProject && (
                <div style={{ color: currentProject.color }}>
                  {IconComponent(currentProject.icon)}
                </div>
              )}
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Stats & Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <div className="bg-card p-3 rounded-lg border">
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
            </div>
            <div className="bg-card p-3 rounded-lg border">
              <p className="text-sm text-muted-foreground">En Proceso</p>
              <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
            </div>
            <div className="bg-card p-3 rounded-lg border">
              <p className="text-sm text-muted-foreground">Completadas</p>
              <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingTask(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Cargando tareas...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* Pending Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                Pendientes
              </h3>
              <div className="space-y-3 min-h-[200px] bg-muted/20 rounded-lg p-4">
                {tasksByStatus.pending.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay tareas pendientes
                  </p>
                ) : (
                  tasksByStatus.pending.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDeleteTask}
                      onEdit={handleEditTask}
                    />
                  ))
                )}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                En Proceso
              </h3>
              <div className="space-y-3 min-h-[200px] bg-muted/20 rounded-lg p-4">
                {tasksByStatus.in_progress.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay tareas en proceso
                  </p>
                ) : (
                  tasksByStatus.in_progress.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDeleteTask}
                      onEdit={handleEditTask}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Completed Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                Completadas
              </h3>
              <div className="space-y-3 min-h-[200px] bg-muted/20 rounded-lg p-4">
                {tasksByStatus.completed.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay tareas completadas
                  </p>
                ) : (
                  tasksByStatus.completed.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDeleteTask}
                      onEdit={handleEditTask}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedProject && (
        <TaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveTask}
          task={editingTask}
          projectId={selectedProject}
        />
      )}

      <CategoryManager
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onCategoriesChange={fetchTasks}
      />

      <ProjectManager
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onProjectsChange={fetchProjects}
      />
    </div>
  );
};

export default Dashboard;
