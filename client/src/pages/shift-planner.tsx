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
import { Home, Loader2, Moon, Sun } from "lucide-react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ShiftPreference } from "@shared/schema";

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

  const today = new Date();
  const currentMonthDeadline = new Date(today.getFullYear(), today.getMonth(), 19, 23, 0);
  const isPastDeadline = today > currentMonthDeadline;

  useEffect(() => {
    const planningMonth = addMonths(today, isPastDeadline ? 2 : 1);
    setSelectedMonth(planningMonth);
    setSelectedDate(planningMonth);
  }, []);

  const { data: preferences = [] } = useQuery<ShiftPreference[]>({
    queryKey: ["/api/preferences", selectedMonth.getMonth() + 1, selectedMonth.getFullYear()],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/preferences?month=${selectedMonth.getMonth() + 1}&year=${selectedMonth.getFullYear()}`);
      if (!res.ok) throw new Error("Kon voorkeuren niet ophalen");
      return res.json();
    },
    enabled: !!user,
  });

  // Update lokale selecties wanneer een datum wordt geselecteerd
  useEffect(() => {
    if (selectedDate && preferences) {
      const dayPref = getPreferenceForDate(selectedDate, "day");
      const nightPref = getPreferenceForDate(selectedDate, "night");
      setCurrentDaySelection(dayPref);
      setCurrentNightSelection(nightPref);
    }
  }, [selectedDate, preferences]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
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
      
      // Bepaal de juiste notesText op basis van preferenceType
      if (preferenceType === "unavailable") {
        notesText = "Niet beschikbaar";
      } else if (canSplit) {
        notesText = preferenceType; // "first" of "second"
        
        if (shiftType === "day") {
          if (preferenceType === "first") {
            // Eerste helft dagshift (7:00-13:00)
            startTimeHour = 7;
            endTimeHour = 13;
          } else if (preferenceType === "second") {
            // Tweede helft dagshift (13:00-19:00)
            startTimeHour = 13;
            endTimeHour = 19;
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
        type: preferenceType === "unavailable" ? "unavailable" : shiftType,
        startTime: preferenceType === "unavailable" ? null : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(),
          startTimeHour, 0, 0
        ),
        endTime: preferenceType === "unavailable" ? null : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + endDateOffset,
          endTimeHour, 0, 0
        ),
        canSplit: canSplit,
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
    if (!isWeekend(date)) return { hasDay: false, hasNight: false, bothUnavailable: false };
    
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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Shift Planner</h1>
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          U geeft nu voorkeuren op voor {format(selectedMonth, "MMMM yyyy", { locale: nl })}.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
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
                  // Groen voor dagen waar voorkeuren zijn opgegeven (niet unavailable)
                  hasPreference: (date) => {
                    const prefs = getDayPreferences(date);
                    return prefs.length > 0 && prefs.some(p => p.type !== "unavailable");
                  },
                  // Rood voor expliciet onbeschikbare dagen
                  unavailable: (date) => {
                    const prefs = getDayPreferences(date);
                    return prefs.length > 0 && prefs.every(p => p.type === "unavailable");
                  },
                  // Geen kleur (wit) voor dagen zonder voorkeuren
                  noPreference: (date) => {
                    const prefs = getDayPreferences(date);
                    return prefs.length === 0;
                  }
                }}
                modifiersClassNames={{
                  hasPreference: "!bg-green-100 hover:!bg-green-200",
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
                  <span className="text-sm">Voorkeur opgegeven</span>
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
                {isWeekend(selectedDate) && (
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
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dayShift"
                          value="first"
                          checked={currentDaySelection === "first"}
                          onChange={(e) => handleTypeChange(e, selectedDate, "day")}
                        />
                        <span>Eerste deel (7:00-13:00)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dayShift"
                          value="second"
                          checked={currentDaySelection === "second"}
                          onChange={(e) => handleTypeChange(e, selectedDate, "day")}
                        />
                        <span>Tweede deel (13:00-19:00)</span>
                      </label>
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
                        value="first"
                        checked={currentNightSelection === "first"}
                        onChange={(e) => handleTypeChange(e, selectedDate, "night")}
                      />
                      <span>Eerste deel (19:00-23:00)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="nightShift"
                        value="second"
                        checked={currentNightSelection === "second"}
                        onChange={(e) => handleTypeChange(e, selectedDate, "night")}
                      />
                      <span>Tweede deel (23:00-7:00)</span>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}