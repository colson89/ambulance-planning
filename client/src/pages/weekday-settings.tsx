import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WeekdayConfig, Station, StationSettings } from "@shared/schema";
import { Loader2, Save, Calendar, Settings, Home, ArrowLeft, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";

const WEEKDAY_NAMES = [
  "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"
];

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday order

export default function WeekdaySettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);

  // Get effective station ID - use selected station for supervisors, user station for others
  const effectiveStationId = user?.role === 'supervisor' ? selectedStationId : user?.stationId;

  // Get available stations for supervisors
  const { data: stations } = useQuery<Station[]>({
    queryKey: ["/api/user/stations"],
    enabled: user?.role === 'supervisor',
  });

  const { data: configs, isLoading, error } = useQuery<WeekdayConfig[]>({
    queryKey: ["/api/weekday-configs", effectiveStationId],
    queryFn: async () => {
      const params = effectiveStationId && user?.role === 'supervisor' 
        ? `?stationId=${effectiveStationId}` 
        : '';
      const res = await apiRequest("GET", `/api/weekday-configs${params}`);
      if (!res.ok) throw new Error("Failed to fetch weekday configs");
      return res.json();
    },
    enabled: !!effectiveStationId,
  });


  // Haal deadline configuratie op
  const { data: deadlineConfig } = useQuery({
    queryKey: ["/api/system/deadline-days", effectiveStationId],
    queryFn: async () => {
      const params = effectiveStationId && user?.role === 'supervisor' 
        ? `?stationId=${effectiveStationId}` 
        : '';
      const res = await apiRequest("GET", `/api/system/deadline-days${params}`);
      if (!res.ok) throw new Error("Kon deadline instelling niet ophalen");
      return res.json();
    },
    enabled: !!effectiveStationId,
  });

  const [deadlineDays, setDeadlineDays] = useState<number>(1);

  // Update local state when deadline config is loaded
  useEffect(() => {
    if (deadlineConfig?.days) {
      setDeadlineDays(deadlineConfig.days);
    }
  }, [deadlineConfig]);

  // Station settings query (for shift swap toggle)
  const { data: stationSettings } = useQuery<StationSettings>({
    queryKey: ["/api/station-settings", effectiveStationId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/station-settings/${effectiveStationId}`);
      if (!res.ok) throw new Error("Kon station instellingen niet ophalen");
      return res.json();
    },
    enabled: !!effectiveStationId,
  });

  // Update station settings mutation
  const updateStationSettingsMutation = useMutation({
    mutationFn: async (settings: { allowShiftSwaps: boolean }) => {
      const res = await apiRequest("PUT", `/api/station-settings/${effectiveStationId}`, settings);
      if (!res.ok) throw new Error("Kon station instellingen niet bijwerken");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/station-settings", effectiveStationId] });
      toast({
        title: "Instellingen bijgewerkt",
        description: "Station instellingen zijn opgeslagen",
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

  const updateDeadlineMutation = useMutation({
    mutationFn: async (days: number) => {
      const body = user?.role === 'supervisor' && effectiveStationId 
        ? { days, stationId: effectiveStationId }
        : { days };
      const res = await apiRequest("POST", "/api/system/deadline-days", body);
      if (!res.ok) throw new Error("Kon deadline niet bijwerken");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/deadline-days", effectiveStationId] });
      toast({
        title: "Deadline bijgewerkt",
        description: `Planning moet nu ${deadlineDays} dag(en) van tevoren worden ingediend`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij bijwerken deadline",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const initializeMutation = useMutation({
    mutationFn: async () => {
      const body = user?.role === 'supervisor' && effectiveStationId 
        ? { stationId: effectiveStationId }
        : {};
      const res = await apiRequest("POST", "/api/weekday-configs/initialize", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekday-configs", effectiveStationId] });
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
      const requestBody = user?.role === 'supervisor' && effectiveStationId 
        ? { ...config, stationId: effectiveStationId }
        : config;
      const res = await apiRequest("PUT", `/api/weekday-configs/${dayOfWeek}`, requestBody);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekday-configs", effectiveStationId] });
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

  if (error || !configs || configs.length === 0) {
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

        {/* Station selector for supervisors */}
        {user?.role === 'supervisor' && (
          <div className="mb-6">
            <Label className="text-base font-medium">Selecteer Station</Label>
            <Select 
              value={selectedStationId?.toString() || ""} 
              onValueChange={(value) => setSelectedStationId(parseInt(value))}
            >
              <SelectTrigger className="w-[300px] mt-2">
                <SelectValue placeholder="Kies een station om instellingen te beheren..." />
              </SelectTrigger>
              <SelectContent>
                {(stations as Station[])
                  ?.filter(station => station.id !== 8) // Exclude supervisor station
                  ?.map((station) => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.displayName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {effectiveStationId && (
          <>
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
          </>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="outline"
          onClick={() => setLocation("/dashboard")}
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

      {/* Station selector for supervisors */}
      {user?.role === 'supervisor' && (
        <div className="mb-6">
          <Label className="text-base font-medium">Selecteer Station</Label>
          <Select 
            value={selectedStationId?.toString() || ""} 
            onValueChange={(value) => setSelectedStationId(parseInt(value))}
          >
            <SelectTrigger className="w-[300px] mt-2">
              <SelectValue placeholder="Kies een station om instellingen te beheren..." />
            </SelectTrigger>
            <SelectContent>
              {(stations as Station[])
                ?.filter(station => station.id !== 8) // Exclude supervisor station
                ?.map((station) => (
                  <SelectItem key={station.id} value={station.id.toString()}>
                    {station.displayName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Deadline Configuration Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Deadline Configuratie
          </CardTitle>
          <CardDescription>
            Stel in hoeveel dagen van tevoren de planning moet worden ingediend
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="deadline-days">Dagen van tevoren (1-60)</Label>
              <Input
                id="deadline-days"
                type="number"
                min="1"
                max="60"
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(parseInt(e.target.value) || 1)}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Planning moet {deadlineDays} dag(en) voor de 1e van de volgende maand om 23:00 worden ingediend
                <br />
                <span className="text-xs text-gray-500">(Minimum: 1 dag, Maximum: 60 dagen)</span>
              </p>
            </div>
            <Button
              onClick={() => updateDeadlineMutation.mutate(deadlineDays)}
              disabled={updateDeadlineMutation.isPending || deadlineDays < 1 || deadlineDays > 60}
              className="flex items-center gap-2"
            >
              {updateDeadlineMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Opslaan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Split Shifts Configuration Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Beschikbaarheids Opties
          </CardTitle>
          <CardDescription>
            Kies welke opties gebruikers hebben bij het aangeven van hun beschikbaarheid
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Beschikbaarheids modus</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="simple-mode"
                    checked={!configs[0]?.allowSplitShifts}
                    onCheckedChange={(checked) => {
                      // Update all weekday configs for this station
                      configs.forEach(config => {
                        handleConfigUpdate(config.dayOfWeek, { allowSplitShifts: !checked });
                      });
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="simple-mode"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Eenvoudig systeem
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Alleen "Volledig beschikbaar" en "Niet beschikbaar"
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="advanced-mode"
                    checked={!!configs[0]?.allowSplitShifts}
                    onCheckedChange={(checked) => {
                      // Update all weekday configs for this station
                      configs.forEach(config => {
                        handleConfigUpdate(config.dayOfWeek, { allowSplitShifts: checked });
                      });
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="advanced-mode"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Uitgebreid systeem
                    </label>
                    <p className="text-xs text-muted-foreground">
                      "Volledig beschikbaar", "Niet beschikbaar", "Eerste deel", "Tweede deel"
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${
                  configs[0]?.allowSplitShifts 
                    ? 'bg-blue-500' 
                    : 'bg-green-500'
                }`} />
                {configs[0]?.allowSplitShifts 
                  ? 'Uitgebreid systeem actief - gebruikers kunnen gedeeltelijke beschikbaarheid aangeven'
                  : 'Eenvoudig systeem actief - alleen volledig beschikbaar of niet beschikbaar'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feestdagen Link Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Feestdagen
          </CardTitle>
          <CardDescription>
            Beheer feestdagen en speciale dagen voor de planning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline"
            onClick={() => setLocation("/holidays")}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Ga naar Feestdagen Beheer
          </Button>
        </CardContent>
      </Card>

      {/* Shift Ruilen Configuration Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Shift Ruilen
          </CardTitle>
          <CardDescription>
            Sta gebruikers toe om shifts onderling te ruilen (met goedkeuring van admin/supervisor)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allow-shift-swaps" className="text-base font-medium">
                Shift ruilen inschakelen
              </Label>
              <p className="text-sm text-muted-foreground">
                Wanneer ingeschakeld kunnen ambulanciers een verzoek indienen om hun shift te ruilen met een collega. 
                Elke ruil moet eerst goedgekeurd worden door een admin of supervisor.
              </p>
            </div>
            <Switch
              id="allow-shift-swaps"
              checked={stationSettings?.allowShiftSwaps || false}
              onCheckedChange={(checked) => {
                updateStationSettingsMutation.mutate({ allowShiftSwaps: checked });
              }}
              disabled={updateStationSettingsMutation.isPending}
            />
          </div>
          <div className="pt-4 mt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${
                stationSettings?.allowShiftSwaps 
                  ? 'bg-green-500' 
                  : 'bg-gray-400'
              }`} />
              {stationSettings?.allowShiftSwaps 
                ? 'Shift ruilen is ingeschakeld - gebruikers kunnen ruilverzoeken indienen'
                : 'Shift ruilen is uitgeschakeld - gebruikers kunnen geen ruilverzoeken indienen'
              }
            </div>
          </div>
        </CardContent>
      </Card>

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