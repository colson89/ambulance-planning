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
import { Home, Trash2, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ShiftPreference } from "@shared/schema";

export default function ShiftPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedType, setSelectedType] = useState<"full" | "first" | "second" | "unavailable">("full");

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
      console.log("Submitting preference:", data);
      const res = await apiRequest("POST", "/api/preferences", data);
      if (!res.ok) throw new Error("Kon voorkeur niet opslaan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({
        title: "Succes",
        description: "Voorkeur opgeslagen",
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

  const handleSubmit = async (event: React.FormEvent, type: "day" | "night") => {
    event.preventDefault();
    console.log("Form submitted", { type, selectedType, selectedDate });

    if (!selectedDate) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een datum",
        variant: "destructive",
      });
      return;
    }

    if (type === "day" && !isWeekend(selectedDate)) {
      toast({
        title: "Niet toegestaan",
        description: "Dagshiften kunnen alleen in het weekend worden opgegeven.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (selectedType === "unavailable") {
        await createPreferenceMutation.mutateAsync({
          date: selectedDate.toISOString(),
          type: "unavailable",
          canSplit: false,
          month: selectedMonth.getMonth() + 1,
          year: selectedMonth.getFullYear(),
          notes: "Niet beschikbaar"
        });
        return;
      }

      const startTime = new Date(selectedDate);
      const endTime = new Date(selectedDate);

      if (type === "day") {
        startTime.setHours(7, 0, 0, 0);
        endTime.setHours(selectedType === "full" ? 19 : selectedType === "first" ? 13 : 19, 0, 0, 0);
      } else {
        startTime.setHours(19, 0, 0, 0);
        if (selectedType === "full" || selectedType === "second") {
          endTime.setDate(endTime.getDate() + 1);
          endTime.setHours(7, 0, 0, 0);
        } else {
          endTime.setHours(21, 0, 0, 0);
        }
      }

      await createPreferenceMutation.mutateAsync({
        date: selectedDate.toISOString(),
        type,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        canSplit: selectedType !== "full",
        month: selectedMonth.getMonth() + 1,
        year: selectedMonth.getFullYear(),
        notes: null
      });
    } catch (error) {
      console.error("Error submitting preference:", error);
    }
  };

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
                  <form onSubmit={(e) => handleSubmit(e, "day")} className="space-y-4">
                    <h3 className="font-medium">Dag Shift (7:00 - 19:00)</h3>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dayShift"
                          value="full"
                          checked={selectedType === "full"}
                          onChange={(e) => setSelectedType(e.target.value as "full")}
                          className="rounded-full"
                        />
                        <span>Volledige shift (7:00-19:00)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dayShift"
                          value="first"
                          checked={selectedType === "first"}
                          onChange={(e) => setSelectedType(e.target.value as "first")}
                          className="rounded-full"
                        />
                        <span>Eerste deel (7:00-13:00)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dayShift"
                          value="second"
                          checked={selectedType === "second"}
                          onChange={(e) => setSelectedType(e.target.value as "second")}
                          className="rounded-full"
                        />
                        <span>Tweede deel (13:00-19:00)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dayShift"
                          value="unavailable"
                          checked={selectedType === "unavailable"}
                          onChange={(e) => setSelectedType(e.target.value as "unavailable")}
                          className="rounded-full"
                        />
                        <span>Ik kan niet</span>
                      </label>
                    </div>
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

                <form onSubmit={(e) => handleSubmit(e, "night")} className="space-y-4">
                  <h3 className="font-medium">Nacht Shift (19:00 - 7:00)</h3>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="nightShift"
                        value="full"
                        checked={selectedType === "full"}
                        onChange={(e) => setSelectedType(e.target.value as "full")}
                        className="rounded-full"
                      />
                      <span>Volledige shift (19:00-7:00)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="nightShift"
                        value="first"
                        checked={selectedType === "first"}
                        onChange={(e) => setSelectedType(e.target.value as "first")}
                        className="rounded-full"
                      />
                      <span>Eerste deel (19:00-21:00)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="nightShift"
                        value="second"
                        checked={selectedType === "second"}
                        onChange={(e) => setSelectedType(e.target.value as "second")}
                        className="rounded-full"
                      />
                      <span>Tweede deel (21:00-7:00)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="nightShift"
                        value="unavailable"
                        checked={selectedType === "unavailable"}
                        onChange={(e) => setSelectedType(e.target.value as "unavailable")}
                        className="rounded-full"
                      />
                      <span>Ik kan niet</span>
                    </label>
                  </div>
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