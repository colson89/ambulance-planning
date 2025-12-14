import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  AlertCircle,
  Check,
  X,
  Users,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Redirect, useLocation } from "wouter";
import type { User, Shift, Station } from "@shared/schema";

interface ShiftSwapRequest {
  id: number;
  requesterId: number;
  requesterShiftId: number;
  targetUserId: number;
  targetShiftId: number | null;
  stationId: number;
  status: string;
  requesterNote: string | null;
  adminNote: string | null;
  approvedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  targetUserStationId?: number | null;
  requesterStationId?: number | null;
  isOpen?: boolean;
  requesterShiftDate?: string | null;
  requesterShiftType?: string | null;
  targetShiftDate?: string | null;
  targetShiftType?: string | null;
  acceptedOffer?: {
    offererId: number;
    offererName: string;
    offererShiftId: number;
    offererShiftDate: string | null;
    offererShiftType: string | null;
  } | null;
}

export default function ShiftSwapsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ShiftSwapRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [adminNote, setAdminNote] = useState("");

  // Only admin and supervisor can access this page
  if (!user || (user.role !== "admin" && user.role !== "supervisor")) {
    return <Redirect to="/dashboard" />;
  }

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
  });
  
  // Query voor stations waar de huidige gebruiker toegang tot heeft (voor supervisors en admins)
  const { data: accessibleStations = [] } = useQuery<Station[]>({
    queryKey: ["/api/user/stations", user?.id, user?.role],
    enabled: user?.role === 'supervisor' || user?.role === 'admin',
  });
  
  // Check of admin meerdere stations heeft
  const isMultiStationAdmin = useMemo(() => {
    return user?.role === 'admin' && accessibleStations && accessibleStations.length > 1;
  }, [user?.role, accessibleStations]);
  
  // Station selector state - lees uit sessionStorage indien beschikbaar
  const [selectedStationId, setSelectedStationId] = useState<number | null>(() => {
    try {
      const stationData = sessionStorage.getItem('selectedStation');
      if (stationData) {
        const parsed = JSON.parse(stationData);
        return parsed.id || null;
      }
    } catch {
      // Ignore parsing errors
    }
    return user?.stationId || null;
  });
  
  // Handler to update station selection and persist to sessionStorage
  const handleStationChange = (stationId: number) => {
    setSelectedStationId(stationId);
    const station = accessibleStations?.find(s => s.id === stationId);
    if (station) {
      sessionStorage.setItem('selectedStation', JSON.stringify({ id: station.id, displayName: station.displayName }));
    }
  };
  
  // Sync selectedStationId from sessionStorage when user becomes available
  // Also validate that the stored station is still accessible
  useEffect(() => {
    if ((user?.role === 'supervisor' || user?.role === 'admin') && accessibleStations.length > 0) {
      // Controleer of de opgeslagen station nog steeds toegankelijk is
      if (selectedStationId !== null) {
        const isAccessible = accessibleStations.some(s => s.id === selectedStationId);
        if (!isAccessible) {
          // Reset naar primary station of eerste toegankelijke station
          const fallbackStation = accessibleStations.find(s => s.id === user.stationId) 
            || accessibleStations.find(s => s.code !== 'SUPERVISOR');
          if (fallbackStation) {
            setSelectedStationId(fallbackStation.id);
            sessionStorage.setItem('selectedStation', JSON.stringify({ id: fallbackStation.id, displayName: fallbackStation.displayName }));
          }
          return;
        }
      }
      
      // Als er nog geen selectie is, probeer uit sessionStorage of fallback naar primary
      if (selectedStationId === null) {
        try {
          const stationData = sessionStorage.getItem('selectedStation');
          if (stationData) {
            const parsed = JSON.parse(stationData);
            if (parsed.id && accessibleStations.some(s => s.id === parsed.id)) {
              setSelectedStationId(parsed.id);
              return;
            }
          }
        } catch {
          // Ignore parsing errors
        }
        // Default to primary station or first accessible station
        const defaultStation = accessibleStations.find(s => s.id === user.stationId) 
          || accessibleStations.find(s => s.code !== 'SUPERVISOR');
        if (defaultStation) {
          setSelectedStationId(defaultStation.id);
        }
      }
    }
  }, [user?.role, user?.stationId, selectedStationId, accessibleStations]);
  
  // Effectieve station ID
  const effectiveStationId = useMemo(() => {
    if (user?.role === 'supervisor') {
      return selectedStationId;
    }
    if (isMultiStationAdmin) {
      return selectedStationId || user?.stationId;
    }
    return user?.stationId || null;
  }, [user?.role, user?.stationId, selectedStationId, isMultiStationAdmin]);

  // Supervisors kunnen alle gebruikers ophalen, admins alleen hun station
  const usersEndpoint = user?.role === 'supervisor' ? "/api/users/all" : "/api/users";
  const { data: users = [] } = useQuery<User[]>({
    queryKey: [usersEndpoint],
    queryFn: async () => {
      const res = await apiRequest("GET", usersEndpoint);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts/all-for-swaps"],
    queryFn: async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const res = await apiRequest("GET", `/api/shifts?month=${currentMonth}&year=${currentYear}`);
      if (!res.ok) throw new Error("Failed to fetch shifts");
      return res.json();
    },
  });

  const { data: pendingRequests = [], isLoading: isPendingLoading } = useQuery<ShiftSwapRequest[]>({
    queryKey: ["/api/shift-swaps/pending"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shift-swaps/pending");
      if (!res.ok) throw new Error("Kon ruilverzoeken niet ophalen");
      return res.json();
    },
    enabled: statusFilter === "pending",
  });

  const { data: allRequests = [], isLoading: isAllLoading } = useQuery<ShiftSwapRequest[]>({
    queryKey: ["/api/shift-swaps/all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shift-swaps/all");
      if (!res.ok) throw new Error("Kon ruilverzoeken niet ophalen");
      return res.json();
    },
    enabled: statusFilter === "all",
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, adminNote }: { requestId: number; adminNote?: string }) => {
      const res = await apiRequest("POST", `/api/shift-swaps/${requestId}/approve`, { adminNote });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon verzoek niet goedkeuren");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps/pending"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps/all"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Ruilverzoek goedgekeurd",
        description: "De shifts zijn succesvol geruild.",
      });
      setActionDialogOpen(false);
      setSelectedRequest(null);
      setAdminNote("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij goedkeuren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, adminNote }: { requestId: number; adminNote?: string }) => {
      const res = await apiRequest("POST", `/api/shift-swaps/${requestId}/reject`, { adminNote });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon verzoek niet afwijzen");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps/pending"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps/all"] });
      toast({
        title: "Ruilverzoek afgewezen",
        description: "Het ruilverzoek is afgewezen.",
      });
      setActionDialogOpen(false);
      setSelectedRequest(null);
      setAdminNote("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij afwijzen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAction = () => {
    if (!selectedRequest) return;

    if (actionType === "approve") {
      approveMutation.mutate({ requestId: selectedRequest.id, adminNote: adminNote || undefined });
    } else {
      rejectMutation.mutate({ requestId: selectedRequest.id, adminNote: adminNote || undefined });
    }
  };

  const openActionDialog = (request: ShiftSwapRequest, type: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminNote("");
    setActionDialogOpen(true);
  };

  const getUserName = (userId: number) => {
    const u = users.find((usr) => usr.id === userId);
    return u ? `${u.firstName} ${u.lastName}` : "Onbekend";
  };

  const getShiftInfo = (shiftId: number, fallbackDate?: string | null, fallbackType?: string | null) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      if (fallbackDate) {
        return {
          date: format(new Date(fallbackDate), "EEE d MMM yyyy", { locale: nl }),
          type: fallbackType === "day" ? "Dag" : fallbackType === "night" ? "Nacht" : "?",
          time: fallbackType === "day" ? "07:00-19:00" : fallbackType === "night" ? "19:00-07:00" : "-",
        };
      }
      return { date: "Onbekend", type: "?", time: "-" };
    }

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

    return {
      date: format(new Date(shift.date), "EEE d MMM yyyy", { locale: nl }),
      type: shift.type === "day" ? "Dag" : "Nacht",
      time: getShiftTime(),
    };
  };

  const getStationName = (stationId: number) => {
    const station = stations.find((s) => s.id === stationId);
    return station?.displayName || station?.name || "Onbekend";
  };

  const getTargetUserStation = (request: ShiftSwapRequest) => {
    if (!request.targetUserStationId) return null;
    return stations.find((s) => s.id === request.targetUserStationId) || null;
  };

  const isCrossTeamRequest = (request: ShiftSwapRequest) => {
    if (!request.targetUserStationId) return false;
    return request.targetUserStationId !== request.stationId;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3" />
            In behandeling
          </Badge>
        );
      case "offer_selected":
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200">
            <Users className="h-3 w-3" />
            Wacht op goedkeuring
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

  // Filter requests op basis van status en geselecteerd station
  const filteredByStatus = statusFilter === "pending" ? pendingRequests : allRequests;
  const requests = useMemo(() => {
    // Voor alle admins en supervisors: filter op effectieve station ID
    // Dit zorgt ervoor dat single-station admins alleen hun eigen station zien
    if (effectiveStationId) {
      return filteredByStatus.filter(req => req.stationId === effectiveStationId);
    }
    return filteredByStatus;
  }, [filteredByStatus, effectiveStationId]);
  const isLoading = statusFilter === "pending" ? isPendingLoading : isAllLoading;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Ruilverzoeken Beheren
          </h1>
          <p className="text-muted-foreground text-sm">
            Bekijk en beheer shift ruilverzoeken
          </p>
        </div>
        
        {/* Station selector voor supervisors en multi-station admins */}
        {(user?.role === 'supervisor' || isMultiStationAdmin) && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="station-select" className="text-sm font-medium">
              Station
            </Label>
            <Select 
              value={(selectedStationId || effectiveStationId)?.toString() || ""} 
              onValueChange={(value) => handleStationChange(parseInt(value))}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-station">
                <SelectValue placeholder="Kies station..." />
              </SelectTrigger>
              <SelectContent>
                {accessibleStations
                  ?.filter(station => station.code !== 'SUPERVISOR')
                  ?.map((station) => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.displayName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Ruilverzoeken</CardTitle>
              <CardDescription>
                {statusFilter === "pending"
                  ? "Verzoeken die wachten op goedkeuring"
                  : "Alle ruilverzoeken (inclusief afgehandeld)"}
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter op status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">In behandeling</SelectItem>
                <SelectItem value="all">Alle verzoeken</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>
                {statusFilter === "pending"
                  ? "Geen openstaande ruilverzoeken"
                  : "Geen ruilverzoeken gevonden"}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile view */}
              <div className="md:hidden space-y-4">
                {requests.map((request) => {
                  const shiftInfo = getShiftInfo(request.requesterShiftId, request.requesterShiftDate, request.requesterShiftType);
                  const hasAcceptedOffer = request.isOpen && request.acceptedOffer;
                  const targetShiftInfo = hasAcceptedOffer
                    ? getShiftInfo(request.acceptedOffer!.offererShiftId, request.acceptedOffer!.offererShiftDate, request.acceptedOffer!.offererShiftType)
                    : request.targetShiftId 
                      ? getShiftInfo(request.targetShiftId, request.targetShiftDate, request.targetShiftType) 
                      : null;
                  const isSwap = request.targetShiftId !== null || hasAcceptedOffer;
                  return (
                    <div
                      key={request.id}
                      className={`border rounded-lg p-4 ${
                        request.status === "pending"
                          ? "bg-yellow-50/50 border-yellow-200"
                          : request.status === "offer_selected"
                          ? "bg-purple-50/50 border-purple-200"
                          : request.status === "approved"
                          ? "bg-green-50/50 border-green-200"
                          : request.status === "rejected"
                          ? "bg-red-50/50 border-red-200"
                          : "bg-gray-50/50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium">{getUserName(request.requesterId)}</div>
                          <div className="text-sm text-muted-foreground">
                            {getStationName(request.stationId)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          {request.isOpen && (
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                              <Users className="h-3 w-3 mr-1" />
                              Open Wissel
                            </Badge>
                          )}
                          {isSwap && !request.isOpen && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              Ruilen
                            </Badge>
                          )}
                          {getStatusBadge(request.status)}
                        </div>
                      </div>

                      <div className="bg-white/50 rounded p-2 mb-3">
                        <div className="text-sm">
                          <span className="font-medium">Shift:</span> {shiftInfo.date}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {shiftInfo.type} ({shiftInfo.time})
                        </div>
                      </div>

                      <div className="text-sm mb-3">
                        <span className="font-medium">{isSwap ? "Ruilen met" : "Overnemen door"}:</span>{" "}
                        <span className="inline-flex items-center gap-2">
                          {hasAcceptedOffer ? request.acceptedOffer!.offererName : getUserName(request.targetUserId)}
                          {isCrossTeamRequest(request) && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              Cross-team
                            </Badge>
                          )}
                        </span>
                        {isCrossTeamRequest(request) && (() => {
                          const targetStation = getTargetUserStation(request);
                          if (targetStation) {
                            return (
                              <div className="text-xs text-muted-foreground mt-1">
                                Station: {targetStation.displayName || targetStation.name}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {isSwap && targetShiftInfo && (
                        <div className="bg-purple-50/50 rounded p-2 mb-3 border border-purple-200">
                          <div className="text-sm">
                            <span className="font-medium">In ruil voor:</span> {targetShiftInfo.date}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {targetShiftInfo.type} ({targetShiftInfo.time})
                          </div>
                        </div>
                      )}

                      {request.requesterNote && (
                        <div className="text-sm text-muted-foreground mb-3">
                          <span className="font-medium">Reden:</span> {request.requesterNote}
                        </div>
                      )}

                      {(request.status === "pending" || request.status === "offer_selected") && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            onClick={() => openActionDialog(request, "approve")}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Goedkeuren
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            onClick={() => openActionDialog(request, "reject")}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Afwijzen
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop view */}
              <div className="hidden md:block">
                <Table>
                  <TableCaption>
                    {statusFilter === "pending"
                      ? "Verzoeken die wachten op goedkeuring"
                      : "Overzicht van alle ruilverzoeken"}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aanvrager</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Collega / In Ruil</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Datum</TableHead>
                      {statusFilter === "pending" && <TableHead className="text-right">Acties</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => {
                      const shiftInfo = getShiftInfo(request.requesterShiftId, request.requesterShiftDate, request.requesterShiftType);
                      const hasAcceptedOffer = request.isOpen && request.acceptedOffer;
                      const targetShiftInfo = hasAcceptedOffer
                        ? getShiftInfo(request.acceptedOffer!.offererShiftId, request.acceptedOffer!.offererShiftDate, request.acceptedOffer!.offererShiftType)
                        : request.targetShiftId 
                          ? getShiftInfo(request.targetShiftId, request.targetShiftDate, request.targetShiftType) 
                          : null;
                      const isSwap = request.targetShiftId !== null || hasAcceptedOffer;
                      return (
                        <TableRow
                          key={request.id}
                          className={
                            request.status === "pending"
                              ? "bg-yellow-50/30"
                              : request.status === "offer_selected"
                              ? "bg-purple-50/30"
                              : request.status === "approved"
                              ? "bg-green-50/30"
                              : request.status === "rejected"
                              ? "bg-red-50/30"
                              : ""
                          }
                        >
                          <TableCell>
                            <div className="font-medium">{getUserName(request.requesterId)}</div>
                            {request.requesterNote && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={request.requesterNote}>
                                {request.requesterNote}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>{shiftInfo.date}</div>
                            <div className="text-sm text-muted-foreground">
                              {shiftInfo.type} ({shiftInfo.time})
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {request.isOpen ? (
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                  <Users className="h-3 w-3 mr-1" />
                                  Open Wissel
                                </Badge>
                              ) : isSwap ? (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  Ruilen
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Overnemen
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{hasAcceptedOffer ? request.acceptedOffer!.offererName : getUserName(request.targetUserId)}</span>
                              {isCrossTeamRequest(request) && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                  Cross-team
                                </Badge>
                              )}
                            </div>
                            {(() => {
                              const targetStation = getTargetUserStation(request);
                              if (targetStation && isCrossTeamRequest(request)) {
                                return (
                                  <div className="text-xs text-muted-foreground">
                                    Station: {targetStation.displayName || targetStation.name}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            {isSwap && targetShiftInfo && (
                              <div className="text-xs text-purple-600">
                                {targetShiftInfo.date} - {targetShiftInfo.type}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStationName(request.stationId)}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(request.createdAt), "d MMM yyyy", { locale: nl })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(request.createdAt), "HH:mm", { locale: nl })}
                            </div>
                          </TableCell>
                          {statusFilter === "pending" && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                  onClick={() => openActionDialog(request, "approve")}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                  onClick={() => openActionDialog(request, "reject")}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Ruilverzoek Goedkeuren" : "Ruilverzoek Afwijzen"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "De shifts worden automatisch geruild. De aanvrager ontvangt een melding."
                : "Het verzoek wordt afgewezen. De aanvrager ontvangt een melding."}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Aanvrager:</span>
                    <div className="font-medium">{getUserName(selectedRequest.requesterId)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Overnemer:</span>
                    <div className="font-medium flex items-center gap-2">
                      {selectedRequest.isOpen && selectedRequest.acceptedOffer 
                        ? selectedRequest.acceptedOffer.offererName 
                        : getUserName(selectedRequest.targetUserId)}
                      {isCrossTeamRequest(selectedRequest) && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          Cross-team
                        </Badge>
                      )}
                    </div>
                    {isCrossTeamRequest(selectedRequest) && (() => {
                      const targetStation = getTargetUserStation(selectedRequest);
                      if (targetStation) {
                        return (
                          <div className="text-xs text-muted-foreground">
                            Station: {targetStation.displayName || targetStation.name}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Shift:</span>
                    <div className="font-medium">
                      {getShiftInfo(selectedRequest.requesterShiftId, selectedRequest.requesterShiftDate, selectedRequest.requesterShiftType).date} -{" "}
                      {getShiftInfo(selectedRequest.requesterShiftId, selectedRequest.requesterShiftDate, selectedRequest.requesterShiftType).type}
                    </div>
                  </div>
                </div>
              </div>

              {actionType === "approve" && (
                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-800">
                    Bij goedkeuring wordt de shift van{" "}
                    <strong>{getUserName(selectedRequest.requesterId)}</strong> overgedragen aan{" "}
                    <strong>{selectedRequest.isOpen && selectedRequest.acceptedOffer 
                      ? selectedRequest.acceptedOffer.offererName 
                      : getUserName(selectedRequest.targetUserId)}</strong>.
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin-note">
                  {actionType === "approve" ? "Opmerking (optioneel)" : "Reden afwijzing (optioneel)"}
                </Label>
                <Textarea
                  id="admin-note"
                  placeholder={
                    actionType === "approve"
                      ? "Voeg een opmerking toe..."
                      : "Geef een reden op voor de afwijzing..."
                  }
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {(approveMutation.isPending || rejectMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {actionType === "approve" ? "Goedkeuren" : "Afwijzen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
