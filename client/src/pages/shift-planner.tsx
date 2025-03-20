import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, addMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { Home, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ShiftPreference } from "@shared/schema";

type PreferenceType = "full" | "first" | "second" | "unavailable";

export default function ShiftPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [datePreferences, setDatePreferences] = useState<Map<string, PreferenceType>>(new Map());

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

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>, date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const newValue = event.target.value as PreferenceType;
    setDatePreferences(new Map(datePreferences).set(dateKey, newValue));
  };

  const getPreferenceForDate = (date: Date): PreferenceType => {
    const dateKey = format(date, "yyyy-MM-dd");
    return datePreferences.get(dateKey) || "full";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log("Form submit", { selectedDate, preferenceType: selectedDate ? getPreferenceForDate(selectedDate) : null });

    if (!selectedDate) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een datum",
        variant: "destructive",
      });
      return;
    }

    try {
      const preferenceType = getPreferenceForDate(selectedDate);
      const testData = {
        date: selectedDate,
        type: preferenceType === "unavailable" ? "unavailable" : "day",
        startTime: preferenceType === "unavailable" ? null : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 7, 0, 0),
        endTime: preferenceType === "unavailable" ? null : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 19, 0, 0),
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
                hasPreference: (date) => getDayPreferences(date).length > 0
              }}
              modifiersClassNames={{
                hasPreference: "bg-green-100 hover:bg-green-200"
              }}
              className="rounded-md border"
              locale={nl}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voorkeuren</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <input
                      type="radio"
                      id="full"
                      name="shiftType"
                      value="full"
                      checked={getPreferenceForDate(selectedDate) === "full"}
                      onChange={(e) => handleTypeChange(e, selectedDate)}
                    />
                    <label htmlFor="full" className="ml-2">Volledige shift</label>
                  </div>
                  <div>
                    <input
                      type="radio"
                      id="first"
                      name="shiftType"
                      value="first"
                      checked={getPreferenceForDate(selectedDate) === "first"}
                      onChange={(e) => handleTypeChange(e, selectedDate)}
                    />
                    <label htmlFor="first" className="ml-2">Eerste deel</label>
                  </div>
                  <div>
                    <input
                      type="radio"
                      id="second"
                      name="shiftType"
                      value="second"
                      checked={getPreferenceForDate(selectedDate) === "second"}
                      onChange={(e) => handleTypeChange(e, selectedDate)}
                    />
                    <label htmlFor="second" className="ml-2">Tweede deel</label>
                  </div>
                  <div>
                    <input
                      type="radio"
                      id="unavailable"
                      name="shiftType"
                      value="unavailable"
                      checked={getPreferenceForDate(selectedDate) === "unavailable"}
                      onChange={(e) => handleTypeChange(e, selectedDate)}
                    />
                    <label htmlFor="unavailable" className="ml-2">Niet beschikbaar</label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={createPreferenceMutation.isPending || !selectedDate}
                  className="w-full"
                >
                  {createPreferenceMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Bezig met opslaan...
                    </>
                  ) : (
                    "Voorkeur Opslaan"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}