import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Palette } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriesChange: () => void;
}

const AVAILABLE_ICONS = [
  "User", "GraduationCap", "Dumbbell", "Briefcase", "Home", "Heart", 
  "ShoppingCart", "Coffee", "Book", "Music", "Plane", "Camera",
  "Code", "Palette", "Gamepad2", "Utensils", "Car", "Bike"
];

const PRESET_COLORS = [
  "hsl(210, 100%, 50%)", "hsl(150, 70%, 50%)", "hsl(0, 80%, 60%)",
  "hsl(280, 70%, 60%)", "hsl(45, 100%, 50%)", "hsl(30, 90%, 55%)",
  "hsl(180, 60%, 50%)", "hsl(330, 80%, 55%)"
];

export const CategoryManager = ({ open, onOpenChange, onCategoriesChange }: CategoryManagerProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({
    name: "",
    color: PRESET_COLORS[0],
    icon: "User"
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      setCategories(data || []);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre de la categoría es requerido",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from("categories").insert([
      {
        name: newCategory.name,
        color: newCategory.color,
        icon: newCategory.icon,
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
        title: "Categoría creada",
        description: "La categoría se añadió correctamente.",
      });
      setNewCategory({ name: "", color: PRESET_COLORS[0], icon: "User" });
      fetchCategories();
      onCategoriesChange();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Categoría eliminada",
        description: "La categoría se eliminó correctamente.",
      });
      fetchCategories();
      onCategoriesChange();
    }
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.User;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gestionar Categorías</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new category */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Nombre de la categoría</Label>
                  <Input
                    id="category-name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="Ej: Trabajo, Estudios..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewCategory({ ...newCategory, color })}
                          className={`w-full h-10 rounded-md border-2 transition-all ${
                            newCategory.color === color ? "border-primary scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category-icon">Icono</Label>
                    <Select
                      value={newCategory.icon}
                      onValueChange={(value) => setNewCategory({ ...newCategory, icon: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {AVAILABLE_ICONS.map((iconName) => {
                            const Icon = (LucideIcons as any)[iconName];
                            return (
                              <SelectItem key={iconName} value={iconName}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {iconName}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleAddCategory} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Categoría
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing categories */}
          <div className="space-y-2">
            <Label>Tus Categorías</Label>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tienes categorías. ¡Crea tu primera categoría!
                </p>
              ) : (
                <div className="space-y-2">
                  {categories.map((category) => (
                    <Card key={category.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-md flex items-center justify-center text-white"
                            style={{ backgroundColor: category.color }}
                          >
                            {getIconComponent(category.icon)}
                          </div>
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
