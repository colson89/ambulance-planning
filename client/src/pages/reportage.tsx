import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Mail, Settings, Plus, Trash2, Send, 
  CheckCircle, XCircle, AlertCircle, Clock, RefreshCw,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface ReportageConfig {
  id?: number;
  enabled: boolean;
  daysAfterMonthEnd: number;
  emailSubject: string;
  emailBody: string;
  lastSentMonth?: number;
  lastSentYear?: number;
}

interface ReportageRecipient {
  id: number;
  email: string;
  name?: string;
  isActive: boolean;
  createdAt: string;
}

interface ReportageLog {
  id: number;
  month: number;
  year: number;
  recipientCount: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
  sentAt: string;
}

export default function Reportage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [addRecipientOpen, setAddRecipientOpen] = useState(false);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [newRecipientName, setNewRecipientName] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sendMonth, setSendMonth] = useState<number>(new Date().getMonth());
  const [sendYear, setSendYear] = useState<number>(new Date().getFullYear());

  const canManage = user?.role === "admin" || user?.role === "supervisor";

  const { data: emailStatus } = useQuery<{ configured: boolean; host?: string; user?: string }>({
    queryKey: ['/api/reportage/email-status'],
    enabled: canManage
  });

  const { data: config, isLoading: configLoading } = useQuery<ReportageConfig>({
    queryKey: ['/api/reportage/config'],
    enabled: canManage
  });

  const { data: recipients = [], isLoading: recipientsLoading } = useQuery<ReportageRecipient[]>({
    queryKey: ['/api/reportage/recipients'],
    enabled: canManage
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<ReportageLog[]>({
    queryKey: ['/api/reportage/logs'],
    enabled: canManage
  });

  const { data: schedulerStatus } = useQuery<{ running: boolean; lastCheck: string | null; emailConfigured: boolean }>({
    queryKey: ['/api/reportage/scheduler-status'],
    enabled: canManage,
    refetchInterval: 60000
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: Partial<ReportageConfig>) => {
      const res = await apiRequest('PUT', '/api/reportage/config', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reportage/config'] });
      toast({ title: "Configuratie opgeslagen", description: "De instellingen zijn bijgewerkt." });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/reportage/test-connection');
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Verbinding geslaagd", description: "SMTP server is bereikbaar." });
      } else {
        toast({ title: "Verbinding mislukt", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  });

  const testEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest('POST', '/api/reportage/test-email', { email });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Test email verzonden", description: "Controleer uw inbox." });
        setTestEmail("");
      } else {
        toast({ title: "Verzenden mislukt", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  });

  const addRecipientMutation = useMutation({
    mutationFn: async (data: { email: string; name?: string }) => {
      const res = await apiRequest('POST', '/api/reportage/recipients', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reportage/recipients'] });
      toast({ title: "Ontvanger toegevoegd" });
      setAddRecipientOpen(false);
      setNewRecipientEmail("");
      setNewRecipientName("");
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  });

  const toggleRecipientMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest('PATCH', `/api/reportage/recipients/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reportage/recipients'] });
    }
  });

  const deleteRecipientMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/reportage/recipients/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reportage/recipients'] });
      toast({ title: "Ontvanger verwijderd" });
    }
  });

  const sendReportageMutation = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const res = await apiRequest('POST', '/api/reportage/send', { month, year });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reportage/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reportage/config'] });
      if (data.success) {
        toast({ title: "Rapportage verzonden", description: data.message });
      } else {
        toast({ title: "Verzenden mislukt", description: data.error || data.message, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  });

  if (!canManage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Toegang Geweigerd</CardTitle>
            <CardDescription>
              Alleen admins en supervisors kunnen reportage instellingen beheren.
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

  const months = [
    "Januari", "Februari", "Maart", "April", "Mei", "Juni",
    "Juli", "Augustus", "September", "Oktober", "November", "December"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
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
            <div className="p-4 bg-purple-100 rounded-full">
              <Mail className="h-12 w-12 text-purple-600" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Reportage Personeelsdienst</h1>
          <p className="text-lg text-gray-600">
            Automatische maandelijkse shift rapportages via email
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Email Configuratie Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-2">
                {emailStatus?.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span>SMTP: {emailStatus?.configured ? "Geconfigureerd" : "Niet geconfigureerd"}</span>
              </div>
              {emailStatus?.host && (
                <div className="text-sm text-gray-600">
                  Server: {emailStatus.host}
                </div>
              )}
              <div className="flex items-center gap-2">
                {schedulerStatus?.running ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span>Scheduler: {schedulerStatus?.running ? "Actief" : "Inactief"}</span>
              </div>
            </div>
            
            {!emailStatus?.configured && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>SMTP configuratie vereist.</strong> Stel de volgende environment variabelen in op de server:
                </p>
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  <li>SMTP_HOST - SMTP server adres (bijv. smtp.office365.com)</li>
                  <li>SMTP_PORT - Poort nummer (587 voor TLS, 465 voor SSL)</li>
                  <li>SMTP_USER - Email gebruikersnaam</li>
                  <li>SMTP_PASSWORD - Email wachtwoord</li>
                  <li>SMTP_FROM_ADDRESS - Afzender email (optioneel)</li>
                  <li>SMTP_FROM_NAME - Afzender naam (optioneel, standaard "Planning BWZK")</li>
                </ul>
              </div>
            )}

            {emailStatus?.configured && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testConnectionMutation.mutate()}
                  disabled={testConnectionMutation.isPending}
                >
                  {testConnectionMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Test Verbinding
                </Button>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-48"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => testEmailMutation.mutate(testEmail)}
                    disabled={!testEmail || testEmailMutation.isPending}
                  >
                    {testEmailMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Test Email
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Instellingen</TabsTrigger>
            <TabsTrigger value="recipients">Ontvangers</TabsTrigger>
            <TabsTrigger value="logs">Verzendlog</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Automatische Rapportage</CardTitle>
                <CardDescription>
                  Configureer wanneer en hoe de maandelijkse rapportages worden verstuurd
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enabled" className="text-base font-medium">Automatisch versturen</Label>
                    <p className="text-sm text-gray-500">
                      Verstuur automatisch een rapportage na afloop van elke maand
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={config?.enabled ?? false}
                    onCheckedChange={(enabled) => updateConfigMutation.mutate({ enabled })}
                    disabled={!emailStatus?.configured}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daysAfterMonthEnd">Dagen na maandeinde</Label>
                  <p className="text-sm text-gray-500">
                    De rapportage wordt verstuurd op dag {config?.daysAfterMonthEnd || 5} van de volgende maand
                  </p>
                  <Input
                    id="daysAfterMonthEnd"
                    type="number"
                    min={1}
                    max={28}
                    value={config?.daysAfterMonthEnd ?? 5}
                    onChange={(e) => updateConfigMutation.mutate({ daysAfterMonthEnd: parseInt(e.target.value) || 5 })}
                    className="w-24"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailSubject">Email onderwerp</Label>
                  <p className="text-sm text-gray-500">
                    Gebruik {'{maand}'} en {'{jaar}'} als placeholders
                  </p>
                  <Input
                    id="emailSubject"
                    value={config?.emailSubject ?? "Maandelijkse Shift Rapportage - {maand} {jaar}"}
                    onChange={(e) => updateConfigMutation.mutate({ emailSubject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailBody">Email tekst</Label>
                  <Textarea
                    id="emailBody"
                    rows={5}
                    value={config?.emailBody ?? "Beste,\n\nIn bijlage vindt u de maandelijkse shift rapportage voor alle stations.\n\nMet vriendelijke groeten,\nPlanning BWZK"}
                    onChange={(e) => updateConfigMutation.mutate({ emailBody: e.target.value })}
                  />
                </div>

                {config?.lastSentMonth && config?.lastSentYear && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Laatste rapportage: {months[config.lastSentMonth - 1]} {config.lastSentYear}
                    </p>
                  </div>
                )}

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Handmatig versturen</h3>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Maand</Label>
                      <Select 
                        value={sendMonth.toString()} 
                        onValueChange={(v) => setSendMonth(parseInt(v))}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, i) => (
                            <SelectItem key={i} value={i.toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Jaar</Label>
                      <Select 
                        value={sendYear.toString()} 
                        onValueChange={(v) => setSendYear(parseInt(v))}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026].map((year) => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => sendReportageMutation.mutate({ month: sendMonth + 1, year: sendYear })}
                      disabled={sendReportageMutation.isPending || !emailStatus?.configured || recipients.filter(r => r.isActive).length === 0}
                    >
                      {sendReportageMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Verstuur Rapportage
                    </Button>
                  </div>
                  {recipients.filter(r => r.isActive).length === 0 && (
                    <p className="text-sm text-red-500 mt-2">
                      Voeg eerst ontvangers toe voordat u een rapportage kunt versturen
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipients">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Email Ontvangers</CardTitle>
                  <CardDescription>
                    Beheer de ontvangers van de maandelijkse rapportages
                  </CardDescription>
                </div>
                <Dialog open={addRecipientOpen} onOpenChange={setAddRecipientOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Toevoegen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ontvanger Toevoegen</DialogTitle>
                      <DialogDescription>
                        Voeg een nieuw email adres toe voor de rapportages
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="recipientEmail">Email adres *</Label>
                        <Input
                          id="recipientEmail"
                          type="email"
                          placeholder="voorbeeld@bedrijf.be"
                          value={newRecipientEmail}
                          onChange={(e) => setNewRecipientEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recipientName">Naam (optioneel)</Label>
                        <Input
                          id="recipientName"
                          placeholder="Jan Janssen"
                          value={newRecipientName}
                          onChange={(e) => setNewRecipientName(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddRecipientOpen(false)}>
                        Annuleren
                      </Button>
                      <Button 
                        onClick={() => addRecipientMutation.mutate({ 
                          email: newRecipientEmail, 
                          name: newRecipientName || undefined 
                        })}
                        disabled={!newRecipientEmail || addRecipientMutation.isPending}
                      >
                        {addRecipientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Toevoegen
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {recipientsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nog geen ontvangers toegevoegd</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell>{recipient.name || "-"}</TableCell>
                          <TableCell>{recipient.email}</TableCell>
                          <TableCell>
                            <Switch
                              checked={recipient.isActive}
                              onCheckedChange={(isActive) => 
                                toggleRecipientMutation.mutate({ id: recipient.id, isActive })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRecipientMutation.mutate(recipient.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Verzendlog</CardTitle>
                <CardDescription>
                  Overzicht van verstuurde rapportages
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nog geen rapportages verstuurd</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periode</TableHead>
                        <TableHead>Verstuurd op</TableHead>
                        <TableHead>Ontvangers</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {months[log.month - 1]} {log.year}
                          </TableCell>
                          <TableCell>
                            {format(new Date(log.sentAt), "d MMM yyyy HH:mm", { locale: nl })}
                          </TableCell>
                          <TableCell>{log.recipientCount}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={log.status === 'success' ? 'default' : log.status === 'partial' ? 'secondary' : 'destructive'}
                              className={log.status === 'success' ? 'bg-green-500' : ''}
                            >
                              {log.status === 'success' ? 'Geslaagd' : log.status === 'partial' ? 'Gedeeltelijk' : 'Mislukt'}
                            </Badge>
                            {log.errorMessage && (
                              <p className="text-xs text-red-500 mt-1">{log.errorMessage}</p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
