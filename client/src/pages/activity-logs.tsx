import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { nl } from "date-fns/locale";
import { FileText, ChevronLeft, ChevronRight, ArrowLeft, Download, Filter, Search, Calendar, User, Building2, Check, X, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";

interface ActivityLog {
  id: number;
  userId: number | null;
  stationId: number | null;
  action: string;
  category: string;
  details: string | null;
  targetUserId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  deviceOS: string | null;
  location: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; username: string } | null;
  targetUser: { firstName: string; lastName: string; username: string } | null;
}

interface ActivityLogsResponse {
  logs: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
}

interface UserData {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  stationId: number;
}

interface Station {
  id: number;
  name: string;
  displayName: string;
}

const categoryLabels: Record<string, string> = {
  LOGIN: "Inloggen",
  LOGOUT: "Uitloggen",
  PREFERENCE: "Voorkeuren",
  SCHEDULE: "Planning",
  SHIFT_SWAP: "Shift Ruilen",
  USER_MANAGEMENT: "Gebruikersbeheer",
  SETTINGS: "Instellingen",
  VERDI: "Verdi",
  OVERTIME: "Overuren",
  PROFILE: "Profiel",
  OTHER: "Overig",
  // Legacy lowercase categories
  auth: "Authenticatie",
  preferences: "Voorkeuren",
  schedule: "Planning",
  users: "Gebruikers",
  settings: "Instellingen",
  verdi: "Verdi",
  overtime: "Overuren",
  other: "Overig",
};

const categoryColors: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-800",
  LOGOUT: "bg-blue-100 text-blue-800",
  PREFERENCE: "bg-green-100 text-green-800",
  SCHEDULE: "bg-purple-100 text-purple-800",
  SHIFT_SWAP: "bg-indigo-100 text-indigo-800",
  USER_MANAGEMENT: "bg-orange-100 text-orange-800",
  SETTINGS: "bg-gray-100 text-gray-800",
  VERDI: "bg-cyan-100 text-cyan-800",
  OVERTIME: "bg-yellow-100 text-yellow-800",
  PROFILE: "bg-pink-100 text-pink-800",
  OTHER: "bg-slate-100 text-slate-800",
  // Legacy lowercase categories
  auth: "bg-blue-100 text-blue-800",
  preferences: "bg-green-100 text-green-800",
  schedule: "bg-purple-100 text-purple-800",
  users: "bg-orange-100 text-orange-800",
  settings: "bg-gray-100 text-gray-800",
  verdi: "bg-cyan-100 text-cyan-800",
  overtime: "bg-yellow-100 text-yellow-800",
  other: "bg-slate-100 text-slate-800",
};

export default function ActivityLogsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedStationIds, setSelectedStationIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [userSearchText, setUserSearchText] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [detailsSearchText, setDetailsSearchText] = useState("");
  const limit = 50;

  const allCategories = [
    { id: "LOGIN", label: "Inloggen", legacy: "auth" },
    { id: "LOGOUT", label: "Uitloggen", legacy: "auth" },
    { id: "PREFERENCE", label: "Voorkeuren", legacy: "preferences" },
    { id: "SCHEDULE", label: "Planning", legacy: "schedule" },
    { id: "SHIFT_SWAP", label: "Shift Ruilen", legacy: null },
    { id: "USER_MANAGEMENT", label: "Gebruikersbeheer", legacy: "users" },
    { id: "SETTINGS", label: "Instellingen", legacy: "settings" },
    { id: "VERDI", label: "Verdi", legacy: "verdi" },
    { id: "OVERTIME", label: "Overuren", legacy: "overtime" },
    { id: "PROFILE", label: "Profiel", legacy: null },
    { id: "OTHER", label: "Overig", legacy: "other" },
  ];

  const getCategoriesWithLegacy = (selectedCats: string[]) => {
    const result: string[] = [];
    for (const cat of selectedCats) {
      result.push(cat);
      const catDef = allCategories.find(c => c.id === cat);
      if (catDef?.legacy && !result.includes(catDef.legacy)) {
        result.push(catDef.legacy);
      }
    }
    return result;
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
    setCurrentPage(0);
  };

  const toggleStation = (stationId: number) => {
    setSelectedStationIds(prev => 
      prev.includes(stationId) 
        ? prev.filter(s => s !== stationId)
        : [...prev, stationId]
    );
    setCurrentPage(0);
  };

  const selectAllCategories = () => {
    setSelectedCategories(allCategories.map(c => c.id));
    setCurrentPage(0);
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
    setCurrentPage(0);
  };

  const selectAllStations = (stationsList: Station[]) => {
    setSelectedStationIds(stationsList.map(s => s.id));
    setCurrentPage(0);
  };

  const clearAllStations = () => {
    setSelectedStationIds([]);
    setCurrentPage(0);
  };
  
  const isSupervisor = user?.role === 'supervisor';

  if (!isSupervisor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Geen Toegang</CardTitle>
            <CardDescription>
              U heeft geen toegang tot deze pagina. Alleen supervisors kunnen activiteitenlogs bekijken.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
  });

  const { data: users = [] } = useQuery<UserData[]>({
    queryKey: ["/api/users"],
  });

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    if (startDate) {
      params.append('startDate', startOfDay(new Date(startDate)).toISOString());
    }
    if (endDate) {
      params.append('endDate', endOfDay(new Date(endDate)).toISOString());
    }
    if (selectedCategories.length > 0) {
      const categoriesWithLegacy = getCategoriesWithLegacy(selectedCategories);
      params.append('categories', categoriesWithLegacy.join(','));
    }
    if (selectedUserId !== "all") {
      params.append('userId', selectedUserId);
    }
    if (isSupervisor && selectedStationIds.length > 0) {
      params.append('stationIds', selectedStationIds.join(','));
    }
    if (detailsSearchText.trim()) {
      params.append('detailsSearch', detailsSearchText.trim());
    }
    
    params.append('limit', limit.toString());
    params.append('offset', (currentPage * limit).toString());
    
    return params.toString();
  };

  const { data: logsData, isLoading, error } = useQuery<ActivityLogsResponse>({
    queryKey: ["/api/activity-logs", startDate, endDate, selectedCategories, selectedUserId, selectedStationIds, detailsSearchText.trim(), currentPage],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/activity-logs?${buildQueryParams()}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Fout bij ophalen logs");
      }
      return res.json();
    },
  });

  const logs = logsData?.logs || [];
  const totalCount = logsData?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startOfDay(new Date(startDate)).toISOString());
      if (endDate) params.append('endDate', endOfDay(new Date(endDate)).toISOString());
      if (selectedCategories.length > 0) {
        const categoriesWithLegacy = getCategoriesWithLegacy(selectedCategories);
        params.append('categories', categoriesWithLegacy.join(','));
      }
      if (selectedUserId !== "all") params.append('userId', selectedUserId);
      if (isSupervisor && selectedStationIds.length > 0) params.append('stationIds', selectedStationIds.join(','));
      if (detailsSearchText.trim()) params.append('detailsSearch', detailsSearchText.trim());

      const response = await fetch(`/api/activity-logs/export?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Export mislukt');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Activiteitenlog_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const formatDateTime = (dateStr: string) => {
    // Format UTC timestamp directly to Europe/Brussels timezone
    return formatInTimeZone(new Date(dateStr), 'Europe/Brussels', "dd MMM yyyy HH:mm", { locale: nl });
  };

  const getUserName = (log: ActivityLog) => {
    if (log.user) {
      return `${log.user.firstName} ${log.user.lastName}`;
    }
    return "Systeem";
  };

  const getTargetUserName = (log: ActivityLog) => {
    if (log.targetUser) {
      return `${log.targetUser.firstName} ${log.targetUser.lastName}`;
    }
    return "-";
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Activiteitenlog
              </h1>
              <p className="text-muted-foreground text-sm">
                Bekijk alle activiteiten in het systeem
              </p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporteer naar Excel
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Van datum
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(0);
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Tot datum
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(0);
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Categorieën</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-10 font-normal">
                      <span className="truncate">
                        {selectedCategories.length === 0 
                          ? "Alle categorieën"
                          : selectedCategories.length === allCategories.length
                            ? "Alle categorieën"
                            : `${selectedCategories.length} geselecteerd`}
                      </span>
                      <Filter className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="flex gap-1 mb-2 pb-2 border-b">
                      <Button variant="outline" size="sm" onClick={selectAllCategories} className="flex-1 h-7 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Alles
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearAllCategories} className="flex-1 h-7 text-xs">
                        <X className="h-3 w-3 mr-1" />
                        Niets
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {allCategories.map((cat) => (
                        <div key={cat.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`cat-${cat.id}`}
                            checked={selectedCategories.includes(cat.id)}
                            onCheckedChange={() => toggleCategory(cat.id)}
                          />
                          <label
                            htmlFor={`cat-${cat.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {cat.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2 relative">
                <Label className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Gebruiker
                </Label>
                <div className="relative">
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Zoek gebruiker..."
                        value={userSearchText}
                        onChange={(e) => {
                          const value = e.target.value;
                          setUserSearchText(value);
                          setShowUserDropdown(true);
                          if (value.trim() === "") {
                            setSelectedUserId("all");
                            setCurrentPage(0);
                          }
                        }}
                        onFocus={() => setShowUserDropdown(true)}
                        className="pl-8"
                      />
                    </div>
                    {(selectedUserId !== "all" || userSearchText.trim() !== "") && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => {
                          setUserSearchText("");
                          setSelectedUserId("all");
                          setShowUserDropdown(false);
                          setCurrentPage(0);
                        }}
                      >
                        <span className="text-lg">&times;</span>
                      </Button>
                    )}
                  </div>
                  {showUserDropdown && userSearchText.trim().length > 0 && (() => {
                    const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
                    const searchTerms = normalize(userSearchText).split(' ').filter(t => t.length > 0);
                    
                    const filteredUsers = users.filter(u => {
                      const fullName = normalize(`${u.firstName} ${u.lastName}`);
                      const reverseName = normalize(`${u.lastName} ${u.firstName}`);
                      const username = normalize(u.username);
                      
                      return searchTerms.every(term => 
                        fullName.includes(term) || 
                        reverseName.includes(term) || 
                        username.includes(term)
                      );
                    });
                    
                    return (
                      <div 
                        className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {filteredUsers.slice(0, 20).map((u) => (
                          <div
                            key={u.id}
                            className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                            onClick={() => {
                              setSelectedUserId(u.id.toString());
                              setUserSearchText(`${u.firstName} ${u.lastName}`);
                              setShowUserDropdown(false);
                              setCurrentPage(0);
                            }}
                          >
                            {u.firstName} {u.lastName}
                            <span className="text-muted-foreground ml-2 text-xs">({u.username})</span>
                          </div>
                        ))}
                        {filteredUsers.length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Geen gebruikers gevonden
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {showUserDropdown && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserDropdown(false)}
                  />
                )}
              </div>
              
              {isSupervisor && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    Stations
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-10 font-normal">
                        <span className="truncate">
                          {selectedStationIds.length === 0 
                            ? "Alle stations"
                            : selectedStationIds.length === stations.length
                              ? "Alle stations"
                              : `${selectedStationIds.length} geselecteerd`}
                        </span>
                        <Building2 className="h-4 w-4 ml-2 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                      <div className="flex gap-1 mb-2 pb-2 border-b">
                        <Button variant="outline" size="sm" onClick={() => selectAllStations(stations)} className="flex-1 h-7 text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Alles
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearAllStations} className="flex-1 h-7 text-xs">
                          <X className="h-3 w-3 mr-1" />
                          Niets
                        </Button>
                      </div>
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {stations.map((station) => (
                          <div key={station.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              id={`station-${station.id}`}
                              checked={selectedStationIds.includes(station.id)}
                              onCheckedChange={() => toggleStation(station.id)}
                            />
                            <label
                              htmlFor={`station-${station.id}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {station.displayName}
                            </label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Search className="h-4 w-4" />
                  Zoek in details
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Zoek in details tekst... (bijv. naam, datum, actie)"
                      value={detailsSearchText}
                      onChange={(e) => {
                        setDetailsSearchText(e.target.value);
                        setCurrentPage(0);
                      }}
                      className="pl-8"
                    />
                  </div>
                  {detailsSearchText.trim() !== "" && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => {
                        setDetailsSearchText("");
                        setCurrentPage(0);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Activiteiten ({totalCount} resultaten)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Pagina {currentPage + 1} van {Math.max(1, totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Laden...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Fout bij laden van activiteitenlogs
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Geen activiteiten gevonden voor de geselecteerde filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Datum/Tijd</TableHead>
                      <TableHead>Gebruiker</TableHead>
                      <TableHead className="w-[120px]">Categorie</TableHead>
                      <TableHead>Actie</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Doelgebruiker</TableHead>
                      <TableHead>Toestel</TableHead>
                      <TableHead>Locatie</TableHead>
                      <TableHead className="w-[120px]">IP-adres</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getUserName(log)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={categoryColors[log.category] || ""}>
                            {categoryLabels[log.category] || log.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell className="max-w-[300px] text-sm text-muted-foreground">
                          {log.details ? (
                            <TooltipProvider>
                              <Tooltip delayDuration={200}>
                                <TooltipTrigger asChild>
                                  <span className="block truncate cursor-help">
                                    {log.details}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="top" 
                                  className="max-w-[400px] whitespace-pre-wrap break-words"
                                >
                                  {log.details}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{getTargetUserName(log)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.deviceType && log.deviceOS 
                            ? `${log.deviceType} (${log.deviceOS})`
                            : log.deviceType || log.deviceOS || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.location || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {log.ipAddress || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
