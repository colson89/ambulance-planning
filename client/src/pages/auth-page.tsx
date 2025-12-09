import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Home, Building2, ArrowLeft, Eye, EyeOff, KeyRound, Phone, User } from "lucide-react";
import type { Station } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

const logoUrl = "/logo.png";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTimer, setPasswordTimer] = useState<number | null>(null);
  const [hasCheckedStation, setHasCheckedStation] = useState(false);

  // Get station from sessionStorage on every render to ensure it's always current
  const getSelectedStation = (): Station | null => {
    const stationData = sessionStorage.getItem("selectedStation");
    if (stationData) {
      try {
        return JSON.parse(stationData);
      } catch {
        return null;
      }
    }
    return null;
  };

  const selectedStation = getSelectedStation();

  useEffect(() => {
    // Only check once on initial mount, and only redirect if no station exists
    if (!hasCheckedStation) {
      setHasCheckedStation(true);
      if (!selectedStation) {
        setLocation("/station-select");
      }
    }
  }, [hasCheckedStation, selectedStation, setLocation]);

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const loginForm = useForm({
    defaultValues: { username: "", password: "" }
  });

  // Check if password reset is enabled
  const { data: passwordResetStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/password-reset/enabled']
  });

  // Get admin contacts for selected station
  const { data: adminContacts } = useQuery<{ firstName: string; lastName: string; phoneNumber: string | null; role: string }[]>({
    queryKey: ['/api/stations', selectedStation?.id, 'contacts'],
    queryFn: async () => {
      if (!selectedStation?.id) return [];
      const response = await fetch(`/api/stations/${selectedStation.id}/contacts`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedStation?.id
  });

  const togglePasswordVisibility = () => {
    if (!showPassword) {
      // Wachtwoord zichtbaar maken
      setShowPassword(true);
      
      // Timer starten voor automatisch verbergen na 5 seconden
      const timer = window.setTimeout(() => {
        setShowPassword(false);
        setPasswordTimer(null);
      }, 5000);
      
      setPasswordTimer(timer);
    } else {
      // Wachtwoord direct verbergen
      setShowPassword(false);
      if (passwordTimer) {
        clearTimeout(passwordTimer);
        setPasswordTimer(null);
      }
    }
  };

  // Cleanup timer bij unmount
  useEffect(() => {
    return () => {
      if (passwordTimer) {
        clearTimeout(passwordTimer);
      }
    };
  }, [passwordTimer]);

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="p-4 sm:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/station-select")}
                className="text-muted-foreground hover:text-foreground h-11"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Andere post
              </Button>
            </div>
            <div className="flex justify-center mb-4 sm:mb-6">
              <img 
                src={logoUrl} 
                alt="Brandweer Zone Kempen" 
                className="h-20 w-20 sm:h-24 sm:w-24 object-contain"
              />
            </div>
            {selectedStation && (
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span className="text-base sm:text-lg font-semibold">{selectedStation.displayName}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Log in om door te gaan
                </p>
              </div>
            )}
            <CardTitle className="text-center text-xl sm:text-2xl">Inloggen</CardTitle>
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
                    <div className="flex items-center">
                      <Input
                        placeholder="jeva400"
                        {...loginForm.register("username")}
                        className={`h-12 text-base rounded-r-none border-r-0 ${loginMutation.isError ? "border-destructive" : ""}`}
                        disabled={loginMutation.isPending}
                      />
                      <span className="h-12 px-3 flex items-center bg-muted border border-l-0 border-input rounded-r-md text-muted-foreground text-sm font-medium">
                        @bwzk.be
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Wachtwoord"
                        {...loginForm.register("password")}
                        className={`h-12 text-base pr-12 ${loginMutation.isError ? "border-destructive" : ""}`}
                        disabled={loginMutation.isPending}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0.5 top-0.5 h-11 w-11 hover:bg-muted"
                        onClick={togglePasswordVisibility}
                        disabled={loginMutation.isPending}
                        title={showPassword ? "Wachtwoord verbergen" : "Wachtwoord 5 sec. tonen"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {showPassword && (
                      <p className="text-xs text-muted-foreground">
                        Wachtwoord wordt automatisch verborgen na 5 seconden
                      </p>
                    )}
                  </div>
                  <Button 
                    type="submit"
                    className="w-full h-12 text-base"
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
                  
                  {/* Forgot password link - only shown when feature is enabled */}
                  {passwordResetStatus?.enabled && (
                    <div className="text-center mt-4">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-muted-foreground hover:text-primary"
                        onClick={() => setLocation("/forgot-password")}
                      >
                        <KeyRound className="h-3 w-3 mr-1" />
                        Wachtwoord vergeten?
                      </Button>
                    </div>
                  )}

                  {/* Admin contacts for help */}
                  {adminContacts && adminContacts.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-xs text-muted-foreground text-center mb-3">
                        Problemen met inloggen? Neem contact op met:
                      </p>
                      <div className="space-y-2">
                        {adminContacts.map((contact, index) => (
                          <div key={index} className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-3 py-2">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{contact.firstName} {contact.lastName}</span>
                              <span className="text-xs text-muted-foreground">
                                ({contact.role === 'supervisor' ? 'Supervisor' : 'Beheerder'})
                              </span>
                            </div>
                            {contact.phoneNumber && (
                              <a 
                                href={`tel:${contact.phoneNumber}`} 
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                <span>{contact.phoneNumber}</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:block bg-primary/10 p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent z-10"></div>
        <img 
          src="/ambulance-hero.jpg" 
          alt="Ambulance voertuig" 
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-20 h-full flex flex-col justify-center max-w-lg mx-auto">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welkom bij {selectedStation?.displayName || 'Brandweerzone'} Planning Systeem
          </h1>
          <p className="text-lg text-gray-800 font-semibold">
            Beheer efficiënt diensten en personeelsplanning met ons intuïtieve planningssysteem.
          </p>
        </div>
      </div>
    </div>
  );
}