import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { RefreshCw, X, Loader2, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { User, Shift } from "@shared/schema";

interface ShiftSwapRequest {
  id: number;
  requesterId: number;
  requesterShiftId: number;
  requesterShiftDate: string | null;
  requesterShiftType: string | null;
  targetUserId: number;
  targetShiftId: number | null;
  targetShiftDate: string | null;
  targetShiftType: string | null;
  stationId: number;
  status: string;
  requesterNote: string | null;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MySwapRequestsProps {
  users: User[];
  shifts: Shift[];
  selectedMonth: number;
  selectedYear: number;
}

export function MySwapRequests({ users, shifts, selectedMonth, selectedYear }: MySwapRequestsProps) {
  const { toast } = useToast();

  const { data: myRequests = [], isLoading } = useQuery<ShiftSwapRequest[]>({
    queryKey: ["/api/shift-swaps/my-requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shift-swaps/my-requests");
      if (!res.ok) throw new Error("Kon ruilverzoeken niet ophalen");
      return res.json();
    },
  });

  const filteredRequests = useMemo(() => {
    return myRequests.filter((request) => {
      if (!request.requesterShiftDate) return false;
      const shiftDate = new Date(request.requesterShiftDate);
      return shiftDate.getMonth() === selectedMonth && shiftDate.getFullYear() === selectedYear;
    });
  }, [myRequests, selectedMonth, selectedYear]);

  const cancelMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("DELETE", `/api/shift-swaps/${requestId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon verzoek niet annuleren");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps/my-requests"] });
      toast({
        title: "Verzoek geannuleerd",
        description: "Je ruilverzoek is succesvol geannuleerd.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij annuleren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3" />
            In behandeling
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3" />
            Goedgekeurd
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3" />
            Afgewezen
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-gray-50 text-gray-700 border-gray-200">
            <X className="h-3 w-3" />
            Geannuleerd
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getShiftTypeLabel = (type: string) => {
    if (type === "day") return "Dagshift";
    if (type === "night") return "Nachtshift";
    if (type === "day-half-1" || type === "day-half-2") return "Halve dagshift";
    if (type === "night-half-1" || type === "night-half-2") return "Halve nachtshift";
    return type.startsWith("day") ? "Dagshift" : "Nachtshift";
  };

  const getShiftInfo = (shiftId: number, snapshotDate?: string | null, snapshotType?: string | null) => {
    // First try to use stored snapshot data (always works, even after shift is deleted/modified)
    if (snapshotDate && snapshotType) {
      return {
        date: format(new Date(snapshotDate), "EEE d MMM yyyy", { locale: nl }),
        type: getShiftTypeLabel(snapshotType),
      };
    }
    
    // Fallback to dynamic lookup (for older requests without snapshot data)
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return null;
    return {
      date: format(new Date(shift.date), "EEE d MMM yyyy", { locale: nl }),
      type: getShiftTypeLabel(shift.type),
    };
  };

  const getUserName = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Onbekend";
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (filteredRequests.length === 0) {
    return null;
  }

  const pendingRequests = filteredRequests.filter((r) => r.status === "pending");
  const otherRequests = filteredRequests.filter((r) => r.status !== "pending");

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Mijn Ruilverzoeken
        </CardTitle>
        <CardDescription>
          Overzicht van je ingediende ruilverzoeken
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">In behandeling</h4>
            {pendingRequests.map((request) => {
              const shiftInfo = getShiftInfo(request.requesterShiftId, request.requesterShiftDate, request.requesterShiftType);
              const targetShiftInfo = request.targetShiftId ? getShiftInfo(request.targetShiftId, request.targetShiftDate, request.targetShiftType) : null;
              const isSwap = request.targetShiftId !== null;
              return (
                <div
                  key={request.id}
                  className="border rounded-lg p-3 bg-yellow-50/50 border-yellow-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {shiftInfo ? `${shiftInfo.date} - ${shiftInfo.type}` : "Shift niet gevonden"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isSwap ? "Ruilen met" : "Overnemen door"}: <span className="font-medium">{getUserName(request.targetUserId)}</span>
                      </div>
                      {isSwap && targetShiftInfo && (
                        <div className="text-sm text-muted-foreground mt-1">
                          In ruil voor: <span className="font-medium">{targetShiftInfo.date} - {targetShiftInfo.type}</span>
                        </div>
                      )}
                      {request.requesterNote && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Reden: {request.requesterNote}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isSwap && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          Ruilen
                        </Badge>
                      )}
                      {getStatusBadge(request.status)}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={cancelMutation.isPending}
                          >
                            {cancelMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Ruilverzoek annuleren?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Weet je zeker dat je dit ruilverzoek wilt annuleren?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Terug</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => cancelMutation.mutate(request.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Annuleren
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {otherRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Afgehandeld</h4>
            {otherRequests.slice(0, 5).map((request) => {
              const shiftInfo = getShiftInfo(request.requesterShiftId, request.requesterShiftDate, request.requesterShiftType);
              const targetShiftInfo = request.targetShiftId ? getShiftInfo(request.targetShiftId, request.targetShiftDate, request.targetShiftType) : null;
              const isSwap = request.targetShiftId !== null;
              return (
                <div
                  key={request.id}
                  className={`border rounded-lg p-3 ${
                    request.status === "approved"
                      ? "bg-green-50/50 border-green-200"
                      : request.status === "rejected"
                      ? "bg-red-50/50 border-red-200"
                      : "bg-gray-50/50 border-gray-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {shiftInfo ? `${shiftInfo.date} - ${shiftInfo.type}` : "Shift niet gevonden"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isSwap 
                          ? (request.status === "approved" ? "Geruild met" : "Zou worden geruild met")
                          : (request.status === "approved" ? "Overgenomen door" : "Zou worden overgenomen door")
                        }: <span className="font-medium">{getUserName(request.targetUserId)}</span>
                      </div>
                      {isSwap && targetShiftInfo && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {request.status === "approved" ? "In ruil voor" : "Zou worden geruild voor"}: <span className="font-medium">{targetShiftInfo.date} - {targetShiftInfo.type}</span>
                        </div>
                      )}
                      {request.adminNote && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {request.adminNote}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isSwap && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          Ruilen
                        </Badge>
                      )}
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
