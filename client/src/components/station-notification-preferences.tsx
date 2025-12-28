import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Building2, Bell, Save, Loader2, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Station {
  id: number;
  name: string;
  displayName: string;
  isPrimary: boolean;
}

interface StationNotificationPreference {
  id?: number;
  userId: number;
  stationId: number;
  notifyNewPlanningPublished: boolean;
  notifyShiftSwapUpdates: boolean;
  notifyBidUpdates: boolean;
  notifyOpenSwapRequests: boolean;
  notifyShiftReminders: boolean;
}

export function StationNotificationPreferences() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [stations, setStations] = useState<Station[]>([]);
  const [preferences, setPreferences] = useState<Map<number, StationNotificationPreference>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [reminderHours, setReminderHours] = useState(user?.shiftReminderHours ?? 12);
  
  const [savedReminderHours, setSavedReminderHours] = useState(user?.shiftReminderHours ?? 12);
  
  const updateReminderHoursMutation = useMutation({
    mutationFn: async (hours: number) => {
      if (!user) return { shiftReminderHours: hours };
      const res = await apiRequest("PATCH", `/api/users/${user.id}/display-settings`, { shiftReminderHours: hours });
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Update saved state to match what was just saved
      setSavedReminderHours(variables);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Opgeslagen",
        description: "Herinneringstijd is bijgewerkt"
      });
    },
    onError: (error: Error, variables) => {
      // Reset to saved value on error
      setReminderHours(savedReminderHours);
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  useEffect(() => {
    if (user?.shiftReminderHours !== undefined) {
      setReminderHours(user.shiftReminderHours);
      setSavedReminderHours(user.shiftReminderHours);
    }
  }, [user?.shiftReminderHours]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      
      const [stationsRes, prefsRes] = await Promise.all([
        fetch('/api/push/station-preferences/stations'),
        fetch('/api/push/station-preferences')
      ]);
      
      if (stationsRes.ok) {
        const stationData = await stationsRes.json();
        setStations(stationData);
        
        const prefsMap = new Map<number, StationNotificationPreference>();
        
        if (prefsRes.ok) {
          const prefsData = await prefsRes.json();
          for (const pref of prefsData) {
            prefsMap.set(pref.stationId, pref);
          }
        }
        
        for (const station of stationData) {
          if (!prefsMap.has(station.id)) {
            prefsMap.set(station.id, {
              userId: user?.id || 0,
              stationId: station.id,
              notifyNewPlanningPublished: true,
              notifyShiftSwapUpdates: true,
              notifyBidUpdates: true,
              notifyOpenSwapRequests: true,
              notifyShiftReminders: true
            });
          }
        }
        
        setPreferences(prefsMap);
      }
    } catch (error) {
      console.error('Error loading station notification preferences:', error);
      toast({
        title: "Fout",
        description: "Kon station voorkeuren niet laden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handlePreferenceChange(stationId: number, key: keyof StationNotificationPreference, value: boolean) {
    setPreferences(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(stationId);
      if (current) {
        newMap.set(stationId, { ...current, [key]: value });
      }
      return newMap;
    });
    setHasChanges(true);
  }

  async function savePreferences() {
    try {
      setIsSaving(true);
      
      const prefsToSave = Array.from(preferences.values()).map(pref => ({
        stationId: pref.stationId,
        notifyNewPlanningPublished: pref.notifyNewPlanningPublished,
        notifyShiftSwapUpdates: pref.notifyShiftSwapUpdates,
        notifyBidUpdates: pref.notifyBidUpdates,
        notifyOpenSwapRequests: pref.notifyOpenSwapRequests,
        notifyShiftReminders: pref.notifyShiftReminders
      }));
      
      const response = await fetch('/api/push/station-preferences/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefsToSave })
      });
      
      if (response.ok) {
        toast({
          title: "Opgeslagen",
          description: "Station notificatie voorkeuren zijn bijgewerkt"
        });
        setHasChanges(false);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Fout",
        description: "Kon voorkeuren niet opslaan",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Laden...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show shift reminder slider for all users, station table only for multi-station users
  const showStationTable = stations.length > 1;

  const notificationTypes = [
    { key: 'notifyNewPlanningPublished' as const, label: 'Nieuwe Planning', description: 'Melding bij publicatie van planning' },
    { key: 'notifyShiftSwapUpdates' as const, label: 'Ruilverzoeken', description: 'Updates over ruilverzoeken' },
    { key: 'notifyBidUpdates' as const, label: 'Biedingen', description: 'Updates over shift biedingen' },
    { key: 'notifyOpenSwapRequests' as const, label: 'Open Wissels', description: 'Verzoeken van collega\'s om te wisselen' },
    { key: 'notifyShiftReminders' as const, label: 'Herinneringen', description: 'Shift herinneringen voor deze post' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {showStationTable ? 'Station Notificatie Voorkeuren' : 'Shift Herinneringen'}
        </CardTitle>
        <CardDescription>
          {showStationTable 
            ? <>Kies per station welke notificaties je wilt ontvangen. {user?.role === 'supervisor' && ' Als supervisor kun je alle stations volgen.'}</>
            : 'Stel in wanneer je een herinnering wilt ontvangen voor je shift'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Shift Reminder Hours - Global Setting */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Herinneringstijd</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Ontvang een herinnering {reminderHours === 0 ? "" : `${reminderHours} uur `}voor je shift begint
          </p>
          <div className="flex items-center gap-4">
            <Slider
              value={[reminderHours]}
              onValueChange={(value) => setReminderHours(value[0])}
              min={0}
              max={48}
              step={1}
              className="flex-1"
            />
            <span className="min-w-[60px] text-sm font-medium text-right">
              {reminderHours === 0 ? "Uit" : `${reminderHours} uur`}
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uit</span>
            <span>12u</span>
            <span>24u</span>
            <span>48u</span>
          </div>
          <Button
            onClick={() => updateReminderHoursMutation.mutate(reminderHours)}
            disabled={updateReminderHoursMutation.isPending || reminderHours === savedReminderHours}
            size="sm"
            variant="outline"
          >
            {updateReminderHoursMutation.isPending ? "Opslaan..." : "Tijd opslaan"}
          </Button>
          {reminderHours === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Je ontvangt geen shift herinneringen als deze op "Uit" staat.
            </p>
          )}
        </div>
        
        {showStationTable && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Station</th>
                    {notificationTypes.map(type => (
                      <th key={type.key} className="text-center py-2 px-2 font-medium min-w-[80px]">
                        <span className="text-xs">{type.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stations.map(station => {
                    const prefs = preferences.get(station.id);
                    return (
                      <tr key={station.id} className="border-b last:border-0">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{station.displayName}</span>
                            {station.isPrimary && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                Primair
                              </span>
                            )}
                          </div>
                        </td>
                        {notificationTypes.map(type => (
                          <td key={type.key} className="text-center py-3 px-2">
                            <Switch
                              checked={prefs?.[type.key] ?? true}
                              onCheckedChange={(checked) => handlePreferenceChange(station.id, type.key, checked)}
                              aria-label={`${type.label} voor ${station.displayName}`}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button 
                onClick={savePreferences} 
                disabled={!hasChanges || isSaving}
                className="flex-1 sm:flex-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Voorkeuren Opslaan
                  </>
                )}
              </Button>
              
              {hasChanges && (
                <span className="text-sm text-muted-foreground self-center">
                  Je hebt onopgeslagen wijzigingen
                </span>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
              <p className="flex items-center gap-1 font-medium mb-1">
                <Bell className="h-3 w-3" /> Toelichting
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><strong>Nieuwe Planning</strong>: Melding wanneer een nieuwe maandplanning wordt gepubliceerd</li>
                <li><strong>Ruilverzoeken</strong>: Updates over ingediende en goedgekeurde ruilverzoeken</li>
                <li><strong>Biedingen</strong>: Meldingen over biedingen op open shifts</li>
                <li><strong>Open Wissels</strong>: Wanneer een collega vraagt om te wisselen</li>
                <li><strong>Herinneringen</strong>: Herinnering X uur voor je shift begint bij dit station</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
