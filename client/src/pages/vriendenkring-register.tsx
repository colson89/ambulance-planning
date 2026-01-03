import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, CheckCircle, Minus, Plus, Calendar, Lock } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface InvitationData {
  name: string;
  email: string;
  membershipTypeId: number;
  activityId: number;
  activityName: string;
}

interface VkActivity {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  maxPersonsPerRegistration?: number | null;
}

interface VkSubActivity {
  id: number;
  activityId: number;
  name: string;
  description: string | null;
  maxQuantity: number | null;
  maxQuantityPerRegistration?: number | null;
}

interface VkPricing {
  id: number;
  subActivityId: number;
  membershipTypeId: number;
  pricePerUnit: string;
}

interface VkActivityPricing {
  id: number;
  activityId: number;
  membershipTypeId: number;
  price: number;
}

interface VkMembershipType {
  id: number;
  name: string;
  description: string | null;
}

interface ActivityWithDetails extends VkActivity {
  subActivities: VkSubActivity[];
  pricing: VkPricing[];
  activityPricing: VkActivityPricing[];
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
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Parse token and preview params from URL query string
  const urlParams = new URLSearchParams(searchString);
  const invitationToken = urlParams.get("token");
  const isPreview = urlParams.get("preview") === "true";
  const previewName = urlParams.get("name");
  const previewEmail = urlParams.get("email");
  const previewMembershipTypeId = urlParams.get("membershipTypeId");
  const previewActivityId = urlParams.get("activity");

  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(
    activityId ? parseInt(activityId) : (previewActivityId ? parseInt(previewActivityId) : null)
  );
  const [quantities, setQuantities] = useState<SubActivityQuantity[]>([]);
  const [personCount, setPersonCount] = useState<number>(1); // Aantal personen voor directe prijzen
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPrefilledFromInvitation, setIsPrefilledFromInvitation] = useState(false);

  const form = useForm<RegistrationForm>({
    defaultValues: {
      name: "",
      email: "",
      membershipTypeId: "",
    },
  });

  // Fetch invitation data if token is present
  const { data: invitationData, isLoading: invitationLoading } = useQuery<InvitationData>({
    queryKey: ["/api/vk/invitation-data", invitationToken],
    queryFn: async () => {
      const res = await fetch(`/api/vk/invitation-data/${invitationToken}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Uitnodiging niet gevonden");
      }
      return res.json();
    },
    enabled: !!invitationToken && invitationToken.length === 64,
    retry: false,
  });

  // Pre-fill form when invitation data is loaded
  useEffect(() => {
    if (invitationData && !isPrefilledFromInvitation) {
      form.setValue("name", invitationData.name);
      form.setValue("email", invitationData.email);
      form.setValue("membershipTypeId", invitationData.membershipTypeId.toString());
      setSelectedActivityId(invitationData.activityId);
      setIsPrefilledFromInvitation(true);
    }
  }, [invitationData, form, isPrefilledFromInvitation]);

  // Pre-fill form when preview parameters are present
  useEffect(() => {
    if (isPreview && !isPrefilledFromInvitation) {
      if (previewName) form.setValue("name", previewName);
      if (previewEmail) form.setValue("email", previewEmail);
      if (previewMembershipTypeId) form.setValue("membershipTypeId", previewMembershipTypeId);
      if (previewActivityId) setSelectedActivityId(parseInt(previewActivityId));
      setIsPrefilledFromInvitation(true);
    }
  }, [isPreview, previewName, previewEmail, previewMembershipTypeId, previewActivityId, form, isPrefilledFromInvitation]);

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<VkActivity[]>({
    queryKey: ["/api/vk/activities"],
  });

  const { data: membershipTypes = [] } = useQuery<VkMembershipType[]>({
    queryKey: ["/api/vk/membership-types"],
  });

  const { data: activityDetails, isLoading: detailsLoading } = useQuery<ActivityWithDetails>({
    queryKey: ["/api/vk/activities", selectedActivityId],
    queryFn: async () => {
      const res = await fetch(`/api/vk/activities/${selectedActivityId}`);
      if (!res.ok) throw new Error("Failed to fetch activity details");
      return res.json();
    },
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
    // Reset personCount when activity changes to respect new activity's max
    setPersonCount(1);
  }, [activityDetails]);

  const selectedMembershipTypeId = form.watch("membershipTypeId");

  const hasSubActivities = activityDetails?.subActivities && activityDetails.subActivities.length > 0;
  const hasActivityPricing = activityDetails?.activityPricing && activityDetails.activityPricing.length > 0;

  const totalPrice = useMemo(() => {
    if (!selectedMembershipTypeId) return 0;

    let total = 0;

    // If activity has sub-activities, calculate based on sub-activity pricing
    if (hasSubActivities && activityDetails?.pricing) {
      quantities.forEach((q) => {
        if (q.quantity > 0) {
          const pricing = activityDetails.pricing.find(
            (p) =>
              p.subActivityId === q.subActivityId &&
              p.membershipTypeId === parseInt(selectedMembershipTypeId)
          );
          if (pricing) {
            total += (Number(pricing.pricePerUnit) / 100) * q.quantity;
          }
        }
      });
    } 
    // If activity has direct pricing (no sub-activities), use activity pricing
    else if (hasActivityPricing && activityDetails?.activityPricing) {
      const activityPrice = activityDetails.activityPricing.find(
        (ap) => ap.membershipTypeId === parseInt(selectedMembershipTypeId)
      );
      if (activityPrice) {
        total = (activityPrice.price / 100) * personCount; // Multiply by person count
      }
    }
    
    return total;
  }, [quantities, activityDetails?.pricing, activityDetails?.activityPricing, selectedMembershipTypeId, hasSubActivities, hasActivityPricing, personCount]);

  const updateQuantity = (subActivityId: number, delta: number) => {
    setQuantities((prev) =>
      prev.map((q) => {
        if (q.subActivityId === subActivityId) {
          const subActivity = activityDetails?.subActivities.find(
            (sa) => sa.id === subActivityId
          );
          // Use maxQuantityPerRegistration for per-registration limit (null/undefined means unlimited)
          const maxQty = subActivity?.maxQuantityPerRegistration;
          const newQty = Math.max(0, maxQty != null ? Math.min(maxQty, q.quantity + delta) : q.quantity + delta);
          return { ...q, quantity: newQty };
        }
        return q;
      })
    );
  };

  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      // For activities with sub-activities, calculate items
      let items: { subActivityId: number; quantity: number; pricePerUnit: string }[] = [];
      
      if (hasSubActivities) {
        items = quantities
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
      }

      // Convert total price from euros to cents for storage
      const totalAmountInCents = Math.round(totalPrice * 100);
      
      // For sub-activities, pricePerUnit is already in cents from the database
      const itemsWithSubtotal = items.map(item => {
        const pricePerUnitCents = Number(item.pricePerUnit); // Already in cents
        return {
          subActivityId: item.subActivityId,
          quantity: item.quantity,
          pricePerUnit: pricePerUnitCents,
          subtotal: pricePerUnitCents * item.quantity
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
          personCount: hasSubActivities ? 1 : personCount, // For direct pricing activities
          totalAmount: totalAmountInCents,
          items: itemsWithSubtotal, // Will be empty for simple activities with direct pricing
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Inschrijving mislukt");
      }
      const registration = await res.json();

      // For free registrations (€0), confirm directly without payment
      if (totalPrice === 0) {
        const confirmRes = await fetch("/api/vk/confirm-free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationId: registration.id }),
          credentials: "include",
        });
        if (!confirmRes.ok) {
          const error = await confirmRes.json();
          throw new Error(error.message || "Bevestiging mislukt");
        }
        return { ...registration, isFree: true };
      }

      // For paid registrations, redirect to Stripe checkout
      const checkoutRes = await fetch("/api/vk/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: registration.id }),
        credentials: "include",
      });
      if (!checkoutRes.ok) {
        const error = await checkoutRes.json();
        throw new Error(error.message || "Betaling starten mislukt");
      }
      const checkout = await checkoutRes.json();
      
      // Redirect to Stripe
      if (checkout.url) {
        window.location.href = checkout.url;
      }
      
      return { ...registration, isFree: false, checkoutUrl: checkout.url };
    },
    onSuccess: (data) => {
      // Only show success screen for free registrations
      // Paid registrations are redirected to Stripe
      if (data.isFree) {
        setIsSubmitted(true);
      }
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
    // Only require sub-activity selection for activities WITH sub-activities
    // For simple activities with direct pricing, skip this validation
    if (hasSubActivities && quantities.every((q) => q.quantity === 0)) {
      toast({
        title: "Selecteer minstens één deelactiviteit",
        variant: "destructive",
      });
      return;
    }
    // For direct pricing activities, ensure a price exists for the selected membership type
    if (!hasSubActivities && hasActivityPricing && totalPrice === 0) {
      const hasValidPrice = activityDetails?.activityPricing?.some(
        ap => ap.membershipTypeId === parseInt(data.membershipTypeId)
      );
      if (!hasValidPrice) {
        toast({
          title: "Geen prijs beschikbaar voor dit lidmaatschapstype",
          variant: "destructive",
        });
        return;
      }
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
            <h2 className="text-2xl font-bold mb-2">Inschrijving bevestigd!</h2>
            <p className="text-muted-foreground mb-4">
              Bedankt voor je inschrijving. Je ontvangt een bevestiging per e-mail.
            </p>
            {totalPrice > 0 && (
              <p className="text-lg font-semibold mb-6">
                Betaald: €{totalPrice.toFixed(2)}
              </p>
            )}
            {totalPrice === 0 && (
              <p className="text-sm text-muted-foreground mb-6">
                Dit was een gratis activiteit - geen betaling nodig.
              </p>
            )}
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
                {/* Show info banner when form is pre-filled from invitation */}
                {isPrefilledFromInvitation && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
                    <Lock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Je gegevens zijn automatisch ingevuld op basis van je uitnodiging. Selecteer hieronder je deelactiviteiten.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Activiteit</Label>
                  {isPrefilledFromInvitation ? (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{invitationData?.activityName}</span>
                      <Lock className="h-3 w-3 text-muted-foreground ml-auto" />
                    </div>
                  ) : (
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
                  )}
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
                        <Label htmlFor="name" className="flex items-center gap-2">
                          Naam *
                          {isPrefilledFromInvitation && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </Label>
                        <Input
                          id="name"
                          placeholder="Volledige naam"
                          readOnly={isPrefilledFromInvitation}
                          className={isPrefilledFromInvitation ? "bg-muted/50 cursor-not-allowed" : ""}
                          {...form.register("name", { required: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          E-mail *
                          {isPrefilledFromInvitation && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@voorbeeld.be"
                          readOnly={isPrefilledFromInvitation}
                          className={isPrefilledFromInvitation ? "bg-muted/50 cursor-not-allowed" : ""}
                          {...form.register("email", { required: true })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Lidmaatschapstype *
                        {isPrefilledFromInvitation && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </Label>
                      {isPrefilledFromInvitation ? (
                        <div className="p-3 bg-muted/50 rounded-md border flex items-center justify-between">
                          <span>{membershipTypes.find(t => t.id === invitationData?.membershipTypeId)?.name || "Onbekend"}</span>
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ) : (
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
                      )}
                    </div>

                    {/* Show sub-activities section for activities with sub-activities */}
                    {hasSubActivities && selectedMembershipTypeId && (
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

                    {/* Show simple pricing info for activities with direct pricing (no sub-activities) */}
                    {!hasSubActivities && hasActivityPricing && selectedMembershipTypeId && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Aantal personen</span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setPersonCount(Math.max(1, personCount - 1))}
                              disabled={personCount <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{personCount}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const max = activityDetails?.maxPersonsPerRegistration;
                                // null means unlimited
                                if (max === null || max === undefined) {
                                  setPersonCount(personCount + 1);
                                } else {
                                  setPersonCount(Math.min(max, personCount + 1));
                                }
                              }}
                              disabled={activityDetails?.maxPersonsPerRegistration !== null && activityDetails?.maxPersonsPerRegistration !== undefined && personCount >= activityDetails.maxPersonsPerRegistration}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="font-medium">Inschrijfbedrag</span>
                          <span className="text-lg font-semibold text-blue-600">
                            €{totalPrice.toFixed(2)}
                          </span>
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
                          {totalPrice === 0 ? "Bezig met bevestigen..." : "Bezig met verwerken..."}
                        </>
                      ) : totalPrice === 0 ? (
                        "Bevestig inschrijving"
                      ) : (
                        "Ga naar betaling"
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
