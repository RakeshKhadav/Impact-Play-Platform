"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAdminAction } from "@/lib/auth/guards";
import { buildDeterministicSeed, evaluateTieredDraw } from "@/lib/draws/engine";
import type { DrawLogicMode } from "@/lib/draws/types";
import type { Json } from "@/lib/supabase/types";

type DrawActionState = {
  error: string;
  success: string;
};

const createDrawSchema = z.object({
  drawMonth: z.string().regex(/^\d{4}-\d{2}$/),
  grossPool: z.coerce.number().min(0),
  title: z.string().trim().max(120).optional(),
  logicMode: z.enum(["random", "weighted"]).default("random"),
  weightedSeed: z.string().trim().max(120).optional(),
});

const updateDrawConfigSchema = z.object({
  drawId: z.string().uuid(),
  logicMode: z.enum(["random", "weighted"]),
  weightedSeed: z.string().trim().max(120).optional(),
});

const drawIdSchema = z.object({
  drawId: z.string().uuid(),
});

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toMonthStart(drawMonth: string) {
  return `${drawMonth}-01`;
}

function toEntryCutoff(drawMonthStart: string) {
  const [year, month] = drawMonthStart.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
}

function defaultDrawTitle(drawMonth: string) {
  const [year, month] = drawMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return `Monthly Draw ${date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`;
}

function canEnterBySubscriptionAtCutoff(status: string, currentPeriodEnd: string | null, entryCutoffAt: string) {
  const cutoff = new Date(entryCutoffAt).getTime();

  if (status === "active") {
    return !currentPeriodEnd || new Date(currentPeriodEnd).getTime() >= cutoff;
  }

  if (status === "cancelled" && currentPeriodEnd) {
    return new Date(currentPeriodEnd).getTime() >= cutoff;
  }

  return false;
}

function toObject(value: Json | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, Json | undefined>;
  }

  return value as Record<string, Json | undefined>;
}

function toScoreDate(cutoffIso: string) {
  return cutoffIso.slice(0, 10);
}

export async function createDrawAction(_prevState: DrawActionState, formData: FormData): Promise<DrawActionState> {
  const parsed = createDrawSchema.safeParse({
    drawMonth: formData.get("drawMonth"),
    grossPool: formData.get("grossPool"),
    title: (formData.get("title") as string | null)?.trim() || undefined,
    logicMode: formData.get("logicMode") || "random",
    weightedSeed: (formData.get("weightedSeed") as string | null)?.trim() || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Provide a valid month and gross pool.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const drawMonthStart = toMonthStart(parsed.data.drawMonth);

      const { data: existing, error: existingError } = await supabase
        .from("draws")
        .select("id")
        .eq("draw_month", drawMonthStart)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message);
      }

      if (existing) {
        throw new Error("A draw for this month already exists.");
      }

      const { data: previousPublished, error: previousError } = await supabase
        .from("draws")
        .select("five_match_rollover_out, rollover_to_next")
        .eq("status", "published")
        .lt("draw_month", drawMonthStart)
        .order("draw_month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousError) {
        throw new Error(previousError.message);
      }

      const rolloverFromPrevious = roundMoney(
        toNumber(previousPublished?.five_match_rollover_out ?? previousPublished?.rollover_to_next),
      );

      const grossPool = roundMoney(toNumber(parsed.data.grossPool));
      const operationsPool = roundMoney(grossPool * 0.1);
      const charityPool = roundMoney(grossPool * 0.2);
      const winnerPool = roundMoney(grossPool * 0.7);

      const fiveMatchPool = roundMoney(winnerPool * 0.4 + rolloverFromPrevious);
      const fourMatchPool = roundMoney(winnerPool * 0.35);
      const threeMatchPool = roundMoney(winnerPool * 0.25);

      const { error: insertError } = await supabase.from("draws").insert({
        draw_month: drawMonthStart,
        title: parsed.data.title ?? defaultDrawTitle(parsed.data.drawMonth),
        status: "draft",
        engine_version: 2,
        logic_mode: parsed.data.logicMode,
        weighted_seed: parsed.data.logicMode === "weighted" ? parsed.data.weightedSeed ?? null : null,
        entry_cutoff_at: toEntryCutoff(drawMonthStart),
        gross_pool: grossPool,
        operations_pool: operationsPool,
        charity_pool: charityPool,
        winner_pool: winnerPool,
        five_match_pool: fiveMatchPool,
        four_match_pool: fourMatchPool,
        three_match_pool: threeMatchPool,
        five_match_rollover_in: rolloverFromPrevious,
        five_match_rollover_out: 0,
        rollover_from_previous: rolloverFromPrevious,
        rollover_to_next: 0,
        eligible_count: 0,
        active_subscriber_count_snapshot: 0,
        metadata: {
          engine_version: 2,
          legacy: false,
        },
      });

      if (insertError) {
        throw new Error(insertError.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create draw.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/draws");
  revalidatePath("/dashboard");

  return {
    error: "",
    success: "Draw created successfully.",
  };
}

export async function updateDrawConfigAction(
  _prevState: DrawActionState,
  formData: FormData,
): Promise<DrawActionState> {
  const parsed = updateDrawConfigSchema.safeParse({
    drawId: formData.get("drawId"),
    logicMode: formData.get("logicMode"),
    weightedSeed: (formData.get("weightedSeed") as string | null)?.trim() || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Invalid draw configuration.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const { data: draw, error: drawError } = await supabase
        .from("draws")
        .select("id, status")
        .eq("id", parsed.data.drawId)
        .maybeSingle();

      if (drawError || !draw) {
        throw new Error(drawError?.message ?? "Draw not found.");
      }

      if (draw.status === "published") {
        throw new Error("Published draw configuration cannot be changed.");
      }

      const { error: updateError } = await supabase
        .from("draws")
        .update({
          logic_mode: parsed.data.logicMode,
          weighted_seed: parsed.data.logicMode === "weighted" ? parsed.data.weightedSeed ?? null : null,
        })
        .eq("id", parsed.data.drawId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update draw configuration.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/draws");

  return {
    error: "",
    success: "Draw configuration updated.",
  };
}

export async function simulateDrawAction(_prevState: DrawActionState, formData: FormData): Promise<DrawActionState> {
  const parsed = drawIdSchema.safeParse({
    drawId: formData.get("drawId"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid draw id.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const { data: draw, error: drawError } = await supabase
        .from("draws")
        .select(
          "id, draw_month, status, engine_version, entry_cutoff_at, winner_pool, five_match_rollover_in, logic_mode, weighted_seed, metadata",
        )
        .eq("id", parsed.data.drawId)
        .maybeSingle();

      if (drawError || !draw) {
        throw new Error(drawError?.message ?? "Draw not found.");
      }

      if (draw.status === "published") {
        throw new Error("Published draws cannot be simulated again.");
      }

      const { data: subscriptions, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("user_id, status, current_period_end, created_at")
        .order("created_at", { ascending: false });

      if (subscriptionError) {
        throw new Error(subscriptionError.message);
      }

      const latestByUser = new Map<string, { status: string; current_period_end: string | null }>();
      for (const subscription of subscriptions ?? []) {
        if (!latestByUser.has(subscription.user_id)) {
          latestByUser.set(subscription.user_id, {
            status: subscription.status,
            current_period_end: subscription.current_period_end,
          });
        }
      }

      const activeSubscriberIds = Array.from(latestByUser.entries())
        .filter(([, value]) => canEnterBySubscriptionAtCutoff(value.status, value.current_period_end, draw.entry_cutoff_at))
        .map(([userId]) => userId);

      const scoreDateCutoff = toScoreDate(draw.entry_cutoff_at);

      const { data: scores, error: scoreError } = activeSubscriberIds.length
        ? await supabase
            .from("golf_scores")
            .select("user_id, score, score_date, created_at")
            .in("user_id", activeSubscriberIds)
            .lte("score_date", scoreDateCutoff)
            .order("user_id", { ascending: true })
            .order("score_date", { ascending: false })
            .order("created_at", { ascending: false })
        : { data: [], error: null };

      if (scoreError) {
        throw new Error(scoreError.message);
      }

      const scoresByUser = new Map<string, number[]>();

      for (const scoreRow of scores ?? []) {
        const existing = scoresByUser.get(scoreRow.user_id) ?? [];
        if (existing.length < 5) {
          existing.push(scoreRow.score);
          scoresByUser.set(scoreRow.user_id, existing);
        }
      }

      const validParticipantIds = activeSubscriberIds.filter((userId) => (scoresByUser.get(userId) ?? []).length === 5);

      const { data: participantProfiles, error: profileError } = validParticipantIds.length
        ? await supabase.from("profiles").select("id, charity_id").in("id", validParticipantIds)
        : { data: [], error: null };

      if (profileError) {
        throw new Error(profileError.message);
      }

      const charityByUser = new Map((participantProfiles ?? []).map((profile) => [profile.id, profile.charity_id]));

      const participantInputs = validParticipantIds.map((userId) => ({
        userId,
        scoreSet: scoresByUser.get(userId) ?? [],
        charityId: charityByUser.get(userId) ?? null,
      }));

      const deterministicSeed =
        draw.logic_mode === "weighted"
          ? buildDeterministicSeed(draw.id, draw.draw_month, draw.weighted_seed)
          : undefined;

      const evaluated = evaluateTieredDraw({
        logicMode: draw.logic_mode as DrawLogicMode,
        seed: deterministicSeed,
        winnerPool: toNumber(draw.winner_pool),
        fiveMatchRolloverIn: toNumber(draw.five_match_rollover_in),
        participants: participantInputs,
      });

      const nowIso = new Date().toISOString();

      const { error: deleteWinnersError } = await supabase.from("winners").delete().eq("draw_id", draw.id);
      if (deleteWinnersError) {
        throw new Error(deleteWinnersError.message);
      }

      const { error: deleteParticipantsError } = await supabase.from("draw_participants").delete().eq("draw_id", draw.id);
      if (deleteParticipantsError) {
        throw new Error(deleteParticipantsError.message);
      }

      if (evaluated.participantResults.length > 0) {
        const { error: participantInsertError } = await supabase.from("draw_participants").insert(
          evaluated.participantResults.map((participant) => ({
            draw_id: draw.id,
            user_id: participant.userId,
            score_set: participant.scoreSet,
            match_count: participant.matchCount,
            prize_tier: participant.prizeTier,
            prize_amount: participant.prizeAmount,
            is_eligible: true,
            metadata: {
              draw_logic_mode: draw.logic_mode,
              seed: deterministicSeed ?? null,
            },
          })),
        );

        if (participantInsertError) {
          throw new Error(participantInsertError.message);
        }
      }

      const metadata = toObject(draw.metadata);

      const { error: updateError } = await supabase
        .from("draws")
        .update({
          status: "simulated",
          engine_version: 2,
          simulated_at: nowIso,
          simulated_winner_user_id: evaluated.simulatedWinnerUserId,
          eligible_count: evaluated.participantResults.length,
          active_subscriber_count_snapshot: activeSubscriberIds.length,
          draw_numbers: evaluated.drawNumbers,
          five_match_pool: evaluated.tierPools.fiveMatchPool,
          four_match_pool: evaluated.tierPools.fourMatchPool,
          three_match_pool: evaluated.tierPools.threeMatchPool,
          five_match_rollover_out: evaluated.rolloverOut,
          rollover_to_next: evaluated.rolloverOut,
          weighted_seed: deterministicSeed ?? draw.weighted_seed,
          metadata: {
            ...metadata,
            engine_version: 2,
            simulation: {
              mode: draw.logic_mode,
              seed: deterministicSeed ?? null,
              active_subscriber_count: activeSubscriberIds.length,
              eligible_count: evaluated.participantResults.length,
              winner_counts: evaluated.winnerCounts,
              draw_numbers: evaluated.drawNumbers,
              at: nowIso,
            },
          },
          calculation_metadata: {
            winner_counts: evaluated.winnerCounts,
            prize_per_tier: evaluated.prizePerTier,
            tier_pools: evaluated.tierPools,
            rollover_out: evaluated.rolloverOut,
          },
        })
        .eq("id", draw.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to simulate draw.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/draws");

  return {
    error: "",
    success: "Draw simulated successfully.",
  };
}

export async function publishDrawAction(_prevState: DrawActionState, formData: FormData): Promise<DrawActionState> {
  const parsed = drawIdSchema.safeParse({
    drawId: formData.get("drawId"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid draw id.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const { data: draw, error: drawError } = await supabase
        .from("draws")
        .select("id, status, five_match_rollover_out")
        .eq("id", parsed.data.drawId)
        .maybeSingle();

      if (drawError || !draw) {
        throw new Error(drawError?.message ?? "Draw not found.");
      }

      if (draw.status === "published") {
        return;
      }

      if (draw.status === "draft") {
        throw new Error("Simulate the draw before publishing.");
      }

      const { data: participants, error: participantsError } = await supabase
        .from("draw_participants")
        .select("id, user_id, match_count, prize_tier, prize_amount")
        .eq("draw_id", draw.id)
        .gt("prize_amount", 0)
        .neq("prize_tier", "none")
        .order("prize_amount", { ascending: false })
        .order("match_count", { ascending: false });

      if (participantsError) {
        throw new Error(participantsError.message);
      }

      const userIds = Array.from(new Set((participants ?? []).map((participant) => participant.user_id)));
      const { data: profiles, error: profileError } = userIds.length
        ? await supabase.from("profiles").select("id, charity_id").in("id", userIds)
        : { data: [], error: null };

      if (profileError) {
        throw new Error(profileError.message);
      }

      const charityByUser = new Map((profiles ?? []).map((profile) => [profile.id, profile.charity_id]));

      const { error: deleteWinnersError } = await supabase.from("winners").delete().eq("draw_id", draw.id);
      if (deleteWinnersError) {
        throw new Error(deleteWinnersError.message);
      }

      if ((participants ?? []).length > 0) {
        const { error: insertWinnerError } = await supabase.from("winners").insert(
          (participants ?? []).map((participant, index) => ({
            draw_id: draw.id,
            participant_id: participant.id,
            user_id: participant.user_id,
            rank: index + 1,
            match_count: participant.match_count,
            prize_tier: participant.prize_tier,
            prize_amount: participant.prize_amount,
            charity_id: charityByUser.get(participant.user_id) ?? null,
            verification_status: "pending" as const,
            payment_status: "pending" as const,
            engine_version: 2,
            metadata: {
              source: "draw_engine_v2",
            },
          })),
        );

        if (insertWinnerError) {
          throw new Error(insertWinnerError.message);
        }
      }

      const { error: updateDrawError } = await supabase
        .from("draws")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          rollover_to_next: toNumber(draw.five_match_rollover_out),
        })
        .eq("id", draw.id);

      if (updateDrawError) {
        throw new Error(updateDrawError.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to publish draw.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/draws");
  revalidatePath("/dashboard");

  return {
    error: "",
    success: "Draw published successfully.",
  };
}

export async function deleteDrawAction(_prevState: DrawActionState, formData: FormData): Promise<DrawActionState> {
  const parsed = drawIdSchema.safeParse({
    drawId: formData.get("drawId"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid draw id.",
      success: "",
    };
  }

  try {
    await withAdminAction(async ({ supabase }) => {
      const { data: draw, error: drawError } = await supabase
        .from("draws")
        .select("id, status")
        .eq("id", parsed.data.drawId)
        .maybeSingle();

      if (drawError || !draw) {
        throw new Error(drawError?.message ?? "Draw not found.");
      }

      if (draw.status === "published") {
        throw new Error("Published draws cannot be deleted.");
      }

      const { error: deleteError } = await supabase.from("draws").delete().eq("id", parsed.data.drawId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete draw.",
      success: "",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/draws");
  revalidatePath("/dashboard");

  return {
    error: "",
    success: "Draw deleted.",
  };
}
