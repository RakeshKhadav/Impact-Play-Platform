"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { markWinnerPaidAction, reviewWinnerAction } from "@/features/admin/winners/actions";

const initialState = {
  error: "",
  success: "",
};

export function WinnerRowActions({
  winner,
}: {
  winner: {
    id: string;
    verification_status: "pending" | "approved" | "rejected";
    payment_status: "pending" | "paid";
  };
}) {
  const [reviewState, reviewFormAction, reviewPending] = useActionState(reviewWinnerAction, initialState);
  const [paidState, paidFormAction, paidPending] = useActionState(markWinnerPaidAction, initialState);

  return (
    <div className="space-y-2">
      <form action={reviewFormAction} className="grid gap-2 md:grid-cols-[1fr_2fr_auto] md:items-end">
        <input type="hidden" name="winnerId" value={winner.id} />
        <select
          name="decision"
          defaultValue={winner.verification_status === "pending" ? "approved" : winner.verification_status}
          className="h-[42px] rounded-2xl bg-[var(--surface-container-high)] px-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
        >
          <option value="approved">Approve</option>
          <option value="rejected">Reject</option>
        </select>
        <input
          name="notes"
          placeholder="Review notes"
          className="h-[42px] rounded-2xl bg-[var(--surface-container-high)] px-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
        />
        <Button type="submit" variant="secondary" disabled={reviewPending} className="h-[42px] text-xs">
          {reviewPending ? "Saving..." : "Save Review"}
        </Button>
      </form>

      <form action={paidFormAction} className="grid gap-2 md:grid-cols-[2fr_auto] md:items-end">
        <input type="hidden" name="winnerId" value={winner.id} />
        <input
          name="paymentReference"
          placeholder="Payment reference"
          className="h-[42px] rounded-2xl bg-[var(--surface-container-high)] px-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
        />
        <Button
          type="submit"
          disabled={paidPending || winner.payment_status === "paid"}
          className="h-[42px] text-xs"
        >
          {winner.payment_status === "paid" ? "Paid" : paidPending ? "Updating..." : "Mark Paid"}
        </Button>
      </form>

      {reviewState.error ? <p className="text-xs text-[var(--error)]">{reviewState.error}</p> : null}
      {paidState.error ? <p className="text-xs text-[var(--error)]">{paidState.error}</p> : null}
      {reviewState.success ? <p className="text-xs text-[var(--success)]">{reviewState.success}</p> : null}
      {paidState.success ? <p className="text-xs text-[var(--success)]">{paidState.success}</p> : null}
    </div>
  );
}