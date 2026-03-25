"use client";

import { useActionState } from "react";
import { createDonationAction } from "@/features/donations/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState = { error: "", success: "" };

export function DonationForm({
  charities,
}: {
  charities: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(createDonationAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="donorName" className="mb-2 block text-sm text-muted">
          Your name
        </label>
        <Input id="donorName" name="donorName" required autoComplete="name" />
      </div>

      <div>
        <label htmlFor="donorEmail" className="mb-2 block text-sm text-muted">
          Your email
        </label>
        <Input id="donorEmail" name="donorEmail" type="email" required autoComplete="email" />
      </div>

      <div>
        <label htmlFor="charityId" className="mb-2 block text-sm text-muted">
          Choose a charity
        </label>
        <select
          id="charityId"
          name="charityId"
          required
          className="h-[46px] w-full rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
        >
          <option value="" disabled>
            Select a charity
          </option>
          {charities.map((charity) => (
            <option key={charity.id} value={charity.id}>
              {charity.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="amount" className="mb-2 block text-sm text-muted">
          Donation amount ($)
        </label>
        <Input id="amount" name="amount" type="number" min={1} step="0.01" required mono />
      </div>

      {state?.error ? <p className="text-sm text-[var(--error)]">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Processing..." : "Donate Now"}
      </Button>
    </form>
  );
}
