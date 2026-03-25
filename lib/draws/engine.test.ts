import assert from "node:assert/strict";
import test from "node:test";
import { buildDeterministicSeed, evaluateTieredDraw } from "./engine.ts";

test("random mode generates 5 unique numbers within 1-45", () => {
  const result = evaluateTieredDraw({
    logicMode: "random",
    winnerPool: 100,
    fiveMatchRolloverIn: 0,
    participants: [],
  });

  assert.equal(result.drawNumbers.length, 5);
  assert.equal(new Set(result.drawNumbers).size, 5);
  assert.ok(result.drawNumbers.every((value) => value >= 1 && value <= 45));
});

test("weighted mode is deterministic with a fixed seed", () => {
  const input = {
    logicMode: "weighted" as const,
    seed: "deterministic-seed",
    winnerPool: 100,
    fiveMatchRolloverIn: 0,
    participants: [
      { userId: "u1", scoreSet: [1, 2, 3, 4, 5] },
      { userId: "u2", scoreSet: [1, 2, 3, 4, 5] },
      { userId: "u3", scoreSet: [1, 2, 3, 4, 5] },
    ],
  };

  const first = evaluateTieredDraw(input);
  const second = evaluateTieredDraw(input);

  assert.deepEqual(first.drawNumbers, second.drawNumbers);
});

test("tiered split and payout amounts follow PRD percentages", () => {
  const result = evaluateTieredDraw({
    logicMode: "random",
    winnerPool: 100,
    fiveMatchRolloverIn: 10,
    forcedDrawNumbers: [1, 2, 3, 4, 5],
    participants: [
      { userId: "u1", scoreSet: [1, 2, 3, 4, 5] },
      { userId: "u2", scoreSet: [1, 2, 3, 4, 6] },
      { userId: "u3", scoreSet: [1, 2, 3, 7, 8] },
      { userId: "u4", scoreSet: [9, 10, 11, 12, 13] },
    ],
  });

  const byUser = new Map(result.participantResults.map((row) => [row.userId, row]));

  assert.equal(result.tierPools.fiveMatchPool, 50);
  assert.equal(result.tierPools.fourMatchPool, 35);
  assert.equal(result.tierPools.threeMatchPool, 25);

  assert.equal(byUser.get("u1")?.prizeTier, "five_match");
  assert.equal(byUser.get("u1")?.prizeAmount, 50);
  assert.equal(byUser.get("u2")?.prizeTier, "four_match");
  assert.equal(byUser.get("u2")?.prizeAmount, 35);
  assert.equal(byUser.get("u3")?.prizeTier, "three_match");
  assert.equal(byUser.get("u3")?.prizeAmount, 25);
  assert.equal(byUser.get("u4")?.prizeTier, "none");

  assert.equal(result.rolloverOut, 0);
});

test("five-match rollover is carried when there are no five-match winners", () => {
  const result = evaluateTieredDraw({
    logicMode: "random",
    winnerPool: 200,
    fiveMatchRolloverIn: 40,
    forcedDrawNumbers: [1, 2, 3, 4, 5],
    participants: [
      { userId: "u1", scoreSet: [1, 2, 3, 4, 6] },
      { userId: "u2", scoreSet: [1, 2, 3, 7, 8] },
    ],
  });

  assert.equal(result.tierPools.fiveMatchPool, 120);
  assert.equal(result.rolloverOut, 120);
});

test("buildDeterministicSeed uses provided value and falls back predictably", () => {
  assert.equal(buildDeterministicSeed("draw-id", "2026-04-01", "custom"), "custom");
  assert.equal(buildDeterministicSeed("draw-id", "2026-04-01", ""), "draw-id:2026-04-01");
});



