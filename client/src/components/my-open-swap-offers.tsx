import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Users,
  Loader2,
  Check,
  X,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Trash2,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User, Station } from "@shared/schema";

interface ShiftSwapOffer {
  id: number;
  requestId: number;
  offererId: number;
  offererShiftId: number | null;
  offererShiftDate: string | null;
  offererShiftType: string | null;
  note: string | null;
  status: string;
  createdAt: string;
  offererName?: string;
  offererShift?: {
    id: number;
    date: string;
    type: string;
    startTime: string | null;
    endTime: string | null;
    isSplitShift: boolean;
  };
}

interface MyOpenSwapRequest {
  id: number;
  requesterShiftId: number;
  stationId: number;
  status: string;
  requesterNote: string | null;
  createdAt: string;
  isOpen: boolean;
  offers: ShiftSwapOffer[];
  shift?: {
    id: number;
    date: string;
    type: string;
    startTime: string | null;
    endTime: string | null;
    isSplitShift: boolean;
  };
}

interface MyOpenSwapOffersProps {
  users: User[];
  stations?: Station[];
}

export function MyOpenSwapOffers({ users, stations }: MyOpenSwapOffersProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<{request: MyOpenSwapRequest; offer: ShiftSwapOffer} | null>(null);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<MyOpenSwapRequest | null>(null);

  const { data: myRequests = [], isLoading } = useQuery<MyOpenSwapRequest[]>({
    queryKey: ["/api/open-swap-requests/my"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/open-swap-requests/my");
      if (!res.ok) throw new Error("Kon open wissels niet ophalen");
      return res.json();
    },
  });

  const acceptOfferMutation = useMutation({
    mutationFn: async (offerId: number) => {
      const res = await apiRequest("POST", `/api/open-swap-offers/${offerId}/accept`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon aanbieding niet accepteren");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/open-swap-requests/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/open-swap-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps/my-requests"] });
      toast({
        title: "Aanbieding geaccepteerd",
        description: "De aanbieding is geaccepteerd. De admin/supervisor moet dit nog goedkeuren.",
      });
      setAcceptDialogOpen(false);
      setSelectedOffer(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij accepteren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("POST", `/api/shift-swaps/${requestId}/cancel`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon verzoek niet annuleren");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/open-swap-requests/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/open-swap-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps/my-requests"] });
      toast({
        title: "Open wissel geannuleerd",
        description: "Je open wissel verzoek is geannuleerd.",
      });
      setCancelDialogOpen(false);
      setRequestToCancel(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij annuleren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getUserName = (userId: number) => {
    const u = users.find((usr) => usr.id === userId);
    return u ? `${u.firstName} ${u.lastName}` : "Onbekend";
  };

  const formatShiftTime = (request: MyOpenSwapRequest) => {
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

  const openAcceptDialog = (request: MyOpenSwapRequest, offer: ShiftSwapOffer) => {
    setSelectedOffer({ request, offer });
    setAcceptDialogOpen(true);
  };

  const openCancelDialog = (request: MyOpenSwapRequest) => {
    setRequestToCancel(request);
    setCancelDialogOpen(true);
  };

  const pendingRequests = myRequests.filter(r => r.status === "pending" && r.isOpen);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-lg">Mijn Open Wissels</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {pendingRequests.length}
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
              Bekijk en accepteer aanbiedingen van collega's
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-lg border p-3 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      {request.shift && (
                        <div className="flex flex-wrap gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(request.shift.date), "EEE d MMM yyyy", { locale: nl })}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {request.shift.type === "day" ? "Dag" : "Nacht"} ({formatShiftTime(request)})
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {request.offers.length > 0 && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          {request.offers.length} aanbieding{request.offers.length > 1 ? "en" : ""}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        onClick={() => openCancelDialog(request)}
                        title="Open wissel annuleren"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {request.requesterNote && (
                    <p className="text-xs text-muted-foreground italic">
                      Reden: "{request.requesterNote}"
                    </p>
                  )}

                  {request.offers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nog geen aanbiedingen ontvangen
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Aanbiedingen:</p>
                      {request.offers.map((offer) => (
                        <div
                          key={offer.id}
                          className="flex items-center justify-between bg-green-50 rounded p-2 border border-green-200"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {offer.offererName || getUserName(offer.offererId)}
                            </p>
                            {offer.offererShiftId ? (
                              <p className="text-xs text-blue-600 flex items-center gap-1">
                                Wil ruilen met: {offer.offererShiftDate ? format(new Date(offer.offererShiftDate), "EEE d MMM", { locale: nl }) : ""} {offer.offererShiftType === "day" ? "Dag" : "Nacht"}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Alleen overnemen</p>
                            )}
                            {offer.note && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {offer.note}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-100 hover:bg-green-200 border-green-300 text-green-700"
                            onClick={() => openAcceptDialog(request, offer)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accepteren
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Aanbieding Accepteren
            </DialogTitle>
            <DialogDescription>
              Bevestig dat je deze aanbieding wilt accepteren
            </DialogDescription>
          </DialogHeader>

          {selectedOffer && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">
                  {selectedOffer.offer.offererName || getUserName(selectedOffer.offer.offererId)} neemt je shift over
                </p>
                {selectedOffer.request.shift && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedOffer.request.shift.date), "EEEE d MMMM yyyy", { locale: nl })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOffer.request.shift.type === "day" ? "Dagshift" : "Nachtshift"} ({formatShiftTime(selectedOffer.request)})
                    </p>
                  </>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Na acceptatie moet de admin/supervisor de wissel nog goedkeuren voordat deze definitief is.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={() => selectedOffer && acceptOfferMutation.mutate(selectedOffer.offer.id)}
              disabled={acceptOfferMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {acceptOfferMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Accepteren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open wissel annuleren?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je dit open wissel verzoek wilt annuleren? Alle ontvangen aanbiedingen worden ook geannuleerd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nee, behouden</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => requestToCancel && cancelRequestMutation.mutate(requestToCancel.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelRequestMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Ja, annuleren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
