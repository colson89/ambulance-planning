import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type User, type Station } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
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
import { Home, Save, Upload, Download, Search, FileUp, CheckCircle, XCircle, AlertCircle, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    emergencyPersonGuid1: "",
    emergencyPersonGuid2: "",
    enabled: false,
  });

  const [userGuidInputs, setUserGuidInputs] = useState<{ [userId: number]: string }>({});
  const [positionGuidInputs, setPositionGuidInputs] = useState<{ [positionIndex: number]: string }>({});
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  
  // Sort state for user mappings table
  type SortColumn = 'username' | 'name' | 'personGuid';
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      // For personGuid, default to showing empty values first (asc = empty first)
      setSortDirection(column === 'personGuid' ? 'asc' : 'asc');
    }
  };
  
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-4 w-4" />
      : <ArrowDown className="ml-1 h-4 w-4" />;
  };
  
  // Excel import state for user mappings
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResults, setImportResults] = useState<{
    matched: Array<{ userId: number; username: string; firstName: string; lastName: string; personGuid: string; excelPost?: string; hasExistingMapping?: boolean; existingGuid?: string }>;
    notFoundInSystem: Array<{ firstName: string; lastName: string; personGuid: string; post?: string }>;
    noMatch: Array<{ userId: number; username: string; firstName: string; lastName: string }>;
    stats: { totalExcelRows: number; uniquePersons: number; matchedCount: number; notFoundCount: number; noMatchCount: number };
  } | null>(null);

  // Config import state (ShiftSheet GUID + position mappings)
  const [configImportDialogOpen, setConfigImportDialogOpen] = useState(false);
  const [configImportResults, setConfigImportResults] = useState<{
    matched: Array<{
      stationId: number;
      stationName: string;
      shiftSheetGuid: string;
      shiftSheetName: string;
      position1Guid: string | null;
      position1Name: string | null;
      position2Guid: string | null;
      position2Name: string | null;
      hasExistingConfig: boolean;
      existingShiftSheetGuid: string | null;
    }>;
    notMatched: Array<{
      shiftSheetGuid: string;
      shiftSheetName: string;
      positions: Array<{ guid: string; name: string }>;
    }>;
    stats: { totalShiftSheets: number; matchedCount: number; notMatchedCount: number };
  } | null>(null);
  const [selectedConfigMatches, setSelectedConfigMatches] = useState<Set<number>>(new Set());
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(new Set());
  const previousConfigRef = useRef<string>("");

  useEffect(() => {
    if (user) {
      setActiveTab(user.role === 'supervisor' ? 'config' : 'users');
    }
  }, [user]);

  useEffect(() => {
    // Early return if config is still loading (undefined), but allow null (no config exists)
    if (verdiConfig === undefined && effectiveStationId) return;
    
    // Serialize the relevant config fields to detect actual changes
    const currentConfigStr = JSON.stringify({
      verdiUrl: verdiConfig?.verdiUrl || "",
      authId: verdiConfig?.authId || "",
      authSecret: verdiConfig?.authSecret || "",
      shiftSheetGuid: verdiConfig?.shiftSheetGuid || "",
      emergencyPersonGuid1: verdiConfig?.emergencyPersonGuid1 || "",
      emergencyPersonGuid2: verdiConfig?.emergencyPersonGuid2 || "",
      enabled: verdiConfig?.enabled || false,
      stationId: effectiveStationId
    });
    
    // Only update if the config actually changed
    if (currentConfigStr !== previousConfigRef.current) {
      previousConfigRef.current = currentConfigStr;
      
      if (verdiConfig) {
        setConfigForm({
          verdiUrl: verdiConfig.verdiUrl || "",
          authId: verdiConfig.authId || "",
          authSecret: verdiConfig.authSecret || "",
          shiftSheetGuid: verdiConfig.shiftSheetGuid || "",
          emergencyPersonGuid1: verdiConfig.emergencyPersonGuid1 || "",
          emergencyPersonGuid2: verdiConfig.emergencyPersonGuid2 || "",
          enabled: verdiConfig.enabled || false,
        });
      } else {
        setConfigForm({
          verdiUrl: "",
          authId: "",
          authSecret: "",
          shiftSheetGuid: "",
          emergencyPersonGuid1: "",
          emergencyPersonGuid2: "",
          enabled: false,
        });
      }
    }
  }, [verdiConfig, effectiveStationId]);

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

  const importExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/verdi/mappings/users/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon Excel bestand niet importeren");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      // Select all matched users by default
      setSelectedMatches(new Set(data.matched.map((m: any) => m.userId)));
      setImportDialogOpen(true);
      toast({
        title: "Excel geïmporteerd",
        description: `${data.stats.matchedCount} matches gevonden uit ${data.stats.uniquePersons} personen`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmImportMutation = useMutation({
    mutationFn: async (mappings: Array<{ userId: number; personGuid: string }>) => {
      const res = await apiRequest("POST", "/api/verdi/mappings/users/import/confirm", { mappings });
      if (!res.ok) throw new Error("Kon mappings niet opslaan");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/verdi/mappings/users"] });
      setImportDialogOpen(false);
      setImportResults(null);
      setSelectedMatches(new Set());
      // Reset file input
      const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      toast({
        title: "Import voltooid",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Config import mutations (ShiftSheet GUID + position mappings)
  const importConfigMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/verdi/config/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kon Excel bestand niet importeren");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setConfigImportResults(data);
      // Select all matched stations by default
      setSelectedConfigMatches(new Set(data.matched.map((m: any) => m.stationId)));
      setConfigImportDialogOpen(true);
      toast({
        title: "Excel geïmporteerd",
        description: `${data.stats.matchedCount} station matches gevonden`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmConfigImportMutation = useMutation({
    mutationFn: async (configs: Array<{ stationId: number; shiftSheetGuid: string; position1Guid: string | null; position2Guid: string | null }>) => {
      const res = await apiRequest("POST", "/api/verdi/config/import/confirm", { configs });
      if (!res.ok) throw new Error("Kon configuratie niet opslaan");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/verdi/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verdi/mappings/positions"] });
      setConfigImportDialogOpen(false);
      setConfigImportResults(null);
      setSelectedConfigMatches(new Set());
      // Reset file input
      const fileInput = document.getElementById('config-excel-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      toast({
        title: "Import voltooid",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfigFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importConfigMutation.mutate(file);
    }
  };

  const handleConfirmConfigImport = () => {
    if (!configImportResults) return;
    
    const selectedConfigs = configImportResults.matched
      .filter(m => selectedConfigMatches.has(m.stationId))
      .map(m => ({
        stationId: m.stationId,
        shiftSheetGuid: m.shiftSheetGuid,
        position1Guid: m.position1Guid,
        position2Guid: m.position2Guid
      }));
    
    confirmConfigImportMutation.mutate(selectedConfigs);
  };

  const toggleConfigMatch = (stationId: number) => {
    const newSet = new Set(selectedConfigMatches);
    if (newSet.has(stationId)) {
      newSet.delete(stationId);
    } else {
      newSet.add(stationId);
    }
    setSelectedConfigMatches(newSet);
  };

  const toggleAllConfigMatches = () => {
    if (!configImportResults) return;
    if (selectedConfigMatches.size === configImportResults.matched.length) {
      setSelectedConfigMatches(new Set());
    } else {
      setSelectedConfigMatches(new Set(configImportResults.matched.map(m => m.stationId)));
    }
  };

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importExcelMutation.mutate(file);
      // Reset file input to allow re-uploading same file
      event.target.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!importResults) return;
    
    const mappings = importResults.matched
      .filter(m => selectedMatches.has(m.userId))
      .map(m => ({ userId: m.userId, personGuid: m.personGuid }));
    
    if (mappings.length === 0) {
      toast({
        title: "Geen selectie",
        description: "Selecteer minimaal één gebruiker om te importeren",
        variant: "destructive",
      });
      return;
    }
    
    confirmImportMutation.mutate(mappings);
  };

  const toggleMatchSelection = (userId: number) => {
    const newSet = new Set(selectedMatches);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedMatches(newSet);
  };

  const toggleAllMatches = () => {
    if (!importResults) return;
    if (selectedMatches.size === importResults.matched.length) {
      setSelectedMatches(new Set());
    } else {
      setSelectedMatches(new Set(importResults.matched.map(m => m.userId)));
    }
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
        <div className="mb-4">
          <Button variant="outline" onClick={() => setLocation("/")}>
            <Home className="mr-2 h-4 w-4" />
            Terug naar Dashboard
          </Button>
        </div>
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
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Verdi Integratie</h1>
            <p className="text-muted-foreground mt-2">
              Configureer de koppeling met Verdi alarmsoftware
            </p>
          </div>
          {user?.role === 'supervisor' && (
            <Select
              value={selectedStationId?.toString() || ""}
              onValueChange={(value) => setSelectedStationId(parseInt(value))}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Kies station..." />
              </SelectTrigger>
              <SelectContent>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.id.toString()}>
                    {station.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {user?.role === 'admin' && currentStation && (
            <span className="text-lg font-semibold text-muted-foreground">
              {currentStation.displayName}
            </span>
          )}
        </div>
        <Button variant="outline" onClick={() => setLocation("/")}>
          <Home className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${user?.role === 'supervisor' ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {user?.role === 'supervisor' && (
            <TabsTrigger value="config">Configuratie</TabsTrigger>
          )}
          <TabsTrigger value="users">Gebruiker Mappings</TabsTrigger>
          {user?.role === 'supervisor' && (
            <TabsTrigger value="positions">Positie Mappings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Station Configuratie</CardTitle>
                  <CardDescription>
                    Configureer Verdi verbinding en authenticatie voor dit station
                  </CardDescription>
                </div>
                <div>
                  <input
                    type="file"
                    id="config-excel-upload"
                    accept=".xlsx,.xls"
                    onChange={handleConfigFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('config-excel-upload')?.click()}
                    disabled={importConfigMutation.isPending}
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    {importConfigMutation.isPending ? "Importeren..." : "Import uit Verdi Excel"}
                  </Button>
                </div>
              </div>
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

              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold mb-2">Noodinplanning PersonGUIDs</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Wanneer een ambulancier via noodinplanning wordt ingezet op dit station (iemand van een ander station), 
                  wordt deze PersonGUID gebruikt in Verdi. Configureer 2 GUIDs voor het geval beide ambulanciers van elders komen.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPersonGuid1">Nood PersonGUID 1 (met rijbewijs C)</Label>
                    <Input
                      id="emergencyPersonGuid1"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={configForm.emergencyPersonGuid1}
                      onChange={(e) => setConfigForm({ ...configForm, emergencyPersonGuid1: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Gebruikt voor ambulanciers met rijbewijs C
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPersonGuid2">Nood PersonGUID 2 (zonder rijbewijs C)</Label>
                    <Input
                      id="emergencyPersonGuid2"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={configForm.emergencyPersonGuid2}
                      onChange={(e) => setConfigForm({ ...configForm, emergencyPersonGuid2: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Gebruikt voor ambulanciers zonder rijbewijs C, of als fallback
                    </p>
                  </div>
                </div>
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
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Gebruiker Mappings</CardTitle>
                  <CardDescription>
                    Koppel elke ambulancier aan hun Verdi Person GUID
                  </CardDescription>
                </div>
                <div>
                  <input
                    type="file"
                    id="excel-upload"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('excel-upload')?.click()}
                    disabled={importExcelMutation.isPending}
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    {importExcelMutation.isPending ? "Importeren..." : "Import uit Excel"}
                  </Button>
                </div>
              </div>
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
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('username')}
                    >
                      <div className="flex items-center">
                        Gebruiker
                        {getSortIcon('username')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Naam
                        {getSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('personGuid')}
                    >
                      <div className="flex items-center">
                        Person GUID
                        {getSortIcon('personGuid')}
                      </div>
                    </TableHead>
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
                    .sort((a, b) => {
                      const mappingA = userMappings.find((m: any) => m.userId === a.id);
                      const mappingB = userMappings.find((m: any) => m.userId === b.id);
                      
                      let compareResult = 0;
                      
                      switch (sortColumn) {
                        case 'username':
                          compareResult = a.username.localeCompare(b.username);
                          break;
                        case 'name':
                          const nameA = `${a.lastName ?? ''} ${a.firstName ?? ''}`.trim().toLowerCase();
                          const nameB = `${b.lastName ?? ''} ${b.firstName ?? ''}`.trim().toLowerCase();
                          compareResult = nameA.localeCompare(nameB);
                          break;
                        case 'personGuid':
                          const guidA = mappingA?.personGuid || '';
                          const guidB = mappingB?.personGuid || '';
                          // Empty values should come first when ascending (to easily find missing GUIDs)
                          if (!guidA && guidB) compareResult = -1;
                          else if (guidA && !guidB) compareResult = 1;
                          else compareResult = guidA.localeCompare(guidB);
                          break;
                      }
                      
                      return sortDirection === 'asc' ? compareResult : -compareResult;
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

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Excel Import Preview</DialogTitle>
            <DialogDescription>
              Review de automatische matches en selecteer welke je wilt importeren
            </DialogDescription>
          </DialogHeader>

          {importResults && (
            <div className="space-y-6">
              {/* Statistics */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Statistieken</AlertTitle>
                <AlertDescription className="mt-2 space-y-1">
                  <div>Totaal personen in Excel: <strong>{importResults.stats.uniquePersons}</strong> (uit {importResults.stats.totalExcelRows} rijen)</div>
                  <div className="text-green-600">✓ Matches gevonden: <strong>{importResults.stats.matchedCount}</strong></div>
                  <div className="text-amber-600">⚠ Niet in systeem: <strong>{importResults.stats.notFoundCount}</strong></div>
                  <div className="text-blue-600">ⓘ Gebruikers zonder match: <strong>{importResults.stats.noMatchCount}</strong></div>
                </AlertDescription>
              </Alert>

              {/* Matched Users - Selecteerbaar */}
              {importResults.matched.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Succesvolle Matches ({selectedMatches.size}/{importResults.matched.length} geselecteerd)
                    </h3>
                    <Button variant="outline" size="sm" onClick={toggleAllMatches}>
                      {selectedMatches.size === importResults.matched.length ? "Deselecteer alles" : "Selecteer alles"}
                    </Button>
                  </div>
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Gebruiker</TableHead>
                          <TableHead>Naam</TableHead>
                          <TableHead>Person GUID</TableHead>
                          <TableHead>Excel Post</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResults.matched.map((match) => (
                          <TableRow key={match.userId} className={match.hasExistingMapping ? "bg-amber-50" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedMatches.has(match.userId)}
                                onCheckedChange={() => toggleMatchSelection(match.userId)}
                              />
                            </TableCell>
                            <TableCell>
                              {match.username}
                              {match.hasExistingMapping && (
                                <span className="ml-2 text-xs text-amber-600">(heeft mapping)</span>
                              )}
                            </TableCell>
                            <TableCell>{match.firstName} {match.lastName}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {match.personGuid}
                              {match.hasExistingMapping && match.existingGuid !== match.personGuid && (
                                <div className="text-xs text-amber-600 mt-1">
                                  Was: {match.existingGuid}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{match.excelPost || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Not Found in System */}
              {importResults.notFoundInSystem.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    Niet gevonden in systeem ({importResults.notFoundInSystem.length})
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Deze personen staan in het Excel bestand maar niet in uw planning systeem
                  </p>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Voornaam</TableHead>
                          <TableHead>Achternaam</TableHead>
                          <TableHead>Person GUID</TableHead>
                          <TableHead>Post</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResults.notFoundInSystem.map((person, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{person.firstName}</TableCell>
                            <TableCell>{person.lastName}</TableCell>
                            <TableCell className="font-mono text-xs">{person.personGuid}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{person.post || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Users Without Match */}
              {importResults.noMatch.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-blue-600" />
                    Gebruikers zonder match ({importResults.noMatch.length})
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Deze gebruikers staan in uw systeem maar niet in het Excel bestand
                  </p>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Gebruiker</TableHead>
                          <TableHead>Naam</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResults.noMatch.map((user) => (
                          <TableRow key={user.userId}>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.firstName} {user.lastName}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleConfirmImport}
              disabled={confirmImportMutation.isPending || selectedMatches.size === 0}
            >
              {confirmImportMutation.isPending ? "Importeren..." : `Importeer ${selectedMatches.size} mappings`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Import Preview Dialog (ShiftSheet GUID + Position Mappings) */}
      <Dialog open={configImportDialogOpen} onOpenChange={setConfigImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verdi Configuratie Import</DialogTitle>
            <DialogDescription>
              Importeer ShiftSheet GUIDs en positie mappings voor alle stations
            </DialogDescription>
          </DialogHeader>

          {configImportResults && (
            <div className="space-y-6">
              {/* Statistics */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Statistieken</AlertTitle>
                <AlertDescription className="mt-2 space-y-1">
                  <div>Totaal ShiftSheets in Excel: <strong>{configImportResults.stats.totalShiftSheets}</strong></div>
                  <div className="text-green-600">✓ Stations gematcht: <strong>{configImportResults.stats.matchedCount}</strong></div>
                  <div className="text-amber-600">⚠ Niet gematcht: <strong>{configImportResults.stats.notMatchedCount}</strong></div>
                </AlertDescription>
              </Alert>

              {/* Matched Stations */}
              {configImportResults.matched.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Gematchte Stations ({selectedConfigMatches.size}/{configImportResults.matched.length} geselecteerd)
                    </h3>
                    <Button variant="outline" size="sm" onClick={toggleAllConfigMatches}>
                      {selectedConfigMatches.size === configImportResults.matched.length ? "Deselecteer alles" : "Selecteer alles"}
                    </Button>
                  </div>
                  <div className="border rounded-lg max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Station</TableHead>
                          <TableHead>Verdi ShiftSheet</TableHead>
                          <TableHead>Positie 1 (Chauffeur)</TableHead>
                          <TableHead>Positie 2 (Bijrijder)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {configImportResults.matched.map((match) => (
                          <TableRow key={match.stationId} className={match.hasExistingConfig ? "bg-amber-50" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedConfigMatches.has(match.stationId)}
                                onCheckedChange={() => toggleConfigMatch(match.stationId)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{match.stationName}</div>
                              {match.hasExistingConfig && (
                                <span className="text-xs text-amber-600">(heeft bestaande config)</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">{match.shiftSheetName}</div>
                              <div className="font-mono text-xs">{match.shiftSheetGuid.substring(0, 18)}...</div>
                              {match.hasExistingConfig && match.existingShiftSheetGuid !== match.shiftSheetGuid && (
                                <div className="text-xs text-amber-600 mt-1">
                                  Was: {match.existingShiftSheetGuid?.substring(0, 18)}...
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {match.position1Name ? (
                                <div>
                                  <div className="text-sm">{match.position1Name}</div>
                                  <div className="font-mono text-xs text-muted-foreground">{match.position1Guid?.substring(0, 8)}...</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Niet gevonden</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {match.position2Name ? (
                                <div>
                                  <div className="text-sm">{match.position2Name}</div>
                                  <div className="font-mono text-xs text-muted-foreground">{match.position2Guid?.substring(0, 8)}...</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Niet gevonden</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Not Matched ShiftSheets */}
              {configImportResults.notMatched.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    Niet gematchte ShiftSheets ({configImportResults.notMatched.length})
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Deze ShiftSheets uit Verdi konden niet automatisch gekoppeld worden aan een station
                  </p>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ShiftSheet Naam</TableHead>
                          <TableHead>GUID</TableHead>
                          <TableHead>Posities</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {configImportResults.notMatched.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.shiftSheetName}</TableCell>
                            <TableCell className="font-mono text-xs">{item.shiftSheetGuid.substring(0, 18)}...</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.positions.map(p => p.name).join(', ')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigImportDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleConfirmConfigImport}
              disabled={confirmConfigImportMutation.isPending || selectedConfigMatches.size === 0}
            >
              {confirmConfigImportMutation.isPending ? "Importeren..." : `Importeer ${selectedConfigMatches.size} configuraties`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
