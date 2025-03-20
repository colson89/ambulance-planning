import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, addMonths, startOfMonth, endOfMonth, setHours, setMinutes, isWeekend } from "date-fns";
import { nl } from "date-fns/locale";
import { Home } from "lucide-react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

type ShiftPreference = {
  date: Date;
  type: "day" | "night";
  startTime: Date;
  endTime: Date;
  canSplit: boolean;
  userId: number;
  month: number;
  year: number;
};

type PreferenceResponse = {
  id: number;
  date: string;
  type: "day" | "night";
  startTime: string;
  endTime: string;
  canSplit: boolean;
  userId: number;
};

type ShiftType = "full" | "first" | "second";

export default function ShiftPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [dayShiftType, setDayShiftType] = useState<ShiftType>("full");
  const [nightShiftType, setNightShiftType] = useState<ShiftType>("full");

  // Aanpassing van de planning logica en deadline check
  const today = new Date();
  const currentMonthDeadline = new Date(today.getFullYear(), today.getMonth(), 19, 23, 0);
  const isPastDeadline = today > currentMonthDeadline;

  // Initialiseer selectedMonth met de juiste planning maand
  useEffect(() => {
    const planningMonth = addMonths(today, isPastDeadline ? 2 : 1);
    setSelectedMonth(planningMonth);
    setSelectedDate(planningMonth);
  }, []);

  // Get user's shift preferences for selected month
  const { data: preferences = [], isLoading: preferencesLoading } = useQuery<PreferenceResponse[]>({
    queryKey: ["/api/preferences", selectedMonth.getMonth() + 1, selectedMonth.getFullYear()],
    enabled: !!user,
  });

  const createPreferenceMutation = useMutation({
    mutationFn: async (preference: ShiftPreference) => {
      const res = await apiRequest("POST", "/api/preferences", {
        ...preference,
        date: preference.date.toISOString(),
        startTime: preference.startTime.toISOString(),
        endTime: preference.endTime.toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/preferences", selectedMonth.getMonth() + 1, selectedMonth.getFullYear()] 
      });
      toast({
        title: "Voorkeur opgeslagen",
        description: "Uw shift voorkeur is succesvol opgeslagen.",
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

  const handlePreferenceSubmit = (type: "day" | "night") => {
    if (!selectedDate || !user) return;

    // Controleer of dagshift alleen in het weekend wordt opgegeven
    if (type === "day" && !isWeekend(selectedDate)) {
      toast({
        title: "Niet toegestaan",
        description: "Dagshiften kunnen alleen in het weekend worden opgegeven.",
        variant: "destructive"
      });
      return;
    }

    let startTime, endTime;
    const shiftDate = new Date(selectedDate);
    const selectedShiftType = type === "day" ? dayShiftType : nightShiftType;

    if (type === "day") {
      if (selectedShiftType === "full") {
        startTime = new Date(shiftDate.setHours(7, 0, 0, 0));
        endTime = new Date(shiftDate.setHours(19, 0, 0, 0));
      } else if (selectedShiftType === "first") {
        startTime = new Date(shiftDate.setHours(7, 0, 0, 0));
        endTime = new Date(shiftDate.setHours(13, 0, 0, 0));
      } else {
        startTime = new Date(shiftDate.setHours(13, 0, 0, 0));
        endTime = new Date(shiftDate.setHours(19, 0, 0, 0));
      }
    } else {
      if (selectedShiftType === "full") {
        startTime = new Date(shiftDate.setHours(19, 0, 0, 0));
        const nextDay = new Date(shiftDate);
        nextDay.setDate(nextDay.getDate() + 1);
        endTime = new Date(nextDay.setHours(7, 0, 0, 0));
      } else if (selectedShiftType === "first") {
        startTime = new Date(shiftDate.setHours(19, 0, 0, 0));
        endTime = new Date(shiftDate.setHours(21, 0, 0, 0));
      } else {
        startTime = new Date(shiftDate.setHours(21, 0, 0, 0));
        const nextDay = new Date(shiftDate);
        nextDay.setDate(nextDay.getDate() + 1);
        endTime = new Date(nextDay.setHours(7, 0, 0, 0));
      }
    }

    const preference: ShiftPreference = {
      date: selectedDate,
      type,
      startTime,
      endTime,
      canSplit: selectedShiftType !== "full",
      userId: user.id,
      month: selectedMonth.getMonth() + 1,
      year: selectedMonth.getFullYear()
    };

    console.log('Submitting preference:', preference);
    createPreferenceMutation.mutate(preference);
  };

  const getDayPreferences = (date: Date) => {
    return preferences.filter(p => 
      format(new Date(p.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd") && 
      p.userId === user?.id
    );
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
          {isPastDeadline 
            ? `U heeft tot ${format(addMonths(currentMonthDeadline, 1), "d MMMM yyyy HH:mm", { locale: nl })} om uw voorkeuren op te geven.`
            : `U heeft nog tot ${format(currentMonthDeadline, "d MMMM yyyy HH:mm", { locale: nl })} om uw voorkeuren op te geven.`
          }
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
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
              disabled={(date) => {
                // Sta alleen datums toe in de geselecteerde maand
                return date.getMonth() !== selectedMonth.getMonth();
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Voorkeuren</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDate && isWeekend(selectedDate) && (
              <div className="space-y-4">
                <h3 className="font-medium">Dag Shift (7:00 - 19:00)</h3>
                <RadioGroup
                  value={dayShiftType}
                  onValueChange={(value) => setDayShiftType(value as ShiftType)}
                  disabled={isPastDeadline}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="day-full" />
                    <Label htmlFor="day-full">Volledige shift (7:00-19:00)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="first" id="day-first" />
                    <Label htmlFor="day-first">Eerste deel (7:00-13:00)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="second" id="day-second" />
                    <Label htmlFor="day-second">Tweede deel (13:00-19:00)</Label>
                  </div>
                </RadioGroup>
                <Button
                  onClick={() => handlePreferenceSubmit("day")}
                  disabled={isPastDeadline}
                  className="w-full"
                >
                  Voorkeur Opgeven voor Dag Shift
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-medium">Nacht Shift (19:00 - 7:00)</h3>
              <RadioGroup
                value={nightShiftType}
                onValueChange={(value) => setNightShiftType(value as ShiftType)}
                disabled={isPastDeadline}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="night-full" />
                  <Label htmlFor="night-full">Volledige shift (19:00-7:00)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="first" id="night-first" />
                  <Label htmlFor="night-first">Eerste deel (19:00-21:00)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="second" id="night-second" />
                  <Label htmlFor="night-second">Tweede deel (21:00-7:00)</Label>
                </div>
              </RadioGroup>
              <Button
                onClick={() => handlePreferenceSubmit("night")}
                disabled={isPastDeadline}
                className="w-full"
              >
                Voorkeur Opgeven voor Nacht Shift
              </Button>
            </div>

            {selectedDate && (
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-2">
                  Opgegeven voorkeuren voor {format(selectedDate, "d MMMM yyyy", { locale: nl })}:
                </h3>
                {getDayPreferences(selectedDate).map((pref, i) => (
                  <div key={i} className="text-sm text-muted-foreground">
                    {pref.type === "day" ? "Dag" : "Nacht"} shift
                    {pref.canSplit && " (kan gesplitst worden)"}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 mt-4 border-t text-sm text-muted-foreground">
              <p>Let op:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Dagshiften (7:00-19:00) zijn alleen beschikbaar in het weekend</li>
                <li>Nachtshiften (19:00-7:00) zijn elke dag beschikbaar</li>
                <li>Geef voorkeuren op vóór de 19e van de maand, 23:00</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}