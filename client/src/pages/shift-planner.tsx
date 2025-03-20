import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, addMonths, isWeekend } from "date-fns";
import { nl } from "date-fns/locale";
import { Home, Trash2, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import type { ShiftPreference } from "@shared/schema";

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
      console.log("Creating preference with data:", data);
      const res = await apiRequest("POST", "/api/preferences", data);
      console.log("Response status:", res.status);
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.message || "Er is een fout opgetreden");
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({
        title: "Voorkeur opgeslagen",
        description: "Uw shift voorkeur is succesvol opgeslagen.",
      });
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDayShiftClick = () => {
    console.log("Day shift button clicked");

    if (!selectedDate) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een datum",
        variant: "destructive",
      });
      return;
    }

    if (!isWeekend(selectedDate)) {
      toast({
        title: "Niet toegestaan",
        description: "Dagshiften kunnen alleen in het weekend worden opgegeven.",
        variant: "destructive"
      });
      return;
    }

    const shiftDate = new Date(selectedDate);
    const startTime = new Date(shiftDate);
    const endTime = new Date(shiftDate);

    startTime.setHours(7, 0, 0, 0);
    if (dayShiftType === "full") {
      endTime.setHours(19, 0, 0, 0);
    } else if (dayShiftType === "first") {
      endTime.setHours(13, 0, 0, 0);
    } else {
      endTime.setHours(19, 0, 0, 0);
    }

    const preferenceData = {
      date: shiftDate.toISOString(),
      type: "day",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      canSplit: dayShiftType !== "full",
      month: selectedMonth.getMonth() + 1,
      year: selectedMonth.getFullYear(),
      notes: null
    };

    console.log("Submitting day preference:", preferenceData);
    createPreferenceMutation.mutate(preferenceData);
  };

  const handleNightShiftClick = () => {
    console.log("Night shift button clicked");

    if (!selectedDate) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een datum",
        variant: "destructive",
      });
      return;
    }

    const shiftDate = new Date(selectedDate);
    const startTime = new Date(shiftDate);
    const endTime = new Date(shiftDate);

    startTime.setHours(19, 0, 0, 0);
    if (nightShiftType === "full" || nightShiftType === "second") {
      endTime.setDate(endTime.getDate() + 1);
      endTime.setHours(7, 0, 0, 0);
    } else {
      endTime.setHours(21, 0, 0, 0);
    }

    const preferenceData = {
      date: shiftDate.toISOString(),
      type: "night",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      canSplit: nightShiftType !== "full",
      month: selectedMonth.getMonth() + 1,
      year: selectedMonth.getFullYear(),
      notes: null
    };

    console.log("Submitting night preference:", preferenceData);
    createPreferenceMutation.mutate(preferenceData);
  };

  const deletePreferenceMutation = useMutation({
    mutationFn: async (preferenceId: number) => {
      const res = await apiRequest("DELETE", `/api/preferences/${preferenceId}`);
      if (!res.ok) throw new Error("Kon voorkeur niet verwijderen");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({
        title: "Voorkeur verwijderd",
        description: "De shift voorkeur is succesvol verwijderd.",
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

  const getDayPreferences = (date: Date) => {
    return preferences.filter(p =>
      format(new Date(p.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
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
            ? `U heeft tot ${format(addMonths(currentMonthDeadline, 1), "d MMMM HH:mm", { locale: nl })} om uw voorkeuren op te geven.`
            : `U heeft tot ${format(currentMonthDeadline, "d MMMM HH:mm", { locale: nl })} om uw voorkeuren op te geven.`
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
              disabled={(date) => date.getMonth() !== selectedMonth.getMonth()}
              modifiers={{
                preference: (date) => getDayPreferences(date).length > 0
              }}
              modifiersClassNames={{
                preference: "bg-primary/20 rounded-md"
              }}
              className="rounded-md border"
              locale={nl}
              weekStartsOn={1}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Voorkeuren</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDate && (
              <>
                {isWeekend(selectedDate) && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Dag Shift (7:00 - 19:00)</h3>
                    <RadioGroup
                      value={dayShiftType}
                      onValueChange={(value) => setDayShiftType(value as ShiftType)}
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
                      type="button"
                      onClick={handleDayShiftClick}
                      disabled={createPreferenceMutation.isPending || !selectedDate || isPastDeadline}
                      className="w-full"
                    >
                      {createPreferenceMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Voorkeur opslaan...
                        </>
                      ) : (
                        "Voorkeur Opgeven voor Dag Shift"
                      )}
                    </Button>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="font-medium">Nacht Shift (19:00 - 7:00)</h3>
                  <RadioGroup
                    value={nightShiftType}
                    onValueChange={(value) => setNightShiftType(value as ShiftType)}
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
                    type="button"
                    onClick={handleNightShiftClick}
                    disabled={createPreferenceMutation.isPending || !selectedDate || isPastDeadline}
                    className="w-full"
                  >
                    {createPreferenceMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Voorkeur opslaan...
                      </>
                    ) : (
                      "Voorkeur Opgeven voor Nacht Shift"
                    )}
                  </Button>
                </div>
              </>
            )}

            {selectedDate && getDayPreferences(selectedDate).length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-2">
                  Opgegeven voorkeuren voor {format(selectedDate, "d MMMM yyyy", { locale: nl })}:
                </h3>
                {getDayPreferences(selectedDate).map((pref) => (
                  <div key={pref.id} className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">
                      {pref.type === "day" ? "Dag" : "Nacht"} shift
                      {pref.canSplit && " (kan gesplitst worden)"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePreferenceMutation.mutate(pref.id)}
                      disabled={isPastDeadline}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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