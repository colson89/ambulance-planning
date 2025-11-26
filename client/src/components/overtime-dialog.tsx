import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Clock, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Shift {
  id: number;
  date: string | Date;
  type: "day" | "night";
  startTime?: string | Date;
  endTime?: string | Date;
}

interface Overtime {
  id: number;
  userId: number;
  shiftId: number;
  stationId: number;
  date: string;
  startTime: string;
  durationMinutes: number;
  reason: string;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
}

interface OvertimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
  existingOvertime?: Overtime[];
}

export function OvertimeDialog({ open, onOpenChange, shift, existingOvertime = [] }: OvertimeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [reason, setReason] = useState("");
  
  const createMutation = useMutation({
    mutationFn: async (data: { shiftId: number; date: string; startTime: string; durationMinutes: number; reason: string }) => {
      const res = await apiRequest("POST", "/api/overtime", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Fout bij opslaan overuren");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Overuren opgeslagen",
        description: "Je overuren zijn succesvol geregistreerd.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/overtime/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Fout bij verwijderen overuren");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Overuren verwijderd",
        description: "De overuren zijn verwijderd.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const resetForm = () => {
    setStartTime("");
    setDurationMinutes("");
    setReason("");
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shift) return;
    if (!startTime || !durationMinutes || !reason.trim()) {
      toast({
        title: "Velden ontbreken",
        description: "Vul alle velden in.",
        variant: "destructive",
      });
      return;
    }
    
    const shiftDate = new Date(shift.date);
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDateTime = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), hours, minutes);
    
    createMutation.mutate({
      shiftId: shift.id,
      date: typeof shift.date === 'string' ? shift.date : shift.date.toISOString(),
      startTime: startDateTime.toISOString(),
      durationMinutes: parseInt(durationMinutes),
      reason: reason.trim(),
    });
  };
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} uur`;
    return `${hours}u ${mins}m`;
  };
  
  const totalOvertimeMinutes = existingOvertime.reduce((sum, o) => sum + o.durationMinutes, 0);
  
  if (!shift) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Overuren Registreren
          </DialogTitle>
          <DialogDescription>
            {format(new Date(shift.date), "EEEE d MMMM yyyy", { locale: nl })} - 
            {shift.type === "day" ? " Dagshift" : " Nachtshift"}
          </DialogDescription>
        </DialogHeader>
        
        {existingOvertime.length > 0 && (
          <div className="border rounded-lg p-3 bg-muted/50 space-y-2">
            <div className="text-sm font-medium">Geregistreerde overuren:</div>
            {existingOvertime.map((overtime) => (
              <div key={overtime.id} className="flex items-center justify-between text-sm bg-white rounded p-2">
                <div>
                  <span className="font-medium">
                    {format(new Date(overtime.startTime), "HH:mm")} - {formatDuration(overtime.durationMinutes)}
                  </span>
                  <div className="text-muted-foreground text-xs truncate max-w-[200px]">
                    {overtime.reason}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(overtime.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="text-sm font-medium text-right pt-1 border-t">
              Totaal: {formatDuration(totalOvertimeMinutes)}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Starttijd</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duur (minuten)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="480"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="bijv. 30"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reden</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Beschrijf kort waarom er overuren zijn gemaakt..."
              rows={3}
              required
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Sluiten
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              {createMutation.isPending ? "Opslaan..." : "Toevoegen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
