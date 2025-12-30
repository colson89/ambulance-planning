import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { nl } from "date-fns/locale";
import {
  Users,
  Loader2,
  HandHeart,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { User, Shift, Station } from "@shared/schema";

interface OpenSwapRequest {
  id: number;
  requesterId: number;
  requesterShiftId: number;
  stationId: number;
  status: string;
  requesterNote: string | null;
  createdAt: string;
  isOpen: boolean;
  requesterName?: string;
  requester?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  shift?: {
    id: number;
    date: string;
    type: string;
    startTime: string | null;
    endTime: string | null;
    isSplitShift: boolean;
  };
  stationName?: string;
  userOfferedShiftIds?: number[];
  offerCount?: number;
}

interface OpenSwapRequestsProps {
  users: User[];
  stations?: Station[];
  currentUserId: number;
  userRole?: string;
}

interface MyShift {
  id: number;
  date: string;
  type: string;
  startTime: string | null;
  endTime: string | null;
  isSplitShift: boolean;
  stationId: number;
  stationName?: string;
}

interface OfferInfo {
  id: number;
  offererId: number;
  offererName: string;
  offererShift: {
    id: number;
    date: string;
    type: string;
    startTime: string | null;
    endTime: string | null;
    isSplitShift: boolean;
    stationName: string | null;
  } | null;
  note: string | null;
  status: string;
  createdAt: string;
}

export function OpenSwapRequests({ users, stations, currentUserId, userRole }: OpenSwapRequestsProps) {
  const isAdminOrSupervisor = userRole === 'admin' || userRole === 'supervisor';
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OpenSwapRequest | null>(null);
  const [offerNote, setOfferNote] = useState("");
  const [offerMode, setOfferMode] = useState<"takeover" | "exchange">("takeover");
  const [selectedShiftIds, setSelectedShiftIds] = useState<number[]>([]);
  const [bidsDialogOpen, setBidsDialogOpen] = useState(false);
  const [selectedBidsRequest, setSelectedBidsRequest] = useState<OpenSwapRequest | null>(null);

  const { data: openRequests = [], isLoading } = useQuery<OpenSwapRequest[]>({
    queryKey: ["/api/open-swap-requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/open-swap-requests");
      if (!res.ok) throw new Error("Kon open wissels niet ophalen");
      return res.json();
    },
  });

  const { data: myShifts = [] } = useQuery<MyShift[]>({
    queryKey: ["/api/shifts/my-upcoming"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shifts/my-upcoming");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: offerDialogOpen,
  });

  // Fetch bids for a selected open swap request (admin/supervisor only)
  const { data: requestBids = [], isLoading: isLoadingBids } = useQuery<OfferInfo[]>({
    queryKey: ["/api/open-swap-requests", selectedBidsRequest?.id, "offers"],
    queryFn: async () => {
      if (!selectedBidsRequest) return [];
      const res = await apiRequest("GET", `/api/open-swap-requests/${selectedBidsRequest.id}/offers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: bidsDialogOpen && !!selectedBidsRequest && isAdminOrSupervisor,
  });

  // Pre-select all shifts when they load (for exchange mode), excluding already offered ones
  useEffect(() => {
    if (myShifts.length > 0 && offerMode === "exchange" && selectedShiftIds.length === 0) {
      const alreadyOfferedIds = selectedRequest?.userOfferedShiftIds || [];
      const availableShiftIds = myShifts
        .filter(s => !alreadyOfferedIds.includes(s.id))
        .map(s => s.id);
      setSelectedShiftIds(availableShiftIds);
    }
  }, [myShifts, offerMode, selectedRequest]);

  const createOfferMutation = useMutation({
    mutationFn: async ({ requestId, offererShiftId, note }: { requestId: number; offererShiftId?: number; note?: string }) => {
      const res = await apiRequest("POST", `/api/open-swap-requests/${requestId}/offers`, { 
        offererShiftId: offererShiftId || null,
        note 
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon aanbieding niet plaatsen");
      }
      return res.json();
    },
    // Note: onSuccess moved to handleSubmitOffer for multi-offer support
    onError: (error: Error) => {
      toast({
        title: "Fout bij plaatsen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRequesterName = (request: OpenSwapRequest) => {
    if (request.requester) {
      return `${request.requester.firstName} ${request.requester.lastName}`;
    }
    if (request.requesterName) {
      return request.requesterName;
    }
    const u = users.find((usr) => usr.id === request.requesterId);
    return u ? `${u.firstName} ${u.lastName}` : "Onbekend";
  };

  const getStationName = (stationId: number) => {
    const station = stations?.find((s) => s.id === stationId);
    return station?.displayName || station?.name || "Onbekend";
  };

  const formatShiftTime = (request: OpenSwapRequest) => {
    if (!request.shift?.startTime || !request.shift?.endTime) return "-";
    const startHour = new Date(request.shift.startTime).getHours();
    const endHour = new Date(request.shift.endTime).getHours();

    if (request.shift.type === "night") {
      if (request.shift.isSplitShift) {
        if (startHour === 19 && endHour === 23) return "19:00-23:00";
        else if (startHour === 23 && endHour === 7) return "23:00-07:00";
        else return `${startHour.toString().padStart(2, "0")}:00-${endHour.toString().padStart(2, "0")}:00`;
      }
      return "19:00-07:00";
    } else {
      if (request.shift.isSplitShift) {
        if (startHour === 7 && endHour === 13) return "07:00-13:00";
        else if (startHour === 13 && endHour === 19) return "13:00-19:00";
        else return `${startHour.toString().padStart(2, "0")}:00-${endHour.toString().padStart(2, "0")}:00`;
      }
      return "07:00-19:00";
    }
  };

  const openOfferDialog = (request: OpenSwapRequest) => {
    setSelectedRequest(request);
    setOfferNote("");
    setOfferMode("takeover");
    setSelectedShiftIds([]); // Reset, will be pre-filled by useEffect when shifts load
    setOfferDialogOpen(true);
  };

  const toggleShiftSelection = (shiftId: number) => {
    setSelectedShiftIds(prev => 
      prev.includes(shiftId) 
        ? prev.filter(id => id !== shiftId)
        : [...prev, shiftId]
    );
  };

  const handleSubmitOffer = async () => {
    if (!selectedRequest) return;
    if (offerMode === "exchange" && selectedShiftIds.length === 0) {
      toast({
        title: "Selecteer minstens één shift",
        description: "Vink aan welke van je eigen shifts je wilt aanbieden om te ruilen",
        variant: "destructive",
      });
      return;
    }
    
    let successCount = 0;
    let hadError = false;
    const totalOffers = offerMode === "takeover" ? 1 : selectedShiftIds.length;
    
    try {
      if (offerMode === "takeover") {
        await createOfferMutation.mutateAsync({
          requestId: selectedRequest.id,
          offererShiftId: undefined,
          note: offerNote || undefined,
        });
        successCount = 1;
      } else {
        for (const shiftId of selectedShiftIds) {
          try {
            await createOfferMutation.mutateAsync({
              requestId: selectedRequest.id,
              offererShiftId: shiftId,
              note: offerNote || undefined,
            });
            successCount++;
          } catch {
            hadError = true;
            // Continue with remaining shifts even if one fails
          }
        }
      }
    } catch {
      hadError = true;
    } finally {
      // Always invalidate queries to reflect any successful offers
      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/open-swap-requests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/open-swap-offers/my"] });
      }
      
      // Show appropriate toast
      if (successCount > 0) {
        if (hadError && successCount < totalOffers) {
          toast({
            title: `${successCount} van ${totalOffers} aanbiedingen geplaatst`,
            description: "Sommige aanbiedingen konden niet worden geplaatst.",
            variant: "destructive",
          });
        } else {
          toast({
            title: successCount === 1 ? "Aanbieding geplaatst" : `${successCount} aanbiedingen geplaatst`,
            description: "Je ontvangt een melding als deze wordt geaccepteerd.",
          });
        }
        
        // Close dialog on any success
        setOfferDialogOpen(false);
        setSelectedRequest(null);
        setOfferNote("");
        setSelectedShiftIds([]);
      }
    }
  };

  const formatMyShiftLabel = (shift: MyShift) => {
    const date = format(new Date(shift.date), "EEE d MMM", { locale: nl });
    const type = shift.type === "day" ? "Dag" : "Nacht";
    const stationName = stations?.find(s => s.id === shift.stationId)?.displayName || "";
    return `${date} - ${type}${stationName ? ` (${stationName})` : ""}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (openRequests.length === 0) {
    return null;
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Open Wissels</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {openRequests.length}
                  </Badge>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CardDescription>
              Collega's zoeken iemand om hun shift over te nemen
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              {openRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-lg border p-3 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">
                        {getRequesterName(request)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.stationName || getStationName(request.stationId)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isAdminOrSupervisor && (
                        <Badge 
                          variant="secondary" 
                          className={`cursor-pointer hover:opacity-80 ${(request.offerCount || 0) > 0 ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBidsRequest(request);
                            setBidsDialogOpen(true);
                          }}
                        >
                          {request.offerCount || 0} {(request.offerCount || 0) === 1 ? 'bieding' : 'biedingen'}
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Open
                      </Badge>
                    </div>
                  </div>

                  {request.shift && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.shift.date), "EEE d MMM yyyy", { locale: nl })}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {request.shift.type === "day" ? "Dag" : "Nacht"} ({formatShiftTime(request)})
                      </div>
                    </div>
                  )}

                  {request.requesterNote && (
                    <p className="text-xs text-muted-foreground italic">
                      "{request.requesterNote}"
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                    onClick={() => openOfferDialog(request)}
                  >
                    <HandHeart className="h-4 w-4 mr-2" />
                    Ik neem deze shift over
                  </Button>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandHeart className="h-5 w-5" />
              Shift Overnemen
            </DialogTitle>
            <DialogDescription>
              Bied aan om deze shift over te nemen van je collega
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">
                  Shift van {getRequesterName(selectedRequest)}
                </p>
                {selectedRequest.shift && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedRequest.shift.date), "EEEE d MMMM yyyy", { locale: nl })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.shift.type === "day" ? "Dagshift" : "Nachtshift"} ({formatShiftTime(selectedRequest)})
                    </p>
                  </>
                )}
                {selectedRequest.requesterNote && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    Reden: "{selectedRequest.requesterNote}"
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Hoe wil je reageren?</Label>
                <RadioGroup value={offerMode} onValueChange={(v) => setOfferMode(v as "takeover" | "exchange")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="takeover" id="takeover" />
                    <Label htmlFor="takeover" className="font-normal cursor-pointer">
                      <span className="flex items-center gap-2">
                        <HandHeart className="h-4 w-4" />
                        Alleen overnemen (geen ruil)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="exchange" id="exchange" />
                    <Label htmlFor="exchange" className="font-normal cursor-pointer">
                      <span className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        Ruilen met een eigen shift
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {offerMode === "exchange" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Welke shifts wil je aanbieden om te ruilen?</Label>
                    {myShifts.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {selectedShiftIds.length}/{myShifts.length} geselecteerd
                      </span>
                    )}
                  </div>
                  {myShifts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Je hebt geen toekomstige shifts om te ruilen.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2 bg-muted/30">
                      {myShifts.map((shift) => {
                        const alreadyOffered = selectedRequest?.userOfferedShiftIds?.includes(shift.id) || false;
                        return (
                          <div key={shift.id} className={`flex items-center space-x-2 ${alreadyOffered ? 'opacity-50' : ''}`}>
                            <Checkbox
                              id={`shift-${shift.id}`}
                              checked={selectedShiftIds.includes(shift.id)}
                              onCheckedChange={() => !alreadyOffered && toggleShiftSelection(shift.id)}
                              disabled={alreadyOffered}
                            />
                            <label
                              htmlFor={`shift-${shift.id}`}
                              className={`text-sm font-normal flex-1 ${alreadyOffered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {formatMyShiftLabel(shift)}
                              {alreadyOffered && <span className="ml-2 text-xs text-muted-foreground">(al aangeboden)</span>}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Beschikbare shifts zijn standaard aangevinkt. Vink uit wat je niet wilt aanbieden.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="offer-note">Bericht (optioneel)</Label>
                <Textarea
                  id="offer-note"
                  placeholder="Bijv. ik kan alleen als..."
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSubmitOffer}
              disabled={createOfferMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createOfferMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Aanbieding Plaatsen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bids Dialog - voor admins/supervisors */}
      <Dialog open={bidsDialogOpen} onOpenChange={setBidsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Biedingen voor Open Wissel
            </DialogTitle>
            <DialogDescription>
              {selectedBidsRequest && (
                <>
                  Wissel van {getRequesterName(selectedBidsRequest)} op{" "}
                  {selectedBidsRequest.shift && format(new Date(selectedBidsRequest.shift.date), "d MMM yyyy", { locale: nl })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoadingBids ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : requestBids.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nog geen biedingen ontvangen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requestBids.map((bid) => (
                  <div key={bid.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-sm">{bid.offererName}</p>
                      <Badge 
                        variant="secondary" 
                        className={
                          bid.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : bid.status === 'accepted' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }
                      >
                        {bid.status === 'pending' ? 'In afwachting' : bid.status === 'accepted' ? 'Geaccepteerd' : 'Afgewezen'}
                      </Badge>
                    </div>
                    
                    {bid.offererShift ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <ArrowLeftRight className="h-3 w-3" />
                        Biedt shift aan: {format(new Date(bid.offererShift.date), "d MMM yyyy", { locale: nl })} - 
                        {bid.offererShift.type === "day" ? " Dag" : " Nacht"}
                        {bid.offererShift.stationName && ` (${bid.offererShift.stationName})`}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <HandHeart className="h-3 w-3" />
                        Overname (geen ruil)
                      </div>
                    )}
                    
                    {bid.note && (
                      <p className="text-xs text-muted-foreground italic">
                        "{bid.note}"
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Ingediend: {formatInTimeZone(new Date(bid.createdAt), 'Europe/Brussels', "d MMM yyyy HH:mm", { locale: nl })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBidsDialogOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
