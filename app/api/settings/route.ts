import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export type UserPreferences = {
  weight_unit?: "kg" | "lb";
  session_reminders?: boolean;
  weekly_summary_email?: boolean;
  marketing_emails?: boolean;
  product_updates?: boolean;
  sms_notifications?: boolean;
  garmin_connected?: boolean;
  garmin_user_id?: string;
  stripe_customer_id?: string;
};

const DEFAULT_PREFS: UserPreferences = {
  weight_unit: "kg",
  session_reminders: true,
  weekly_summary_email: true,
  marketing_emails: false,
  product_updates: true,
  sms_notifications: false,
  garmin_connected: false,
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const prefs = (data?.user_preferences as UserPreferences) ?? {};
  const merged = { ...DEFAULT_PREFS, ...prefs };
  return NextResponse.json(merged);
}

export async function PATCH(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<UserPreferences>;
  const allowed: (keyof UserPreferences)[] = [
    "weight_unit",
    "session_reminders",
    "weekly_summary_email",
    "marketing_emails",
    "product_updates",
    "sms_notifications",
    "garmin_connected",
    "garmin_user_id",
    "stripe_customer_id",
  ];
  const updates: Partial<UserPreferences> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key] as never;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("id", user.id)
    .maybeSingle();

  const current = (existing?.user_preferences as UserPreferences) ?? {};
  const next = { ...current, ...updates };

  const { error } = await supabase
    .from("profiles")
    .update({ user_preferences: next })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json(next);
}
