import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, addMonths, subMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { Timer, ChevronLeft, ChevronRight, ArrowLeft, Trash2, Clock, Calendar, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Overtime {
  id: number;
  userId: number;
  shiftId: number;
  stationId: number;
  date: string;
  startTime: string;
  durationMinutes: number;
  reason: string;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  stationId: number;
}

interface Station {
  id: number;
  name: string;
  displayName: string;
}

export default function OvertimePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  
  const { data: myOvertime = [] } = useQuery<Overtime[]>({
    queryKey: ["/api/overtime/my", selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/overtime/my/${selectedYear}/${selectedMonth}`);
      if (!res.ok) return [];
      return res.json();
    },
  });
  
  const { data: stationOvertime = [] } = useQuery<Overtime[]>({
    queryKey: ["/api/overtime/station", selectedStationId || user?.stationId, selectedYear, selectedMonth],
    queryFn: async () => {
      const stationId = selectedStationId || user?.stationId;
      if (!stationId) return [];
      const res = await apiRequest("GET", `/api/overtime/station/${stationId}/${selectedYear}/${selectedMonth}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin || isSupervisor,
  });
  
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/overtime/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Fout bij verwijderen");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Overuren verwijderd",
        description: "De overuren zijn succesvol verwijderd.",
      });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/overtime');
        }
      });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
      setDeleteId(null);
    },
  });
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} uur`;
    return `${hours}u ${mins}m`;
  };
  
  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  
  const getUserName = (userId: number) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? `${foundUser.firstName} ${foundUser.lastName}` : "Onbekend";
  };
  
  const getStationName = (stationId: number) => {
    const station = stations.find(s => s.id === stationId);
    return station?.displayName || station?.name || "Onbekend";
  };
  
  const totalMyMinutes = myOvertime.reduce((sum, o) => sum + o.durationMinutes, 0);
  const totalStationMinutes = stationOvertime.reduce((sum, o) => sum + o.durationMinutes, 0);
  
  const canDeleteOvertime = (overtime: Overtime) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    
    if (overtime.year === currentYear && overtime.month === currentMonth) {
      return true;
    }
    
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    if (overtime.year === previousYear && overtime.month === previousMonth && currentDay <= 7) {
      return true;
    }
    
    return false;
  };
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Timer className="h-6 w-6" />
          Overuren Overzicht
        </h1>
      </div>
      
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-medium min-w-[150px] text-center">
          {format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", { locale: nl })}
        </span>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Mijn Overuren */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Mijn Overuren</span>
            <Badge variant="secondary">
              Totaal: {formatDuration(totalMyMinutes)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myOvertime.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen overuren geregistreerd voor deze maand
            </div>
          ) : (
            <div className="space-y-3">
              {myOvertime.map((overtime) => (
                <div 
                  key={overtime.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(new Date(overtime.date), "EEEE d MMMM", { locale: nl })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(overtime.startTime), "HH:mm")}
                      </span>
                      <Badge variant="outline">{formatDuration(overtime.durationMinutes)}</Badge>
                    </div>
                    <p className="text-sm">{overtime.reason}</p>
                  </div>
                  {canDeleteOvertime(overtime) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteId(overtime.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Station Overzicht (alleen voor admins en supervisors) */}
      {(isAdmin || isSupervisor) && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Station Overzicht
              </CardTitle>
              <div className="flex items-center gap-2">
                {isSupervisor && (
                  <Select 
                    value={String(selectedStationId || user?.stationId || "")}
                    onValueChange={(val) => setSelectedStationId(parseInt(val))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Selecteer station" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station.id} value={String(station.id)}>
                          {station.displayName || station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Badge variant="secondary">
                  Totaal: {formatDuration(totalStationMinutes)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stationOvertime.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Geen overuren geregistreerd voor dit station
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medewerker</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Tijd</TableHead>
                      <TableHead>Duur</TableHead>
                      <TableHead>Reden</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stationOvertime.map((overtime) => (
                      <TableRow key={overtime.id}>
                        <TableCell className="font-medium">
                          {getUserName(overtime.userId)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(overtime.date), "d MMM yyyy", { locale: nl })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(overtime.startTime), "HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatDuration(overtime.durationMinutes)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {overtime.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overuren Verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze overuren wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
