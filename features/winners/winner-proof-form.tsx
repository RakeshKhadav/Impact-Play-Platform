"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { submitWinnerProofAction } from "@/features/winners/actions";

const initialState = {
  error: "",
  success: "",
};

export function WinnerProofForm({ winnerId }: { winnerId: string }) {
  const [state, formAction, pending] = useActionState(submitWinnerProofAction, initialState);

  return (
    <form action={formAction} className="mt-4 grid gap-3">
      <input type="hidden" name="winnerId" value={winnerId} />

      <label className="block">
        <span className="mb-2 block text-sm text-muted">Upload Proof (PDF)</span>
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--outline-variant)_35%,transparent)] bg-[var(--surface-container-high)] px-4 py-4">
          <input name="proofFile" type="file" accept="application/pdf,.pdf" required className="block w-full text-sm text-on-surface" />
          <p className="mt-2 text-xs text-muted">PDF only. Maximum size: 10MB.</p>
        </div>
      </label>

      {state.error ? <p className="text-xs text-[var(--error)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}

      <div>
        <Button type="submit" disabled={pending} variant="secondary">
          {pending ? "Uploading..." : "Upload PDF"}
        </Button>
      </div>
    </form>
  );
}
