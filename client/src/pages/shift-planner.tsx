import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, addMonths, isWeekend } from "date-fns";
import { nl } from "date-fns/locale";
import { Home, Loader2, Moon, Sun, Download } from "lucide-react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ShiftPreference, WeekdayConfig, Holiday } from "@shared/schema";

type PreferenceType = "full" | "first" | "second" | "unavailable" | "none";
type ShiftType = "day" | "night";

export default function ShiftPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [datePreferences, setDatePreferences] = useState<Map<string, { day?: PreferenceType; night?: PreferenceType }>>(new Map());
  const [currentDaySelection, setCurrentDaySelection] = useState<PreferenceType>("none");
  const [currentNightSelection, setCurrentNightSelection] = useState<PreferenceType>("none");
  const [comment, setComment] = useState<string>("");

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

  useEffect(() => {
    const planningMonth = addMonths(today, isPastDeadline ? 2 : 1);
    setSelectedMonth(planningMonth);
    setSelectedDate(planningMonth);
  }, []);

  const { data: preferences = [] } = useQuery<ShiftPreference[]>({
    queryKey: ["/api/unified-preferences", selectedMonth.getMonth() + 1, selectedMonth.getFullYear()],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/unified-preferences?month=${selectedMonth.getMonth() + 1}&year=${selectedMonth.getFullYear()}`);
      if (!res.ok) throw new Error("Kon voorkeuren niet ophalen");
      return res.json();
    },
    enabled: !!user,
    staleTime: 10 * 1000, // 10 seconden - zeer verse data voor kritieke voorkeuren
    refetchOnWindowFocus: true,
  });

  const { data: userComment } = useQuery({
    queryKey: ["/api/comments", selectedMonth.getMonth() + 1, selectedMonth.getFullYear()],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/comments/${selectedMonth.getMonth() + 1}/${selectedMonth.getFullYear()}`);
      if (!res.ok && res.status !== 404) throw new Error("Kon opmerking niet ophalen");
      return res.status === 404 ? null : res.json();
    },
    enabled: !!user,
  });

  // Haal user's stations op om multi-station detectie mogelijk te maken
  const { data: userStations = [] } = useQuery<any[]>({
    queryKey: ["/api/user/stations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/stations");
      if (!res.ok) throw new Error("Kon stations niet ophalen");
      return res.json();
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconden - stations wijzigen niet vaak
  });

  // Detecteer of user multi-station is (werkt bij meerdere stations)
  const isMultiStation = userStations.length > 1;

  // Haal weekdag configuraties op om te controleren of split shifts zijn toegestaan
  const { data: weekdayConfigs = [] } = useQuery<WeekdayConfig[]>({
    queryKey: ["/api/weekday-configs"],
    enabled: !!user,
    staleTime: 10 * 1000, // 10 seconden - zeer verse data voor kritieke configuratie
    refetchOnWindowFocus: true,
  });

  // Haal feestdagen op voor het geselecteerde jaar
  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays", selectedMonth.getFullYear()],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/holidays?year=${selectedMonth.getFullYear()}`);
      if (!res.ok) throw new Error("Kon feestdagen niet ophalen");
      return res.json();
    },
    enabled: !!user,
  });

  // Helper functie om te checken of een datum een weekend of feestdag is
  const isWeekendOrHoliday = (date: Date) => {
    // Check regulier weekend
    if (isWeekend(date)) return true;
    
    // Check feestdagen
    const dateString = format(date, 'yyyy-MM-dd');
    return holidays.some(holiday => 
      holiday.date === dateString && holiday.isActive
    );
  };

  // Helper functie om de effective weekday config te bepalen (feestdagen = zondag)
  const getEffectiveWeekdayConfig = (date: Date | undefined, stationId?: number): WeekdayConfig | undefined => {
    if (!date) return undefined;
    
    // Check of het een feestdag is
    const dateString = format(date, 'yyyy-MM-dd');
    const isHoliday = holidays.some(holiday => 
      holiday.date === dateString && holiday.isActive
    );
    
    // Gebruik zondag config (dayOfWeek = 0) voor feestdagen, anders normale dag
    const effectiveDayOfWeek = isHoliday ? 0 : date.getDay();
    
    // Gebruik de opgegeven stationId, of fallback naar user's stationId
    const targetStationId = stationId ?? user?.stationId;
    
    // Vind de config voor deze effectieve dag EN dit station
    return weekdayConfigs.find(config => 
      config.dayOfWeek === effectiveDayOfWeek && config.stationId === targetStationId
    );
  };

  // Check of split shifts zijn toegestaan voor de geselecteerde datum
  // Voor multi-station users: alleen als ALLE stations het ondersteunen
  const allowSplitShifts = (() => {
    if (!selectedDate) return false;
    
    if (isMultiStation) {
      // Voor multi-station: check of ALLE stations split shifts toestaan
      const userStationIds = userStations.map((s: any) => s.id);
      return userStationIds.every((stationId: number) => {
        const config = getEffectiveWeekdayConfig(selectedDate, stationId);
        return config?.allowSplitShifts ?? false;
      });
    } else {
      // Voor single-station: gebruik de config van het primaire station
      return getEffectiveWeekdayConfig(selectedDate)?.allowSplitShifts ?? false;
    }
  })();

  // Helper functie om te checken of shift forms getoond moeten worden
  const shouldShowDayShift = (date: Date | undefined): boolean => {
    if (!date) return false;
    
    if (isMultiStation) {
      // Multi-station: altijd dagshift tonen (kan bij elk station nodig zijn)
      return true;
    } else {
      // Single-station: alleen tonen als enabled in weekday config
      return getEffectiveWeekdayConfig(date)?.enableDayShifts ?? true;
    }
  };

  const shouldShowNightShift = (date: Date | undefined): boolean => {
    if (!date) return false;
    
    if (isMultiStation) {
      // Multi-station: altijd nachtshift tonen (kan bij elk station nodig zijn)
      return true;
    } else {
      // Single-station: alleen tonen als enabled in weekday config
      return getEffectiveWeekdayConfig(date)?.enableNightShifts ?? true;
    }
  };

  // Update lokale selecties wanneer een datum wordt geselecteerd
  useEffect(() => {
    if (selectedDate && preferences) {
      const dayPref = getPreferenceForDate(selectedDate, "day");
      const nightPref = getPreferenceForDate(selectedDate, "night");
      setCurrentDaySelection(dayPref);
      setCurrentNightSelection(nightPref);
    }
  }, [selectedDate, preferences]);

  // Update opmerking wanneer deze wordt opgehaald
  useEffect(() => {
    if (userComment) {
      setComment(userComment.comment || "");
    } else {
      setComment("");
    }
  }, [userComment]);

  const createPreferenceMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Versturen van voorkeur data:", data);
      const res = await apiRequest("POST", "/api/preferences", data);
      console.log("API Response:", res.status);
      const json = await res.json();
      console.log("API Response data:", json);
      return json;
    },
    onSuccess: () => {
      console.log("Voorkeur succesvol opgeslagen");
      queryClient.invalidateQueries({ queryKey: ["/api/unified-preferences"] });
      
      // Sync states na succesvolle save
      setTimeout(() => {
        if (selectedDate) {
          const dayPref = getPreferenceForDate(selectedDate, "day");
          const nightPref = getPreferenceForDate(selectedDate, "night");
          setCurrentDaySelection(dayPref);
          setCurrentNightSelection(nightPref);
        }
      }, 100); // Kleine delay om cache invalidation te laten settelen
      
      toast({
        title: "Succes",
        description: "Voorkeur opgeslagen",
      });
    },
    onError: (error: Error) => {
      console.error("Error bij opslaan voorkeur:", error);
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het opslaan van uw voorkeur",
        variant: "destructive",
      });
    },
  });

  const saveCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      const res = await apiRequest("POST", "/api/comments", {
        comment: commentText,
        month: selectedMonth.getMonth() + 1,
        year: selectedMonth.getFullYear()
      });
      if (!res.ok) throw new Error("Kon opmerking niet opslaan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
      toast({
        title: "Succes",
        description: "Opmerking opgeslagen",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het opslaan van uw opmerking",
        variant: "destructive",
      });
    },
  });

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPreferences = async () => {
    try {
      setIsExporting(true);
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      const response = await fetch(`/api/preferences/export?month=${month}&year=${year}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Kon voorkeuren niet exporteren");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Mijn_Beschikbaarheden_${format(selectedMonth, 'MMMM_yyyy', { locale: nl })}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Succes",
        description: "Uw beschikbaarheden zijn geëxporteerd naar Excel",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Kon voorkeuren niet exporteren",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>, date: Date, shiftType: ShiftType) => {
    const newValue = event.target.value as PreferenceType;
    
    // Update lokale selectie
    if (shiftType === "day") {
      setCurrentDaySelection(newValue);
    } else {
      setCurrentNightSelection(newValue);
    }
  };

  const getPreferenceForDate = (date: Date, shiftType: ShiftType): PreferenceType => {
    const prefs = getDayPreferences(date);
    
    // Zoek naar een voorkeur voor dit specifieke shift type
    const specificPref = prefs.find(p => p.type === shiftType);
    if (specificPref) {
      // Als er notes zijn, gebruik die om het preference type te bepalen
      if (specificPref.notes === "first") return "first";
      if (specificPref.notes === "second") return "second";
      if (specificPref.notes === "Niet beschikbaar") return "unavailable";
      return "full"; // Default voor voorkeuren zonder specifieke notes
    }
    
    // Zoek naar een "unavailable" voorkeur voor deze dag
    const unavailablePref = prefs.find(p => p.type === "unavailable");
    if (unavailablePref) {
      return "unavailable";
    }
    
    // Geen voorkeur gevonden
    return "none";
  };

  const handleSubmit = async (event: React.FormEvent, shiftType: ShiftType) => {
    event.preventDefault();

    if (!selectedDate) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een datum",
        variant: "destructive",
      });
      return;
    }

    // Haal de geselecteerde waarde uit de form data
    const formData = new FormData(event.target as HTMLFormElement);
    const preferenceType = formData.get(shiftType === "day" ? "dayShift" : "nightShift") as PreferenceType;
    
    console.log("Form submit", { selectedDate, shiftType, preferenceType });

    if (!preferenceType) {
      toast({
        title: "Fout",
        description: "Selecteer een voorkeur",
        variant: "destructive",
      });
      return;
    }

    try {
      let startTimeHour = 7;  // Default voor dagshift
      let endTimeHour = 19; // Default voor dagshift
      let endDateOffset = 0; // Default voor dagshift
      
      if (shiftType === "night") {
        startTimeHour = 19;
        endTimeHour = 7;
        endDateOffset = 1; // Nachtshift eindigt de volgende dag
      }
      
      // Bepaal of dit een halve shift is en pas tijden aan indien nodig
      const canSplit = preferenceType === "first" || preferenceType === "second";
      let notesText: string | null = null;
      let splitType: "morning" | "afternoon" | null = null;
      
      // Bepaal de juiste notesText op basis van preferenceType
      if (preferenceType === "unavailable") {
        notesText = "Niet beschikbaar";
      } else if (canSplit) {
        notesText = preferenceType; // "first" of "second" - behouden voor backward compatibility
        
        if (shiftType === "day") {
          if (preferenceType === "first") {
            // Eerste helft dagshift (7:00-13:00)
            startTimeHour = 7;
            endTimeHour = 13;
            splitType = "morning";
          } else if (preferenceType === "second") {
            // Tweede helft dagshift (13:00-19:00)
            startTimeHour = 13;
            endTimeHour = 19;
            splitType = "afternoon";
          }
        } else if (shiftType === "night") {
          if (preferenceType === "first") {
            // Eerste helft nachtshift (19:00-23:00)
            startTimeHour = 19;
            endTimeHour = 23;
            endDateOffset = 0; // Eindigt nog op dezelfde dag
          } else if (preferenceType === "second") {
            // Tweede helft nachtshift (23:00-7:00)
            startTimeHour = 23;
            endTimeHour = 7;
            endDateOffset = 1; // Eindigt de volgende dag
          }
        }
      }
      
      const testData = {
        date: selectedDate,
        type: shiftType, // Altijd day of night gebruiken, NOOIT "unavailable"
        startTime: preferenceType === "unavailable" ? null : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(),
          startTimeHour, 0, 0
        ),
        endTime: preferenceType === "unavailable" ? null : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + endDateOffset,
          endTimeHour, 0, 0
        ),
        canSplit: canSplit,
        splitType: splitType,
        month: selectedMonth.getMonth() + 1,
        year: selectedMonth.getFullYear(),
        notes: notesText
      };

      console.log("Versturen test data:", testData);
      await createPreferenceMutation.mutateAsync(testData);
      console.log("Test data verstuurd");
    } catch (error) {
      console.error("Error bij versturen test data:", error);
    }
  };

  const getDayPreferences = (date: Date) => {
    return preferences.filter(p =>
      format(new Date(p.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const getPreferenceType = (date: Date) => {
    const prefs = getDayPreferences(date);
    if (prefs.length === 0) return null;
    if (prefs.some(p => p.type === "unavailable")) return "unavailable";
    return "available";
  };
  
  const getWeekendPreferences = (date: Date) => {
    if (!isWeekendOrHoliday(date)) return { hasDay: false, hasNight: false, bothUnavailable: false };
    
    const prefs = getDayPreferences(date);
    const dayPref = prefs.find(p => p.type === "day");
    const nightPref = prefs.find(p => p.type === "night");
    const unavailable = prefs.some(p => p.type === "unavailable");
    
    return {
      hasDay: !!dayPref,
      hasNight: !!nightPref,
      bothUnavailable: unavailable
    };
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Voorkeuren</h1>
        <Button
          variant="outline"
          className="h-10"
          onClick={() => setLocation("/dashboard")}
        >
          <Home className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Dashboard</span>
        </Button>
      </div>

      <Alert className="mb-4 md:mb-6">
        <AlertDescription className="text-sm">
          Voorkeuren voor <span className="font-medium">{format(selectedMonth, "MMMM yyyy", { locale: nl })}</span>
          <span className="text-xs mt-1 block text-muted-foreground">
            Deadline: {format(isPastDeadline ? addMonths(currentMonthDeadline, 1) : currentMonthDeadline, "d MMMM HH:mm", { locale: nl })}
          </span>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kalender</CardTitle>
            </CardHeader>
            <CardContent>

              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                disabled={(date) => date.getMonth() !== selectedMonth.getMonth()}
                modifiers={{
                  // EERSTE PRIORITEIT: Rood - ALLE shifts zijn onbeschikbaar
                  unavailable: (date) => {
                    const prefs = getDayPreferences(date);
                    if (prefs.length === 0) return false;
                    
                    const isUnavailable = (p: ShiftPreference) => p.notes === 'Niet beschikbaar' || (p.startTime === null && p.endTime === null);
                    // Rood alleen als ALLE preferences onbeschikbaar zijn
                    return prefs.every(isUnavailable);
                  },
                  // TWEEDE PRIORITEIT: Groen - alle zichtbare shifts beschikbaar, geen onbeschikbare
                  fullAvailable: (date) => {
                    const prefs = getDayPreferences(date);
                    if (prefs.length === 0) return false;
                    
                    const isUnavailable = (p: ShiftPreference) => p.notes === 'Niet beschikbaar' || (p.startTime === null && p.endTime === null);
                    const hasDayAvailable = prefs.some((p: ShiftPreference) => p.type === "day" && !isUnavailable(p));
                    const hasNightAvailable = prefs.some((p: ShiftPreference) => p.type === "night" && !isUnavailable(p));
                    const hasAnyUnavailable = prefs.some(isUnavailable);
                    
                    if (isMultiStation) {
                      // Multi-station: groen als beide shifts beschikbaar zijn EN geen unavailable
                      return hasDayAvailable && hasNightAvailable && !hasAnyUnavailable;
                    } else {
                      // Single-station: check welke shifts enabled zijn voor dit station
                      const config = getEffectiveWeekdayConfig(date);
                      const dayEnabled = config?.enableDayShifts ?? false;
                      const nightEnabled = config?.enableNightShifts ?? false;
                      
                      // Groen als alle ENABLED shifts beschikbaar zijn EN geen unavailable shifts
                      const dayOk = !dayEnabled || hasDayAvailable;
                      const nightOk = !nightEnabled || hasNightAvailable;
                      
                      return dayOk && nightOk && !hasAnyUnavailable && (hasDayAvailable || hasNightAvailable);
                    }
                  },
                  // DERDE PRIORITEIT: Oranje - mix van beschikbaar en onbeschikbaar, OF niet alle zichtbare shifts hebben voorkeur
                  partialAvailable: (date) => {
                    const prefs = getDayPreferences(date);
                    if (prefs.length === 0) return false;
                    
                    const isUnavailable = (p: ShiftPreference) => p.notes === 'Niet beschikbaar' || (p.startTime === null && p.endTime === null);
                    const hasDayAvailable = prefs.some((p: ShiftPreference) => p.type === "day" && !isUnavailable(p));
                    const hasNightAvailable = prefs.some((p: ShiftPreference) => p.type === "night" && !isUnavailable(p));
                    const hasAnyUnavailable = prefs.some(isUnavailable);
                    const hasAnyAvailable = hasDayAvailable || hasNightAvailable;
                    
                    if (isMultiStation) {
                      // Multi-station: oranje als niet beide shifts beschikbaar OF mix van available/unavailable
                      const bothAvailable = hasDayAvailable && hasNightAvailable;
                      return hasAnyAvailable && (!bothAvailable || hasAnyUnavailable);
                    } else {
                      // Single-station: check welke shifts enabled zijn
                      const config = getEffectiveWeekdayConfig(date);
                      const dayEnabled = config?.enableDayShifts ?? false;
                      const nightEnabled = config?.enableNightShifts ?? false;
                      
                      // Oranje als: (mix van available/unavailable) OF (niet alle enabled shifts hebben voorkeur)
                      const dayMissing = dayEnabled && !hasDayAvailable;
                      const nightMissing = nightEnabled && !hasNightAvailable;
                      
                      return hasAnyAvailable && (hasAnyUnavailable || dayMissing || nightMissing);
                    }
                  },
                  // LAATSTE PRIORITEIT: Wit voor geen voorkeur opgegeven
                  noPreference: (date) => {
                    const prefs = getDayPreferences(date);
                    return prefs.length === 0;
                  }
                }}
                modifiersClassNames={{
                  fullAvailable: "!bg-green-100 hover:!bg-green-200",
                  partialAvailable: "!bg-orange-100 hover:!bg-orange-200",
                  unavailable: "!bg-red-100 hover:!bg-red-200",
                  noPreference: "!bg-white hover:!bg-gray-50"
                }}
                className="rounded-md border"
                locale={nl}

              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <h3 className="font-medium mb-2">Legenda:</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 rounded"></div>
                  <span className="text-sm">Zowel dag als nacht beschikbaar</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-orange-100 rounded"></div>
                  <span className="text-sm">Dag OF nacht beschikbaar</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-100 rounded"></div>
                  <span className="text-sm">Niet beschikbaar</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-white border rounded"></div>
                  <span className="text-sm">Geen voorkeur opgegeven</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Voorkeuren</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate && (
              <div className="space-y-6">
                {shouldShowDayShift(selectedDate) && (
                  <form onSubmit={(e) => handleSubmit(e, "day")} className="space-y-4">
                    <h3 className="font-medium">Dag Shift (7:00 - 19:00)</h3>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dayShift"
                          value="full"
                          checked={currentDaySelection === "full"}
                          onChange={(e) => handleTypeChange(e, selectedDate, "day")}
                        />
                        <span>Volledige shift (7:00-19:00)</span>
                      </label>
                      {(allowSplitShifts || isMultiStation) && (
                        <>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="dayShift"
                              value="first"
                              checked={currentDaySelection === "first"}
                              onChange={(e) => handleTypeChange(e, selectedDate, "day")}
                            />
                            <span>Ochtend (7:00-13:00)</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="dayShift"
                              value="second"
                              checked={currentDaySelection === "second"}
                              onChange={(e) => handleTypeChange(e, selectedDate, "day")}
                            />
                            <span>Middag (13:00-19:00)</span>
                          </label>
                        </>
                      )}
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dayShift"
                          value="unavailable"
                          checked={currentDaySelection === "unavailable"}
                          onChange={(e) => handleTypeChange(e, selectedDate, "day")}
                        />
                        <span>Niet beschikbaar</span>
                      </label>
                    </div>
                    <Button
                      type="submit"
                      disabled={createPreferenceMutation.isPending}
                      className="w-full"
                    >
                      {createPreferenceMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Bezig met opslaan...
                        </>
                      ) : (
                        "Dag Shift Voorkeur Opslaan"
                      )}
                    </Button>
                  </form>
                )}

                {shouldShowNightShift(selectedDate) && (
                  <form onSubmit={(e) => handleSubmit(e, "night")} className="space-y-4">
                    <h3 className="font-medium">Nacht Shift (19:00 - 7:00)</h3>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="nightShift"
                        value="full"
                        checked={currentNightSelection === "full"}
                        onChange={(e) => handleTypeChange(e, selectedDate, "night")}
                      />
                      <span>Volledige shift (19:00-7:00)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="nightShift"
                        value="unavailable"
                        checked={currentNightSelection === "unavailable"}
                        onChange={(e) => handleTypeChange(e, selectedDate, "night")}
                      />
                      <span>Niet beschikbaar</span>
                    </label>
                  </div>
                  <Button
                    type="submit"
                    disabled={createPreferenceMutation.isPending}
                    className="w-full"
                  >
                    {createPreferenceMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Bezig met opslaan...
                      </>
                    ) : (
                      "Nacht Shift Voorkeur Opslaan"
                    )}
                  </Button>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opmerkingen sectie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Opmerkingen voor {format(selectedMonth, "MMMM yyyy", { locale: nl })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="comment" className="block text-sm font-medium mb-2">
                  Opmerkingen (bijv. vakantie, persoonlijke omstandigheden)
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Voeg hier uw opmerkingen toe voor deze maand..."
                  className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  maxLength={1000}
                />
                <div className="text-sm text-gray-500 mt-1">
                  {comment.length}/1000 karakters
                </div>
              </div>
              
              <Button
                onClick={() => saveCommentMutation.mutate(comment)}
                disabled={saveCommentMutation.isPending || comment.trim().length === 0}
                className="w-full"
              >
                {saveCommentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Bezig met opslaan...
                  </>
                ) : (
                  "Opmerking Opslaan"
                )}
              </Button>
              
              {userComment && (
                <Alert>
                  <AlertDescription>
                    <strong>Laatste opmerking:</strong> {userComment.comment}
                    <br />
                    <span className="text-sm text-gray-500">
                      Laatst bijgewerkt: {new Date(userComment.updatedAt).toLocaleString('nl-NL')}
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Export sectie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exporteer Beschikbaarheden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Exporteer uw beschikbaarheden voor {format(selectedMonth, "MMMM yyyy", { locale: nl })} naar een Excel-bestand.
              </p>
              <Button
                onClick={handleExportPreferences}
                disabled={isExporting || preferences.filter(p => p.type !== 'unavailable').length === 0}
                className="w-full"
                variant="outline"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Bezig met exporteren...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exporteer naar Excel
                  </>
                )}
              </Button>
              {preferences.filter(p => p.type !== 'unavailable').length === 0 && (
                <p className="text-sm text-amber-600">
                  U heeft nog geen beschikbaarheden opgegeven voor deze maand.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}