import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertUserSchema, type User, type ShiftPreference, type Station } from "@shared/schema";
import { z } from "zod";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, UserPlus, KeyRound, Home, Users, Settings, Plus, Minus, X, Upload, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Calendar } from "@/components/ui/calendar";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { UserUndoHistoryPanel } from "@/components/user-undo-history-panel";

const updateUserSchema = z.object({
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  email: z.string().email("Ongeldig email adres").optional().or(z.literal("")),
  role: z.enum(["admin", "ambulancier", "supervisor"]),
  hours: z.number().min(0).max(168),
  isProfessional: z.boolean().optional(),
  hasDrivingLicenseC: z.boolean().optional(),
  phoneNumber: z.string().max(20, "Telefoonnummer mag maximaal 20 karakters bevatten").regex(/^[+\d\s()-]*$/, "Telefoonnummer mag alleen cijfers, spaties en +()- bevatten").optional().or(z.literal("")),
});

type UpdateUserData = z.infer<typeof updateUserSchema>;

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [viewPreferencesForUserId, setViewPreferencesForUserId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  
  // Cross-team management state
  const [crossTeamSearchTerm, setCrossTeamSearchTerm] = useState("");
  const [selectedUserForCrossTeam, setSelectedUserForCrossTeam] = useState<User | null>(null);
  const [selectedCrossTeamStation, setSelectedCrossTeamStation] = useState<number | null>(null);
  const [crossTeamHourLimit, setCrossTeamHourLimit] = useState<number>(24);
  const [changePrimaryStationDialogOpen, setChangePrimaryStationDialogOpen] = useState(false);
  const [newPrimaryStationId, setNewPrimaryStationId] = useState<number | null>(null);
  const [maxHoursForOldStation, setMaxHoursForOldStation] = useState<number>(24);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  
  // State for create user photo
  const [createUserPhotoFile, setCreateUserPhotoFile] = useState<File | null>(null);
  
  // Query om stations op te halen (voor supervisors)
  const { data: stations = [] } = useQuery({
    queryKey: ["/api/user/stations", "includeSupervisor"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/stations?includeSupervisor=true");
      if (!res.ok) throw new Error("Kon stations niet laden");
      return res.json();
    },
    enabled: user?.role === 'supervisor'
  });
  
  // Cross-team queries
  const { data: allUsersForCrossTeam = [], isLoading: isLoadingCrossTeamUsers } = useQuery<User[]>({
    queryKey: ["/api/users/all"],
    queryFn: async () => {
      const res = await fetch("/api/users/all");
      if (!res.ok) throw new Error("Kon alle gebruikers niet laden");
      return res.json();
    },
    enabled: user?.role === 'supervisor'
  });

  const { data: userStationAssignments, isLoading: isLoadingAssignments, refetch: refetchAssignments } = useQuery({
    queryKey: ["/api/users", selectedUserForCrossTeam?.id, "station-assignments"],
    queryFn: async () => {
      if (!selectedUserForCrossTeam?.id) return [];
      const res = await fetch(`/api/users/${selectedUserForCrossTeam.id}/station-assignments`);
      if (!res.ok) throw new Error("Kon station toewijzingen niet laden");
      return res.json();
    },
    enabled: !!selectedUserForCrossTeam?.id && user?.role === 'supervisor'
  });

  // Query om alle beschikbaarheden te krijgen voor een bepaalde gebruiker
  const { data: userPreferences, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ["/api/preferences", viewPreferencesForUserId, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!viewPreferencesForUserId) return null;
      const res = await fetch(`/api/preferences/${viewPreferencesForUserId}/${selectedMonth}/${selectedYear}`);
      if (!res.ok) throw new Error("Kon voorkeuren niet laden");
      return res.json();
    },
    enabled: viewPreferencesForUserId !== null,
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: user?.role === 'supervisor' 
      ? ["/api/users", selectedStationId] 
      : ["/api/users", user?.stationId],
    queryFn: async () => {
      const url = user?.role === 'supervisor' && selectedStationId 
        ? `/api/users?stationId=${selectedStationId}`
        : '/api/users';
      const res = await fetch(url);
      if (!res.ok) throw new Error("Kon gebruikers niet laden");
      return res.json();
    },
    enabled: user?.role === 'supervisor' ? selectedStationId !== null : !!user?.stationId,
  });

  // Cross-team mutations
  const addUserToStationMutation = useMutation({
    mutationFn: async (data: { userId: number; stationId: number; maxHours: number }) => {
      const res = await apiRequest("POST", `/api/users/${data.userId}/station-assignments`, {
        stationId: data.stationId,
        maxHours: data.maxHours
      });
      if (!res.ok) throw new Error("Kon gebruiker niet aan station koppelen");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/all'] });
      refetchAssignments();
      toast({
        title: "Succes",
        description: "Gebruiker succesvol gekoppeld aan station",
      });
      setSelectedCrossTeamStation(null);
      setCrossTeamHourLimit(24);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserStationHoursMutation = useMutation({
    mutationFn: async (data: { userId: number; stationId: number; maxHours: number }) => {
      const res = await apiRequest("PUT", `/api/users/${data.userId}/stations/${data.stationId}/hours`, {
        maxHours: data.maxHours
      });
      if (!res.ok) throw new Error("Kon uur limiet niet bijwerken");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/all'] });
      refetchAssignments();
      toast({
        title: "Succes",
        description: "Uur limiet bijgewerkt",
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

  const deleteUserStationAssignmentMutation = useMutation({
    mutationFn: async (data: { userId: number; stationId: number }) => {
      const res = await apiRequest("DELETE", `/api/users/${data.userId}/station-assignments/${data.stationId}`);
      if (!res.ok) throw new Error("Kon cross-team toewijzing niet verwijderen");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/all'] });
      refetchAssignments();
      toast({
        title: "Succes",
        description: "Cross-team toewijzing verwijderd",
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

  const updatePrimaryStationHoursMutation = useMutation({
    mutationFn: async (data: { userId: number; maxHours: number }) => {
      const res = await apiRequest("PATCH", `/api/users/${data.userId}`, {
        hours: data.maxHours
      });
      if (!res.ok) throw new Error("Kon primaire station uren niet bijwerken");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/all'] });
      toast({
        title: "Succes",
        description: "Primaire station uren bijgewerkt",
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

  const changePrimaryStationMutation = useMutation({
    mutationFn: async (data: { userId: number; newPrimaryStationId: number; maxHoursForOldStation: number }) => {
      const res = await apiRequest("PUT", `/api/users/${data.userId}/primary-station`, {
        newPrimaryStationId: data.newPrimaryStationId,
        maxHoursForOldStation: data.maxHoursForOldStation
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Kon primair station niet wijzigen");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/all'] });
      refetchAssignments();
      setChangePrimaryStationDialogOpen(false);
      toast({
        title: "Succes",
        description: data.message || "Primair station gewijzigd",
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

  const createUserForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      role: "ambulancier" as "admin" | "ambulancier" | "supervisor",
      isAdmin: false,
      isProfessional: false,
      hasDrivingLicenseC: true,
      hours: 24,
      stationId: 8  // Supervisors always use station 8, backend will handle this
    }
  });

  const updateUserForm = useForm<UpdateUserData>({
    resolver: zodResolver(updateUserSchema)
  });

  const changePasswordForm = useForm({
    resolver: zodResolver(z.object({
      password: z.string().min(6, "Wachtwoord moet minimaal 6 karakters bevatten")
    })),
    defaultValues: {
      password: ""
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertUserSchema>) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: async (newUser) => {
      if (user?.role === 'supervisor') {
        queryClient.invalidateQueries({ queryKey: ["/api/users", selectedStationId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.stationId] });
      }
      
      // Upload profile photo if selected
      if (createUserPhotoFile && newUser?.id) {
        try {
          const formData = new FormData();
          formData.append('photo', createUserPhotoFile);
          
          const res = await fetch(`/api/users/${newUser.id}/profile-photo`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            toast({
              title: "Let op",
              description: "Gebruiker aangemaakt, maar foto uploaden mislukt: " + (errorData.message || "Onbekende fout"),
              variant: "destructive"
            });
          } else {
            // Refresh user list to show new photo
            if (user?.role === 'supervisor') {
              queryClient.invalidateQueries({ queryKey: ["/api/users", selectedStationId] });
            } else {
              queryClient.invalidateQueries({ queryKey: ["/api/users", user?.stationId] });
            }
          }
        } catch (error) {
          toast({
            title: "Let op",
            description: "Gebruiker aangemaakt, maar foto uploaden mislukt",
            variant: "destructive"
          });
        }
      }
      
      toast({
        title: "Succes",
        description: "Gebruiker aangemaakt",
      });
      createUserForm.reset();
      setCreateUserPhotoFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number, data: UpdateUserData }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, data);
      return res.json();
    },
    onSuccess: () => {
      if (user?.role === 'supervisor') {
        queryClient.invalidateQueries({ queryKey: ["/api/users", selectedStationId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.stationId] });
      }
      // Don't show toast or close dialog here - handled in form submit
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/password`, { 
        password 
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Wachtwoord gewijzigd",
        description: "Het wachtwoord is succesvol bijgewerkt",
      });
      changePasswordForm.reset();
      setChangePasswordDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePhoneNumberMutation = useMutation({
    mutationFn: async ({ userId, phoneNumber }: { userId: number; phoneNumber: string | null }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/phone`, { phoneNumber });
      return res.json();
    },
    onSuccess: () => {
      if (user?.role === 'supervisor') {
        queryClient.invalidateQueries({ queryKey: ["/api/users", selectedStationId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.stationId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users/all"] });
      // Don't show toast here - handled in form submit
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadProfilePhotoMutation = useMutation({
    mutationFn: async ({ userId, file }: { userId: number; file: File }) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      const res = await fetch(`/api/users/${userId}/profile-photo`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Kon foto niet uploaden");
      }
      
      return res.json();
    },
    onSuccess: () => {
      if (user?.role === 'supervisor') {
        queryClient.invalidateQueries({ queryKey: ["/api/users", selectedStationId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.stationId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users/all"] });
      // Don't show toast or reset photo state here - handled in form submit
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      if (user?.role === 'supervisor') {
        queryClient.invalidateQueries({ queryKey: ["/api/users", selectedStationId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.stationId] });
      }
      toast({
        title: "Succes",
        description: "Gebruiker verwijderd",
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

  if (user?.role !== 'admin' && user?.role !== 'supervisor') {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Geen toegang</h1>
        <p>U heeft geen toegang tot deze pagina.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gebruikersbeheer</h1>
        <Button
          variant="outline"
          onClick={() => setLocation("/dashboard")}
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Gebruiker Beheer</TabsTrigger>
          <TabsTrigger value="crossteam" disabled={user?.role !== 'supervisor'}>
            Cross-team Beheer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 flex-1">
              {user?.role === 'supervisor' && (
                <Select 
                  value={selectedStationId?.toString() || ""} 
                  onValueChange={(value) => setSelectedStationId(parseInt(value))}
                >
                  <SelectTrigger className="w-[200px]" data-testid="select-station">
                    <SelectValue placeholder="Kies station..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(stations as Station[])
                      ?.map((station) => (
                        <SelectItem key={station.id} value={station.id.toString()}>
                          {station.displayName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                type="search"
                placeholder="Zoek op naam of gebruikersnaam..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                data-testid="input-search-users"
              />
            </div>
            
            <Dialog>
            <DialogTrigger asChild>
              <Button 
                disabled={user?.role === 'supervisor' && !selectedStationId}
                data-testid="button-new-user"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Nieuwe Gebruiker
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nieuwe Gebruiker Aanmaken</DialogTitle>
              </DialogHeader>
              <Form {...createUserForm}>
                <form onSubmit={createUserForm.handleSubmit((data) => {
                  // For supervisors, set the selected station ID
                  if (user?.role === 'supervisor' && selectedStationId) {
                    data.stationId = selectedStationId;
                  }
                  // Validation: Check if supervisor has selected a station
                  if (user?.role === 'supervisor' && !selectedStationId) {
                    toast({
                      title: "Fout",
                      description: "Selecteer eerst een station",
                      variant: "destructive"
                    });
                    return;
                  }
                  createUserMutation.mutate(data);
                })} className="space-y-4">
                  {/* Profile Photo Section */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Profielfoto (optioneel)</label>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                        {createUserPhotoFile ? (
                          <img 
                            src={URL.createObjectURL(createUserPhotoFile)}
                            alt="Profile preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Camera className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                toast({
                                  title: "Bestand te groot",
                                  description: "De foto mag maximaal 2MB zijn",
                                  variant: "destructive"
                                });
                                return;
                              }
                              setCreateUserPhotoFile(file);
                            }
                          }}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximaal 2MB, JPG, PNG of GIF
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gebruikersnaam</label>
                    <p className="text-sm text-muted-foreground">De unieke login naam voor deze gebruiker</p>
                    <Input
                      placeholder="bijv. jsmith"
                      {...createUserForm.register("username")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Wachtwoord</label>
                    <p className="text-sm text-muted-foreground">Minimaal 6 karakters</p>
                    <Input
                      type="password"
                      placeholder="Wachtwoord"
                      {...createUserForm.register("password")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Voornaam</label>
                      <Input
                        placeholder="Jan"
                        {...createUserForm.register("firstName")}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Achternaam</label>
                      <Input
                        placeholder="Smit"
                        {...createUserForm.register("lastName")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email (optioneel)</label>
                    <p className="text-sm text-muted-foreground">Voor email notificaties</p>
                    <Input
                      type="email"
                      placeholder="jan.smit@voorbeeld.be"
                      data-testid="input-email"
                      {...createUserForm.register("email")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefoonnummer (optioneel)</label>
                    <p className="text-sm text-muted-foreground">Voor contactinformatie</p>
                    <Input
                      type="tel"
                      placeholder="+32 123 45 67 89"
                      {...createUserForm.register("phoneNumber")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rol</label>
                    <p className="text-sm text-muted-foreground">Bepaalt de rechten en toegang van de gebruiker</p>
                    <Select 
                      value={createUserForm.watch("role")}
                      onValueChange={(value) => createUserForm.setValue("role", value as "admin" | "ambulancier" | "supervisor")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ambulancier">Ambulancier</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                        {user?.role === 'supervisor' && (
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Werkuren</label>
                    <p className="text-sm text-muted-foreground">Bepaal het aantal werkuren per maand</p>
                    <Input
                      type="number"
                      placeholder="24"
                      {...createUserForm.register("hours", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isProfessional-create"
                        checked={createUserForm.watch("isProfessional")}
                        onCheckedChange={(checked) => createUserForm.setValue("isProfessional", !!checked)}
                        data-testid="checkbox-professional-create"
                      />
                      <div className="space-y-1">
                        <label htmlFor="isProfessional-create" className="text-sm font-medium cursor-pointer">
                          Beroepspersoneel
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Beroepspersoneel wordt automatisch beperkt tot maximaal 1 shift per week
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasDrivingLicenseC-create"
                        checked={createUserForm.watch("hasDrivingLicenseC")}
                        onCheckedChange={(checked) => createUserForm.setValue("hasDrivingLicenseC", !!checked)}
                        data-testid="checkbox-driving-license-create"
                      />
                      <div className="space-y-1">
                        <label htmlFor="hasDrivingLicenseC-create" className="text-sm font-medium cursor-pointer">
                          Rijbewijs C
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Minimaal 1 ambulancier met rijbewijs C vereist per shift
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full"
                    disabled={createUserMutation.isPending}
                  >
                    Aanmaken
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

      <div className="grid gap-4">
        {users
          ?.filter(u => 
            searchTerm === "" || 
            u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.username.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((u) => (
          <Card key={u.id} className={searchTerm && (
            u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.username.toLowerCase().includes(searchTerm.toLowerCase())
          ) ? "border-2 border-primary" : ""}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">
                    {u.firstName} {u.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {u.username} - {u.role}
                    {u.isProfessional && " • Beroepspersoneel"}
                    {!u.hasDrivingLicenseC && u.hasDrivingLicenseC !== undefined && " • Geen Rijbewijs C"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Uren: {u.hours}
                  </p>
                </div>

                <div className="flex gap-2">
                  {/* Knop voor beschikbaarheden bekijken */}
                  <Dialog onOpenChange={(open) => {
                    if (open) {
                      setViewPreferencesForUserId(u.id);
                    } else {
                      setViewPreferencesForUserId(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" title="Beschikbaarheden bekijken">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Beschikbaarheden van {u.firstName} {u.lastName}</DialogTitle>
                      </DialogHeader>
                      
                      <div className="my-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium">Maand/Jaar selecteren</h3>
                          <div className="flex gap-2">
                            <Select 
                              value={selectedMonth.toString()} 
                              onValueChange={(value) => setSelectedMonth(parseInt(value))}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Maand" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Januari</SelectItem>
                                <SelectItem value="2">Februari</SelectItem>
                                <SelectItem value="3">Maart</SelectItem>
                                <SelectItem value="4">April</SelectItem>
                                <SelectItem value="5">Mei</SelectItem>
                                <SelectItem value="6">Juni</SelectItem>
                                <SelectItem value="7">Juli</SelectItem>
                                <SelectItem value="8">Augustus</SelectItem>
                                <SelectItem value="9">September</SelectItem>
                                <SelectItem value="10">Oktober</SelectItem>
                                <SelectItem value="11">November</SelectItem>
                                <SelectItem value="12">December</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Select 
                              value={selectedYear.toString()} 
                              onValueChange={(value) => setSelectedYear(parseInt(value))}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder="Jaar" />
                              </SelectTrigger>
                              <SelectContent>
                                {[2024, 2025, 2026].map((year) => (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {isLoadingPreferences ? (
                          <div className="p-8 text-center">
                            <p>Beschikbaarheden laden...</p>
                          </div>
                        ) : userPreferences?.length === 0 ? (
                          <div className="p-8 text-center">
                            <p>Geen beschikbaarheden gevonden voor deze maand.</p>
                          </div>
                        ) : (
                          <div className="border rounded-md p-6">
                            <div className="space-y-4">
                              <div className="grid grid-cols-7 gap-2">
                                {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }).map((_, day) => {
                                  const date = new Date(selectedYear, selectedMonth - 1, day + 1);
                                  const datePrefs = userPreferences?.filter((p: ShiftPreference) => 
                                    new Date(p.date).getDate() === day + 1
                                  );
                                  
                                  // Bepaal of het een weekenddag is
                                  const dayOfWeek = date.getDay();
                                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = zondag, 6 = zaterdag
                                  
                                  // 🎨 KLEUR LOGICA (zelfde als shift planner)
                                  // Helper functie om unavailable te detecteren (net zoals in shift-planner)
                                  const isUnavailablePref = (p: ShiftPreference) => 
                                    p.notes === 'Niet beschikbaar' || (p.startTime === null && p.endTime === null);
                                  
                                  // Check voorkeuren
                                  const hasDayAvailable = datePrefs && datePrefs.some((p: ShiftPreference) => p.type === "day" && !isUnavailablePref(p));
                                  const hasNightAvailable = datePrefs && datePrefs.some((p: ShiftPreference) => p.type === "night" && !isUnavailablePref(p));
                                  const hasAnyUnavailable = datePrefs && datePrefs.some(isUnavailablePref);
                                  const hasAnyAvailable = hasDayAvailable || hasNightAvailable;
                                  
                                  // Bepaal kleur prioriteit (van hoog naar laag):
                                  // 1. Rood - ALLE shifts onbeschikbaar
                                  const isFullyUnavailable = datePrefs && datePrefs.length > 0 && datePrefs.every(isUnavailablePref);
                                  // 2. Groen - alle shifts beschikbaar (dag EN nacht), geen onbeschikbare
                                  const isFullyAvailable = hasDayAvailable && hasNightAvailable && !hasAnyUnavailable;
                                  // 3. Oranje - mix van available/unavailable OF slechts een type available
                                  const isPartialAvailable = hasAnyAvailable && (hasAnyUnavailable || (hasDayAvailable !== hasNightAvailable));
                                  // 4. Wit - geen voorkeur
                                  const hasNoPreference = !datePrefs || datePrefs.length === 0;
                                  
                                  // Bepaal shift details voor tooltip/modal
                                  const shiftDetails = datePrefs && datePrefs
                                    .filter((p: ShiftPreference) => p.type !== 'unavailable')
                                    .map((p: ShiftPreference) => {
                                      let shiftType = p.type === 'day' ? 'Dag' : 'Nacht';
                                      let shiftTime = '';
                                      
                                      if (p.startTime && p.endTime) {
                                        const startDate = new Date(p.startTime);
                                        const endDate = new Date(p.endTime);
                                        const startHour = parseInt(startDate.toLocaleTimeString('nl-NL', { 
                                          hour: '2-digit',
                                          timeZone: 'Europe/Brussels',
                                          hour12: false 
                                        }).split(':')[0]);
                                        const endHour = parseInt(endDate.toLocaleTimeString('nl-NL', { 
                                          hour: '2-digit',
                                          timeZone: 'Europe/Brussels',
                                          hour12: false 
                                        }).split(':')[0]);
                                        
                                        if (p.type === 'day') {
                                          if (startHour === 7 && endHour === 19) shiftTime = '(7-19u, volledig)';
                                          else if (startHour === 7 && endHour === 13) shiftTime = '(7-13u, eerste helft)';
                                          else if (startHour === 13 && endHour === 19) shiftTime = '(13-19u, tweede helft)';
                                          else shiftTime = `(${startHour}-${endHour}u)`;
                                        } else {
                                          if (startHour === 19 && endHour === 7) shiftTime = '(19-7u, volledig)';
                                          else if (startHour === 19 && endHour === 23) shiftTime = '(19-23u, eerste helft)';
                                          else if (startHour === 23 && endHour === 7) shiftTime = '(23-7u, tweede helft)';
                                          else shiftTime = `(${startHour}-${endHour}u)`;
                                        }
                                      }
                                      
                                      return `${shiftType} ${shiftTime}`;
                                    });
                                  
                                  // Vereenvoudigde weergave
                                  return (
                                    <Dialog key={day}>
                                      <DialogTrigger asChild>
                                        <div 
                                          key={day}
                                          className={`p-2 rounded-md border cursor-pointer hover:border-gray-400 ${
                                            isFullyUnavailable ? 'bg-red-100 border-red-400' : 
                                            isFullyAvailable ? 'bg-green-100 border-green-400' : 
                                            isPartialAvailable ? 'bg-orange-100 border-orange-400' :
                                            'bg-white border-gray-200' // Wit voor geen voorkeur
                                          }`}
                                        >
                                          <div className="flex justify-between items-center">
                                            <div className="font-medium">{day + 1}</div>
                                            <div className="text-xs text-gray-600">
                                              {format(date, 'E', { locale: nl })}
                                            </div>
                                          </div>
                                          {isWeekend && (
                                            <div className="mt-1 text-xs text-center text-gray-500">
                                              weekend
                                            </div>
                                          )}
                                        </div>
                                      </DialogTrigger>
                                      
                                      {/* Details dialog wanneer op een dag wordt geklikt */}
                                      <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                          <DialogTitle>
                                            Beschikbaarheid voor {format(date, 'dd MMMM yyyy', { locale: nl })}
                                            {isWeekend && (
                                              <span className="ml-2 inline-block text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                                weekend
                                              </span>
                                            )}
                                          </DialogTitle>
                                        </DialogHeader>
                                        
                                        <div className="py-4">
                                          {isFullyUnavailable ? (
                                            <div className="flex items-center text-red-600 font-medium mb-2">
                                              <span className="h-3 w-3 bg-red-500 rounded-full mr-2"></span>
                                              Niet beschikbaar op deze dag
                                            </div>
                                          ) : hasNoPreference ? (
                                            <div className="text-gray-500">
                                              Geen voorkeuren ingesteld voor deze dag
                                            </div>
                                          ) : (
                                            <div className="space-y-3">
                                              {datePrefs.map((pref: ShiftPreference, index: number) => {
                                                if (pref.type === 'unavailable') return null;
                                                
                                                let timeSlot = '-';
                                                let shiftPart = '';
                                                
                                                if (pref.startTime && pref.endTime) {
                                                  const startDate = new Date(pref.startTime);
                                                  const endDate = new Date(pref.endTime);
                                                  const startHour = parseInt(startDate.toLocaleTimeString('nl-NL', { 
                                                    hour: '2-digit',
                                                    timeZone: 'Europe/Brussels',
                                                    hour12: false 
                                                  }).split(':')[0]);
                                                  const endHour = parseInt(endDate.toLocaleTimeString('nl-NL', { 
                                                    hour: '2-digit',
                                                    timeZone: 'Europe/Brussels',
                                                    hour12: false 
                                                  }).split(':')[0]);
                                                  
                                                  // Standaardiseer hier de tijden in plaats van de daadwerkelijke uren te tonen
                                                  if (pref.type === 'day') {
                                                    if ((startHour === 7 || startHour === 9) && (endHour === 19 || endHour === 21)) {
                                                      timeSlot = '07:00 - 19:00';
                                                      shiftPart = '(volledige shift)';
                                                    } else if ((startHour === 7 || startHour === 9) && (endHour === 13 || endHour === 15)) {
                                                      timeSlot = '07:00 - 13:00';
                                                      shiftPart = '(eerste helft)';
                                                    } else if ((startHour === 13 || startHour === 15) && (endHour === 19 || endHour === 21)) {
                                                      timeSlot = '13:00 - 19:00';
                                                      shiftPart = '(tweede helft)';
                                                    }
                                                  } else if (pref.type === 'night') {
                                                    if ((startHour === 19 || startHour === 21) && (endHour === 7 || endHour === 9)) {
                                                      timeSlot = '19:00 - 07:00';
                                                      shiftPart = '(volledige shift)';
                                                    } else if ((startHour === 19 || startHour === 21) && (endHour === 23 || endHour === 1)) {
                                                      timeSlot = '19:00 - 23:00';
                                                      shiftPart = '(eerste helft)';
                                                    } else if ((startHour === 23 || startHour === 1) && (endHour === 7 || endHour === 9)) {
                                                      timeSlot = '23:00 - 07:00';
                                                      shiftPart = '(tweede helft)';
                                                    }
                                                  }
                                                }
                                                
                                                return (
                                                  <div
                                                    key={index}
                                                    className={`p-3 rounded-md ${
                                                      pref.type === 'day' ? 'bg-green-50 border border-green-200' :
                                                      'bg-blue-50 border border-blue-200'
                                                    }`}
                                                  >
                                                    <div className="flex items-center mb-1">
                                                      <span className={`h-3 w-3 rounded-full mr-2 ${
                                                        pref.type === 'day' ? 'bg-green-500' : 'bg-blue-500'
                                                      }`}></span>
                                                      <span className="font-medium">
                                                        {pref.type === 'day' ? 'Dagshift' : 'Nachtshift'}
                                                      </span>
                                                    </div>
                                                    <div className="ml-5">
                                                      <div>
                                                        <span className="text-sm">{timeSlot}</span>
                                                        {shiftPart && (
                                                          <span className="text-sm text-gray-600 ml-1">{shiftPart}</span>
                                                        )}
                                                      </div>
                                                      {pref.notes && (
                                                        <div className="text-xs text-gray-600 mt-1">
                                                          <span className="font-medium">Notitie:</span> {pref.notes}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  );
                                })}
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600 mt-2 border-t pt-2">
                                <div className="flex items-center">
                                  <span className="h-3 w-3 bg-green-100 border border-green-400 rounded-md mr-1"></span>
                                  <span>Beschikbaar</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="h-3 w-3 bg-red-100 border border-red-400 rounded-md mr-1"></span>
                                  <span>Niet beschikbaar</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="h-3 w-3 bg-gray-50 border border-gray-200 rounded-md mr-1"></span>
                                  <span>Geen voorkeur opgegeven</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Knop voor bewerken gebruiker */}
                  <Dialog open={editDialogOpen} onOpenChange={(open) => {
                    setEditDialogOpen(open);
                    if (open) {
                      setSelectedUserId(u.id);
                      updateUserForm.reset({
                        firstName: u.firstName,
                        lastName: u.lastName,
                        email: u.email || "",
                        role: u.role as "admin" | "ambulancier" | "supervisor",
                        hours: u.hours,
                        isProfessional: u.isProfessional || false,
                        hasDrivingLicenseC: u.hasDrivingLicenseC ?? true,
                        phoneNumber: u.phoneNumber || ""
                      });
                      setPhotoPreviewUrl(u.profilePhotoUrl || null);
                      setSelectedPhotoFile(null);
                    } else {
                      setPhotoPreviewUrl(null);
                      setSelectedPhotoFile(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Gebruiker Bewerken</DialogTitle>
                      </DialogHeader>
                      <Form {...updateUserForm}>
                        <form 
                          onSubmit={updateUserForm.handleSubmit(async (data) => {
                            if (!selectedUserId) return;
                            
                            try {
                              // Update basic user data
                              await updateUserMutation.mutateAsync({ 
                                userId: selectedUserId, 
                                data: {
                                  firstName: data.firstName,
                                  lastName: data.lastName,
                                  email: data.email,
                                  role: data.role as "admin" | "ambulancier" | "supervisor",
                                  hours: data.hours,
                                  isProfessional: data.isProfessional,
                                  hasDrivingLicenseC: data.hasDrivingLicenseC
                                }
                              });
                              
                              // Update phone number if changed
                              const currentUser = users?.find((u: User) => u.id === selectedUserId);
                              if (data.phoneNumber !== (currentUser?.phoneNumber || "")) {
                                await updatePhoneNumberMutation.mutateAsync({
                                  userId: selectedUserId,
                                  phoneNumber: data.phoneNumber || null
                                });
                              }
                              
                              // Upload profile photo if selected
                              if (selectedPhotoFile) {
                                await uploadProfilePhotoMutation.mutateAsync({
                                  userId: selectedUserId,
                                  file: selectedPhotoFile
                                });
                              }
                              
                              // Only close dialog if all operations succeeded
                              setEditDialogOpen(false);
                              updateUserForm.reset();
                              setSelectedPhotoFile(null);
                              setPhotoPreviewUrl(null);
                              
                              toast({
                                title: "Succes",
                                description: "Gebruiker volledig bijgewerkt",
                              });
                            } catch (error) {
                              // Error is already handled by individual mutations
                              // Don't close dialog so user can retry
                            }
                          })} 
                          className="space-y-4"
                        >
                          {/* Profile Photo Section */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Profielfoto</label>
                            <div className="flex items-center gap-4">
                              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                                {photoPreviewUrl || selectedPhotoFile ? (
                                  <img 
                                    src={selectedPhotoFile ? URL.createObjectURL(selectedPhotoFile) : photoPreviewUrl || undefined}
                                    alt="Profile preview"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Camera className="w-8 h-8" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 2 * 1024 * 1024) {
                                        toast({
                                          title: "Bestand te groot",
                                          description: "De foto mag maximaal 2MB zijn",
                                          variant: "destructive"
                                        });
                                        return;
                                      }
                                      setSelectedPhotoFile(file);
                                    }
                                  }}
                                  className="cursor-pointer"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Maximaal 2MB, JPG, PNG of GIF
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Voornaam</label>
                              <Input
                                placeholder="Jan"
                                {...updateUserForm.register("firstName")}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Achternaam</label>
                              <Input
                                placeholder="Smit"
                                {...updateUserForm.register("lastName")}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Email (optioneel)</label>
                            <p className="text-sm text-muted-foreground">Voor email notificaties</p>
                            <Input
                              type="email"
                              placeholder="jan.smit@voorbeeld.be"
                              data-testid="input-email-update"
                              {...updateUserForm.register("email")}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Telefoonnummer (optioneel)</label>
                            <p className="text-sm text-muted-foreground">Voor contactinformatie</p>
                            <Input
                              type="tel"
                              placeholder="+32 123 45 67 89"
                              {...updateUserForm.register("phoneNumber")}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Rol</label>
                            <p className="text-sm text-muted-foreground">Bepaalt de rechten en toegang van de gebruiker</p>
                            <Select 
                              value={updateUserForm.watch("role")}
                              onValueChange={(value) => updateUserForm.setValue("role", value as "admin" | "ambulancier" | "supervisor")}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecteer rol" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ambulancier">Ambulancier</SelectItem>
                                <SelectItem value="admin">Administrator</SelectItem>
                                {user?.role === 'supervisor' && (
                                  <SelectItem value="supervisor">Supervisor</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Werkuren</label>
                            <p className="text-sm text-muted-foreground">Bepaal het aantal werkuren per maand</p>
                            <Input
                              type="number"
                              placeholder="24"
                              {...updateUserForm.register("hours", { valueAsNumber: true })}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="isProfessional-edit"
                                checked={updateUserForm.watch("isProfessional")}
                                onCheckedChange={(checked) => updateUserForm.setValue("isProfessional", !!checked)}
                                data-testid="checkbox-professional-edit"
                              />
                              <div className="space-y-1">
                                <label htmlFor="isProfessional-edit" className="text-sm font-medium cursor-pointer">
                                  Beroepspersoneel
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  Beroepspersoneel wordt automatisch beperkt tot maximaal 1 shift per week
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="hasDrivingLicenseC-edit"
                                checked={updateUserForm.watch("hasDrivingLicenseC")}
                                onCheckedChange={(checked) => updateUserForm.setValue("hasDrivingLicenseC", !!checked)}
                                data-testid="checkbox-driving-license-edit"
                              />
                              <div className="space-y-1">
                                <label htmlFor="hasDrivingLicenseC-edit" className="text-sm font-medium cursor-pointer">
                                  Rijbewijs C
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  Minimaal 1 ambulancier met rijbewijs C vereist per shift
                                </p>
                              </div>
                            </div>
                          </div>

                          <Button 
                            type="submit"
                            className="w-full"
                            disabled={updateUserMutation.isPending}
                          >
                            Opslaan
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="relative group"
                        onClick={() => {
                          setSelectedUserId(u.id);
                          setChangePasswordDialogOpen(true);
                        }}
                      >
                        <span className="sr-only">Wachtwoord wijzigen</span>
                        <KeyRound className="h-4 w-4" />
                        <span className="absolute -top-8 scale-0 transition-all rounded bg-black px-2 py-1 text-xs text-white group-hover:scale-100">
                          Wachtwoord wijzigen
                        </span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Wachtwoord Wijzigen</DialogTitle>
                      </DialogHeader>
                      <Form {...changePasswordForm}>
                        <form 
                          onSubmit={changePasswordForm.handleSubmit((data) => {
                            if (selectedUserId) {
                              changePasswordMutation.mutate({ 
                                userId: selectedUserId, 
                                password: data.password 
                              });
                            }
                          })} 
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Nieuw Wachtwoord</label>
                            <p className="text-sm text-muted-foreground">Minimaal 6 karakters</p>
                            <Input
                              type="password"
                              placeholder="Nieuw wachtwoord"
                              {...changePasswordForm.register("password")}
                            />
                          </div>
                          <Button 
                            type="submit"
                            className="w-full"
                            disabled={changePasswordMutation.isPending}
                          >
                            Wachtwoord Wijzigen
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  {/* Verberg delete knop voor de huidige gebruiker (voorkom self-deletion) */}
                  {user?.id !== u.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Gebruiker Verwijderen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Weet u zeker dat u {u.firstName} {u.lastName} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUserMutation.mutate(u.id)}
                            disabled={deleteUserMutation.isPending}
                          >
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Undo History Panel voor gebruikersbeheer */}
      <UserUndoHistoryPanel stationId={user?.role === 'supervisor' ? (selectedStationId || 0) : (user?.stationId || 0)} />
        </TabsContent>

        {/* Cross-team Beheer Tab - Alleen voor supervisors */}
        <TabsContent value="crossteam" className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Gebruiker Selectie Paneel */}
            <Card className="flex-1">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Gebruiker Selecteren</h3>
                </div>
                
                <div className="space-y-4">
                  <Input
                    type="search"
                    placeholder="Zoek gebruiker op naam..."
                    value={crossTeamSearchTerm}
                    onChange={(e) => setCrossTeamSearchTerm(e.target.value)}
                    className="w-full"
                    data-testid="input-cross-team-search"
                  />
                  
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {allUsersForCrossTeam
                      ?.filter(u => {
                        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
                        const username = u.username.toLowerCase();
                        const search = crossTeamSearchTerm.toLowerCase();
                        return fullName.includes(search) || username.includes(search);
                      })
                      .map(user => (
                        <div
                          key={user.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedUserForCrossTeam?.id === user.id
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => setSelectedUserForCrossTeam(user)}
                          data-testid={`user-card-${user.id}`}
                        >
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm opacity-70">{user.username} • {user.role}</div>
                        </div>
                      ))}
                  </div>
                  
                  {isLoadingCrossTeamUsers && (
                    <div className="text-center py-4 text-muted-foreground">
                      Laden...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Station Toewijzing Paneel */}
            <Card className="flex-1">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Station Toewijzingen</h3>
                </div>
                
                {selectedUserForCrossTeam ? (
                  <div className="space-y-6">
                    {/* Huidige toewijzingen */}
                    <div>
                      <h4 className="font-medium mb-3">Huidige Toewijzingen</h4>
                      <div className="space-y-2">
                        {isLoadingAssignments ? (
                          <div className="text-center py-4 text-muted-foreground">Laden...</div>
                        ) : (
                          <>
                            {/* Toon altijd het primaire station */}
                            {(() => {
                              const primaryStation = (stations as Station[])?.find(s => s.id === selectedUserForCrossTeam.stationId);
                              return primaryStation ? (
                                <div key={`primary-${primaryStation.id}`} className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium">{primaryStation.displayName}</div>
                                      <div className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                                        Primair Station
                                      </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{selectedUserForCrossTeam.hours || 0} uur per maand</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="160"
                                      defaultValue={selectedUserForCrossTeam.hours || 0}
                                      className="w-16 h-8 text-center"
                                      onBlur={(e) => {
                                        const newHours = parseInt(e.target.value) || 0;
                                        if (newHours !== (selectedUserForCrossTeam.hours || 0) && newHours >= 0 && newHours <= 160) {
                                          updatePrimaryStationHoursMutation.mutate({
                                            userId: selectedUserForCrossTeam.id,
                                            maxHours: newHours
                                          });
                                        }
                                      }}
                                    />
                                    <span className="text-sm text-muted-foreground">u</span>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                            
                            {/* Toon cross-team assignments */}
                            {userStationAssignments?.length > 0 ? (
                              userStationAssignments.map((assignment: any) => (
                                <div key={assignment.station.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="font-medium">{assignment.station.displayName}</div>
                                      <div className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                                        Cross-team
                                      </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{assignment.maxHours} uur per maand</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="1"
                                      max="160"
                                      defaultValue={assignment.maxHours}
                                      className="w-16 h-8 text-center"
                                      onBlur={(e) => {
                                        const newHours = parseInt(e.target.value);
                                        if (newHours !== assignment.maxHours && newHours >= 1 && newHours <= 160) {
                                          updateUserStationHoursMutation.mutate({
                                            userId: selectedUserForCrossTeam.id,
                                            stationId: assignment.station.id,
                                            maxHours: newHours
                                          });
                                        }
                                      }}
                                    />
                                    <span className="text-sm text-muted-foreground">u</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                      onClick={() => {
                                        setNewPrimaryStationId(assignment.station.id);
                                        setMaxHoursForOldStation(selectedUserForCrossTeam.hours || 24);
                                        setChangePrimaryStationDialogOpen(true);
                                      }}
                                      title="Maak dit het primaire station"
                                    >
                                      <Home className="h-4 w-4 mr-1" />
                                      Maak primair
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => {
                                        if (confirm(`Weet je zeker dat je ${selectedUserForCrossTeam.firstName} ${selectedUserForCrossTeam.lastName} wil verwijderen van ${assignment.station.displayName}?`)) {
                                          deleteUserStationAssignmentMutation.mutate({
                                            userId: selectedUserForCrossTeam.id,
                                            stationId: assignment.station.id
                                          });
                                        }
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-2 text-sm text-muted-foreground">
                                Geen extra cross-team toewijzingen
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Nieuwe toewijzing toevoegen */}
                    <div className="border-t pt-6">
                      <h4 className="font-medium mb-3">Nieuwe Toewijzing Toevoegen</h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Station</label>
                            <Select 
                              value={selectedCrossTeamStation?.toString() || ""} 
                              onValueChange={(value) => setSelectedCrossTeamStation(parseInt(value))}
                            >
                              <SelectTrigger data-testid="select-cross-team-station">
                                <SelectValue placeholder="Kies station..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(stations as Station[])
                                  ?.filter(station => {
                                    // Filter uit stations waar de user al toegang toe heeft
                                    if (station.id === selectedUserForCrossTeam.stationId) return false;
                                    return !userStationAssignments?.some((a: any) => a.station.id === station.id);
                                  })
                                  ?.map((station) => (
                                    <SelectItem key={station.id} value={station.id.toString()}>
                                      {station.displayName}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium mb-2 block">Max Uren per Maand</label>
                            <Input
                              type="number"
                              min="1"
                              max="160"
                              value={crossTeamHourLimit}
                              onChange={(e) => setCrossTeamHourLimit(parseInt(e.target.value) || 24)}
                              data-testid="input-cross-team-hours"
                            />
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => {
                            if (selectedCrossTeamStation && selectedUserForCrossTeam) {
                              addUserToStationMutation.mutate({
                                userId: selectedUserForCrossTeam.id,
                                stationId: selectedCrossTeamStation,
                                maxHours: crossTeamHourLimit
                              });
                            }
                          }}
                          disabled={!selectedCrossTeamStation || addUserToStationMutation.isPending}
                          className="w-full"
                          data-testid="button-add-cross-team-assignment"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {addUserToStationMutation.isPending ? "Toevoegen..." : "Station Toewijzing Toevoegen"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    Selecteer eerst een gebruiker om station toewijzingen te beheren
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bevestigingsdialoog voor primair station wijzigen */}
      <AlertDialog open={changePrimaryStationDialogOpen} onOpenChange={setChangePrimaryStationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Primair Station Wijzigen</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {selectedUserForCrossTeam && newPrimaryStationId && (
                <>
                  <div>
                    Weet je zeker dat je het primaire station van <strong>{selectedUserForCrossTeam.firstName} {selectedUserForCrossTeam.lastName}</strong> wil wijzigen?
                  </div>
                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Huidig primair station:</span>
                      <span className="text-sm">{(stations as Station[])?.find(s => s.id === selectedUserForCrossTeam.stationId)?.displayName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Nieuw primair station:</span>
                      <span className="text-sm font-semibold text-primary">{(stations as Station[])?.find(s => s.id === newPrimaryStationId)?.displayName}</span>
                    </div>
                  </div>
                  <div>
                    Het oude primaire station wordt automatisch een <strong>cross-team toewijzing</strong>.
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Max uren per maand voor oude primaire station:
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="160"
                      value={maxHoursForOldStation}
                      onChange={(e) => setMaxHoursForOldStation(parseInt(e.target.value) || 24)}
                      className="w-full"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Let op: Alle shifts, voorkeuren en statistieken blijven gekoppeld aan de gebruiker en worden automatisch bijgewerkt.
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUserForCrossTeam && newPrimaryStationId) {
                  changePrimaryStationMutation.mutate({
                    userId: selectedUserForCrossTeam.id,
                    newPrimaryStationId: newPrimaryStationId,
                    maxHoursForOldStation: maxHoursForOldStation
                  });
                }
              }}
              disabled={changePrimaryStationMutation.isPending}
            >
              {changePrimaryStationMutation.isPending ? "Wijzigen..." : "Primair Station Wijzigen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}