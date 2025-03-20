import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const preferencesSchema = z.object({
  maxHours: z.number().min(0).max(168),
  preferredHours: z.number().min(0).max(168)
});

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      maxHours: user?.maxHours || 40,
      preferredHours: user?.preferredHours || 32
    }
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: z.infer<typeof preferencesSchema>) => {
      const res = await apiRequest("PATCH", `/api/users/${user!.id}/preferences`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Preferences updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Work Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updatePreferencesMutation.mutate(data))} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Maximum Hours per Week</label>
                <Input
                  type="number"
                  {...form.register("maxHours", { valueAsNumber: true })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Preferred Hours per Week</label>
                <Input
                  type="number"
                  {...form.register("preferredHours", { valueAsNumber: true })}
                />
              </div>

              <Button 
                type="submit"
                disabled={updatePreferencesMutation.isPending}
              >
                Save Preferences
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
