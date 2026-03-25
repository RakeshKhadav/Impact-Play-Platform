import { randomInt } from "crypto";
import type {
  DrawEvaluationInput,
  DrawEvaluationResult,
  DrawLogicMode,
  DrawParticipantInput,
  DrawParticipantResult,
  DrawTierPools,
  PrizeTier,
} from "./types.ts";

const DRAW_SIZE = 5;
const MIN_NUMBER = 1;
const MAX_NUMBER = 45;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toFinite(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeScoreSet(scoreSet: number[]) {
  if (!Array.isArray(scoreSet) || scoreSet.length !== DRAW_SIZE) {
    throw new Error("Each participant must provide exactly 5 scores.");
  }

  const normalized = scoreSet.map((value) => Number(value));

  for (const value of normalized) {
    if (!Number.isInteger(value) || value < MIN_NUMBER || value > MAX_NUMBER) {
      throw new Error("Participant score set values must be integers between 1 and 45.");
    }
  }

  return normalized;
}

function normalizeDrawNumbers(drawNumbers: number[]) {
  if (!Array.isArray(drawNumbers) || drawNumbers.length !== DRAW_SIZE) {
    throw new Error("Draw numbers must contain exactly 5 values.");
  }

  const normalized = drawNumbers.map((value) => Number(value));

  for (const value of normalized) {
    if (!Number.isInteger(value) || value < MIN_NUMBER || value > MAX_NUMBER) {
      throw new Error("Draw numbers must be integers between 1 and 45.");
    }
  }

  if (new Set(normalized).size !== DRAW_SIZE) {
    throw new Error("Draw numbers must be unique.");
  }

  return [...normalized].sort((a, b) => a - b);
}

function computeTierPools(winnerPool: number, rolloverIn: number): DrawTierPools {
  const normalizedWinnerPool = Math.max(0, toFinite(winnerPool));
  const normalizedRolloverIn = Math.max(0, toFinite(rolloverIn));

  const fiveBase = roundMoney(normalizedWinnerPool * 0.4);
  const fourBase = roundMoney(normalizedWinnerPool * 0.35);
  const threeBase = roundMoney(normalizedWinnerPool * 0.25);

  return {
    fiveMatchPool: roundMoney(fiveBase + normalizedRolloverIn),
    fourMatchPool: fourBase,
    threeMatchPool: threeBase,
  };
}

function classifyTier(matchCount: number): PrizeTier {
  if (matchCount >= 5) {
    return "five_match";
  }

  if (matchCount === 4) {
    return "four_match";
  }

  if (matchCount === 3) {
    return "three_match";
  }

  return "none";
}

function countMatches(drawNumbers: number[], scoreSet: number[]) {
  const drawSet = new Set(drawNumbers);
  const participantSet = new Set(scoreSet);

  let count = 0;
  for (const value of participantSet) {
    if (drawSet.has(value)) {
      count += 1;
    }
  }

  return count;
}

function createSeededRng(seed: string) {
  let state = hashSeed(seed);

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;

    return (state >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const normalized = hash >>> 0;
  return normalized === 0 ? 1 : normalized;
}

function generateRandomDrawNumbers() {
  const selected = new Set<number>();

  while (selected.size < DRAW_SIZE) {
    selected.add(randomInt(MIN_NUMBER, MAX_NUMBER + 1));
  }

  return Array.from(selected).sort((a, b) => a - b);
}

function pickWeightedUniqueNumbers(weights: number[], rng: () => number) {
  const chosen = new Set<number>();

  while (chosen.size < DRAW_SIZE) {
    const availableNumbers: number[] = [];
    const availableWeights: number[] = [];

    for (let number = MIN_NUMBER; number <= MAX_NUMBER; number += 1) {
      if (chosen.has(number)) {
        continue;
      }

      availableNumbers.push(number);
      availableWeights.push(Math.max(0, weights[number] ?? 0));
    }

    const totalWeight = availableWeights.reduce((acc, value) => acc + value, 0);

    if (totalWeight <= 0) {
      const fallbackPool = availableNumbers;
      const index = Math.floor(rng() * fallbackPool.length);
      chosen.add(fallbackPool[Math.min(index, fallbackPool.length - 1)]);
      continue;
    }

    let cursor = rng() * totalWeight;

    for (let index = 0; index < availableNumbers.length; index += 1) {
      cursor -= availableWeights[index];

      if (cursor <= 0) {
        chosen.add(availableNumbers[index]);
        break;
      }
    }
  }

  return Array.from(chosen).sort((a, b) => a - b);
}

function generateWeightedDrawNumbers(participants: DrawParticipantInput[], seed: string) {
  const weights = Array.from({ length: MAX_NUMBER + 1 }, () => 0);

  for (const participant of participants) {
    const scoreSet = normalizeScoreSet(participant.scoreSet);

    for (const value of scoreSet) {
      weights[value] += 1;
    }
  }

  return pickWeightedUniqueNumbers(weights, createSeededRng(seed));
}

function assignTierPrize(
  tier: PrizeTier,
  pools: DrawTierPools,
  winnerCounts: DrawEvaluationResult["winnerCounts"],
) {
  if (tier === "five_match") {
    return winnerCounts.fiveMatch > 0 ? roundMoney(pools.fiveMatchPool / winnerCounts.fiveMatch) : 0;
  }

  if (tier === "four_match") {
    return winnerCounts.fourMatch > 0 ? roundMoney(pools.fourMatchPool / winnerCounts.fourMatch) : 0;
  }

  if (tier === "three_match") {
    return winnerCounts.threeMatch > 0 ? roundMoney(pools.threeMatchPool / winnerCounts.threeMatch) : 0;
  }

  return 0;
}

export function evaluateTieredDraw(input: DrawEvaluationInput): DrawEvaluationResult {
  const logicMode: DrawLogicMode = input.logicMode;
  const normalizedParticipants = input.participants.map((participant) => ({
    ...participant,
    scoreSet: normalizeScoreSet(participant.scoreSet),
    charityId: participant.charityId ?? null,
  }));

  const pools = computeTierPools(input.winnerPool, input.fiveMatchRolloverIn);

  const fallbackSeed = `${logicMode}:${input.seed ?? "default"}:${normalizedParticipants.length}`;

  const drawNumbers = input.forcedDrawNumbers
    ? normalizeDrawNumbers(input.forcedDrawNumbers)
    : logicMode === "weighted"
      ? generateWeightedDrawNumbers(normalizedParticipants, input.seed?.trim() || fallbackSeed)
      : generateRandomDrawNumbers();

  const evaluated = normalizedParticipants.map((participant) => {
    const matchCount = countMatches(drawNumbers, participant.scoreSet);
    const prizeTier = classifyTier(matchCount);

    return {
      ...participant,
      matchCount,
      prizeTier,
    };
  });

  const winnerCounts = {
    fiveMatch: evaluated.filter((participant) => participant.prizeTier === "five_match").length,
    fourMatch: evaluated.filter((participant) => participant.prizeTier === "four_match").length,
    threeMatch: evaluated.filter((participant) => participant.prizeTier === "three_match").length,
  };

  const participantResults: DrawParticipantResult[] = evaluated.map((participant) => ({
    userId: participant.userId,
    scoreSet: participant.scoreSet,
    matchCount: participant.matchCount,
    prizeTier: participant.prizeTier,
    prizeAmount: assignTierPrize(participant.prizeTier, pools, winnerCounts),
    charityId: participant.charityId,
  }));

  const rolloverOut = winnerCounts.fiveMatch === 0 ? pools.fiveMatchPool : 0;

  const simulatedWinnerUserId =
    participantResults
      .filter((participant) => participant.prizeAmount > 0)
      .sort((a, b) => b.prizeAmount - a.prizeAmount || b.matchCount - a.matchCount)[0]?.userId ?? null;

  return {
    drawNumbers,
    tierPools: pools,
    rolloverOut,
    prizePerTier: {
      fiveMatch: assignTierPrize("five_match", pools, winnerCounts),
      fourMatch: assignTierPrize("four_match", pools, winnerCounts),
      threeMatch: assignTierPrize("three_match", pools, winnerCounts),
    },
    winnerCounts,
    participantResults,
    simulatedWinnerUserId,
  };
}

export function buildDeterministicSeed(drawId: string, drawMonth: string, providedSeed?: string | null) {
  const trimmed = providedSeed?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : `${drawId}:${drawMonth}`;
}

