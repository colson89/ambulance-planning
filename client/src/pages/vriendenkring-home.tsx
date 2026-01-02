import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Calendar, 
  Mail, 
  MapPin, 
  Phone, 
  ExternalLink,
  Shield,
  Clock,
  Heart,
  Flame
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface VkActivity {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
}

export default function VriendenkringHome() {
  const [, setLocation] = useLocation();

  const { data: activities = [] } = useQuery<VkActivity[]>({
    queryKey: ["/api/vk/activities"],
  });

  const upcomingActivities = activities.filter(a => a.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="h-24 w-24 bg-gradient-to-br from-red-600 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Flame className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Vriendenkring Brandweer Mol
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            VZW voor brandweerlieden en hun families
          </p>
        </div>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-red-600" />
              Over Ons
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              De Vriendenkring Brandweer Mol is een vereniging zonder winstoogmerk (VZW) 
              die activiteiten organiseert voor brandweerlieden van Brandweerzone Kempen - 
              Post Mol en hun families. Wij brengen collega's samen buiten de werkvloer en 
              versterken de band tussen onze leden door gezellige evenementen te organiseren.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Van nieuwjaarsrecepties tot familiefeesten, van opendeurdag tot Sint Barbara 
              vieringen - wij zorgen voor onvergetelijke momenten voor onze leden.
            </p>
          </CardContent>
        </Card>

        {upcomingActivities.length > 0 && (
          <Card className="mb-8 shadow-lg border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                Aankomende Activiteiten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingActivities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="p-4 bg-orange-50 dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-gray-700"
                >
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {activity.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(new Date(activity.startDate), "d MMMM yyyy", { locale: nl })}
                      {activity.startTime && ` om ${activity.startTime}`}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
                      {activity.description}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-600" />
              Opendeurdag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300">
              Om de twee jaar organiseren wij een opendeurdag bij de brandweerkazerne van Mol. 
              Tijdens deze dag kunnen bezoekers kennismaken met het werk van de brandweer, 
              demonstraties bijwonen en genieten van een gezellige sfeer met eten en drinken.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm italic">
              Volgende opendeurdag: wordt nog aangekondigd
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-red-600" />
                Contactgegevens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Adres:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Ambachtsstraat 18<br />
                  2400 Mol
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">E-mail:</p>
                <a 
                  href="mailto:vriendenkring.vzwbrandweermol@gmail.com" 
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Mail className="h-4 w-4" />
                  vriendenkring.vzwbrandweermol@gmail.com
                </a>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Telefoon:</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm italic">
                  Neem contact op via e-mail
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-red-600" />
                VZW Gegevens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Naam:</span>
                <span className="font-medium">Vriendenkring Brandweer Mol</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Ondernemingsnr:</span>
                <span className="font-medium">0463.758.186</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rechtsvorm:</span>
                <span className="font-medium">VZW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Sinds:</span>
                <span className="font-medium">4 mei 1998</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Betalingen & Terugbetalingen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Betaalmethoden</h4>
              <p>
                Betalingen worden veilig verwerkt via Stripe. Wij accepteren Bancontact, 
                iDEAL, en creditcard betalingen.
              </p>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Terugbetalingsbeleid</h4>
              <p>
                Bij annulering tot 7 dagen voor een activiteit ontvangt u een volledige 
                terugbetaling. Bij annulering binnen 7 dagen voor de activiteit is geen 
                terugbetaling mogelijk, tenzij er sprake is van overmacht. Neem contact 
                met ons op via e-mail voor annuleringsverzoeken.
              </p>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Annuleringsbeleid</h4>
              <p>
                Bij onvoldoende inschrijvingen behoudt de organisatie zich het recht voor 
                een activiteit te annuleren. In dat geval worden alle deelnemers volledig 
                terugbetaald.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Privacybeleid & Voorwaarden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Privacybeleid</h4>
              <p>
                De Vriendenkring Brandweer Mol VZW respecteert uw privacy en verwerkt 
                persoonsgegevens in overeenstemming met de Algemene Verordening 
                Gegevensbescherming (AVG/GDPR). Wij verzamelen alleen gegevens die 
                noodzakelijk zijn voor de organisatie van onze activiteiten: naam, 
                e-mailadres en lidmaatschapstype. Uw gegevens worden niet gedeeld met 
                derden, behalve met Stripe voor betalingsverwerking. U heeft het recht 
                op inzage, correctie en verwijdering van uw gegevens. Neem hiervoor 
                contact met ons op via e-mail.
              </p>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Algemene Voorwaarden</h4>
              <p>
                Door in te schrijven voor een activiteit gaat u akkoord met deze 
                voorwaarden. Inschrijvingen zijn persoonlijk en niet overdraagbaar. 
                De organisatie is niet aansprakelijk voor persoonlijk letsel of 
                materiële schade tijdens activiteiten, behalve in geval van opzet of 
                grove nalatigheid. Deelnemers dienen zich te houden aan de huisregels 
                en aanwijzingen van de organisatoren. De organisatie behoudt zich het 
                recht voor om deelnemers die zich niet aan de regels houden de toegang 
                te weigeren zonder restitutie.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Bestuur: Tommy Bastiaens, Pieter Berghmans, Jeroen Vanhoof
          </p>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation("/VriendenkringMol/login")}
            className="text-gray-500 hover:text-gray-700"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Beheerders login
          </Button>
        </div>

        <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} Vriendenkring Brandweer Mol VZW</p>
          <p className="mt-1">Alle rechten voorbehouden</p>
        </footer>
      </div>
    </div>
  );
}
