import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Server, Mail, Save, RefreshCw, Send, Loader2, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

interface SmtpConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFromAddress: string;
  smtpFromName: string;
  smtpSecure: boolean;
  hasPassword?: boolean;
  passwordNeedsReentry?: boolean;
}

export default function SmtpSettings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const canManageSettings = user?.role === "admin" || user?.role === "supervisor";

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromAddress, setSmtpFromAddress] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("Planning BWZK");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const { data: emailStatus } = useQuery<{ configured: boolean; host?: string; user?: string }>({
    queryKey: ['/api/reportage/email-status'],
    enabled: canManageSettings
  });

  const { data: smtpConfig, isLoading: smtpLoading } = useQuery<SmtpConfig>({
    queryKey: ['/api/reportage/smtp-config'],
    enabled: canManageSettings
  });

  useEffect(() => {
    if (smtpConfig) {
      setSmtpHost(smtpConfig.smtpHost || "");
      setSmtpPort(smtpConfig.smtpPort || 587);
      setSmtpUser(smtpConfig.smtpUser || "");
      setSmtpFromAddress(smtpConfig.smtpFromAddress || "");
      setSmtpFromName(smtpConfig.smtpFromName || "Planning BWZK");
      setSmtpSecure(smtpConfig.smtpSecure || false);
      setSmtpPassword("");
    }
  }, [smtpConfig]);

  const saveSmtpConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', '/api/reportage/smtp-config', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reportage/smtp-config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reportage/email-status'] });
      toast({ title: "SMTP instellingen opgeslagen", description: "De email configuratie is bijgewerkt." });
      setSmtpPassword("");
    },
    onError: (error: any) => {
      toast({ title: "Fout bij opslaan", description: error.message || "Kon instellingen niet opslaan", variant: "destructive" });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/reportage/test-connection');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Verbinding geslaagd", description: "SMTP server is bereikbaar." });
    },
    onError: (error: any) => {
      toast({ title: "Verbinding mislukt", description: error.message || "Kon geen verbinding maken met de SMTP server", variant: "destructive" });
    }
  });

  const testEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest('POST', '/api/reportage/test-email', { email });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Test email verzonden", description: "Controleer uw inbox voor de test email." });
      setTestEmail("");
    },
    onError: (error: any) => {
      toast({ title: "Fout bij verzenden", description: error.message || "Kon test email niet verzenden", variant: "destructive" });
    }
  });

  const handleSaveSmtpConfig = () => {
    saveSmtpConfigMutation.mutate({
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword: smtpPassword || undefined,
      smtpFromAddress,
      smtpFromName,
      smtpSecure
    });
  };

  if (!canManageSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Toegang Geweigerd</CardTitle>
            <CardDescription>
              Je hebt geen rechten om SMTP instellingen te beheren. Alleen admins en supervisors kunnen deze pagina bekijken.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
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
            <div className="p-4 bg-orange-100 rounded-full">
              <Mail className="h-12 w-12 text-orange-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">E-mail (SMTP) Instellingen</h1>
          <p className="text-lg text-gray-600 mb-4">
            Configureer de email server voor alle uitgaande berichten
          </p>
          <Badge variant={emailStatus?.configured ? "default" : "secondary"} className={emailStatus?.configured ? "bg-green-600" : ""}>
            {emailStatus?.configured ? "Geconfigureerd" : "Niet geconfigureerd"}
          </Badge>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              SMTP Server Configuratie
            </CardTitle>
            <CardDescription>
              Deze instellingen worden gebruikt door alle email functies: Welkomstmail, Wachtwoord Reset, en Reportage.
              Uw IT-afdeling kan u deze gegevens verstrekken.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {smtpLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Server *</Label>
                    <Input
                      id="smtpHost"
                      placeholder="smtp.office365.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Bijv. smtp.office365.com, smtp.gmail.com
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">Poort *</Label>
                    <Select 
                      value={smtpPort.toString()} 
                      onValueChange={(v) => setSmtpPort(parseInt(v))}
                    >
                      <SelectTrigger id="smtpPort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="587">587 (TLS - Aanbevolen)</SelectItem>
                        <SelectItem value="465">465 (SSL)</SelectItem>
                        <SelectItem value="25">25 (Onbeveiligd)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">Gebruikersnaam *</Label>
                    <Input
                      id="smtpUser"
                      type="email"
                      placeholder="noreply@bedrijf.be"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Meestal uw volledige email adres
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">
                      Wachtwoord {smtpConfig?.hasPassword ? "(opgeslagen)" : smtpConfig?.passwordNeedsReentry ? "(moet opnieuw ingevoerd)" : "*"}
                    </Label>
                    <div className="relative">
                      <Input
                        id="smtpPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder={smtpConfig?.hasPassword ? "••••••••" : smtpConfig?.passwordNeedsReentry ? "Voer wachtwoord opnieuw in" : "Wachtwoord invoeren"}
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        className={smtpConfig?.passwordNeedsReentry ? "border-orange-400" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {smtpConfig?.passwordNeedsReentry && (
                      <p className="text-xs text-orange-600">
                        Het wachtwoord moet opnieuw worden ingevoerd vanwege een beveiligingsupdate.
                      </p>
                    )}
                    {smtpConfig?.hasPassword && !smtpConfig?.passwordNeedsReentry && (
                      <p className="text-xs text-gray-500">
                        Laat leeg om het huidige wachtwoord te behouden
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpFromAddress">Afzender Email (optioneel)</Label>
                    <Input
                      id="smtpFromAddress"
                      type="email"
                      placeholder="planning@bedrijf.be"
                      value={smtpFromAddress}
                      onChange={(e) => setSmtpFromAddress(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Als leeg wordt de gebruikersnaam gebruikt
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtpFromName">Afzender Naam</Label>
                    <Input
                      id="smtpFromName"
                      placeholder="Planning BWZK"
                      value={smtpFromName}
                      onChange={(e) => setSmtpFromName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="smtpSecure" className="text-base font-medium">SSL/TLS Encryptie</Label>
                    <p className="text-sm text-gray-500">
                      Activeer voor poort 465, deactiveer voor poort 587 met STARTTLS
                    </p>
                  </div>
                  <Switch
                    id="smtpSecure"
                    checked={smtpSecure}
                    onCheckedChange={setSmtpSecure}
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  <Button 
                    onClick={handleSaveSmtpConfig}
                    disabled={!smtpHost || !smtpUser || ((!smtpConfig?.hasPassword || smtpConfig?.passwordNeedsReentry) && !smtpPassword) || saveSmtpConfigMutation.isPending}
                  >
                    {saveSmtpConfigMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Instellingen Opslaan
                  </Button>
                  
                  {emailStatus?.configured && (
                    <Button 
                      variant="outline"
                      onClick={() => testConnectionMutation.mutate()}
                      disabled={testConnectionMutation.isPending}
                    >
                      {testConnectionMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Verbinding Testen
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {emailStatus?.configured && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Test Email Verzenden
              </CardTitle>
              <CardDescription>
                Verstuur een test email om te controleren of de configuratie correct werkt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="uw-email@voorbeeld.be"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="max-w-xs"
                />
                <Button 
                  onClick={() => testEmailMutation.mutate(testEmail)}
                  disabled={!testEmail || testEmailMutation.isPending}
                >
                  {testEmailMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Verstuur Test
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Functies die SMTP gebruiken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="font-medium">Welkomstmail Nieuwe Gebruikers</p>
                    <p className="text-sm text-gray-500">Automatische email met inloggegevens</p>
                  </div>
                </div>
                {emailStatus?.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="font-medium">Wachtwoord Reset</p>
                    <p className="text-sm text-gray-500">Self-service wachtwoord herstel</p>
                  </div>
                </div>
                {emailStatus?.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium">Reportage Personeelsdienst</p>
                    <p className="text-sm text-gray-500">Maandelijkse shift rapporten</p>
                  </div>
                </div>
                {emailStatus?.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Veelgebruikte SMTP Servers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Microsoft 365</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>Server: smtp.office365.com</li>
                  <li>Poort: 587</li>
                  <li>SSL/TLS: Uit (STARTTLS)</li>
                </ul>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Gmail</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>Server: smtp.gmail.com</li>
                  <li>Poort: 587</li>
                  <li>App wachtwoord vereist</li>
                </ul>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">Outlook.com</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>Server: smtp-mail.outlook.com</li>
                  <li>Poort: 587</li>
                  <li>SSL/TLS: Uit (STARTTLS)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
