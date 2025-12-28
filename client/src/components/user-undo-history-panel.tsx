import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Undo2, ChevronDown, ChevronUp, Clock, User, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface UndoHistoryRecord {
  id: number;
  userId: number;
  stationId: number;
  entityType: string;
  entityId: number | null;
  action: string;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  month: number;
  year: number;
  isUndone: boolean;
  undoneAt: string | null;
  undoneById: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userName?: string;
}

interface UserUndoHistoryPanelProps {
  stationId: number;
}

export function UserUndoHistoryPanel({ stationId }: UserUndoHistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmUndoId, setConfirmUndoId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: history = [], isLoading, refetch } = useQuery<UndoHistoryRecord[]>({
    queryKey: ["/api/undo-history/users", stationId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/undo-history/users/${stationId}`);
      return response.json();
    },
    enabled: isOpen && stationId > 0,
    refetchInterval: isOpen ? 30000 : false,
  });

  const undoMutation = useMutation({
    mutationFn: async (undoId: number) => {
      const response = await apiRequest("POST", `/api/undo/${undoId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ongedaan maken mislukt");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Actie ongedaan gemaakt",
        description: "De wijziging is succesvol teruggedraaid.",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUndo = (id: number) => {
    setConfirmUndoId(id);
  };

  const confirmUndo = () => {
    if (confirmUndoId) {
      undoMutation.mutate(confirmUndoId);
      setConfirmUndoId(null);
    }
  };

  const getEntityTypeBadge = (entityType: string) => {
    switch (entityType) {
      case "user_create":
        return <Badge className="bg-green-100 text-green-800">Aangemaakt</Badge>;
      case "user_update":
        return <Badge variant="secondary">Bijgewerkt</Badge>;
      case "user_delete":
        return <Badge variant="destructive">Verwijderd</Badge>;
      case "user_station_add":
        return <Badge className="bg-blue-100 text-blue-800">Station +</Badge>;
      case "user_station_remove":
        return <Badge className="bg-orange-100 text-orange-800">Station -</Badge>;
      default:
        return <Badge>{entityType}</Badge>;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "d MMM HH:mm", { locale: nl });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Undo2 className="h-4 w-4" />
                  Undo Historie (Gebruikersbeheer)
                  {history.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {history.length}
                    </Badge>
                  )}
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Geen recente gebruikerswijzigingen om ongedaan te maken.
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {history.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getEntityTypeBadge(record.entityType)}
                          <span className="text-sm font-medium truncate">
                            {record.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(record.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {record.userName || "Onbekend"}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUndo(record.id)}
                        disabled={undoMutation.isPending}
                        className="ml-2"
                      >
                        {undoMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Undo2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <AlertDialog open={confirmUndoId !== null} onOpenChange={() => setConfirmUndoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wijziging ongedaan maken?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze wijziging ongedaan wilt maken? De gebruiker wordt teruggezet naar de vorige staat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUndo}>
              Ongedaan maken
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
