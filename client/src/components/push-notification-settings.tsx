import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellOff, Send, ChevronDown, HelpCircle } from "lucide-react";
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
  notifyShiftSwapUpdates: boolean;
  notifyBidUpdates: boolean;
  deadlineWarningDays: number;
}

export function PushNotificationSettings() {
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<PushSubscriptionSettings | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
        notifyShiftSwapUpdates: newSettings.notifyShiftSwapUpdates,
        notifyBidUpdates: newSettings.notifyBidUpdates,
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

                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-swap" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium">Ruilverzoek Updates</div>
                    <div className="text-xs text-muted-foreground">
                      Wanneer je ruilverzoek wordt goedgekeurd of afgewezen
                    </div>
                  </Label>
                  <Switch
                    id="notify-swap"
                    checked={settings.notifyShiftSwapUpdates}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange('notifyShiftSwapUpdates', checked)
                    }
                    disabled={isLoading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-bid" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium">Bieding Updates</div>
                    <div className="text-xs text-muted-foreground">
                      Wanneer je bieding op een open shift wordt geaccepteerd of afgewezen
                    </div>
                  </Label>
                  <Switch
                    id="notify-bid"
                    checked={settings.notifyBidUpdates}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange('notifyBidUpdates', checked)
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

        {/* Handleiding sectie - altijd zichtbaar */}
        <div className="pt-4 border-t">
          <Collapsible open={isHelpOpen} onOpenChange={setIsHelpOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Handleiding: Problemen met notificaties oplossen
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isHelpOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 mt-4">
              
              {/* Android */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-base mb-2">📱 Android - Probleemoplossing</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm mb-1">Stap 1: Controleer Browser Instellingen</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Open Chrome → Tik op <strong>⋮</strong> → <strong>Instellingen</strong></li>
                      <li>Ga naar <strong>Site-instellingen</strong> → <strong>Notificaties</strong></li>
                      <li>Zoek deze website en zet op <strong>"Toestaan"</strong></li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1">Stap 2: Controleer Systeem Notificaties</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Ga naar <strong>Instellingen</strong> → <strong>Apps</strong> → <strong>Chrome</strong></li>
                      <li>Tik op <strong>Notificaties</strong> → Zet <strong>AAN</strong></li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1">Stap 3: Controleer Batterij Optimalisatie</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Ga naar <strong>Instellingen</strong> → <strong>Apps</strong> → <strong>Chrome</strong></li>
                      <li>Tik op <strong>Batterij</strong> → Selecteer <strong>"Niet beperken"</strong></li>
                    </ol>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      💡 <strong>Tip:</strong> Installeer de app via Chrome → <strong>⋮</strong> → <strong>"Installeren"</strong> voor de beste ervaring.
                    </p>
                  </div>
                </div>
              </div>

              {/* iPhone/iPad */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold text-base mb-2">🍎 iPhone/iPad (iOS) - Probleemoplossing</h3>
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-900 mb-1">⚠️ Belangrijk voor iOS</p>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• Vereist <strong>iOS 16.4</strong> of nieuwer</li>
                      <li>• Werkt <strong>ALLEEN</strong> in Safari (niet Chrome/Firefox)</li>
                      <li>• De app <strong>MOET</strong> worden geïnstalleerd als PWA</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1">App Installeren (verplicht voor iOS):</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Open deze website in <strong>Safari</strong></li>
                      <li>Tik op het <strong>Deel-icoon</strong> (vierkant met pijl omhoog)</li>
                      <li>Scroll naar beneden → <strong>"Zet op beginscherm"</strong></li>
                      <li>Open de app vanaf je beginscherm</li>
                      <li>Schakel notificaties in via Profiel</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1">Controleer iOS Instellingen:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Ga naar <strong>Instellingen</strong> → <strong>Notificaties</strong></li>
                      <li>Zoek de Planning app → Zet <strong>"Sta toe"</strong> AAN</li>
                      <li>Check <strong>Focus</strong> modus → Voeg app toe aan uitzonderingen</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Desktop */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-base mb-2">💻 Windows/Mac/Linux - Probleemoplossing</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm mb-1">Browser Toestemming Controleren:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Klik op het <strong>slot-icoon</strong> links van de URL</li>
                      <li>Zoek <strong>"Notificaties"</strong></li>
                      <li>Zet op <strong>"Toestaan"</strong></li>
                      <li>Herlaad de pagina</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1">Systeem Notificaties (Windows):</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Ga naar <strong>Instellingen</strong> → <strong>Systeem</strong> → <strong>Notificaties</strong></li>
                      <li>Zet notificaties <strong>AAN</strong></li>
                      <li>Zoek je browser en zet die ook <strong>AAN</strong></li>
                      <li>Controleer <strong>Focushulp</strong> - zet uit of voeg browser toe</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1">Systeem Notificaties (Mac):</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Ga naar <strong>Systeemvoorkeuren</strong> → <strong>Berichtgeving</strong></li>
                      <li>Zoek je browser in de lijst</li>
                      <li>Zet <strong>"Sta berichtgeving toe"</strong> AAN</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Algemene checklist */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">✅ Snelle Checklist</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>☐ Notificaties ingeschakeld in de app (hierboven)</li>
                  <li>☐ Browser toestemming gegeven (klik "Toestaan")</li>
                  <li>☐ Minstens één notificatie type AAN gezet</li>
                  <li>☐ Systeem notificaties aan voor browser</li>
                  <li>☐ Niet storen / Focus modus UIT</li>
                  <li>☐ (Android) Batterij optimalisatie uit voor browser</li>
                  <li>☐ (iOS) App geïnstalleerd via Safari → Deel → Beginscherm</li>
                </ul>
              </div>

              {/* Opnieuw proberen */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900 mb-1">🔄 Werkt het nog steeds niet?</p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Klik hierboven op <strong>"Uitschakelen"</strong></li>
                  <li>Wacht 5 seconden</li>
                  <li>Klik op <strong>"Notificaties Inschakelen"</strong></li>
                  <li>Geef opnieuw toestemming</li>
                  <li>Test met de <strong>"Test Notificatie"</strong> knop</li>
                </ol>
              </div>

            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}
