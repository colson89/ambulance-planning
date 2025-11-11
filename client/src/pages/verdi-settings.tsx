import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type User, type Station } from "@shared/schema";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Home, Save, Upload, Download, Search } from "lucide-react";

export default function VerdiSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);

  const effectiveStationId = user?.role === 'supervisor' 
    ? selectedStationId 
    : user?.stationId;

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stations");
      if (!res.ok) throw new Error("Kon stations niet laden");
      return res.json();
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/verdi/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/verdi/users");
      if (!res.ok) throw new Error("Kon gebruikers niet laden");
      return res.json();
    },
  });

  const { data: verdiConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["/api/verdi/config", effectiveStationId],
    queryFn: async () => {
      if (!effectiveStationId) return null;
      const res = await apiRequest("GET", `/api/verdi/config/${effectiveStationId}`);
      if (!res.ok) throw new Error("Kon Verdi configuratie niet laden");
      return res.json();
    },
    enabled: !!effectiveStationId,
  });

  const { data: userMappings = [] } = useQuery({
    queryKey: ["/api/verdi/mappings/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/verdi/mappings/users");
      if (!res.ok) throw new Error("Kon gebruiker mappings niet laden");
      return res.json();
    },
  });

  const { data: positionMappings = [] } = useQuery({
    queryKey: ["/api/verdi/mappings/positions", effectiveStationId],
    queryFn: async () => {
      if (!effectiveStationId) return [];
      const res = await apiRequest("GET", `/api/verdi/mappings/positions/${effectiveStationId}`);
      if (!res.ok) throw new Error("Kon positie mappings niet laden");
      return res.json();
    },
    enabled: !!effectiveStationId,
  });

  const [configForm, setConfigForm] = useState({
    verdiUrl: "",
    authId: "",
    authSecret: "",
    shiftSheetGuid: "",
    enabled: false,
  });

  const [userGuidInputs, setUserGuidInputs] = useState<{ [userId: number]: string }>({});
  const [positionGuidInputs, setPositionGuidInputs] = useState<{ [positionIndex: number]: string }>({});
  const [userSearchQuery, setUserSearchQuery] = useState("");

  useEffect(() => {
    if (verdiConfig) {
      setConfigForm({
        verdiUrl: verdiConfig.verdiUrl || "",
        authId: verdiConfig.authId || "",
        authSecret: verdiConfig.authSecret || "",
        shiftSheetGuid: verdiConfig.shiftSheetGuid || "",
        enabled: verdiConfig.enabled || false,
      });
    } else {
      setConfigForm({
        verdiUrl: "",
        authId: "",
        authSecret: "",
        shiftSheetGuid: "",
        enabled: false,
      });
    }
  }, [verdiConfig]);

  useEffect(() => {
    const mappings: { [userId: number]: string } = {};
    userMappings.forEach((mapping: any) => {
      mappings[mapping.userId] = mapping.personGuid;
    });
    setUserGuidInputs(mappings);
  }, [userMappings]);

  useEffect(() => {
    const mappings: { [positionIndex: number]: string } = {};
    positionMappings.forEach((mapping: any) => {
      mappings[mapping.positionIndex] = mapping.positionGuid;
    });
    setPositionGuidInputs(mappings);
  }, [positionMappings]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: typeof configForm) => {
      const res = await apiRequest("POST", `/api/verdi/config/${effectiveStationId}`, data);
      if (!res.ok) throw new Error("Kon configuratie niet opslaan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verdi/config", effectiveStationId] });
      toast({
        title: "Opgeslagen",
        description: "Verdi configuratie succesvol bijgewerkt",
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

  const updateUserMappingMutation = useMutation({
    mutationFn: async ({ userId, personGuid }: { userId: number; personGuid: string }) => {
      const res = await apiRequest("POST", `/api/verdi/mapping/user/${userId}`, { personGuid });
      if (!res.ok) throw new Error("Kon gebruiker mapping niet opslaan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verdi/mappings/users"] });
      toast({
        title: "Opgeslagen",
        description: "Person GUID succesvol gekoppeld",
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

  const updatePositionMappingMutation = useMutation({
    mutationFn: async ({ positionIndex, positionGuid }: { positionIndex: number; positionGuid: string }) => {
      const res = await apiRequest("POST", `/api/verdi/mappings/positions/${effectiveStationId}/${positionIndex}`, { positionGuid, requiresLicenseC: true });
      if (!res.ok) throw new Error("Kon positie mapping niet opslaan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verdi/mappings/positions", effectiveStationId] });
      toast({
        title: "Opgeslagen",
        description: "Position GUID succesvol gekoppeld",
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

  const cleanupLegacyLogsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verdi/cleanup-legacy-logs", { stationId: effectiveStationId });
      if (!res.ok) throw new Error("Kon legacy logs niet opschonen");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Opgeschoond",
        description: `${data.deleted} legacy logs verwijderd${data.failed > 0 ? `, ${data.failed} fouten` : ''}`,
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

  const handleConfigSave = () => {
    updateConfigMutation.mutate(configForm);
  };

  const handleUserMappingSave = (userId: number) => {
    const personGuid = userGuidInputs[userId];
    if (!personGuid) {
      toast({
        title: "Fout",
        description: "Person GUID is verplicht",
        variant: "destructive",
      });
      return;
    }
    updateUserMappingMutation.mutate({ userId, personGuid });
  };

  const handlePositionMappingSave = (positionIndex: number) => {
    const positionGuid = positionGuidInputs[positionIndex];
    if (!positionGuid) {
      toast({
        title: "Fout",
        description: "Position GUID is verplicht",
        variant: "destructive",
      });
      return;
    }
    updatePositionMappingMutation.mutate({ positionIndex, positionGuid });
  };

  if (!user || (user.role !== 'admin' && user.role !== 'supervisor')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Geen toegang</CardTitle>
            <CardDescription>
              Je hebt geen toegang tot Verdi instellingen. Alleen admins en supervisors kunnen deze pagina bekijken.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (user.role === 'supervisor' && !selectedStationId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Selecteer een station</CardTitle>
            <CardDescription>Kies een station om Verdi instellingen te beheren</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stations.map((station) => (
                <Button
                  key={station.id}
                  onClick={() => setSelectedStationId(station.id)}
                  className="w-full"
                  variant="outline"
                >
                  {station.displayName}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStation = stations.find(s => s.id === effectiveStationId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Verdi Integratie</h1>
          <p className="text-muted-foreground mt-2">
            Configureer de koppeling met Verdi alarmsoftware
            {currentStation && <span className="font-semibold ml-2">- {currentStation.displayName}</span>}
          </p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/")}>
          <Home className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configuratie</TabsTrigger>
          <TabsTrigger value="users">Gebruiker Mappings</TabsTrigger>
          <TabsTrigger value="positions">Positie Mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Station Configuratie</CardTitle>
              <CardDescription>
                Configureer Verdi verbinding en authenticatie voor dit station
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verdiUrl">Verdi URL</Label>
                <Input
                  id="verdiUrl"
                  placeholder="https://verdi.brandweerzonekempen.be"
                  value={configForm.verdiUrl}
                  onChange={(e) => setConfigForm({ ...configForm, verdiUrl: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Het webadres van uw Verdi installatie
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authId">Verdi API Auth ID</Label>
                <Input
                  id="authId"
                  placeholder="Gebruikersnaam of Auth ID"
                  value={configForm.authId}
                  onChange={(e) => setConfigForm({ ...configForm, authId: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  De gebruikersnaam of ID voor authenticatie op de Verdi API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authSecret">Verdi API Auth Secret</Label>
                <Input
                  id="authSecret"
                  type="password"
                  placeholder="Wachtwoord of secret"
                  value={configForm.authSecret}
                  onChange={(e) => setConfigForm({ ...configForm, authSecret: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Het wachtwoord of secret voor authenticatie op de Verdi API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shiftSheetGuid">ShiftSheet GUID</Label>
                <Input
                  id="shiftSheetGuid"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={configForm.shiftSheetGuid}
                  onChange={(e) => setConfigForm({ ...configForm, shiftSheetGuid: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Unieke identificatie voor uw planning spreadsheet in Verdi
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={configForm.enabled}
                  onCheckedChange={(checked) => setConfigForm({ ...configForm, enabled: checked })}
                />
                <Label htmlFor="enabled">Verdi synchronisatie ingeschakeld</Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleConfigSave} disabled={updateConfigMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateConfigMutation.isPending ? "Opslaan..." : "Configuratie Opslaan"}
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => cleanupLegacyLogsMutation.mutate()}
                  disabled={cleanupLegacyLogsMutation.isPending}
                >
                  {cleanupLegacyLogsMutation.isPending ? "Opschonen..." : "Legacy Logs Opschonen"}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Gebruik "Legacy Logs Opschonen" om oude sync logs zonder snapshot data te verwijderen. Dit is nodig na de update naar het nieuwe systeem.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gebruiker Mappings</CardTitle>
              <CardDescription>
                Koppel elke ambulancier aan hun Verdi Person GUID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam of gebruikersnaam..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gebruiker</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>Person GUID</TableHead>
                    <TableHead>Actie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .filter((user) => {
                      if (!userSearchQuery) return true;
                      const query = userSearchQuery.toLowerCase().trim();
                      const firstName = (user.firstName ?? "").toLowerCase();
                      const lastName = (user.lastName ?? "").toLowerCase();
                      const fullName = `${firstName} ${lastName}`.trim();
                      const username = user.username.toLowerCase();
                      
                      return (
                        username.includes(query) ||
                        firstName.includes(query) ||
                        lastName.includes(query) ||
                        fullName.includes(query)
                      );
                    })
                    .map((user) => {
                      const existingMapping = userMappings.find((m: any) => m.userId === user.id);
                      return (
                        <TableRow key={user.id}>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.firstName} {user.lastName}</TableCell>
                          <TableCell>
                            <Input
                              placeholder="Person GUID"
                              defaultValue={existingMapping?.personGuid || ""}
                              onChange={(e) => setUserGuidInputs({ ...userGuidInputs, [user.id]: e.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleUserMappingSave(user.id)}
                              disabled={updateUserMappingMutation.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Positie Mappings</CardTitle>
              <CardDescription>
                Koppel elke shift positie aan een Verdi Position GUID voor {currentStation?.displayName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { index: 1, name: "Positie 1 (Chauffeur)", description: "Voor ambulancier die rijdt - vereist rijbewijs C tijdens planning" },
                { index: 2, name: "Positie 2 (Bijrijder)", description: "Voor ambulancier die meerijdt - rijbewijs C niet vereist" }
              ].map((position) => {
                const existingMapping = positionMappings.find((m: any) => m.positionIndex === position.index);
                return (
                  <div key={position.index} className="space-y-2">
                    <div>
                      <Label htmlFor={`position-${position.index}`} className="text-base font-semibold">
                        {position.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">{position.description}</p>
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="flex-1 space-y-2">
                        <Input
                          id={`position-${position.index}`}
                          placeholder="Position GUID"
                          value={positionGuidInputs[position.index] || ""}
                          onChange={(e) => setPositionGuidInputs({ ...positionGuidInputs, [position.index]: e.target.value })}
                        />
                      </div>
                      <Button
                        onClick={() => handlePositionMappingSave(position.index)}
                        disabled={updatePositionMappingMutation.isPending}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Opslaan
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
