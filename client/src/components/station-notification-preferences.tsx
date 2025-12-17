import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Bell, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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
}

export function StationNotificationPreferences() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [preferences, setPreferences] = useState<Map<number, StationNotificationPreference>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
              notifyOpenSwapRequests: true
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
        notifyOpenSwapRequests: pref.notifyOpenSwapRequests
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

  if (stations.length <= 1) {
    return null;
  }

  const notificationTypes = [
    { key: 'notifyNewPlanningPublished' as const, label: 'Nieuwe Planning', description: 'Melding bij publicatie van planning' },
    { key: 'notifyShiftSwapUpdates' as const, label: 'Ruilverzoeken', description: 'Updates over ruilverzoeken' },
    { key: 'notifyBidUpdates' as const, label: 'Biedingen', description: 'Updates over shift biedingen' },
    { key: 'notifyOpenSwapRequests' as const, label: 'Open Wissels', description: 'Verzoeken van collega\'s om te wisselen' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Station Notificatie Voorkeuren
        </CardTitle>
        <CardDescription>
          Kies per station welke notificaties je wilt ontvangen. 
          {user?.role === 'supervisor' && ' Als supervisor kun je alle stations volgen.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
