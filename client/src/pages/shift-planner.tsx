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

  // Ophalen van voorkeuren
  const { data: preferences = [] } = useQuery<ShiftPreference[]>({
    queryKey: ["/api/preferences", selectedMonth.getMonth() + 1, selectedMonth.getFullYear()],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/preferences?month=${selectedMonth.getMonth() + 1}&year=${selectedMonth.getFullYear()}`);
      if (!res.ok) throw new Error("Kon voorkeuren niet ophalen");
      return res.json();
    },
    enabled: !!user,
  });

  // Voorkeur aanmaken
  const createPreferenceMutation = useMutation({
    mutationFn: async (data: {
      date: string;
      type: "day" | "night" | "unavailable";
      startTime?: string;
      endTime?: string;
      canSplit: boolean;
      month: number;
      year: number;
      notes: string | null;
    }) => {
      console.log("Versturen van voorkeur data:", data);
      const res = await apiRequest("POST", "/api/preferences", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Er is een fout opgetreden");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({
        title: "Succes",
        description: "Uw voorkeur is succesvol opgeslagen",
      });
    },
    onError: (error: Error) => {
      console.error("Fout bij opslaan voorkeur:", error);
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het opslaan van uw voorkeur",
        variant: "destructive",
      });
    },
  });

  // Voorkeur verwijderen
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

  // Handler voor het opslaan van een voorkeur
  const handleSubmitPreference = async (type: "day" | "night") => {
    if (!selectedDate) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een datum",
        variant: "destructive",
      });
      return;
    }

    const selectedType = type === "day" ? dayShiftType : nightShiftType;

    // Als "niet beschikbaar" is geselecteerd
    if (selectedType === "unavailable") {
      createPreferenceMutation.mutate({
        date: selectedDate.toISOString(),
        type: "unavailable",
        canSplit: false,
        month: selectedMonth.getMonth() + 1,
        year: selectedMonth.getFullYear(),
        notes: "Niet beschikbaar"
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

    // Bepaal start- en eindtijd
    const shiftDate = new Date(selectedDate);
    let startTime = new Date(shiftDate);
    let endTime = new Date(shiftDate);

    if (type === "day") {
      startTime.setHours(7, 0, 0, 0);
      if (selectedType === "full") {
        endTime.setHours(19, 0, 0, 0);
      } else if (selectedType === "first") {
        endTime.setHours(13, 0, 0, 0);
      } else {
        endTime.setHours(19, 0, 0, 0);
      }
    } else {
      startTime.setHours(19, 0, 0, 0);
      if (selectedType === "full" || selectedType === "second") {
        const nextDay = new Date(shiftDate);
        nextDay.setDate(nextDay.getDate() + 1);
        endTime = nextDay;
        endTime.setHours(7, 0, 0, 0);
      } else {
        endTime.setHours(21, 0, 0, 0);
      }
    }

    // Maak de voorkeur aan
    createPreferenceMutation.mutate({
      date: shiftDate.toISOString(),
      type,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      canSplit: selectedType !== "full",
      month: selectedMonth.getMonth() + 1,
      year: selectedMonth.getFullYear(),
      notes: null
    });
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
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unavailable" id="day-unavailable" />
                        <Label htmlFor="day-unavailable">Ik kan niet</Label>
                      </div>
                    </RadioGroup>
                    <Button
                      onClick={() => handleSubmitPreference("day")}
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
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="unavailable" id="night-unavailable" />
                      <Label htmlFor="night-unavailable">Ik kan niet</Label>
                    </div>
                  </RadioGroup>
                  <Button
                    onClick={() => handleSubmitPreference("night")}
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