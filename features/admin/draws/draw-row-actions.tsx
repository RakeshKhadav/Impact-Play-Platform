"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  deleteDrawAction,
  publishDrawAction,
  simulateDrawAction,
  updateDrawConfigAction,
} from "@/features/admin/draws/actions";
import type { DrawLogicMode, DrawStatus } from "@/lib/supabase/types";

const initialState = {
  error: "",
  success: "",
};

export function DrawRowActions({
  drawId,
  status,
  logicMode,
  weightedSeed,
}: {
  drawId: string;
  status: DrawStatus;
  logicMode: DrawLogicMode;
  weightedSeed: string | null;
}) {
  const [configState, configFormAction, configPending] = useActionState(updateDrawConfigAction, initialState);
  const [simulateState, simulateFormAction, simulatePending] = useActionState(simulateDrawAction, initialState);
  const [publishState, publishFormAction, publishPending] = useActionState(publishDrawAction, initialState);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteDrawAction, initialState);

  const busy = configPending || simulatePending || publishPending || deletePending;
  const canConfigure = status !== "published";
  const canSimulate = status !== "published";
  const canPublish = status === "simulated";

  return (
    <div className="space-y-2">
      <form action={configFormAction} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <input type="hidden" name="drawId" value={drawId} />
        <div>
          <label className="mb-1 block text-xs text-muted">Mode</label>
          <select
            name="logicMode"
            defaultValue={logicMode}
            disabled={!canConfigure || busy}
            className="h-[42px] w-full rounded-2xl bg-[var(--surface-container-high)] px-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
          >
            <option value="random">Random</option>
            <option value="weighted">Weighted</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Seed</label>
          <input
            name="weightedSeed"
            defaultValue={weightedSeed ?? ""}
            disabled={!canConfigure || busy}
            className="h-[42px] w-full rounded-2xl bg-[var(--surface-container-high)] px-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
            placeholder="optional"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!canConfigure || busy} className="h-[42px] text-xs">
          {configPending ? "Saving..." : "Save"}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <form action={simulateFormAction}>
          <input type="hidden" name="drawId" value={drawId} />
          <Button type="submit" variant="secondary" disabled={!canSimulate || busy}>
            {simulatePending ? "Simulating..." : "Simulate"}
          </Button>
        </form>

        <form action={publishFormAction}>
          <input type="hidden" name="drawId" value={drawId} />
          <Button type="submit" disabled={!canPublish || busy}>
            {publishPending ? "Publishing..." : "Publish"}
          </Button>
        </form>

        <form action={deleteFormAction}>
          <input type="hidden" name="drawId" value={drawId} />
          <Button type="submit" variant="secondary" className="text-[var(--error)]" disabled={busy || status === "published"}>
            {deletePending ? "Deleting..." : "Delete"}
          </Button>
        </form>
      </div>

      {configState.error ? <p className="text-xs text-[var(--error)]">{configState.error}</p> : null}
      {simulateState.error ? <p className="text-xs text-[var(--error)]">{simulateState.error}</p> : null}
      {publishState.error ? <p className="text-xs text-[var(--error)]">{publishState.error}</p> : null}
      {deleteState.error ? <p className="text-xs text-[var(--error)]">{deleteState.error}</p> : null}

      {configState.success ? <p className="text-xs text-[var(--success)]">{configState.success}</p> : null}
      {simulateState.success ? <p className="text-xs text-[var(--success)]">{simulateState.success}</p> : null}
      {publishState.success ? <p className="text-xs text-[var(--success)]">{publishState.success}</p> : null}
      {deleteState.success ? <p className="text-xs text-[var(--success)]">{deleteState.success}</p> : null}
    </div>
  );
}