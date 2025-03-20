import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { Home } from "lucide-react";
import { useLocation } from "wouter";

// Define the InsertShift schema inline since it's specific to this component
const insertShiftSchema = z.object({
  userId: z.number(),
  date: z.date(),
  startTime: z.date(),
  endTime: z.date(),
  type: z.string()
});

type InsertShift = z.infer<typeof insertShiftSchema>;

export default function ShiftPlanner() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: InsertShift) => {
      const res = await apiRequest("POST", "/api/shifts", shiftData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Success",
        description: "Shift has been scheduled",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddShift = () => {
    if (!date || !user) return;

    const shift: InsertShift = {
      userId: user.id,
      date: date,
      startTime: new Date(date.setHours(9, 0, 0)),
      endTime: new Date(date.setHours(17, 0, 0)),
      type: "day"
    };

    createShiftMutation.mutate(shift);
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Schedule Shift</h2>
            <Button 
              onClick={handleAddShift}
              disabled={!date || createShiftMutation.isPending}
            >
              Add Day Shift
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}