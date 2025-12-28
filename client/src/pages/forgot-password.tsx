import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const requestReset = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    }
  });

  const logoUrl = "/logo.png";

  if (submitted) {
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
            <CardTitle className="text-xl">E-mail Verzonden</CardTitle>
            <CardDescription className="mt-2">
              Als het e-mailadres bekend is in ons systeem, ontvangt u binnen enkele minuten een e-mail met instructies om uw wachtwoord te resetten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Geen e-mail ontvangen?</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
                <li>Controleer uw spam/ongewenste mail folder</li>
                <li>Controleer of het e-mailadres correct is gespeld</li>
                <li>Neem contact op met uw beheerder</li>
              </ul>
            </div>
            
            <Button 
              variant="outline" 
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/auth")}
            className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug
          </Button>
          <div className="flex justify-center mb-4">
            <img 
              src={logoUrl} 
              alt="Brandweer Zone Kempen" 
              className="h-20 w-20 object-contain"
            />
          </div>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-indigo-100 rounded-full">
              <Mail className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <CardTitle className="text-xl">Wachtwoord Vergeten</CardTitle>
          <CardDescription className="mt-2">
            Voer uw e-mailadres in om een link te ontvangen waarmee u een nieuw wachtwoord kunt instellen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); requestReset.mutate(email); }}>
            <div className="space-y-4">
              {requestReset.isError && (
                <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Er is een fout opgetreden</p>
                    <p className="text-xs mt-1">
                      {(requestReset.error as any)?.message || "Probeer het later opnieuw of neem contact op met uw beheerder."}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="uw.email@voorbeeld.be"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base"
                  disabled={requestReset.isPending}
                  required
                />
              </div>
              
              <Button 
                type="submit"
                className="w-full h-12 text-base"
                disabled={requestReset.isPending || !email}
              >
                {requestReset.isPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Bezig...
                  </span>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Reset Link Versturen
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
