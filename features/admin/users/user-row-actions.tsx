"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateUserProfileAction } from "@/features/admin/users/actions";
import type { ProfileRole } from "@/lib/supabase/types";

const initialState = {
  error: "",
  success: "",
};

export function UserRowActions({
  userId,
  fullName,
  role,
}: {
  userId: string;
  fullName: string | null;
  role: ProfileRole;
}) {
  const [state, formAction, pending] = useActionState(updateUserProfileAction, initialState);

  return (
    <form action={formAction} className="grid gap-2 md:grid-cols-[2fr_1fr_auto] md:items-end">
      <input type="hidden" name="userId" value={userId} />
      <input
        name="fullName"
        defaultValue={fullName ?? ""}
        placeholder="Full name"
        className="h-[42px] rounded-2xl bg-[var(--surface-container-high)] px-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
      />
      <select
        name="role"
        defaultValue={role}
        className="h-[42px] rounded-2xl bg-[var(--surface-container-high)] px-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
      >
        <option value="subscriber">Subscriber</option>
        <option value="admin">Admin</option>
      </select>
      <Button type="submit" variant="secondary" disabled={pending} className="h-[42px] text-xs">
        {pending ? "Saving..." : "Save"}
      </Button>

      {state.error ? <p className="md:col-span-3 text-xs text-[var(--error)]">{state.error}</p> : null}
      {state.success ? <p className="md:col-span-3 text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}