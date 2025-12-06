import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, KeyRound, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const logoUrl = "/logo.png";

  const { data: tokenValid, isLoading: validating } = useQuery<{ valid: boolean }>({
    queryKey: ['/api/auth/validate-reset-token', token],
    queryFn: async () => {
      if (!token) return { valid: false };
      const res = await fetch(`/api/auth/validate-reset-token/${token}`);
      return res.json();
    },
    enabled: !!token
  });

  const resetPassword = useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
    }
  });

  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 6;
  const canSubmit = passwordsMatch && passwordValid && password.length > 0;

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={logoUrl} 
                alt="Brandweer Zone Kempen" 
                className="h-20 w-20 object-contain"
              />
            </div>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-xl">Wachtwoord Gewijzigd</CardTitle>
            <CardDescription className="mt-2">
              Uw wachtwoord is succesvol gewijzigd. U kunt nu inloggen met uw nieuwe wachtwoord.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full h-12 text-base"
              onClick={() => setLocation("/auth")}
            >
              Naar Inloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Link valideren...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || !tokenValid?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={logoUrl} 
                alt="Brandweer Zone Kempen" 
                className="h-20 w-20 object-contain"
              />
            </div>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl">Ongeldige Link</CardTitle>
            <CardDescription className="mt-2">
              Deze wachtwoord reset link is ongeldig of verlopen. Reset links zijn 1 uur geldig na aanvraag.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setLocation("/forgot-password")}
            >
              Nieuwe Reset Link Aanvragen
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => setLocation("/auth")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar inloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={logoUrl} 
              alt="Brandweer Zone Kempen" 
              className="h-20 w-20 object-contain"
            />
          </div>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-indigo-100 rounded-full">
              <KeyRound className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <CardTitle className="text-xl">Nieuw Wachtwoord Instellen</CardTitle>
          <CardDescription className="mt-2">
            Kies een nieuw wachtwoord voor uw account. Minimaal 6 karakters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); if (canSubmit && token) resetPassword.mutate({ token, password }); }}>
            <div className="space-y-4">
              {resetPassword.isError && (
                <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Er is een fout opgetreden</p>
                    <p className="text-xs mt-1">
                      {(resetPassword.error as any)?.message || "Probeer het later opnieuw."}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nieuw Wachtwoord</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimaal 6 karakters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`h-12 text-base pr-12 ${password.length > 0 && !passwordValid ? "border-destructive" : ""}`}
                    disabled={resetPassword.isPending}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0.5 top-0.5 h-11 w-11 hover:bg-muted"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={resetPassword.isPending}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {password.length > 0 && !passwordValid && (
                  <p className="text-xs text-destructive">Wachtwoord moet minimaal 6 karakters bevatten</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bevestig Wachtwoord</label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Herhaal wachtwoord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`h-12 text-base ${confirmPassword.length > 0 && !passwordsMatch ? "border-destructive" : ""}`}
                  disabled={resetPassword.isPending}
                  required
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-destructive">Wachtwoorden komen niet overeen</p>
                )}
              </div>
              
              <Button 
                type="submit"
                className="w-full h-12 text-base"
                disabled={resetPassword.isPending || !canSubmit}
              >
                {resetPassword.isPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Bezig...
                  </span>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Wachtwoord Wijzigen
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
