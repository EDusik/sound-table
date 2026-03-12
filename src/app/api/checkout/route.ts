import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const PRICE_MAP: Record<string, string | undefined> = {
  player: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAYER,
  dungeon_master: process.env.NEXT_PUBLIC_STRIPE_PRICE_DM,
};

/**
 * POST /api/checkout
 * Creates a Stripe Checkout Session and returns the URL for redirect.
 */
export async function POST(request: NextRequest) {
  const secretKey = process.env.NEXT_STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured on the server." },
      { status: 503 },
    );
  }

  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const priceId = body.planId ? PRICE_MAP[body.planId] : undefined;
  if (!priceId) {
    return NextResponse.json(
      { error: `Unknown or unconfigured plan: ${body.planId}` },
      { status: 400 },
    );
  }

  const stripe = new Stripe(secretKey);
  const origin = request.headers.get("origin") ?? request.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success`,
      cancel_url: `${origin}/plans`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe session creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
