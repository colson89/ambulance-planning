import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowRight, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Station } from "@shared/schema";

export default function StationSelect() {
  const [, setLocation] = useLocation();
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const { data: stations, isLoading } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stations");
      if (!res.ok) throw new Error("Kon stations niet ophalen");
      return res.json();
    },
  });

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    // Sla de geselecteerde station op in sessionStorage
    sessionStorage.setItem("selectedStation", JSON.stringify(station));
    // Ga naar auth pagina met station context
    setLocation("/auth");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Ambulance Planning Systeem</h1>
          <p className="text-lg text-gray-600">
            Selecteer uw brandweerpost om door te gaan
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stations?.map((station) => (
            <Card 
              key={station.id} 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => handleStationSelect(station)}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">{station.displayName}</CardTitle>
                <CardDescription>
                  Code: <Badge variant="secondary">{station.code}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  variant="outline" 
                  className="w-full group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStationSelect(station);
                  }}
                >
                  Selecteren
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!stations || stations.length === 0) && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Geen stations beschikbaar
            </h3>
            <p className="text-gray-600">
              Er zijn nog geen brandweerposten geconfigureerd in het systeem.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}