import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, BarChart3, ArrowLeft, Calendar, Users, Clock, TrendingUp } from "lucide-react";
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

type ShiftStatistics = {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  // Preferences
  dayShiftWeek: number;
  nightShiftWeek: number;
  dayShiftWeekend: number;
  nightShiftWeekend: number;
  totalPreferences: number;
  // Actual shifts
  actualDayShiftWeek: number;
  actualNightShiftWeek: number;
  actualDayShiftWeekend: number;
  actualNightShiftWeekend: number;
  totalActualShifts: number;
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

export default function Statistics() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil(CURRENT_MONTH / 3));

  const { data: statistics, isLoading, error } = useQuery<ShiftStatistics[]>({
    queryKey: ["/api/statistics/shifts", periodType, selectedYear, selectedMonth, selectedQuarter],
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

      const res = await fetch(`/api/statistics/shifts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch statistics");
      return res.json();
    },
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
      dayShiftWeek: acc.dayShiftWeek + user.dayShiftWeek,
      nightShiftWeek: acc.nightShiftWeek + user.nightShiftWeek,
      dayShiftWeekend: acc.dayShiftWeekend + user.dayShiftWeekend,
      nightShiftWeekend: acc.nightShiftWeekend + user.nightShiftWeekend,
      totalPreferences: acc.totalPreferences + user.totalPreferences,
      actualDayShiftWeek: acc.actualDayShiftWeek + user.actualDayShiftWeek,
      actualNightShiftWeek: acc.actualNightShiftWeek + user.actualNightShiftWeek,
      actualDayShiftWeekend: acc.actualDayShiftWeekend + user.actualDayShiftWeekend,
      actualNightShiftWeekend: acc.actualNightShiftWeekend + user.actualNightShiftWeekend,
      totalActualShifts: acc.totalActualShifts + user.totalActualShifts,
    }), {
      dayShiftWeek: 0,
      nightShiftWeek: 0,
      dayShiftWeekend: 0,
      nightShiftWeekend: 0,
      totalPreferences: 0,
      actualDayShiftWeek: 0,
      actualNightShiftWeek: 0,
      actualDayShiftWeekend: 0,
      actualNightShiftWeekend: 0,
      totalActualShifts: 0,
    });
  };

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
                Dagshifts op weekdagen (maandag-vrijdag)
                <br />
                <span className="font-medium">Tijd: 07:00 - 19:00</span>
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">Nacht Week</h4>
              <p className="text-sm text-purple-700">
                Nachtshifts op weekdagen (maandag-vrijdag)
                <br />
                <span className="font-medium">Tijd: 19:00 - 07:00</span>
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">Dag Weekend</h4>
              <p className="text-sm text-green-700">
                Dagshifts in het weekend (zaterdag-zondag)
                <br />
                <span className="font-medium">Tijd: 07:00 - 19:00</span>
              </p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-2">Nacht Weekend</h4>
              <p className="text-sm text-orange-700">
                Nachtshifts in het weekend (zaterdag-zondag)
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

      {/* Summary cards */}
      {totalStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Voorkeuren Totaal</CardTitle>
                <CardDescription>Aantal ingediende voorkeuren</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Dagshift Week</p>
                    <p className="text-xl font-bold text-blue-600">{totalStats.dayShiftWeek}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Nachtshift Week</p>
                    <p className="text-xl font-bold text-purple-600">{totalStats.nightShiftWeek}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Dagshift Weekend</p>
                    <p className="text-xl font-bold text-green-600">{totalStats.dayShiftWeekend}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Nachtshift Weekend</p>
                    <p className="text-xl font-bold text-orange-600">{totalStats.nightShiftWeekend}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground">Totaal Voorkeuren</p>
                  <p className="text-2xl font-bold">{totalStats.totalPreferences}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Werkelijke Shifts</CardTitle>
                <CardDescription>Aantal daadwerkelijk uitgevoerde shifts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Dagshift Week</p>
                    <p className="text-xl font-bold text-blue-600">{totalStats.actualDayShiftWeek}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Nachtshift Week</p>
                    <p className="text-xl font-bold text-purple-600">{totalStats.actualNightShiftWeek}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Dagshift Weekend</p>
                    <p className="text-xl font-bold text-green-600">{totalStats.actualDayShiftWeekend}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Nachtshift Weekend</p>
                    <p className="text-xl font-bold text-orange-600">{totalStats.actualNightShiftWeekend}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground">Totaal Shifts</p>
                  <p className="text-2xl font-bold">{totalStats.totalActualShifts}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Main statistics table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Shift Statistieken - {getPeriodLabel()}
          </CardTitle>
          <CardDescription>
            Overzicht van voorkeuren per medewerker voor de geselecteerde periode
          </CardDescription>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="align-middle">Medewerker</TableHead>
                  <TableHead colSpan={4} className="text-center">Voorkeuren</TableHead>
                  <TableHead colSpan={4} className="text-center">Werkelijke Shifts</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-center text-xs">Dag Week</TableHead>
                  <TableHead className="text-center text-xs">Nacht Week</TableHead>
                  <TableHead className="text-center text-xs">Dag Weekend</TableHead>
                  <TableHead className="text-center text-xs">Nacht Weekend</TableHead>
                  <TableHead className="text-center text-xs">Dag Week</TableHead>
                  <TableHead className="text-center text-xs">Nacht Week</TableHead>
                  <TableHead className="text-center text-xs">Dag Weekend</TableHead>
                  <TableHead className="text-center text-xs">Nacht Weekend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statistics
                  .sort((a, b) => b.totalActualShifts - a.totalActualShifts)
                  .map((user) => (
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
                          {user.dayShiftWeek}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-purple-700 border-purple-300">
                          {user.nightShiftWeek}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          {user.dayShiftWeekend}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          {user.nightShiftWeekend}
                        </Badge>
                      </TableCell>
                      {/* Werkelijke shifts */}
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {user.actualDayShiftWeek}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          {user.actualNightShiftWeek}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {user.actualDayShiftWeekend}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {user.actualNightShiftWeekend}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}