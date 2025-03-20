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

type ShiftType = "full" | "first" | "second" | "unavailable";

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
      console.log("Submit voorkeur:", data);
      const res = await apiRequest("POST", "/api/preferences", data);
      console.log("Response status:", res.status);
      const json = await res.json();
      console.log("Response data:", json);
      if (!res.ok) throw new Error(json.message || "Er is een fout opgetreden");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({
        title: "Succes",
        description: "Voorkeur opgeslagen",
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

  const deletePreferenceMutation = useMutation({
    mutationFn: async (preferenceId: number) => {
      const res = await apiRequest("DELETE", `/api/preferences/${preferenceId}`);
      if (!res.ok) throw new Error("Kon voorkeur niet verwijderen");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({
        title: "Succes",
        description: "Voorkeur verwijderd",
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

  const handleFormSubmit = async (event: React.FormEvent, type: "day" | "night") => {
    event.preventDefault();
    console.log(`Form submit voor ${type} shift`);

    if (!selectedDate) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een datum",
        variant: "destructive",
      });
      return;
    }

    // Check voor dagshift in weekend
    if (type === "day" && !isWeekend(selectedDate)) {
      toast({
        title: "Niet toegestaan",
        description: "Dagshiften kunnen alleen in het weekend worden opgegeven.",
        variant: "destructive"
      });
      return;
    }

    const shiftType = type === "day" ? dayShiftType : nightShiftType;

    // Voor niet beschikbaar
    if (shiftType === "unavailable") {
      const data = {
        date: selectedDate.toISOString(),
        type: "unavailable" as const,
        canSplit: false,
        month: selectedMonth.getMonth() + 1,
        year: selectedMonth.getFullYear(),
        notes: "Niet beschikbaar"
      };
      console.log("Submit niet beschikbaar:", data);
      createPreferenceMutation.mutate(data);
      return;
    }

    // Voor normale shifts
    const startTime = new Date(selectedDate);
    const endTime = new Date(selectedDate);

    if (type === "day") {
      startTime.setHours(7, 0, 0, 0);
      endTime.setHours(shiftType === "full" ? 19 : shiftType === "first" ? 13 : 19, 0, 0, 0);
    } else {
      startTime.setHours(19, 0, 0, 0);
      if (shiftType === "full" || shiftType === "second") {
        endTime.setDate(endTime.getDate() + 1);
        endTime.setHours(7, 0, 0, 0);
      } else {
        endTime.setHours(21, 0, 0, 0);
      }
    }

    const data = {
      date: selectedDate.toISOString(),
      type,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      canSplit: shiftType !== "full",
      month: selectedMonth.getMonth() + 1,
      year: selectedMonth.getFullYear(),
      notes: null
    };

    console.log(`Submit ${type} shift:`, data);
    createPreferenceMutation.mutate(data);
  };

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
                  <form onSubmit={(e) => handleFormSubmit(e, "day")} className="space-y-4">
                    <h3 className="font-medium">Dag Shift (7:00 - 19:00)</h3>
                    <RadioGroup value={dayShiftType} onValueChange={(value) => setDayShiftType(value as ShiftType)}>
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
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unavailable" id="day-unavailable" />
                        <Label htmlFor="day-unavailable">Ik kan niet</Label>
                      </div>
                    </RadioGroup>
                    <Button
                      type="submit"
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
                  </form>
                )}

                <form onSubmit={(e) => handleFormSubmit(e, "night")} className="space-y-4">
                  <h3 className="font-medium">Nacht Shift (19:00 - 7:00)</h3>
                  <RadioGroup value={nightShiftType} onValueChange={(value) => setNightShiftType(value as ShiftType)}>
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
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="unavailable" id="night-unavailable" />
                      <Label htmlFor="night-unavailable">Ik kan niet</Label>
                    </div>
                  </RadioGroup>
                  <Button
                    type="submit"
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
                </form>
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
                      {pref.type === "day" ? "Dag" : pref.type === "night" ? "Nacht" : "Niet beschikbaar"}
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