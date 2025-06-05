import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Home } from "lucide-react";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

const preferencesSchema = z.object({
  maxHours: z.number().min(0).max(168),
  preferredHours: z.number().min(0).max(168)
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Huidig wachtwoord is verplicht"),
  newPassword: z.string().min(6, "Nieuw wachtwoord moet minimaal 6 karakters bevatten"),
  confirmPassword: z.string().min(1, "Bevestig het nieuwe wachtwoord")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
});

// Component to show admin contact information
function AdminContactList() {
  const { data: admins = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admins/contact"],
    queryFn: async () => {
      const res = await fetch('/api/admins/contact');
      if (!res.ok) {
        throw new Error('Kon administrator contactgegevens niet ophalen');
      }
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <p className="text-xs text-blue-700">
        Laden...
      </p>
    );
  }

  if (admins.length === 0) {
    return (
      <p className="text-xs text-blue-700">
        Geen administrators gevonden.
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-blue-700 mb-1">Administrators:</p>
      <ul className="text-xs text-blue-700 space-y-1">
        {admins.map(admin => (
          <li key={admin.id} className="flex items-center">
            <span className="font-medium">
              {admin.firstName} {admin.lastName}
            </span>
            <span className="text-blue-600 ml-1">
              ({admin.username})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const preferencesForm = useForm({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      maxHours: user?.maxHours || 40,
      preferredHours: user?.preferredHours || 32
    }
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: z.infer<typeof preferencesSchema>) => {
      const res = await apiRequest("PATCH", `/api/users/${user!.id}/preferences`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Voorkeuren bijgewerkt",
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

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordSchema>) => {
      const res = await apiRequest("PATCH", `/api/users/${user!.id}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Wachtwoord bijgewerkt",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Profiel</h1>
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Werk Voorkeuren</CardTitle>
          </CardHeader>
          <CardContent>
            {user?.role === 'admin' ? (
              <Form {...preferencesForm}>
                <form onSubmit={preferencesForm.handleSubmit((data) => updatePreferencesMutation.mutate(data))} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Maximum Uren per Week</label>
                    <Input
                      type="number"
                      {...preferencesForm.register("maxHours", { valueAsNumber: true })}
                    />
                  </div>



                  <Button 
                    type="submit"
                    disabled={updatePreferencesMutation.isPending}
                  >
                    Voorkeuren Opslaan
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Maximum Uren per Maand</label>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {user?.hours || 0} uren
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Door administrator ingesteld</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Gebruikersrol</label>
                  <div className="text-lg font-medium text-gray-900 mt-1 capitalize">
                    {user?.role || 'ambulancier'}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 mb-2">
                    Je werkuren worden beheerd door de administrator. 
                    Neem contact op met de administrator als je dit wilt veranderen.
                  </p>
                  <AdminContactList />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wachtwoord Wijzigen</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Huidig Wachtwoord</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nieuw Wachtwoord</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bevestig Nieuw Wachtwoord</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit"
                  disabled={updatePasswordMutation.isPending}
                >
                  {updatePasswordMutation.isPending ? "Wijzigen..." : "Wachtwoord Wijzigen"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}