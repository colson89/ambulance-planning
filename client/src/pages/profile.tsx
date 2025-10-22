import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Home, Calendar, Copy, RefreshCw, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const preferencesSchema = z.object({
  maxHours: z.number().min(0).max(168),
  preferredHours: z.number().min(0).max(168)
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Huidig wachtwoord is verplicht"),
  newPassword: z.string().min(6, "Nieuw wachtwoord moet minimaal 6 karakters bevatten"),
  confirmPassword: z.string().min(1, "Bevestig het nieuwe wachtwoord")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
});

// Component to show admin contact information
function AdminContactList() {
  const { data: admins = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admins/contact"],
    queryFn: async () => {
      const res = await fetch('/api/admins/contact');
      if (!res.ok) {
        throw new Error('Kon administrator contactgegevens niet ophalen');
      }
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <p className="text-xs text-blue-700">
        Laden...
      </p>
    );
  }

  if (admins.length === 0) {
    return (
      <p className="text-xs text-blue-700">
        Geen administrators gevonden.
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-blue-700 mb-1">Administrators:</p>
      <ul className="text-xs text-blue-700 space-y-1">
        {admins.map(admin => (
          <li key={admin.id} className="flex items-center">
            <span className="font-medium">
              {admin.firstName} {admin.lastName}
            </span>
            <span className="text-blue-600 ml-1">
              ({admin.username})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const preferencesForm = useForm({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      maxHours: user?.maxHours || 40,
      preferredHours: user?.preferredHours || 32
    }
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: z.infer<typeof preferencesSchema>) => {
      const res = await apiRequest("PATCH", `/api/users/${user!.id}/preferences`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Voorkeuren bijgewerkt",
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

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordSchema>) => {
      // Voor admins: stuur alleen password, voor gewone users: currentPassword + newPassword
      const payload = user?.role === 'admin' 
        ? { password: data.newPassword }
        : { currentPassword: data.currentPassword, newPassword: data.newPassword };
        
      const res = await apiRequest("PATCH", `/api/users/${user!.id}/password`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Wachtwoord bijgewerkt",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calendar token query
  const { data: calendarData, isLoading: isLoadingCalendar } = useQuery<{token: string, url: string}>({
    queryKey: ["/api/calendar/token"],
    retry: false
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calendar/token/regenerate", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/token"] });
      toast({
        title: "Link Vernieuwd",
        description: "Je kalender link is vernieuwd. Oude links werken niet meer.",
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

  const copyCalendarLink = () => {
    if (calendarData?.url) {
      navigator.clipboard.writeText(calendarData.url);
      toast({
        title: "Gekopieerd!",
        description: "Kalender link is gekopieerd naar je klembord",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Profiel</h1>
        <Button
          variant="outline"
          onClick={() => setLocation("/dashboard")}
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Werk Voorkeuren</CardTitle>
          </CardHeader>
          <CardContent>
            {user?.role === 'admin' ? (
              <Form {...preferencesForm}>
                <form onSubmit={preferencesForm.handleSubmit((data) => updatePreferencesMutation.mutate(data))} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Maximum Uren per Week</label>
                    <Input
                      type="number"
                      {...preferencesForm.register("maxHours", { valueAsNumber: true })}
                    />
                  </div>



                  <Button 
                    type="submit"
                    disabled={updatePreferencesMutation.isPending}
                  >
                    Voorkeuren Opslaan
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Maximum Uren per Maand</label>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {user?.hours || 0} uren
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Door administrator ingesteld</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Gebruikersrol</label>
                  <div className="text-lg font-medium text-gray-900 mt-1 capitalize">
                    {user?.role === 'admin' ? 'Administrator' : 
                     user?.role === 'supervisor' ? 'Supervisor' : 
                     'Ambulancier'}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 mb-2">
                    Je werkuren worden beheerd door de administrator. 
                    Neem contact op met de administrator als je dit wilt veranderen.
                  </p>
                  <AdminContactList />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wachtwoord Wijzigen</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Huidig Wachtwoord</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nieuw Wachtwoord</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bevestig Nieuw Wachtwoord</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit"
                  disabled={updatePasswordMutation.isPending}
                >
                  {updatePasswordMutation.isPending ? "Wijzigen..." : "Wachtwoord Wijzigen"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card data-testid="card-calendar-sync">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Kalender Synchronisatie
            </CardTitle>
            <CardDescription>
              Synchroniseer je shifts automatisch met je favoriete kalender app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingCalendar ? (
              <p className="text-sm text-muted-foreground">Laden...</p>
            ) : calendarData ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jouw persoonlijke kalender link</label>
                  <div className="flex gap-2">
                    <Input 
                      value={calendarData.url} 
                      readOnly 
                      className="font-mono text-sm"
                      data-testid="input-calendar-url"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={copyCalendarLink}
                      data-testid="button-copy-calendar-link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deze link is persoonlijk en beveiligd. Deel deze link niet met anderen.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => regenerateTokenMutation.mutate()}
                    disabled={regenerateTokenMutation.isPending}
                    data-testid="button-regenerate-token"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {regenerateTokenMutation.isPending ? "Bezig..." : "Nieuwe Link Genereren"}
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    💡 Hoe werkt het?
                  </p>
                  <p className="text-sm text-blue-800">
                    Voeg deze link toe aan je kalender app (Google Calendar, Outlook, Apple Agenda). 
                    Je shifts worden automatisch gesynchroniseerd en blijven up-to-date.
                  </p>
                </div>

                <Collapsible open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between" data-testid="button-toggle-instructions">
                      Handleiding: Link toevoegen aan je kalender
                      <ChevronDown className={`h-4 w-4 transition-transform ${isInstructionsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-6 mt-4">
                    {/* Google Calendar */}
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h3 className="font-semibold text-base mb-2">📅 Google Calendar</h3>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-sm mb-1">🖥️ Via Website/Computer (aanbevolen):</p>
                          <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>Open <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Calendar</a> op je computer</li>
                            <li>Klik aan de <strong>linkerkant</strong> op het <strong>+</strong> icoon naast "Andere agenda's"</li>
                            <li>Kies <strong>"Via URL"</strong></li>
                            <li>Plak jouw kalender link in het veld "URL van agenda"</li>
                            <li>Klik op <strong>"Agenda toevoegen"</strong></li>
                            <li>✅ Klaar! De agenda verschijnt nu links in de lijst</li>
                          </ol>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="font-medium text-sm text-blue-900 mb-1">📱 Zichtbaar maken op mobiele app:</p>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Als je de agenda via de website hebt toegevoegd, synchroniseert deze <strong>automatisch</strong> naar je mobiele app</li>
                            <li>• Open de Google Calendar app op je telefoon</li>
                            <li>• Tik op je <strong>profielfoto</strong> (rechtsboven)</li>
                            <li>• Ga naar <strong>"Instellingen"</strong></li>
                            <li>• Tik op je <strong>account naam</strong></li>
                            <li>• Zoek je ambulance shifts agenda in de lijst</li>
                            <li>• Zet het <strong>vinkje AAN</strong> om deze zichtbaar te maken</li>
                            <li>• ✅ Je shifts zijn nu zichtbaar in de app!</li>
                          </ul>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="font-medium text-sm text-amber-900 mb-1">⚠️ Direct toevoegen via mobiele app werkt niet</p>
                          <p className="text-sm text-amber-800">
                            Google Calendar app ondersteunt geen URL-abonnementen direct toevoegen. 
                            Voeg de agenda toe via de <strong>website</strong> (computer/laptop), 
                            dan verschijnt deze automatisch in de mobiele app.
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mt-2">
                        <p className="text-xs text-muted-foreground">
                          ⏱️ <strong>Synchronisatie tijd:</strong> 1-24 uur (meestal binnen enkele uren). Google synchroniseert geabonneerde agenda's automatisch meerdere keren per dag.
                        </p>
                      </div>
                    </div>

                    {/* Outlook / Microsoft 365 */}
                    <div className="border-l-4 border-green-500 pl-4">
                      <h3 className="font-semibold text-base mb-2">📧 Outlook / Microsoft 365</h3>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Open <a href="https://outlook.office.com/calendar" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Outlook Calendar</a></li>
                        <li>Klik op <strong>"Agenda toevoegen"</strong> (linkerkant)</li>
                        <li>Kies <strong>"Abonneren vanaf web"</strong></li>
                        <li>Plak jouw kalender link in het URL-veld</li>
                        <li>Geef de agenda een naam (bijv. "Ambulance Shifts")</li>
                        <li>Klik op <strong>"Importeren"</strong></li>
                        <li>✅ Je shifts zijn nu zichtbaar in Outlook!</li>
                      </ol>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mt-2">
                        <p className="text-xs text-muted-foreground">
                          ⏱️ <strong>Synchronisatie tijd:</strong> 3-24 uur (meestal 3-6 uur). Microsoft synchroniseert geabonneerde agenda's 2-4 keer per dag.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          💡 Werkt ook in Outlook desktop app en mobiele app
                        </p>
                      </div>
                    </div>

                    {/* Apple Calendar */}
                    <div className="border-l-4 border-purple-500 pl-4">
                      <h3 className="font-semibold text-base mb-2">🍎 Apple Agenda (iPhone/iPad/Mac)</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-sm mb-1">Op iPhone/iPad:</p>
                          <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>Kopieer de kalender link</li>
                            <li>Open de <strong>Instellingen</strong> app</li>
                            <li>Ga naar <strong>Agenda → Accounts → Account toevoegen</strong></li>
                            <li>Kies <strong>"Overige"</strong></li>
                            <li>Tik op <strong>"Geabonneerde agenda"</strong></li>
                            <li>Plak de link en tik op <strong>"Volgende"</strong></li>
                            <li>✅ Je shifts verschijnen in de Agenda app!</li>
                          </ol>
                        </div>
                        <div>
                          <p className="font-medium text-sm mb-1">Op Mac:</p>
                          <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>Open de <strong>Agenda</strong> app</li>
                            <li>Klik op <strong>Bestand → Nieuwe agenda-abonnement</strong></li>
                            <li>Plak de kalender link</li>
                            <li>Klik op <strong>"Abonneren"</strong></li>
                            <li>Geef een naam en kies een kleur</li>
                            <li>✅ Je shifts zijn nu zichtbaar!</li>
                          </ol>
                        </div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mt-2">
                        <p className="text-xs text-muted-foreground">
                          ⏱️ <strong>Synchronisatie tijd:</strong> 15 minuten - 1 uur (meestal binnen 30 minuten). Apple synchroniseert geabonneerde agenda's elk uur of vaker.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          💡 Synchroniseert via iCloud op al je Apple apparaten
                        </p>
                      </div>
                    </div>

                    {/* Extra hulp */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        🔄 Synchronisatie informatie
                      </p>
                      <ul className="text-sm text-amber-800 space-y-1">
                        <li>• Updates worden automatisch doorgevoerd (zie synchronisatie tijden per platform hierboven)</li>
                        <li>• Je kunt shifts <strong>alleen bekijken</strong>, niet aanpassen via je kalender</li>
                        <li>• Wijzigingen maak je altijd in het planning systeem</li>
                      </ul>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-900 mb-1">
                        🔒 Privacy & Veiligheid
                      </p>
                      <ul className="text-sm text-red-800 space-y-1">
                        <li>• Deze link is <strong>persoonlijk en vertrouwelijk</strong></li>
                        <li>• Deel de link <strong>niet</strong> met anderen</li>
                        <li>• Bij twijfel: genereer een nieuwe link</li>
                        <li>• Oude links worden meteen onbruikbaar na het genereren van een nieuwe</li>
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Kon kalender link niet laden. Probeer de pagina te verversen.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}