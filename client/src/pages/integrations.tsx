import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link as LinkIcon, ArrowLeft, Settings, Mail, FileText, KeyRound, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Station {
  id: number;
  name: string;
  code: string;
  displayName: string;
}

export default function Integrations() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Alleen admins en supervisors kunnen integraties beheren
  const canManageIntegrations = user?.role === "admin" || user?.role === "supervisor";

  // Check email configuration status
  const { data: emailStatus } = useQuery<{ configured: boolean; host?: string; user?: string }>({
    queryKey: ['/api/reportage/email-status'],
    enabled: canManageIntegrations
  });

  // Check password reset status (supervisor only)
  const { data: passwordResetStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/password-reset/enabled'],
    enabled: user?.role === 'supervisor'
  });

  // Toggle password reset
  const togglePasswordReset = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest('PUT', '/api/password-reset/toggle', { enabled });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/password-reset/enabled'] });
      toast({
        title: data.enabled ? "Ingeschakeld" : "Uitgeschakeld",
        description: `Wachtwoord reset via e-mail is nu ${data.enabled ? 'ingeschakeld' : 'uitgeschakeld'}`
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon instelling niet wijzigen",
        variant: "destructive"
      });
    }
  });

  // Station count for badge - supervisor only
  const { data: allStations = [] } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
    enabled: user?.role === 'supervisor'
  });

  if (!canManageIntegrations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Toegang Geweigerd</CardTitle>
            <CardDescription>
              Je hebt geen rechten om integraties te beheren. Alleen admins en supervisors kunnen deze pagina bekijken.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/dashboard")} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar Dashboard
          </Button>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-100 rounded-full">
                <Settings className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Integraties</h1>
            <p className="text-lg text-gray-600">
              Beheer koppelingen met externe systemen en diensten
            </p>
          </div>
        </div>

        {/* Integraties Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Verdi Integration Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => setLocation("/verdi")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                <LinkIcon className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Verdi Alarm Software</CardTitle>
              <CardDescription className="mb-2">
                Koppeling met Verdi voor automatische shift synchronisatie
              </CardDescription>
              <Badge variant="default" className="mx-auto bg-green-600">Actief</Badge>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="outline" 
                className="w-full group"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/verdi");
                }}
              >
                Configureren
                <Settings className="ml-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Reportage Personeelsdienst Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => setLocation("/reportage")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
                <Mail className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Reportage Personeelsdienst</CardTitle>
              <CardDescription className="mb-2">
                Automatische maandelijkse shift rapportages via email
              </CardDescription>
              <Badge 
                variant="default" 
                className={emailStatus?.configured ? "mx-auto bg-green-600" : "mx-auto bg-orange-500"}
              >
                {emailStatus?.configured ? "Geconfigureerd" : "Configuratie Nodig"}
              </Badge>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="outline" 
                className="w-full group"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/reportage");
                }}
              >
                Configureren
                <Settings className="ml-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Password Reset Card - Only for supervisors */}
          {user?.role === 'supervisor' && (
            <Card className="hover:shadow-lg transition-all duration-200">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-indigo-100 rounded-full w-fit">
                  <KeyRound className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-xl">Wachtwoord Reset</CardTitle>
                <CardDescription className="mb-2">
                  Gebruikers kunnen via e-mail hun wachtwoord resetten
                </CardDescription>
                <Badge 
                  variant="default" 
                  className={passwordResetStatus?.enabled ? "mx-auto bg-green-600" : "mx-auto bg-gray-400"}
                >
                  {passwordResetStatus?.enabled ? "Ingeschakeld" : "Uitgeschakeld"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium text-gray-700">E-mail Reset</p>
                    <p className="text-gray-500 text-xs">Toont 'Wachtwoord vergeten?' op login</p>
                  </div>
                  <Switch
                    checked={passwordResetStatus?.enabled || false}
                    onCheckedChange={(checked) => togglePasswordReset.mutate(checked)}
                    disabled={togglePasswordReset.isPending || !emailStatus?.configured}
                  />
                </div>
                {!emailStatus?.configured && (
                  <p className="text-xs text-orange-600 mt-2 text-center">
                    SMTP moet eerst worden geconfigureerd in Reportage
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Activiteitenlog Card - Only for supervisors */}
          {user?.role === 'supervisor' && (
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => setLocation("/activity-logs")}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
                  <FileText className="h-8 w-8 text-amber-600" />
                </div>
                <CardTitle className="text-xl">Activiteitenlog</CardTitle>
                <CardDescription className="mb-2">
                  Bekijk alle gebruikersactiviteiten en systeemgebeurtenissen
                </CardDescription>
                <Badge variant="default" className="mx-auto bg-amber-600">Supervisor</Badge>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  variant="outline" 
                  className="w-full group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation("/activity-logs");
                  }}
                >
                  Bekijken
                  <FileText className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Station Management Card - Only for supervisors */}
          {user?.role === 'supervisor' && (
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => setLocation("/stations")}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-cyan-100 rounded-full w-fit">
                  <Building2 className="h-8 w-8 text-cyan-600" />
                </div>
                <CardTitle className="text-xl">Stationbeheer</CardTitle>
                <CardDescription className="mb-2">
                  Beheer stations voor de applicatie
                </CardDescription>
                <Badge variant="default" className="mx-auto bg-cyan-600">
                  {`${allStations.length} stations`}
                </Badge>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  variant="outline" 
                  className="w-full group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation("/stations");
                  }}
                >
                  Beheren
                  <Building2 className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 space-y-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Over Integraties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-blue-800">
                Integraties verbinden het Ambulance Planning Systeem met externe diensten zoals 
                alarmeringssoftware, HR-systemen, en andere tools. Deze koppelingen automatiseren 
                workflows en zorgen ervoor dat data up-to-date blijft tussen verschillende systemen.
              </p>
              
              {/* Overzichtstabel */}
              <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                <div className="bg-blue-100 px-4 py-2 border-b border-blue-200 flex items-center justify-between">
                  <h3 className="font-semibold text-blue-900">Beschikbare Integraties</h3>
                  {user?.role !== 'supervisor' && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      Sommige integraties zijn alleen zichtbaar voor supervisors
                    </span>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg shrink-0">
                        <LinkIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Verdi Alarm Software</p>
                        <p className="text-sm text-gray-600">Synchroniseert ingeplande shifts automatisch naar de Verdi alarmeringscentrale, zodat de juiste medewerkers bereikbaar zijn tijdens noodsituaties.</p>
                        <p className="text-xs text-gray-500 mt-1">Vereist: Verdi URL, API credentials, ShiftSheet GUID</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                        <Mail className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Reportage Personeelsdienst</p>
                        <p className="text-sm text-gray-600">Verstuurt automatisch maandelijkse shift rapportages via e-mail met Excel overzichten voor de personeelsdienst.</p>
                        <p className="text-xs text-gray-500 mt-1">Vereist: SMTP server instellingen (host, poort, gebruiker, wachtwoord)</p>
                      </div>
                    </div>
                  </div>
                  {user?.role === 'supervisor' && (
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
                          <KeyRound className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Wachtwoord Reset via E-mail</p>
                          <p className="text-sm text-gray-600">Gebruikers kunnen zelf hun wachtwoord resetten via een e-mail link. Vermindert werkdruk op admins.</p>
                          <p className="text-xs text-gray-500 mt-1">Vereist: Werkende SMTP configuratie (eerst Reportage instellen)</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {user?.role === 'supervisor' && (
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                          <FileText className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Activiteitenlog</p>
                          <p className="text-sm text-gray-600">Bekijk alle gebruikersactiviteiten en systeemgebeurtenissen. Handig voor audit en troubleshooting.</p>
                          <p className="text-xs text-gray-500 mt-1">Alleen beschikbaar voor supervisors</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Indicatoren */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Status Indicatoren</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Elke integratie toont een status badge die aangeeft of de koppeling actief en correct geconfigureerd is.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                  <Badge className="bg-green-600">Actief / Geconfigureerd</Badge>
                  <span className="text-xs text-gray-600">Werkt correct</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                  <Badge className="bg-orange-500">Configuratie Nodig</Badge>
                  <span className="text-xs text-gray-600">Nog niet ingesteld</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                  <Badge className="bg-gray-400">Uitgeschakeld</Badge>
                  <span className="text-xs text-gray-600">Handmatig uit</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                  <Badge variant="secondary">Binnenkort</Badge>
                  <span className="text-xs text-gray-600">Nog niet beschikbaar</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setup Volgorde */}
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-900">Setup Volgorde</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-800 mb-4">
                Sommige integraties zijn afhankelijk van andere. Volg deze volgorde voor correcte configuratie:
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-amber-200">
                  <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <span className="text-sm font-medium">SMTP Instellingen</span>
                </div>
                <span className="hidden sm:block text-amber-600">→</span>
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-amber-200">
                  <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <span className="text-sm font-medium">Reportage</span>
                </div>
                <span className="hidden sm:block text-amber-600">→</span>
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-amber-200">
                  <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <span className="text-sm font-medium">Wachtwoord Reset</span>
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-3">
                Verdi is onafhankelijk en kan op elk moment worden geconfigureerd.
              </p>
            </CardContent>
          </Card>

          {/* Voordelen */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900">Voordelen van Integraties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-gray-900">Automatisering</p>
                    <p className="text-sm text-gray-600">Geen handmatig overtypen van data meer</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-gray-900">Up-to-date Informatie</p>
                    <p className="text-sm text-gray-600">Data blijft gesynchroniseerd tussen systemen</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-gray-900">Tijdsbesparing</p>
                    <p className="text-sm text-gray-600">Minder administratief werk voor supervisors</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-gray-900">Foutreductie</p>
                    <p className="text-sm text-gray-600">Minder kans op tikfouten bij handmatige invoer</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900">Veelvoorkomende Problemen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white rounded-lg border border-red-200">
                <p className="font-medium text-gray-900">E-mail wordt niet verzonden</p>
                <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                  <li>Controleer SMTP instellingen in Reportage (host, poort, gebruiker)</li>
                  <li>Voor Outlook/Microsoft 365: gebruik een App-wachtwoord i.p.v. normaal wachtwoord</li>
                  <li>Controleer of poort 587 (TLS) of 465 (SSL) correct is ingesteld</li>
                </ul>
              </div>
              <div className="p-3 bg-white rounded-lg border border-red-200">
                <p className="font-medium text-gray-900">Verdi synchronisatie mislukt</p>
                <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                  <li>Controleer of alle gebruiker-mappings correct zijn ingesteld</li>
                  <li>Controleer of de ShiftSheet GUID overeenkomt met Verdi</li>
                  <li>Verifieer de API credentials bij uw Verdi beheerder</li>
                </ul>
              </div>
              <div className="p-3 bg-white rounded-lg border border-red-200">
                <p className="font-medium text-gray-900">Wachtwoord reset toggle is uitgeschakeld</p>
                <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                  <li>SMTP moet eerst geconfigureerd zijn via Reportage</li>
                  <li>Alleen supervisors kunnen deze functie beheren</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
