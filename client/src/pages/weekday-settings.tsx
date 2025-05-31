import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WeekdayConfig } from "@shared/schema";
import { Loader2, Save, Calendar, Settings, Home, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";

const WEEKDAY_NAMES = [
  "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"
];

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday order

export default function WeekdaySettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const { data: configs, isLoading, error } = useQuery<WeekdayConfig[]>({
    queryKey: ["/api/weekday-configs"],
  });

  const initializeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/weekday-configs/initialize");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekday-configs"] });
      toast({
        title: "Configuratie geïnitialiseerd",
        description: "Standaard weekdag configuraties zijn ingesteld",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij initialiseren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ dayOfWeek, config }: { dayOfWeek: number; config: Partial<WeekdayConfig> }) => {
      const res = await apiRequest("PUT", `/api/weekday-configs/${dayOfWeek}`, config);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekday-configs"] });
      toast({
        title: "Configuratie opgeslagen",
        description: "Weekdag instellingen zijn bijgewerkt",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij opslaan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfigUpdate = (dayOfWeek: number, updates: Partial<WeekdayConfig>) => {
    updateMutation.mutate({ dayOfWeek, config: updates });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (error || !configs) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Weekdag Instellingen
            </h1>
            <p className="text-muted-foreground mt-2">
              Configureer welke shifts per weekdag gegenereerd moeten worden
            </p>
          </div>
        </div>

        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            Er zijn nog geen weekdag configuraties ingesteld. Klik op "Initialiseren" om de standaard instellingen aan te maken.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={() => initializeMutation.mutate()} 
          disabled={initializeMutation.isPending}
          className="mt-6"
          size="lg"
        >
          {initializeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Settings className="mr-2 h-4 w-4" />
          Standaard Configuraties Initialiseren
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="outline"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Weekdag Instellingen
          </h1>
          <p className="text-muted-foreground mt-2">
            Configureer welke shifts per weekdag gegenereerd moeten worden
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {WEEKDAY_ORDER.map((dayOfWeek, index) => {
          const dayName = WEEKDAY_NAMES[index];
          const config = configs.find(c => c.dayOfWeek === dayOfWeek);
          if (!config) return null;

          return (
            <Card key={dayOfWeek}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {dayName}
                </CardTitle>
                <CardDescription>
                  Instellingen voor {dayName.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dagshifts */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`day-shifts-${dayOfWeek}`} className="text-base font-medium">
                        Dagshifts (07:00-19:00)
                      </Label>
                      <Switch
                        id={`day-shifts-${dayOfWeek}`}
                        checked={config.enableDayShifts}
                        onCheckedChange={(checked) => 
                          handleConfigUpdate(dayOfWeek, { enableDayShifts: checked })
                        }
                      />
                    </div>
                    
                    {config.enableDayShifts && (
                      <div className="space-y-2">
                        <Label htmlFor={`day-count-${dayOfWeek}`}>
                          Aantal dagshifts
                        </Label>
                        <Input
                          id={`day-count-${dayOfWeek}`}
                          type="number"
                          min="1"
                          max="5"
                          value={config.dayShiftCount}
                          onChange={(e) => 
                            handleConfigUpdate(dayOfWeek, { dayShiftCount: parseInt(e.target.value) })
                          }
                          className="w-20"
                        />
                      </div>
                    )}
                  </div>

                  {/* Nachtshifts */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`night-shifts-${dayOfWeek}`} className="text-base font-medium">
                        Nachtshifts (19:00-07:00)
                      </Label>
                      <Switch
                        id={`night-shifts-${dayOfWeek}`}
                        checked={config.enableNightShifts}
                        onCheckedChange={(checked) => 
                          handleConfigUpdate(dayOfWeek, { enableNightShifts: checked })
                        }
                      />
                    </div>
                    
                    {config.enableNightShifts && (
                      <div className="space-y-2">
                        <Label htmlFor={`night-count-${dayOfWeek}`}>
                          Aantal nachtshifts
                        </Label>
                        <Input
                          id={`night-count-${dayOfWeek}`}
                          type="number"
                          min="1"
                          max="5"
                          value={config.nightShiftCount}
                          onChange={(e) => 
                            handleConfigUpdate(dayOfWeek, { nightShiftCount: parseInt(e.target.value) })
                          }
                          className="w-20"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status indicator */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className={`w-2 h-2 rounded-full ${
                      config.enableDayShifts || config.enableNightShifts 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`} />
                    {config.enableDayShifts && config.enableNightShifts 
                      ? `${config.dayShiftCount} dagshifts + ${config.nightShiftCount} nachtshifts`
                      : config.enableDayShifts 
                        ? `Alleen ${config.dayShiftCount} dagshifts`
                        : config.enableNightShifts
                          ? `Alleen ${config.nightShiftCount} nachtshifts`
                          : 'Geen shifts'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert className="mt-8">
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          <strong>Let op:</strong> Wijzigingen worden direct opgeslagen en zijn van toepassing op nieuwe planningen. 
          Bestaande planningen worden niet automatisch aangepast.
        </AlertDescription>
      </Alert>
    </div>
  );
}