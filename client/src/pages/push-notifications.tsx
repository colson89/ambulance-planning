import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { nl } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Bell, Send, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Users, History } from "lucide-react";

interface NotificationRecipient {
  userId: number;
  firstName: string;
  lastName: string;
  status: string;
  error?: string;
  sentAt?: string;
}

interface NotificationHistory {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
  };
  recipients: NotificationRecipient[];
  summary: {
    total: number;
    sent: number;
    failed: number;
    noSubscription: number;
  };
}

interface Station {
  id: number;
  name: string;
  displayName: string;
}

export default function PushNotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    summary: { total: number; sent: number; failed: number; noSubscription: number };
    recipients: NotificationRecipient[];
  } | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  const { data: stations = [], isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
  });

  const { data: userStations = [] } = useQuery<Station[]>({
    queryKey: ["/api/user-stations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      if (user.role === 'supervisor') {
        return stations;
      }
      const res = await apiRequest("GET", `/api/users/${user.id}/accessible-stations`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && stations.length > 0,
  });

  const accessibleStations = useMemo(() => {
    if (user?.role === 'supervisor') {
      return stations.filter(s => s.id !== 8);
    }
    if (userStations.length > 0) {
      return userStations.filter(s => s.id !== 8);
    }
    const primaryStation = stations.find(s => s.id === user?.stationId);
    return primaryStation ? [primaryStation] : [];
  }, [user, stations, userStations]);

  useEffect(() => {
    if (!selectedStationId && accessibleStations.length > 0) {
      const saved = sessionStorage.getItem('notifications_selectedStationId');
      if (saved) {
        const savedId = parseInt(saved);
        if (accessibleStations.some(s => s.id === savedId)) {
          setSelectedStationId(savedId);
          return;
        }
      }
      if (user?.stationId && accessibleStations.some(s => s.id === user.stationId)) {
        setSelectedStationId(user.stationId);
      } else {
        setSelectedStationId(accessibleStations[0].id);
      }
    }
  }, [accessibleStations, selectedStationId, user?.stationId]);

  const handleStationChange = (stationId: number) => {
    setSelectedStationId(stationId);
    sessionStorage.setItem('notifications_selectedStationId', stationId.toString());
  };

  const effectiveStationId = selectedStationId || user?.stationId || 0;

  const { data: notificationHistory = [], isLoading: historyLoading, refetch: refetchHistory } = useQuery<NotificationHistory[]>({
    queryKey: ["/api/notifications/history", effectiveStationId],
    queryFn: async () => {
      if (!effectiveStationId) return [];
      const res = await apiRequest("GET", `/api/notifications/history?stationId=${effectiveStationId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!effectiveStationId && isAdmin,
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (data: { title: string; message: string; stationId: number }) => {
      const res = await apiRequest("POST", "/api/notifications/send", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Fout bij verzenden");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSendResult(data);
      setShowResultDialog(true);
      setTitle("");
      setMessage("");
      refetchHistory();
      toast({
        title: "Melding verzonden",
        description: `${data.summary.sent} van ${data.summary.total} gebruikers bereikt`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fout",
        description: error.message,
      });
    },
  });

  const handleSend = () => {
    if (!title.trim() || !message.trim() || !effectiveStationId) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Vul alle velden in",
      });
      return;
    }
    sendNotificationMutation.mutate({
      title: title.trim(),
      message: message.trim(),
      stationId: effectiveStationId,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Verzonden</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Mislukt</Badge>;
      case 'no_subscription':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Geen abonnement</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Je hebt geen toegang tot deze pagina.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showStationSelector = user?.role === 'supervisor' || accessibleStations.length > 1;
  const selectedStation = stations.find(s => s.id === effectiveStationId);

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Push Meldingen
            </h1>
            <p className="text-muted-foreground">Verstuur meldingen naar gebruikers van een station</p>
          </div>
        </div>
      </div>

      {showStationSelector && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <Label>Station:</Label>
              <Select
                value={effectiveStationId?.toString() || ""}
                onValueChange={(value) => handleStationChange(parseInt(value))}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Selecteer station" />
                </SelectTrigger>
                <SelectContent>
                  {accessibleStations.map((station) => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Nieuwe Melding Versturen
            </CardTitle>
            <CardDescription>
              Stuur een push melding naar alle gebruikers van {selectedStation?.displayName || "het geselecteerde station"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                placeholder="Bijv. Belangrijke mededeling"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Bericht</Label>
              <Textarea
                id="message"
                placeholder="Typ hier je bericht..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
            </div>
            <Button
              onClick={handleSend}
              disabled={sendNotificationMutation.isPending || !title.trim() || !message.trim()}
              className="w-full"
            >
              {sendNotificationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verzenden...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Melding Versturen
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recente Meldingen
            </CardTitle>
            <CardDescription>
              Bekijk wie de meldingen heeft ontvangen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : notificationHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nog geen meldingen verzonden voor dit station
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {notificationHistory.slice(0, 10).map((notification) => (
                  <AccordionItem key={notification.id} value={notification.id.toString()}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-col items-start text-left flex-1 mr-4">
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{formatInTimeZone(new Date(notification.createdAt), 'Europe/Brussels', "d MMM yyyy HH:mm", { locale: nl })}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {notification.summary.sent}/{notification.summary.total}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">{notification.message}</p>
                        </div>
                        <div className="flex gap-2 text-sm">
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {notification.summary.sent} verzonden
                          </Badge>
                          {notification.summary.failed > 0 && (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              {notification.summary.failed} mislukt
                            </Badge>
                          )}
                          {notification.summary.noSubscription > 0 && (
                            <Badge variant="secondary">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {notification.summary.noSubscription} geen abonnement
                            </Badge>
                          )}
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Gebruiker</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {notification.recipients.map((recipient) => (
                                <TableRow key={recipient.userId}>
                                  <TableCell>{recipient.firstName} {recipient.lastName}</TableCell>
                                  <TableCell>{getStatusBadge(recipient.status)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Melding Verzonden
            </DialogTitle>
            <DialogDescription>
              Overzicht van de bezorging
            </DialogDescription>
          </DialogHeader>
          {sendResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{sendResult.summary.sent}</div>
                  <div className="text-sm text-muted-foreground">Verzonden</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{sendResult.summary.failed}</div>
                  <div className="text-sm text-muted-foreground">Mislukt</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{sendResult.summary.noSubscription}</div>
                  <div className="text-sm text-muted-foreground">Geen push</div>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gebruiker</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sendResult.recipients.map((recipient) => (
                      <TableRow key={recipient.userId}>
                        <TableCell>{recipient.firstName} {recipient.lastName}</TableCell>
                        <TableCell>{getStatusBadge(recipient.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
