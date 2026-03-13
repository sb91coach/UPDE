import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

/**
 * Create a Stripe Customer Billing Portal session and return the URL.
 * Requires STRIPE_SECRET_KEY. If the user has no stripe_customer_id, we create a Stripe
 * customer, save it to user_preferences, then create the portal session.
 */
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Billing portal is not configured. Set STRIPE_SECRET_KEY." },
      { status: 503 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("id", user.id)
    .maybeSingle();

  const prefs = (profile?.user_preferences as Record<string, unknown>) ?? {};
  let customerId = prefs.stripe_customer_id as string | undefined;

  const stripe = await import("stripe");
  const stripeClient = new stripe.default(secret);
  const origin = req.headers.get("origin") ?? req.headers.get("referer")?.replace(/\/$/, "") ?? "";
  const returnUrl = process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL ?? `${origin}/settings`;

  try {
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      const nextPrefs = { ...prefs, stripe_customer_id: customerId };
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ user_preferences: nextPrefs })
        .eq("id", user.id);
      if (updateError) {
        return NextResponse.json(
          { error: "Failed to save billing account. Try again." },
          { status: 500 }
        );
      }
    }

    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
