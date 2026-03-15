import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(secret, { apiVersion: "2026-02-25.clover" });
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key);
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (userId) {
      const supabase = getSupabase();
      await supabase
        .from("profiles")
        .update({
          subscription_tier: "pro",
          subscription_status: "active",
          stripe_customer_id: (session.customer as string) ?? null,
          stripe_subscription_id: (session.subscription as string) ?? null,
        })
        .eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const supabase = getSupabase();
    await supabase
      .from("profiles")
      .update({
        subscription_tier: "free",
        subscription_status: "inactive",
      })
      .eq("stripe_subscription_id", subscription.id);
  }

  return NextResponse.json({ received: true });
}
