import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Users,
  Loader2,
  HandHeart,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
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
  shift?: {
    id: number;
    date: string;
    type: string;
    startTime: string | null;
    endTime: string | null;
    isSplitShift: boolean;
  };
  stationName?: string;
}

interface OpenSwapRequestsProps {
  users: User[];
  stations?: Station[];
  currentUserId: number;
}

export function OpenSwapRequests({ users, stations, currentUserId }: OpenSwapRequestsProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OpenSwapRequest | null>(null);
  const [offerNote, setOfferNote] = useState("");

  const { data: openRequests = [], isLoading } = useQuery<OpenSwapRequest[]>({
    queryKey: ["/api/open-swap-requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/open-swap-requests");
      if (!res.ok) throw new Error("Kon open wissels niet ophalen");
      return res.json();
    },
  });

  const createOfferMutation = useMutation({
    mutationFn: async ({ requestId, note }: { requestId: number; note?: string }) => {
      const res = await apiRequest("POST", `/api/open-swap-requests/${requestId}/offers`, { note });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon aanbieding niet plaatsen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/open-swap-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/open-swap-offers/my"] });
      toast({
        title: "Aanbieding geplaatst",
        description: "Je aanbieding is verzonden. Je ontvangt een melding als deze wordt geaccepteerd.",
      });
      setOfferDialogOpen(false);
      setSelectedRequest(null);
      setOfferNote("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij plaatsen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getUserName = (userId: number) => {
    const u = users.find((usr) => usr.id === userId);
    return u ? `${u.firstName} ${u.lastName}` : "Onbekend";
  };

  const getStationName = (stationId: number) => {
    const station = stations?.find((s) => s.id === stationId);
    return station?.displayName || station?.name || "Onbekend";
  };

  const formatShiftTime = (request: OpenSwapRequest) => {
    if (!request.shift?.startTime || !request.shift?.endTime) return "-";
    const startHour = new Date(request.shift.startTime).getUTCHours();
    const endHour = new Date(request.shift.endTime).getUTCHours();

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
    setOfferDialogOpen(true);
  };

  const handleSubmitOffer = () => {
    if (!selectedRequest) return;
    createOfferMutation.mutate({
      requestId: selectedRequest.id,
      note: offerNote || undefined,
    });
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
                        {request.requesterName || getUserName(request.requesterId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.stationName || getStationName(request.stationId)}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Open
                    </Badge>
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
                  Shift van {selectedRequest.requesterName || getUserName(selectedRequest.requesterId)}
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
    </>
  );
}
