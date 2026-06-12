"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Props = {
  name: string;
  email: string;
  onSuccess: (data: { customerId: string; paymentMethodId: string }) => void;
  onSkip: () => void;
};

export default function PaymentStep(props: Props) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret]   = useState<string | null>(null);
  const [customerId, setCustomerId]       = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    fetch("/api/settings/public")
      .then(r => r.json())
      .then(({ stripePublishableKey }) => {
        const key = stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!key || key === "pk_test_...") { setLoading(false); return; }
        setStripePromise(loadStripe(key));

        return fetch("/api/stripe/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: props.name, email: props.email }),
        }).then(r => r.json());
      })
      .then((data) => {
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
          setCustomerId(data.customerId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.name, props.email]);

  if (!stripePromise) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 text-sm text-yellow-300 space-y-2">
        <p className="font-semibold">Stripe not configured</p>
        <p className="text-yellow-400/80">
          Add your Stripe keys in <strong>Settings → Stripe</strong> to enable card collection. The member will be enrolled and payment can be collected separately.
        </p>
        <button onClick={props.onSkip} className="mt-3 px-4 py-2 rounded-lg bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-200 font-medium transition">
          Continue without payment →
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        Setting up payment…
      </div>
    );
  }

  if (!clientSecret || !customerId) {
    return <p className="text-red-400 text-sm">Failed to initialize payment. Please try again or skip.</p>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#3b82f6" } } }}
    >
      <PaymentForm customerId={customerId} onSuccess={props.onSuccess} onSkip={props.onSkip} />
    </Elements>
  );
}

function PaymentForm({
  customerId,
  onSuccess,
  onSkip,
}: {
  customerId: string;
  onSuccess: (data: { customerId: string; paymentMethodId: string }) => void;
  onSkip: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { setupIntent, error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${window.location.origin}/enroll` },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Card error");
      setLoading(false);
      return;
    }

    if (setupIntent?.status === "succeeded") {
      const pmId = typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id ?? "";
      onSuccess({ customerId, paymentMethodId: pmId });
    }

    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">{error}</p>}
      <div className="flex justify-between items-center pt-1">
        <button onClick={onSkip} className="text-sm text-gray-500 hover:text-gray-300 transition">
          Skip — collect payment later
        </button>
        <button
          onClick={confirm}
          disabled={!stripe || loading}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition"
        >
          {loading ? "Confirming…" : "Save Card →"}
        </button>
      </div>
    </div>
  );
}
