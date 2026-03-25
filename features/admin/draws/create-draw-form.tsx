"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDrawAction } from "@/features/admin/draws/actions";

const initialState = {
  error: "",
  success: "",
};

function currentMonthValue() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function CreateDrawForm() {
  const [state, formAction, pending] = useActionState(createDrawAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="drawMonth" className="mb-2 block text-sm text-muted">
            Draw Month
          </label>
          <Input id="drawMonth" name="drawMonth" type="month" required defaultValue={currentMonthValue()} mono />
        </div>
        <div>
          <label htmlFor="grossPool" className="mb-2 block text-sm text-muted">
            Gross Pool
          </label>
          <Input id="grossPool" name="grossPool" type="number" min={0} step="0.01" required defaultValue="0" mono />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="logicMode" className="mb-2 block text-sm text-muted">
            Draw Mode
          </label>
          <select
            id="logicMode"
            name="logicMode"
            defaultValue="random"
            className="h-[46px] w-full rounded-2xl bg-[var(--surface-container-high)] px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
          >
            <option value="random">Random</option>
            <option value="weighted">Weighted</option>
          </select>
        </div>
        <div>
          <label htmlFor="weightedSeed" className="mb-2 block text-sm text-muted">
            Weighted Seed (optional)
          </label>
          <Input id="weightedSeed" name="weightedSeed" placeholder="apr-2026-seed" mono />
        </div>
      </div>

      <div>
        <label htmlFor="title" className="mb-2 block text-sm text-muted">
          Draw Title (optional)
        </label>
        <Input id="title" name="title" placeholder="Monthly Draw April 2026" />
      </div>

      {state.error ? <p className="text-sm text-[var(--error)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create Draw"}
        </Button>
      </div>
    </form>
  );
}