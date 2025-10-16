import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2, Edit, Clock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  categories?: {
    name: string;
    color: string;
    icon: string;
  } | null;
}

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning-foreground border-warning/30",
  high: "bg-destructive/20 text-destructive-foreground border-destructive/30",
};

const priorityLabels = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

const statusColors = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/20 text-primary-foreground border-primary/30",
  completed: "bg-success/20 text-success-foreground border-success/30",
};

const statusLabels = {
  pending: "Pendiente",
  in_progress: "En Proceso",
  completed: "Completada",
};

export const TaskCard = ({ task, onToggleComplete, onDelete, onEdit }: TaskCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(task.id);
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.Tag;
    return <Icon className="w-3 h-3" />;
  };

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg ${task.completed ? "opacity-60" : ""} animate-fade-in`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) => onToggleComplete(task.id, checked as boolean)}
            className="mt-1"
          />
          <div className="flex-1 space-y-2">
            <h3 className={`font-semibold text-lg ${task.completed ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="outline" className={priorityColors[task.priority]}>
                {priorityLabels[task.priority]}
              </Badge>
              <Badge variant="outline" className={statusColors[task.status]}>
                {statusLabels[task.status]}
              </Badge>
              {task.categories && (
                <Badge 
                  variant="outline" 
                  className="border-2"
                  style={{ 
                    borderColor: task.categories.color,
                    color: task.categories.color 
                  }}
                >
                  <span className="mr-1">{getIconComponent(task.categories.icon)}</span>
                  {task.categories.name}
                </Badge>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(task.due_date), "d 'de' MMMM, yyyy", { locale: es })}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {format(new Date(task.created_at), "d/MM/yy", { locale: es })}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(task)}
            disabled={isDeleting}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
