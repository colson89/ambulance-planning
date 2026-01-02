import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { AlertTriangle, Loader2, Search, UserPlus } from "lucide-react";
import type { Shift } from "@shared/schema";

interface EmergencyUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  stationId: number;
  stationName: string;
  stationCode: string;
  hasLicenseC: boolean;
}

interface EmergencySchedulingDialogProps {
  shift: Shift | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EmergencySchedulingDialog({
  shift,
  open,
  onOpenChange,
  onSuccess
}: EmergencySchedulingDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStation, setSelectedStation] = useState<string>("all");

  const { data: emergencyUsers = [], isLoading: isLoadingUsers } = useQuery<EmergencyUser[]>({
    queryKey: ["/api/emergency-scheduling/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/emergency-scheduling/users");
      if (!res.ok) throw new Error("Kon gebruikers niet laden");
      return res.json();
    },
    enabled: open,
  });

  const stations = [...new Set(emergencyUsers.map(u => u.stationName))].sort();

  const filteredUsers = emergencyUsers.filter(user => {
    const matchesSearch = searchTerm === "" || 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStation = selectedStation === "all" || user.stationName === selectedStation;
    return matchesSearch && matchesStation;
  });

  const emergencyAssignMutation = useMutation({
    mutationFn: async ({ shiftId, userId, reason }: { shiftId: number; userId: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/shifts/${shiftId}/emergency-assign`, {
        userId,
        reason
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Noodinplanning mislukt");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Noodinplanning geslaagd",
        description: `${data.assignedUser?.firstName} ${data.assignedUser?.lastName} is toegewezen aan deze shift`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij noodinplanning",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedUserId(0);
    setReason("");
    setSearchTerm("");
    setSelectedStation("all");
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = () => {
    if (!shift) return;
    if (selectedUserId === 0) {
      toast({
        title: "Selecteer een gebruiker",
        description: "Kies een ambulancier om toe te wijzen",
        variant: "destructive",
      });
      return;
    }
    if (reason.trim().length < 5) {
      toast({
        title: "Reden verplicht",
        description: "Geef een reden op van minimaal 5 tekens",
        variant: "destructive",
      });
      return;
    }

    emergencyAssignMutation.mutate({
      shiftId: shift.id,
      userId: selectedUserId,
      reason: reason.trim()
    });
  };

  const selectedUser = emergencyUsers.find(u => u.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Noodinplanning
          </DialogTitle>
          <DialogDescription>
            Wijs een ambulancier van een ander station toe aan deze shift. 
            Dit is bedoeld voor noodgevallen en wordt gelogd.
          </DialogDescription>
        </DialogHeader>

        {shift && (
          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-50 rounded-md border">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Datum:</span>
                  <span className="ml-2 font-medium">
                    {format(new Date(shift.date), "dd MMMM yyyy", { locale: nl })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2 font-medium">
                    {shift.type === "day" ? "Dagshift" : "Nachtshift"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Filter op station</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle stations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle stations</SelectItem>
                  {stations.map(station => (
                    <SelectItem key={station} value={station}>
                      {station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Zoek ambulancier</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Selecteer ambulancier</Label>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={selectedUserId.toString()} onValueChange={(v) => setSelectedUserId(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kies een ambulancier..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {filteredUsers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Geen ambulanciers gevonden
                      </div>
                    ) : (
                      filteredUsers.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{user.firstName} {user.lastName}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({user.stationName})
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedUser && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                <div className="font-medium text-blue-800">
                  {selectedUser.firstName} {selectedUser.lastName}
                </div>
                <div className="text-blue-600">
                  Station: {selectedUser.stationName}
                  {selectedUser.hasLicenseC && " • Rijbewijs C"}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">
                Reden voor noodinplanning <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Bijv: Ziekte collega, geen andere beschikbaarheid..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                Minimaal 5 tekens. Deze reden wordt gelogd in de activiteitshistorie.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={emergencyAssignMutation.isPending || selectedUserId === 0 || reason.trim().length < 5}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {emergencyAssignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bezig...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Noodinplanning Bevestigen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
