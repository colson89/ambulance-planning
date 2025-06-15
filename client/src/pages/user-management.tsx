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
import { insertUserSchema, type User, type ShiftPreference } from "@shared/schema";
import { z } from "zod";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, UserPlus, KeyRound, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Calendar } from "@/components/ui/calendar";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const updateUserSchema = z.object({
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  role: z.enum(["admin", "ambulancier"]),
  hours: z.number().min(0).max(168),
});

type UpdateUserData = z.infer<typeof updateUserSchema>;

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [viewPreferencesForUserId, setViewPreferencesForUserId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  
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
    queryKey: ["/api/users"],
  });

  const createUserForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "ambulancier" as "admin" | "ambulancier",
      isAdmin: false,
      hours: 24
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Succes",
        description: "Gebruiker aangemaakt",
      });
      createUserForm.reset();
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
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Succes",
        description: "Gebruiker bijgewerkt",
      });
      updateUserForm.reset();
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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

  if (!user?.isAdmin) {
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
        
        <div className="flex items-center gap-4 flex-1 max-w-md mx-4">
          <Input
            type="search"
            placeholder="Zoek op naam of gebruikersnaam..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Nieuwe Gebruiker
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Gebruiker Aanmaken</DialogTitle>
              </DialogHeader>
              <Form {...createUserForm}>
                <form onSubmit={createUserForm.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
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
                    <label className="text-sm font-medium">Rol</label>
                    <p className="text-sm text-muted-foreground">Bepaalt de rechten en toegang van de gebruiker</p>
                    <Select onValueChange={(value) => createUserForm.setValue("role", value as "admin" | "ambulancier")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ambulancier">Ambulancier</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
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
                                  
                                  // Bepaal beschikbaarheid - eerst checken of de gebruiker expliciet "niet beschikbaar" heeft aangegeven
                                  const isUnavailable = datePrefs && datePrefs.some(p => p.type === 'unavailable');
                                  // Alleen als niet expliciet onbeschikbaar, dan kijken of gebruiker beschikbaar is
                                  // Als datePrefs er zijn maar leeg, dan is er geen voorkeur ingesteld (neutrale kleur)
                                  // Als datePrefs[].type is 'day' of 'night', dan is beschikbaar
                                  const hasPreferences = datePrefs && datePrefs.length > 0;
                                  const isAvailable = !isUnavailable && hasPreferences && datePrefs.some(p => p.type === 'day' || p.type === 'night');
                                  
                                  // Bepaal shift details voor tooltip/modal
                                  const shiftDetails = datePrefs && datePrefs
                                    .filter(p => p.type !== 'unavailable')
                                    .map(p => {
                                      let shiftType = p.type === 'day' ? 'Dag' : 'Nacht';
                                      let shiftTime = '';
                                      
                                      if (p.startTime && p.endTime) {
                                        const startHour = new Date(p.startTime).getHours();
                                        const endHour = new Date(p.endTime).getHours();
                                        
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
                                            isUnavailable ? 'bg-red-100 border-red-400' : 
                                            isAvailable ? 'bg-green-100 border-green-400' : 
                                            'bg-gray-50 border-gray-200' // Neutrale voorkeuren blijven neutraal in weergave
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
                                          {isUnavailable ? (
                                            <div className="flex items-center text-red-600 font-medium mb-2">
                                              <span className="h-3 w-3 bg-red-500 rounded-full mr-2"></span>
                                              Niet beschikbaar op deze dag
                                            </div>
                                          ) : !datePrefs || datePrefs.length === 0 ? (
                                            <div className="text-gray-500">
                                              Geen voorkeuren ingesteld voor deze dag
                                            </div>
                                          ) : (
                                            <div className="space-y-3">
                                              {datePrefs.map((pref: ShiftPreference, index) => {
                                                if (pref.type === 'unavailable') return null;
                                                
                                                let timeSlot = '-';
                                                let shiftPart = '';
                                                
                                                if (pref.startTime && pref.endTime) {
                                                  const startHour = new Date(pref.startTime).getHours();
                                                  const endHour = new Date(pref.endTime).getHours();
                                                  
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
                  <Dialog onOpenChange={(open) => {
                    if (open) {
                      updateUserForm.reset({
                        firstName: u.firstName,
                        lastName: u.lastName,
                        role: u.role as "admin" | "ambulancier",
                        hours: u.hours
                      });
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Gebruiker Bewerken</DialogTitle>
                      </DialogHeader>
                      <Form {...updateUserForm}>
                        <form 
                          onSubmit={updateUserForm.handleSubmit((data) => {
                            updateUserMutation.mutate({ 
                              userId: u.id, 
                              data: {
                                ...data,
                                role: data.role as "admin" | "ambulancier"
                              }
                            });
                          })} 
                          className="space-y-4"
                        >
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
                            <label className="text-sm font-medium">Rol</label>
                            <p className="text-sm text-muted-foreground">Bepaalt de rechten en toegang van de gebruiker</p>
                            <Select 
                              value={updateUserForm.watch("role")}
                              onValueChange={(value) => updateUserForm.setValue("role", value as "admin" | "ambulancier")}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecteer rol" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ambulancier">Ambulancier</SelectItem>
                                <SelectItem value="admin">Administrator</SelectItem>
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
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}