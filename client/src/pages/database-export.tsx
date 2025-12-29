import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Station } from "@shared/schema";
import { useState } from "react";
import { useLocation } from "wouter";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Home, Download, Database, FileSpreadsheet, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

export default function DatabaseExport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedStationId, setSelectedStationId] = useState<string>("all");
  const [isExportingPreferences, setIsExportingPreferences] = useState(false);
  const [isExportingShifts, setIsExportingShifts] = useState(false);

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stations");
      if (!res.ok) throw new Error("Kon stations niet laden");
      return res.json();
    },
  });

  const monthNames = [
    "Januari", "Februari", "Maart", "April", "Mei", "Juni",
    "Juli", "Augustus", "September", "Oktober", "November", "December"
  ];

  const years = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];

  const handleExportPreferences = async () => {
    setIsExportingPreferences(true);
    try {
      const stationParam = selectedStationId !== "all" ? `&stationId=${selectedStationId}` : "";
      const url = `/api/database-export/preferences?month=${selectedMonth}&year=${selectedYear}${stationParam}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Export mislukt");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `db-preferences-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export geslaagd",
        description: "De voorkeuren zijn geëxporteerd naar Excel.",
      });
    } catch (error: any) {
      toast({
        title: "Export mislukt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExportingPreferences(false);
    }
  };

  const handleExportShifts = async () => {
    setIsExportingShifts(true);
    try {
      const stationParam = selectedStationId !== "all" ? `&stationId=${selectedStationId}` : "";
      const url = `/api/database-export/shifts?month=${selectedMonth}&year=${selectedYear}${stationParam}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Export mislukt");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `db-shifts-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export geslaagd",
        description: "De shifts zijn geëxporteerd naar Excel.",
      });
    } catch (error: any) {
      toast({
        title: "Export mislukt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExportingShifts(false);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'supervisor')) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Je hebt geen toegang tot deze pagina.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Database Export</h1>
            <p className="text-muted-foreground">Exporteer data met volledige timestamps voor vergelijking</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setLocation("/dashboard")}>
          <Home className="h-4 w-4 mr-2" />
          Dashboard
        </Button>
      </div>

      <Alert className="mb-6">
        <Database className="h-4 w-4" />
        <AlertDescription>
          <strong>Doel:</strong> Exporteer database records met alle timestamp-formaten (Raw, ISO, UTC, Brussels) 
          om timezone-problemen tussen verschillende servers te kunnen vergelijken.
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selecteer periode</CardTitle>
          <CardDescription>Kies de maand, jaar en optioneel een station</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Maand</Label>
              <Select 
                value={String(selectedMonth)} 
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Jaar</Label>
              <Select 
                value={String(selectedYear)} 
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Station (optioneel)</Label>
              <Select 
                value={selectedStationId} 
                onValueChange={setSelectedStationId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle stations</SelectItem>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={String(station.id)}>
                      {station.displayName || station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              Voorkeuren Export
            </CardTitle>
            <CardDescription>
              Exporteer shift_preferences tabel met alle timestamp formaten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Bevat kolommen:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>ID, User ID, Naam, Username, Station ID</li>
                  <li>date (DB raw), date (ISO), date (UTC), date (ms), date (Brussels)</li>
                  <li>Type, Status, Month (DB), Year (DB), Can Split, Notes</li>
                </ul>
              </div>
              <Button 
                onClick={handleExportPreferences} 
                disabled={isExportingPreferences}
                className="w-full"
              >
                {isExportingPreferences ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exporteer Voorkeuren
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Shifts Export
            </CardTitle>
            <CardDescription>
              Exporteer shifts tabel met alle timestamp formaten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Bevat kolommen:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>ID, User ID, Naam, Username, Station ID</li>
                  <li>date (DB raw), date (ISO), date (UTC), date (ms), date (Brussels)</li>
                  <li>Type, startTime (ISO), endTime (ISO), Published, Nood Inplanning</li>
                </ul>
              </div>
              <Button 
                onClick={handleExportShifts} 
                disabled={isExportingShifts}
                className="w-full"
                variant="secondary"
              >
                {isExportingShifts ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exporteer Shifts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Hoe te gebruiken</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Selecteer de gewenste maand en jaar</li>
            <li>Exporteer de voorkeuren en/of shifts naar Excel</li>
            <li>Voer dezelfde export uit op de Windows server</li>
            <li>Vergelijk de kolommen tussen beide exports:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li><strong>date (UTC)</strong> - geformatteerd in UTC timezone, gebruik dit voor vergelijking</li>
                <li><strong>date (getTime ms)</strong> - milliseconden sinds 1970, absolute waarde</li>
                <li><strong>date (Brussels local)</strong> - hoe de datum er in België uitziet</li>
              </ul>
            </li>
            <li>Als de UTC of getTime waarden verschillen, is er een probleem met hoe de data wordt opgeslagen</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
