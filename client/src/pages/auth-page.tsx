import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Home, Key } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [devLoginLoading, setDevLoginLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm({
    defaultValues: { username: "", password: "" }
  });
  
  const devLoginForm = useForm({
    defaultValues: { username: "" }
  });
  
  const handleDevLogin = async (data: { username: string }) => {
    try {
      setDevLoginLoading(true);
      const res = await apiRequest("POST", "/api/dev-login", data);
      const user = await res.json();
      
      // Manueel de pagina verversen om de login status te updaten
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Login mislukt",
        description: "Kon niet inloggen met de opgegeven gebruikersnaam",
        variant: "destructive",
      });
    } finally {
      setDevLoginLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ambulance Shift Planner</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="normal">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="normal">Normale Login</TabsTrigger>
                <TabsTrigger value="dev">Dev Login</TabsTrigger>
              </TabsList>
              
              <TabsContent value="normal">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                    <div className="space-y-4">
                      <Input
                        placeholder="Gebruikersnaam"
                        {...loginForm.register("username")}
                      />
                      <Input
                        type="password"
                        placeholder="Wachtwoord"
                        {...loginForm.register("password")}
                      />
                      <Button 
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        Inloggen
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="dev">
                <div className="bg-yellow-100 dark:bg-yellow-950 p-3 rounded-md mb-4 text-sm">
                  <p className="font-medium">⚠️ Alleen voor ontwikkeling</p>
                  <p className="text-xs text-muted-foreground">Login zonder wachtwoord (gebruik ROVE319 voor admin)</p>
                </div>
                <Form {...devLoginForm}>
                  <form onSubmit={devLoginForm.handleSubmit(handleDevLogin)}>
                    <div className="space-y-4">
                      <Input
                        placeholder="Gebruikersnaam"
                        {...devLoginForm.register("username")}
                      />
                      <Button 
                        type="submit"
                        className="w-full"
                        disabled={devLoginLoading}
                        variant="outline"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Direct Inloggen
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:block bg-primary/10 p-8">
        <div className="h-full flex flex-col justify-center max-w-lg mx-auto">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome to Westerlo Ambulance Shift Planning
          </h1>
          <p className="text-lg text-muted-foreground">
            Efficiently manage ambulance shifts and staff scheduling with our intuitive planning system.
          </p>
        </div>
      </div>
    </div>
  );
}