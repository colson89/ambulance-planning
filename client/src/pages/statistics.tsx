import { useState, useMemo, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, BarChart3, ArrowLeft, Calendar, Users, Clock, TrendingUp, Search, ArrowUp, ArrowDown, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

interface Station {
  id: number;
  name: string;
  code: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

type ShiftStatistics = {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  // Preferences (in hours)
  dayShiftWeekHours: number;
  nightShiftWeekHours: number;
  dayShiftWeekendHours: number;
  nightShiftWeekendHours: number;
  totalPreferenceHours: number;
  // Actual shifts (in hours)
  actualDayShiftWeekHours: number;
  actualNightShiftWeekHours: number;
  actualDayShiftWeekendHours: number;
  actualNightShiftWeekendHours: number;
  totalActualHours: number;
  // Maximum hours willing to work
  maxHours: number;
};

type PeriodType = "month" | "quarter" | "year";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maart" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Augustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const QUARTERS = [
  { value: 1, label: "Q1 (Jan-Mrt)" },
  { value: 2, label: "Q2 (Apr-Jun)" },
  { value: 3, label: "Q3 (Jul-Sep)" },
  { value: 4, label: "Q4 (Okt-Dec)" },
];

function Statistics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil(CURRENT_MONTH / 3));
  const [searchTerm, setSearchTerm] = useState("");
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<keyof ShiftStatistics | "name" | "percentage">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Query voor stations (voor supervisors EN admins)
  const { data: stations, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ["/api/user/stations"],
    enabled: user?.role === 'supervisor' || user?.role === 'admin',
  });
  
  // Check of admin multi-station toegang heeft (meer dan 1 station beschikbaar)
  const isMultiStationAdmin = user?.role === 'admin' && stations && stations.length > 1;
  
  // Bepaal of station selector getoond moet worden
  const showStationSelector = user?.role === 'supervisor' || isMultiStationAdmin;

  // Station selector state - initialiseer intelligent gebaseerd op rol en beschikbare stations
  const [selectedStationId, setSelectedStationId] = useState<number | null>(() => {
    // Voor supervisors: check sessionStorage of null (moet selecteren)
    if (user?.role === 'supervisor') {
      const savedStationId = sessionStorage.getItem('selectedStationId');
      return savedStationId ? parseInt(savedStationId) : null;
    }
    // Voor admins: check sessionStorage, fallback naar eigen station
    if (user?.role === 'admin') {
      const savedStationId = sessionStorage.getItem('selectedStationId');
      if (savedStationId) {
        return parseInt(savedStationId);
      }
      // Fallback naar eigen station
      return user?.stationId || null;
    }
    return user?.stationId || null;
  });

  // Effectieve station ID - voor supervisors moet station geselecteerd worden,
  // voor admins: gebruik geselecteerde station of fallback naar eigen station
  const effectiveStationId = useMemo(() => {
    // Supervisor moet altijd expliciet een station selecteren
    if (user?.role === 'supervisor') {
      return selectedStationId;
    }
    // Admin: gebruik geselecteerde station als die beschikbaar is, anders eigen station
    if (user?.role === 'admin') {
      return selectedStationId || user?.stationId;
    }
    return user?.stationId;
  }, [user?.role, selectedStationId, user?.stationId]);
  
  // Handler voor station selectie verandering
  const handleStationChange = (value: string) => {
    const stationId = parseInt(value);
    setSelectedStationId(stationId);
    sessionStorage.setItem('selectedStationId', value);
  };

  const { data: statistics, isLoading, error } = useQuery<ShiftStatistics[]>({
    queryKey: ["/api/statistics/shifts", periodType, selectedYear, selectedMonth, selectedQuarter, effectiveStationId],
    queryFn: async () => {
      let params = new URLSearchParams({
        type: periodType,
        year: selectedYear.toString(),
      });

      if (periodType === "month") {
        params.append("month", selectedMonth.toString());
      } else if (periodType === "quarter") {
        params.append("quarter", selectedQuarter.toString());
      }

      // Voeg stationId toe voor supervisors EN multi-station admins
      if (showStationSelector && effectiveStationId) {
        params.append("stationId", effectiveStationId.toString());
      }

      const res = await fetch(`/api/statistics/shifts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch statistics");
      return res.json();
    },
    enabled: !!effectiveStationId,
  });

  const getPeriodLabel = () => {
    switch (periodType) {
      case "month":
        return `${MONTHS.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
      case "quarter":
        return `${QUARTERS.find(q => q.value === selectedQuarter)?.label} ${selectedYear}`;
      case "year":
        return `${selectedYear}`;
      default:
        return "";
    }
  };

  const getTotalStats = () => {
    if (!statistics || statistics.length === 0) return null;

    return statistics.reduce((acc, user) => ({
      dayShiftWeekHours: acc.dayShiftWeekHours + user.dayShiftWeekHours,
      nightShiftWeekHours: acc.nightShiftWeekHours + user.nightShiftWeekHours,
      dayShiftWeekendHours: acc.dayShiftWeekendHours + user.dayShiftWeekendHours,
      nightShiftWeekendHours: acc.nightShiftWeekendHours + user.nightShiftWeekendHours,
      totalPreferenceHours: acc.totalPreferenceHours + user.totalPreferenceHours,
      actualDayShiftWeekHours: acc.actualDayShiftWeekHours + user.actualDayShiftWeekHours,
      actualNightShiftWeekHours: acc.actualNightShiftWeekHours + user.actualNightShiftWeekHours,
      actualDayShiftWeekendHours: acc.actualDayShiftWeekendHours + user.actualDayShiftWeekendHours,
      actualNightShiftWeekendHours: acc.actualNightShiftWeekendHours + user.actualNightShiftWeekendHours,
      totalActualHours: acc.totalActualHours + user.totalActualHours,
    }), {
      dayShiftWeekHours: 0,
      nightShiftWeekHours: 0,
      dayShiftWeekendHours: 0,
      nightShiftWeekendHours: 0,
      totalPreferenceHours: 0,
      actualDayShiftWeekHours: 0,
      actualNightShiftWeekHours: 0,
      actualDayShiftWeekendHours: 0,
      actualNightShiftWeekendHours: 0,
      totalActualHours: 0,
    });
  };

  // Handle column sort
  const handleSort = (column: keyof ShiftStatistics | "name" | "percentage") => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Render sort indicator
  const renderSortIcon = (column: keyof ShiftStatistics | "name" | "percentage") => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="inline h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="inline h-3 w-3 ml-1" />
    );
  };

  // Filter and sort statistics
  const filteredAndSortedStatistics = useMemo(() => {
    if (!statistics) return [];
    
    // Filter based on search term
    let filtered = statistics.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const username = user.username.toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return fullName.includes(search) || username.includes(search);
    });
    
    // Sort based on selected column and direction
    return filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      if (sortColumn === "name") {
        // Sort by full name
        aValue = `${a.lastName} ${a.firstName}`.toLowerCase();
        bValue = `${b.lastName} ${b.firstName}`.toLowerCase();
      } else if (sortColumn === "percentage") {
        // Sort by calculated percentage
        aValue = a.maxHours > 0 ? (a.totalPreferenceHours / a.maxHours) * 100 : 0;
        bValue = b.maxHours > 0 ? (b.totalPreferenceHours / b.maxHours) * 100 : 0;
      } else {
        // Sort by numeric column
        aValue = a[sortColumn] as number;
        bValue = b[sortColumn] as number;
      }
      
      // Compare values
      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = (aValue as number) - (bValue as number);
      }
      
      // Apply direction
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [statistics, searchTerm, sortColumn, sortDirection]);

  // Get current station name
  const getCurrentStationName = () => {
    if (!stations || !effectiveStationId) return "Onbekend station";
    const station = stations.find(s => s.id === effectiveStationId);
    return station?.displayName || "Onbekend station";
  };

  // Excel export function
  const exportToExcel = async () => {
    if (!filteredAndSortedStatistics || filteredAndSortedStatistics.length === 0) {
      toast({
        title: "Geen data",
        description: "Er zijn geen statistieken om te exporteren.",
        variant: "destructive",
      });
      return;
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Prepare data with headers - station and period info first
    const stationName = getCurrentStationName();
    const periodLabel = getPeriodLabel();
    
    // Header rows
    const headerData = [
      ["Station:", stationName],
      ["Periode:", periodLabel],
      ["Geëxporteerd op:", new Date().toLocaleString("nl-NL")],
      [], // Empty row
      // Column headers matching table order
      [
        "Voornaam",
        "Achternaam",
        "Dag Week (u)",
        "Nacht Week (u)",
        "Dag Weekend (u)",
        "Nacht Weekend (u)",
        "Totaal Voorkeur (u)",
        "Max Uren",
        "Percentage",
        "Werkelijk Dag Week (u)",
        "Werkelijk Nacht Week (u)",
        "Werkelijk Dag Weekend (u)",
        "Werkelijk Nacht Weekend (u)"
      ]
    ];

    // Add data rows in same order as table
    const dataRows = filteredAndSortedStatistics.map(user => {
      const percentage = user.maxHours > 0 
        ? Math.round((user.totalPreferenceHours / user.maxHours) * 100)
        : 0;
      
      return [
        user.firstName,
        user.lastName,
        user.dayShiftWeekHours,
        user.nightShiftWeekHours,
        user.dayShiftWeekendHours,
        user.nightShiftWeekendHours,
        user.totalPreferenceHours,
        user.maxHours,
        `${percentage}%`,
        user.actualDayShiftWeekHours,
        user.actualNightShiftWeekHours,
        user.actualDayShiftWeekendHours,
        user.actualNightShiftWeekendHours
      ];
    });

    // Combine headers and data
    const allData = [...headerData, ...dataRows];
    
    // Create worksheet from data
    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Voornaam
      { wch: 15 }, // Achternaam
      { wch: 14 }, // Dag Week
      { wch: 14 }, // Nacht Week
      { wch: 16 }, // Dag Weekend
      { wch: 16 }, // Nacht Weekend
      { wch: 18 }, // Totaal Voorkeur
      { wch: 10 }, // Max Uren
      { wch: 12 }, // Percentage
      { wch: 20 }, // Werkelijk Dag Week
      { wch: 20 }, // Werkelijk Nacht Week
      { wch: 22 }, // Werkelijk Dag Weekend
      { wch: 22 }, // Werkelijk Nacht Weekend
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Shift Statistieken");
    
    // Generate filename with station and period
    const safeStationName = stationName.replace(/[^a-zA-Z0-9]/g, "_");
    const safePeriodLabel = periodLabel.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Shift_Statistieken_${safeStationName}_${safePeriodLabel}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, filename);
    
    // Log the export to activity log
    try {
      await fetch('/api/statistics/log-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: effectiveStationId,
          stationName: stationName,
          period: periodLabel
        })
      });
    } catch (err) {
      console.error('Failed to log statistics export:', err);
    }
    
    toast({
      title: "Export geslaagd",
      description: `Statistieken geëxporteerd naar ${filename}`,
    });
  };

  // Guard voor supervisors/multi-station admins: vereist station selectie
  // Note: Single-station admins slaan dit over (effectiveStationId fallback naar user.stationId)
  if (showStationSelector && !effectiveStationId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline"
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Shift Statistieken
            </h1>
            <p className="text-muted-foreground mt-2">
              Bekijk statistieken voor alle stations
            </p>
            
            <div className="mt-4">
              <Label htmlFor="station-select" className="text-sm font-medium">
                Station
              </Label>
              <Select 
                value={selectedStationId?.toString() || ""} 
                onValueChange={handleStationChange}
              >
                <SelectTrigger className="w-[200px] mt-1" data-testid="select-station">
                  <SelectValue placeholder="Kies station..." />
                </SelectTrigger>
                <SelectContent>
                  {(stations as Station[])
                    ?.filter(station => station.code !== 'supervisor')
                    ?.map((station) => (
                      <SelectItem key={station.id} value={station.id.toString()}>
                        {station.displayName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Kies een station om verder te gaan</h3>
              <p className="text-muted-foreground">
                Selecteer eerst een station om statistieken te bekijken.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const totalStats = getTotalStats();

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="outline"
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Shift Statistieken
          </h1>
          <p className="text-muted-foreground mt-2">
            Overzicht van shift voorkeuren per medewerker
          </p>
          
          {/* Station selector voor supervisors EN multi-station admins */}
          {showStationSelector && (
            <div className="mt-4">
              <Label htmlFor="station-select" className="text-sm font-medium">
                Station
              </Label>
              <Select 
                value={selectedStationId?.toString() || ""} 
                onValueChange={handleStationChange}
              >
                <SelectTrigger className="w-[200px] mt-1" data-testid="select-station">
                  <SelectValue placeholder="Kies station..." />
                </SelectTrigger>
                <SelectContent>
                  {(stations as Station[])
                    ?.filter(station => station.code !== 'supervisor')
                    ?.map((station) => (
                      <SelectItem key={station.id} value={station.id.toString()}>
                        {station.displayName}
                      </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          )}
        </div>
      </div>

      {/* Legenda */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift Categorieën Uitleg
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Dag Week</h4>
              <p className="text-sm text-blue-700">
                Dagshifts op weekdagen (maandag-donderdag, vrijdag dag)
                <br />
                <span className="font-medium">Tijd: 07:00 - 19:00</span>
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">Nacht Week</h4>
              <p className="text-sm text-purple-700">
                Nachtshifts op weekdagen (maandag-donderdag)
                <br />
                <span className="font-medium">Tijd: 19:00 - 07:00</span>
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">Dag Weekend</h4>
              <p className="text-sm text-green-700">
                Dagshifts op za/zo en feestdagen
                <br />
                <span className="font-medium">Tijd: 07:00 - 19:00</span>
              </p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-2">Nacht Weekend</h4>
              <p className="text-sm text-orange-700">
                Nachtshifts op vrijdag, za/zo en feestdagen
                <br />
                <span className="font-medium">Tijd: 19:00 - 07:00</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Periode Selectie
          </CardTitle>
          <CardDescription>
            Kies de periode waarvoor je statistieken wilt zien
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Maand</SelectItem>
                  <SelectItem value="quarter">Kwartaal</SelectItem>
                  <SelectItem value="year">Jaar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jaar</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {periodType === "month" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Maand</label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(month => (
                      <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {periodType === "quarter" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Kwartaal</label>
                <Select value={selectedQuarter.toString()} onValueChange={(value) => setSelectedQuarter(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUARTERS.map(quarter => (
                      <SelectItem key={quarter.value} value={quarter.value.toString()}>{quarter.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>



      {/* Main statistics table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Shift Statistieken - {getPeriodLabel()}
              </CardTitle>
              <CardDescription>
                Overzicht van voorkeuren per medewerker voor de geselecteerde periode
              </CardDescription>
            </div>
            <Button
              onClick={exportToExcel}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!filteredAndSortedStatistics || filteredAndSortedStatistics.length === 0}
            >
              <Download className="h-4 w-4" />
              Excel Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Fout bij het laden van statistieken</p>
            </div>
          ) : !statistics || statistics.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Geen statistieken beschikbaar voor deze periode</p>
            </div>
          ) : (
            <>
              {/* Search bar */}
              <div className="mb-4">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Zoek medewerker..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchTerm && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {filteredAndSortedStatistics.length} van {statistics.length} medewerkers gevonden
                  </p>
                )}
              </div>
              
              {filteredAndSortedStatistics.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Geen medewerkers gevonden voor "{searchTerm}"</p>
                </div>
              ) : (
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    rowSpan={2} 
                    className="align-middle cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("name")}
                  >
                    Medewerker {renderSortIcon("name")}
                  </TableHead>
                  <TableHead colSpan={6} className="text-center">Voorkeuren</TableHead>
                  <TableHead colSpan={4} className="text-center">Werkelijke Shifts</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead 
                    className="text-center text-xs cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("dayShiftWeekHours")}
                  >
                    Dag Week (u) {renderSortIcon("dayShiftWeekHours")}
                  </TableHead>
                  <TableHead 
                    className="text-center text-xs cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("nightShiftWeekHours")}
                  >
                    Nacht Week (u) {renderSortIcon("nightShiftWeekHours")}
                  </TableHead>
                  <TableHead 
                    className="text-center text-xs cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("dayShiftWeekendHours")}
                  >
                    Dag Weekend (u) {renderSortIcon("dayShiftWeekendHours")}
                  </TableHead>
                  <TableHead 
                    className="text-center text-xs cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("nightShiftWeekendHours")}
                  >
                    Nacht Weekend (u) {renderSortIcon("nightShiftWeekendHours")}
                  </TableHead>
                  <TableHead 
                    className="text-center text-xs cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("totalPreferenceHours")}
                  >
                    Totaal (u) {renderSortIcon("totalPreferenceHours")}
                  </TableHead>
                  <TableHead 
                    className="text-center text-xs border-r-2 border-gray-300 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("percentage")}
                  >
                    Percentage {renderSortIcon("percentage")}
                  </TableHead>
                  <TableHead 
                    className="text-center text-xs cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("actualDayShiftWeekHours")}
                  >
                    Dag Week (u) {renderSortIcon("actualDayShiftWeekHours")}
                  </TableHead>
                  <TableHead 
                    className="text-center text-xs cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("actualNightShiftWeekHours")}
                  >
                    Nacht Week (u) {renderSortIcon("actualNightShiftWeekHours")}
                  </TableHead>
                  <TableHead 
                    className="text-center text-xs cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("actualDayShiftWeekendHours")}
                  >
                    Dag Weekend (u) {renderSortIcon("actualDayShiftWeekendHours")}
                  </TableHead>
                  <TableHead 
                    className="text-center text-xs cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("actualNightShiftWeekendHours")}
                  >
                    Nacht Weekend (u) {renderSortIcon("actualNightShiftWeekendHours")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedStatistics.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-sm">{user.firstName}</span>
                          <span className="text-sm text-muted-foreground">{user.lastName}</span>
                        </div>
                      </TableCell>
                      {/* Voorkeuren */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-blue-700 border-blue-300">
                          {user.dayShiftWeekHours}u
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-purple-700 border-purple-300">
                          {user.nightShiftWeekHours}u
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          {user.dayShiftWeekendHours}u
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          {user.nightShiftWeekendHours}u
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-gray-700 border-gray-300 font-semibold">
                          {user.totalPreferenceHours}u
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center border-r-2 border-gray-300">
                        {(() => {
                          const percentage = user.maxHours > 0 
                            ? Math.round((user.totalPreferenceHours / user.maxHours) * 100)
                            : 0;
                          
                          let badgeClass = "";
                          if (percentage >= 200) {
                            badgeClass = "bg-green-100 text-green-800 border-green-300";
                          } else if (percentage >= 100) {
                            badgeClass = "bg-orange-100 text-orange-800 border-orange-300";
                          } else {
                            badgeClass = "bg-red-100 text-red-800 border-red-300";
                          }
                          
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {user.totalPreferenceHours}/{user.maxHours || 0}
                              </span>
                              <Badge variant="outline" className={badgeClass}>
                                {percentage}%
                              </Badge>
                            </div>
                          );
                        })()}
                      </TableCell>
                      {/* Werkelijke shifts */}
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {user.actualDayShiftWeekHours}u
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          {user.actualNightShiftWeekHours}u
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {user.actualDayShiftWeekendHours}u
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {user.actualNightShiftWeekendHours}u
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export default memo(Statistics);
