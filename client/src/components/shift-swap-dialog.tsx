import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Shift, User } from "@shared/schema";

interface ShiftSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift;
  currentUser: User;
  stationUsers: User[];
}

export function ShiftSwapDialog({
  open,
  onOpenChange,
  shift,
  currentUser,
  stationUsers,
}: ShiftSwapDialogProps) {
  const { toast } = useToast();
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [requesterNote, setRequesterNote] = useState("");

  // Check if shift swaps are enabled for this station
  const { data: swapSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/station-settings", shift.stationId, "shift-swaps-enabled"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/station-settings/${shift.stationId}/shift-swaps-enabled`);
      if (!res.ok) throw new Error("Kon instellingen niet ophalen");
      return res.json();
    },
    enabled: open,
  });

  // Get available colleagues (same station, not the current user)
  const availableColleagues = stationUsers.filter(
    (u) => u.id !== currentUser.id && u.role !== "supervisor"
  );

  const createSwapMutation = useMutation({
    mutationFn: async (data: {
      requesterShiftId: number;
      targetUserId: number;
      requesterNote?: string;
    }) => {
      const res = await apiRequest("POST", "/api/shift-swaps", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon ruilverzoek niet aanmaken");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps/my-requests"] });
      toast({
        title: "Ruilverzoek ingediend",
        description: "Je verzoek is verzonden naar de admin/supervisor voor goedkeuring.",
      });
      onOpenChange(false);
      setTargetUserId("");
      setRequesterNote("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij indienen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!targetUserId) {
      toast({
        title: "Selecteer een collega",
        description: "Kies met wie je wilt ruilen",
        variant: "destructive",
      });
      return;
    }

    createSwapMutation.mutate({
      requesterShiftId: shift.id,
      targetUserId: parseInt(targetUserId),
      requesterNote: requesterNote || undefined,
    });
  };

  const getShiftTime = () => {
    if (!shift.startTime || !shift.endTime) return "-";
    const startHour = new Date(shift.startTime).getUTCHours();
    const endHour = new Date(shift.endTime).getUTCHours();

    if (shift.type === "night") {
      if (shift.isSplitShift) {
        if (startHour === 19 && endHour === 23) return "19:00-23:00";
        else if (startHour === 23 && endHour === 7) return "23:00-07:00";
        else return `${startHour.toString().padStart(2, "0")}:00-${endHour.toString().padStart(2, "0")}:00`;
      }
      return "19:00-07:00";
    } else {
      if (shift.isSplitShift) {
        if (startHour === 7 && endHour === 13) return "07:00-13:00";
        else if (startHour === 13 && endHour === 19) return "13:00-19:00";
        else return `${startHour.toString().padStart(2, "0")}:00-${endHour.toString().padStart(2, "0")}:00`;
      }
      return "07:00-19:00";
    }
  };

  if (isLoadingSettings) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!swapSettings?.enabled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Shift Ruilen
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Shift ruilen is niet ingeschakeld voor dit station. Neem contact op met je admin of supervisor.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Shift Ruilen
          </DialogTitle>
          <DialogDescription>
            Vraag een collega om jouw shift over te nemen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Shift info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium">Je shift:</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(shift.date), "EEEE d MMMM yyyy", { locale: nl })}
            </p>
            <p className="text-sm text-muted-foreground">
              {shift.type === "day" ? "Dagshift" : "Nachtshift"} ({getShiftTime()})
            </p>
          </div>

          {/* Target user selection */}
          <div className="space-y-2">
            <Label htmlFor="target-user">Wie neemt de shift over?</Label>
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger id="target-user">
                <SelectValue placeholder="Selecteer een collega..." />
              </SelectTrigger>
              <SelectContent>
                {availableColleagues.map((colleague) => (
                  <SelectItem key={colleague.id} value={colleague.id.toString()}>
                    {colleague.firstName} {colleague.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableColleagues.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Geen collega's beschikbaar om mee te ruilen
              </p>
            )}
          </div>

          {/* Optional note */}
          <div className="space-y-2">
            <Label htmlFor="requester-note">Reden (optioneel)</Label>
            <Textarea
              id="requester-note"
              placeholder="Bijv. vakantie, afspraak, ..."
              value={requesterNote}
              onChange={(e) => setRequesterNote(e.target.value)}
              maxLength={500}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Je verzoek moet goedgekeurd worden door een admin of supervisor voordat de ruil definitief is.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!targetUserId || createSwapMutation.isPending}
          >
            {createSwapMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Verzoek Indienen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
