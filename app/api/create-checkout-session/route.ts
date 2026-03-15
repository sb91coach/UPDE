import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Create a Stripe Checkout session for subscription (Pro / Elite).
 * Requires STRIPE_SECRET_KEY and NEXT_PUBLIC_APP_URL.
 */
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const stripe = new Stripe(secret, { apiVersion: "2026-02-25.clover" });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let body: { priceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { priceId } = body;
  if (!priceId || typeof priceId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid priceId" },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/profile?upgraded=true`,
      cancel_url: `${baseUrl}/upgrade`,
      customer_email: user.email ?? undefined,
      metadata: { userId: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
