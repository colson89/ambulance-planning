import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, addMonths, startOfMonth, setHours, setMinutes } from "date-fns";
import { nl } from "date-fns/locale";
import { Home } from "lucide-react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export default function ShiftPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState(addMonths(new Date(), 1));
  const [splitShift, setSplitShift] = useState({
    day: false,
    night: false
  });

  // Get user's shift preferences for selected month
  const { data: preferences = [], isLoading: preferencesLoading } = useQuery<PreferenceResponse[]>({
    queryKey: ["/api/preferences", selectedMonth.getMonth() + 1, selectedMonth.getFullYear()],
    enabled: !!user,
  });

  const createPreferenceMutation = useMutation({
    mutationFn: async (preference: ShiftPreference) => {
      const res = await apiRequest("POST", "/api/preferences", preference);
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

  // Check if we're past the deadline for next month's preferences
  const today = new Date();
  const nextMonth = addMonths(startOfMonth(today), 1);
  const deadline = new Date(today.getFullYear(), today.getMonth() + 1, 19, 23, 0);
  const isPastDeadline = today > deadline;

  const handlePreferenceSubmit = (type: "day" | "night", canSplit: boolean) => {
    if (!selectedDate || !user) return;

    let startTime, endTime;
    if (type === "day") {
      startTime = setHours(setMinutes(selectedDate, 0), 7);
      endTime = setHours(setMinutes(selectedDate, 0), 19);
    } else {
      startTime = setHours(setMinutes(selectedDate, 0), 19);
      endTime = setHours(setMinutes(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000), 0), 7);
    }

    const preference: ShiftPreference = {
      date: selectedDate,
      type,
      startTime,
      endTime,
      canSplit: type === "day" ? splitShift.day : splitShift.night,
      userId: user.id,
      month: selectedMonth.getMonth() + 1,
      year: selectedMonth.getFullYear()
    };

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

      {isPastDeadline && (
        <Alert className="mb-6">
          <AlertDescription>
            De deadline voor het opgeven van voorkeuren voor volgende maand ({format(nextMonth, "MMMM yyyy", { locale: nl })}) 
            is verstreken (19e van de maand, 23:00).
          </AlertDescription>
        </Alert>
      )}

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
              disabled={isPastDeadline}
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Voorkeuren</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Dag Shift (7:00 - 19:00)</h3>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="split-day"
                  checked={splitShift.day}
                  onCheckedChange={(checked) => setSplitShift(prev => ({ ...prev, day: checked as boolean }))}
                  disabled={!selectedDate || isPastDeadline}
                />
                <label htmlFor="split-day" className="text-sm">
                  Kan gesplitst worden (7:00-13:00 / 13:00-19:00)
                </label>
              </div>
              <Button
                onClick={() => handlePreferenceSubmit("day", splitShift.day)}
                disabled={!selectedDate || isPastDeadline || preferencesLoading}
                className="w-full"
              >
                Voorkeur Opgeven voor Dag Shift
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Nacht Shift (19:00 - 7:00)</h3>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="split-night"
                  checked={splitShift.night}
                  onCheckedChange={(checked) => setSplitShift(prev => ({ ...prev, night: checked as boolean }))}
                  disabled={!selectedDate || isPastDeadline}
                />
                <label htmlFor="split-night" className="text-sm">
                  Kan gesplitst worden (19:00-21:00 / 21:00-7:00)
                </label>
              </div>
              <Button
                onClick={() => handlePreferenceSubmit("night", splitShift.night)}
                disabled={!selectedDate || isPastDeadline || preferencesLoading}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}