"use client";

import { useActionState } from "react";
import { signupAction } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState = { error: "" };

export function SignupForm({
  charities,
}: {
  charities: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="mb-2 block text-sm text-muted">
          Full name
        </label>
        <Input id="fullName" name="fullName" required autoComplete="name" />
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm text-muted">
          Email
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm text-muted">
          Password
        </label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" />
      </div>

      {charities.length > 0 ? (
        <div>
          <label htmlFor="charityId" className="mb-2 block text-sm text-muted">
            Support a charity (optional)
          </label>
          <select
            id="charityId"
            name="charityId"
            className="h-[46px] w-full rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
          >
            <option value="">Choose later</option>
            {charities.map((charity) => (
              <option key={charity.id} value={charity.id}>
                {charity.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {state?.error ? <p className="text-sm text-[var(--error)]">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
