import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarDays, Star, Plus, Edit, Trash2, ChevronLeft, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface Station {
  id: number;
  name: string;
  code: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

interface Holiday {
  id: number;
  name: string;
  date: string;
  year: number;
  isFixed: boolean;
  stationId?: number;
  isActive: boolean;
  category: "national" | "regional" | "custom";
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function HolidaysManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [isGeneratingBelgian, setIsGeneratingBelgian] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(
    user?.role === 'supervisor' ? null : user?.stationId || null
  );

  // Query voor stations (alleen voor supervisors)
  const { data: stations } = useQuery<Station[]>({
    queryKey: ["/api/user/stations"],
    enabled: user?.role === 'supervisor',
  });

  // Effectieve station ID - voor supervisors is dit de geselecteerde station, anders hun eigen station
  const effectiveStationId = user?.role === 'supervisor' ? selectedStationId : user?.stationId;
  
  // Form state
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    date: new Date().toISOString().split('T')[0], // Vandaag als default
    description: "",
    category: "custom" as "national" | "regional" | "custom",
    isActive: true
  });

  // Query om alle feestdagen op te halen voor het geselecteerde jaar
  const { data: holidays, isLoading, refetch } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays", selectedYear, effectiveStationId],
    queryFn: async () => {
      const params = effectiveStationId && user?.role === 'supervisor' 
        ? `?year=${selectedYear}&stationId=${effectiveStationId}` 
        : `?year=${selectedYear}`;
      const res = await fetch(`/api/holidays${params}`);
      if (!res.ok) throw new Error("Kon feestdagen niet laden");
      return res.json();
    },
    enabled: !!effectiveStationId,
  });

  // Mutation voor het aanmaken van een nieuwe feestdag
  const createHolidayMutation = useMutation({
    mutationFn: async (data: any) => {
      const requestBody = user?.role === 'supervisor' && effectiveStationId 
        ? { ...data, stationId: effectiveStationId }
        : data;
      const res = await apiRequest("POST", "/api/holidays", requestBody);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays", selectedYear, effectiveStationId] });
      toast({
        title: "Feestdag aangemaakt",
        description: "De feestdag is succesvol toegevoegd",
      });
      resetForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij aanmaken feestdag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation voor het bijwerken van een feestdag
  const updateHolidayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/holidays/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays", selectedYear, effectiveStationId] });
      toast({
        title: "Feestdag bijgewerkt",
        description: "De feestdag is succesvol gewijzigd",
      });
      setEditingHoliday(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij bijwerken feestdag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation voor het verwijderen van een feestdag
  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/holidays/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays", selectedYear, effectiveStationId] });
      toast({
        title: "Feestdag verwijderd",
        description: "De feestdag is succesvol verwijderd",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij verwijderen feestdag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation voor het genereren van Belgische feestdagen
  const generateBelgianHolidaysMutation = useMutation({
    mutationFn: async (year: number) => {
      const baseUrl = `/api/holidays/generate-belgian/${year}`;
      const params = user?.role === 'supervisor' && effectiveStationId 
        ? `?stationId=${effectiveStationId}` 
        : '';
      const res = await apiRequest("POST", `${baseUrl}${params}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays", selectedYear, effectiveStationId] });
      toast({
        title: "Belgische feestdagen gegenereerd",
        description: `${data.holidays?.length || 0} feestdagen toegevoegd voor ${selectedYear}`,
      });
      setIsGeneratingBelgian(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij genereren feestdagen",
        description: error.message,
        variant: "destructive",
      });
      setIsGeneratingBelgian(false);
    },
  });

  const resetForm = () => {
    setHolidayForm({
      name: "",
      date: "",
      description: "",
      category: "custom",
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!holidayForm.name || !holidayForm.date) {
      toast({
        title: "Velden niet ingevuld",
        description: "Naam en datum zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    // Valideer dat de datum geldig is
    const dateValue = new Date(holidayForm.date);
    if (isNaN(dateValue.getTime())) {
      toast({
        title: "Ongeldige datum",
        description: "Voer een geldige datum in",
        variant: "destructive",
      });
      return;
    }

    const data = {
      ...holidayForm,
      date: dateValue.toISOString(),
    };

    if (editingHoliday) {
      updateHolidayMutation.mutate({ id: editingHoliday.id, data });
    } else {
      createHolidayMutation.mutate(data);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      name: holiday.name,
      date: new Date(holiday.date).toISOString().split('T')[0],
      description: holiday.description || "",
      category: holiday.category,
      isActive: holiday.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleGenerateBelgianHolidays = () => {
    setIsGeneratingBelgian(true);
    generateBelgianHolidaysMutation.mutate(selectedYear);
  };

  const getCategoryBadge = (category: string) => {
    const variants = {
      national: "default",
      regional: "secondary", 
      custom: "outline"
    } as const;
    
    const labels = {
      national: "Nationaal",
      regional: "Regionaal",
      custom: "Aangepast"
    };
    
    return (
      <Badge variant={variants[category as keyof typeof variants]}>
        {labels[category as keyof typeof labels]}
      </Badge>
    );
  };

  if (user?.role !== 'admin' && user?.role !== 'supervisor') {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Je hebt geen toegang tot deze pagina. Alleen admins en supervisors kunnen feestdagen beheren.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Guard voor supervisors: vereist station selectie
  if (user.role === 'supervisor' && !selectedStationId) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Terug naar Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Feestdagen Beheer</h1>
              <p className="text-muted-foreground">
                Beheer feestdagen voor alle stations
              </p>
              
              <div className="mt-4">
                <Label htmlFor="station-select" className="text-sm font-medium">
                  Station
                </Label>
                <Select 
                  value={selectedStationId?.toString() || ""} 
                  onValueChange={(value) => setSelectedStationId(parseInt(value))}
                >
                  <SelectTrigger className="w-[200px] mt-1" data-testid="select-station">
                    <SelectValue placeholder="Kies station..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(stations as Station[])
                      ?.filter(station => station.code !== 'supervisor') // Filter supervisor station
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
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Kies een station om verder te gaan</h3>
              <p className="text-muted-foreground">
                Selecteer eerst een station om feestdagen te beheren.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => setLocation("/dashboard")}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Terug naar Dashboard
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Feestdagen Beheer</h1>
            <p className="text-muted-foreground">
              Beheer feestdagen voor {user.stationId ? 'je station' : 'alle stations'}
            </p>
            
            {/* Station selector voor supervisors */}
            {user?.role === 'supervisor' && (
              <div className="mt-4">
                <Label htmlFor="station-select" className="text-sm font-medium">
                  Station
                </Label>
                <Select 
                  value={selectedStationId?.toString() || ""} 
                  onValueChange={(value) => setSelectedStationId(parseInt(value))}
                >
                  <SelectTrigger className="w-[200px] mt-1" data-testid="select-station">
                    <SelectValue placeholder="Kies station..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(stations as Station[])
                      ?.filter(station => station.code !== 'supervisor') // Filter supervisor station
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
          
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    resetForm();
                    setEditingHoliday(null);
                  }}
                  disabled={user?.role === 'supervisor' && !selectedStationId}
                  data-testid="button-create-holiday"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe Feestdag
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingHoliday ? 'Feestdag Bewerken' : 'Nieuwe Feestdag'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingHoliday ? 'Wijzig de details van de feestdag' : 'Voeg een nieuwe feestdag toe'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Naam</Label>
                    <Input
                      id="name"
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="bijv. Kerstmis"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="date">Datum</Label>
                    <Input
                      id="date"
                      type="date"
                      value={holidayForm.date}
                      onChange={(e) => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Categorie</Label>
                    <Select 
                      value={holidayForm.category} 
                      onValueChange={(value: "national" | "regional" | "custom") => 
                        setHolidayForm(prev => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national">Nationaal</SelectItem>
                        <SelectItem value="regional">Regionaal</SelectItem>
                        <SelectItem value="custom">Aangepast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Beschrijving (optioneel)</Label>
                    <Textarea
                      id="description"
                      value={holidayForm.description}
                      onChange={(e) => setHolidayForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optionele beschrijving van de feestdag"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        resetForm();
                        setEditingHoliday(null);
                      }}
                    >
                      Annuleren
                    </Button>
                    <Button
                      type="submit"
                      disabled={createHolidayMutation.isPending || updateHolidayMutation.isPending}
                    >
                      {editingHoliday ? 'Bijwerken' : 'Aanmaken'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              onClick={handleGenerateBelgianHolidays}
              disabled={isGeneratingBelgian || (user?.role === 'supervisor' && !selectedStationId)}
              data-testid="button-generate-belgian"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGeneratingBelgian ? 'Genereren...' : 'Belgische Feestdagen'}
            </Button>
          </div>
        </div>
      </div>

      {/* Year selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Jaar Selectie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label>Jaar:</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {holidays?.length || 0} feestdagen voor {selectedYear}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Holidays list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Feestdagen {selectedYear}
          </CardTitle>
          <CardDescription>
            Beheer alle feestdagen voor het geselecteerde jaar. Feestdagen op weekdagen worden automatisch behandeld als weekends in de shift planning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2">Feestdagen laden...</p>
            </div>
          ) : holidays && holidays.length > 0 ? (
            <div className="space-y-4">
              {holidays
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{holiday.name}</h3>
                        {getCategoryBadge(holiday.category)}
                        {!holiday.isActive && (
                          <Badge variant="destructive">Inactief</Badge>
                        )}
                        {holiday.isFixed && (
                          <Badge variant="secondary">Vast</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(holiday.date).toLocaleDateString('nl-NL', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      {holiday.description && (
                        <p className="text-sm mt-1">{holiday.description}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(holiday)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Weet je zeker dat je "${holiday.name}" wilt verwijderen?`)) {
                            deleteHolidayMutation.mutate(holiday.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Geen feestdagen</h3>
              <p className="text-muted-foreground mb-4">
                Er zijn nog geen feestdagen gedefinieerd voor {selectedYear}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Eerste Feestdag Toevoegen
                </Button>
                <Button variant="outline" onClick={handleGenerateBelgianHolidays}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Belgische Feestdagen Genereren
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info alert */}
      <Alert className="mt-6">
        <Star className="h-4 w-4" />
        <AlertDescription>
          <strong>Belangrijk:</strong> Feestdagen die op weekdagen vallen worden automatisch behandeld als weekends in de shift planning. 
          Dit betekent dat er geen beroepspersoneel beschikbaar is en alleen vrijwilligers ingepland worden.
        </AlertDescription>
      </Alert>
    </div>
  );
}