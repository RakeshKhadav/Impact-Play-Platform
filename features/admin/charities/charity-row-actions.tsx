"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { deleteCharityAction, updateCharityAction } from "@/features/admin/charities/actions";

const initialState = {
  error: "",
  success: "",
};

const TAG_OPTIONS = [
  "education",
  "health",
  "environment",
  "sports",
  "youth",
  "community",
  "disability",
  "veterans",
  "mental-health",
  "hunger",
  "housing",
  "arts",
] as const;

export function CharityRowActions({
  charity,
}: {
  charity: {
    id: string;
    name: string;
    description: string | null;
    tags: string[] | null;
    featured: boolean;
    is_published: boolean;
    is_active: boolean;
  };
}) {
  const [updateState, updateFormAction, updatePending] = useActionState(updateCharityAction, initialState);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteCharityAction, initialState);

  const currentTags = charity.tags ?? [];

  return (
    <div className="space-y-2">
      <form action={updateFormAction} className="grid gap-2 md:grid-cols-2">
        <input type="hidden" name="charityId" value={charity.id} />

        <input
          name="name"
          defaultValue={charity.name}
          placeholder="Name"
          className="h-[42px] rounded-2xl bg-[var(--surface-container-high)] px-3 text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
        />

        <div className="flex items-center gap-1">
          <input
            name="logoFile"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="text-xs text-on-surface"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-1">
          <input
            name="coverFile"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="text-xs text-on-surface"
          />
          <span className="text-xs text-muted">Cover image</span>
        </div>

        <textarea
          name="description"
          defaultValue={charity.description ?? ""}
          rows={3}
          placeholder="Description"
          className="rounded-2xl bg-[var(--surface-container-high)] px-3 py-2 text-xs text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)] md:col-span-2"
        />

        <div className="md:col-span-2">
          <p className="mb-1 text-xs text-muted">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map((tag) => (
              <label
                key={tag}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--surface-container-high)] px-2.5 py-1.5 text-[11px] text-on-surface transition hover:bg-[var(--surface-container-highest)]"
              >
                <input
                  type="checkbox"
                  name="tags"
                  value={tag}
                  defaultChecked={currentTags.includes(tag)}
                  className="h-3 w-3 accent-[var(--primary)]"
                />
                {tag}
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" disabled={updatePending} className="text-xs">
            {updatePending ? "Saving..." : "Save Charity"}
          </Button>
        </div>
      </form>

      <form action={deleteFormAction}>
        <input type="hidden" name="charityId" value={charity.id} />
        <Button type="submit" variant="secondary" className="text-xs text-[var(--error)]" disabled={deletePending}>
          {deletePending ? "Deleting..." : "Delete Charity"}
        </Button>
      </form>

      {updateState.error ? <p className="text-xs text-[var(--error)]">{updateState.error}</p> : null}
      {deleteState.error ? <p className="text-xs text-[var(--error)]">{deleteState.error}</p> : null}
      {updateState.success ? <p className="text-xs text-[var(--success)]">{updateState.success}</p> : null}
      {deleteState.success ? <p className="text-xs text-[var(--success)]">{deleteState.success}</p> : null}
    </div>
  );
}