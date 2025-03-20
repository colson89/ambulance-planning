import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertUserSchema, type User } from "@shared/schema";
import { z } from "zod";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, UserPlus, KeyRound } from "lucide-react";

const updateUserSchema = z.object({
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  role: z.enum(["admin", "ambulancier"]),
  minHours: z.number().min(0).max(168),
  maxHours: z.number().min(0).max(168),
  preferredHours: z.number().min(0).max(168),
});

type UpdateUserData = z.infer<typeof updateUserSchema>;

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      role: "ambulancier",
      isAdmin: false,
      minHours: 24,
      maxHours: 40,
      preferredHours: 32
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
      const res = await apiRequest("PATCH", `/api/users/${userId}/password`, { password });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Succes",
        description: "Wachtwoord gewijzigd",
      });
      changePasswordForm.reset();
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
                  <Select onValueChange={(value) => createUserForm.setValue("role", value)}>
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
                  <label className="text-sm font-medium">Werkuren Instellingen</label>
                  <p className="text-sm text-muted-foreground">Bepaal het aantal werkuren per week</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium">Minimum</label>
                      <Input
                        type="number"
                        placeholder="24"
                        {...createUserForm.register("minHours", { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Maximum</label>
                      <Input
                        type="number"
                        placeholder="40"
                        {...createUserForm.register("maxHours", { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Voorkeur</label>
                      <Input
                        type="number"
                        placeholder="32"
                        {...createUserForm.register("preferredHours", { valueAsNumber: true })}
                      />
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
        {users?.map((u) => (
          <Card key={u.id}>
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
                    Uren: {u.minHours}-{u.maxHours} (voorkeur: {u.preferredHours})
                  </p>
                </div>

                <div className="flex gap-2">
                  <Dialog>
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
                              data
                            });
                          })} 
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Voornaam</label>
                              <Input
                                placeholder="Jan"
                                defaultValue={u.firstName}
                                {...updateUserForm.register("firstName")}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Achternaam</label>
                              <Input
                                placeholder="Smit"
                                defaultValue={u.lastName}
                                {...updateUserForm.register("lastName")}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Rol</label>
                            <p className="text-sm text-muted-foreground">Bepaalt de rechten en toegang van de gebruiker</p>
                            <Select 
                              defaultValue={u.role}
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
                            <label className="text-sm font-medium">Werkuren Instellingen</label>
                            <p className="text-sm text-muted-foreground">Bepaal het aantal werkuren per week</p>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="text-xs font-medium">Minimum</label>
                                <Input
                                  type="number"
                                  placeholder="24"
                                  defaultValue={u.minHours}
                                  {...updateUserForm.register("minHours", { valueAsNumber: true })}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium">Maximum</label>
                                <Input
                                  type="number"
                                  placeholder="40"
                                  defaultValue={u.maxHours}
                                  {...updateUserForm.register("maxHours", { valueAsNumber: true })}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium">Voorkeur</label>
                                <Input
                                  type="number"
                                  placeholder="32"
                                  defaultValue={u.preferredHours}
                                  {...updateUserForm.register("preferredHours", { valueAsNumber: true })}
                                />
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

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" className="relative group">
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
                          onSubmit={changePasswordForm.handleSubmit((data) => 
                            changePasswordMutation.mutate({ userId: u.id, password: data.password })
                          )} 
                          className="space-y-4"
                        >
                          <Input
                            type="password"
                            placeholder="Nieuw wachtwoord"
                            {...changePasswordForm.register("password")}
                          />
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