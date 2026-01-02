import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, CheckCircle, Minus, Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface VkActivity {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
}

interface VkSubActivity {
  id: number;
  activityId: number;
  name: string;
  description: string | null;
  maxQuantity: number | null;
}

interface VkPricing {
  id: number;
  subActivityId: number;
  membershipTypeId: number;
  pricePerUnit: string;
}

interface VkMembershipType {
  id: number;
  name: string;
  description: string | null;
}

interface ActivityWithDetails extends VkActivity {
  subActivities: VkSubActivity[];
  pricing: VkPricing[];
}

interface RegistrationForm {
  name: string;
  email: string;
  membershipTypeId: string;
}

interface SubActivityQuantity {
  subActivityId: number;
  quantity: number;
}

export default function VriendenkringRegister() {
  const { activityId } = useParams<{ activityId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(
    activityId ? parseInt(activityId) : null
  );
  const [quantities, setQuantities] = useState<SubActivityQuantity[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<RegistrationForm>({
    defaultValues: {
      name: "",
      email: "",
      membershipTypeId: "",
    },
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<VkActivity[]>({
    queryKey: ["/api/vk/activities"],
  });

  const { data: membershipTypes = [] } = useQuery<VkMembershipType[]>({
    queryKey: ["/api/vk/membership-types"],
  });

  const { data: activityDetails, isLoading: detailsLoading } = useQuery<ActivityWithDetails>({
    queryKey: ["/api/vk/activities", selectedActivityId],
    enabled: !!selectedActivityId,
  });

  useEffect(() => {
    if (activityDetails?.subActivities) {
      setQuantities(
        activityDetails.subActivities.map((sa) => ({
          subActivityId: sa.id,
          quantity: 0,
        }))
      );
    }
  }, [activityDetails]);

  const selectedMembershipTypeId = form.watch("membershipTypeId");

  const totalPrice = useMemo(() => {
    if (!activityDetails?.pricing || !selectedMembershipTypeId) return 0;

    let total = 0;
    quantities.forEach((q) => {
      if (q.quantity > 0) {
        const pricing = activityDetails.pricing.find(
          (p) =>
            p.subActivityId === q.subActivityId &&
            p.membershipTypeId === parseInt(selectedMembershipTypeId)
        );
        if (pricing) {
          total += parseFloat(pricing.pricePerUnit) * q.quantity;
        }
      }
    });
    return total;
  }, [quantities, activityDetails?.pricing, selectedMembershipTypeId]);

  const updateQuantity = (subActivityId: number, delta: number) => {
    setQuantities((prev) =>
      prev.map((q) => {
        if (q.subActivityId === subActivityId) {
          const subActivity = activityDetails?.subActivities.find(
            (sa) => sa.id === subActivityId
          );
          const maxQty = subActivity?.maxQuantity ?? 99;
          const newQty = Math.max(0, Math.min(maxQty, q.quantity + delta));
          return { ...q, quantity: newQty };
        }
        return q;
      })
    );
  };

  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const items = quantities
        .filter((q) => q.quantity > 0)
        .map((q) => {
          const pricing = activityDetails?.pricing.find(
            (p) =>
              p.subActivityId === q.subActivityId &&
              p.membershipTypeId === parseInt(data.membershipTypeId)
          );
          return {
            subActivityId: q.subActivityId,
            quantity: q.quantity,
            pricePerUnit: pricing?.pricePerUnit || "0",
          };
        });

      const res = await fetch("/api/vk/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: selectedActivityId,
          name: data.name,
          email: data.email,
          membershipTypeId: parseInt(data.membershipTypeId),
          totalAmount: totalPrice.toFixed(2),
          items,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Inschrijving mislukt");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Inschrijving mislukt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationForm) => {
    if (!selectedActivityId) {
      toast({
        title: "Selecteer een activiteit",
        variant: "destructive",
      });
      return;
    }
    if (quantities.every((q) => q.quantity === 0)) {
      toast({
        title: "Selecteer minstens één deelactiviteit",
        variant: "destructive",
      });
      return;
    }
    registrationMutation.mutate(data);
  };

  const getPrice = (subActivityId: number) => {
    if (!activityDetails?.pricing || !selectedMembershipTypeId) return null;
    const pricing = activityDetails.pricing.find(
      (p) =>
        p.subActivityId === subActivityId &&
        p.membershipTypeId === parseInt(selectedMembershipTypeId)
    );
    return pricing ? parseFloat(pricing.pricePerUnit) : null;
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Inschrijving geslaagd!</h2>
            <p className="text-muted-foreground mb-4">
              Bedankt voor je inschrijving. Je ontvangt een bevestiging per e-mail.
            </p>
            <p className="text-lg font-semibold mb-6">
              Te betalen: €{totalPrice.toFixed(2)}
            </p>
            <Button onClick={() => setLocation("/VriendenkringMol/inschrijven")}>
              Nieuwe inschrijving
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeActivities = activities.filter((a) => a.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Vriendenkring Mol</CardTitle>
            <CardDescription>Inschrijven voor activiteiten</CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activeActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Er zijn momenteel geen activiteiten waarvoor je kan inschrijven.
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label>Activiteit</Label>
                  <Select
                    value={selectedActivityId?.toString() || ""}
                    onValueChange={(v) => setSelectedActivityId(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer een activiteit" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeActivities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{activity.name}</span>
                            {activity.startDate && (
                              <span className="text-muted-foreground">
                                ({format(new Date(activity.startDate), "d MMM yyyy", { locale: nl })})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedActivityId && activityDetails && (
                  <>
                    {activityDetails.description && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        {activityDetails.description}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Naam *</Label>
                        <Input
                          id="name"
                          placeholder="Volledige naam"
                          {...form.register("name", { required: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@voorbeeld.be"
                          {...form.register("email", { required: true })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Lidmaatschapstype *</Label>
                      <Select
                        value={form.watch("membershipTypeId")}
                        onValueChange={(v) => form.setValue("membershipTypeId", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer je lidmaatschapstype" />
                        </SelectTrigger>
                        <SelectContent>
                          {membershipTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
                              {type.description && (
                                <span className="text-muted-foreground ml-2">
                                  - {type.description}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {activityDetails.subActivities.length > 0 && selectedMembershipTypeId && (
                      <div className="space-y-3">
                        <Label>Deelactiviteiten</Label>
                        <div className="space-y-2">
                          {activityDetails.subActivities.map((subActivity) => {
                            const price = getPrice(subActivity.id);
                            const quantity =
                              quantities.find((q) => q.subActivityId === subActivity.id)
                                ?.quantity || 0;

                            return (
                              <div
                                key={subActivity.id}
                                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{subActivity.name}</div>
                                  {subActivity.description && (
                                    <div className="text-sm text-muted-foreground">
                                      {subActivity.description}
                                    </div>
                                  )}
                                  {price !== null && (
                                    <div className="text-sm font-medium text-blue-600">
                                      €{price.toFixed(2)} per stuk
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateQuantity(subActivity.id, -1)}
                                    disabled={quantity === 0}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-8 text-center font-medium">{quantity}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateQuantity(subActivity.id, 1)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Totaal te betalen:</span>
                        <span className="text-blue-600">€{totalPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={registrationMutation.isPending}
                    >
                      {registrationMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Bezig met inschrijven...
                        </>
                      ) : (
                        "Inschrijven"
                      )}
                    </Button>
                  </>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
