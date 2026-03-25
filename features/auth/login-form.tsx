"use client";

import { useActionState } from "react";
import { loginAction } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState = { error: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
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
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>

      {state?.error ? <p className="text-sm text-[var(--error)]">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
