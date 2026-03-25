"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type BillingPlanType = "monthly" | "yearly";

type CheckoutApiResponse = {
  checkoutUrl: string;
  planType: BillingPlanType;
};

export function LemonSqueezySubscribeButton({ planType, label }: { planType: BillingPlanType; label: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ planType }),
      });

      const payload = (await response.json()) as CheckoutApiResponse | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Failed to initialize checkout.");
        setPending(false);
        return;
      }

      window.location.href = payload.checkoutUrl;
    } catch {
      setError("Failed to initialize Lemon Squeezy checkout.");
      setPending(false);
    }
  };

  return (
    <div>
      <Button type="button" onClick={onClick} disabled={pending}>
        {pending ? "Redirecting..." : label}
      </Button>
      {error ? <p className="mt-2 text-xs text-[var(--error)]">{error}</p> : null}
    </div>
  );
}
