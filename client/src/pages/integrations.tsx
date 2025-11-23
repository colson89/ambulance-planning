import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link as LinkIcon, ArrowLeft, Settings } from "lucide-react";
import { useLocation } from "wouter";

export default function Integrations() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Alleen admins en supervisors kunnen integraties beheren
  const canManageIntegrations = user?.role === "admin" || user?.role === "supervisor";

  if (!canManageIntegrations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Toegang Geweigerd</CardTitle>
            <CardDescription>
              Je hebt geen rechten om integraties te beheren. Alleen admins en supervisors kunnen deze pagina bekijken.
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar Dashboard
          </Button>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-100 rounded-full">
                <Settings className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Integraties</h1>
            <p className="text-lg text-gray-600">
              Beheer koppelingen met externe systemen en diensten
            </p>
          </div>
        </div>

        {/* Integraties Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Verdi Integration Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => setLocation("/verdi")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                <LinkIcon className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Verdi Alarm Software</CardTitle>
              <CardDescription className="mb-2">
                Koppeling met Verdi voor automatische shift synchronisatie
              </CardDescription>
              <Badge variant="default" className="mx-auto bg-green-600">Actief</Badge>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="outline" 
                className="w-full group"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/verdi");
                }}
              >
                Configureren
                <Settings className="ml-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Placeholder for future integrations */}
          <Card className="border-dashed border-2 border-gray-300 opacity-60">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-gray-100 rounded-full w-fit">
                <LinkIcon className="h-8 w-8 text-gray-400" />
              </div>
              <CardTitle className="text-xl text-gray-500">Toekomstige Integratie</CardTitle>
              <CardDescription className="mb-2">
                Ruimte voor extra koppelingen
              </CardDescription>
              <Badge variant="secondary" className="mx-auto">Binnenkort</Badge>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="outline" 
                className="w-full"
                disabled
              >
                Nog niet beschikbaar
              </Button>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 border-gray-300 opacity-60">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-gray-100 rounded-full w-fit">
                <LinkIcon className="h-8 w-8 text-gray-400" />
              </div>
              <CardTitle className="text-xl text-gray-500">Toekomstige Integratie</CardTitle>
              <CardDescription className="mb-2">
                Ruimte voor extra koppelingen
              </CardDescription>
              <Badge variant="secondary" className="mx-auto">Binnenkort</Badge>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="outline" 
                className="w-full"
                disabled
              >
                Nog niet beschikbaar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div className="mt-8">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Over Integraties</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-800">
                Integraties verbinden het Ambulance Planning Systeem met externe diensten zoals 
                alarmeringssoftware, HR-systemen, en andere tools. Deze koppelingen automatiseren 
                workflows en zorgen ervoor dat data up-to-date blijft tussen verschillende systemen.
              </p>
              <div className="mt-4 p-3 bg-white rounded border border-blue-200">
                <p className="text-sm text-gray-700">
                  <strong>Verdi:</strong> Synchroniseert ingeplande shifts automatisch naar de Verdi 
                  alarmeringscentrale, zodat de juiste medewerkers bereikbaar zijn tijdens noodsituaties.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
