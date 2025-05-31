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
      totalShifts: acc.totalShifts + user.totalShifts,
    }), {
      dayShiftWeek: 0,
      nightShiftWeek: 0,
      dayShiftWeekend: 0,
      nightShiftWeekend: 0,
      totalShifts: 0,
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
          onClick={() => setLocation("/")}
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dagshifts Week</p>
                  <p className="text-2xl font-bold">{totalStats.dayShiftWeek}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nachtshifts Week</p>
                  <p className="text-2xl font-bold">{totalStats.nightShiftWeek}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dagshifts Weekend</p>
                  <p className="text-2xl font-bold">{totalStats.dayShiftWeekend}</p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nachtshifts Weekend</p>
                  <p className="text-2xl font-bold">{totalStats.nightShiftWeekend}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Totaal Shifts</p>
                  <p className="text-2xl font-bold">{totalStats.totalShifts}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>
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
                  <TableHead>Medewerker</TableHead>
                  <TableHead className="text-center">Dagshift Week</TableHead>
                  <TableHead className="text-center">Nachtshift Week</TableHead>
                  <TableHead className="text-center">Dagshift Weekend</TableHead>
                  <TableHead className="text-center">Nachtshift Weekend</TableHead>
                  <TableHead className="text-center">Totaal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statistics
                  .sort((a, b) => b.totalShifts - a.totalShifts)
                  .map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {user.dayShiftWeek}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          {user.nightShiftWeek}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {user.dayShiftWeekend}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          {user.nightShiftWeekend}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default">
                          {user.totalShifts}
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