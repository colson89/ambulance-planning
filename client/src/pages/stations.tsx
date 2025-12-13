import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Station {
  id: number;
  name: string;
  code: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export default function Stations() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showStationDialog, setShowStationDialog] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationForm, setStationForm] = useState({ name: '', code: '', displayName: '' });
  const [deleteStation, setDeleteStation] = useState<Station | null>(null);
  const [stationDependencies, setStationDependencies] = useState<any>(null);

  const { data: allStations = [], isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
    enabled: user?.role === 'supervisor'
  });

  const createStationMutation = useMutation({
    mutationFn: async (data: { name: string; code: string; displayName: string }) => {
      const res = await apiRequest('POST', '/api/stations', data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      setShowStationDialog(false);
      setStationForm({ name: '', code: '', displayName: '' });
      toast({ title: "Succes", description: "Station aangemaakt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  });

  const updateStationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Station> }) => {
      const res = await apiRequest('PUT', `/api/stations/${id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      setShowStationDialog(false);
      setEditingStation(null);
      setStationForm({ name: '', code: '', displayName: '' });
      toast({ title: "Succes", description: "Station bijgewerkt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  });

  const deleteStationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/stations/${id}?force=true`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      setDeleteStation(null);
      setStationDependencies(null);
      toast({ title: "Succes", description: "Station verwijderd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  });

  const handleOpenStationDialog = (station?: Station) => {
    if (station) {
      setEditingStation(station);
      setStationForm({ name: station.name, code: station.code, displayName: station.displayName });
    } else {
      setEditingStation(null);
      setStationForm({ name: '', code: '', displayName: '' });
    }
    setShowStationDialog(true);
  };

  const handleSaveStation = () => {
    if (editingStation) {
      updateStationMutation.mutate({ id: editingStation.id, data: stationForm });
    } else {
      createStationMutation.mutate(stationForm);
    }
  };

  const handleDeleteStation = async (station: Station) => {
    try {
      const res = await apiRequest('GET', `/api/stations/${station.id}/dependencies`);
      const deps = await res.json();
      setStationDependencies(deps);
      setDeleteStation(station);
    } catch {
      setDeleteStation(station);
    }
  };

  if (user?.role !== 'supervisor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Toegang Geweigerd</CardTitle>
            <CardDescription>
              Alleen supervisors kunnen stations beheren.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/integrations")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar Integraties
          </Button>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-cyan-100 rounded-full">
                <Building2 className="h-12 w-12 text-cyan-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Stationbeheer</h1>
            <p className="text-lg text-gray-600">
              Beheer alle stations in het systeem
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Stations</CardTitle>
              <CardDescription>
                {stationsLoading ? 'Laden...' : `${allStations.length} station${allStations.length !== 1 ? 's' : ''} gevonden`}
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenStationDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nieuw Station
            </Button>
          </CardHeader>
          <CardContent>
            {stationsLoading ? (
              <p className="text-gray-500 text-center py-4">Stations laden...</p>
            ) : allStations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Geen stations gevonden. Maak een nieuw station aan.</p>
            ) : (
              <div className="divide-y">
                {allStations.map((station) => (
                  <div key={station.id} className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium text-lg">{station.displayName}</p>
                      <p className="text-sm text-gray-500">
                        Code: <span className="font-mono bg-gray-100 px-1 rounded">{station.code}</span> | 
                        Intern: <span className="font-mono bg-gray-100 px-1 rounded">{station.name}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenStationDialog(station)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Bewerken
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => handleDeleteStation(station)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Verwijderen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Over Stations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-blue-800">
            <p>
              Stations zijn de verschillende locaties waar ambulanciers werken. Elk station heeft:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Weergavenaam</strong> - De naam zoals gebruikers die zien (bijv. "ZW Westerlo")</li>
              <li><strong>Code</strong> - Een korte code voor weergave in de planning (bijv. "WL")</li>
              <li><strong>Interne naam</strong> - Een technische identifier zonder spaties (bijv. "westerlo")</li>
            </ul>
            <p className="text-sm mt-4">
              <strong>Let op:</strong> Bij het verwijderen van een station worden ook alle gekoppelde gebruikers, 
              shifts en voorkeuren verwijderd. Zorg dat je dit zeker weet voordat je een station verwijdert.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showStationDialog} onOpenChange={setShowStationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStation ? 'Station Bewerken' : 'Nieuw Station'}</DialogTitle>
            <DialogDescription>
              {editingStation ? 'Pas de gegevens van het station aan.' : 'Voeg een nieuw station toe aan het systeem.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Weergavenaam</Label>
              <Input
                id="displayName"
                placeholder="bijv. ZW Westerlo"
                value={stationForm.displayName}
                onChange={(e) => setStationForm({...stationForm, displayName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="bijv. WL"
                value={stationForm.code}
                onChange={(e) => setStationForm({...stationForm, code: e.target.value})}
              />
              <p className="text-xs text-gray-500">Korte code voor weergave (wordt automatisch hoofdletters)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Interne naam</Label>
              <Input
                id="name"
                placeholder="bijv. westerlo"
                value={stationForm.name}
                onChange={(e) => setStationForm({...stationForm, name: e.target.value})}
              />
              <p className="text-xs text-gray-500">Technische identifier (kleine letters, geen spaties)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStationDialog(false)}>Annuleren</Button>
            <Button onClick={handleSaveStation} disabled={createStationMutation.isPending || updateStationMutation.isPending}>
              {editingStation ? 'Opslaan' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteStation} onOpenChange={(open) => !open && setDeleteStation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Station Verwijderen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{deleteStation?.displayName}" wilt verwijderen?
              {stationDependencies && !stationDependencies.canDelete && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg text-red-800">
                  <p className="font-medium">Let op: Dit station heeft gekoppelde data:</p>
                  <ul className="text-sm mt-1 list-disc list-inside">
                    {stationDependencies.dependencies?.users > 0 && <li>{stationDependencies.dependencies.users} gebruikers</li>}
                    {stationDependencies.dependencies?.shifts > 0 && <li>{stationDependencies.dependencies.shifts} shifts</li>}
                    {stationDependencies.dependencies?.preferences > 0 && <li>{stationDependencies.dependencies.preferences} voorkeuren</li>}
                  </ul>
                  <p className="text-sm mt-2 font-medium">Alle gekoppelde data wordt verwijderd!</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteStation && deleteStationMutation.mutate(deleteStation.id)}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
