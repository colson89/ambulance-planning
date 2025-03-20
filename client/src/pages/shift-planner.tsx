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
import type { ShiftPreference } from "@shared/schema";

type PreferenceType = "full" | "first" | "second" | "unavailable";
type ShiftType = "day" | "night";

// CSS voor gesplitste kalendercel
const splitDayStyle = "!bg-gradient-to-b from-amber-100 to-transparent";
const splitNightStyle = "!bg-gradient-to-b from-transparent to-indigo-100";
const splitBothStyle = "!bg-gradient-to-b from-amber-100 to-indigo-100";
const unavailableStyle = "!bg-red-100";

export default function ShiftPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [datePreferences, setDatePreferences] = useState<Map<string, { day?: PreferenceType; night?: PreferenceType }>>(new Map());

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
    const dateKey = format(date, "yyyy-MM-dd");
    const newValue = event.target.value as PreferenceType;
    const existingPreferences = datePreferences.get(dateKey) || {};

    setDatePreferences(new Map(datePreferences).set(dateKey, {
      ...existingPreferences,
      [shiftType]: newValue
    }));
  };

  const getPreferenceForDate = (date: Date, shiftType: ShiftType): PreferenceType => {
    const dateKey = format(date, "yyyy-MM-dd");
    const prefs = datePreferences.get(dateKey);
    return prefs?.[shiftType] || "full";
  };

  const handleSubmit = async (event: React.FormEvent, shiftType: ShiftType) => {
    event.preventDefault();
    console.log("Form submit", { selectedDate, shiftType, preferenceType: selectedDate ? getPreferenceForDate(selectedDate, shiftType) : null });

    if (!selectedDate) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een datum",
        variant: "destructive",
      });
      return;
    }

    try {
      const preferenceType = getPreferenceForDate(selectedDate, shiftType);
      const testData = {
        date: selectedDate,
        type: preferenceType === "unavailable" ? "unavailable" : shiftType,
        startTime: preferenceType === "unavailable" ? null : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(),
          shiftType === "day" ? 7 : 19,
          0,
          0
        ),
        endTime: preferenceType === "unavailable" ? null : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + (shiftType === "night" ? 1 : 0),
          shiftType === "day" ? 19 : 7,
          0,
          0
        ),
        canSplit: false,
        month: selectedMonth.getMonth() + 1,
        year: selectedMonth.getFullYear(),
        notes: preferenceType === "unavailable" ? "Niet beschikbaar" : null
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

  const getPreferenceType = (date: Date, type: ShiftType) => {
    const prefs = getDayPreferences(date);
    if (prefs.length === 0) return null;
    return prefs.find(p => p.type === type)?.type || null;
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
                  dayOnly: (date) => {
                    const dayPref = getPreferenceType(date, "day");
                    const nightPref = getPreferenceType(date, "night");
                    return dayPref === "day" && (!nightPref || nightPref === "unavailable");
                  },
                  nightOnly: (date) => {
                    const dayPref = getPreferenceType(date, "day");
                    const nightPref = getPreferenceType(date, "night");
                    return nightPref === "night" && (!dayPref || dayPref === "unavailable");
                  },
                  bothShifts: (date) => {
                    const dayPref = getPreferenceType(date, "day");
                    const nightPref = getPreferenceType(date, "night");
                    return dayPref === "day" && nightPref === "night";
                  },
                  unavailable: (date) => {
                    const dayPref = getPreferenceType(date, "day");
                    const nightPref = getPreferenceType(date, "night");
                    return (dayPref === "unavailable" && nightPref === "unavailable") || 
                           (dayPref === "unavailable" && !nightPref) || 
                           (!dayPref && nightPref === "unavailable");
                  }
                }}
                modifiersClassNames={{
                  dayOnly: splitDayStyle,
                  nightOnly: splitNightStyle,
                  bothShifts: splitBothStyle,
                  unavailable: unavailableStyle
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
                  <div className="w-4 h-4 bg-amber-100 rounded"></div>
                  <span className="text-sm flex items-center">
                    <Sun className="h-4 w-4 mr-1" />
                    Alleen dag shift
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-indigo-100 rounded"></div>
                  <span className="text-sm flex items-center">
                    <Moon className="h-4 w-4 mr-1" />
                    Alleen nacht shift
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-8 rounded overflow-hidden">
                    <div className="h-1/2 bg-amber-100"></div>
                    <div className="h-1/2 bg-indigo-100"></div>
                  </div>
                  <span className="text-sm flex items-center">
                    <Sun className="h-4 w-4 mr-1" />
                    <Moon className="h-4 w-4 mr-1" />
                    Beide shifts beschikbaar
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-100 rounded"></div>
                  <span className="text-sm">Niet beschikbaar</span>
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
                          checked={getPreferenceForDate(selectedDate, "day") === "full"}
                          onChange={(e) => handleTypeChange(e, selectedDate, "day")}
                        />
                        <span>Volledige shift (7:00-19:00)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dayShift"
                          value="first"
                          checked={getPreferenceForDate(selectedDate, "day") === "first"}
                          onChange={(e) => handleTypeChange(e, selectedDate, "day")}
                        />
                        <span>Eerste deel (7:00-13:00)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dayShift"
                          value="second"
                          checked={getPreferenceForDate(selectedDate, "day") === "second"}
                          onChange={(e) => handleTypeChange(e, selectedDate, "day")}
                        />
                        <span>Tweede deel (13:00-19:00)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dayShift"
                          value="unavailable"
                          checked={getPreferenceForDate(selectedDate, "day") === "unavailable"}
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
                        checked={getPreferenceForDate(selectedDate, "night") === "full"}
                        onChange={(e) => handleTypeChange(e, selectedDate, "night")}
                      />
                      <span>Volledige shift (19:00-7:00)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="nightShift"
                        value="first"
                        checked={getPreferenceForDate(selectedDate, "night") === "first"}
                        onChange={(e) => handleTypeChange(e, selectedDate, "night")}
                      />
                      <span>Eerste deel (19:00-1:00)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="nightShift"
                        value="second"
                        checked={getPreferenceForDate(selectedDate, "night") === "second"}
                        onChange={(e) => handleTypeChange(e, selectedDate, "night")}
                      />
                      <span>Tweede deel (1:00-7:00)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="nightShift"
                        value="unavailable"
                        checked={getPreferenceForDate(selectedDate, "night") === "unavailable"}
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