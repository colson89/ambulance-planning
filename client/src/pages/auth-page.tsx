import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Home, Building2, ArrowLeft } from "lucide-react";
import type { Station } from "@shared/schema";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  useEffect(() => {
    // Check if station was selected
    const stationData = sessionStorage.getItem("selectedStation");
    if (!stationData) {
      setLocation("/");
      return;
    }
    setSelectedStation(JSON.parse(stationData));
  }, [setLocation]);

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const loginForm = useForm({
    defaultValues: { username: "", password: "" }
  });

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Andere post
              </Button>
            </div>
            {selectedStation && (
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span className="text-lg font-semibold">{selectedStation.displayName}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Log in om door te gaan naar het planning systeem
                </p>
              </div>
            )}
            <CardTitle className="text-center">Inloggen</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                <div className="space-y-4">
                  {loginMutation.isError && (
                    <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded-md mb-2">
                      <p className="text-sm font-medium">⚠️ Login mislukt</p>
                      <p className="text-xs font-medium">{loginMutation.error?.message || "Controleer je gebruikersnaam en wachtwoord"}</p>
                      <p className="text-xs mt-1">
                        <span className="inline-block bg-destructive/10 px-2 py-1 rounded mr-1">Tip:</span> 
                        Zorg dat je gebruikersnaam in hoofdletters staat en let op hoofdletters en speciale tekens in je wachtwoord.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Input
                      placeholder="Gebruikersnaam"
                      {...loginForm.register("username")}
                      className={loginMutation.isError ? "border-destructive" : ""}
                      disabled={loginMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Wachtwoord"
                      {...loginForm.register("password")}
                      className={loginMutation.isError ? "border-destructive" : ""}
                      disabled={loginMutation.isPending}
                    />
                  </div>
                  <Button 
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Inloggen...
                      </span>
                    ) : "Inloggen"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:block bg-primary/10 p-8">
        <div className="h-full flex flex-col justify-center max-w-lg mx-auto">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welkom bij {selectedStation?.displayName || 'Brandweerzone'} Planning Systeem
          </h1>
          <p className="text-lg text-muted-foreground">
            Beheer efficiënt diensten en personeelsplanning met ons intuïtieve planningssysteem.
          </p>
        </div>
      </div>
    </div>
  );
}