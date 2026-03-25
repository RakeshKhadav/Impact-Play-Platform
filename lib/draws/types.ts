export type DrawLogicMode = "random" | "weighted";
export type PrizeTier = "none" | "three_match" | "four_match" | "five_match";

export type DrawTierPools = {
  fiveMatchPool: number;
  fourMatchPool: number;
  threeMatchPool: number;
};

export type DrawParticipantInput = {
  userId: string;
  scoreSet: number[];
  charityId?: string | null;
};

export type DrawParticipantResult = {
  userId: string;
  scoreSet: number[];
  matchCount: number;
  prizeTier: PrizeTier;
  prizeAmount: number;
  charityId: string | null;
};

export type DrawEvaluationInput = {
  logicMode: DrawLogicMode;
  seed?: string | null;
  winnerPool: number;
  fiveMatchRolloverIn: number;
  participants: DrawParticipantInput[];
  forcedDrawNumbers?: number[];
};

export type DrawEvaluationResult = {
  drawNumbers: number[];
  tierPools: DrawTierPools;
  rolloverOut: number;
  prizePerTier: {
    fiveMatch: number;
    fourMatch: number;
    threeMatch: number;
  };
  winnerCounts: {
    fiveMatch: number;
    fourMatch: number;
    threeMatch: number;
  };
  participantResults: DrawParticipantResult[];
  simulatedWinnerUserId: string | null;
};
