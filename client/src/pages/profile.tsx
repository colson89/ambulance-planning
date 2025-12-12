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
import { Home, Calendar, Copy, RefreshCw, ChevronDown, Upload, User as UserIcon, Phone, Clock } from "lucide-react";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PushNotificationSettings } from "@/components/push-notification-settings";

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

const phoneSchema = z.object({
  phoneNumber: z.string().optional()
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
      maxHours: 40,
      preferredHours: 32
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

  // Calendar offset state
  const [calendarOffset, setCalendarOffset] = useState<number>(user?.calendarOffset ?? 0);
  
  useEffect(() => {
    if (user?.calendarOffset !== undefined) {
      setCalendarOffset(user.calendarOffset);
    }
  }, [user?.calendarOffset]);

  const updateCalendarOffsetMutation = useMutation({
    mutationFn: async (offset: number) => {
      const res = await apiRequest("PATCH", `/api/users/${user!.id}/calendar-offset`, { calendarOffset: offset });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Opgeslagen",
        description: "Kalender tijdcorrectie is bijgewerkt. De wijziging is actief bij de volgende synchronisatie.",
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

  const phoneForm = useForm({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: user?.phoneNumber || ""
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      const res = await fetch(`/api/users/${user!.id}/profile-photo`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Upload mislukt');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Gelukt!",
        description: "Profielfoto bijgewerkt",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async (data: z.infer<typeof phoneSchema>) => {
      const res = await apiRequest("PATCH", `/api/users/${user!.id}/phone`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Gelukt!",
        description: "Telefoonnummer bijgewerkt",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Bestand te groot",
          description: "Maximale bestandsgrootte is 2MB",
          variant: "destructive",
        });
        return;
      }
      uploadPhotoMutation.mutate(file);
    }
  };

  // Guard: Wait for authentication to complete (after all hooks)
  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Profiel</h1>
        <Button
          variant="outline"
          className="h-10"
          onClick={() => setLocation("/dashboard")}
        >
          <Home className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Home</span>
        </Button>
      </div>

      <div className="grid gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Persoonlijke Informatie</CardTitle>
            <CardDescription>
              Update je profielfoto en contactgegevens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                  <AvatarImage src={user?.profilePhotoUrl || undefined} alt={`${user?.firstName} ${user?.lastName}`} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl sm:text-2xl">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadPhotoMutation.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadPhotoMutation.isPending ? "Uploaden..." : "Wijzig Foto"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Max 2MB (JPG, PNG, WebP)
                </p>
              </div>

              <div className="flex-1 w-full space-y-4">
                <div className="text-center sm:text-left">
                  <label className="text-sm font-medium text-gray-600">Naam</label>
                  <div className="text-base sm:text-lg font-medium text-gray-900 mt-1">
                    {user?.firstName} {user?.lastName}
                  </div>
                </div>

                <div className="text-center sm:text-left">
                  <label className="text-sm font-medium text-gray-600">Gebruikersnaam</label>
                  <div className="text-base sm:text-lg text-gray-900 mt-1">
                    {user?.username}
                  </div>
                </div>

                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit((data) => updatePhoneMutation.mutate(data))} className="space-y-2">
                    <FormField
                      control={phoneForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefoonnummer</FormLabel>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="+32 xxx xx xx xx"
                                className="flex-1 h-10"
                              />
                            </FormControl>
                            <Button
                              type="submit"
                              variant="outline"
                              className="h-10 w-full sm:w-auto"
                              disabled={updatePhoneMutation.isPending}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              {updatePhoneMutation.isPending ? "Opslaan..." : "Opslaan"}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>
            </div>
          </CardContent>
        </Card>

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

                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Tijdcorrectie voor kalender</label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Sommige kalender apps tonen shifts een uurtje te vroeg of te laat. 
                    Pas hier de tijd aan zodat de shifts correct verschijnen in jouw agenda.
                  </p>
                  <div className="flex items-center gap-3">
                    <Select
                      value={calendarOffset.toString()}
                      onValueChange={(value) => {
                        const offset = parseInt(value);
                        setCalendarOffset(offset);
                        updateCalendarOffsetMutation.mutate(offset);
                      }}
                      disabled={updateCalendarOffsetMutation.isPending}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Selecteer correctie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-120">-2 uur (vroeger)</SelectItem>
                        <SelectItem value="-60">-1 uur (vroeger)</SelectItem>
                        <SelectItem value="0">Geen correctie</SelectItem>
                        <SelectItem value="60">+1 uur (later)</SelectItem>
                        <SelectItem value="120">+2 uur (later)</SelectItem>
                      </SelectContent>
                    </Select>
                    {updateCalendarOffsetMutation.isPending && (
                      <span className="text-xs text-muted-foreground">Opslaan...</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Voorbeeld: als een shift om 07:00 zou moeten starten maar om 06:00 in je agenda staat, kies dan +1 uur.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    De wijziging wordt binnen enkele uren zichtbaar in je kalender app wanneer deze opnieuw synchroniseert. Er hoeft geen nieuwe planning te worden gegenereerd.
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

        {/* Push Notificaties */}
        <PushNotificationSettings />
      </div>
    </div>
  );
}