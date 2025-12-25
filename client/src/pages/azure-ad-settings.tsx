import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck, Save, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AzureAdConfig {
  enabled: boolean;
  tenantId: string;
  clientId: string;
  hasClientSecret: boolean;
  redirectUri: string;
  configured: boolean;
}

export default function AzureAdSettings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [enabled, setEnabled] = useState(false);

  const { data: config, isLoading } = useQuery<AzureAdConfig>({
    queryKey: ['/api/azure-ad/config'],
    enabled: user?.role === 'supervisor'
  });

  useEffect(() => {
    if (config) {
      setTenantId(config.tenantId || "");
      setClientId(config.clientId || "");
      setEnabled(config.enabled);
    }
  }, [config]);

  const saveConfig = useMutation({
    mutationFn: async () => {
      const data: any = {
        enabled,
        tenantId: tenantId.trim(),
        clientId: clientId.trim()
      };
      if (clientSecret) {
        data.clientSecret = clientSecret;
      }
      const res = await apiRequest('PUT', '/api/azure-ad/config', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/azure-ad/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/azure-ad/status'] });
      setClientSecret("");
      toast({
        title: "Opgeslagen",
        description: "Azure AD configuratie is bijgewerkt"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Kon configuratie niet opslaan",
        variant: "destructive"
      });
    }
  });

  if (user?.role !== 'supervisor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Toegang Geweigerd</CardTitle>
            <CardDescription>
              Alleen supervisors kunnen Azure AD configureren.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/integrations")} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar Integraties
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConfigured = !!(tenantId && clientId && (config?.hasClientSecret || clientSecret));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/integrations")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar Integraties
        </Button>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <ShieldCheck className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Microsoft Entra ID</h1>
          <p className="text-gray-600">
            Single Sign-On via Azure AD / Microsoft 365
          </p>
        </div>

        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Belangrijk</AlertTitle>
            <AlertDescription>
              Azure AD login koppelt bestaande gebruikers op basis van hun e-mailadres. 
              Gebruikers moeten eerst in dit systeem bestaan voordat ze via Microsoft kunnen inloggen.
              Viewers en gebruikers zonder Microsoft account kunnen altijd nog met gebruikersnaam/wachtwoord inloggen.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Azure AD Configuratie</span>
                <Badge 
                  variant={config?.configured ? (config?.enabled ? "default" : "secondary") : "outline"}
                  className={config?.configured && config?.enabled ? "bg-green-600" : ""}
                >
                  {!config?.configured ? "Niet Geconfigureerd" : config?.enabled ? "Actief" : "Uitgeschakeld"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Configureer de verbinding met Microsoft Entra ID (voorheen Azure AD)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Setup stappen in Azure Portal:</h4>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                  <li>Ga naar <strong>Azure Portal</strong> &gt; <strong>Microsoft Entra ID</strong> &gt; <strong>App registrations</strong></li>
                  <li>Klik <strong>New registration</strong></li>
                  <li>Naam: bijv. "Ambulance Planning BWZK"</li>
                  <li>Supported account types: "Single tenant" of "Multitenant" (afhankelijk van uw organisatie)</li>
                  <li>Redirect URI: Web, voer in: <code className="bg-blue-100 px-1 rounded">{window.location.origin}/api/azure-ad/callback</code></li>
                  <li>Na aanmaken: kopieer de <strong>Application (client) ID</strong> en <strong>Directory (tenant) ID</strong></li>
                  <li>Ga naar <strong>Certificates & secrets</strong> &gt; <strong>New client secret</strong></li>
                  <li>Kopieer de secret value (deze wordt maar één keer getoond!)</li>
                </ol>
                <Button
                  variant="link"
                  className="mt-2 p-0 h-auto text-blue-700"
                  onClick={() => window.open('https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade', '_blank')}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open Azure Portal
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="tenantId">Directory (tenant) ID</Label>
                  <Input
                    id="tenantId"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Te vinden in Azure Portal onder Overview van uw app registratie
                  </p>
                </div>

                <div>
                  <Label htmlFor="clientId">Application (client) ID</Label>
                  <Input
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Te vinden in Azure Portal onder Overview van uw app registratie
                  </p>
                </div>

                <div>
                  <Label htmlFor="clientSecret">
                    Client Secret
                    {config?.hasClientSecret && !clientSecret && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Geconfigureerd
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder={config?.hasClientSecret ? "••••••••••••••••" : "Voer client secret in"}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {config?.hasClientSecret 
                      ? "Laat leeg om huidige secret te behouden, of voer een nieuwe in om te vervangen"
                      : "Aan te maken in Azure Portal onder Certificates & secrets"}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enabled" className="text-base font-medium">Microsoft Login Inschakelen</Label>
                      <p className="text-sm text-gray-500">
                        Toont de "Inloggen met Microsoft" knop op de login pagina
                      </p>
                    </div>
                    <Switch
                      id="enabled"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                      disabled={!isConfigured && !config?.configured}
                    />
                  </div>
                  {!isConfigured && !config?.configured && (
                    <p className="text-xs text-orange-600 mt-2">
                      Vul eerst alle configuratie velden in om de integratie te kunnen inschakelen
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => saveConfig.mutate()}
                  disabled={saveConfig.isPending || (!tenantId && !clientId)}
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveConfig.isPending ? "Opslaan..." : "Configuratie Opslaan"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-900">Hoe werkt het?</CardTitle>
            </CardHeader>
            <CardContent className="text-amber-800 space-y-3">
              <div className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <p>Gebruiker klikt op "Inloggen met Microsoft" op de login pagina</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <p>Microsoft vraagt om login met bedrijfsaccount (bijv. naam@bwzk.be)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <p>Na succesvolle Microsoft login wordt het e-mailadres vergeleken met bestaande gebruikers</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <p>Als er een match is, wordt de gebruiker automatisch ingelogd</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-700">!</span>
                <p className="text-amber-700">Geen match? De gebruiker ziet een foutmelding en moet contact opnemen met de beheerder</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
