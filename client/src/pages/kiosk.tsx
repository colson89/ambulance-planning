import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function KioskPage() {
  const [, params] = useRoute("/kiosk/:token");
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = params?.token;
    
    if (!token) {
      setError("Geen kiosk token gevonden");
      setLoading(false);
      return;
    }

    const doKioskLogin = async () => {
      try {
        const res = await apiRequest("GET", `/api/kiosk/${token}`);
        
        if (!res.ok) {
          const data = await res.json();
          setError(data.message || "Kiosk login mislukt");
          setLoading(false);
          return;
        }

        const data = await res.json();
        
        if (data.success && data.redirect) {
          window.location.href = data.redirect;
        } else {
          setError("Onverwachte response van server");
          setLoading(false);
        }
      } catch (err) {
        console.error("Kiosk login error:", err);
        setError("Verbindingsfout - probeer opnieuw");
        setLoading(false);
      }
    };

    doKioskLogin();
  }, [params?.token, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Display modus laden...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Kiosk Fout</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">
            Neem contact op met de beheerder als dit probleem aanhoudt.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
