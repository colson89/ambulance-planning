import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Calendar, Clock, LogOut, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Shift } from "@shared/schema";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: shifts, isLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const dayShifts = shifts?.filter(s => s.type === 'day').length || 0;
  const totalHours = shifts?.reduce((acc, s) => {
    const duration = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
    return acc + (duration / (1000 * 60 * 60));
  }, 0) || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          {user?.isAdmin && (
            <Button 
              variant="outline"
              onClick={() => setLocation("/users")}
            >
              <UserCog className="h-4 w-4 mr-2" />
              Gebruikersbeheer
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => setLocation("/shifts")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Shift Planner
          </Button>
          <Button 
            variant="outline" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Uitloggen
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rol</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.isAdmin ? "Administrator" : "Staff"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dag Diensten</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dayShifts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totaal Uren</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalHours)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}