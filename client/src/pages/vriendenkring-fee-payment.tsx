import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, CreditCard, XCircle, UserX } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface PaymentInfo {
  status: string;
  memberName: string;
  memberEmail: string;
  cycleLabel: string;
  cycleYear: number;
  baseAmount: number;
  penaltyAmount: number;
  amountDue: number;
  penaltyApplied: boolean;
  dueDate: string;
  isOverdue: boolean;
  paidAt?: string;
}

interface PaymentIntentResponse {
  clientSecret: string;
  publishableKey: string;
  amount: number;
}

function PaymentForm({ amount }: { amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "Er is een fout opgetreden bij de betaling.");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      setPaymentSuccess(true);
    } else {
      setIsProcessing(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-green-700 mb-2">Betaling geslaagd!</h2>
        <p className="text-gray-600">
          Bedankt voor je betaling. Je ontvangt een bevestiging per e-mail.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {errorMessage}
        </div>
      )}
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Bezig met verwerken...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Betaal €{(amount / 100).toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

export default function VriendenkringFeePayment() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";
  const queryClient = useQueryClient();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [declineSuccess, setDeclineSuccess] = useState(false);

  const { data: paymentInfo, isLoading, error } = useQuery<PaymentInfo>({
    queryKey: ["fee-payment-info", token],
    queryFn: async () => {
      const res = await fetch(`/api/vk/membership-fee-payment/${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Fout bij ophalen betalingsgegevens");
      }
      return res.json();
    },
    enabled: !!token,
  });

  const createPaymentIntentMutation = useMutation<PaymentIntentResponse>({
    mutationFn: async () => {
      const res = await fetch(`/api/vk/membership-fee-payment/${token}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Fout bij aanmaken betaling");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setStripePromise(loadStripe(data.publishableKey));
      setClientSecret(data.clientSecret);
    },
  });

  const declineMembershipMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/vk/membership-fee-payment/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Fout bij verwerken van uw keuze");
      }
      return res.json();
    },
    onSuccess: () => {
      setDeclineSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["fee-payment-info", token] });
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectStatus = urlParams.get("redirect_status");
    if (redirectStatus === "succeeded") {
      window.location.search = "";
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Betalingsgegevens laden...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Betaallink niet geldig</h2>
            <p className="text-gray-600">
              {error instanceof Error ? error.message : "Deze betaallink is ongeldig of verlopen."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentInfo.status === "paid") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-700 mb-2">Al betaald!</h2>
            <p className="text-gray-600">
              Dit lidgeld is al betaald op {new Date(paymentInfo.paidAt!).toLocaleDateString("nl-BE")}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentInfo.status === "declined" || declineSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <UserX className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">Geen lid</h2>
            <p className="text-gray-600">
              U heeft aangegeven geen lid te worden van de Vriendenkring. 
              Bedankt voor uw melding.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Mocht u van gedachten veranderen, neem dan contact op met de organisatie.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentInfo.status === "cancelled") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">Uitnodiging geannuleerd</h2>
            <p className="text-gray-600">
              Deze uitnodiging is door de beheerder geannuleerd.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Lidgeld betalen</CardTitle>
            <CardDescription>
              Vriendenkring Brandweer Mol
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Lid:</span>
                <span className="font-medium">{paymentInfo.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Periode:</span>
                <span className="font-medium">{paymentInfo.cycleLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Deadline:</span>
                <span className={`font-medium ${paymentInfo.isOverdue ? 'text-red-600' : ''}`}>
                  {new Date(paymentInfo.dueDate).toLocaleDateString("nl-BE")}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Basisbedrag:</span>
                <span>€{(paymentInfo.baseAmount / 100).toFixed(2)}</span>
              </div>
              {paymentInfo.penaltyApplied && (
                <div className="flex justify-between items-center mb-2 text-red-600">
                  <span>Boete (te laat betaald):</span>
                  <span>+ €{(paymentInfo.penaltyAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>Totaal:</span>
                <span className="text-blue-600">€{(paymentInfo.amountDue / 100).toFixed(2)}</span>
              </div>
            </div>

            {paymentInfo.isOverdue && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Betalingstermijn verstreken</p>
                    <p className="text-sm text-amber-700">
                      Een boete van €{(paymentInfo.penaltyAmount / 100).toFixed(2)} is toegevoegd aan het bedrag.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {clientSecret && stripePromise ? (
              <Elements 
                stripe={stripePromise} 
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                  },
                }}
              >
                <PaymentForm amount={paymentInfo.amountDue} />
              </Elements>
            ) : (
              <div className="space-y-3">
                <Button 
                  onClick={() => createPaymentIntentMutation.mutate()}
                  disabled={createPaymentIntentMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {createPaymentIntentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Laden...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Ga door naar betaling
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">of</span>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="w-full text-gray-600 hover:text-gray-800"
                      size="lg"
                      disabled={declineMembershipMutation.isPending}
                    >
                      {declineMembershipMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Bezig...
                        </>
                      ) : (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          Ik word geen lid
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Geen lid worden?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Weet u zeker dat u geen lid wilt worden van de Vriendenkring? 
                        U zult dan niet kunnen deelnemen aan de activiteiten.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => declineMembershipMutation.mutate()}
                        className="bg-gray-600 hover:bg-gray-700"
                      >
                        Bevestig: geen lid
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
