import { useState, useEffect } from "react";
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
import { Loader2, RefreshCw, AlertCircle, ArrowRightLeft, ArrowRight, Users } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Shift, User } from "@shared/schema";

type SwapMode = "transfer" | "swap" | "open";

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
  const [swapMode, setSwapMode] = useState<SwapMode>("transfer");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [targetShiftId, setTargetShiftId] = useState<string>("");
  const [requesterNote, setRequesterNote] = useState("");

  // Reset targetShiftId when targetUserId or mode changes
  useEffect(() => {
    setTargetShiftId("");
  }, [targetUserId, swapMode]);

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

  // Fetch shifts of the selected colleague for swap mode
  const { data: colleagueShifts = [], isLoading: isLoadingColleagueShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts/user", targetUserId, shift.stationId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/shifts/user/${targetUserId}`);
      if (!res.ok) throw new Error("Kon shifts niet ophalen");
      return res.json();
    },
    enabled: swapMode === "swap" && !!targetUserId && open,
  });

  // Filter colleague shifts: future dates, same station, not already in a swap request
  const eligibleColleagueShifts = colleagueShifts.filter((s) => {
    const shiftDate = new Date(s.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return shiftDate >= today && s.stationId === shift.stationId;
  });

  const createSwapMutation = useMutation({
    mutationFn: async (data: {
      requesterShiftId: number;
      targetUserId: number;
      targetShiftId?: number;
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
        title: swapMode === "swap" ? "Ruilverzoek ingediend" : "Overnameverzoek ingediend",
        description: "Je verzoek is verzonden naar de admin/supervisor voor goedkeuring.",
      });
      onOpenChange(false);
      setTargetUserId("");
      setTargetShiftId("");
      setRequesterNote("");
      setSwapMode("transfer");
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij indienen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createOpenSwapMutation = useMutation({
    mutationFn: async (data: {
      shiftId: number;
      requesterNote?: string;
    }) => {
      const res = await apiRequest("POST", "/api/open-swap-requests", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon open wissel niet aanmaken");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/open-swap-requests/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps/my-requests"] });
      toast({
        title: "Open wissel geplaatst",
        description: "Je shift is nu zichtbaar voor collega's. Je ontvangt een melding als iemand reageert.",
      });
      onOpenChange(false);
      setTargetUserId("");
      setTargetShiftId("");
      setRequesterNote("");
      setSwapMode("transfer");
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij plaatsen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (swapMode === "open") {
      createOpenSwapMutation.mutate({
        shiftId: shift.id,
        requesterNote: requesterNote || undefined,
      });
      return;
    }

    if (!targetUserId) {
      toast({
        title: "Selecteer een collega",
        description: swapMode === "swap" ? "Kies met wie je wilt ruilen" : "Kies wie de shift overneemt",
        variant: "destructive",
      });
      return;
    }

    if (swapMode === "swap" && !targetShiftId) {
      toast({
        title: "Selecteer een shift",
        description: "Kies welke shift je wilt overnemen van je collega",
        variant: "destructive",
      });
      return;
    }

    createSwapMutation.mutate({
      requesterShiftId: shift.id,
      targetUserId: parseInt(targetUserId),
      targetShiftId: swapMode === "swap" ? parseInt(targetShiftId) : undefined,
      requesterNote: requesterNote || undefined,
    });
  };

  const getShiftTime = () => {
    if (!shift.startTime || !shift.endTime) return "-";
    const startHour = new Date(shift.startTime).getHours();
    const endHour = new Date(shift.endTime).getHours();

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

  // Helper to format shift time for colleague shifts
  const formatColleagueShiftTime = (s: Shift) => {
    if (!s.startTime || !s.endTime) return "-";
    const startHour = new Date(s.startTime).getHours();
    const endHour = new Date(s.endTime).getHours();
    
    if (s.type === "night") {
      if (s.isSplitShift) {
        if (startHour === 19 && endHour === 23) return "19:00-23:00";
        else if (startHour === 23 && endHour === 7) return "23:00-07:00";
        else return `${startHour.toString().padStart(2, "0")}:00-${endHour.toString().padStart(2, "0")}:00`;
      }
      return "19:00-07:00";
    } else {
      if (s.isSplitShift) {
        if (startHour === 7 && endHour === 13) return "07:00-13:00";
        else if (startHour === 13 && endHour === 19) return "13:00-19:00";
        else return `${startHour.toString().padStart(2, "0")}:00-${endHour.toString().padStart(2, "0")}:00`;
      }
      return "07:00-19:00";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Shift Ruilen
          </DialogTitle>
          <DialogDescription>
            {swapMode === "transfer" 
              ? "Vraag een collega om jouw shift over te nemen" 
              : swapMode === "swap"
              ? "Wissel je shift met een shift van een collega"
              : "Zet je shift open zodat iedereen kan reageren"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode selection */}
          <div className="space-y-2">
            <Label>Wat wil je doen?</Label>
            <RadioGroup
              value={swapMode}
              onValueChange={(value) => setSwapMode(value as SwapMode)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transfer" id="mode-transfer" />
                <Label htmlFor="mode-transfer" className="flex items-center gap-1 cursor-pointer">
                  <ArrowRight className="h-4 w-4" />
                  Overnemen
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="swap" id="mode-swap" />
                <Label htmlFor="mode-swap" className="flex items-center gap-1 cursor-pointer">
                  <ArrowRightLeft className="h-4 w-4" />
                  Ruilen
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="open" id="mode-open" />
                <Label htmlFor="mode-open" className="flex items-center gap-1 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Open Wissel
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {swapMode === "transfer" 
                ? "Je collega neemt jouw shift over" 
                : swapMode === "swap"
                ? "Jullie wisselen elkaars shifts"
                : "Collega's kunnen reageren op je open verzoek"}
            </p>
          </div>

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

          {/* Target user selection (not for open mode) */}
          {swapMode !== "open" && (
            <div className="space-y-2">
              <Label htmlFor="target-user">
                {swapMode === "transfer" ? "Wie neemt de shift over?" : "Met wie wil je ruilen?"}
              </Label>
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
                  Geen collega's beschikbaar
                </p>
              )}
            </div>
          )}

          {/* Target shift selection (only for swap mode) */}
          {swapMode === "swap" && targetUserId && (
            <div className="space-y-2">
              <Label htmlFor="target-shift">Welke shift wil je overnemen?</Label>
              {isLoadingColleagueShifts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Shifts laden...
                </div>
              ) : eligibleColleagueShifts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Deze collega heeft geen toekomstige shifts beschikbaar
                </p>
              ) : (
                <Select value={targetShiftId} onValueChange={setTargetShiftId}>
                  <SelectTrigger id="target-shift">
                    <SelectValue placeholder="Selecteer een shift..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleColleagueShifts.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {format(new Date(s.date), "EEE d MMM", { locale: nl })} - {s.type === "day" ? "Dag" : "Nacht"} ({formatColleagueShiftTime(s)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

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
              {swapMode === "open" 
                ? "Je shift wordt zichtbaar voor collega's. Na acceptatie van een aanbieding moet de wissel nog worden goedgekeurd."
                : `Je verzoek moet goedgekeurd worden door een admin of supervisor voordat de ${swapMode === "swap" ? "ruil" : "overname"} definitief is.`
              }
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              (swapMode !== "open" && !targetUserId) || 
              (swapMode === "swap" && !targetShiftId) || 
              createSwapMutation.isPending ||
              createOpenSwapMutation.isPending
            }
          >
            {(createSwapMutation.isPending || createOpenSwapMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {swapMode === "open" ? "Open Wissel Plaatsen" : "Verzoek Indienen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
