import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Calendar, Clock, LogOut, UserCog, CalendarDays, ChevronLeft, ChevronRight, Check, AlertCircle, UserPlus, Settings, BarChart3, User as UserIcon, Building2, Link as LinkIcon, Menu, X, Timer, FileText, RefreshCw, Bell, HelpCircle, Maximize2, Minimize2 } from "lucide-react";
import { OpenSlotWarning } from "@/components/open-slot-warning";
import { OvertimeDialog } from "@/components/overtime-dialog";
import { ShiftSwapDialog } from "@/components/shift-swap-dialog";
import { MySwapRequests } from "@/components/my-swap-requests";
import { OpenSwapRequests } from "@/components/open-swap-requests";
import { MyOpenSwapOffers } from "@/components/my-open-swap-offers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Shift, ShiftPreference, User as UserType } from "@shared/schema";
import { useLocation } from "wouter";
import { format, addMonths, parse, setMonth, setYear, getMonth, getYear, isEqual, parseISO, isWeekend, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StationSwitcher } from "@/components/station-switcher";

// ==================== TIMEZONE HELPERS ====================
// SHIFTS: Oude shifts zijn opgeslagen als UTC (23:00 UTC = 00:00 CET volgende dag)
// VOORKEUREN: Ook opgeslagen als UTC (zelfde conversie nodig)

// Helper voor SHIFTS - converteert 23:00 UTC naar volgende dag
function toShiftCalendarDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  
  if (typeof value === "string") {
    if (value.includes("T23:00:00") || value.includes(" 23:00:00")) {
      let dateStr = value;
      if (value.includes(" 23:00:00") && !value.includes("T")) {
        dateStr = value.replace(' ', 'T') + 'Z';
      }
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return value.substring(0, 10);
  }
  
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper voor VOORKEUREN - converteert 23:00 UTC naar volgende dag (backwards compatible)
function toPrefCalendarDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  
  if (typeof value === "string") {
    if (value.includes("T23:00:00") || value.includes(" 23:00:00")) {
      let dateStr = value;
      if (value.includes(" 23:00:00") && !value.includes("T")) {
        dateStr = value.replace(' ', 'T') + 'Z';
      }
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return value.substring(0, 10);
  }
  
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Algemene helper voor Date objecten (bijv. geselecteerde datum in UI)
function toCalendarDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  
  if (typeof value === "string") {
    return value.substring(0, 10);
  }
  
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // VERSION MARKER - If you see this in console, the new code is loaded!
  console.log("🚀 DASHBOARD VERSION 2.0 - REQUIREDSTAFF FIX LOADED");
  
  
  // Staat voor maand/jaar selectie
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [selectedContactUser, setSelectedContactUser] = useState<UserType | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [overtimeDialogOpen, setOvertimeDialogOpen] = useState(false);
  const [selectedOvertimeShift, setSelectedOvertimeShift] = useState<Shift | null>(null);
  const [shiftSwapDialogOpen, setShiftSwapDialogOpen] = useState(false);
  const [selectedSwapShift, setSelectedSwapShift] = useState<Shift | null>(null);
  const [showOnlyMyShifts, setShowOnlyMyShifts] = useState(() => {
    const saved = localStorage.getItem('dashboard_showOnlyMyShifts');
    return saved === 'true';
  });
  const [isFullscreen, setIsFullscreen] = useState(() => {
    // Check URL parameter for kiosk mode auto-start
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('fullscreen') === 'true';
  });
  
  // Track if fullscreen was initiated via URL parameter (kiosk mode - no close button)
  const [isKioskMode] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('fullscreen') === 'true';
  });
  
  // Get station ID from URL parameter for fullscreen/kiosk mode
  const [kioskStationId, setKioskStationId] = useState<number | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stationParam = urlParams.get('station');
    return stationParam ? parseInt(stationParam, 10) : null;
  });

  // Persist "only my shifts" preference
  useEffect(() => {
    localStorage.setItem('dashboard_showOnlyMyShifts', showOnlyMyShifts.toString());
  }, [showOnlyMyShifts]);

  // Fullscreen mode: auto-select current month and scroll to today
  useEffect(() => {
    if (isFullscreen) {
      const now = new Date();
      setSelectedMonth(now.getMonth());
      setSelectedYear(now.getFullYear());
      // Force show all shifts in fullscreen (not just user's own)
      setShowOnlyMyShifts(false);
      
      // Scroll to today's date after a short delay to allow render
      setTimeout(() => {
        const todayElement = document.getElementById('today-shift-row');
        if (todayElement) {
          todayElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [isFullscreen]);

  // Viewers should never filter to only their shifts (they have none)
  useEffect(() => {
    if (user?.role === 'viewer') {
      setShowOnlyMyShifts(false);
    }
  }, [user?.role]);

  // Auto-refresh in fullscreen mode (every 60 seconds)
  useEffect(() => {
    if (isFullscreen) {
      const currentMonth = selectedMonth;
      const currentYear = selectedYear;
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const interval = setInterval(() => {
        // Refresh both current and next month in kiosk mode
        queryClient.invalidateQueries({ 
          queryKey: ["/api/shifts", currentMonth + 1, currentYear] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["/api/shifts", nextM + 1, nextY] 
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isFullscreen, queryClient, selectedMonth, selectedYear]);

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", selectedMonth + 1, selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/shifts?month=${selectedMonth + 1}&year=${selectedYear}`);
      if (!res.ok) throw new Error("Failed to fetch shifts");
      return res.json();
    },
  });
  
  // For kiosk mode: compute month/year based on current time, not selected month
  // This ensures the rolling 14-day view always works even if kiosk runs for weeks
  const kioskNow = new Date();
  const kioskCurrentMonth = kioskNow.getMonth();
  const kioskCurrentYear = kioskNow.getFullYear();
  const kioskNextMonth = kioskCurrentMonth === 11 ? 0 : kioskCurrentMonth + 1;
  const kioskNextYear = kioskCurrentMonth === 11 ? kioskCurrentYear + 1 : kioskCurrentYear;
  
  // Kiosk: fetch current month based on real time (may differ from selectedMonth if kiosk ran overnight)
  const { data: kioskCurrentMonthShifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", kioskCurrentMonth + 1, kioskCurrentYear, "kiosk"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/shifts?month=${kioskCurrentMonth + 1}&year=${kioskCurrentYear}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isFullscreen,
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });
  
  // Kiosk: fetch next month based on real time
  const { data: kioskNextMonthShifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", kioskNextMonth + 1, kioskNextYear, "kiosk"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/shifts?month=${kioskNextMonth + 1}&year=${kioskNextYear}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isFullscreen,
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });
  
  // Combined shifts for kiosk mode (current + next month based on real time)
  const allShiftsForKiosk = isFullscreen ? [...kioskCurrentMonthShifts, ...kioskNextMonthShifts] : shifts;
  
  // Use /api/users/colleagues which works for ALL users (including ambulanciers)
  // This returns limited but sufficient data for displaying colleague names
  const { data: colleagues = [], isLoading: colleaguesLoading } = useQuery<any[]>({
    queryKey: ["/api/users/colleagues"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users/colleagues");
      if (!res.ok) return [];
      return res.json();
    },
  });
  
  // For admin operations, still try to get full user list (will fail for ambulanciers but that's ok)
  const { data: users = [], isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === 'admin' || user?.role === 'supervisor',
  });
  
  const { data: preferences = [], isLoading: preferencesLoading } = useQuery<any[]>({
    queryKey: ["/api/preferences/all"],
  });

  const { data: stations = [], isLoading: stationsLoading } = useQuery<any[]>({
    queryKey: ["/api/stations"],
  });

  const { data: weekdayConfigs = [], isLoading: configsLoading } = useQuery<any[]>({
    queryKey: ["/api/weekday-configs", user?.stationId],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/weekday-configs");
      if (!res.ok) throw new Error("Failed to fetch weekday configs");
      const data = await res.json();
      console.log("📊 Weekday configs loaded for stationId:", user?.stationId, data);
      return data;
    },
  });

  const { data: myOvertime = [] } = useQuery<any[]>({
    queryKey: ["/api/overtime/my", selectedMonth + 1, selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/overtime/my/${selectedYear}/${selectedMonth + 1}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: pendingSwapCount = 0 } = useQuery<number>({
    queryKey: ["/api/shift-swaps/pending/count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shift-swaps/pending/count");
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: user?.role === 'admin' || user?.role === 'supervisor',
    refetchInterval: 30000,
  });

  // Query for pending bid count (for admins/supervisors)
  const { data: pendingBidCount = 0 } = useQuery<number>({
    queryKey: ["/api/shift-bids/pending/count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shift-bids/pending/count");
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: user?.role === 'admin' || user?.role === 'supervisor',
    refetchInterval: 30000,
  });

  // Query for my bids
  const { data: myBids = [] } = useQuery<any[]>({
    queryKey: ["/api/shift-bids/my-bids"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shift-bids/my-bids");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Mutation to create a shift bid
  const createBidMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const res = await apiRequest("POST", `/api/shifts/${shiftId}/bids`, {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Fout bij plaatsen bieding");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-bids/my-bids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-bids/pending/count"] });
      toast({
        title: "Bieding geplaatst",
        description: "Je aanvraag is ingediend. De admin/supervisor zal deze beoordelen.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if user has a pending bid for a specific shift
  const hasPendingBidForShift = (shiftId: number) => {
    return myBids.some(bid => bid.shiftId === shiftId && bid.status === 'pending');
  };
  
  // Get the pending bid for a shift (to get the bidId for withdrawal)
  const getPendingBidForShift = (shiftId: number) => {
    return myBids.find(bid => bid.shiftId === shiftId && bid.status === 'pending');
  };

  // Mutation to withdraw a bid
  const withdrawBidMutation = useMutation({
    mutationFn: async (bidId: number) => {
      const response = await apiRequest("POST", `/api/shift-bids/${bidId}/withdraw`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-bids/my-bids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-bids/pending/count"] });
      toast({
        title: "Bieding ingetrokken",
        description: "Je bieding is succesvol ingetrokken.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = shiftsLoading || usersLoading || preferencesLoading || stationsLoading || configsLoading;

  // Mutation om handmatig shifts toe te voegen voor open slots
  const addManualShiftMutation = useMutation({
    mutationFn: async ({ date, startTime, endTime }: { date: Date, startTime: string, endTime: string }) => {
      const shiftData = {
        date: format(date, 'yyyy-MM-dd'),
        type: 'night',
        startTime: `${format(date, 'yyyy-MM-dd')}T${startTime}:00.000Z`,
        endTime: startTime > endTime ? 
          `${format(addDays(date, 1), 'yyyy-MM-dd')}T${endTime}:00.000Z` : 
          `${format(date, 'yyyy-MM-dd')}T${endTime}:00.000Z`,
        status: 'open',
        isSplitShift: true,
        stationId: user?.stationId
      };
      
      const response = await apiRequest("POST", "/api/shifts", shiftData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Shift toegevoegd",
        description: "Open tijdslot is toegevoegd als beschikbare shift",
      });
    },
    onError: (error: Error) => {
      console.error('Add shift error:', error);
      toast({
        title: "Fout bij toevoegen shift",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler voor handmatig toevoegen van shifts
  const handleAddShift = (date: Date, startTime: string, endTime: string) => {
    addManualShiftMutation.mutate({ date, startTime, endTime });
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
        isAvailable: boolean;
        hours: number;
        startTime?: string | null;
        endTime?: string | null;
      }> = [];
      
      // TIMEZONE FIX: Gebruik helper functie voor consistente datum extractie
      const gezochteYMD = toCalendarDate(date);
      
      // Haal shifts op voor deze datum
      const matchingShifts = shifts.filter(shift => {
        if (!shift.date) return false;
        
        // TIMEZONE FIX: Gebruik toShiftCalendarDate voor shifts (23:00 UTC → volgende dag)
        const shiftYMD = toShiftCalendarDate(shift.date);
        
        // Controleer het shift type (dag of nacht)
        const isTypeMatch = (shiftType === "day" && shift.type === "day") || 
                           (shiftType === "night" && shift.type === "night");
        
        return shiftYMD === gezochteYMD && isTypeMatch;
      });
      
      // Voor elke gevonden shift, zoek de toegewezen medewerker
      const assignedUserIds = new Set();
      const assignedShiftDetails = new Map(); // Map userId -> shift details
      
      matchingShifts.forEach(shift => {
        if (shift.userId > 0) {
          assignedUserIds.add(shift.userId);
          assignedShiftDetails.set(shift.userId, {
            startTime: shift.startTime,
            endTime: shift.endTime,
            isSplitShift: shift.isSplitShift
          });
        }
      });
      
      // Haal alle ambulanciers EN admins op die shifts kunnen draaien
      // Use colleagues instead of users (works for all roles including ambulanciers)
      const ambulanciers = colleagues.filter(u => u.role === "ambulancier" || u.role === "admin");
      
      // Zoek in voorkeuren voor deze datum
      // TIMEZONE FIX: Gebruik toPrefCalendarDate helper
      const allPreferences = preferences.flatMap(userPrefs => userPrefs.preferences || []);
      const preferencesForDate = allPreferences.filter(pref => {
        if (!pref || !pref.date) return false;
        // TIMEZONE FIX: Gebruik helper functie voor correcte 23:00 UTC conversie
        const prefYMD = toPrefCalendarDate(pref.date);
        return prefYMD === gezochteYMD;
      });
      

      
      // Maak een Map van gebruikers met hun voorkeuren en tijdsblokken
      const userPreferencesMap = new Map();
      preferencesForDate.forEach(pref => {
        // Als de voorkeur niet 'unavailable' is en het shift type komt overeen
        if (pref.type !== "unavailable" && pref.type === shiftType) {
          userPreferencesMap.set(pref.userId, {
            startTime: pref.startTime,
            endTime: pref.endTime,
            preferenceType: pref.type,
            canSplit: pref.canSplit || false
          });
        }
      });
      
      // Toon alle ambulanciers en markeer op basis van beschikbaarheid en toewijzing
      ambulanciers.forEach(ambulancier => {
        const isAssigned = assignedUserIds.has(ambulancier.id);
        const userPreference = userPreferencesMap.get(ambulancier.id);
        const isAvailable = !!userPreference;
        
        // Controleer of de ambulancier uren wil werken 
        // Use effectiveHours for cross-team users (their primary hours may be 0 for this station)
        const effectiveHrs = ambulancier.effectiveHours ?? ambulancier.hours ?? 0;
        const wantsToWork = effectiveHrs > 0;
        
        // Bepaal het preferentietype
        let preferenceType = "unavailable";
        if (isAssigned) {
          preferenceType = "assigned";
        } else if (isAvailable && wantsToWork) {
          preferenceType = "available";
        }
        
        // Alleen toevoegen als ze toegewezen zijn OF een voorkeur hebben ingediend
        if (isAssigned || isAvailable) {
          const shiftDetails = assignedShiftDetails.get(ambulancier.id);
          result.push({
            userId: ambulancier.id,
            username: ambulancier.username || "Onbekend",
            firstName: ambulancier.firstName || "",
            lastName: ambulancier.lastName || "",
            preferenceType: preferenceType,
            canSplit: userPreference?.canSplit || false,
            isAssigned: isAssigned,
            isAvailable: isAvailable && wantsToWork,
            hours: effectiveHrs,
            startTime: isAssigned ? shiftDetails?.startTime : userPreference?.startTime,
            endTime: isAssigned ? shiftDetails?.endTime : userPreference?.endTime
          });
        }
      });
      
      // Sorteer de resultaten: eerst beschikbare niet-toegewezen, dan toegewezen, dan rest
      result.sort((a, b) => {
        // Eerst sorteren op basis van beschikbaarheid en toewijzing
        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1; // Beschikbare gebruikers eerst
        }
        
        if (a.isAssigned !== b.isAssigned) {
          return a.isAssigned ? 1 : -1; // Niet-toegewezen gebruikers eerder
        }
        
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

  const today = new Date();
  
  // Haal de configureerbare deadline op
  const { data: deadlineConfig } = useQuery({
    queryKey: ["/api/system/deadline-days"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/system/deadline-days");
      if (!res.ok) throw new Error("Kon deadline instelling niet ophalen");
      return res.json();
    },
    enabled: !!user,
  });
  
  const deadlineDays = deadlineConfig?.days || 1;
  // Bereken deadline: X dagen voor de 1e van de volgende maand
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const currentMonthDeadline = new Date(nextMonthStart.getTime() - (deadlineDays * 24 * 60 * 60 * 1000));
  currentMonthDeadline.setHours(23, 0, 0, 0);
  const isPastDeadline = today > currentMonthDeadline;

  // Als we voorbij de deadline zijn van deze maand, toon dan de planning voor de maand na volgende maand
  const planningMonth = addMonths(today, isPastDeadline ? 2 : 1);
  
  // Navigatie functies voor maand/jaar
  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };
  
  // Filter shifts voor de geselecteerde maand en jaar (voor open-slot detectie)
  const monthYearFilteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return getMonth(shiftDate) === selectedMonth && getYear(shiftDate) === selectedYear;
    });
  }, [shifts, selectedMonth, selectedYear]);
  
  // Filter shifts voor weergave (optioneel alleen eigen shifts)
  const filteredShifts = useMemo(() => {
    if (showOnlyMyShifts) {
      return monthYearFilteredShifts.filter(shift => shift.userId === user?.id);
    }
    return monthYearFilteredShifts;
  }, [monthYearFilteredShifts, showOnlyMyShifts, user?.id]);

  // Functie om open tijdslots te detecteren voor een specifieke datum
  // Gebruik monthYearFilteredShifts zodat open slots correct worden gedetecteerd, ook als "alleen mijn shiften" aan staat
  const detectOpenTimeSlots = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const nightShifts = monthYearFilteredShifts.filter(shift => 
      format(new Date(shift.date), 'yyyy-MM-dd') === dateStr && shift.type === 'night'
    );

    if (nightShifts.length === 0) return [];

    const openSlots = [];
    
    // Controleer of er gaten zijn in de nachtshift coverage (19:00-07:00)
    const nightStart = 19; // 19:00
    const nightEnd = 31; // 07:00 volgende dag (31 = 24 + 7)
    
    // Sorteer shifts op starttijd
    nightShifts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    let currentHour = nightStart;
    
    for (const shift of nightShifts) {
      const shiftStartDate = new Date(shift.startTime);
      const shiftEndDate = new Date(shift.endTime);
      const shiftDate = new Date(shift.date);
      
      const startHourStr = shiftStartDate.toLocaleTimeString('nl-NL', { 
        hour: '2-digit',
        timeZone: 'Europe/Brussels',
        hour12: false 
      }).split(':')[0];
      const endHourStr = shiftEndDate.toLocaleTimeString('nl-NL', { 
        hour: '2-digit',
        timeZone: 'Europe/Brussels',
        hour12: false 
      }).split(':')[0];
      
      const shiftStart = parseInt(startHourStr) + (shiftStartDate.getDate() > shiftDate.getDate() ? 24 : 0);
      const shiftEnd = parseInt(endHourStr) + (shiftEndDate.getDate() > shiftDate.getDate() ? 24 : 0);
      
      // Als er een gat is tussen current hour en shift start
      if (currentHour < shiftStart) {
        const endHour = Math.min(shiftStart, nightEnd);
        openSlots.push({
          startHour: currentHour >= 24 ? currentHour - 24 : currentHour,
          endHour: endHour >= 24 ? endHour - 24 : endHour,
          date: dateStr,
          type: 'night'
        });
      }
      
      currentHour = Math.max(currentHour, shiftEnd);
    }
    
    // Controleer of er nog tijd over is na de laatste shift
    if (currentHour < nightEnd) {
      openSlots.push({
        startHour: currentHour >= 24 ? currentHour - 24 : currentHour,
        endHour: nightEnd >= 24 ? nightEnd - 24 : nightEnd,
        date: dateStr,
        type: 'night'
      });
    }
    
    return openSlots;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const dayShifts = shifts?.filter(s => s.type === 'day').length || 0;
  const totalHours = shifts?.reduce((acc, s) => {
    const duration = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
    return acc + (duration / (1000 * 60 * 60));
  }, 0) || 0;

  // Handler voor het openen van het beschikbaarheidsvenster
  const handleDateClick = (date: Date, shiftType: "day" | "night") => {
    setSelectedDate(date);
    setShowAvailabilityDialog(true);
  };
  
  // Fullscreen mode for viewers (Lumaps display)
  if (isFullscreen) {
    // Get current time for active shift detection
    const now = new Date();
    const currentHourMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Helper function to check if a shift is currently active
    const isShiftActive = (shift: typeof filteredShifts[0]) => {
      if (!shift.startTime || !shift.endTime) return false;
      
      const shiftDate = format(new Date(shift.date), "yyyy-MM-dd");
      const todayDate = format(now, "yyyy-MM-dd");
      const yesterdayDate = format(new Date(now.getTime() - 24 * 60 * 60 * 1000), "yyyy-MM-dd");
      
      const startHour = new Date(shift.startTime).getUTCHours();
      const endHour = new Date(shift.endTime).getUTCHours();
      
      // Night shifts span two days (19:00-07:00)
      if (shift.type === "night") {
        // Night shift starts evening of shift.date and ends morning of next day
        if (shiftDate === todayDate) {
          // Shift starts today evening - active if current time >= start hour
          const startMinutes = startHour * 60;
          return currentHourMinutes >= startMinutes;
        } else if (shiftDate === yesterdayDate) {
          // Shift started yesterday evening - active if current time < end hour
          const endMinutes = endHour * 60;
          return currentHourMinutes < endMinutes;
        }
        return false;
      } else {
        // Day shift is on the same day
        if (shiftDate !== todayDate) return false;
        const startMinutes = startHour * 60;
        const endMinutes = endHour * 60;
        return currentHourMinutes >= startMinutes && currentHourMinutes < endMinutes;
      }
    };
    
    // Kiosk mode: show shifts from today for the next 14 days (rolling view across month/year boundaries)
    const kioskStartDate = new Date();
    kioskStartDate.setHours(0, 0, 0, 0);
    const kioskEndDate = new Date(kioskStartDate);
    kioskEndDate.setDate(kioskEndDate.getDate() + 14);
    
    // Also include night shifts from yesterday that might still be active
    const kioskStartWithYesterday = new Date(kioskStartDate);
    kioskStartWithYesterday.setDate(kioskStartWithYesterday.getDate() - 1);
    
    const kioskShifts = (allShiftsForKiosk || []).filter(shift => {
      const shiftDate = new Date(shift.date);
      shiftDate.setHours(0, 0, 0, 0);
      return shiftDate >= kioskStartWithYesterday && shiftDate < kioskEndDate;
    });
    
    // Track the first shift of today for auto-scroll
    let firstTodayShiftFound = false;
    
    return (
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        {/* Sticky header with station name - always visible */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">Planning {stations.find(s => s.id === (kioskStationId || user?.stationId))?.displayName || ''}</h1>
              <span className="text-sm text-muted-foreground">
                Komende 14 dagen
              </span>
            </div>
            {/* Only show close button when fullscreen was manually activated (not kiosk mode) */}
            {!isKioskMode && (
              <Button variant="outline" size="sm" onClick={() => setIsFullscreen(false)}>
                <Minimize2 className="h-4 w-4 mr-2" />
                Sluiten
              </Button>
            )}
          </div>
        </div>
        
        {/* Full calendar view */}
        <div className="p-4">
          <div className="bg-card rounded-lg border">
            {kioskShifts.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                Geen shifts gevonden voor de komende 14 dagen
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Datum</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tijd</TableHead>
                    <TableHead>Medewerker</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kioskShifts
                    .sort((a, b) => {
                      // Sort by date, then by type (day before night)
                      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
                      if (dateCompare !== 0) return dateCompare;
                      return a.type === 'day' ? -1 : 1;
                    })
                    .filter(shift => {
                      // Filter out yesterday's shifts that are no longer active
                      const shiftDate = format(new Date(shift.date), "yyyy-MM-dd");
                      const yesterdayDate = format(new Date(now.getTime() - 24 * 60 * 60 * 1000), "yyyy-MM-dd");
                      if (shiftDate === yesterdayDate) {
                        return isShiftActive(shift);
                      }
                      return true;
                    })
                    .map((shift: any) => {
                      // For emergency assignments from other stations, use enriched data from API
                      const localUser = colleagues.find(u => u.id === shift.userId);
                      const shiftUser = localUser || (shift.emergencyAssignedUser ? {
                        id: shift.emergencyAssignedUser.id,
                        firstName: shift.emergencyAssignedUser.firstName,
                        lastName: shift.emergencyAssignedUser.lastName,
                        stationId: shift.emergencyAssignedUser.stationId
                      } : null);
                      const isToday = format(new Date(shift.date), "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
                      const isActive = isShiftActive(shift);
                      
                      // For auto-scroll: mark the first shift of today
                      const isTodayScrollTarget = isToday && !firstTodayShiftFound;
                      if (isTodayScrollTarget) firstTodayShiftFound = true;
                      
                      const getShiftTime = () => {
                        if (!shift.startTime || !shift.endTime) return "-";
                        const startHour = new Date(shift.startTime).getUTCHours();
                        const endHour = new Date(shift.endTime).getUTCHours();
                        
                        if (shift.type === "night") {
                          if (shift.isSplitShift) {
                            if (startHour === 19 && endHour === 23) return "19:00-23:00";
                            else if (startHour === 23 && endHour === 7) return "23:00-07:00";
                            else return `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`;
                          }
                          return "19:00-07:00";
                        } else {
                          if (shift.isSplitShift) {
                            if (startHour === 7 && endHour === 13) return "07:00-13:00";
                            else if (startHour === 13 && endHour === 19) return "13:00-19:00";
                            else return `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`;
                          }
                          return "07:00-19:00";
                        }
                      };

                      return (
                        <TableRow 
                          key={shift.id}
                          id={isTodayScrollTarget ? 'today-shift-row' : undefined}
                          className={`${shift.status === "open" ? "bg-red-50 dark:bg-red-950" : ""} ${isActive ? "bg-yellow-100 dark:bg-yellow-900 font-semibold" : ""}`}
                        >
                          <TableCell className="font-medium">
                            {format(new Date(shift.date), "EEE d MMM", { locale: nl })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={shift.type === "night" ? "secondary" : "default"}>
                              {shift.type === "day" ? "Dag" : "Nacht"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getShiftTime()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {shiftUser ? (
                                <>
                                  <span>{shiftUser.firstName} {shiftUser.lastName}</span>
                                  {shift.isEmergencyScheduling && shift.emergencyAssignedUser && (
                                    <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-300 text-xs">
                                      Nood ({shift.emergencyAssignedUser.stationName})
                                    </Badge>
                                  )}
                                </>
                              ) : shift.status === "open" ? (
                                <span className="text-red-600 dark:text-red-400 font-medium">Open</span>
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {shift.status === "planned" ? (
                              <Badge variant="outline" className="bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300">Gepland</Badge>
                            ) : shift.isEmergencyScheduling && shiftUser ? (
                              <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-300">Noodinplanning</Badge>
                            ) : (
                              <Badge variant="destructive">Open</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
        
        {/* Auto-refresh indicator */}
        <div className="text-center text-xs text-muted-foreground py-4">
          Automatische verversing elke 60 seconden
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header - Responsive layout */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Top row: Title + Mobile menu button */}
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
            {user && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">
                    <span className="font-medium text-foreground">{user.username}</span>
                    <span className="hidden sm:inline"> ({user.firstName} {user.lastName})</span>
                  </span>
                </div>
                {stations.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {stations.find(s => s.id === user.stationId)?.displayName || 'Onbekend'}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <Button 
            variant="outline" 
            size="icon"
            className="lg:hidden flex-shrink-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          {/* Desktop navigation */}
          <div className="hidden lg:flex gap-2 flex-wrap justify-end items-center">
            {(user?.role === 'admin' || user?.role === 'supervisor') && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/users")}
                >
                  <UserCog className="h-4 w-4 mr-2" />
                  Gebruikersbeheer
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/statistics")}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Statistieken
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/schedule")}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Planning
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/settings")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Instellingen
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/integrations")}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Integraties
                </Button>
                <Button 
                  variant={pendingSwapCount > 0 ? "destructive" : "outline"}
                  onClick={() => setLocation("/shift-swaps")}
                  className="relative"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ruilverzoeken
                  {pendingSwapCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center bg-white text-red-600 border-2 border-red-600 text-xs font-bold">
                      {pendingSwapCount}
                    </Badge>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/push-notifications")}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Push Meldingen
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
              </>
            )}
            <Button 
              variant="outline"
              onClick={() => setLocation("/profile")}
            >
              <UserIcon className="h-4 w-4 mr-2" />
              Profiel
            </Button>
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/manual")}
              title="Handleiding"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
            <StationSwitcher />
            <Button 
              variant="outline" 
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Uitloggen
            </Button>
          </div>
        </div>
        
        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-background border rounded-lg p-3 shadow-lg">
            <div className="grid grid-cols-2 gap-2">
              {(user?.role === 'admin' || user?.role === 'supervisor') && (
                <>
                  <Button 
                    variant="outline"
                    className="justify-start h-12"
                    onClick={() => { setLocation("/users"); setMobileMenuOpen(false); }}
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Gebruikers
                  </Button>
                  <Button 
                    variant="outline"
                    className="justify-start h-12"
                    onClick={() => { setLocation("/statistics"); setMobileMenuOpen(false); }}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Statistieken
                  </Button>
                  <Button 
                    variant="outline"
                    className="justify-start h-12"
                    onClick={() => { setLocation("/schedule"); setMobileMenuOpen(false); }}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Planning
                  </Button>
                  <Button 
                    variant="outline"
                    className="justify-start h-12"
                    onClick={() => { setLocation("/settings"); setMobileMenuOpen(false); }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Instellingen
                  </Button>
                  <Button 
                    variant="outline"
                    className="justify-start h-12"
                    onClick={() => { setLocation("/integrations"); setMobileMenuOpen(false); }}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Integraties
                  </Button>
                  <Button 
                    variant={pendingSwapCount > 0 ? "destructive" : "outline"}
                    className="justify-start h-12 relative"
                    onClick={() => { setLocation("/shift-swaps"); setMobileMenuOpen(false); }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Ruilverzoeken
                    {pendingSwapCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center bg-white text-red-600 border-2 border-red-600 text-xs font-bold">
                        {pendingSwapCount}
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    className="justify-start h-12"
                    onClick={() => { setLocation("/push-notifications"); setMobileMenuOpen(false); }}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Push Meldingen
                  </Button>
                </>
              )}
              <Button 
                variant="outline"
                className="justify-start h-12"
                onClick={() => { setLocation("/profile"); setMobileMenuOpen(false); }}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Profiel
              </Button>
              {/* Ambulancier menu items - not visible for viewers */}
              {user?.role !== 'viewer' && (
                <>
                  <Button 
                    variant="outline"
                    className="justify-start h-12"
                    onClick={() => { setLocation("/shifts"); setMobileMenuOpen(false); }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Voorkeuren
                  </Button>
                  <Button 
                    variant="outline"
                    className="justify-start h-12"
                    onClick={() => { setLocation("/overtime"); setMobileMenuOpen(false); }}
                  >
                    <Timer className="h-4 w-4 mr-2" />
                    Overuren
                  </Button>
                </>
              )}
              <Button 
                variant="outline"
                className="justify-start h-12"
                onClick={() => { setLocation("/manual"); setMobileMenuOpen(false); }}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Handleiding
              </Button>
              {user?.role !== 'viewer' && (
                <div className="col-span-2">
                  <StationSwitcher />
                </div>
              )}
              <Button 
                variant="outline" 
                className="justify-start h-12 col-span-2"
                onClick={() => { logoutMutation.mutate(); setMobileMenuOpen(false); }}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Uitloggen
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Voorkeuren sectie - niet zichtbaar voor viewers */}
      {user?.role !== 'viewer' && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-medium mb-2">Shift Planning Status</h2>
              <p className="text-muted-foreground">
                {format(planningMonth, "MMMM yyyy", { locale: nl })} is nu open voor voorkeuren.
                <br />
                {isPastDeadline 
                  ? `U kunt tot ${format(addMonths(currentMonthDeadline, 1), "d MMMM HH:mm", { locale: nl })} uw voorkeuren opgeven.`
                  : `U kunt tot ${format(currentMonthDeadline, "d MMMM HH:mm", { locale: nl })} uw voorkeuren opgeven.`
                }
                <br />
                <span className="text-xs">
                  Planning moet {deadlineDays} dag{deadlineDays !== 1 ? 'en' : ''} van tevoren worden ingediend
                </span>
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Button 
                  onClick={() => setLocation("/shifts")}
                  variant="outline"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Voorkeuren Opgeven
                </Button>
                
                {/* Admin knoppen kunnen hier worden toegevoegd */}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rol</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.role === 'admin' ? "Administrator" : 
               user?.role === 'supervisor' ? "Supervisor" : 
               user?.role === 'viewer' ? "Viewer" :
               "Ambulancier"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Swap request secties - niet zichtbaar voor viewers */}
      {user?.role !== 'viewer' && (
        <>
          {/* Mijn Open Wissels met aanbiedingen */}
          <MyOpenSwapOffers users={colleagues} stations={stations} />

          {/* Open Wissels van collega's */}
          {user && (
            <OpenSwapRequests 
              users={colleagues} 
              stations={stations} 
              currentUserId={user.id}
              userRole={user.role}
            />
          )}

          {/* Mijn Ruilverzoeken sectie */}
          <MySwapRequests users={colleagues} shifts={shifts} selectedMonth={selectedMonth} selectedYear={selectedYear} />
        </>
      )}
      
      {/* Planning section georganiseerd per maand/jaar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <CardTitle className="text-lg md:text-xl">Mijn Planning</CardTitle>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" className="h-10 w-10 p-0" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
              </span>
              <Button variant="outline" size="sm" className="h-10 w-10 p-0" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            {user?.role === 'viewer' ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Fullscreen (Lumaps)
              </Button>
            ) : (
              <>
                <Checkbox 
                  id="showOnlyMyShifts" 
                  checked={showOnlyMyShifts}
                  onCheckedChange={(checked) => setShowOnlyMyShifts(checked === true)}
                />
                <Label 
                  htmlFor="showOnlyMyShifts" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Alleen mijn shiften tonen
                </Label>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {filteredShifts.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground">
              {showOnlyMyShifts 
                ? `Je hebt geen geplande shiften in ${format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}`
                : `Geen shifts gevonden voor ${format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}`
              }
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden space-y-3 max-h-[500px] overflow-y-auto">
                {filteredShifts
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((shift: any) => {
                    // For emergency assignments from other stations, use enriched data from API
                    const localUser = colleagues.find(u => u.id === shift.userId);
                    const shiftUser = localUser || (shift.emergencyAssignedUser ? {
                      id: shift.emergencyAssignedUser.id,
                      firstName: shift.emergencyAssignedUser.firstName,
                      lastName: shift.emergencyAssignedUser.lastName,
                      stationId: shift.emergencyAssignedUser.stationId
                    } : null);
                    const isCurrentUserShift = shift.userId === user?.id;
                    
                    const getShiftTime = () => {
                      if (!shift.startTime || !shift.endTime) return "-";
                      const startHour = new Date(shift.startTime).getUTCHours();
                      const endHour = new Date(shift.endTime).getUTCHours();
                      
                      if (shift.type === "night") {
                        if (shift.isSplitShift) {
                          if (startHour === 19 && endHour === 23) return "19:00-23:00";
                          else if (startHour === 23 && endHour === 7) return "23:00-07:00";
                          else return `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`;
                        }
                        return "19:00-07:00";
                      } else {
                        if (shift.isSplitShift) {
                          if (startHour === 7 && endHour === 13) return "07:00-13:00";
                          else if (startHour === 13 && endHour === 19) return "13:00-19:00";
                          else return `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`;
                        }
                        return "07:00-19:00";
                      }
                    };

                    return (
                      <div 
                        key={shift.id}
                        className={`rounded-lg border p-3 ${shift.status === "open" ? "bg-red-50 border-red-200" : isCurrentUserShift ? "bg-green-50 border-green-200" : "bg-white"}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <button 
                            className="text-left font-medium text-sm hover:underline"
                            onClick={() => handleDateClick(new Date(shift.date), shift.type as "day" | "night")}
                          >
                            {format(new Date(shift.date), "EEE d MMM", { locale: nl })}
                          </button>
                          <div className="flex items-center gap-1">
                            {shift.status === "planned" ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`text-xs font-medium ${shift.status === "open" ? "text-red-600" : "text-green-600"}`}>
                              {shift.status === "open" ? "Open" : "OK"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="font-normal">
                            {shift.type === "day" ? "Dag" : "Nacht"}
                          </Badge>
                          <Badge variant="secondary" className="font-normal">
                            <Clock className="h-3 w-3 mr-1" />
                            {getShiftTime()}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {shift.status === "open" ? (
                              <span className="text-red-500 font-medium">Niet ingevuld</span>
                            ) : shiftUser ? (
                              <>
                                <button
                                  className={`text-left hover:underline ${isCurrentUserShift ? "font-bold text-green-600" : ""}`}
                                  onClick={() => {
                                    if (localUser) {
                                      setSelectedContactUser(shiftUser);
                                      setShowContactDialog(true);
                                    }
                                  }}
                                  disabled={!localUser}
                                  title={!localUser ? `${shiftUser.firstName} ${shiftUser.lastName} - ${shift.emergencyAssignedUser?.stationName || 'Ander station'}` : undefined}
                                >
                                  {`${shiftUser.firstName} ${shiftUser.lastName}`}
                                </button>
                                {shift.isEmergencyScheduling && shift.emergencyAssignedUser && (
                                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                                    Nood ({shift.emergencyAssignedUser.stationName})
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">Onbekend</span>
                            )}
                          </div>
                          {shift.status === "open" && !isCurrentUserShift && (
                            <div className="flex gap-1">
                              {hasPendingBidForShift(shift.id) ? (
                                <div className="flex items-center gap-1">
                                  <Badge variant="secondary" className="text-xs">
                                    <Check className="h-3 w-3 mr-1" />
                                    Ingediend
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      const bid = getPendingBidForShift(shift.id);
                                      if (bid) withdrawBidMutation.mutate(bid.id);
                                    }}
                                    disabled={withdrawBidMutation.isPending}
                                    title="Bieding intrekken"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200"
                                  onClick={() => createBidMutation.mutate(shift.id)}
                                  disabled={createBidMutation.isPending}
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Ik wil deze shift
                                </Button>
                              )}
                            </div>
                          )}
                          {isCurrentUserShift && shift.status === "planned" && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setSelectedSwapShift(shift);
                                  setShiftSwapDialogOpen(true);
                                }}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Ruilen
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setSelectedOvertimeShift(shift);
                                  setOvertimeDialogOpen(true);
                                }}
                              >
                                <Timer className="h-3 w-3 mr-1" />
                                Overuren
                                {myOvertime.filter(o => o.shiftId === shift.id).length > 0 && (
                                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                    {myOvertime.filter(o => o.shiftId === shift.id).length}
                                  </Badge>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block max-h-[500px] overflow-y-auto pr-2">
                <Table>
                  <TableCaption>
                    Planning voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
                  </TableCaption>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tijd</TableHead>
                      <TableHead>Medewerker</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShifts
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((shift: any) => {
                        // For emergency assignments from other stations, use enriched data from API
                        const localUser = colleagues.find(u => u.id === shift.userId);
                        const shiftUser = localUser || (shift.emergencyAssignedUser ? {
                          id: shift.emergencyAssignedUser.id,
                          firstName: shift.emergencyAssignedUser.firstName,
                          lastName: shift.emergencyAssignedUser.lastName,
                          stationId: shift.emergencyAssignedUser.stationId
                        } : null);
                        const isCurrentUserShift = shift.userId === user?.id;
                        
                        const results = [];
                        
                        results.push(
                          <TableRow 
                            key={shift.id}
                            className={`${shift.status === "open" ? "bg-red-50" : ""} ${isCurrentUserShift ? "bg-green-50" : ""}`}
                          >
                            <TableCell>
                              <Button 
                                variant="link" 
                                className="p-0 h-auto font-normal text-left hover:no-underline"
                                onClick={() => handleDateClick(new Date(shift.date), shift.type as "day" | "night")}
                              >
                                {format(new Date(shift.date), "dd MMMM (EEEE)", { locale: nl })}
                              </Button>
                            </TableCell>
                            <TableCell>{shift.type === "day" ? "Dag" : "Nacht"}</TableCell>
                            <TableCell>
                              {shift.startTime && shift.endTime ? (
                                (() => {
                                  const startHour = new Date(shift.startTime).getUTCHours();
                                  const endHour = new Date(shift.endTime).getUTCHours();
                                  
                                  if (shift.type === "night") {
                                    if (shift.isSplitShift) {
                                      if (startHour === 19 && endHour === 23) {
                                        return "19:00 - 23:00";
                                      } else if (startHour === 23 && endHour === 7) {
                                        return "23:00 - 07:00";
                                      } else {
                                        return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
                                      }
                                    } else {
                                      return "19:00 - 07:00";
                                    }
                                  } else {
                                    if (shift.isSplitShift) {
                                      if (startHour === 7 && endHour === 13) {
                                        return "07:00 - 13:00";
                                      } else if (startHour === 13 && endHour === 19) {
                                        return "13:00 - 19:00";
                                      } else {
                                        return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
                                      }
                                    } else {
                                      return "07:00 - 19:00";
                                    }
                                  }
                                })()
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {shift.status === "open" ? (
                                  <span className="text-red-500 font-medium">Niet ingevuld</span>
                                ) : shiftUser ? (
                                  <>
                                    <Button
                                      variant="link"
                                      className={`p-0 h-auto font-normal text-left hover:underline ${isCurrentUserShift ? "font-bold text-green-600" : ""}`}
                                      onClick={() => {
                                        if (localUser) {
                                          setSelectedContactUser(shiftUser);
                                          setShowContactDialog(true);
                                        }
                                      }}
                                      disabled={!localUser}
                                      title={!localUser ? `${shiftUser.firstName} ${shiftUser.lastName} - ${shift.emergencyAssignedUser?.stationName || 'Ander station'}` : undefined}
                                    >
                                      {`${shiftUser.firstName} ${shiftUser.lastName}`}
                                    </Button>
                                    {shift.isEmergencyScheduling && shift.emergencyAssignedUser && (
                                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                                        Nood ({shift.emergencyAssignedUser.stationName})
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span>Onbekend</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {shift.status === "planned" ? (
                                  <Check className="h-4 w-4 text-green-500 mr-1" />
                                ) : shift.status === "open" ? (
                                  <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                                ) : null}
                                {shift.status === "open" ? "Open" : "Ingepland"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {isCurrentUserShift && shift.status === "planned" ? (
                                <div className="flex justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => {
                                      setSelectedSwapShift(shift);
                                      setShiftSwapDialogOpen(true);
                                    }}
                                    title="Shift ruilen met collega"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Ruilen
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => {
                                      setSelectedOvertimeShift(shift);
                                      setOvertimeDialogOpen(true);
                                    }}
                                    title="Overuren registreren"
                                  >
                                    <Timer className="h-3 w-3 mr-1" />
                                    {myOvertime.filter(o => o.shiftId === shift.id).length > 0 && (
                                      <Badge variant="secondary" className="mr-1 h-4 px-1 text-[10px]">
                                        {myOvertime.filter(o => o.shiftId === shift.id).length}
                                      </Badge>
                                    )}
                                    Overuren
                                  </Button>
                                </div>
                              ) : shift.status === "open" && !isCurrentUserShift ? (
                                <div className="flex justify-center">
                                  {hasPendingBidForShift(shift.id) ? (
                                    <div className="flex items-center gap-1">
                                      <Badge variant="secondary" className="text-xs">
                                        <Check className="h-3 w-3 mr-1" />
                                        Ingediend
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          const bid = getPendingBidForShift(shift.id);
                                          if (bid) withdrawBidMutation.mutate(bid.id);
                                        }}
                                        disabled={withdrawBidMutation.isPending}
                                        title="Bieding intrekken"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                      onClick={() => createBidMutation.mutate(shift.id)}
                                      disabled={createBidMutation.isPending}
                                      title="Ik wil deze shift doen"
                                    >
                                      <UserPlus className="h-3 w-3 mr-1" />
                                      Ik wil deze shift
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                        
                        return results;
                      })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
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
                {/* Dag shift (alleen voor weekend) */}
                {selectedDate && isWeekend(selectedDate) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Dag Shift (07:00 - 19:00)</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Naam</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Beschikbare tijden</TableHead>
                            <TableHead>Ingepland</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getUsersAvailableForDate(selectedDate, "day").map((u) => {
                            const fullUser = colleagues.find(usr => usr.id === u.userId);
                            return (
                              <TableRow key={u.userId}>
                                <TableCell>
                                  <Button
                                    variant="link"
                                    className="p-0 h-auto font-medium text-left hover:underline"
                                    onClick={() => {
                                      if (fullUser) {
                                        setSelectedContactUser(fullUser);
                                        setShowContactDialog(true);
                                      }
                                    }}
                                  >
                                    {`${u.firstName} ${u.lastName}`}
                                  </Button>
                                </TableCell>
                              <TableCell>
                                {u.isAssigned ? (
                                  <Badge className="bg-blue-500 hover:bg-blue-600">Toegewezen</Badge>
                                ) : u.isAvailable ? (
                                  <Badge className="bg-green-500 hover:bg-green-600">Beschikbaar</Badge>
                                ) : u.hours === 0 ? (
                                  <Badge variant="outline" className="text-gray-500">Werkt geen uren</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-red-500">Niet beschikbaar</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {u.startTime && u.endTime ? (
                                  (() => {
                                    const startHour = new Date(u.startTime).getUTCHours();
                                    const endHour = new Date(u.endTime).getUTCHours();
                                    return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
                                  })()
                                ) : u.isAvailable || u.isAssigned ? (
                                  "Hele dag (07:00 - 19:00)"
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {u.isAssigned && u.startTime && u.endTime ? (
                                  (() => {
                                    const startTime = new Date(u.startTime);
                                    const endTime = new Date(u.endTime);
                                    let hours = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
                                    // Handle cross-midnight shifts (e.g., 19:00-07:00)
                                    if (hours <= 0) {
                                      hours = hours + 24;
                                    }
                                    const totalHours = u.hours || 0;
                                    const percentage = totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0;
                                    return `${hours} / ${totalHours} (${percentage}%)`;
                                  })()
                                ) : (
                                  `0 / ${u.hours || 0} (0%)`
                                )}
                              </TableCell>
                              </TableRow>
                            );
                          })}
                          
                          {getUsersAvailableForDate(selectedDate, "day").length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4">
                                Geen beschikbare ambulanciers gevonden
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
                          <TableHead>Beschikbare tijden</TableHead>
                          <TableHead>Ingepland</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getUsersAvailableForDate(selectedDate, "night").map((u) => {
                          const fullUser = colleagues.find(usr => usr.id === u.userId);
                          return (
                            <TableRow key={u.userId}>
                              <TableCell>
                                <Button
                                  variant="link"
                                  className="p-0 h-auto font-medium text-left hover:underline"
                                  onClick={() => {
                                    if (fullUser) {
                                      setSelectedContactUser(fullUser);
                                      setShowContactDialog(true);
                                    }
                                  }}
                                >
                                  {`${u.firstName} ${u.lastName}`}
                                </Button>
                              </TableCell>
                            <TableCell>
                              {u.isAssigned ? (
                                <Badge className="bg-blue-500 hover:bg-blue-600">Toegewezen</Badge>
                              ) : u.isAvailable ? (
                                <Badge className="bg-green-500 hover:bg-green-600">Beschikbaar</Badge>
                              ) : u.hours === 0 ? (
                                <Badge variant="outline" className="text-gray-500">Werkt geen uren</Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-500">Niet beschikbaar</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {u.startTime && u.endTime ? (
                                (() => {
                                  const startHour = new Date(u.startTime).getUTCHours();
                                  const endHour = new Date(u.endTime).getUTCHours();
                                  return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
                                })()
                              ) : u.isAvailable || u.isAssigned ? (
                                "Hele nacht (19:00 - 07:00)"
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {u.isAssigned && u.startTime && u.endTime ? (
                                (() => {
                                  const startTime = new Date(u.startTime);
                                  const endTime = new Date(u.endTime);
                                  let hours = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
                                  // Handle cross-midnight shifts (e.g., 19:00-07:00)
                                  if (hours <= 0) {
                                    hours = hours + 24;
                                  }
                                  const totalHours = u.hours || 0;
                                  const percentage = totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0;
                                  return `${hours} / ${totalHours} (${percentage}%)`;
                                })()
                              ) : (
                                `0 / ${u.hours || 0} (0%)`
                              )}
                            </TableCell>
                            </TableRow>
                          );
                        })}
                        
                        {getUsersAvailableForDate(selectedDate, "night").length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4">
                              Geen beschikbare ambulanciers gevonden
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
                    <UserIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* User Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-gray-500" />
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
                
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {stations.find(s => s.id === selectedContactUser.stationId)?.name || "Onbekend"}
                  </span>
                </div>
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

      {/* Overtime Dialog */}
      <OvertimeDialog
        open={overtimeDialogOpen}
        onOpenChange={setOvertimeDialogOpen}
        shift={selectedOvertimeShift}
        existingOvertime={selectedOvertimeShift ? myOvertime.filter(o => o.shiftId === selectedOvertimeShift.id) : []}
      />

      {/* Shift Swap Dialog */}
      {selectedSwapShift && user && (
        <ShiftSwapDialog
          open={shiftSwapDialogOpen}
          onOpenChange={setShiftSwapDialogOpen}
          shift={selectedSwapShift}
          currentUser={user}
          stationUsers={colleagues.filter(u => 
            u.accessibleStationIds?.includes(selectedSwapShift.stationId) || 
            u.stationId === selectedSwapShift.stationId
          )}
        />
      )}
    </div>
  );
}