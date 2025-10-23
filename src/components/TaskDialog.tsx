import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Bell } from "lucide-react";
import { format, subDays, subHours } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  status: "pending" | "in_progress" | "completed";
  category_id: string | null;
  project_id: string;
  reminder_enabled?: boolean;
  reminder_time?: string | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Partial<Task>) => Promise<void>;
  task?: Task | null;
  projectId: string;
}

export const TaskDialog = ({ open, onOpenChange, onSave, task, projectId }: TaskDialogProps) => {
  const [formData, setFormData] = useState({
    category_id: null as string | null,
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    due_date: undefined as Date | undefined,
    status: "pending" as "pending" | "in_progress" | "completed",
    reminder_enabled: false,
    reminder_offset: "1_day" as "1_day" | "1_hour" | "at_time",
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
    if (task) {
      setFormData({
        category_id: task.category_id,
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        due_date: task.due_date ? new Date(task.due_date) : undefined,
        status: task.status,
        reminder_enabled: task.reminder_enabled || false,
        reminder_offset: "1_day",
      });
    } else {
      setFormData({
        category_id: null,
        title: "",
        description: "",
        priority: "medium",
        due_date: undefined,
        status: "pending",
        reminder_enabled: false,
        reminder_offset: "1_day",
      });
    }
  }, [task, open]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });
    setCategories(data || []);
  };

  const calculateReminderTime = (): string | null => {
    if (!formData.due_date || !formData.reminder_enabled) return null;
    
    const dueDate = new Date(formData.due_date);
    
    switch (formData.reminder_offset) {
      case "1_day":
        return subDays(dueDate, 1).toISOString();
      case "1_hour":
        return subHours(dueDate, 1).toISOString();
      case "at_time":
        return dueDate.toISOString();
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await onSave({
      ...(task && { id: task.id }),
      category_id: formData.category_id,
      title: formData.title,
      description: formData.description || null,
      priority: formData.priority,
      due_date: formData.due_date ? formData.due_date.toISOString() : null,
      status: formData.status,
      project_id: projectId,
      reminder_enabled: formData.reminder_enabled,
      reminder_time: calculateReminderTime(),
    });

    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select
              value={formData.category_id || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value === "none" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Comprar alimentos"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Añade detalles sobre la tarea..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: "low" | "medium" | "high") =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "pending" | "in_progress" | "completed") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Proceso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fecha límite</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? (
                    format(formData.due_date, "d 'de' MMM", { locale: es })
                  ) : (
                    <span>Seleccionar</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.due_date}
                  onSelect={(date) => setFormData({ ...formData, due_date: date })}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {formData.due_date && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <Label htmlFor="reminder" className="cursor-pointer">
                    Activar recordatorio
                  </Label>
                </div>
                <Switch
                  id="reminder"
                  checked={formData.reminder_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, reminder_enabled: checked })
                  }
                />
              </div>
              
              {formData.reminder_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="reminder-offset">¿Cuándo deseas recibirlo?</Label>
                  <Select
                    value={formData.reminder_offset}
                    onValueChange={(value: "1_day" | "1_hour" | "at_time") =>
                      setFormData({ ...formData, reminder_offset: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_day">1 día antes</SelectItem>
                      <SelectItem value="1_hour">1 hora antes</SelectItem>
                      <SelectItem value="at_time">En el momento de la fecha límite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : task ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
