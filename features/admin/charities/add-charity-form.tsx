"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCharityAction } from "@/features/admin/charities/actions";

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

export function AddCharityForm() {
  const [state, formAction, pending] = useActionState(addCharityAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div>
        <label htmlFor="name" className="mb-2 block text-sm text-muted">
          Charity Name
        </label>
        <Input id="name" name="name" required />
      </div>

      <div>
        <label htmlFor="description" className="mb-2 block text-sm text-muted">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="w-full rounded-2xl bg-[var(--surface-container-high)] px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-[var(--secondary)]"
          placeholder="Describe the charity mission and impact"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="logoFile" className="mb-2 block text-sm text-muted">
            Logo Image
          </label>
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--outline-variant)_35%,transparent)] bg-[var(--surface-container-high)] px-4 py-4">
            <input
              id="logoFile"
              name="logoFile"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="block w-full text-sm text-on-surface"
            />
            <p className="mt-2 text-xs text-muted">PNG, JPG, WebP, or SVG.</p>
          </div>
        </div>
        <div>
          <label htmlFor="coverFile" className="mb-2 block text-sm text-muted">
            Cover Image
          </label>
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--outline-variant)_35%,transparent)] bg-[var(--surface-container-high)] px-4 py-4">
            <input
              id="coverFile"
              name="coverFile"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="block w-full text-sm text-on-surface"
            />
            <p className="mt-2 text-xs text-muted">PNG, JPG, WebP, or SVG.</p>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-muted">Tags</label>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((tag) => (
            <label
              key={tag}
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--surface-container-high)] px-3 py-2 text-xs text-on-surface transition hover:bg-[var(--surface-container-highest)]"
            >
              <input type="checkbox" name="tags" value={tag} className="h-3.5 w-3.5 accent-[var(--primary)]" />
              {tag}
            </label>
          ))}
        </div>
      </div>

      {state.error ? <p className="text-sm text-[var(--error)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding charity..." : "Add Charity"}
        </Button>
      </div>
    </form>
  );
}