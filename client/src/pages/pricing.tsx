import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Calendar, Users, Shield, Clock, BarChart3, Smartphone, RefreshCw, Mail, Building2, Zap } from "lucide-react";
import { useLocation } from "wouter";

export default function Pricing() {
  const [, setLocation] = useLocation();

  const features = [
    { icon: Calendar, title: "Volledige Shiftplanning", description: "Dag-, nacht- en gesplitste diensten met automatische roostergeneratie" },
    { icon: Users, title: "Voorkeurenbeheer", description: "Ambulanciers kunnen hun beschikbaarheid en voorkeuren doorgeven" },
    { icon: RefreshCw, title: "Shift Ruil Systeem", description: "Collega's kunnen onderling diensten ruilen met goedkeuring" },
    { icon: Zap, title: "Verdi-integratie", description: "Automatische synchronisatie met Verdi alarmsoftware" },
    { icon: BarChart3, title: "Rapportages & Statistieken", description: "Uitgebreide overzichten en Excel-exports" },
    { icon: Smartphone, title: "Kalender-synchronisatie", description: "iCal-feeds voor persoonlijke agenda's" },
    { icon: Building2, title: "Multi-station Ondersteuning", description: "Beheer meerdere stations vanuit één systeem" },
    { icon: Mail, title: "Email Notificaties", description: "Automatische meldingen voor deadlines en wijzigingen" },
    { icon: Clock, title: "Undo-geschiedenis", description: "Wijzigingen ongedaan maken indien nodig" },
    { icon: Shield, title: "Veilig & Betrouwbaar", description: "Beveiligde toegang met rolgebaseerde rechten" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Ambulance Planning Tool
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Professionele shiftplanning voor ambulancediensten. 
            Bespaar tijd, verminder fouten en verbeter de werktevredenheid.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="border-2 border-primary shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Compleet Pakket</CardTitle>
              <CardDescription>Alles wat je nodig hebt</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-gray-900">€850</span>
                  <span className="text-gray-500">/maand</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">of €8.500/jaar (2 maanden gratis)</p>
              </div>
              
              <div className="space-y-3 text-left mb-8">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Onbeperkt aantal stations</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Onbeperkt aantal gebruikers</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Alle features inbegrepen</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Inclusief updates & ondersteuning</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Beveiligde cloud hosting of hosting op eigen server</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Werkt als app op telefoon en tablet (PWA)</span>
                </div>
              </div>

              <Button size="lg" className="w-full text-lg py-6" asChild>
                <a href="mailto:info@ambulance-planning.be?subject=Interesse%20Ambulance%20Planning%20Tool">
                  Contact Opnemen
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-amber-100 p-3 rounded-full w-fit mb-4">
                <Zap className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl">Eenmalige Kosten</CardTitle>
              <CardDescription>Optionele diensten</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">Implementatie & Setup</h3>
                    <span className="font-bold text-lg">€1.000</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Eerste configuratie en opleiding om zelf gebruikers en instellingen te beheren.
                  </p>
                </div>
                
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">Training & Onboarding</h3>
                    <span className="font-bold text-lg">€500</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Handleiding en instructies ter beschikking.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">Maatwerk Ontwikkeling</h3>
                    <span className="font-bold text-lg">Op aanvraag</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Specifieke aanpassingen of integraties op maat? 
                    Neem contact op voor een vrijblijvende offerte.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Alles Inbegrepen
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="p-2 bg-primary/10 rounded-lg h-fit">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Klaar om te starten?
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Neem contact met ons op voor een vrijblijvende demonstratie. 
              Wij tonen u graag hoe de Ambulance Planning Tool uw organisatie kan helpen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" asChild>
                <a href="mailto:info@ambulance-planning.be?subject=Demo%20Aanvraag%20Ambulance%20Planning%20Tool">
                  Demo Aanvragen
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                <a href="mailto:info@ambulance-planning.be?subject=Offerte%20Aanvraag%20Ambulance%20Planning%20Tool">
                  Offerte Ontvangen
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Prijzen exclusief BTW. Jaarcontract vereist. Maandelijkse opzegging mogelijk na eerste jaar.</p>
        </div>
      </div>
    </div>
  );
}
