import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Trash2, Plus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface ProjectManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectsChange: () => void;
}

const AVAILABLE_COLORS = [
  "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", 
  "#EF4444", "#8B5CF6", "#14B8A6", "#F97316", "#6366F1"
];

const AVAILABLE_ICONS = [
  "Briefcase", "Home", "GraduationCap", "Dumbbell", "Heart",
  "ShoppingBag", "Plane", "Book", "Coffee", "Music"
];

export const ProjectManager = ({ open, onOpenChange, onProjectsChange }: ProjectManagerProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    color: AVAILABLE_COLORS[0],
    icon: AVAILABLE_ICONS[0],
  });

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });
    setProjects(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingProject) {
      const { error } = await supabase
        .from("projects")
        .update(formData)
        .eq("id", editingProject.id);
      
      if (error) {
        toast.error("Error al actualizar proyecto");
      } else {
        toast.success("Proyecto actualizado");
        setEditingProject(null);
      }
    } else {
      const { error } = await supabase
        .from("projects")
        .insert({ ...formData, user_id: user.id });
      
      if (error) {
        toast.error("Error al crear proyecto");
      } else {
        toast.success("Proyecto creado");
        setIsCreating(false);
      }
    }

    setFormData({ name: "", color: AVAILABLE_COLORS[0], icon: AVAILABLE_ICONS[0] });
    fetchProjects();
    onProjectsChange();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar proyecto");
    } else {
      toast.success("Proyecto eliminado");
      fetchProjects();
      onProjectsChange();
    }
  };

  const startEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({ name: project.name, color: project.color, icon: project.icon });
    setIsCreating(false);
  };

  const IconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.Briefcase;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gestionar Proyectos</DialogTitle>
        </DialogHeader>
        
        {!isCreating && !editingProject && (
          <div className="space-y-4">
            <Button onClick={() => setIsCreating(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Crear Nuevo Proyecto
            </Button>
            
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div style={{ color: project.color }}>
                      {IconComponent(project.icon)}
                    </div>
                    <span className="font-medium">{project.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(project)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(isCreating || editingProject) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Proyecto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Casa, Trabajo, Estudios"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {AVAILABLE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Icono</Label>
              <div className="flex gap-2 flex-wrap">
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`p-2 rounded border ${
                      formData.icon === icon ? "border-primary bg-accent" : "border-border"
                    }`}
                  >
                    {IconComponent(icon)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setEditingProject(null);
                  setFormData({ name: "", color: AVAILABLE_COLORS[0], icon: AVAILABLE_ICONS[0] });
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {editingProject ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
