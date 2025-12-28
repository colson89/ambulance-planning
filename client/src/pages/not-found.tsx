import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">Pagina niet gevonden</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            De pagina die u zoekt bestaat niet of is verplaatst.
          </p>

          <div className="mt-6">
            <Link href="/">
              <Button className="w-full">
                Terug naar startpagina
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
