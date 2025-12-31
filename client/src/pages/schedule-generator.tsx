import { useState, useEffect, memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, addMonths, isWeekend, parseISO, addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { nl } from "date-fns/locale";
import { Home, Loader2, CalendarDays, Check, AlertCircle, Users, Edit, Save, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Clock, Split, Zap, UserPlus, UserMinus, RefreshCw, Calendar, Eye, Download, Link as LinkIcon, X, CheckCircle, XCircle } from "lucide-react";
import { UndoHistoryPanel } from "@/components/undo-history-panel";
import { EmergencySchedulingDialog } from "@/components/emergency-scheduling-dialog";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { User, ShiftPreference, Shift } from "@shared/schema";

interface Station {
  id: number;
  name: string;
  code: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== TIMEZONE HELPERS ====================
// Uses the canonical parseCETCalendarDate from utils.ts for deterministic CET date handling.
// This ensures consistent date display regardless of viewer's browser timezone.
import { parseCETCalendarDate } from "@/lib/utils";

// Helper voor SHIFTS - uses canonical CET parser
function toShiftCalendarDate(value: string | Date | null | undefined): string {
  return parseCETCalendarDate(value);
}

// Helper voor VOORKEUREN - uses canonical CET parser
function toPrefCalendarDate(value: string | Date | null | undefined): string {
  return parseCETCalendarDate(value);
}

// Algemene helper voor Date objecten (bijv. geselecteerde datum in UI)
function toCalendarDate(value: string | Date | null | undefined): string {
  return parseCETCalendarDate(value);
}

function ScheduleGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  // 0-based month (0 = januari, 11 = december) voor consistent gebruik met Date object
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [generatedSchedule, setGeneratedSchedule] = useState<Shift[]>([]);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState<boolean>(false);
  const [isGeneratingTestPreferences, setIsGeneratingTestPreferences] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [deleteProgressPercentage, setDeleteProgressPercentage] = useState<number>(0);
  const [deleteProgressMessage, setDeleteProgressMessage] = useState<string>("");
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [generateProgressPercentage, setGenerateProgressPercentage] = useState<number>(0);
  const [generateProgressMessage, setGenerateProgressMessage] = useState<string>("");
  const [selectedContactUser, setSelectedContactUser] = useState<User | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [testPassword, setTestPassword] = useState<string>("");
  const [deletePreferencesPassword, setDeletePreferencesPassword] = useState<string>("");
  const [isDeletingPreferences, setIsDeletingPreferences] = useState(false);
  
  // Add Shift Dialog state
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [addShiftDate, setAddShiftDate] = useState<Date | null>(null);
  const [addShiftType, setAddShiftType] = useState<"day" | "night">("day");
  const [addShiftTimeMode, setAddShiftTimeMode] = useState<"standard" | "custom">("standard");
  const [addShiftStandardDayType, setAddShiftStandardDayType] = useState<"full" | "morning" | "afternoon">("full");
  const [addShiftCustomStartTime, setAddShiftCustomStartTime] = useState("07:00");
  const [addShiftCustomEndTime, setAddShiftCustomEndTime] = useState("19:00");
  const [addShiftUserId, setAddShiftUserId] = useState<number>(0);
  
  // Force assignment state (voor noodgevallen)
  const [forceAssignment, setForceAssignment] = useState<boolean>(false);
  const [showForceOption, setShowForceOption] = useState<boolean>(false);
  
  // Emergency scheduling state (noodinplanning voor supervisors)
  const [showEmergencyDialog, setShowEmergencyDialog] = useState<boolean>(false);
  const [emergencyShift, setEmergencyShift] = useState<Shift | null>(null);
  
  // Shift bid viewing state (voor admins/supervisors)
  const [showBidsDialog, setShowBidsDialog] = useState(false);
  const [selectedBidShift, setSelectedBidShift] = useState<Shift | null>(null);
  
  // Verdi sync results dialog state
  const [showVerdiSyncResultsDialog, setShowVerdiSyncResultsDialog] = useState(false);
  const [verdiSyncResults, setVerdiSyncResults] = useState<{
    success: boolean;
    message: string;
    synced: number;
    errors: number;
    skipped: number;
    updated: number;
    deleted: number;
    deleteErrors: number;
    total: number;
    results: Array<{
      shiftId: number;
      date: string;
      userCount: number;
      users: string;
      success: boolean;
      errors: string[];
      warnings: string[];
    }>;
  } | null>(null);
  
  // Query voor stations (voor supervisors en admins)
  const { data: stations, isLoading: isLoadingStations } = useQuery<Station[]>({
    queryKey: ["/api/user/stations", user?.id, user?.role],
    enabled: user?.role === 'supervisor' || user?.role === 'admin',
  });
  
  // Check of admin meerdere stations heeft - alleen na data load
  const isMultiStationAdmin = useMemo(() => {
    return user?.role === 'admin' && stations && stations.length > 1;
  }, [user?.role, stations]);
  
  // Station selector state voor supervisors en multi-station admins - lees uit sessionStorage indien beschikbaar
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
    const station = stations?.find(s => s.id === stationId);
    if (station) {
      sessionStorage.setItem('selectedStation', JSON.stringify({ id: station.id, displayName: station.displayName }));
    }
  };

  // Sync selectedStationId from sessionStorage when user becomes available (handles async hydration)
  useEffect(() => {
    if ((user?.role === 'supervisor' || user?.role === 'admin') && selectedStationId === null) {
      try {
        const stationData = sessionStorage.getItem('selectedStation');
        if (stationData) {
          const parsed = JSON.parse(stationData);
          if (parsed.id) {
            setSelectedStationId(parsed.id);
            return;
          }
        }
      } catch {
        // Ignore parsing errors
      }
      // Default to primary station if no selection
      if (user?.stationId) {
        setSelectedStationId(user.stationId);
      }
    }
  }, [user?.role, user?.stationId, selectedStationId]);

  // Effectieve station ID - voor supervisors en multi-station admins is dit de geselecteerde station
  // Wacht op stations data voor admins voordat we isMultiStationAdmin kunnen bepalen
  const effectiveStationId = useMemo(() => {
    // For supervisors: always use selectedStationId if available
    if (user?.role === 'supervisor') {
      return selectedStationId;
    }
    // For admins with multiple stations: use selectedStationId or fallback to primary
    if (isMultiStationAdmin) {
      return selectedStationId || user?.stationId;
    }
    // For single-station admins or ambulanciers: use their station
    return user?.stationId || null;
  }, [user?.role, user?.stationId, selectedStationId, isMultiStationAdmin]);
  
  // Query om de laatste tijdstempel voor gegenereerde testvoorkeuren op te halen (per maand)
  const { data: lastGeneratedTimestamp, isLoading: isLoadingTimestamp } = useQuery({
    queryKey: ["/api/system/settings/last-preferences-generated", selectedMonth + 1, selectedYear, effectiveStationId, user?.id, user?.role],
    queryFn: async () => {
      let url = `/api/system/settings/last-preferences-generated?month=${selectedMonth + 1}&year=${selectedYear}`;
      
      // Voeg stationId toe voor alle rollen wanneer beschikbaar
      if (effectiveStationId) {
        url += `&stationId=${effectiveStationId}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        console.error("Error fetching last generated timestamp");
        return null;
      }
      return res.json();
    },
    enabled: !!effectiveStationId,
  });
  

  // Query om de laatste tijdstempel voor planning generatie op te halen (per maand)
  const { data: lastScheduleTimestamp, isLoading: isLoadingScheduleTimestamp } = useQuery({
    queryKey: ["/api/system/settings/last-schedule-generated", selectedMonth + 1, selectedYear, effectiveStationId, user?.id, user?.role],
    queryFn: async () => {
      let url = `/api/system/settings/last-schedule-generated?month=${selectedMonth + 1}&year=${selectedYear}`;
      
      // Voeg stationId toe voor alle rollen wanneer beschikbaar
      if (effectiveStationId) {
        url += `&stationId=${effectiveStationId}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        console.error("Error fetching last schedule timestamp");
        return null;
      }
      return res.json();
    },
    enabled: !!effectiveStationId,
  });
  const [lastGeneratedDate, setLastGeneratedDate] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [selectedShiftMode, setSelectedShiftMode] = useState<"full" | "morning" | "afternoon">("full");
  
  // Query voor planning publicatie status
  const { data: planningStatus, refetch: refetchPlanningStatus } = useQuery<{
    hasShifts: boolean;
    shiftCount: number;
    isPublished: boolean;
    publishedAt: string | null;
    generatedAt: string | null;
  }>({
    queryKey: ["/api/schedule/status", selectedMonth + 1, selectedYear, effectiveStationId],
    queryFn: async () => {
      const url = `/api/schedule/status?month=${selectedMonth + 1}&year=${selectedYear}&stationId=${effectiveStationId}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error("Kon planning status niet ophalen");
      return res.json();
    },
    enabled: !!effectiveStationId && (user?.role === 'admin' || user?.role === 'supervisor'),
  });
  
  // Navigatie functies voor maand/jaar
  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // Haal alle gebruikers op
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users", effectiveStationId, user?.id, user?.role],
    queryFn: async () => {
      let url = "/api/users";
      
      // Voeg stationId toe voor alle rollen wanneer beschikbaar
      if (effectiveStationId) {
        url += `?stationId=${effectiveStationId}`;
      }
      
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Kon gebruikers niet ophalen");
      return res.json();
    },
    enabled: !!user && !!effectiveStationId && (user.role === "admin" || user.role === "supervisor"),
  });

  // Haal alle voorkeuren op voor de geselecteerde maand
  const { data: preferences = [], refetch: refetchPreferences } = useQuery<ShiftPreference[]>({
    queryKey: ["/api/preferences/all", selectedMonth + 1, selectedYear, effectiveStationId, user?.id, user?.role],
    queryFn: async () => {
      let url = `/api/preferences/all?month=${selectedMonth + 1}&year=${selectedYear}`;
      
      // Voeg stationId toe voor alle rollen wanneer beschikbaar
      if (effectiveStationId) {
        url += `&stationId=${effectiveStationId}`;
      }
      
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Kon voorkeuren niet ophalen");
      return res.json();
    },
    enabled: !!user && !!effectiveStationId && (user.role === "admin" || user.role === "supervisor"),
  });

  // Haal alle shifts op voor de geselecteerde maand (gefilterd per station via backend)
  const { data: shifts = [], refetch: refetchShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", selectedMonth + 1, selectedYear, effectiveStationId, user?.id, user?.role],
    queryFn: async () => {
      let url = `/api/shifts?month=${selectedMonth + 1}&year=${selectedYear}`;
      
      // Voeg stationId toe voor alle rollen wanneer beschikbaar
      if (effectiveStationId) {
        url += `&stationId=${effectiveStationId}`;
      }
      
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Kon shifts niet ophalen");
      return res.json();
    },
    enabled: !!user && !!effectiveStationId && (user.role === "admin" || user.role === "supervisor" || user.role === "ambulancier"),
    // Force fresh data on every query to prevent stale cache issues
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Haal alle opmerkingen op voor de geselecteerde maand
  const { data: userComments = [] } = useQuery({
    queryKey: ["/api/comments/all", selectedMonth + 1, selectedYear, effectiveStationId, user?.id, user?.role],
    queryFn: async () => {
      let url = `/api/comments/all/${selectedMonth + 1}/${selectedYear}`;
      
      // Voeg stationId toe voor alle rollen wanneer beschikbaar
      if (effectiveStationId) {
        url += `?stationId=${effectiveStationId}`;
      }
      
      const res = await apiRequest("GET", url);
      if (!res.ok && res.status !== 404) throw new Error("Kon opmerkingen niet ophalen");
      return res.status === 404 ? [] : res.json();
    },
    enabled: !!user && !!effectiveStationId && (user.role === "admin" || user.role === "supervisor"),
  });

  // Haal weekday configuraties op voor requiredStaff berekening
  const { data: weekdayConfigs = [] } = useQuery<any[]>({
    queryKey: ["/api/weekday-configs", effectiveStationId, user?.id, user?.role],
    queryFn: async () => {
      let url = "/api/weekday-configs";
      
      if (effectiveStationId) {
        url += `?stationId=${effectiveStationId}`;
      }
      
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Kon weekday configuraties niet ophalen");
      return res.json();
    },
    enabled: !!user && !!effectiveStationId && (user.role === "admin" || user.role === "supervisor"),
  });

  // Haal cross-team shifts op (shifts van gebruikers op ANDERE stations)
  // Dit is nodig om "Ingepland elders" te detecteren voor cross-team users
  interface CrossTeamShift {
    shiftId: number;
    userId: number;
    stationId: number;
    date: string;
    type: string;
    startTime: string;
    endTime: string;
  }
  
  const { data: crossTeamShifts = [] } = useQuery<CrossTeamShift[]>({
    queryKey: ["/api/cross-team-shifts", selectedMonth + 1, selectedYear, effectiveStationId],
    queryFn: async () => {
      if (!effectiveStationId) return [];
      const url = `/api/cross-team-shifts?month=${selectedMonth + 1}&year=${selectedYear}&stationId=${effectiveStationId}`;
      const res = await apiRequest("GET", url);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && !!effectiveStationId && (user.role === "admin" || user.role === "supervisor"),
    staleTime: 0,
    gcTime: 0,
  });

  // Haal Verdi sync status op voor shifts in deze maand
  const { data: verdiSyncStatus = [] } = useQuery<any[]>({
    queryKey: ["/api/verdi/sync-status", selectedMonth + 1, selectedYear, effectiveStationId],
    queryFn: async () => {
      let url = `/api/verdi/sync-status/${selectedMonth + 1}/${selectedYear}`;
      
      if (effectiveStationId) {
        url += `?stationId=${effectiveStationId}`;
      }
      
      const res = await apiRequest("GET", url);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && !!effectiveStationId && (user.role === "admin" || user.role === "supervisor"),
  });

  // Haal laatste succesvolle Verdi sync timestamp op
  const { data: lastVerdiSync } = useQuery<{ lastSync: string | null }>({
    queryKey: ["/api/verdi/last-sync", effectiveStationId, selectedMonth + 1, selectedYear],
    queryFn: async () => {
      const url = `/api/verdi/last-sync/${effectiveStationId}/${selectedMonth + 1}/${selectedYear}`;
      const res = await apiRequest("GET", url);
      if (!res.ok) return { lastSync: null };
      return res.json();
    },
    enabled: !!user && !!effectiveStationId && (user.role === "admin" || user.role === "supervisor"),
  });

  // Check of er pending changes zijn voor Verdi sync (voor groene/rode knop indicator)
  const { data: verdiPendingChanges } = useQuery<{
    hasPendingChanges: boolean;
    newShifts: number;
    modifiedShifts: number;
    totalShifts: number;
  }>({
    queryKey: ["/api/verdi/pending-changes", effectiveStationId, selectedMonth + 1, selectedYear],
    queryFn: async () => {
      const url = `/api/verdi/pending-changes/${effectiveStationId}/${selectedMonth + 1}/${selectedYear}`;
      const res = await apiRequest("GET", url);
      if (!res.ok) return { hasPendingChanges: false, newShifts: 0, modifiedShifts: 0, totalShifts: 0 };
      return res.json();
    },
    enabled: !!user && !!effectiveStationId && (user.role === "admin" || user.role === "supervisor"),
    // Refetch regelmatig om de status up-to-date te houden
    refetchInterval: 30000, // 30 seconden
  });

  // Mutatie om de planning te genereren
  const generateScheduleMutation = useMutation({
    mutationFn: async () => {
      const requestBody: any = {
        month: selectedMonth + 1,
        year: selectedYear,
      };
      
      // Voeg stationId toe voor alle rollen wanneer beschikbaar
      if (effectiveStationId) {
        requestBody.stationId = effectiveStationId;
      }
      
      const res = await apiRequest("POST", "/api/schedule/generate", requestBody);
      if (!res.ok) throw new Error("Kon planning niet genereren");
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedSchedule(data);
      setLastGeneratedDate(new Date());
      toast({
        title: "Succes",
        description: "Planning gegenereerd voor " + format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl }) + ". Vergeet niet te publiceren!",
      });
      refetchShifts();
      refetchPlanningStatus();
      // Vernieuw ook de planning timestamp voor de huidige maand
      queryClient.invalidateQueries({ queryKey: ["/api/system/settings/last-schedule-generated", selectedMonth + 1, selectedYear, effectiveStationId, user?.id, user?.role] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het genereren van de planning",
        variant: "destructive",
      });
    },
  });
  
  // Mutatie om alle shifts voor een maand te verwijderen
  const deleteMonthShiftsMutation = useMutation({
    mutationFn: async () => {
      const requestBody: any = {
        month: selectedMonth + 1,
        year: selectedYear
      };
      
      // Voeg stationId toe voor alle rollen wanneer beschikbaar
      if (effectiveStationId) {
        requestBody.stationId = effectiveStationId;
      }
      
      const res = await apiRequest("DELETE", "/api/shifts/month", requestBody);
      if (!res.ok) throw new Error("Kon shifts niet verwijderen");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Succes",
        description: data.message || `Shifts succesvol verwijderd voor ${format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}`,
      });
      // Vernieuw specifiek de shift-gerelateerde cache entries voor deze station/maand
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedMonth + 1, selectedYear, effectiveStationId, user?.id, user?.role] });
      queryClient.removeQueries({ queryKey: ["/api/shifts", selectedMonth + 1, selectedYear, effectiveStationId, user?.id, user?.role] });
      refetchShifts();
      setLastGeneratedDate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het verwijderen van shifts",
        variant: "destructive",
      });
    },
  });
  
  // Mutatie om planning te publiceren
  const publishPlanningMutation = useMutation({
    mutationFn: async () => {
      const requestBody = {
        month: selectedMonth + 1,
        year: selectedYear,
        stationId: effectiveStationId
      };
      
      const res = await apiRequest("POST", "/api/schedule/publish", requestBody);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon planning niet publiceren");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Planning Gepubliceerd",
        description: `${data.shiftCount} shifts zijn nu zichtbaar voor medewerkers. Push meldingen zijn verzonden.`,
      });
      refetchPlanningStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het publiceren",
        variant: "destructive",
      });
    },
  });
  
  // Mutatie om planning publicatie in te trekken
  const unpublishPlanningMutation = useMutation({
    mutationFn: async () => {
      const requestBody = {
        month: selectedMonth + 1,
        year: selectedYear,
        stationId: effectiveStationId
      };
      
      const res = await apiRequest("POST", "/api/schedule/unpublish", requestBody);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon publicatie niet intrekken");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Publicatie Ingetrokken",
        description: "Planning is niet langer zichtbaar voor medewerkers.",
      });
      refetchPlanningStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het intrekken",
        variant: "destructive",
      });
    },
  });

  // Mutatie om planning naar Verdi te synchroniseren
  const syncToVerdiMutation = useMutation({
    mutationFn: async (changesOnly: boolean) => {
      const requestBody = {
        month: selectedMonth + 1,
        year: selectedYear,
        stationId: effectiveStationId,
        changesOnly
      };
      
      const res = await apiRequest("POST", "/api/verdi/sync", requestBody);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon planning niet synchroniseren naar Verdi");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Store results and open dialog instead of just toast
      setVerdiSyncResults(data);
      setShowVerdiSyncResultsDialog(true);
      
      // Force refresh van alle shift-gerelateerde data om sync status bij te werken
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verdi/sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verdi/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verdi/last-sync"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verdi/pending-changes"] });
      
      // Refetch huidige shifts
      refetchShifts();
    },
    onError: (error: Error) => {
      toast({
        title: "Synchronisatie Fout",
        description: error.message || "Er is een fout opgetreden bij het synchroniseren naar Verdi",
        variant: "destructive",
      });
    },
  });

  // Helper functie om beschikbare uren uit voorkeuren voor deze maand te tellen
  const countAvailableHoursFromPreferences = (userId: number) => {
    // Elke voorkeur vertegenwoordigt ongeveer 12 uur (een volledige shift)
    const prefsCount = preferences.filter(p => p.userId === userId).length;
    return prefsCount * 12;
  };

  // Functie om beschikbare medewerkers te tonen op basis van voorkeuren
  const getUsersAvailableForDate = (date: Date | null, shiftType: "day" | "night") => {
    // Veiligheidsmaatregel: returnt een lege array als de datum null is
    if (!date) return [];
    
    try {
      const result: Array<{
        userId: number;
        username: string;
        firstName: string;
        lastName: string;
        preferenceType: string;
        canSplit: boolean;
        isAssigned: boolean;
        isAssignedElsewhere: boolean; // NIEUW: Ingepland op ander station
        isAvailable: boolean;
        hasNoPreference: boolean;
        hours: number;
        scheduledHours: number;
      }> = [];
      
      // TIMEZONE FIX: Gebruik helper functie voor consistente datum extractie
      // - Strings (uit database): substring(0, 10)
      // - Date objecten: lokale getFullYear/getMonth/getDate
      const gezochteYMD = toCalendarDate(date);
      
      // In plaats van te zoeken in voorkeuren, kijken we direct naar de shifts
      // om te zien wie er gepland staat voor deze datum
      const matchingShifts = shifts.filter(shift => {
        if (!shift.date) return false;
        
        // TIMEZONE FIX: Gebruik toCalendarDate voor shifts (23:00 UTC → volgende dag)
        const shiftYMD = toShiftCalendarDate(shift.date);
        const matchesDate = shiftYMD === gezochteYMD;
        
        // Controleer het shift type (dag of nacht)
        const isTypeMatch = (shiftType === "day" && shift.type === "day") || 
                           (shiftType === "night" && shift.type === "night");
        
        return matchesDate && isTypeMatch;
      });
      
      // Voor elke gevonden shift, zoek de toegewezen medewerker
      const assignedUserIds = new Set<number>();
      matchingShifts.forEach(shift => {
        if (shift.userId > 0) {
          assignedUserIds.add(shift.userId);
        }
      });
      
      // NIEUW: Check cross-team shifts - wie is ingepland op een ANDER station vandaag?
      const usersScheduledElsewhere = new Set<number>();
      crossTeamShifts.forEach(ctShift => {
        // TIMEZONE FIX: Gebruik toCalendarDate voor shifts (23:00 UTC → volgende dag)
        const ctShiftYMD = toShiftCalendarDate(ctShift.date);
        const ctMatchesDate = ctShiftYMD === gezochteYMD;
        
        // Controleer het shift type (dag of nacht) - beide shifts blokkeren elkaar
        const isTypeMatch = (shiftType === "day" && ctShift.type === "day") || 
                           (shiftType === "night" && ctShift.type === "night");
        
        if (ctMatchesDate && isTypeMatch) {
          usersScheduledElsewhere.add(ctShift.userId);
        }
      });
      
      // Haal alle ambulanciers EN admins op die shifts kunnen draaien
      const ambulanciers = users.filter(u => u.role === "ambulancier" || u.role === "admin");
      
      // Filter voorkeuren voor de geselecteerde datum
      // BELANGRIJK: We zoeken voorkeuren van ALLE stations voor cross-team users
      const preferencesForDate = preferences.filter(pref => {
        if (!pref || !pref.date) return false;
        // TIMEZONE FIX: Gebruik helper functie
        // Voorkeuren zijn opgeslagen als "2026-02-05 23:00:00" - helper neemt alleen de datum
        const prefYMD = toPrefCalendarDate(pref.date);
        return prefYMD === gezochteYMD;
      });
      
      // Maak Sets voor gebruikers die beschikbaar zijn en die expliciet niet beschikbaar zijn
      const availableUserIds = new Set<number>();
      const unavailableUserIds = new Set<number>();
      const usersWithPreferenceForThisShiftType = new Set<number>();
      
      preferencesForDate.forEach(pref => {
        // BUG FIX: Check zowel type='unavailable' ALS notes='Niet beschikbaar'
        // Sommige voorkeuren gebruiken notes veld om onbeschikbaarheid aan te geven
        const isUnavailable = pref.type === "unavailable" || pref.notes === "Niet beschikbaar";
        
        // Track users who have THIS specific shift type preference (day/night) OR unavailable for this date
        if (pref.type === shiftType || isUnavailable) {
          usersWithPreferenceForThisShiftType.add(pref.userId);
        }
        
        if (isUnavailable) {
          unavailableUserIds.add(pref.userId);
        } else if (pref.type === shiftType) {
          availableUserIds.add(pref.userId);
        }
      });
      
      // Toon ALLE ambulanciers en markeer op basis van beschikbaarheid en toewijzing
      ambulanciers.forEach(ambulancier => {
        const isAssigned = assignedUserIds.has(ambulancier.id);
        const isAssignedElsewhere = usersScheduledElsewhere.has(ambulancier.id);
        const hasExplicitAvailability = availableUserIds.has(ambulancier.id);
        const hasExplicitUnavailability = unavailableUserIds.has(ambulancier.id);
        const hasPreferenceForThisShift = usersWithPreferenceForThisShiftType.has(ambulancier.id);
        
        // Controleer of de ambulancier uren wil werken (hours > 0)
        const wantsToWork = ambulancier.hours > 0;
        
        // GEEN voorkeur ingediend voor deze specifieke shift (dag of nacht)
        // Ook geen voorkeur als ze al zijn toegewezen maar geen expliciete voorkeur hebben
        const hasNoPreference = !hasPreferenceForThisShift && !isAssigned && !isAssignedElsewhere;
        
        // isAvailable is ALLEEN true als ze expliciet beschikbaar zijn EN uren willen werken
        // EN niet ingepland elders
        const isAvailable = hasExplicitAvailability && wantsToWork && !isAssignedElsewhere;
        
        // Bepaal het preferentietype
        let preferenceType = "no_preference";
        if (isAssigned) {
          preferenceType = "assigned";
        } else if (isAssignedElsewhere) {
          preferenceType = "assigned_elsewhere"; // NIEUW: Ingepland op ander station
        } else if (isAvailable) {
          preferenceType = "available";
        } else if (hasExplicitAvailability && !wantsToWork) {
          preferenceType = "available_no_hours";
        } else if (hasExplicitUnavailability) {
          preferenceType = "unavailable";
        } else {
          preferenceType = "no_preference";
        }
        
        // Voeg ALLE ambulanciers toe aan resultaat (niet alleen die met voorkeur)
        result.push({
          userId: ambulancier.id,
          username: ambulancier.username || "Onbekend",
          firstName: ambulancier.firstName || "",
          lastName: ambulancier.lastName || "",
          preferenceType: preferenceType,
          canSplit: false, // Niet relevant voor weergave
          isAssigned: isAssigned,
          isAssignedElsewhere: isAssignedElsewhere, // NIEUW
          isAvailable: isAvailable, // ALLEEN true als expliciet beschikbaar + uren > 0
          hasNoPreference: hasNoPreference, // Geen expliciete voorkeur voor dit shift type
          hours: ambulancier.hours || 0,
          scheduledHours: countUserShiftsHours(ambulancier.id)
        });
      });
      
      // Sorteer de resultaten: eerst toegewezen, dan beschikbaar, dan geen voorkeur, dan ingepland elders, dan niet beschikbaar
      result.sort((a, b) => {
        // Sorteer volgorde: assigned > available > no_preference > assigned_elsewhere > unavailable > no_hours
        const order = (item: typeof result[0]) => {
          if (item.isAssigned) return 0;
          if (item.isAvailable) return 1;
          if (item.hasNoPreference) return 2;
          if (item.isAssignedElsewhere) return 3; // NIEUW: Ingepland elders komt na geen voorkeur
          if (item.preferenceType === "unavailable") return 4;
          return 5;
        };
        
        const orderDiff = order(a) - order(b);
        if (orderDiff !== 0) return orderDiff;
        
        // Daarna op naam
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      return result;
    } catch (error) {
      console.error("Algemene fout in getUsersAvailableForDate:", error);
      return [];
    }
  };

  // Helper functie om gegenereerde shifts in uren per gebruiker te berekenen
  // Houdt alleen rekening met shifts in de geselecteerde maand/jaar
  const countUserShiftsHours = (userId: number) => {
    // Filter shifts op gebruiker én geselecteerde maand/jaar
    const userShifts = shifts.filter(s => {
      if (s.userId !== userId) return false;
      
      // TIMEZONE FIX: Gebruik toCalendarDate voor shifts (23:00 UTC → volgende dag)
      const shiftYMD = toShiftCalendarDate(s.date);
      const shiftYear = parseInt(shiftYMD.substring(0, 4));
      const shiftMonth = parseInt(shiftYMD.substring(5, 7)) - 1; // 0-indexed
      return shiftMonth === selectedMonth && shiftYear === selectedYear;
    });
    
    // Tel de uren voor elke shift gebaseerd op daadwerkelijke tijden
    let totalHours = 0;
    userShifts.forEach(shift => {
      if (shift.isSplitShift && shift.splitStartTime && shift.splitEndTime) {
        // Bereken uren voor gesplitste shift
        const startTime = new Date(shift.splitStartTime);
        const endTime = new Date(shift.splitEndTime);
        const hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      } else if (shift.startTime && shift.endTime) {
        // Bereken uren voor volledige shift
        const startTime = new Date(shift.startTime);
        const endTime = new Date(shift.endTime);
        const hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });
    
    return Math.round(totalHours);
  };
  
  // Helper functie om weekday shifts te tellen (maandag tot vrijdag)
  const countUserWeekdayShiftHours = (userId: number) => {
    // Filter shifts op gebruiker én geselecteerde maand/jaar én weekdagen
    const userShifts = shifts.filter(s => {
      if (s.userId !== userId) return false;
      
      // TIMEZONE FIX: Gebruik toCalendarDate voor shifts (23:00 UTC → volgende dag)
      const shiftYMD = toShiftCalendarDate(s.date);
      const shiftYear = parseInt(shiftYMD.substring(0, 4));
      const shiftMonth = parseInt(shiftYMD.substring(5, 7)) - 1; // 0-indexed
      const shiftDay = parseInt(shiftYMD.substring(8, 10));
      const checkDate = new Date(shiftYear, shiftMonth, shiftDay);
      // Controleer of het een weekdag is (niet weekend)
      return shiftMonth === selectedMonth && 
             shiftYear === selectedYear &&
             !isWeekend(checkDate);
    });
    
    // Tel de uren voor elke shift gebaseerd op daadwerkelijke tijden
    let totalHours = 0;
    userShifts.forEach(shift => {
      if (shift.startTime && shift.endTime) {
        // Bereken uren voor shift
        const startTime = new Date(shift.startTime);
        const endTime = new Date(shift.endTime);
        const hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });
    
    return Math.round(totalHours);
  };
  
  // Helper functie om weekend shifts te tellen (zaterdag en zondag)
  const countUserWeekendShiftHours = (userId: number) => {
    // Filter shifts op gebruiker én geselecteerde maand/jaar én weekenddagen
    const userShifts = shifts.filter(s => {
      if (s.userId !== userId) return false;
      
      // TIMEZONE FIX: Gebruik toCalendarDate voor shifts (23:00 UTC → volgende dag)
      const shiftYMD = toShiftCalendarDate(s.date);
      const shiftYear = parseInt(shiftYMD.substring(0, 4));
      const shiftMonth = parseInt(shiftYMD.substring(5, 7)) - 1; // 0-indexed
      const shiftDay = parseInt(shiftYMD.substring(8, 10));
      const checkDate = new Date(shiftYear, shiftMonth, shiftDay);
      // Controleer of het weekend is
      return shiftMonth === selectedMonth && 
             shiftYear === selectedYear &&
             isWeekend(checkDate);
    });
    
    // Tel de uren voor elke shift gebaseerd op daadwerkelijke tijden
    let totalHours = 0;
    userShifts.forEach(shift => {
      if (shift.isSplitShift && shift.splitStartTime && shift.splitEndTime) {
        // Bereken uren voor gesplitste shift
        const startTime = new Date(shift.splitStartTime);
        const endTime = new Date(shift.splitEndTime);
        const hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      } else if (shift.startTime && shift.endTime) {
        // Bereken uren voor volledige shift
        const startTime = new Date(shift.startTime);
        const endTime = new Date(shift.endTime);
        const hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });
    
    return Math.round(totalHours);
  };
  
  // Mutatie om een shift te updaten
  const updateShiftMutation = useMutation({
    mutationFn: async ({ shiftId, userId, force, startTime, endTime, isSplitShift }: { 
      shiftId: number; 
      userId: number; 
      force?: boolean;
      startTime?: string;
      endTime?: string;
      isSplitShift?: boolean;
    }) => {
      const body: any = {
        userId: userId,
        status: userId === 0 ? "open" : "planned",
        force: force || false
      };
      
      // Voeg optionele tijdvelden toe als ze zijn opgegeven
      if (startTime !== undefined) body.startTime = startTime;
      if (endTime !== undefined) body.endTime = endTime;
      if (isSplitShift !== undefined) body.isSplitShift = isSplitShift;
      
      const res = await apiRequest("PATCH", `/api/shifts/${shiftId}`, body);
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.errorCode === "SPLIT_SHIFT_NOT_ALLOWED_FOR_CROSS_TEAM_USER") {
          throw { message: errorData.message, showForce: true };
        }
        throw new Error(errorData.message || "Kon shift niet updaten");
      }
      return res.json();
    },
    onSuccess: () => {
      setEditingShift(null);
      setForceAssignment(false);
      setShowForceOption(false);
      toast({
        title: "Succes",
        description: "Shift succesvol bijgewerkt",
      });
      // Vernieuw de shifts na een update
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedMonth + 1, selectedYear, effectiveStationId] });
    },
    onError: (error: any) => {
      if (error.showForce) {
        setShowForceOption(true);
        toast({
          title: "Toewijzing geblokkeerd",
          description: "Gebruik 'Forceer toewijzing' om de beperking te negeren (alleen in noodgevallen).",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Fout",
          description: error.message || "Er is een fout opgetreden bij het updaten van de shift",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation om een shift volledig te verwijderen
  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const res = await apiRequest("DELETE", `/api/shifts/${shiftId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Kon shift niet verwijderen");
      }
      return res.json();
    },
    onSuccess: () => {
      setEditingShift(null);
      setShowDeleteConfirm(false);
      toast({
        title: "Succes",
        description: "Shift succesvol verwijderd uit de planning",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedMonth + 1, selectedYear, effectiveStationId] });
    },
    onError: (error: Error) => {
      setShowDeleteConfirm(false);
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het verwijderen van de shift",
        variant: "destructive",
      });
    },
  });

  // Mutation om handmatig shifts toe te voegen voor open slots
  const addManualShiftMutation = useMutation({
    mutationFn: async ({ 
      date, 
      startTime, 
      endTime, 
      userId, 
      type, 
      isSplitShift 
    }: { 
      date: Date, 
      startTime: string, 
      endTime: string, 
      userId?: number,
      type: "day" | "night",
      isSplitShift: boolean
    }) => {
      const shiftData = {
        date: format(date, 'yyyy-MM-dd'),
        type: type,
        startTime: `${format(date, 'yyyy-MM-dd')}T${startTime}:00.000Z`,
        endTime: startTime > endTime ? 
          `${format(addDays(date, 1), 'yyyy-MM-dd')}T${endTime}:00.000Z` : 
          `${format(date, 'yyyy-MM-dd')}T${endTime}:00.000Z`,
        status: userId ? 'planned' : 'open',
        userId: userId || 0,
        isSplitShift: isSplitShift,
        stationId: effectiveStationId
      };
      
      const response = await apiRequest("POST", "/api/shifts", shiftData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedMonth + 1, selectedYear, effectiveStationId] });
      refetchShifts();
      toast({
        title: "Shift toegevoegd",
        description: "Open tijdslot is toegevoegd als beschikbare shift",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij toevoegen shift",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Query voor biedingen tellen per shift (voor open shifts)
  const { data: bidCounts = {} } = useQuery<Record<number, number>>({
    queryKey: ["/api/shift-bids/counts", selectedMonth + 1, selectedYear, effectiveStationId],
    queryFn: async () => {
      if (!effectiveStationId) return {};
      const response = await apiRequest("GET", `/api/shift-bids/counts?month=${selectedMonth + 1}&year=${selectedYear}&stationId=${effectiveStationId}`);
      const data = await response.json();
      // Convert array to lookup object
      const counts: Record<number, number> = {};
      for (const item of data) {
        counts[item.shiftId] = item.count;
      }
      return counts;
    },
    enabled: !!effectiveStationId && (user?.role === 'admin' || user?.role === 'supervisor'),
  });

  // Query voor biedingen op een specifieke shift
  const { data: shiftBids, refetch: refetchBids } = useQuery<{
    id: number;
    shiftId: number;
    userId: number;
    status: string;
    createdAt: string;
    respondedAt: string | null;
    user: {
      id: number;
      username: string;
      firstName: string;
      lastName: string;
    };
  }[]>({
    queryKey: ["/api/shifts/bids", selectedBidShift?.id],
    queryFn: async () => {
      if (!selectedBidShift?.id) return [];
      const response = await apiRequest("GET", `/api/shifts/${selectedBidShift.id}/bids`);
      return response.json();
    },
    enabled: !!selectedBidShift?.id && showBidsDialog,
  });

  // Mutation voor het toewijzen van een bieding
  const assignBidMutation = useMutation({
    mutationFn: async (bidId: number) => {
      const response = await apiRequest("POST", `/api/shift-bids/${bidId}/accept`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedMonth + 1, selectedYear, effectiveStationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-bids/counts", selectedMonth + 1, selectedYear, effectiveStationId] });
      refetchShifts();
      refetchBids();
      setShowBidsDialog(false);
      setSelectedBidShift(null);
      toast({
        title: "Shift toegewezen",
        description: "De shift is toegewezen aan de geselecteerde medewerker",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij toewijzen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation voor het afwijzen van een bieding
  const rejectBidMutation = useMutation({
    mutationFn: async (bidId: number) => {
      const response = await apiRequest("POST", `/api/shift-bids/${bidId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-bids/counts", selectedMonth + 1, selectedYear, effectiveStationId] });
      refetchBids();
      toast({
        title: "Bieding afgewezen",
        description: "De bieding is afgewezen en de medewerker is op de hoogte gebracht",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij afwijzen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler voor handmatig toevoegen van shifts - opent dialog
  const handleAddShift = (date: Date, startTime?: string, endTime?: string, userId?: number) => {
    setAddShiftDate(date);
    setShowAddShiftDialog(true);
    setAddShiftUserId(userId || 0);
    
    // Intelligent pre-fill based on provided times
    if (startTime && endTime) {
      // Determine shift type and preset based on times
      if (startTime === "19:00" && endTime === "07:00") {
        // Night shift
        setAddShiftType("night");
        setAddShiftTimeMode("standard");
        setAddShiftStandardDayType("full");
      } else if (startTime === "07:00" && endTime === "19:00") {
        // Full day
        setAddShiftType("day");
        setAddShiftTimeMode("standard");
        setAddShiftStandardDayType("full");
      } else if (startTime === "07:00" && endTime === "13:00") {
        // Morning
        setAddShiftType("day");
        setAddShiftTimeMode("standard");
        setAddShiftStandardDayType("morning");
      } else if (startTime === "13:00" && endTime === "19:00") {
        // Afternoon
        setAddShiftType("day");
        setAddShiftTimeMode("standard");
        setAddShiftStandardDayType("afternoon");
      } else {
        // Custom times
        setAddShiftType("day");
        setAddShiftTimeMode("custom");
        setAddShiftCustomStartTime(startTime);
        setAddShiftCustomEndTime(endTime);
      }
    } else {
      // No times provided - default to day shift full
      setAddShiftType("day");
      setAddShiftTimeMode("standard");
      setAddShiftStandardDayType("full");
    }
    
    setAddShiftCustomStartTime(startTime || "07:00");
    setAddShiftCustomEndTime(endTime || "19:00");
  };
  
  // Handler voor daadwerkelijk toevoegen van shift (na dialog bevestiging)
  const handleConfirmAddShift = () => {
    if (!addShiftDate) return;
    
    let startTime = "";
    let endTime = "";
    let isSplitShift = false;
    
    // Bepaal start en end tijd op basis van mode en type
    if (addShiftTimeMode === "standard") {
      if (addShiftType === "day") {
        if (addShiftStandardDayType === "full") {
          startTime = "07:00";
          endTime = "19:00";
          isSplitShift = false;
        } else if (addShiftStandardDayType === "morning") {
          startTime = "07:00";
          endTime = "13:00";
          isSplitShift = true;
        } else if (addShiftStandardDayType === "afternoon") {
          startTime = "13:00";
          endTime = "19:00";
          isSplitShift = true;
        }
      } else {
        // night
        startTime = "19:00";
        endTime = "07:00";
        isSplitShift = false;
      }
    } else {
      // custom
      startTime = addShiftCustomStartTime;
      endTime = addShiftCustomEndTime;
      isSplitShift = true; // Custom shifts zijn altijd split shifts
    }
    
    addManualShiftMutation.mutate({ 
      date: addShiftDate, 
      startTime, 
      endTime, 
      userId: addShiftUserId,
      type: addShiftType,
      isSplitShift
    });
    
    setShowAddShiftDialog(false);
  };
  
  // Open edit dialog
  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setSelectedUserId(shift.userId);
    setForceAssignment(false);
    setShowForceOption(false);
    
    // Bepaal huidige shift mode op basis van isSplitShift en startTime
    if (shift.type === "day") {
      if (shift.isSplitShift && shift.startTime) {
        const startHour = formatInTimeZone(new Date(shift.startTime), 'Europe/Brussels', 'HH:mm');
        if (startHour === '07:00') {
          setSelectedShiftMode("morning");
        } else {
          setSelectedShiftMode("afternoon");
        }
      } else {
        setSelectedShiftMode("full");
      }
    } else {
      setSelectedShiftMode("full"); // Nacht is altijd full
    }
  };
  
  // Handle save
  const handleSaveShift = () => {
    if (editingShift) {
      // Bepaal of de shift mode is veranderd (alleen voor dag shifts)
      let shiftModeChanged = false;
      let newStartTime: string | undefined;
      let newEndTime: string | undefined;
      let newIsSplitShift: boolean | undefined;
      
      if (editingShift.type === "day") {
        // Bepaal huidige mode
        let currentMode: "full" | "morning" | "afternoon" = "full";
        if (editingShift.isSplitShift && editingShift.startTime) {
          const startHour = formatInTimeZone(new Date(editingShift.startTime), 'Europe/Brussels', 'HH:mm');
          currentMode = startHour === '07:00' ? "morning" : "afternoon";
        }
        
        if (currentMode !== selectedShiftMode) {
          shiftModeChanged = true;
          // Stel nieuwe tijden in gebaseerd op geselecteerde mode
          if (selectedShiftMode === "full") {
            newStartTime = "07:00";
            newEndTime = "19:00";
            newIsSplitShift = false;
          } else if (selectedShiftMode === "morning") {
            newStartTime = "07:00";
            newEndTime = "13:00";
            newIsSplitShift = true;
          } else { // afternoon
            newStartTime = "13:00";
            newEndTime = "19:00";
            newIsSplitShift = true;
          }
        }
      }
      
      updateShiftMutation.mutate({
        shiftId: editingShift.id,
        userId: selectedUserId,
        force: forceAssignment,
        startTime: shiftModeChanged ? newStartTime : undefined,
        endTime: shiftModeChanged ? newEndTime : undefined,
        isSplitShift: shiftModeChanged ? newIsSplitShift : undefined
      });
    }
  };
  
  // Handle remove from shift (voor zieke medewerkers)
  const handleRemoveFromShift = () => {
    if (editingShift && editingShift.userId > 0) {
      // Reset userId naar 0 en status naar "open"
      updateShiftMutation.mutate({
        shiftId: editingShift.id,
        userId: 0
      });
      
      // Toon een gespecialiseerde melding voor het verwijderen van een medewerker
      toast({
        title: "Medewerker verwijderd",
        description: "De medewerker is uit de shift verwijderd. De shift staat nu op 'Open'.",
        variant: "default",
      });
    }
  }

  const handleSplitShift = async () => {
    if (!editingShift || (editingShift.type !== "night" && editingShift.type !== "day") || editingShift.isSplitShift) return;
    
    try {
      const res = await apiRequest("POST", `/api/shifts/${editingShift.id}/split`, {});
      
      if (!res.ok) {
        throw new Error("Kon shift niet splitsen");
      }
      
      const splitDescription = editingShift.type === "night" 
        ? "De nachtshift is opgesplitst in twee halve shifts (19:00-23:00 en 23:00-07:00)"
        : "De dagshift is opgesplitst in twee halve shifts (07:00-13:00 en 13:00-19:00)";
      
      toast({
        title: "Shift gesplitst",
        description: splitDescription,
      });
      
      setEditingShift(null);
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedMonth + 1, selectedYear, effectiveStationId] });
    } catch (error) {
      toast({
        title: "Fout bij splitsen",
        description: "Er ging iets mis bij het splitsen van de shift",
        variant: "destructive",
      });
    }
  }

  // Helper functie om Verdi sync status voor een shift op te halen
  const getVerdiSyncStatus = (shiftId: number) => {
    const syncLog = verdiSyncStatus.find((log: any) => log.shiftId === shiftId);
    return syncLog || null;
  };

  // Maanden voor de select box
  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maart" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Augustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  // Jaren voor de select box
  const years = [selectedYear - 1, selectedYear, selectedYear + 1];

  // Access guard voor niet-geautoriseerde gebruikers
  if (!user || (user.role !== 'admin' && user.role !== 'supervisor' && user.role !== 'ambulancier')) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Planning Generator</h1>
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Je hebt geen toegang tot deze pagina. Je moet ingelogd zijn om planningen te bekijken.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state voor admins terwijl stations worden geladen
  if (user.role === 'admin' && isLoadingStations) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Planning Generator</h1>
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
              <span>Stations laden...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guard voor supervisors: vereist station selectie
  if (user.role === 'supervisor' && !selectedStationId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Planning Generator</h1>
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Kies een station</h2>
          <p className="text-muted-foreground mb-4">
            Selecteer eerst een station om planningen te beheren.
          </p>
          
          <div className="max-w-xs">
            <Label htmlFor="station-select" className="text-sm font-medium">
              Station
            </Label>
            <Select 
              value={selectedStationId?.toString() || ""} 
              onValueChange={(value) => handleStationChange(parseInt(value))}
            >
              <SelectTrigger className="mt-1" data-testid="select-station">
                <SelectValue placeholder="Kies station..." />
              </SelectTrigger>
              <SelectContent>
                {(stations as Station[])
                  ?.filter(station => station.code !== 'supervisor') // Filter supervisor station
                  ?.map((station) => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.displayName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Kies een station om verder te gaan</h3>
              <p className="text-muted-foreground">
                Selecteer eerst een station om planningen te kunnen genereren en beheren.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Planning Generator</h1>
          
          {/* Station selector voor supervisors en multi-station admins */}
          {(user?.role === 'supervisor' || isMultiStationAdmin) && (
            <div className="mt-4">
              <Label htmlFor="station-select" className="text-sm font-medium">
                Station
              </Label>
              <Select 
                value={(selectedStationId || effectiveStationId)?.toString() || ""} 
                onValueChange={(value) => handleStationChange(parseInt(value))}
              >
                <SelectTrigger className="w-[200px] mt-1" data-testid="select-station">
                  <SelectValue placeholder="Kies station..." />
                </SelectTrigger>
                <SelectContent>
                  {(stations as Station[])
                    ?.filter(station => station.code !== 'supervisor') // Filter supervisor station
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
        
        <Button
          variant="outline"
          onClick={() => setLocation("/dashboard")}
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Genereer Planning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                  Planning periode
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-28 text-center">
                    {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
                  </span>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Testdata genereren */}
              <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Test Voorkeuren Genereren
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Genereer willekeurige voorkeuren voor alle gebruikers voor de geselecteerde maand om de planning tool te testen.
                </p>
                
                {lastGeneratedTimestamp && (
                  <div className="flex items-center text-xs text-gray-500 mt-1 mb-2">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>Laatst gegenereerd: {lastGeneratedTimestamp.formattedTimestamp}</span>
                  </div>
                )}
                
                {isGeneratingTestPreferences && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Voortgang</span>
                      <span>{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} className="w-full" />
                    {progressMessage && (
                      <p className="text-xs text-muted-foreground mt-1">{progressMessage}</p>
                    )}
                  </div>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={isGeneratingTestPreferences}
                    >
                      {isGeneratingTestPreferences ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Bezig met genereren...
                        </>
                      ) : (
                        "Genereer Test Voorkeuren"
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Test Voorkeuren Genereren</AlertDialogTitle>
                      <AlertDialogDescription>
                        <div className="space-y-4">
                          <p>
                            Weet u zeker dat u test voorkeuren wilt genereren voor <strong>{format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}</strong>?
                          </p>
                          
                          <div className="p-3 bg-red-50 border border-red-200 rounded">
                            <span className="text-red-600 font-medium">⚠️ Dit overschrijft alle bestaande voorkeuren voor deze maand!</span>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="test-password">Voer het wachtwoord in om door te gaan:</Label>
                            <Input
                              id="test-password"
                              type="password"
                              value={testPassword}
                              onChange={(e) => setTestPassword(e.target.value)}
                              placeholder="Wachtwoord vereist"
                              className="w-full"
                            />
                          </div>
                          
                          <p className="text-sm text-gray-600">
                            Er worden willekeurige voorkeuren aangemaakt voor alle gebruikers om de planning tool te testen.
                          </p>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setTestPassword("")}>
                        Annuleren
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={testPassword !== "Jeroen0143."}
                        onClick={async () => {
                          // Valideer wachtwoord
                          if (testPassword !== "Jeroen0143.") {
                            toast({
                              title: "Onjuist wachtwoord",
                              description: "Het ingevoerde wachtwoord is onjuist.",
                              variant: "destructive",
                            });
                            return;
                          }
                          let pollInterval: NodeJS.Timeout | null = null;
                          try {
                            setIsGeneratingTestPreferences(true);
                            setProgressPercentage(0);
                            setProgressMessage("Starten van voorkeurengeneratie...");
                            
                            // Start polling voor voortgang
                            pollInterval = setInterval(async () => {
                              try {
                                const progressRes = await fetch('/api/preferences/progress');
                                if (progressRes.ok) {
                                  const progressData = await progressRes.json();
                                  setProgressPercentage(progressData.percentage || 0);
                                  setProgressMessage(progressData.message || "");
                                  
                                  if (progressData.percentage >= 100) {
                                    if (pollInterval) clearInterval(pollInterval);
                                  }
                                }
                              } catch (error) {
                                // Stille fout - polling mag niet het hoofdproces verstoren
                              }
                            }, 1000);
                            
                            const res = await apiRequest("POST", "/api/preferences/generate-test-data", {
                              month: selectedMonth + 1,
                              year: selectedYear
                            });
                            
                            if (!res.ok) {
                              throw new Error("Kon test data niet genereren");
                            }
                            
                            const data = await res.json();
                            toast({
                              title: "Test Data Gegenereerd",
                              description: data.message,
                            });
                            
                            // Ververs de gegevens
                            refetchPreferences();
                            
                            // Stop polling
                            if (pollInterval) clearInterval(pollInterval);
                            
                            // Vernieuw ook de tijdstempel voor de huidige maand
                            queryClient.invalidateQueries({ queryKey: ["/api/system/settings/last-preferences-generated", selectedMonth + 1, selectedYear, effectiveStationId] });
                          } catch (error) {
                            // Stop polling bij fout
                            if (pollInterval) clearInterval(pollInterval);
                            toast({
                              title: "Fout",
                              description: error instanceof Error ? error.message : "Onbekende fout bij genereren testdata",
                              variant: "destructive",
                            });
                          } finally {
                            setIsGeneratingTestPreferences(false);
                            setProgressPercentage(0);
                            setProgressMessage("");
                            setTestPassword(""); // Reset wachtwoord na gebruik
                          }
                        }}
                      >
                        Genereer Test Voorkeuren
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Voorkeuren verwijderen */}
              <div className="mt-4 p-4 border border-orange-100 rounded-md bg-orange-50">
                <h3 className="font-semibold mb-2 flex items-center text-orange-800">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Voorkeuren Verwijderen
                </h3>
                <p className="text-sm text-orange-800 mb-4">
                  Verwijder alle opgegeven voorkeuren voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-orange-300 bg-orange-100 text-orange-900 hover:bg-orange-200"
                      disabled={isDeletingPreferences}
                    >
                      {isDeletingPreferences ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Bezig met verwijderen...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Verwijder Voorkeuren
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Voorkeuren Verwijderen</AlertDialogTitle>
                      <AlertDialogDescription>
                        <div className="space-y-4">
                          <p>
                            Weet u zeker dat u alle voorkeuren wilt verwijderen voor <strong>{format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}</strong>?
                          </p>
                          
                          <div className="p-3 bg-red-50 border border-red-200 rounded">
                            <span className="text-red-600 font-medium">⚠️ Dit verwijdert ALLE opgegeven voorkeuren van alle gebruikers voor deze maand!</span>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="delete-preferences-password">Voer het wachtwoord in om door te gaan:</Label>
                            <Input
                              id="delete-preferences-password"
                              type="password"
                              value={deletePreferencesPassword}
                              onChange={(e) => setDeletePreferencesPassword(e.target.value)}
                              placeholder="Wachtwoord vereist"
                              className="w-full"
                            />
                          </div>
                          
                          <p className="text-sm text-gray-600">
                            Deze actie kan niet ongedaan worden gemaakt. Gebruikers moeten opnieuw hun voorkeuren opgeven.
                          </p>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeletePreferencesPassword("")}>
                        Annuleren
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={deletePreferencesPassword !== "Jeroen0143."}
                        className="bg-red-600 hover:bg-red-700"
                        onClick={async () => {
                          // Valideer wachtwoord
                          if (deletePreferencesPassword !== "Jeroen0143.") {
                            toast({
                              title: "Onjuist wachtwoord",
                              description: "Het ingevoerde wachtwoord is onjuist.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          try {
                            setIsDeletingPreferences(true);
                            
                            const res = await apiRequest("POST", "/api/preferences/delete-month", {
                              month: selectedMonth + 1,
                              year: selectedYear,
                              password: deletePreferencesPassword
                            });
                            
                            if (!res.ok) {
                              const error = await res.json();
                              throw new Error(error.message || "Kon voorkeuren niet verwijderen");
                            }
                            
                            const data = await res.json();
                            toast({
                              title: "Voorkeuren Verwijderd",
                              description: data.message,
                            });
                            
                            // Ververs de gegevens
                            refetchPreferences();
                            
                            // Vernieuw ook de tijdstempel voor de huidige maand
                            queryClient.invalidateQueries({ queryKey: ["/api/system/settings/last-preferences-generated", selectedMonth + 1, selectedYear, effectiveStationId] });
                          } catch (error) {
                            toast({
                              title: "Fout",
                              description: error instanceof Error ? error.message : "Onbekende fout bij verwijderen voorkeuren",
                              variant: "destructive",
                            });
                          } finally {
                            setIsDeletingPreferences(false);
                            setDeletePreferencesPassword(""); // Reset wachtwoord na gebruik
                          }
                        }}
                      >
                        Verwijder Voorkeuren
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="mt-4 p-4 border border-red-100 rounded-md bg-red-50">
                <h3 className="font-semibold mb-2 flex items-center text-red-800">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Planning Verwijderen
                </h3>
                <p className="text-sm text-red-800 mb-4">
                  Verwijder alle planning voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
                </p>
                
                {isDeletingSchedule && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Voortgang</span>
                      <span>{deleteProgressPercentage}%</span>
                    </div>
                    <Progress value={deleteProgressPercentage} className="w-full" />
                    {deleteProgressMessage && (
                      <p className="text-xs text-muted-foreground mt-1">{deleteProgressMessage}</p>
                    )}
                  </div>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-red-300 bg-red-100 text-red-900 hover:bg-red-200"
                      disabled={deleteMonthShiftsMutation.isPending}
                    >
                      {deleteMonthShiftsMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Bezig met verwijderen...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Planning Verwijderen
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Planning Verwijderen</AlertDialogTitle>
                      <AlertDialogDescription>
                        Weet u zeker dat u de volledige planning voor <strong>{format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}</strong> wilt verwijderen?
                        <br /><br />
                        <span className="text-red-600 font-medium">⚠️ Deze actie kan niet ongedaan worden gemaakt!</span>
                        <br /><br />
                        Alle geplande shifts voor deze maand worden permanent verwijderd.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          setIsDeletingSchedule(true);
                          setDeleteProgressPercentage(0);
                          setDeleteProgressMessage("Planning verwijderen...");
                          
                          // Start polling voor voortgang
                          const deleteInterval = setInterval(async () => {
                            try {
                              const progressRes = await fetch('/api/schedule/delete-progress');
                              if (progressRes.ok) {
                                const progressData = await progressRes.json();
                                setDeleteProgressPercentage(progressData.percentage || 0);
                                setDeleteProgressMessage(progressData.message || "");
                                
                                if (progressData.percentage >= 100) {
                                  clearInterval(deleteInterval);
                                }
                              }
                            } catch (error) {
                              // Stille fout - polling mag niet het hoofdproces verstoren
                            }
                          }, 500);
                          
                          deleteMonthShiftsMutation.mutate(undefined, {
                            onSettled: () => {
                              clearInterval(deleteInterval);
                              setIsDeletingSchedule(false);
                              setDeleteProgressPercentage(0);
                              setDeleteProgressMessage("");
                            }
                          });
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Planning Verwijderen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>



              {isGeneratingSchedule && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Voortgang</span>
                    <span>{generateProgressPercentage}%</span>
                  </div>
                  <Progress value={generateProgressPercentage} className="w-full" />
                  {generateProgressMessage && (
                    <p className="text-xs text-muted-foreground mt-1">{generateProgressMessage}</p>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center mt-6">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">
                    Planning voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
                  </span>
                  {lastScheduleTimestamp && (
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Laatst gegenereerd: {lastScheduleTimestamp.formattedTimestamp}</span>
                    </div>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={generateScheduleMutation.isPending}
                    >
                      {generateScheduleMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Bezig met genereren...
                        </>
                      ) : (
                        <>
                          <CalendarDays className="h-4 w-4 mr-2" />
                          Genereer Planning
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Planning Genereren</AlertDialogTitle>
                      <AlertDialogDescription>
                        Weet u zeker dat u een nieuwe planning wilt genereren voor <strong>{format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}</strong>?
                        <br /><br />
                        <span className="text-orange-600 font-medium">⚠️ Dit overschrijft de bestaande planning voor deze maand!</span>
                        <br /><br />
                        Er wordt een nieuwe planning gemaakt op basis van de beschikbaarheden en voorkeuren van alle medewerkers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          setIsGeneratingSchedule(true);
                          setGenerateProgressPercentage(0);
                          setGenerateProgressMessage("Planning genereren...");
                          
                          // Start polling voor voortgang
                          const generateInterval = setInterval(async () => {
                            try {
                              const progressRes = await fetch('/api/schedule/generate-progress');
                              if (progressRes.ok) {
                                const progressData = await progressRes.json();
                                setGenerateProgressPercentage(progressData.percentage || 0);
                                setGenerateProgressMessage(progressData.message || "");
                                
                                if (progressData.percentage >= 100) {
                                  clearInterval(generateInterval);
                                }
                              }
                            } catch (error) {
                              // Stille fout - polling mag niet het hoofdproces verstoren
                            }
                          }, 500);
                          
                          generateScheduleMutation.mutate(undefined, {
                            onSettled: () => {
                              clearInterval(generateInterval);
                              setIsGeneratingSchedule(false);
                              setGenerateProgressPercentage(0);
                              setGenerateProgressMessage("");
                            }
                          });
                        }}
                      >
                        Genereer Planning
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              {/* Publicatie Status Banner en Knoppen */}
              {planningStatus?.hasShifts && (
                <div className="mt-6 border-t pt-6">
                  {planningStatus.isPublished ? (
                    <Alert className="bg-green-50 border-green-200">
                      <Check className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <div className="flex justify-between items-center">
                          <div>
                            <strong>Planning gepubliceerd</strong>
                            <p className="text-sm mt-1">
                              Deze planning is zichtbaar voor medewerkers.
                              {planningStatus.publishedAt && (
                                <span className="ml-1">
                                  (Gepubliceerd op {format(new Date(planningStatus.publishedAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })})
                                </span>
                              )}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unpublishPlanningMutation.mutate()}
                            disabled={unpublishPlanningMutation.isPending}
                            className="border-green-300 text-green-700 hover:bg-green-100"
                          >
                            {unpublishPlanningMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Intrekken"
                            )}
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <div className="flex justify-between items-center">
                          <div>
                            <strong>Planning nog niet gepubliceerd</strong>
                            <p className="text-sm mt-1">
                              Medewerkers kunnen deze planning nog niet zien. 
                              Maak eventuele aanpassingen en publiceer de planning wanneer deze gereed is.
                            </p>
                          </div>
                          <Button
                            onClick={() => publishPlanningMutation.mutate()}
                            disabled={publishPlanningMutation.isPending}
                            className="bg-amber-600 hover:bg-amber-700"
                          >
                            {publishPlanningMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Publiceren...
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Planning Publiceren
                              </>
                            )}
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Beschikbaarheid Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>Overzicht van geplande uren per medewerker voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Medewerker</TableHead>
                  <TableHead className="text-center">Ingepland</TableHead>
                  <TableHead className="text-center">Weekdagen</TableHead>
                  <TableHead className="text-center">Weekend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const scheduledHours = countUserShiftsHours(user.id);
                  // CROSS-TEAM FIX: Gebruik effectiveHours voor cross-team users, anders user.hours
                  const totalHours = (user as any).effectiveHours ?? user.hours ?? 0;
                  const percentage = totalHours > 0 ? Math.round((scheduledHours / totalHours) * 100) : 0;
                  const isCrossTeam = (user as any).isCrossTeam === true;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-medium text-left hover:underline"
                          onClick={() => {
                            setSelectedContactUser(user);
                            setShowContactDialog(true);
                          }}
                        >
                          {`${user.firstName} ${user.lastName}`}
                          {isCrossTeam && <span className="ml-1 text-xs text-muted-foreground">(cross-team)</span>}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">{`${scheduledHours} / ${totalHours} (${percentage}%)`}</TableCell>
                      <TableCell className="text-center">{countUserWeekdayShiftHours(user.id)}</TableCell>
                      <TableCell className="text-center">{countUserWeekendShiftHours(user.id)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Gegenereerde Planning</CardTitle>
                {lastGeneratedDate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Gegenereerd op: {format(lastGeneratedDate, "dd-MM-yyyy HH:mm:ss")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
                </span>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddShiftDate(null);
                    setAddShiftType("day");
                    setAddShiftTimeMode("standard");
                    setAddShiftStandardDayType("full");
                    setAddShiftCustomStartTime("07:00");
                    setAddShiftCustomEndTime("19:00");
                    setAddShiftUserId(0);
                    setShowAddShiftDialog(true);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Shift Toevoegen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const timestamp = Date.now();
                    const stationParam = effectiveStationId ? `&stationId=${effectiveStationId}` : '';
                    const url = `/api/schedule/export-xlsx?month=${selectedMonth + 1}&year=${selectedYear}${stationParam}&t=${timestamp}`;
                    window.location.href = url;
                  }}
                  disabled={!shifts || shifts.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Planning
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!shifts || shifts.length === 0 || syncToVerdiMutation.isPending}
                      className={
                        verdiPendingChanges?.hasPendingChanges 
                          ? "bg-red-500 hover:bg-red-600 text-white border-red-600" 
                          : shifts && shifts.length > 0 && verdiPendingChanges && !verdiPendingChanges.hasPendingChanges
                          ? "bg-green-500 hover:bg-green-600 text-white border-green-600"
                          : ""
                      }
                      title={
                        verdiPendingChanges?.hasPendingChanges
                          ? `${verdiPendingChanges.newShifts} nieuwe en ${verdiPendingChanges.modifiedShifts} gewijzigde shifts - klik om te syncen`
                          : shifts && shifts.length > 0 && verdiPendingChanges && !verdiPendingChanges.hasPendingChanges
                          ? "Alles gesynchroniseerd - geen wijzigingen"
                          : "Verdi synchronisatie"
                      }
                    >
                      {syncToVerdiMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Synchroniseren...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Sync naar Verdi
                          {verdiPendingChanges?.hasPendingChanges && (
                            <span className="ml-1 text-xs font-semibold">
                              ({verdiPendingChanges.newShifts + verdiPendingChanges.modifiedShifts})
                            </span>
                          )}
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Synchroniseren naar Verdi</AlertDialogTitle>
                      <AlertDialogDescription>
                        Wilt u de planning voor <strong>{format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}</strong> synchroniseren naar Verdi?
                        <br /><br />
                        <strong>Alle shifts</strong>: Synchroniseert alle shifts opnieuw
                        <br />
                        <strong>Alleen wijzigingen</strong>: Synchroniseert alleen nieuwe of aangepaste shifts
                        {lastVerdiSync?.lastSync && (
                          <>
                            <br />
                            <span className="text-sm text-muted-foreground">
                              Laatste sync: {format(new Date(lastVerdiSync.lastSync), "d MMMM yyyy, HH:mm", { locale: nl })}
                            </span>
                          </>
                        )}
                        {!lastVerdiSync?.lastSync && (
                          <>
                            <br />
                            <span className="text-sm text-muted-foreground">
                              Laatste sync: Nog niet gesynchroniseerd
                            </span>
                          </>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => syncToVerdiMutation.mutate(false)}
                      >
                        Alle shifts
                      </AlertDialogAction>
                      <AlertDialogAction
                        onClick={() => syncToVerdiMutation.mutate(true)}
                      >
                        Alleen wijzigingen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                </svg>
              </div>
              <input 
                type="search" 
                id="search-ambulancier" 
                className="block w-full p-3 ps-10 text-sm border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Zoek op naam van medewerker..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {shifts.filter(shift => {
              // TIMEZONE FIX: Gebruik toCalendarDate voor shifts (23:00 UTC → volgende dag)
              const shiftYMD = toShiftCalendarDate(shift.date);
              const shiftYear = parseInt(shiftYMD.substring(0, 4));
              const shiftMonth = parseInt(shiftYMD.substring(5, 7)) - 1;
              return shiftMonth === selectedMonth && shiftYear === selectedYear;
            }).length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto pr-2">
              <Table>
                <TableCaption>Planning voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}</TableCaption>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tijd</TableHead>
                    <TableHead>Medewerker</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts
                    .filter(shift => {
                      // TIMEZONE FIX: Gebruik toCalendarDate voor shifts (23:00 UTC → volgende dag)
                      const shiftYMD = toShiftCalendarDate(shift.date);
                      const shiftYear = parseInt(shiftYMD.substring(0, 4));
                      const shiftMonth = parseInt(shiftYMD.substring(5, 7)) - 1;
                      return shiftMonth === selectedMonth && shiftYear === selectedYear;
                    })
                    .sort((a, b) => {
                      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                      if (dateComparison !== 0) return dateComparison;
                      if (a.type === 'day' && b.type === 'night') return -1;
                      if (a.type === 'night' && b.type === 'day') return 1;
                      return 0;
                    })
                    .map((shift) => {
                      // Check for cross-station emergency assignment first, then local users
                      const emergencyUser = (shift as any).emergencyAssignedUser;
                      const shiftUser = emergencyUser ? {
                        id: emergencyUser.id,
                        firstName: emergencyUser.firstName,
                        lastName: emergencyUser.lastName,
                        stationId: emergencyUser.stationId,
                        stationName: emergencyUser.stationName
                      } : users.find(u => u.id === shift.userId);
                      const isCurrentUserShift = shift.userId === user?.id;
                      const isUserDeleted = shift.userId > 0 && !shiftUser && !emergencyUser;
                      
                      // Detecteer open slots voor deze datum
                      const shiftsForDate = shifts.filter(s => 
                        format(new Date(s.date), 'yyyy-MM-dd') === format(new Date(shift.date), 'yyyy-MM-dd')
                      );
                      
                      const results = [];
                      
                      // Add the regular shift row
                      results.push(
                        <TableRow 
                          key={shift.id}
                          className={`${shift.status === "open" || isUserDeleted ? "bg-red-50" : ""} ${isCurrentUserShift ? "bg-green-50" : ""}`}
                        >
                          <TableCell>
                            <button 
                              className="hover:underline text-left"
                              onClick={() => {
                                setSelectedDate(new Date(shift.date));
                                setShowAvailabilityDialog(true);
                              }}
                            >
                              {format(new Date(shift.date), "dd MMMM (EEEE)", { locale: nl })}
                            </button>
                          </TableCell>
                          <TableCell>{shift.type === "day" ? "Dag" : "Nacht"}</TableCell>
                          <TableCell>
                            {(() => {
                              // Hard-coded tijden op basis van shift type en split info
                              if (shift.type === "day") {
                                if (shift.isSplitShift && shift.startTime && shift.endTime) {
                                  // Bepaal of het eerste of tweede helft is op basis van start tijd (UTC - want tijden worden als UTC opgeslagen)
                                  const startHour = new Date(shift.startTime).getUTCHours();
                                  if (startHour === 7) return "07:00 - 13:00";
                                  if (startHour === 13) return "13:00 - 19:00";
                                }
                                return "07:00 - 19:00"; // Volledige dagshift
                              } else {
                                // Nachtshift is altijd volledig
                                return "19:00 - 07:00";
                              }
                            })()}
                            {shift.isSplitShift && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Gesplitst
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {shift.status === "open" || isUserDeleted ? (
                              <div className="flex items-center gap-2">
                                <span className="text-red-500 font-medium">
                                  {shift.status === "open" ? "Niet ingevuld" : "Medewerker verwijderd"}
                                </span>
                                {shift.status === "open" && bidCounts[shift.id] > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200"
                                    onClick={() => {
                                      setSelectedBidShift(shift);
                                      setShowBidsDialog(true);
                                    }}
                                  >
                                    <Users className="h-3 w-3 mr-1" />
                                    {bidCounts[shift.id]} {bidCounts[shift.id] === 1 ? 'bieding' : 'biedingen'}
                                  </Button>
                                )}
                              </div>
                            ) : shiftUser ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                  variant="link"
                                  className={`p-0 h-auto font-normal text-left hover:underline 
                                    ${isCurrentUserShift ? "font-bold text-green-600" : ""} 
                                    ${searchTerm && 
                                      (shiftUser.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                       shiftUser.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       (shiftUser as any).username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       `${shiftUser.firstName} ${shiftUser.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
                                       ? "bg-green-200 px-1 py-0.5 rounded font-medium" : ""}`}
                                  onClick={() => {
                                    if (!emergencyUser) {
                                      setSelectedContactUser(shiftUser as any);
                                      setShowContactDialog(true);
                                    }
                                  }}
                                >
                                  {`${shiftUser.firstName} ${shiftUser.lastName}`}
                                </Button>
                                {shift.isEmergencyScheduling && (
                                  <span 
                                    className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded flex items-center gap-1" 
                                    title={`Noodinplanning${emergencyUser?.stationName ? ` (van ${emergencyUser.stationName})` : ''}${shift.emergencyReason ? `: ${shift.emergencyReason}` : ''}`}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    Nood
                                    {emergencyUser?.stationName && (
                                      <span className="text-orange-600">({emergencyUser.stationName})</span>
                                    )}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span>Onbekend</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center">
                                  {shift.status === "planned" && !isUserDeleted ? (
                                    <Check className="h-4 w-4 text-green-500 mr-1" />
                                  ) : (shift.status === "open" || isUserDeleted) ? (
                                    <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                                  ) : null}
                                  {shift.status === "open" ? "Open" : isUserDeleted ? "Herinplannen nodig" : "Ingepland"}
                                </div>
                                {(() => {
                                  const syncStatus = getVerdiSyncStatus(shift.id);
                                  if (!syncStatus) return null;
                                  
                                  // Check of shift is gewijzigd na de laatste sync (needs resync)
                                  const shiftUpdatedAt = shift.updatedAt ? new Date(shift.updatedAt) : null;
                                  const syncUpdatedAt = syncStatus.updatedAt ? new Date(syncStatus.updatedAt) : null;
                                  const needsResync = syncStatus.syncStatus === 'success' && 
                                    shiftUpdatedAt && syncUpdatedAt && shiftUpdatedAt > syncUpdatedAt;
                                  
                                  const statusColors = {
                                    success: "bg-green-500",
                                    error: "bg-red-500",
                                    pending: "bg-gray-400",
                                    needs_resync: "bg-orange-500"
                                  };
                                  
                                  const statusLabels = {
                                    success: "Verdi sync OK",
                                    error: "Verdi sync fout",
                                    pending: "Verdi sync pending",
                                    needs_resync: "Shift gewijzigd - opnieuw synchroniseren nodig"
                                  };
                                  
                                  const effectiveStatus = needsResync ? 'needs_resync' : syncStatus.syncStatus;
                                  
                                  return (
                                    <Badge 
                                      variant="outline" 
                                      className={`${statusColors[effectiveStatus as keyof typeof statusColors]} text-white border-none text-xs`}
                                      title={syncStatus.errorMessage || statusLabels[effectiveStatus as keyof typeof statusLabels]}
                                    >
                                      <LinkIcon className="h-3 w-3" />
                                    </Badge>
                                  );
                                })()}
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditShift(shift)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                      
                      return results;
                    }).flat()}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Er zijn nog geen shifts gegenereerd voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Add Shift Dialog */}
      <Dialog open={showAddShiftDialog} onOpenChange={setShowAddShiftDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Shift Toevoegen</DialogTitle>
            <DialogDescription>
              {addShiftDate 
                ? `Voeg een nieuwe shift toe voor ${format(addShiftDate, "dd MMMM yyyy", { locale: nl })}`
                : "Selecteer een datum en voeg een nieuwe shift toe"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Datum Selectie */}
            <div className="grid gap-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={addShiftDate ? format(addShiftDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setAddShiftDate(parseISO(e.target.value));
                  } else {
                    setAddShiftDate(null);
                  }
                }}
                min={format(new Date(selectedYear, selectedMonth, 1), "yyyy-MM-dd")}
                max={format(new Date(selectedYear, selectedMonth + 1, 0), "yyyy-MM-dd")}
              />
            </div>

            {/* Shift Type Selectie */}
            <div className="grid gap-2">
              <Label>Shift Type</Label>
              <Select value={addShiftType} onValueChange={(value: "day" | "night") => setAddShiftType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dagshift</SelectItem>
                  <SelectItem value="night">Nachtshift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Tijd Mode Selectie */}
            <div className="grid gap-2">
              <Label>Tijden</Label>
              <Select value={addShiftTimeMode} onValueChange={(value: "standard" | "custom") => setAddShiftTimeMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standaard tijden</SelectItem>
                  <SelectItem value="custom">Custom tijden (noodgeval)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Standaard Dag Type (alleen voor dagshift met standaard tijden) */}
            {addShiftTimeMode === "standard" && addShiftType === "day" && (
              <div className="grid gap-2">
                <Label>Dagshift Variatie</Label>
                <Select value={addShiftStandardDayType} onValueChange={(value: "full" | "morning" | "afternoon") => setAddShiftStandardDayType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Volledige dag (07:00 - 19:00)</SelectItem>
                    <SelectItem value="morning">Voormiddag (07:00 - 13:00)</SelectItem>
                    <SelectItem value="afternoon">Namiddag (13:00 - 19:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Standaard Tijden Preview */}
            {addShiftTimeMode === "standard" && (
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  {addShiftType === "night" && "Nachtshift: 19:00 - 07:00"}
                  {addShiftType === "day" && addShiftStandardDayType === "full" && "Dagshift: 07:00 - 19:00"}
                  {addShiftType === "day" && addShiftStandardDayType === "morning" && "Voormiddag: 07:00 - 13:00"}
                  {addShiftType === "day" && addShiftStandardDayType === "afternoon" && "Namiddag: 13:00 - 19:00"}
                </p>
              </div>
            )}
            
            {/* Custom Tijd Pickers */}
            {addShiftTimeMode === "custom" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-time">Start Tijd</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={addShiftCustomStartTime}
                      onChange={(e) => setAddShiftCustomStartTime(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-time">Eind Tijd</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={addShiftCustomEndTime}
                      onChange={(e) => setAddShiftCustomEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-md border border-amber-200">
                  <p className="text-sm text-amber-900">
                    <strong>Let op:</strong> Custom tijden zijn bedoeld voor noodgevallen. Voor reguliere shifts gebruik standaard tijden.
                  </p>
                </div>
              </>
            )}
            
            {/* Ambulancier Toewijzing */}
            <div className="grid gap-2">
              <Label>Toewijzing</Label>
              <Select value={addShiftUserId.toString()} onValueChange={(value) => setAddShiftUserId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Open Shift (niet toegewezen)</SelectItem>
                  {users
                    .filter(u => u.role === "ambulancier" || u.role === "admin")
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {`${user.firstName} ${user.lastName}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddShiftDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handleConfirmAddShift} disabled={!addShiftDate}>
              Shift Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Shift Dialog */}
      <Dialog open={!!editingShift} onOpenChange={(open) => { if (!open) { setEditingShift(null); setShowDeleteConfirm(false); }}}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Shift Bewerken</DialogTitle>
            <DialogDescription>
              Pas de toewijzing voor deze shift aan.
            </DialogDescription>
          </DialogHeader>
          
          {editingShift && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Datum</Label>
                <div className="p-2 border rounded-md bg-gray-50">
                  {format(new Date(editingShift.date), "dd MMMM yyyy", { locale: nl })}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="shift-type">Type Shift</Label>
                {editingShift.type === "day" ? (
                  <Select
                    value={selectedShiftMode}
                    onValueChange={(value: "full" | "morning" | "afternoon") => setSelectedShiftMode(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Dag (07:00-19:00)</SelectItem>
                      <SelectItem value="morning">Dag (voormiddag) (07:00-13:00)</SelectItem>
                      <SelectItem value="afternoon">Dag (namiddag) (13:00-19:00)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 border rounded-md bg-gray-50">
                    Nacht (19:00-07:00)
                  </div>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="ambulancier">Ambulancier</Label>
                <Select
                  value={selectedUserId.toString()}
                  onValueChange={(value) => {
                    setSelectedUserId(parseInt(value));
                    setShowForceOption(false);
                    setForceAssignment(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer ambulancier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">-- Niet toegewezen --</SelectItem>
                    {users
                      .filter(u => u.role === "ambulancier" || u.role === "admin")
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {`${user.firstName} ${user.lastName}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              {showForceOption && (
                <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <Checkbox
                    id="force-assignment"
                    checked={forceAssignment}
                    onCheckedChange={(checked) => setForceAssignment(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="force-assignment"
                      className="text-sm font-medium text-orange-800 cursor-pointer"
                    >
                      Forceer toewijzing (noodgeval)
                    </Label>
                    <p className="text-xs text-orange-600">
                      Gebruik dit alleen in noodgevallen. Normale restricties worden genegeerd.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!showDeleteConfirm ? (
            <>
              {/* Geavanceerde opties - subtiele weergave */}
              {editingShift && (editingShift.type === "night" || editingShift.type === "day") && (
                <div className="border-t pt-4 mt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!editingShift.isSplitShift && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={handleSplitShift}
                        disabled={updateShiftMutation.isPending}
                      >
                        <Split className="h-4 w-4 mr-1.5" />
                        Splitsen
                      </Button>
                    )}
                    
                    {user?.role === 'supervisor' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={() => {
                          setEmergencyShift(editingShift);
                          setShowEmergencyDialog(true);
                        }}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1.5" />
                        Noodinplanning
                      </Button>
                    )}
                    
                    {editingShift.userId > 0 && (
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={handleRemoveFromShift}
                        disabled={updateShiftMutation.isPending}
                      >
                        <UserMinus className="h-4 w-4 mr-1.5" />
                        Ambulancier verwijderen
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={updateShiftMutation.isPending || deleteShiftMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Shift verwijderen
                    </Button>
                  </div>
                </div>
              )}
              
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setEditingShift(null)}>
                  Annuleren
                </Button>
                <Button 
                  onClick={handleSaveShift}
                  disabled={updateShiftMutation.isPending}
                >
                  {updateShiftMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opslaan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Opslaan
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="mt-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                <div className="flex items-center gap-2 text-red-800 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Weet je zeker dat je deze shift wilt verwijderen?
                </div>
                <p className="text-sm text-red-600">
                  Deze actie kan niet ongedaan worden gemaakt.
                </p>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteShiftMutation.isPending}
                >
                  Annuleren
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => editingShift && deleteShiftMutation.mutate(editingShift.id)}
                  disabled={deleteShiftMutation.isPending}
                >
                  {deleteShiftMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verwijderen...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Ja, verwijder
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Beschikbaarheidsvenster */}
      <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Beschikbaarheid voor {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: nl }) : ""}
            </DialogTitle>
            <DialogDescription>
              Overzicht van wie beschikbaar is voor deze shift
            </DialogDescription>
          </DialogHeader>
          
          {selectedDate && (
            <>
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="outline" className="py-1.5">
                  {selectedDate && isWeekend(selectedDate) ? "Weekend" : "Weekdag"}
                </Badge>
              </div>
              
              <div className="space-y-6">
                {/* Dag shift (altijd tonen - zowel weekdag als weekend) */}
                {selectedDate && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Dag Shift (07:00 - 19:00)</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Naam</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ingepland</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getUsersAvailableForDate(selectedDate, "day").map((u) => (
                            <TableRow key={u.userId}>
                              <TableCell>
                                <div className="font-medium">{`${u.firstName} ${u.lastName}`}</div>
                              </TableCell>
                              <TableCell>
                                {u.isAssigned ? (
                                  <Badge className="bg-blue-500 hover:bg-blue-600">Toegewezen</Badge>
                                ) : u.isAssignedElsewhere ? (
                                  <Badge variant="outline" className="text-purple-600 border-purple-600 bg-purple-50">Ingepland elders</Badge>
                                ) : u.isAvailable ? (
                                  <Badge className="bg-green-500 hover:bg-green-600">Beschikbaar</Badge>
                                ) : u.hasNoPreference ? (
                                  <Badge variant="outline" className="text-orange-500 border-orange-500">Geen voorkeur</Badge>
                                ) : u.hours === 0 ? (
                                  <Badge variant="outline" className="text-gray-500">Werkt geen uren</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-red-500">Niet beschikbaar</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span>{u.scheduledHours}</span>
                                  {u.hours > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      / {u.hours} ({Math.round((u.scheduledHours / u.hours) * 100)}%)
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          
                          {getUsersAvailableForDate(selectedDate, "day").length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-4">
                                Geen ambulanciers gevonden
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                
                {/* Nacht shift (altijd) */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Nacht Shift (19:00 - 07:00)</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Naam</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ingepland</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getUsersAvailableForDate(selectedDate, "night").map((u) => (
                          <TableRow key={u.userId}>
                            <TableCell>
                              <div className="font-medium">{`${u.firstName} ${u.lastName}`}</div>
                            </TableCell>
                            <TableCell>
                              {u.isAssigned ? (
                                <Badge className="bg-blue-500 hover:bg-blue-600">Toegewezen</Badge>
                              ) : u.isAssignedElsewhere ? (
                                <Badge variant="outline" className="text-purple-600 border-purple-600 bg-purple-50">Ingepland elders</Badge>
                              ) : u.isAvailable ? (
                                <Badge className="bg-green-500 hover:bg-green-600">Beschikbaar</Badge>
                              ) : u.hasNoPreference ? (
                                <Badge variant="outline" className="text-orange-500 border-orange-500">Geen voorkeur</Badge>
                              ) : u.hours === 0 ? (
                                <Badge variant="outline" className="text-gray-500">Werkt geen uren</Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-500">Niet beschikbaar</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span>{u.scheduledHours}</span>
                                {u.hours > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    / {u.hours} ({Math.round((u.scheduledHours / u.hours) * 100)}%)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {getUsersAvailableForDate(selectedDate, "night").length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4">
                              Geen ambulanciers gevonden
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAvailabilityDialog(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gebruiker Opmerkingen Sectie */}
      {userComments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gebruiker Opmerkingen voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userComments.map((comment: any) => (
                <div key={comment.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-blue-700">
                      {comment.user?.firstName} {comment.user?.lastName}
                      <span className="text-sm text-gray-500 ml-2">({comment.user?.username})</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(comment.updatedAt).toLocaleString('nl-NL')}
                    </div>
                  </div>
                  <div className="text-gray-800 whitespace-pre-wrap">
                    {comment.comment}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Undo Historie Panel - alleen voor admins/supervisors */}
      {effectiveStationId && (user?.role === 'admin' || user?.role === 'supervisor') && (
        <UndoHistoryPanel 
          stationId={effectiveStationId} 
          month={selectedMonth + 1} 
          year={selectedYear} 
        />
      )}

      {/* Emergency Scheduling Dialog - alleen voor supervisors */}
      <EmergencySchedulingDialog
        shift={emergencyShift}
        open={showEmergencyDialog}
        onOpenChange={(open) => {
          setShowEmergencyDialog(open);
          if (!open) setEmergencyShift(null);
        }}
        onSuccess={() => {
          setEditingShift(null);
          queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedMonth + 1, selectedYear, effectiveStationId] });
        }}
      />

      {/* Contact Info Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contactgegevens</DialogTitle>
            <DialogDescription>
              Informatie over {selectedContactUser ? `${selectedContactUser.firstName} ${selectedContactUser.lastName}` : ""}
            </DialogDescription>
          </DialogHeader>
          
          {selectedContactUser && (
            <div className="space-y-4">
              {/* Profile Photo */}
              <div className="flex justify-center">
                {selectedContactUser.profilePhotoUrl ? (
                  <img 
                    src={selectedContactUser.profilePhotoUrl} 
                    alt={`${selectedContactUser.firstName} ${selectedContactUser.lastName}`}
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* User Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{`${selectedContactUser.firstName} ${selectedContactUser.lastName}`}</span>
                </div>
                
                {selectedContactUser.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <a href={`tel:${selectedContactUser.phoneNumber}`} className="text-blue-600 hover:underline">
                      {selectedContactUser.phoneNumber}
                    </a>
                  </div>
                )}
                
                {stations && stations.length > 0 && (
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18"></path>
                      <path d="M9 8h1"></path>
                      <path d="M9 12h1"></path>
                      <path d="M9 16h1"></path>
                      <path d="M14 8h1"></path>
                      <path d="M14 12h1"></path>
                      <path d="M14 16h1"></path>
                      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
                    </svg>
                    <span className="text-sm text-gray-600">
                      {stations.find(s => s.id === selectedContactUser.stationId)?.name || "Onbekend"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContactDialog(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verdi Sync Results Dialog */}
      <Dialog open={showVerdiSyncResultsDialog} onOpenChange={setShowVerdiSyncResultsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {verdiSyncResults?.errors === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              Verdi Synchronisatie Resultaat
            </DialogTitle>
            <DialogDescription>
              {verdiSyncResults?.message}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 py-4 max-h-[50vh]">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{verdiSyncResults?.synced || 0}</div>
                <div className="text-xs text-green-600">Geslaagd</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-700">{verdiSyncResults?.errors || 0}</div>
                <div className="text-xs text-red-600">Fouten</div>
              </div>
              {(verdiSyncResults?.updated || 0) > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{verdiSyncResults?.updated}</div>
                  <div className="text-xs text-blue-600">Bijgewerkt</div>
                </div>
              )}
              {(verdiSyncResults?.skipped || 0) > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-700">{verdiSyncResults?.skipped}</div>
                  <div className="text-xs text-gray-600">Overgeslagen</div>
                </div>
              )}
            </div>
            
            {/* Detailed results */}
            {verdiSyncResults?.results && verdiSyncResults.results.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Details per shift:</h4>
                <div className="space-y-2">
                  {verdiSyncResults.results.map((result, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg border ${
                        result.success 
                          ? 'bg-green-50/50 border-green-200' 
                          : 'bg-red-50/50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm">
                              {format(new Date(result.date), "dd MMM yyyy", { locale: nl })}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground ml-6 truncate">
                            {result.users} ({result.userCount} {result.userCount === 1 ? 'persoon' : 'personen'})
                          </div>
                          {result.errors && result.errors.length > 0 && (
                            <div className="ml-6 mt-1">
                              {result.errors.map((err, i) => (
                                <div key={i} className="text-xs text-red-600">
                                  {err}
                                </div>
                              ))}
                            </div>
                          )}
                          {result.warnings && result.warnings.length > 0 && (
                            <div className="ml-6 mt-1">
                              {result.warnings.map((warn, i) => (
                                <div key={i} className="text-xs text-amber-600">
                                  ⚠ {warn}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowVerdiSyncResultsDialog(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Bids Dialog */}
      <Dialog open={showBidsDialog} onOpenChange={setShowBidsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Biedingen voor Shift</DialogTitle>
            <DialogDescription>
              {selectedBidShift && (
                <>
                  {format(new Date(selectedBidShift.date), "dd MMMM yyyy", { locale: nl })} - {selectedBidShift.type === "day" ? "Dagshift" : "Nachtshift"}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {shiftBids && shiftBids.length > 0 ? (
              shiftBids.filter(b => b.status === 'pending').map((bid) => (
                <div key={bid.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {bid.user.firstName} {bid.user.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatInTimeZone(new Date(bid.createdAt), 'Europe/Brussels', "dd MMM yyyy HH:mm", { locale: nl })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => rejectBidMutation.mutate(bid.id)}
                      disabled={rejectBidMutation.isPending || assignBidMutation.isPending}
                      title="Bieding afwijzen"
                    >
                      {rejectBidMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => assignBidMutation.mutate(bid.id)}
                      disabled={assignBidMutation.isPending || rejectBidMutation.isPending}
                    >
                      {assignBidMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Toewijzen
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                Geen openstaande biedingen
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBidsDialog(false);
              setSelectedBidShift(null);
            }}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
export default memo(ScheduleGenerator);
