"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { deleteScoreAdminAction, updateScoreAdminAction } from "@/features/admin/scores/actions";

const initialState = {
  error: "",
  success: "",
};

export function ScoreRowActions({ scoreId, score, scoreDate }: { scoreId: string; score: number; scoreDate: string }) {
  const [updateState, updateFormAction, updatePending] = useActionState(updateScoreAdminAction, initialState);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteScoreAdminAction, initialState);

  return (
    <div className="space-y-2">
      <form action={updateFormAction} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <input type="hidden" name="scoreId" value={scoreId} />
        <input
          name="score"
          type="number"
          min={1}
          max={45}
          defaultValue={score}
          className="h-[42px] rounded-2xl bg-[var(--surface-container-high)] px-3 font-data text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
        />
        <input
          name="scoreDate"
          type="date"
          defaultValue={scoreDate}
          className="h-[42px] rounded-2xl bg-[var(--surface-container-high)] px-3 font-data text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
        />
        <Button type="submit" variant="secondary" disabled={updatePending} className="h-[42px] text-xs">
          {updatePending ? "Saving..." : "Update"}
        </Button>
      </form>

      <form action={deleteFormAction}>
        <input type="hidden" name="scoreId" value={scoreId} />
        <Button type="submit" variant="secondary" className="h-[38px] text-xs text-[var(--error)]" disabled={deletePending}>
          {deletePending ? "Deleting..." : "Delete"}
        </Button>
      </form>

      {updateState.error ? <p className="text-xs text-[var(--error)]">{updateState.error}</p> : null}
      {deleteState.error ? <p className="text-xs text-[var(--error)]">{deleteState.error}</p> : null}
      {updateState.success ? <p className="text-xs text-[var(--success)]">{updateState.success}</p> : null}
      {deleteState.success ? <p className="text-xs text-[var(--success)]">{deleteState.success}</p> : null}
    </div>
  );
}