import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Undo2, ChevronDown, ChevronUp, Clock, User } from "lucide-react";
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

interface UndoHistoryPanelProps {
  stationId: number;
  month: number;
  year: number;
}

export function UndoHistoryPanel({ stationId, month, year }: UndoHistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmUndoId, setConfirmUndoId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history = [], isLoading, refetch } = useQuery<UndoHistoryRecord[]>({
    queryKey: ["/api/undo-history", stationId, month, year],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/undo-history/${stationId}/${month}/${year}`);
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
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
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
      case "shift_assignment":
        return <Badge variant="secondary">Toewijzing</Badge>;
      case "shift":
        return <Badge variant="outline">Shift</Badge>;
      case "shift_delete":
        return <Badge variant="destructive">Verwijderd</Badge>;
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
                  Undo Historie
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
                  Geen wijzigingen om ongedaan te maken voor deze maand.
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
              Weet je zeker dat je deze wijziging ongedaan wilt maken? De shift wordt teruggezet naar de vorige staat.
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
