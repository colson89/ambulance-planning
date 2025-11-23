import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellOff, Send } from "lucide-react";
import {
  isPushSupported,
  getPermissionStatus,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentSubscription,
  updatePushPreferences,
  sendTestNotification
} from "@/lib/push-notifications";

interface PushSubscriptionSettings {
  id: number;
  endpoint: string;
  notifyNewPlanningPublished: boolean;
  notifyMyShiftChanged: boolean;
  notifyAvailabilityDeadline: boolean;
  deadlineWarningDays: number;
}

export function PushNotificationSettings() {
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<PushSubscriptionSettings | null>(null);

  useEffect(() => {
    checkPushStatus();
  }, []);

  async function checkPushStatus() {
    try {
      const supported = await isPushSupported();
      setIsSupported(supported);

      if (!supported) {
        setIsLoading(false);
        return;
      }

      const perm = await getPermissionStatus();
      setPermission(perm);

      const subscription = await getCurrentSubscription();
      setIsSubscribed(!!subscription);

      if (subscription) {
        // Fetch settings from server
        const response = await fetch('/api/push/subscription');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      }
    } catch (error) {
      console.error('Error checking push status:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubscribe() {
    setIsLoading(true);
    try {
      await subscribeToPushNotifications();
      await checkPushStatus();
      toast({
        title: "Notificaties Ingeschakeld",
        description: "Je ontvangt nu push notificaties voor belangrijke updates.",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Kon push notificaties niet inschakelen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUnsubscribe() {
    setIsLoading(true);
    try {
      await unsubscribeFromPushNotifications();
      setIsSubscribed(false);
      setSettings(null);
      toast({
        title: "Notificaties Uitgeschakeld",
        description: "Je ontvangt geen push notificaties meer.",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Kon push notificaties niet uitschakelen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePreferenceChange(
    key: keyof PushSubscriptionSettings,
    value: boolean | number
  ) {
    if (!settings) return;

    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      await updatePushPreferences(settings.endpoint, {
        notifyNewPlanningPublished: newSettings.notifyNewPlanningPublished,
        notifyMyShiftChanged: newSettings.notifyMyShiftChanged,
        notifyAvailabilityDeadline: newSettings.notifyAvailabilityDeadline,
        deadlineWarningDays: newSettings.deadlineWarningDays
      });

      toast({
        title: "Instellingen Opgeslagen",
        description: "Je notificatie voorkeuren zijn bijgewerkt.",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Kon instellingen niet opslaan",
        variant: "destructive",
      });
      // Revert changes on error
      await checkPushStatus();
    }
  }

  async function handleTestNotification() {
    setIsLoading(true);
    try {
      await sendTestNotification();
      toast({
        title: "Test Verzonden",
        description: "Je zou nu een test notificatie moeten ontvangen.",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Kon test notificatie niet verzenden",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notificaties
          </CardTitle>
          <CardDescription>
            Push notificaties worden niet ondersteund in deze browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notificaties
        </CardTitle>
        <CardDescription>
          Ontvang meldingen voor belangrijke updates, zelfs als de app niet open is.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSubscribed ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Schakel push notificaties in om op de hoogte te blijven van deadlines en wijzigingen.
            </p>
            <Button 
              onClick={handleSubscribe} 
              disabled={isLoading || permission === 'denied'}
              className="w-full sm:w-auto"
            >
              <Bell className="mr-2 h-4 w-4" />
              Notificaties Inschakelen
            </Button>
            {permission === 'denied' && (
              <p className="text-sm text-destructive">
                Notificaties zijn geblokkeerd. Wijzig de browser instellingen om deze functie te gebruiken.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Notificaties zijn ingeschakeld</p>
                <p className="text-sm text-muted-foreground">
                  Je ontvangt meldingen op basis van je voorkeuren hieronder.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleUnsubscribe}
                disabled={isLoading}
              >
                <BellOff className="mr-2 h-4 w-4" />
                Uitschakelen
              </Button>
            </div>

            {settings && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm">Notificatie Voorkeuren</h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-planning" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium">Nieuwe Planning Gepubliceerd</div>
                    <div className="text-xs text-muted-foreground">
                      Wanneer een nieuwe maandplanning wordt gepubliceerd
                    </div>
                  </Label>
                  <Switch
                    id="notify-planning"
                    checked={settings.notifyNewPlanningPublished}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange('notifyNewPlanningPublished', checked)
                    }
                    disabled={isLoading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-shift" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium">Mijn Dienst Gewijzigd</div>
                    <div className="text-xs text-muted-foreground">
                      Wanneer een van jouw geplande diensten wordt gewijzigd
                    </div>
                  </Label>
                  <Switch
                    id="notify-shift"
                    checked={settings.notifyMyShiftChanged}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange('notifyMyShiftChanged', checked)
                    }
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-deadline" className="flex-1 cursor-pointer">
                      <div className="text-sm font-medium">Deadline Beschikbaarheid</div>
                      <div className="text-xs text-muted-foreground">
                        Herinnering om je beschikbaarheid in te vullen
                      </div>
                    </Label>
                    <Switch
                      id="notify-deadline"
                      checked={settings.notifyAvailabilityDeadline}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange('notifyAvailabilityDeadline', checked)
                      }
                      disabled={isLoading}
                    />
                  </div>

                  {settings.notifyAvailabilityDeadline && (
                    <div className="pl-4 pt-2">
                      <Label htmlFor="deadline-days" className="text-sm">
                        Waarschuw mij
                      </Label>
                      <Select
                        value={settings.deadlineWarningDays.toString()}
                        onValueChange={(value) =>
                          handlePreferenceChange('deadlineWarningDays', parseInt(value, 10))
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger id="deadline-days" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 dag van tevoren</SelectItem>
                          <SelectItem value="2">2 dagen van tevoren</SelectItem>
                          <SelectItem value="3">3 dagen van tevoren</SelectItem>
                          <SelectItem value="5">5 dagen van tevoren</SelectItem>
                          <SelectItem value="7">1 week van tevoren</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleTestNotification}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Test Notificatie Verzenden
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
