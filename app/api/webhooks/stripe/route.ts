import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Stripe webhook is deprecated for this project. Use /api/webhooks/lemonsqueezy.",
    },
    { status: 410 },
  );
}
