# UPDE App — Full Codebase Export

Generated for transfer to another AI tool. Each section is one file.

---

## app/api/behaviour-drift/route.ts

```ts
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { getBehaviourDrift } from "@/engine/behaviourDriftModel";
import type { ComplianceWeek, DebriefSummary } from "@/engine/behaviourDriftModel";

/**
 * GET /api/behaviour-drift — friction index, compliance velocity, engagement, simplification recommendation.
 * Uses session_logs (by week) and session_debriefs.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_week, days_per_week")
    .eq("id", user.id)
    .maybeSingle();

  const currentWeek = profile?.current_week ?? 1;
  const plannedPerWeek = Math.min(5, Math.max(2, profile?.days_per_week ?? 3));

  const { data: sessions } = await supabase
    .from("session_logs")
    .select("week")
    .eq("profile_id", user.id)
    .eq("completed", true)
    .in("week", [currentWeek - 3, currentWeek - 2, currentWeek - 1, currentWeek].filter((w) => w >= 1));

  const weekCounts: Record<number, number> = {};
  for (let w = currentWeek - 3; w <= currentWeek; w++) {
    if (w >= 1) weekCounts[w] = 0;
  }
  sessions?.forEach((r) => {
    if (r.week != null) weekCounts[r.week] = (weekCounts[r.week] ?? 0) + 1;
  });

  const compliance_weeks: ComplianceWeek[] = [currentWeek - 3, currentWeek - 2, currentWeek - 1, currentWeek]
    .filter((w) => w >= 1)
    .map((week) => ({
      week,
      done: weekCounts[week] ?? 0,
      planned: plannedPerWeek,
    }))
    .reverse();

  const { data: debriefs } = await supabase
    .from("session_debriefs")
    .select("how_felt, niggles, ready_next")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const recent_debriefs: DebriefSummary[] = (debriefs ?? []).map((d) => ({
    how_felt: d.how_felt ?? 3,
    niggles: d.niggles ?? null,
    ready_next: d.ready_next ?? 3,
  }));

  const output = getBehaviourDrift({
    compliance_weeks,
    recent_debriefs,
  });

  return NextResponse.json(output);
}
```

## app/api/decision-log/route.ts

```ts
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { logDecision } from "@/engine/decisionLog";

/**
 * GET /api/decision-log — last N decision log entries for current user.
 * POST /api/decision-log — insert a decision (e.g. when guardrails applied).
 */
export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);

  const { data, error } = await supabase
    .from("decision_logs")
    .select("id, created_at, decision_type, trigger_variables, threshold_breached, adjustment_made, explanation")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    decisionType: row.decision_type,
    adjustmentMade: row.adjustment_made,
    explanation: row.explanation ?? "",
    triggerVariables: row.trigger_variables ?? undefined,
    thresholdBreached: row.threshold_breached ?? undefined,
  }));

  return NextResponse.json({ entries });
}

/** POST — log a programme adjustment (trigger, threshold, modification). Used when guardrails or injury modifiers apply. */
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    decisionType?: string;
    triggerVariables?: Record<string, unknown>;
    thresholdBreached?: string;
    adjustmentMade?: string;
    explanation?: string;
  };

  const decisionType = body.decisionType ?? "guardrail_applied";
  const adjustmentMade = body.adjustmentMade ?? body.explanation ?? "Programme adjusted.";
  const payload = {
    decisionType,
    triggerVariables: body.triggerVariables ?? {},
    thresholdBreached: body.thresholdBreached ?? undefined,
    adjustmentMade,
    explanation: body.explanation ?? body.adjustmentMade ?? undefined,
  };

  const { error } = await logDecision(supabase, user.id, payload);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

## app/api/garmin/connect/route.ts

```ts
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

/**
 * Start Garmin Connect OAuth or mark integration as connected.
 * If GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET are set, redirect to Garmin OAuth.
 * Otherwise, for demo/development, we can set garmin_connected in user_preferences (optional).
 */
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const consumerKey = process.env.GARMIN_CONSUMER_KEY;
  const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

  if (consumerKey && consumerSecret) {
    // TODO: Build Garmin OAuth 1.0a flow: request token, redirect to Garmin, then callback to save tokens.
    // For now return a placeholder so the button doesn't 404.
    return NextResponse.json(
      { error: "Garmin OAuth is not yet implemented. Use the Disconnect flow to toggle connection state for testing." },
      { status: 501 }
    );
  }

  // No Garmin keys: allow "soft connect" for demo (store flag only).
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("id", user.id)
    .maybeSingle();

  const current = (profile?.user_preferences as Record<string, unknown>) ?? {};
  const next = { ...current, garmin_connected: true };

  const { error } = await supabase
    .from("profiles")
    .update({ user_preferences: next })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ connected: true });
}
```

## app/api/garmin/disconnect/route.ts

```ts
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("id", user.id)
    .maybeSingle();

  const current = (profile?.user_preferences as Record<string, unknown>) ?? {};
  const { garmin_user_id: _, ...rest } = current;
  const next = { ...rest, garmin_connected: false };

  const { error } = await supabase
    .from("profiles")
    .update({ user_preferences: next })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ connected: false });
}
```

## app/api/injuries/[id]/route.ts

```ts
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { resolveInjury } from "@/engine/injuryMemoryEngine";

/** PATCH /api/injuries/[id] — update or resolve an injury. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { resolved?: boolean; severity?: number; context?: string };

  if (body.resolved === true) {
    const resolved = resolveInjury();
    const { error } = await supabase
      .from("user_injury_log")
      .update({
        resolved: resolved.resolved,
        resolved_at: resolved.resolved_at,
      })
      .eq("id", id)
      .eq("profile_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ resolved: true });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.severity != null) updates.severity = body.severity;
  if (body.context !== undefined) updates.context = body.context;
  const { error } = await supabase
    .from("user_injury_log")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
```

## app/api/injuries/route.ts

```ts
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import {
  logInjury,
  updateInjury,
  type InjuryEntry,
  type InjuryPayload,
} from "@/engine/injuryMemoryEngine";

/** GET /api/injuries — active (unresolved) injuries for current user. */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_injury_log")
    .select("id, profile_id, body_part, severity, context, first_reported, last_reported, resolved, resolved_at, classification, risk_level")
    .eq("profile_id", user.id)
    .order("last_reported", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data ?? []).map((row) => ({
    id: row.id,
    profile_id: row.profile_id,
    body_part: row.body_part,
    severity: row.severity,
    context: row.context,
    first_reported: row.first_reported,
    last_reported: row.last_reported,
    resolved: row.resolved,
    resolved_at: row.resolved_at,
    classification: row.classification,
    risk_level: row.risk_level,
  })) as InjuryEntry[];

  return NextResponse.json({ entries });
}

/** POST /api/injuries — log new injury or re-report (upsert by body_part if recent). */
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as InjuryPayload & { id?: string };
  const { body_part, severity, context, classification } = body;
  if (!body_part || severity == null) {
    return NextResponse.json({ error: "body_part and severity required" }, { status: 400 });
  }

  const payload: InjuryPayload = { body_part, severity, context: context ?? null, classification: classification ?? null };

  const { data: existing } = await supabase
    .from("user_injury_log")
    .select("id, body_part, severity, context, first_reported, last_reported, resolved, resolved_at, classification, risk_level")
    .eq("profile_id", user.id)
    .eq("body_part", body_part)
    .eq("resolved", false)
    .order("last_reported", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const reportCount = 2;
    const { updateInjury: updateFn } = await import("@/engine/injuryMemoryEngine");
    const entry: InjuryEntry = {
      id: existing.id,
      profile_id: user.id,
      body_part: existing.body_part,
      severity: existing.severity,
      context: existing.context,
      first_reported: existing.first_reported,
      last_reported: existing.last_reported,
      resolved: existing.resolved,
      resolved_at: existing.resolved_at,
      classification: existing.classification,
      risk_level: existing.risk_level as InjuryEntry["risk_level"],
    };
    const updates = updateFn(entry, { severity, context: context ?? undefined }, reportCount);
    const { error: updateError } = await supabase
      .from("user_injury_log")
      .update({
        last_reported: updates.last_reported,
        severity: updates.severity,
        context: updates.context,
        classification: updates.classification,
        risk_level: updates.risk_level,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ updated: true, id: existing.id });
  }

  const existingCount = 0;
  const row = logInjury(payload, existingCount);
  const { data: inserted, error: insertError } = await supabase
    .from("user_injury_log")
    .insert({
      profile_id: user.id,
      body_part: row.body_part,
      severity: row.severity,
      context: row.context,
      first_reported: row.first_reported,
      last_reported: row.last_reported,
      resolved: row.resolved,
      resolved_at: row.resolved_at,
      classification: row.classification,
      risk_level: row.risk_level,
    })
    .select("id")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ created: true, id: inserted.id });
}
```

## app/api/profile/route.ts

```ts
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  const {
    name,
    email,
    goal,
    sport,
    experience,
    days_per_week,
    minutes_per_session,
    equipment,
    sleep_hours,
    stress_level,
    injury_notes,
    archetype,
    readiness_score,
    momentum,
    primary_limiter,
    focus,
    signals,
    plan,
    checkin_date,
    checkin_readiness,
    checkin_feel,
    checkin_pain,
    checkin_pain_areas,
    checkin_energy,
    checkin_sleep,
  } = body;

  const updatePayload: Record<string, unknown> = {
    name,
    email,
    goal,
    sport,
    experience,
    days_per_week,
    minutes_per_session,
    equipment,
    sleep_hours,
    stress_level,
    injury_notes,
    archetype,
    readiness_score,
    momentum,
    primary_limiter,
    focus,
    signals,
    plan,
  };
  if (checkin_date !== undefined) updatePayload.checkin_date = checkin_date;
  if (checkin_readiness !== undefined) updatePayload.checkin_readiness = checkin_readiness;
  if (checkin_feel !== undefined) updatePayload.checkin_feel = checkin_feel;
  if (checkin_pain !== undefined) updatePayload.checkin_pain = checkin_pain;
  if (checkin_pain_areas !== undefined) updatePayload.checkin_pain_areas = checkin_pain_areas;
  if (checkin_energy !== undefined) updatePayload.checkin_energy = checkin_energy;
  if (checkin_sleep !== undefined) updatePayload.checkin_sleep = checkin_sleep;

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

## app/api/settings/route.ts

```ts
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
```

## app/api/stripe-portal/route.ts

```ts
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
```

## app/api/today-session/route.ts

```ts
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { getTodaySessionSummary } from "@/lib/todaySessionSummary";

/**
 * GET /api/today-session — today's session summary + sessions this week count.
 * Used by dashboard for Today's session card and "Sessions this week".
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("current_week, days_per_week, minutes_per_session, checkin_date, checkin_readiness, checkin_feel, checkin_pain, checkin_energy, checkin_sleep, focus, goal")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: profileError?.message ?? "Profile not found" },
      { status: profileError?.code === "PGRST116" ? 404 : 500 }
    );
  }

  const todaySession = getTodaySessionSummary(profile);

  const week = profile.current_week ?? 1;
  const planned = Math.min(5, Math.max(2, profile.days_per_week ?? 3));

  const { count, error: countError } = await supabase
    .from("session_logs")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("week", week);

  const completed = countError ? 0 : (count ?? 0);

  return NextResponse.json({
    todaySession,
    sessionsThisWeek: { completed, planned },
  });
}
```

## app/benchmarks/page.tsx

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/lib/requireAuth";
import type { PerformanceBenchmarks, ExerciseBenchmark } from "@/lib/profile/benchmarkSchema";
import { BENCHMARK_SECTIONS } from "@/lib/profile/benchmarkSchema";
import { OPTIONS_BY_SECTION, type BenchmarkOption } from "@/lib/profile/benchmarkExerciseOptions";

type Profile = {
  id: string;
  performance_benchmarks?: PerformanceBenchmarks | null;
};

const ADD_EXERCISE_PLACEHOLDER = "Search or add an exercise…";
const FILTER_LIMIT = 60;

export default function BenchmarksPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [openSection, setOpenSection] = useState<string | null>("strength");
  const [addQuery, setAddQuery] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState<Record<string, boolean>>({});
  const [addFocused, setAddFocused] = useState<Record<string, boolean>>({});
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, performance_benchmarks")
        .eq("id", session.user.id)
        .maybeSingle();
      setProfile(data ?? null);
      const bench = data?.performance_benchmarks?.exerciseBenchmarks ?? {};
      const next: Record<string, string> = {};
      Object.entries(bench).forEach(([key, b]) => {
        const v = (b as ExerciseBenchmark)?.oneRM ?? (b as ExerciseBenchmark)?.estimatedOneRM;
        if (v != null && typeof v === "number" && v > 0) next[key] = String(v);
      });
      setValues(next);
    }
    load();
  }, [router]);

  function handleChange(key: string, raw: string) {
    setValues((prev) => ({ ...prev, [key]: raw.trim() }));
  }

  function getVisibleExercises(sectionId: string) {
    const section = BENCHMARK_SECTIONS.find((s) => s.id === sectionId);
    const fullList = OPTIONS_BY_SECTION[sectionId] ?? [];
    if (!section) return [];
    const defaultKeys = new Set(section.exercises.map((e) => e.key));
    const fromValues = Object.keys(values).filter(
      (key) => fullList.some((o) => o.key === key)
    );
    const extraKeys = fromValues.filter((k) => !defaultKeys.has(k));
    const defaultOpts = section.exercises.map((e) => ({ key: e.key, label: e.label, unit: e.unit }));
    const extraOpts = extraKeys.map((key) => {
      const o = fullList.find((x) => x.key === key);
      return o ? { key: o.key, label: o.label, unit: o.unit } : null;
    }).filter(Boolean) as BenchmarkOption[];
    return [...defaultOpts, ...extraOpts];
  }

  function getAddableOptions(sectionId: string): BenchmarkOption[] {
    const visibleKeys = new Set(getVisibleExercises(sectionId).map((e) => e.key));
    const fullList = OPTIONS_BY_SECTION[sectionId] ?? [];
    const q = (addQuery[sectionId] ?? "").toLowerCase().trim();
    return fullList
      .filter((o) => !visibleKeys.has(o.key))
      .filter((o) => !q || o.label.toLowerCase().includes(q) || o.key.toLowerCase().includes(q))
      .slice(0, FILTER_LIMIT);
  }

  function addExercise(sectionId: string, key: string) {
    setValues((prev) => ({ ...prev, [key]: "" }));
    setAddQuery((prev) => ({ ...prev, [sectionId]: "" }));
    setAddOpen((prev) => ({ ...prev, [sectionId]: false }));
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    const exerciseBenchmarks: Record<string, ExerciseBenchmark> = {};
    const now = new Date().toISOString().slice(0, 10);
    Object.entries(values).forEach(([key, v]) => {
      const num = v ? parseFloat(v) : null;
      if (num != null && !Number.isNaN(num) && num > 0) {
        exerciseBenchmarks[key] = {
          oneRM: num,
          estimatedOneRM: null,
          lastUpdated: now,
        };
      }
    });
    const next: PerformanceBenchmarks = {
      ...(profile.performance_benchmarks ?? {}),
      exerciseBenchmarks,
    };
    await supabase
      .from("profiles")
      .update({ performance_benchmarks: next })
      .eq("id", profile.id);
    setProfile((p) => (p ? { ...p, performance_benchmarks: next } : null));
    setSaving(false);
  }

  if (!profile) return null;

  return (
    <RequireAuth>
    <div className="outer">
      <nav className="topNav">
        <div className="logo">Performance Pathfinder</div>
        <div className="tabs">
          <Link href="/profile" className="tab">Dashboard</Link>
          <Link href="/programme" className="tab">Programme</Link>
          <Link href="/tactical" className="tab">Tactical</Link>
          <Link href="/nutrition" className="tab">Nutrition</Link>
          <span className="tab active">Benchmarks</span>
        </div>
      </nav>

      <div className="container">
        <div className="header">
          <div className="phase">BENCHMARKS</div>
          <h1 className="headline">Your numbers</h1>
          <p className="sub">
            Add 1RMs (kg) for strength so the programme can prescribe loads. Add CV and power metrics if you track them.
          </p>
        </div>

        {BENCHMARK_SECTIONS.map((section) => {
          const isOpen = openSection === section.id;
          return (
            <div key={section.id} className="benchSection">
              <button
                type="button"
                className="benchSectionHead"
                onClick={() => setOpenSection(isOpen ? null : section.id)}
                aria-expanded={isOpen}
              >
                <span>{section.title}</span>
                <span className="benchSectionToggle">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="benchGrid">
                  {getVisibleExercises(section.id).map((ex) => (
                    <label key={ex.key} className="benchRow">
                      <span className="benchLabel">{ex.label}</span>
                      <input
                        type="number"
                        min={0}
                        step={ex.unit === "sec" || ex.key.includes("time") ? 1 : 2.5}
                        placeholder="—"
                        value={values[ex.key] ?? ""}
                        onChange={(e) => handleChange(ex.key, e.target.value)}
                        className="benchInput"
                      />
                      <span className="benchUnit">{ex.unit || "kg"}</span>
                    </label>
                  ))}
                  <div className="addExerciseWrap">
                    <span className="addExerciseWrapLabel">Add another exercise</span>
                    <input
                      type="text"
                      className="addExerciseInput"
                      placeholder={ADD_EXERCISE_PLACEHOLDER}
                      value={addQuery[section.id] ?? ""}
                      onChange={(e) => setAddQuery((q) => ({ ...q, [section.id]: e.target.value }))}
                      onFocus={() => { setAddFocused((o) => ({ ...o, [section.id]: true })); setAddOpen((o) => ({ ...o, [section.id]: true })); }}
                      onBlur={() => setTimeout(() => { setAddFocused((o) => ({ ...o, [section.id]: false })); setAddOpen((o) => ({ ...o, [section.id]: false })); }, 150)}
                    />
                    {(addOpen[section.id] || addFocused[section.id]) && (
                      <ul className="addExerciseList" role="listbox">
                        {getAddableOptions(section.id).length > 0 ? (
                          getAddableOptions(section.id).map((opt) => (
                            <li
                              key={opt.key}
                              role="option"
                              className="addExerciseItem"
                              onMouseDown={(e) => { e.preventDefault(); addExercise(section.id, opt.key); }}
                            >
                              {opt.label}
                            </li>
                          ))
                        ) : (
                          <li className="addExerciseListEmpty" role="option" aria-disabled>
                            {addQuery[section.id]?.trim() ? "No matching exercises" : "Type to search…"}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className="saveBtn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save benchmarks"}
        </button>
      </div>

      <style jsx>{`
        .outer {
          background:
            radial-gradient(circle at 20% 10%, rgba(47,128,237,0.15), transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(39,224,166,0.12), transparent 40%),
            #0A1220;
          min-height: 100vh;
          color: white;
        }
        .topNav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .logo {
          font-weight: 600;
          letter-spacing: 1px;
          opacity: 0.9;
        }
        .tabs { display: flex; gap: 24px; align-items: center; }
        .tab {
          font-size: 14px;
          color: white;
          text-decoration: none;
          opacity: 0.6;
        }
        .tab.active { opacity: 1; font-weight: 600; }
        .tab:hover:not(.active) { opacity: 0.85; }
        .container {
          max-width: 720px;
          margin: 60px auto;
          padding: 0 40px;
        }
        .header { margin-bottom: 32px; }
        .phase {
          font-size: 12px;
          letter-spacing: 2px;
          opacity: 0.6;
        }
        .headline {
          font-size: 28px;
          margin: 8px 0 12px;
        }
        .sub {
          font-size: 14px;
          opacity: 0.75;
          line-height: 1.5;
          margin: 0;
        }
        .benchSection {
          background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          margin-bottom: 16px;
          overflow: visible;
          position: relative;
          z-index: 0;
        }
        .benchSection:focus-within {
          z-index: 1;
        }
        .benchSectionHead {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          background: none;
          border: none;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
        }
        .benchSectionHead:hover {
          background: rgba(255,255,255,0.04);
        }
        .benchSectionToggle {
          font-size: 18px;
          opacity: 0.7;
        }
        .benchGrid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 0 24px 24px;
        }
        .benchRow {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 14px;
        }
        .benchLabel {
          flex: 1;
          opacity: 0.9;
        }
        .benchInput {
          width: 100px;
          padding: 10px 14px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          color: white;
          font-size: 15px;
          text-align: right;
        }
        .benchInput::placeholder { opacity: 0.4; }
        .benchUnit {
          width: 36px;
          opacity: 0.6;
          font-size: 12px;
        }
        .addExerciseWrap {
          position: relative;
          margin-top: 12px;
          z-index: 2;
        }
        .addExerciseWrapLabel {
          display: block;
          font-size: 12px;
          opacity: 0.65;
          margin-bottom: 6px;
          letter-spacing: 0.02em;
        }
        .addExerciseInput {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px dashed rgba(255,255,255,0.25);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          box-sizing: border-box;
        }
        .addExerciseInput::placeholder { opacity: 0.5; }
        .addExerciseInput:focus {
          outline: none;
          border-color: rgba(47,128,237,0.5);
          border-style: solid;
          background: rgba(255,255,255,0.08);
        }
        .addExerciseList {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin: 6px 0 0;
          padding: 6px 0;
          max-height: 280px;
          overflow-y: auto;
          background: rgba(10,18,32,0.98);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 12px;
          list-style: none;
          z-index: 100;
          box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
        }
        .addExerciseItem {
          padding: 12px 16px;
          font-size: 14px;
          cursor: pointer;
          opacity: 0.95;
        }
        .addExerciseItem:hover {
          background: rgba(47,128,237,0.2);
        }
        .addExerciseListEmpty {
          padding: 12px 16px;
          font-size: 13px;
          opacity: 0.6;
        }
        .saveBtn {
          margin-top: 24px;
          padding: 14px 24px;
          background: #2F80ED;
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
        }
        .saveBtn:hover:not(:disabled) { background: #2563eb; }
        .saveBtn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </div>
    </RequireAuth>
  );
}
```

## app/components/AIContainer.tsx

```tsx
"use client";

import { ReactNode } from "react";

export default function AIContainer({ children }: { children?: ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        pointerEvents: "auto",
      }}
    >
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        * {
          font-family: 'Poppins', sans-serif;
          box-sizing: border-box;
        }
      `}
      </style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 20% 20%, rgba(10,132,255,0.18), transparent 40%), radial-gradient(circle at 80% 80%, rgba(240,78,55,0.15), transparent 40%), #0C0F18",
        }}
      >
        <div
          style={{
            width: 760,
            maxWidth: "92%",
            background: "rgba(26,31,46,0.88)",
            backdropFilter: "blur(40px)",
            borderRadius: 28,
            padding: "clamp(24px, 5vw, 56px)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "#fff",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
```

## app/components/BodyCompositionModal.tsx

```tsx
"use client";

import { useState, useEffect } from "react";
import { saveBodyComposition, getBodyComposition } from "@/lib/nutritionStore";
import type { BodyComposition } from "@/lib/nutritionStore";

export type BodyCompositionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function BodyCompositionModal({
  isOpen,
  onClose,
  onSaved,
}: BodyCompositionModalProps) {
  const [bodyweight, setBodyweight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getBodyComposition();
      if (existing) {
        setBodyweight(String(existing.bodyweight));
        setBodyFat(String(existing.bodyFat));
        setMuscleMass(String(existing.muscleMass));
        setWaistCm(existing.waistCm != null ? String(existing.waistCm) : "");
      } else {
        setBodyweight("");
        setBodyFat("");
        setMuscleMass("");
        setWaistCm("");
      }
      setShowSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    const bw = Math.min(200, Math.max(40, parseFloat(bodyweight) || 70));
    const bf = Math.min(50, Math.max(0, parseFloat(bodyFat) || 0));
    const mm = Math.min(150, Math.max(0, parseFloat(muscleMass) || bw * 0.9));
    const data: BodyComposition = {
      bodyweight: bw,
      bodyFat: bf,
      muscleMass: mm,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    const w = parseFloat(waistCm);
    if (Number.isFinite(w) && w > 0) data.waistCm = w;
    saveBodyComposition(data);
    setShowSaved(true);
    onSaved();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="bodyCompBackdrop" onClick={onClose}>
      <div className="bodyCompModal" onClick={(e) => e.stopPropagation()}>
        <div className="bodyCompModalHeader">
          <span className="bodyCompModalTitle">Update body composition</span>
          <button type="button" className="bodyCompModalClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="bodyCompModalBody">
          {showSaved && (
            <div className="bodyCompDataUpdated" role="status">
              Data Updated
            </div>
          )}
          <label className="bodyCompLabel">
            Bodyweight (kg)
            <input
              type="number"
              className="bodyCompInput"
              min={40}
              max={200}
              value={bodyweight}
              onChange={(e) => setBodyweight(e.target.value)}
            />
          </label>
          <label className="bodyCompLabel">
            Body fat (%)
            <input
              type="number"
              className="bodyCompInput"
              min={0}
              max={50}
              step={0.5}
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
            />
          </label>
          <label className="bodyCompLabel">
            Muscle mass (kg)
            <input
              type="number"
              className="bodyCompInput"
              min={0}
              max={150}
              step={0.5}
              value={muscleMass}
              onChange={(e) => setMuscleMass(e.target.value)}
            />
          </label>
          <label className="bodyCompLabel">
            Waist circumference (cm) — optional
            <input
              type="number"
              className="bodyCompInput"
              min={0}
              max={200}
              step={0.5}
              value={waistCm}
              onChange={(e) => setWaistCm(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <div className="bodyCompActions">
            <button type="button" className="bodyCompCancel" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="bodyCompSave" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .bodyCompBackdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 48px;
          z-index: 10002;
        }
        .bodyCompModal {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(30, 41, 59, 0.98));
          border-radius: 16px;
          overflow: hidden;
          max-width: 420px;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(47, 128, 237, 0.15);
        }
        .bodyCompModalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .bodyCompModalTitle {
          font-size: 16px;
          font-weight: 600;
        }
        .bodyCompModalClose {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.8;
          line-height: 1;
        }
        .bodyCompModalClose:hover {
          opacity: 1;
        }
        .bodyCompModalBody {
          padding: 18px 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .bodyCompDataUpdated {
          padding: 10px 14px;
          background: rgba(39, 224, 166, 0.15);
          border: 1px solid rgba(39, 224, 166, 0.4);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #27e0a6;
          text-align: center;
          animation: bodyCompGlow 0.6s ease-out;
        }
        @keyframes bodyCompGlow {
          0% {
            box-shadow: 0 0 0 rgba(39, 224, 166, 0);
          }
          50% {
            box-shadow: 0 0 24px rgba(39, 224, 166, 0.5);
          }
          100% {
            box-shadow: 0 0 12px rgba(39, 224, 166, 0.2);
          }
        }
        .bodyCompLabel {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          opacity: 0.9;
        }
        .bodyCompInput {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: white;
          font-size: 14px;
        }
        .bodyCompInput:focus {
          outline: none;
          border-color: rgba(47, 128, 237, 0.5);
        }
        .bodyCompActions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .bodyCompCancel {
          flex: 1;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }
        .bodyCompCancel:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .bodyCompSave {
          flex: 1;
          padding: 10px 16px;
          background: #2f80ed;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .bodyCompSave:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}
```

## app/components/ForecastSummary.tsx

```tsx
"use client";

import type { ForecastResult } from "@/types/forecast";

export type ForecastSummaryProps = {
  forecast: ForecastResult;
  weeksForward?: number;
  className?: string;
};

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${Math.round(value)}%`;
}

export default function ForecastSummary({
  forecast,
  weeksForward = 8,
  className = "",
}: ForecastSummaryProps) {
  const { projected, confidence } = forecast;
  const current =
    forecast.historical.length > 0
      ? forecast.historical[forecast.historical.length - 1]
      : 0;
  const projectedValue = projected[weeksForward - 1] ?? projected[projected.length - 1] ?? current;
  const changePct = current !== 0 ? ((projectedValue - current) / current) * 100 : 0;

  let riskLevel: "green" | "amber" | "red" = "green";
  let riskLabel = "Low";
  if (confidence < 0.5) {
    riskLevel = "red";
    riskLabel = "High";
  } else if (confidence < 0.75) {
    riskLevel = "amber";
    riskLabel = "Medium";
  }

  return (
    <div className={`forecastSummary ${className}`}>
      <div className="forecastSummaryRow">
        <span className="forecastSummaryLabel">
          Projected PPS in {weeksForward} weeks:
        </span>
        <span className="forecastSummaryValue forecastSummaryChange">
          {formatPercent(changePct)}
        </span>
      </div>
      <div className="forecastSummaryRow">
        <span className="forecastSummaryLabel">Confidence:</span>
        <span className="forecastSummaryValue">
          {Math.round(confidence * 100)}%
        </span>
      </div>
      <div className="forecastSummaryRow">
        <span className="forecastSummaryLabel">Risk Level:</span>
        <span
          className={`forecastSummaryRisk forecastSummaryRisk${riskLevel}`}
          aria-label={`Risk level: ${riskLabel}`}
        >
          {riskLabel}
        </span>
      </div>
      <style jsx>{`
        .forecastSummary {
          margin-top: 20px;
          padding: 16px 20px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.05),
            rgba(255, 255, 255, 0.02)
          );
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .forecastSummary:hover {
          box-shadow: 0 0 20px rgba(47, 128, 237, 0.2),
            0 0 40px rgba(39, 224, 166, 0.1);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .forecastSummaryRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .forecastSummaryRow:last-child {
          margin-bottom: 0;
        }
        .forecastSummaryLabel {
          font-size: 13px;
          opacity: 0.85;
        }
        .forecastSummaryValue {
          font-size: 14px;
          font-weight: 600;
        }
        .forecastSummaryChange {
          color: #27e0a6;
        }
        .forecastSummaryRisk {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 4px 10px;
          border-radius: 8px;
        }
        .forecastSummaryRiskgreen {
          background: rgba(39, 224, 166, 0.2);
          color: #27e0a6;
        }
        .forecastSummaryRiskamber {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }
        .forecastSummaryRiskred {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
```

## app/components/FuelStrategyTool.tsx

```tsx
"use client";

import { useState } from "react";
import {
  generateFuelStrategy,
  type FuelStrategyOutput,
  type Intensity,
  type Goal,
  type BodyCompositionInput,
} from "@/lib/fuelingEngine";

const EVENT_TYPES = [
  "Strength",
  "Hypertrophy",
  "Endurance",
  "HIIT",
  "Skill / Mobility",
  "Rest Day",
];

export type FuelStrategyToolProps = {
  bodyComposition?: BodyCompositionInput | null;
};

export default function FuelStrategyTool({ bodyComposition }: FuelStrategyToolProps = {}) {
  const [eventType, setEventType] = useState("Strength");
  const [durationInput, setDurationInput] = useState("60");
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [bodyweightInput, setBodyweightInput] = useState("75");
  const [goal, setGoal] = useState<Goal>("performance");
  const [result, setResult] = useState<FuelStrategyOutput | null>(null);
  const [showResult, setShowResult] = useState(false);

  const durationMinutes = Math.min(240, Math.max(15, parseInt(durationInput, 10) || 60));
  const bodyweight = Math.min(200, Math.max(40, parseInt(bodyweightInput, 10) || 70));

  const handleGenerate = () => {
    const out = generateFuelStrategy({
      eventType,
      durationMinutes,
      intensity,
      bodyweight,
      goal,
      bodyComposition: bodyComposition ?? undefined,
    });
    setResult(out);
    setShowResult(true);
  };

  return (
    <div className="fuelStrategyTool">
      <div className="fuelStrategyCard">
        <h3 className="fuelStrategyTitle">Fuel strategy tool</h3>
        <p className="fuelStrategySub">
          Generate macro targets and timing from event type, duration, and goal.
        </p>
        <div className="fuelStrategyForm">
          <label className="fuelStrategyLabel">
            Event type
            <select
              className="fuelStrategySelect"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              {EVENT_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label className="fuelStrategyLabel">
            Duration (min)
            <input
              type="number"
              className="fuelStrategyInput"
              min={15}
              max={240}
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
            />
          </label>
          <label className="fuelStrategyLabel">
            Intensity
            <select
              className="fuelStrategySelect"
              value={intensity}
              onChange={(e) => setIntensity(e.target.value as Intensity)}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="fuelStrategyLabel">
            Bodyweight (kg)
            <input
              type="number"
              className="fuelStrategyInput"
              min={40}
              max={200}
              value={bodyweightInput}
              onChange={(e) => setBodyweightInput(e.target.value)}
            />
          </label>
          <label className="fuelStrategyLabel">
            Goal
            <select
              className="fuelStrategySelect"
              value={goal}
              onChange={(e) => setGoal(e.target.value as Goal)}
            >
              <option value="performance">Performance</option>
              <option value="maintenance">Maintenance</option>
              <option value="cut">Cut</option>
              <option value="mass">Mass</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className="fuelStrategyBtn"
          onClick={handleGenerate}
        >
          Generate strategy
        </button>
        {result && showResult && (
          <div className="fuelStrategyResult">
            <div className="fuelStrategyResultMacros">
              <span>{result.totalCalories} kcal</span>
              <span>P: {result.proteinGrams}g</span>
              <span>C: {result.carbsGrams}g</span>
              <span>F: {result.fatsGrams}g</span>
            </div>
            <div className="fuelStrategyResultSection">
              <strong>Pre-event</strong>
              <p>{result.preEventStrategy}</p>
            </div>
            <div className="fuelStrategyResultSection">
              <strong>Intra-event</strong>
              <p>{result.intraEventStrategy}</p>
            </div>
            <div className="fuelStrategyResultSection">
              <strong>Post-event</strong>
              <p>{result.postEventStrategy}</p>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .fuelStrategyTool {
          margin-bottom: 24px;
        }
        .fuelStrategyCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .fuelStrategyCard:hover {
          box-shadow: 0 0 28px rgba(47, 128, 237, 0.22), 0 0 56px rgba(39, 224, 166, 0.12), 0 20px 60px rgba(0, 0, 0, 0.4);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .fuelStrategyTitle {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .fuelStrategySub {
          font-size: 14px;
          opacity: 0.8;
          margin: 0 0 24px;
          line-height: 1.45;
        }
        .fuelStrategyForm {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .fuelStrategyLabel {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          opacity: 0.9;
        }
        .fuelStrategySelect,
        .fuelStrategyInput {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
        }
        .fuelStrategySelect:focus,
        .fuelStrategyInput:focus {
          outline: none;
          border-color: rgba(47, 128, 237, 0.5);
          box-shadow: 0 0 0 2px rgba(47, 128, 237, 0.2);
        }
        .fuelStrategyBtn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #2f80ed, rgba(39, 224, 166, 0.9));
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: box-shadow 0.3s ease, transform 0.2s ease;
        }
        .fuelStrategyBtn:hover {
          box-shadow: 0 0 20px rgba(47, 128, 237, 0.4), 0 0 36px rgba(39, 224, 166, 0.3);
          transform: scale(1.02);
        }
        .fuelStrategyResult {
          margin-top: 24px;
          padding: 20px 24px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          animation: fuelStrategyFadeIn 0.4s ease-out;
        }
        @keyframes fuelStrategyFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fuelStrategyResultMacros {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
          font-size: 15px;
          font-weight: 600;
          color: #27e0a6;
        }
        .fuelStrategyResultSection {
          margin-bottom: 16px;
        }
        .fuelStrategyResultSection:last-child {
          margin-bottom: 0;
        }
        .fuelStrategyResultSection strong {
          display: block;
          font-size: 12px;
          letter-spacing: 0.06em;
          opacity: 0.9;
          margin-bottom: 6px;
        }
        .fuelStrategyResultSection p {
          font-size: 14px;
          opacity: 0.85;
          line-height: 1.5;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
```

## app/components/GoalCategoryDetails.tsx

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { parseHHMMSS, formatHHMMSS } from "@/lib/timeInputParser";

export type GoalDetails = {
  currentValue?: number;
  targetValue?: number;
  distance?: number;
  currentTime?: number;
  targetTime?: number;
  currentBodyweight?: number;
  targetBodyweight?: number;
  currentBodyFat?: number;
  targetBodyFat?: number;
  leanMass?: number;
  primaryLift?: string;
  current1RM?: number;
  target1RM?: number;
  secondaryLift?: string;
  primaryKpi?: string;
  skillType?: string;
  currentProficiency?: number;
  targetProficiency?: number;
  loadCarriageDistance?: number;
  loadWeight?: number;
  weeklyVolumeKm?: number;
  longRunBaselineKm?: number;
  customKpiName?: string;
  [key: string]: unknown;
};

export type GoalCategoryDetailsProps = {
  category: string;
  onUpdate: (details: GoalDetails) => void;
  currentBenchmarks?: { back_squat?: number | null; bench_press?: number | null; deadlift?: number | null; overhead_press?: number | null; two_mile_time_sec?: number | null } | null;
  className?: string;
};

const LIFT_OPTIONS = ["Squat", "Bench", "Deadlift", "Overhead Press"];

export default function GoalCategoryDetails({
  category,
  onUpdate,
  currentBenchmarks,
  className = "",
}: GoalCategoryDetailsProps) {
  const [details, setDetails] = useState<GoalDetails>({});
  const [targetTimeDisplay, setTargetTimeDisplay] = useState("");
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState("");
  const [tacticalCurrentTimeDisplay, setTacticalCurrentTimeDisplay] = useState("");
  const [tacticalTargetTimeDisplay, setTacticalTargetTimeDisplay] = useState("");

  const update = useCallback(
    (next: GoalDetails) => {
      setDetails(next);
      onUpdate(next);
    },
    [onUpdate]
  );

  useEffect(() => {
    if (category === "Marathon" || category === "Endurance") {
      if (details.targetTime != null) setTargetTimeDisplay(formatHHMMSS(details.targetTime));
      if (details.currentTime != null) setCurrentTimeDisplay(formatHHMMSS(details.currentTime));
      else if (currentBenchmarks?.two_mile_time_sec != null) setCurrentTimeDisplay(formatHHMMSS(currentBenchmarks.two_mile_time_sec));
    }
    if (category === "Tactical") {
      if (details.currentTime != null) setTacticalCurrentTimeDisplay(formatHHMMSS(details.currentTime));
      if (details.targetTime != null) setTacticalTargetTimeDisplay(formatHHMMSS(details.targetTime));
    }
  }, [category, details.targetTime, details.currentTime, currentBenchmarks?.two_mile_time_sec]);

  const handleTargetTimeBlur = () => {
    const sec = parseHHMMSS(targetTimeDisplay);
    setTargetTimeDisplay(formatHHMMSS(sec));
    update({ ...details, targetTime: sec || undefined });
  };
  const handleCurrentTimeBlur = () => {
    const sec = parseHHMMSS(currentTimeDisplay);
    setCurrentTimeDisplay(formatHHMMSS(sec));
    update({ ...details, currentTime: sec || undefined });
  };
  const handleTacticalCurrentTimeBlur = () => {
    const sec = parseHHMMSS(tacticalCurrentTimeDisplay);
    setTacticalCurrentTimeDisplay(formatHHMMSS(sec));
    update({ ...details, currentTime: sec || undefined });
  };
  const handleTacticalTargetTimeBlur = () => {
    const sec = parseHHMMSS(tacticalTargetTimeDisplay);
    setTacticalTargetTimeDisplay(formatHHMMSS(sec));
    update({ ...details, targetTime: sec || undefined });
  };

  if (!category) return null;

  if (category === "Marathon" || category === "Endurance") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel">
          Target finish time (HH:MM:SS)
          <input
            type="text"
            className="goalCategoryDetailsInput"
            value={targetTimeDisplay}
            onChange={(e) => setTargetTimeDisplay(e.target.value)}
            onBlur={handleTargetTimeBlur}
            placeholder="00:00:00"
          />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current best time (HH:MM:SS)
          <input
            type="text"
            className="goalCategoryDetailsInput"
            value={currentTimeDisplay}
            onChange={(e) => setCurrentTimeDisplay(e.target.value)}
            onBlur={handleCurrentTimeBlur}
            placeholder="00:00:00"
          />
        </label>
        <label className="goalCategoryDetailsLabel">
          Event distance (km)
          <input
            type="number"
            min={0}
            step={0.1}
            className="goalCategoryDetailsInput"
            value={details.distance ?? ""}
            onChange={(e) => update({ ...details, distance: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="e.g. 21.1"
          />
        </label>
        <label className="goalCategoryDetailsLabel">
          Weekly training volume (km)
          <input
            type="number"
            min={0}
            step={1}
            className="goalCategoryDetailsInput"
            value={details.weeklyVolumeKm ?? ""}
            onChange={(e) => update({ ...details, weeklyVolumeKm: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="e.g. 40"
          />
        </label>
        <label className="goalCategoryDetailsLabel">
          Long run baseline (km)
          <input
            type="number"
            min={0}
            step={0.5}
            className="goalCategoryDetailsInput"
            value={details.longRunBaselineKm ?? ""}
            onChange={(e) => update({ ...details, longRunBaselineKm: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="e.g. 15"
          />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Body Composition") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel">
          Current bodyweight (kg)
          <input type="number" min={0} step={0.1} className="goalCategoryDetailsInput" value={details.currentBodyweight ?? ""} onChange={(e) => update({ ...details, currentBodyweight: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 80" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target bodyweight (kg)
          <input type="number" min={0} step={0.1} className="goalCategoryDetailsInput" value={details.targetBodyweight ?? ""} onChange={(e) => update({ ...details, targetBodyweight: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 78" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current body fat (%)
          <input type="number" min={0} max={100} step={0.5} className="goalCategoryDetailsInput" value={details.currentBodyFat ?? ""} onChange={(e) => update({ ...details, currentBodyFat: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 18" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target body fat (%)
          <input type="number" min={0} max={100} step={0.5} className="goalCategoryDetailsInput" value={details.targetBodyFat ?? ""} onChange={(e) => update({ ...details, targetBodyFat: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 15" />
        </label>
        <label className="goalCategoryDetailsLabel goalCategoryDetailsLabelFull">
          Lean mass (optional, kg)
          <input type="number" min={0} step={0.1} className="goalCategoryDetailsInput" value={details.leanMass ?? ""} onChange={(e) => update({ ...details, leanMass: e.target.value ? Number(e.target.value) : undefined })} placeholder="optional" />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabelFull { grid-column: 1 / -1; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Strength") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel">
          Primary lift focus
          <select className="goalCategoryDetailsInput" value={details.primaryLift ?? ""} onChange={(e) => update({ ...details, primaryLift: e.target.value || undefined })}>
            <option value="">Select</option>
            {LIFT_OPTIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="goalCategoryDetailsLabel">
          Current 1RM (kg)
          <input type="number" min={0} step={2.5} className="goalCategoryDetailsInput" value={details.current1RM ?? ""} onChange={(e) => update({ ...details, current1RM: e.target.value ? Number(e.target.value) : undefined })} placeholder={currentBenchmarks?.back_squat != null ? String(currentBenchmarks.back_squat) : "e.g. 100"} />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target 1RM (kg)
          <input type="number" min={0} step={2.5} className="goalCategoryDetailsInput" value={details.target1RM ?? ""} onChange={(e) => update({ ...details, target1RM: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 120" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Secondary lift (optional)
          <select className="goalCategoryDetailsInput" value={details.secondaryLift ?? ""} onChange={(e) => update({ ...details, secondaryLift: e.target.value || undefined })}>
            <option value="">None</option>
            {LIFT_OPTIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Performance") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel goalCategoryDetailsLabelFull">
          Primary KPI
          <input type="text" className="goalCategoryDetailsInput" value={details.primaryKpi ?? ""} onChange={(e) => update({ ...details, primaryKpi: e.target.value || undefined })} placeholder="e.g. PPS, Velocity" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current value
          <input type="number" className="goalCategoryDetailsInput" value={details.currentValue ?? ""} onChange={(e) => update({ ...details, currentValue: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 72" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target value
          <input type="number" className="goalCategoryDetailsInput" value={details.targetValue ?? ""} onChange={(e) => update({ ...details, targetValue: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 85" />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabelFull { grid-column: 1 / -1; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Tactical") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel">
          Load carriage distance (km)
          <input type="number" min={0} step={0.1} className="goalCategoryDetailsInput" value={details.loadCarriageDistance ?? ""} onChange={(e) => update({ ...details, loadCarriageDistance: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 12" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Load weight (kg)
          <input type="number" min={0} step={1} className="goalCategoryDetailsInput" value={details.loadWeight ?? ""} onChange={(e) => update({ ...details, loadWeight: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 25" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current time (HH:MM:SS)
          <input type="text" className="goalCategoryDetailsInput" value={tacticalCurrentTimeDisplay} onChange={(e) => setTacticalCurrentTimeDisplay(e.target.value)} onBlur={handleTacticalCurrentTimeBlur} placeholder="00:00:00" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target time (HH:MM:SS)
          <input type="text" className="goalCategoryDetailsInput" value={tacticalTargetTimeDisplay} onChange={(e) => setTacticalTargetTimeDisplay(e.target.value)} onBlur={handleTacticalTargetTimeBlur} placeholder="00:00:00" />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Skill") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel goalCategoryDetailsLabelFull">
          Skill type
          <input type="text" className="goalCategoryDetailsInput" value={details.skillType ?? ""} onChange={(e) => update({ ...details, skillType: e.target.value || undefined })} placeholder="e.g. Pistol squat" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current proficiency (1–10)
          <input type="number" min={1} max={10} step={0.5} className="goalCategoryDetailsInput" value={details.currentProficiency ?? ""} onChange={(e) => update({ ...details, currentProficiency: e.target.value ? Number(e.target.value) : undefined })} placeholder="1–10" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target proficiency (1–10)
          <input type="number" min={1} max={10} step={0.5} className="goalCategoryDetailsInput" value={details.targetProficiency ?? ""} onChange={(e) => update({ ...details, targetProficiency: e.target.value ? Number(e.target.value) : undefined })} placeholder="1–10" />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabelFull { grid-column: 1 / -1; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  if (category === "Custom") {
    return (
      <div className={`goalCategoryDetails ${className}`}>
        <label className="goalCategoryDetailsLabel goalCategoryDetailsLabelFull">
          KPI name
          <input type="text" className="goalCategoryDetailsInput" value={details.customKpiName ?? ""} onChange={(e) => update({ ...details, customKpiName: e.target.value || undefined })} placeholder="e.g. Custom metric" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Current value
          <input type="number" className="goalCategoryDetailsInput" value={details.currentValue ?? ""} onChange={(e) => update({ ...details, currentValue: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 50" />
        </label>
        <label className="goalCategoryDetailsLabel">
          Target value
          <input type="number" className="goalCategoryDetailsInput" value={details.targetValue ?? ""} onChange={(e) => update({ ...details, targetValue: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 70" />
        </label>
        <style jsx>{`
          .goalCategoryDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .goalCategoryDetailsLabelFull { grid-column: 1 / -1; }
          .goalCategoryDetailsLabel { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; opacity: 0.9; }
          .goalCategoryDetailsInput { padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; }
          .goalCategoryDetailsInput:focus { outline: none; border-color: rgba(47,128,237,0.5); }
          @media (max-width: 600px) { .goalCategoryDetails { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    );
  }

  return null;
}
```

## app/components/GoalInputCard.tsx

```tsx
"use client";

import { useState, useCallback } from "react";
import { generateGoalRoadmap } from "@/lib/goalEngine";
import type { GoalRoadmapResult, CurrentBenchmarks } from "@/lib/goalEngine";
import GoalCategoryDetails from "@/app/components/GoalCategoryDetails";
import type { GoalDetails } from "@/app/components/GoalCategoryDetails";

const CATEGORIES = [
  "Performance",
  "Body Composition",
  "Strength",
  "Endurance",
  "Marathon",
  "Skill",
  "Tactical",
  "Custom",
];

const PRIORITIES = ["Low", "Moderate", "High"];

export type GoalInputCardProps = {
  onGenerate: (result: GoalRoadmapResult) => void;
  currentBenchmarks?: CurrentBenchmarks | null;
  className?: string;
};

function defaultDeadline(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

export default function GoalInputCard({
  onGenerate,
  currentBenchmarks,
  className = "",
}: GoalInputCardProps) {
  const [goalTitle, setGoalTitle] = useState("");
  const [category, setCategory] = useState("Performance");
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [priority, setPriority] = useState("Moderate");
  const [constraints, setConstraints] = useState("");
  const [squatKg, setSquatKg] = useState("");
  const [benchKg, setBenchKg] = useState("");
  const [deadliftKg, setDeadliftKg] = useState("");
  const [overheadKg, setOverheadKg] = useState("");
  const [targetTimeSec, setTargetTimeSec] = useState("");
  const [targetTimeLabel, setTargetTimeLabel] = useState("");
  const [categoryDetails, setCategoryDetails] = useState<GoalDetails>({});

  const targetAchievements = {
    squat_kg: squatKg ? Number(squatKg) : undefined,
    bench_kg: benchKg ? Number(benchKg) : undefined,
    deadlift_kg: deadliftKg ? Number(deadliftKg) : undefined,
    overhead_press_kg: overheadKg ? Number(overheadKg) : undefined,
    target_time_sec: targetTimeSec ? Number(targetTimeSec) : (categoryDetails.targetTime ?? undefined),
    target_time_label: targetTimeLabel || undefined,
  };
  const hasTargets = [squatKg, benchKg, deadliftKg, overheadKg, targetTimeSec].some((s) => s !== "" && Number(s) > 0);
  const hasDetails = Object.keys(categoryDetails).length > 0 && (categoryDetails.targetValue != null || categoryDetails.targetTime != null || categoryDetails.target1RM != null || categoryDetails.distance != null);

  const handleCategoryDetailsUpdate = useCallback((details: GoalDetails) => {
    setCategoryDetails(details);
  }, []);

  const handleGenerate = () => {
    const goalDetailsMerged: GoalDetails = { ...categoryDetails };
    if (targetAchievements.target_time_sec != null) goalDetailsMerged.targetTime = targetAchievements.target_time_sec;
    if (currentBenchmarks?.two_mile_time_sec != null && categoryDetails.currentTime == null) goalDetailsMerged.currentTime = currentBenchmarks.two_mile_time_sec;
    const result = generateGoalRoadmap({
      goalTitle: goalTitle || "My goal",
      category,
      deadline,
      priority,
      constraints: constraints || undefined,
      targetAchievements: hasTargets ? targetAchievements : undefined,
      currentBenchmarks: currentBenchmarks ?? undefined,
      eventDistance: categoryDetails.distance ?? undefined,
      goalDetails: hasDetails || hasTargets ? goalDetailsMerged : undefined,
    });
    onGenerate(result);
  };

  return (
    <div className={`goalInputCard ${className}`}>
      <h3 className="goalInputCardTitle">Goal input</h3>
      <p className="goalInputCardSub">Define your goal and deadline to generate a roadmap.</p>
      <div className="goalInputCardForm">
        <label className="goalInputCardLabel">
          Goal title
          <input
            type="text"
            className="goalInputCardInput"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="e.g. Peak for competition"
          />
        </label>
        <label className="goalInputCardLabel">
          Category
          <select
            className="goalInputCardSelect"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className={`goalInputCardCategorySection ${category ? "goalInputCardCategorySection--visible" : ""}`}>
          <GoalCategoryDetails
            category={category}
            onUpdate={handleCategoryDetailsUpdate}
            currentBenchmarks={currentBenchmarks ?? undefined}
          />
        </div>
        <label className="goalInputCardLabel">
          Deadline
          <input
            type="date"
            className="goalInputCardInput"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>
        <label className="goalInputCardLabel">
          Priority
          <select
            className="goalInputCardSelect"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        {category === "Strength" && (
          <>
            <label className="goalInputCardLabel">
              Target squat (kg)
              <input
                type="number"
                min={0}
                step={2.5}
                className="goalInputCardInput"
                value={squatKg}
                onChange={(e) => setSquatKg(e.target.value)}
                placeholder={currentBenchmarks?.back_squat != null ? `Current: ${currentBenchmarks.back_squat}` : "Target 1RM"}
              />
            </label>
            <label className="goalInputCardLabel">
              Target bench (kg)
              <input
                type="number"
                min={0}
                step={2.5}
                className="goalInputCardInput"
                value={benchKg}
                onChange={(e) => setBenchKg(e.target.value)}
                placeholder={currentBenchmarks?.bench_press != null ? `Current: ${currentBenchmarks.bench_press}` : "Target 1RM"}
              />
            </label>
            <label className="goalInputCardLabel">
              Target deadlift (kg)
              <input
                type="number"
                min={0}
                step={2.5}
                className="goalInputCardInput"
                value={deadliftKg}
                onChange={(e) => setDeadliftKg(e.target.value)}
                placeholder={currentBenchmarks?.deadlift != null ? `Current: ${currentBenchmarks.deadlift}` : "Target 1RM"}
              />
            </label>
            <label className="goalInputCardLabel">
              Target overhead (kg)
              <input
                type="number"
                min={0}
                step={2.5}
                className="goalInputCardInput"
                value={overheadKg}
                onChange={(e) => setOverheadKg(e.target.value)}
                placeholder={currentBenchmarks?.overhead_press != null ? `Current: ${currentBenchmarks.overhead_press}` : "Target 1RM"}
              />
            </label>
          </>
        )}
        {(category === "Endurance" || category === "Marathon") && (
          <>
            <label className="goalInputCardLabel">
              Target time (seconds)
              <input
                type="number"
                min={0}
                className="goalInputCardInput"
                value={targetTimeSec}
                onChange={(e) => setTargetTimeSec(e.target.value)}
                placeholder={currentBenchmarks?.two_mile_time_sec != null ? `Current: ${currentBenchmarks.two_mile_time_sec}s` : "e.g. 600"}
              />
            </label>
            <label className="goalInputCardLabel">
              Time label (optional)
              <input
                type="text"
                className="goalInputCardInput"
                value={targetTimeLabel}
                onChange={(e) => setTargetTimeLabel(e.target.value)}
                placeholder="e.g. 2-mile run"
              />
            </label>
          </>
        )}
        <label className="goalInputCardLabel goalInputCardLabelFull">
          Constraints (optional)
          <textarea
            className="goalInputCardTextarea"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="Injury considerations, schedule limits, etc."
            rows={2}
          />
        </label>
      </div>
      <button type="button" className="goalInputCardBtn" onClick={handleGenerate}>
        Generate roadmap
      </button>
      <style jsx>{`
        .goalInputCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .goalInputCard:hover {
          box-shadow: 0 0 28px rgba(47, 128, 237, 0.22), 0 0 56px rgba(39, 224, 166, 0.12), 0 20px 60px rgba(0, 0, 0, 0.4);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .goalInputCardTitle {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .goalInputCardSub {
          font-size: 14px;
          opacity: 0.8;
          margin: 0 0 20px;
          line-height: 1.45;
        }
        .goalInputCardForm {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .goalInputCardLabel {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          opacity: 0.9;
        }
        .goalInputCardLabelFull {
          grid-column: 1 / -1;
        }
        .goalInputCardCategorySection {
          grid-column: 1 / -1;
          overflow: hidden;
          opacity: 0;
          max-height: 0;
          transition: opacity 0.3s ease, max-height 0.35s ease;
        }
        .goalInputCardCategorySection--visible {
          opacity: 1;
          max-height: 400px;
        }
        .goalInputCardCategorySection--visible > :global(div) {
          margin-bottom: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: inset 0 0 24px rgba(39, 224, 166, 0.04);
          padding: 16px 20px;
        }
        .goalInputCardInput,
        .goalInputCardSelect {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
        }
        .goalInputCardTextarea {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
          resize: vertical;
          min-height: 60px;
        }
        .goalInputCardInput:focus,
        .goalInputCardSelect:focus,
        .goalInputCardTextarea:focus {
          outline: none;
          border-color: rgba(47, 128, 237, 0.5);
        }
        .goalInputCardBtn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #2f80ed, rgba(39, 224, 166, 0.9));
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: box-shadow 0.3s ease, transform 0.2s ease;
        }
        .goalInputCardBtn:hover {
          box-shadow: 0 0 20px rgba(47, 128, 237, 0.4), 0 0 36px rgba(39, 224, 166, 0.3);
          transform: scale(1.02);
        }
        @media (max-width: 600px) {
          .goalInputCardForm {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
```

## app/components/GoalProjectionChart.tsx

```tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import type { Phase, Milestone } from "@/lib/goalEngine";
import type { KpiSuggestion } from "@/lib/goalEngine";
import { formatToHHMMSS } from "@/lib/timeFormatter";
import type { MilestoneProgressEntry } from "@/lib/strategyStore";

export type MilestoneStatus = "completed" | "on-track" | "at-risk" | "behind";

export type GoalProjectionChartProps = {
  totalWeeks: number;
  phases: Phase[];
  milestones: Milestone[];
  primaryKpi: KpiSuggestion;
  milestoneProgress?: MilestoneProgressEntry[];
  className?: string;
};

function getPhaseAtWeek(phases: Phase[], week: number): Phase | null {
  for (const p of phases) {
    if (week >= p.startWeek && week <= p.endWeek) return p;
  }
  return null;
}

const MILESTONE_STATUS_COLORS: Record<MilestoneStatus, { fill: string; stroke: string }> = {
  completed: { fill: "rgba(39, 224, 166, 0.35)", stroke: "rgba(39, 224, 166, 0.95)" },
  "on-track": { fill: "rgba(47, 128, 237, 0.3)", stroke: "rgba(47, 128, 237, 0.95)" },
  "at-risk": { fill: "rgba(245, 158, 11, 0.35)", stroke: "rgba(245, 158, 11, 0.95)" },
  behind: { fill: "rgba(239, 68, 68, 0.35)", stroke: "rgba(239, 68, 68, 0.95)" },
};

function getMilestoneStatus(
  m: Milestone,
  targetVal: number,
  progress: MilestoneProgressEntry | undefined,
  isTime: boolean
): MilestoneStatus {
  if (!progress) return "on-track";
  if (progress.completed) return "completed";
  const dev = progress.deviation ?? 0;
  if (dev > 10) return "behind";
  if (dev > 0) return "at-risk";
  return "on-track";
}

function deviationRecommendation(deviation: number, isTime: boolean): string {
  if (deviation > 15) return "Consider extending timeline or reducing target for next block.";
  if (deviation > 10) return "Add recovery microcycle; consider delaying peak by 1 week.";
  if (deviation > 5) return "Monitor next milestone closely; maintain current progression.";
  return "On track; maintain plan.";
}

export default function GoalProjectionChart({
  totalWeeks,
  phases,
  milestones,
  primaryKpi,
  milestoneProgress = [],
  className = "",
}: GoalProjectionChartProps) {
  const [hoverNode, setHoverNode] = useState<{
    week: number;
    value: number;
    percent: number;
    phase: Phase | null;
    actualValue?: number;
    deviation?: number;
    status: MilestoneStatus;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentVal = primaryKpi.currentValue ?? primaryKpi.targetValue - primaryKpi.ratePerWeek * totalWeeks;
  const targetVal = primaryKpi.targetValue;
  const isTime = primaryKpi.unit === "sec";

  const progressByMilestone = useMemo(() => {
    const map = new Map<string, MilestoneProgressEntry>();
    milestoneProgress.forEach((p) => map.set(p.milestoneId, p));
    return map;
  }, [milestoneProgress]);

  const points = useMemo(() => {
    const out: { week: number; value: number }[] = [];
    for (let w = 0; w <= totalWeeks; w++) {
      const t = totalWeeks <= 0 ? 1 : w / totalWeeks;
      const value = currentVal + (targetVal - currentVal) * t;
      out.push({ week: w, value });
    }
    return out;
  }, [totalWeeks, currentVal, targetVal]);

  const milestonePoints = useMemo(() => {
    return milestones.map((m) => {
      const t = totalWeeks <= 0 ? 1 : m.week / totalWeeks;
      const value = currentVal + (targetVal - currentVal) * t;
      const phase = getPhaseAtWeek(phases, m.week);
      const progress = progressByMilestone.get(m.id);
      const status = getMilestoneStatus(m, value, progress, isTime);
      return { ...m, value, phase, progress, status };
    });
  }, [milestones, phases, totalWeeks, currentVal, targetVal, progressByMilestone]);

  const w = 700;
  const h = 260;
  const pad = { top: 24, right: 20, bottom: 32, left: 48 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const minY = Math.min(currentVal, targetVal) - (Math.abs(targetVal - currentVal) * 0.1) || 0;
  const maxY = Math.max(currentVal, targetVal) + (Math.abs(targetVal - currentVal) * 0.1) || 1;
  const range = maxY - minY || 1;

  const toX = (week: number) => pad.left + (week / Math.max(totalWeeks, 1)) * innerW;
  const toY = (v: number) => pad.top + innerH - ((v - minY) / range) * innerH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.week)} ${toY(p.value)}`)
    .join(" ");

  const weeklyImprovement = primaryKpi.ratePerWeek;

  if (totalWeeks < 1) return null;

  return (
    <div className={`goalProjectionChart ${className}`}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="goalProjectionSvg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="goalProjLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(47, 128, 237, 0.95)" />
            <stop offset="100%" stopColor="rgba(39, 224, 166, 0.95)" />
          </linearGradient>
          <filter id="goalProjGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0.25, 0.5, 0.75].map((q) => (
          <line
            key={q}
            x1={pad.left}
            y1={pad.top + innerH * (1 - q)}
            x2={w - pad.right}
            y2={pad.top + innerH * (1 - q)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ))}
        {[0, 0.33, 0.66, 1].map((q) => (
          <line
            key={q}
            x1={pad.left + innerW * q}
            y1={pad.top}
            x2={pad.left + innerW * q}
            y2={pad.top + innerH}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ))}
        <path
          d={pathD}
          fill="none"
          stroke="url(#goalProjLineGrad)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#goalProjGlow)"
          opacity={mounted ? 1 : 0}
          style={{ transition: "opacity 0.8s ease" }}
        />
        {milestonePoints.map((m) => {
          const isHover = hoverNode?.week === m.week;
          const colors = MILESTONE_STATUS_COLORS[m.status];
          return (
            <g
              key={m.id}
              onMouseEnter={() =>
                setHoverNode({
                  week: m.week,
                  value: m.value,
                  percent: m.percent,
                  phase: m.phase ?? null,
                  actualValue: m.progress?.actualValue,
                  deviation: m.progress?.deviation,
                  status: m.status,
                })
              }
              onMouseLeave={() => setHoverNode(null)}
              style={{ cursor: "pointer" }}
            >
              <title>{m.label} — Week {m.week} ({m.status})</title>
              <circle
                cx={toX(m.week)}
                cy={toY(m.value)}
                r={isHover ? 8 : 6}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={1.5}
                filter="url(#goalProjGlow)"
              />
            </g>
          );
        })}
        <line x1={pad.left} y1={pad.top + innerH} x2={w - pad.right} y2={pad.top + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <text x={pad.left - 8} y={pad.top + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.5)">
          {primaryKpi.name}
        </text>
        {[minY, (minY + maxY) / 2, maxY].map((v) => (
          <text key={v} x={pad.left - 8} y={toY(v) + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.45)">
            {isTime ? formatToHHMMSS(v) : v.toFixed(1)}
          </text>
        ))}
      </svg>
      {hoverNode && (
        <div className="goalProjectionPopup">
          <div className="goalProjectionPopupRow">
            <span className="goalProjectionPopupLabel">Milestone</span>
            <span className="goalProjectionPopupValue">{hoverNode.percent}%</span>
          </div>
          <div className="goalProjectionPopupRow">
            <span className="goalProjectionPopupLabel">Target</span>
            <span className="goalProjectionPopupValue">{isTime ? formatToHHMMSS(hoverNode.value) : hoverNode.value.toFixed(1)}</span>
          </div>
          {hoverNode.actualValue != null && (
            <>
              <div className="goalProjectionPopupRow">
                <span className="goalProjectionPopupLabel">Actual</span>
                <span className="goalProjectionPopupValue">{isTime ? formatToHHMMSS(hoverNode.actualValue) : hoverNode.actualValue.toFixed(1)}</span>
              </div>
              {hoverNode.deviation != null && (
                <div className="goalProjectionPopupRow">
                  <span className="goalProjectionPopupLabel">% deviation</span>
                  <span className="goalProjectionPopupValue">{hoverNode.deviation > 0 ? "+" : ""}{hoverNode.deviation.toFixed(1)}%</span>
                </div>
              )}
              {hoverNode.deviation != null && (
                <div className="goalProjectionPopupRow goalProjectionPopupRecommendation">
                  <span className="goalProjectionPopupLabel">Adjustment</span>
                  <span className="goalProjectionPopupValue">{deviationRecommendation(hoverNode.deviation, isTime)}</span>
                </div>
              )}
            </>
          )}
          {hoverNode.actualValue == null && (
            <div className="goalProjectionPopupRow">
              <span className="goalProjectionPopupLabel">Weekly improvement</span>
              <span className="goalProjectionPopupValue">
                {isTime ? (weeklyImprovement < 0 ? "" : "-") + formatToHHMMSS(Math.abs(weeklyImprovement)) : (weeklyImprovement >= 0 ? "+" : "") + weeklyImprovement.toFixed(2)} {primaryKpi.unit}/wk
              </span>
            </div>
          )}
          {hoverNode.phase && (
            <div className="goalProjectionPopupRow">
              <span className="goalProjectionPopupLabel">Phase</span>
              <span className="goalProjectionPopupValue">{hoverNode.phase.name}</span>
            </div>
          )}
        </div>
      )}
      <style jsx>{`
        .goalProjectionChart {
          position: relative;
          background: rgba(0, 0, 0, 0.15);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 24px rgba(39, 224, 166, 0.06);
        }
        .goalProjectionSvg {
          display: block;
        }
        .goalProjectionPopup {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(17, 24, 39, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 14px 16px;
          min-width: 180px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 24px rgba(39, 224, 166, 0.12);
          z-index: 5;
        }
        .goalProjectionPopupRow {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 8px;
        }
        .goalProjectionPopupRow:last-child {
          margin-bottom: 0;
        }
        .goalProjectionPopupLabel {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.65;
        }
        .goalProjectionPopupValue {
          font-size: 12px;
          font-weight: 600;
          color: rgba(39, 224, 166, 0.95);
        }
        .goalProjectionPopupRecommendation .goalProjectionPopupValue {
          font-size: 11px;
          font-weight: 500;
          max-width: 200px;
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
```

## app/components/InjuryStatusPanel.tsx

```tsx
"use client";

import { useState, useEffect } from "react";
import type { InjuryStatus } from "@/lib/strategyStore";

export type InjuryStatusPanelProps = {
  injuryStatus?: InjuryStatus | null;
  onChange: (status: InjuryStatus | null) => void;
  className?: string;
};

const SEVERITIES: { value: "low" | "moderate" | "high"; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

export default function InjuryStatusPanel({
  injuryStatus,
  onChange,
  className = "",
}: InjuryStatusPanelProps) {
  const [active, setActive] = useState(!!injuryStatus?.active);
  const [type, setType] = useState(injuryStatus?.type ?? "");
  const [severity, setSeverity] = useState<"low" | "moderate" | "high">(injuryStatus?.severity ?? "moderate");
  const [notes, setNotes] = useState(injuryStatus?.limitationNotes ?? "");

  useEffect(() => {
    setActive(!!injuryStatus?.active);
    setType(injuryStatus?.type ?? "");
    setSeverity(injuryStatus?.severity ?? "moderate");
    setNotes(injuryStatus?.limitationNotes ?? "");
  }, [injuryStatus]);

  const apply = (a: boolean, t: string, s: "low" | "moderate" | "high", n: string) => {
    if (!a) {
      onChange(null);
      return;
    }
    onChange({ active: true, type: t || undefined, severity: s, limitationNotes: n || undefined });
  };

  const handleActiveChange = (v: boolean) => {
    setActive(v);
    apply(v, type, severity, notes);
  };

  const handleTypeChange = (v: string) => {
    setType(v);
    apply(active, v, severity, notes);
  };

  const handleSeverityChange = (v: "low" | "moderate" | "high") => {
    setSeverity(v);
    apply(active, type, v, notes);
  };

  const handleNotesChange = (v: string) => {
    setNotes(v);
    apply(active, type, severity, v);
  };

  return (
    <div className={`injuryStatusPanel ${className}`}>
      <h3 className="injuryStatusPanelTitle">Injury status</h3>
      <p className="injuryStatusPanelSub">When active, roadmap extends foundation and flags high-load weeks.</p>
      <div className="injuryStatusPanelForm">
        <label className="injuryStatusPanelRow">
          <span className="injuryStatusPanelLabel">Injury active</span>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            className={`injuryStatusPanelToggle ${active ? "on" : ""}`}
            onClick={() => handleActiveChange(!active)}
          >
            <span className="injuryStatusPanelToggleThumb" />
          </button>
        </label>
        {active && (
          <>
            <label className="injuryStatusPanelField">
              <span className="injuryStatusPanelLabel">Injury type</span>
              <input
                type="text"
                className="injuryStatusPanelInput"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
                placeholder="e.g. Lower back, knee"
              />
            </label>
            <label className="injuryStatusPanelField">
              <span className="injuryStatusPanelLabel">Severity</span>
              <select
                className="injuryStatusPanelSelect"
                value={severity}
                onChange={(e) => handleSeverityChange(e.target.value as "low" | "moderate" | "high")}
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="injuryStatusPanelField injuryStatusPanelFieldFull">
              <span className="injuryStatusPanelLabel">Notes</span>
              <textarea
                className="injuryStatusPanelTextarea"
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Limitations, modifications..."
                rows={2}
              />
            </label>
          </>
        )}
      </div>
      <style jsx>{`
        .injuryStatusPanel {
          padding: 24px 28px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
        }
        .injuryStatusPanelTitle {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin: 0 0 6px;
          color: #fff;
        }
        .injuryStatusPanelSub {
          font-size: 11px;
          opacity: 0.65;
          margin: 0 0 20px;
          line-height: 1.4;
        }
        .injuryStatusPanelForm {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .injuryStatusPanelRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .injuryStatusPanelField {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .injuryStatusPanelFieldFull {
          grid-column: 1 / -1;
        }
        .injuryStatusPanelLabel {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .injuryStatusPanelInput,
        .injuryStatusPanelSelect,
        .injuryStatusPanelTextarea {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 13px;
        }
        .injuryStatusPanelTextarea {
          resize: vertical;
          min-height: 56px;
        }
        .injuryStatusPanelToggle {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          position: relative;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .injuryStatusPanelToggle.on {
          background: rgba(239, 68, 68, 0.35);
          border-color: rgba(239, 68, 68, 0.5);
        }
        .injuryStatusPanelToggleThumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          transition: transform 0.2s ease;
        }
        .injuryStatusPanelToggle.on .injuryStatusPanelToggleThumb {
          transform: translateX(20px);
        }
      `}</style>
    </div>
  );
}
```

## app/components/LogMacrosModal.tsx

```tsx
"use client";

import { useState, useEffect } from "react";
import { saveMacroLog } from "@/lib/nutritionStore";
import type { DailyMacroLog } from "@/lib/nutritionStore";

export type LogMacrosModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LogMacrosModal({
  isOpen,
  onClose,
  onSaved,
}: LogMacrosModalProps) {
  const [date, setDate] = useState(todayStr());
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [calories, setCalories] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(todayStr());
      setProtein("");
      setCarbs("");
      setFats("");
      setCalories("");
      setShowSaved(false);
    }
  }, [isOpen]);

  const p = parseFloat(protein) || 0;
  const c = parseFloat(carbs) || 0;
  const f = parseFloat(fats) || 0;
  const computedCal = p * 4 + c * 4 + f * 9;
  const displayCalories = calories.trim() !== "" ? parseFloat(calories) || 0 : Math.round(computedCal);

  const handleSave = () => {
    const log: DailyMacroLog = {
      date,
      protein: Math.round(p),
      carbs: Math.round(c),
      fats: Math.round(f),
      calories: displayCalories || Math.round(computedCal),
    };
    saveMacroLog(log);
    setShowSaved(true);
    onSaved();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="logMacrosBackdrop" onClick={onClose}>
      <div className="logMacrosModal" onClick={(e) => e.stopPropagation()}>
        <div className="logMacrosModalHeader">
          <span className="logMacrosModalTitle">Log macros</span>
          <button type="button" className="logMacrosModalClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="logMacrosModalBody">
          {showSaved && (
            <div className="logMacrosDataUpdated" role="status">
              Data Updated
            </div>
          )}
          <label className="logMacrosLabel">
            Date
            <input
              type="date"
              className="logMacrosInput"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="logMacrosLabel">
            Protein (g)
            <input
              type="number"
              className="logMacrosInput"
              min={0}
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </label>
          <label className="logMacrosLabel">
            Carbs (g)
            <input
              type="number"
              className="logMacrosInput"
              min={0}
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />
          </label>
          <label className="logMacrosLabel">
            Fats (g)
            <input
              type="number"
              className="logMacrosInput"
              min={0}
              value={fats}
              onChange={(e) => setFats(e.target.value)}
            />
          </label>
          <label className="logMacrosLabel">
            Calories (kcal) — leave blank to auto-calc
            <input
              type="number"
              className="logMacrosInput"
              min={0}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder={String(Math.round(computedCal))}
            />
          </label>
          <div className="logMacrosActions">
            <button type="button" className="logMacrosCancel" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="logMacrosSave" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .logMacrosBackdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 48px;
          z-index: 10002;
        }
        .logMacrosModal {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(30, 41, 59, 0.98));
          border-radius: 16px;
          overflow: hidden;
          max-width: 420px;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(47, 128, 237, 0.15);
        }
        .logMacrosModalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .logMacrosModalTitle {
          font-size: 16px;
          font-weight: 600;
        }
        .logMacrosModalClose {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.8;
          line-height: 1;
        }
        .logMacrosModalClose:hover {
          opacity: 1;
        }
        .logMacrosModalBody {
          padding: 18px 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .logMacrosDataUpdated {
          padding: 10px 14px;
          background: rgba(39, 224, 166, 0.15);
          border: 1px solid rgba(39, 224, 166, 0.4);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #27e0a6;
          text-align: center;
          animation: logMacrosGlow 0.6s ease-out;
        }
        @keyframes logMacrosGlow {
          0% {
            box-shadow: 0 0 0 rgba(39, 224, 166, 0);
          }
          50% {
            box-shadow: 0 0 24px rgba(39, 224, 166, 0.5);
          }
          100% {
            box-shadow: 0 0 12px rgba(39, 224, 166, 0.2);
          }
        }
        .logMacrosLabel {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          opacity: 0.9;
        }
        .logMacrosInput {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: white;
          font-size: 14px;
        }
        .logMacrosInput:focus {
          outline: none;
          border-color: rgba(47, 128, 237, 0.5);
        }
        .logMacrosActions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .logMacrosCancel {
          flex: 1;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }
        .logMacrosCancel:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .logMacrosSave {
          flex: 1;
          padding: 10px 16px;
          background: #2f80ed;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .logMacrosSave:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}
```

## app/components/MacroSummaryCards.tsx

```tsx
"use client";

export type MacroSummary = {
  label: string;
  sevenDayAvg: number;
  percentChangeVsPrevious7: number;
  unit: string;
};

export type MacroSummaryCardsProps = {
  summaries: MacroSummary[];
  className?: string;
};

function glowClass(percentChange: number): "green" | "blue" | "amber" {
  if (percentChange > 5) return "green";
  if (percentChange < -8 || percentChange > 15) return "amber";
  return "blue";
}

export default function MacroSummaryCards({
  summaries,
  className = "",
}: MacroSummaryCardsProps) {
  return (
    <div className={`macroSummaryCards ${className}`}>
      {summaries.map((s) => {
        const glow = glowClass(s.percentChangeVsPrevious7);
        return (
          <div
            key={s.label}
            className={`macroSummaryCard macroSummaryCard--${glow}`}
          >
            <div className="macroSummaryLabel">{s.label}</div>
            <div className="macroSummaryAvg">
              {s.sevenDayAvg}
              <span className="macroSummaryUnit">{s.unit}</span>
            </div>
            <div className="macroSummaryChange">
              {s.percentChangeVsPrevious7 >= 0 ? "+" : ""}
              {s.percentChangeVsPrevious7.toFixed(1)}% vs prev 7 days
            </div>
          </div>
        );
      })}
      <style jsx>{`
        .macroSummaryCards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .macroSummaryCard {
          padding: 18px 20px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .macroSummaryCard:hover {
          border-color: rgba(47, 128, 237, 0.25);
          box-shadow: 0 0 24px rgba(47, 128, 237, 0.2), 0 0 48px rgba(39, 224, 166, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .macroSummaryCard--green:hover {
          box-shadow: 0 0 24px rgba(39, 224, 166, 0.35), 0 0 48px rgba(39, 224, 166, 0.15), 0 8px 32px rgba(0, 0, 0, 0.3);
          border-color: rgba(39, 224, 166, 0.3);
        }
        .macroSummaryCard--amber:hover {
          box-shadow: 0 0 24px rgba(245, 158, 11, 0.3), 0 0 48px rgba(245, 158, 11, 0.12), 0 8px 32px rgba(0, 0, 0, 0.3);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .macroSummaryLabel {
          font-size: 11px;
          letter-spacing: 0.08em;
          opacity: 0.75;
          margin-bottom: 8px;
        }
        .macroSummaryAvg {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }
        .macroSummaryUnit {
          font-size: 12px;
          font-weight: 500;
          opacity: 0.7;
          margin-left: 4px;
        }
        .macroSummaryChange {
          font-size: 12px;
          opacity: 0.8;
        }
        .macroSummaryCard--green .macroSummaryChange {
          color: #27e0a6;
        }
        .macroSummaryCard--blue .macroSummaryChange {
          color: #3b82f6;
        }
        .macroSummaryCard--amber .macroSummaryChange {
          color: #f59e0b;
        }
        @media (max-width: 768px) {
          .macroSummaryCards {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
```

## app/components/MilestoneUpdateModal.tsx

```tsx
"use client";

import { useState } from "react";
import type { Milestone } from "@/lib/goalEngine";
import type { MilestoneProgressEntry } from "@/lib/strategyStore";

export type MilestoneUpdateModalProps = {
  milestone: Milestone | null;
  primaryUnit: string;
  isTimeMetric: boolean;
  existingProgress?: MilestoneProgressEntry | null;
  onSave: (actualValue: number, notes: string) => void;
  onClose: () => void;
  className?: string;
};

export default function MilestoneUpdateModal({
  milestone,
  primaryUnit,
  isTimeMetric,
  existingProgress,
  onSave,
  onClose,
  className = "",
}: MilestoneUpdateModalProps) {
  const [actualValue, setActualValue] = useState(
    existingProgress?.actualValue != null ? String(existingProgress.actualValue) : ""
  );
  const [notes, setNotes] = useState("");

  if (!milestone) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = isTimeMetric ? parseFloat(actualValue) : parseFloat(actualValue);
    if (!Number.isFinite(num)) return;
    onSave(num, notes);
    onClose();
  };

  return (
    <div className={`milestoneUpdateModalOverlay ${className}`} onClick={onClose} role="dialog" aria-modal="true">
      <div className="milestoneUpdateModal" onClick={(e) => e.stopPropagation()}>
        <h3 className="milestoneUpdateModalTitle">Update milestone — {milestone.label}</h3>
        <p className="milestoneUpdateModalWeek">Week {milestone.week}</p>
        <form onSubmit={handleSubmit} className="milestoneUpdateModalForm">
          <label className="milestoneUpdateModalField">
            <span className="milestoneUpdateModalLabel">Actual performance ({primaryUnit})</span>
            <input
              type={isTimeMetric ? "number" : "number"}
              step={isTimeMetric ? 1 : 0.1}
              className="milestoneUpdateModalInput"
              value={actualValue}
              onChange={(e) => setActualValue(e.target.value)}
              placeholder={isTimeMetric ? "Seconds" : "Value"}
              required
            />
          </label>
          <label className="milestoneUpdateModalField">
            <span className="milestoneUpdateModalLabel">Notes</span>
            <textarea
              className="milestoneUpdateModalTextarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
            />
          </label>
          <div className="milestoneUpdateModalActions">
            <button type="button" className="milestoneUpdateModalBtn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="milestoneUpdateModalBtn primary" disabled={!actualValue.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .milestoneUpdateModalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 24px;
        }
        .milestoneUpdateModal {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(30, 41, 59, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 28px 32px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), 0 0 24px rgba(39, 224, 166, 0.1);
        }
        .milestoneUpdateModalTitle {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 4px;
          color: #fff;
        }
        .milestoneUpdateModalWeek {
          font-size: 11px;
          opacity: 0.65;
          margin: 0 0 20px;
        }
        .milestoneUpdateModalForm {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .milestoneUpdateModalField {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .milestoneUpdateModalLabel {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .milestoneUpdateModalInput,
        .milestoneUpdateModalTextarea {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
        }
        .milestoneUpdateModalTextarea {
          resize: vertical;
          min-height: 56px;
        }
        .milestoneUpdateModalActions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }
        .milestoneUpdateModalBtn {
          padding: 10px 18px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: opacity 0.2s ease, box-shadow 0.2s ease;
        }
        .milestoneUpdateModalBtn.secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.9);
        }
        .milestoneUpdateModalBtn.primary {
          background: rgba(39, 224, 166, 0.25);
          border: 1px solid rgba(39, 224, 166, 0.4);
          color: #fff;
        }
        .milestoneUpdateModalBtn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
```

## app/components/NutritionMacroChart.tsx

```tsx
"use client";

import { useState, useMemo } from "react";

const BLUE = "#3b82f6";
const GREEN = "#22c55e";
const ORANGE = "#f97316";
const PURPLE = "#a855f7";

type MacroKey = "protein" | "carbs" | "fats" | "calories";

const MACRO_COLORS: Record<MacroKey, string> = {
  protein: BLUE,
  carbs: GREEN,
  fats: ORANGE,
  calories: PURPLE,
};

export type MacroDay = {
  date: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
};

function last30Days(): MacroDay[] {
  const out: MacroDay[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const base = 50 + (i % 7) * 5 + Math.sin(i * 0.4) * 15;
    out.push({
      date: d.toISOString().slice(0, 10),
      protein: Math.round(80 + Math.sin(i * 0.3) * 25),
      carbs: Math.round(Math.max(150, base + 120 + Math.cos(i * 0.5) * 40)),
      fats: Math.round(55 + Math.sin(i * 0.35) * 15),
      calories: Math.round(1800 + Math.sin(i * 0.25) * 250),
    });
  }
  return out;
}

function smoothPath(
  points: { x: number; y: number }[],
  tension: number
): string {
  if (points.length < 2) return "";
  const t = tension;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 2] ?? points[i - 1];
    const p1 = points[i - 1];
    const p2 = points[i];
    const p3 = points[i + 1] ?? points[i];
    const cp1x = p1.x + (p2.x - p0.x) / 6 * t;
    const cp1y = p1.y + (p2.y - p0.y) / 6 * t;
    const cp2x = p2.x - (p3.x - p1.x) / 6 * t;
    const cp2y = p2.y - (p3.y - p1.y) / 6 * t;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export type NutritionMacroChartProps = {
  data?: MacroDay[];
  className?: string;
};

export default function NutritionMacroChart({
  data: propData,
  className = "",
}: NutritionMacroChartProps) {
  const data = propData ?? last30Days();
  const [visible, setVisible] = useState<Record<MacroKey, boolean>>({
    protein: true,
    carbs: true,
    fats: true,
    calories: true,
  });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    day: MacroDay;
    index: number;
  } | null>(null);

  const w = 700;
  const h = 280;
  const pad = { top: 20, right: 16, bottom: 36, left: 44 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const { paths, areas, toX, toY, minY, maxY } = useMemo(() => {
    const allVals = data.flatMap((d) => [d.protein, d.carbs, d.fats, d.calories]);
    const minY = Math.min(...allVals, 0) - 20;
    const maxY = Math.max(...allVals, 2500) + 100;
    const range = maxY - minY || 1;
    const n = data.length;
    const toX = (i: number) => pad.left + (i / Math.max(n - 1, 1)) * innerW;
    const toY = (v: number) =>
      pad.top + innerH - ((v - minY) / range) * innerH;

    const keys: MacroKey[] = ["protein", "carbs", "fats", "calories"];
    const paths: Record<MacroKey, string> = {} as Record<MacroKey, string>;
    const areas: Record<MacroKey, string> = {} as Record<MacroKey, string>;

    keys.forEach((key) => {
      const points = data.map((d, i) => ({ x: toX(i), y: toY(d[key]) }));
      paths[key] = smoothPath(points, 0.4);
      const bottom = pad.top + innerH;
      areas[key] = `${paths[key]} L ${toX(n - 1)} ${bottom} L ${toX(0)} ${bottom} Z`;
    });

    return { paths, areas, toX, toY, minY, maxY };
  }, [data]);

  const toggle = (k: MacroKey) =>
    setVisible((v) => ({ ...v, [k]: !v[k] }));

  return (
    <div className={`nutritionMacroChart ${className}`}>
      <div className="nutritionMacroCard">
        <h3 className="nutritionMacroTitle">Macro intake (last 30 days)</h3>
        <div className="nutritionMacroLegend">
          {(["protein", "carbs", "fats", "calories"] as MacroKey[]).map(
            (key) => (
              <button
                key={key}
                type="button"
                className={`nutritionMacroLegendBtn ${visible[key] ? "on" : "off"}`}
                onClick={() => toggle(key)}
                style={{
                  borderColor: visible[key] ? MACRO_COLORS[key] : "rgba(255,255,255,0.2)",
                  color: visible[key] ? MACRO_COLORS[key] : "rgba(255,255,255,0.5)",
                }}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            )
          )}
        </div>
        <div
          className="nutritionMacroChartWrap"
          onMouseLeave={() => setTooltip(null)}
        >
          <svg
            width="100%"
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            className="nutritionMacroSvg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {(["protein", "carbs", "fats", "calories"] as MacroKey[]).map(
                (key) => (
                  <linearGradient
                    key={key}
                    id={`macroGrad-${key}`}
                    x1="0"
                    y1="1"
                    x2="0"
                    y2="0"
                  >
                    <stop offset="0%" stopColor={MACRO_COLORS[key]} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={MACRO_COLORS[key]} stopOpacity="0" />
                  </linearGradient>
                )
              )}
              {(["protein", "carbs", "fats", "calories"] as MacroKey[]).map(
                (key) => (
                  <filter
                    key={key}
                    id={`macroGlow-${key}`}
                    x="-30%"
                    y="-30%"
                    width="160%"
                    height="160%"
                  >
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                )
              )}
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const v = minY + (maxY - minY) * frac;
              const y = pad.top + innerH - ((v - minY) / (maxY - minY)) * innerH;
              return (
                <line
                  key={frac}
                  x1={pad.left}
                  y1={y}
                  x2={w - pad.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}
            {(["protein", "carbs", "fats", "calories"] as MacroKey[]).map(
              (key) =>
                visible[key] && (
                  <g key={key}>
                    <path
                      d={areas[key]}
                      fill={`url(#macroGrad-${key})`}
                    />
                    <path
                      d={paths[key]}
                      fill="none"
                      stroke={MACRO_COLORS[key]}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={`url(#macroGlow-${key})`}
                    />
                    {data.map((d, i) => (
                      <circle
                        key={i}
                        cx={pad.left + (i / Math.max(data.length - 1, 1)) * innerW}
                        cy={
                          pad.top +
                          innerH -
                          ((d[key] - minY) / (maxY - minY)) * innerH
                        }
                        r={3}
                        fill={MACRO_COLORS[key]}
                        filter={`url(#macroGlow-${key})`}
                        style={{ pointerEvents: "none" }}
                      />
                    ))}
                  </g>
                )
            )}
            <line
              x1={pad.left}
              y1={pad.top + innerH}
              x2={w - pad.right}
              y2={pad.top + innerH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <line
              x1={pad.left}
              y1={pad.top}
              x2={pad.left}
              y2={pad.top + innerH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <text
              x={pad.left - 6}
              y={pad.top + 4}
              textAnchor="end"
              fontSize="11"
              fill="rgba(255,255,255,0.6)"
            >
              (g / kcal)
            </text>
            {data.map((d, i) => (
              <rect
                key={i}
                x={pad.left + (i / Math.max(data.length - 1, 1)) * innerW - 8}
                y={pad.top}
                width={16}
                height={innerH}
                fill="transparent"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const svg = e.currentTarget.ownerSVGElement;
                  if (!svg) return;
                  const pt = svg.createSVGPoint();
                  pt.x = rect.left + rect.width / 2;
                  pt.y = rect.top;
                  const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
                  setTooltip({
                    x: svgP.x,
                    y: svgP.y - 10,
                    day: d,
                    index: i,
                  });
                }}
              />
            ))}
            {tooltip && (
              <g className="nutritionMacroTooltip">
                <rect
                  x={tooltip.x - 72}
                  y={tooltip.y - 58}
                  width={144}
                  height={52}
                  rx={8}
                  fill="rgba(17,24,39,0.98)"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                />
                <text
                  x={tooltip.x}
                  y={tooltip.y - 38}
                  textAnchor="middle"
                  fontSize="11"
                  fill="rgba(255,255,255,0.9)"
                >
                  {new Date(tooltip.day.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </text>
                <text
                  x={tooltip.x}
                  y={tooltip.y - 24}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(255,255,255,0.75)"
                >
                  P {tooltip.day.protein}g · C {tooltip.day.carbs}g · F {tooltip.day.fats}g
                </text>
                <text
                  x={tooltip.x}
                  y={tooltip.y - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(255,255,255,0.75)"
                >
                  {tooltip.day.calories} kcal
                </text>
              </g>
            )}
          </svg>
        </div>
        <div className="nutritionMacroChartX">
          {[0, 7, 14, 21, 28].map((i) => (
            <span key={i}>
              {new Date(data[Math.min(i, data.length - 1)].date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          ))}
        </div>
      </div>
      <style jsx>{`
        .nutritionMacroChart {
          margin-bottom: 24px;
        }
        .nutritionMacroCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px 24px 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .nutritionMacroCard:hover {
          box-shadow: 0 0 28px rgba(47, 128, 237, 0.22), 0 0 56px rgba(39, 224, 166, 0.12), 0 20px 60px rgba(0, 0, 0, 0.4);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .nutritionMacroTitle {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 16px;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .nutritionMacroLegend {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .nutritionMacroLegendBtn {
          padding: 6px 14px;
          border-radius: 10px;
          border: 1px solid;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .nutritionMacroLegendBtn.on:hover {
          filter: brightness(1.15);
        }
        .nutritionMacroLegendBtn.off {
          opacity: 0.6;
        }
        .nutritionMacroChartWrap {
          overflow: hidden;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.25);
        }
        .nutritionMacroSvg {
          display: block;
        }
        .nutritionMacroChartX {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          padding: 0 44px 0 48px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }
        @media (max-width: 768px) {
          .nutritionMacroChartX {
            padding: 0 24px;
          }
        }
      `}</style>
    </div>
  );
}
```

## app/components/OSLayer.tsx

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

const orbStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 32,
  right: 32,
  width: 58,
  height: 58,
  borderRadius: "50%",
  background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
  border: "none",
  color: "#fff",
  fontSize: 18,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10001,
};

const panelStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 100,
  right: 32,
  width: 360,
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "min(500px, 70vh)",
  background: "rgba(15,15,20,0.98)",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  zIndex: 10000,
};

const panelHeaderStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
  letterSpacing: "0.08em",
};

const panelBodyStyle: React.CSSProperties = {
  flex: 1,
  padding: 20,
  overflowY: "auto",
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  padding: "8px 12px",
  fontSize: 18,
};

export default function OSLayer({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  /* ESC key close */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  /* Click outside close */
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, close]);

  return (
    <div className="osLayerRoot" style={{ minHeight: "100vh", width: "100vw", overflowX: "hidden" }}>
      <style>{`
        .osLayerRoot .osLayerBar {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 48px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(12px);
        }
        .osLayerRoot .osLayerBarNav {
          display: flex;
          gap: 32px;
          font-size: 14px;
        }
        .osLayerRoot .osLayerContent {
          padding: 40px 64px;
          width: 100%;
          max-width: 100%;
        }
        @media (max-width: 768px) {
          .osLayerRoot .osLayerBar {
            padding: 0 16px;
            flex-wrap: wrap;
            min-height: 56px;
            height: auto;
            padding-top: 12px;
            padding-bottom: 12px;
          }
          .osLayerRoot .osLayerBarTitle {
            font-size: 11px;
            letter-spacing: 0.08em;
            width: 100%;
            margin-bottom: 8px;
          }
          .osLayerRoot .osLayerBarNav {
            gap: 16px;
            font-size: 13px;
          }
          .osLayerRoot .osLayerContent {
            padding: 20px 16px;
          }
          .osLayerRoot .osLayerFloatingOrb {
            bottom: 16px !important;
            right: 16px !important;
            width: 52px !important;
            height: 52px !important;
            font-size: 16px !important;
          }
        }
      `}</style>
      {/* Top OS Bar */}
      <div className="osLayerBar">
        <div className="osLayerBarTitle" style={{ fontSize: 13, letterSpacing: "0.12em", opacity: 0.6 }}>
          PERFORMANCE PATHFINDER OS
        </div>
        <div className="osLayerBarNav">
          <Link href="/profile" style={navBtn}>Dashboard</Link>
          <button style={navBtn} onClick={toggle}>AI</button>
          <Link href="/settings" style={navBtn}>Settings</Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="osLayerContent">
        {children}
      </div>

      {/* Floating Chat System */}
      <div ref={panelRef}>
        {open && (
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <span>Performance AI</span>
              <button
                type="button"
                style={closeBtnStyle}
                onClick={close}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={panelBodyStyle}>
              <p style={{ margin: 0, opacity: 0.9 }}>
                How can I optimise your performance today?
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          className="osLayerFloatingOrb"
          style={orbStyle}
          onClick={toggle}
          aria-label={open ? "Close" : "Open"}
        >
          {open ? "×" : "✦"}
        </button>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#fff",
  cursor: "pointer",
};
```

## app/components/RoadmapTimeline.tsx

```tsx
"use client";

import { useState } from "react";
import type { Phase, Milestone } from "@/lib/goalEngine";

export type RiskLevel = "green" | "amber" | "red";

export type RoadmapTimelineProps = {
  phases: Phase[];
  milestones: Milestone[];
  totalWeeks: number;
  progressPercent?: number;
  riskHeat?: RiskLevel[];
  className?: string;
};

const RISK_HEAT_COLORS: Record<RiskLevel, string> = {
  green: "rgba(39, 224, 166, 0.06)",
  amber: "rgba(245, 158, 11, 0.08)",
  red: "rgba(239, 68, 68, 0.08)",
};

export default function RoadmapTimeline({
  phases,
  milestones,
  totalWeeks,
  progressPercent = 0,
  riskHeat,
  className = "",
}: RoadmapTimelineProps) {
  const [hoverMilestone, setHoverMilestone] = useState<Milestone | null>(null);

  if (totalWeeks < 1) return null;

  return (
    <div className={`roadmapTimeline ${className}`}>
      <div className="roadmapPhaseLabels">
        {phases.map((phase) => {
          const leftPct = ((phase.startWeek - 1) / totalWeeks) * 100;
          const widthPct = ((phase.endWeek - phase.startWeek + 1) / totalWeeks) * 100;
          return (
            <div
              key={phase.id}
              className="roadmapPhaseLabel"
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            >
              <span>{phase.name}</span>
            </div>
          );
        })}
      </div>

      <div className="roadmapTrackWrap">
        {riskHeat && riskHeat.length >= totalWeeks && (
          <div className="roadmapRiskHeat">
            {riskHeat.slice(0, totalWeeks).map((risk, i) => (
              <div
                key={i}
                className="roadmapRiskSegment"
                style={{
                  left: `${(i / totalWeeks) * 100}%`,
                  width: `${100 / totalWeeks}%`,
                  background: RISK_HEAT_COLORS[risk],
                }}
              />
            ))}
          </div>
        )}
        <div className={`roadmapTrack ${riskHeat && riskHeat.length >= totalWeeks ? "roadmapTrack--withRisk" : ""}`}>
          {phases.slice(0, -1).map((phase) => (
            <div
              key={`div-${phase.id}`}
              className="roadmapDivider"
              style={{ left: `${(phase.endWeek / totalWeeks) * 100}%` }}
            />
          ))}
          <div
            className="roadmapProgress"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>

      <div className="roadmapMilestones">
        {milestones.map((m) => {
          const isHover = hoverMilestone?.id === m.id;
          return (
            <div
              key={m.id}
              className={`roadmapMilestone ${isHover ? "hover" : ""}`}
              style={{ left: `${(m.week / totalWeeks) * 100}%` }}
              onMouseEnter={() => setHoverMilestone(m)}
              onMouseLeave={() => setHoverMilestone(null)}
            >
              <span className="roadmapMilestoneDiamond">◆</span>
              <span className="roadmapMilestonePct">{m.label}</span>
              <span className="roadmapMilestoneWeek">Week {m.week}</span>
              {isHover && (
                <div className="roadmapMilestoneTooltip">{m.targetDescription}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="roadmapAxis">
        <span>Week 1</span>
        <span>Week {totalWeeks}</span>
      </div>

      <style jsx>{`
        .roadmapTimeline {
          padding: 32px 0 16px;
          max-width: 100%;
        }
        .roadmapPhaseLabels {
          position: relative;
          height: 24px;
          margin-bottom: 20px;
        }
        .roadmapPhaseLabel {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          box-sizing: border-box;
        }
        .roadmapPhaseLabel span {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.6;
        }
        .roadmapTrackWrap {
          position: relative;
          height: 4px;
          margin-bottom: 28px;
        }
        .roadmapRiskHeat {
          position: absolute;
          inset: 0;
          display: flex;
          border-radius: 2px;
          overflow: hidden;
          pointer-events: none;
        }
        .roadmapRiskSegment {
          position: absolute;
          top: 0;
          bottom: 0;
          height: 100%;
          transition: background 0.2s ease;
        }
        .roadmapTrack {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 2px;
          box-shadow: 0 0 20px rgba(39, 224, 166, 0.08);
        }
        .roadmapTrack--withRisk {
          background: transparent;
        }
        .roadmapDivider {
          position: absolute;
          top: -6px;
          bottom: -6px;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(39, 224, 166, 0.25), transparent);
          box-shadow: 0 0 12px rgba(39, 224, 166, 0.15);
          transform: translateX(-50%);
          pointer-events: none;
        }
        .roadmapProgress {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(90deg, rgba(47, 128, 237, 0.5), rgba(39, 224, 166, 0.5));
          border-radius: 2px;
          box-shadow: 0 0 16px rgba(39, 224, 166, 0.35);
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .roadmapMilestones {
          position: relative;
          height: 48px;
        }
        .roadmapMilestone {
          position: absolute;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 6px 0 0;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .roadmapMilestone:hover,
        .roadmapMilestone.hover {
          z-index: 2;
        }
        .roadmapMilestoneDiamond {
          font-size: 12px;
          color: rgba(39, 224, 166, 0.95);
          filter: drop-shadow(0 0 8px rgba(39, 224, 166, 0.7));
          animation: roadmapPulse 2.5s ease-in-out infinite;
        }
        .roadmapMilestone.hover .roadmapMilestoneDiamond {
          filter: drop-shadow(0 0 14px rgba(39, 224, 166, 0.9));
        }
        .roadmapMilestonePct {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: rgba(255, 255, 255, 0.9);
        }
        .roadmapMilestoneWeek {
          font-size: 9px;
          letter-spacing: 0.04em;
          opacity: 0.65;
        }
        .roadmapMilestoneTooltip {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(8px);
          background: rgba(17, 24, 39, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 10px 12px;
          min-width: 180px;
          max-width: 240px;
          font-size: 11px;
          line-height: 1.45;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 20px rgba(39, 224, 166, 0.1);
          z-index: 10;
          pointer-events: none;
        }
        .roadmapAxis {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          font-size: 10px;
          letter-spacing: 0.04em;
          opacity: 0.5;
        }
        @keyframes roadmapPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}
```

## app/components/SettingsView.tsx

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type UserPreferences = {
  weight_unit?: "kg" | "lb";
  session_reminders?: boolean;
  weekly_summary_email?: boolean;
  marketing_emails?: boolean;
  product_updates?: boolean;
  sms_notifications?: boolean;
  garmin_connected?: boolean;
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

function NavTab({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href;
  return (
    <Link href={href}>
      <span
        style={{
          fontSize: 14,
          opacity: active ? 1 : 0.6,
          borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
          paddingBottom: 4,
          cursor: "pointer",
        }}
      >
        {label}
      </span>
    </Link>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 2,
        opacity: 0.6,
        marginBottom: 12,
      }}
    >
      {text}
    </div>
  );
}

function SettingsCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="settingsCard">
      <div className="settingsCardHead">
        <div>
          <div className="settingsCardTitle">{title}</div>
          <div className="settingsCardDesc">{description}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function SettingsView() {
  const pathname = usePathname();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMessage = useCallback((type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === "object") setPrefs({ ...DEFAULT_PREFS, ...data });
      })
      .catch(() => setPrefs(DEFAULT_PREFS))
      .finally(() => setLoading(false));
  }, []);

  const updatePref = useCallback(
    async (key: keyof UserPreferences, value: unknown) => {
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      setSaving(key);
      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showMessage("err", (data.error as string) || "Failed to save");
          setPrefs(prefs);
          return;
        }
        showMessage("ok", "Saved");
      } catch {
        showMessage("err", "Failed to save");
        setPrefs(prefs);
      } finally {
        setSaving(null);
      }
    },
    [prefs, showMessage]
  );

  const openStripePortal = useCallback(async () => {
    setSaving("stripe");
    try {
      const res = await fetch("/api/stripe-portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showMessage("err", (data.error as string) || "Could not open billing portal");
        return;
      }
      if (data.url) window.open(data.url, "_blank");
    } catch {
      showMessage("err", "Could not open billing portal");
    } finally {
      setSaving(null);
    }
  }, [showMessage]);

  const connectGarmin = useCallback(async () => {
    setSaving("garmin");
    try {
      const res = await fetch("/api/garmin/connect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.connected) {
        setPrefs((p) => ({ ...p, garmin_connected: true }));
        showMessage("ok", "Garmin connected");
      } else {
        showMessage("err", (data.error as string) || "Could not connect Garmin");
      }
    } catch {
      showMessage("err", "Could not connect Garmin");
    } finally {
      setSaving(null);
    }
  }, [showMessage]);

  const disconnectGarmin = useCallback(async () => {
    setSaving("garmin");
    try {
      const res = await fetch("/api/garmin/disconnect", { method: "POST" });
      if (res.ok) {
        setPrefs((p) => ({ ...p, garmin_connected: false }));
        showMessage("ok", "Garmin disconnected");
      } else {
        const data = await res.json().catch(() => ({}));
        showMessage("err", (data.error as string) || "Could not disconnect");
      }
    } catch {
      showMessage("err", "Could not disconnect");
    } finally {
      setSaving(null);
    }
  }, [showMessage]);

  if (loading) {
    return (
      <div className="settingsOuter">
        <nav className="nav">
          <div className="brand">PERFORMANCE PATHFINDER OS</div>
          <div className="tabs">
            <NavTab href="/" label="Home" pathname={pathname} />
            <NavTab href="/profile" label="Profile" pathname={pathname} />
            <NavTab href="/programme" label="Programme" pathname={pathname} />
            <NavTab href="/tactical" label="Tactical" pathname={pathname} />
            <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
            <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
            <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
            <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
            <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
            <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
            <NavTab href="/settings" label="Settings" pathname={pathname} />
          </div>
        </nav>
        <div className="container" style={{ paddingTop: 80, textAlign: "center", opacity: 0.7 }}>
          Loading settings…
        </div>
        <style jsx>{` .settingsOuter { min-height: 100vh; background: linear-gradient(180deg, #0a0a0f 0%, #0f1117 50%, #0a0a0f 100%); color: #fff; } .nav { display: flex; justify-content: space-between; padding: 20px 40px; border-bottom: 1px solid rgba(255,255,255,0.05); } .brand { font-size: 12px; letter-spacing: 2px; opacity: 0.6; } .tabs { display: flex; gap: 30px; } .container { max-width: 1200px; margin: 0 auto; padding: 0 40px; } `}</style>
      </div>
    );
  }

  return (
    <div className="settingsOuter">
      {message && (
        <div className={`settingsToast ${message.type}`}>
          {message.text}
        </div>
      )}
      <nav className="nav">
        <div className="brand">PERFORMANCE PATHFINDER OS</div>
        <div className="tabs">
          <NavTab href="/" label="Home" pathname={pathname} />
          <NavTab href="/profile" label="Profile" pathname={pathname} />
          <NavTab href="/programme" label="Programme" pathname={pathname} />
          <NavTab href="/tactical" label="Tactical" pathname={pathname} />
          <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
          <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
          <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
          <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
          <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
          <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
          <NavTab href="/settings" label="Settings" pathname={pathname} />
        </div>
      </nav>

      <div className="container">
        <div className="settingsHero sectionBlock delay1">
          <h1 className="settingsPageTitle">Settings</h1>
          <p className="settingsPageSub">
            Manage your profile, subscription, payment methods, preferences, marketing, and connected devices.
          </p>
        </div>

        <div className="sectionBlock delay2">
          <SectionTitle text="PROFILE" />
          <SettingsCard
            title="Profile & identity"
            description="View and edit your performance profile, readiness inputs, and programme identity. Benchmarks and intake live on their own pages."
            action={
              <Link href="/profile" className="settingsCardBtn">
                Open dashboard
              </Link>
            }
          />
        </div>

        <div className="sectionBlock delay3">
          <SectionTitle text="SUBSCRIPTION" />
          <SettingsCard
            title="Plan & billing"
            description="Your current plan, renewal date, and upgrade or cancel options. Invoices and billing history are in the Stripe customer portal."
            action={
              <button
                type="button"
                className="settingsCardBtn"
                onClick={openStripePortal}
                disabled={saving === "stripe"}
              >
                {saving === "stripe" ? "Opening…" : "Manage subscription"}
              </button>
            }
          >
            <div className="settingsCardMeta">
              <span>Active plan</span>
              <span className="settingsCardMetaValue">Performance Pathfinder</span>
            </div>
          </SettingsCard>
        </div>

        <div className="sectionBlock delay4">
          <SectionTitle text="STRIPE GATEWAY" />
          <SettingsCard
            title="Payment methods"
            description="Add or remove payment methods used for your subscription. Secured by Stripe; we never store card details."
            action={
              <button
                type="button"
                className="settingsCardBtn"
                onClick={openStripePortal}
                disabled={saving === "stripe"}
              >
                {saving === "stripe" ? "Opening…" : "Manage payments"}
              </button>
            }
          />
        </div>

        <div className="sectionBlock delay5">
          <SectionTitle text="PREFERENCES" />
          <SettingsCard
            title="Units & notifications"
            description="Choose units (kg/lb), session reminders, and weekly summary email."
          >
            <div className="settingsPrefList">
              <label className="settingsPrefRow">
                <span>Weight units</span>
                <select
                  className="settingsSelect"
                  value={prefs.weight_unit ?? "kg"}
                  onChange={(e) => updatePref("weight_unit", e.target.value as "kg" | "lb")}
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </label>
              <label className="settingsPrefRow">
                <span>Session reminders</span>
                <input
                  type="checkbox"
                  checked={prefs.session_reminders ?? true}
                  onChange={(e) => updatePref("session_reminders", e.target.checked)}
                  className="settingsCheck"
                />
              </label>
              <label className="settingsPrefRow">
                <span>Weekly summary email</span>
                <input
                  type="checkbox"
                  checked={prefs.weekly_summary_email ?? true}
                  onChange={(e) => updatePref("weekly_summary_email", e.target.checked)}
                  className="settingsCheck"
                />
              </label>
            </div>
          </SettingsCard>
        </div>

        <div className="sectionBlock delay6">
          <SectionTitle text="MARKETING PREFERENCES" />
          <SettingsCard
            title="Emails & communications"
            description="Choose whether to receive marketing emails, product updates, and optional SMS. We never sell your data."
          >
            <div className="settingsPrefList">
              <label className="settingsPrefRow">
                <span>Marketing emails (offers, tips)</span>
                <input
                  type="checkbox"
                  checked={prefs.marketing_emails ?? false}
                  onChange={(e) => updatePref("marketing_emails", e.target.checked)}
                  className="settingsCheck"
                />
              </label>
              <label className="settingsPrefRow">
                <span>Product updates & new features</span>
                <input
                  type="checkbox"
                  checked={prefs.product_updates ?? true}
                  onChange={(e) => updatePref("product_updates", e.target.checked)}
                  className="settingsCheck"
                />
              </label>
              <label className="settingsPrefRow">
                <span>SMS notifications</span>
                <input
                  type="checkbox"
                  checked={prefs.sms_notifications ?? false}
                  onChange={(e) => updatePref("sms_notifications", e.target.checked)}
                  className="settingsCheck"
                />
              </label>
            </div>
          </SettingsCard>
        </div>

        <div className="sectionBlock delay7">
          <SectionTitle text="WEARABLE & INTEGRATIONS" />
          <SettingsCard
            title="Garmin Connect"
            description="Sync activities, heart rate, and recovery metrics from Garmin to improve readiness and programme recommendations."
            action={
              prefs.garmin_connected ? (
                <button
                  type="button"
                  className="settingsCardBtn"
                  onClick={disconnectGarmin}
                  disabled={saving === "garmin"}
                >
                  {saving === "garmin" ? "…" : "Disconnect Garmin"}
                </button>
              ) : (
                <button
                  type="button"
                  className="settingsCardBtn settingsCardBtnPrimary"
                  onClick={connectGarmin}
                  disabled={saving === "garmin"}
                >
                  {saving === "garmin" ? "Connecting…" : "Connect Garmin"}
                </button>
              )
            }
          >
            {prefs.garmin_connected && (
              <div className="settingsCardMeta">
                <span>Status</span>
                <span className="settingsCardMetaValue">Connected</span>
              </div>
            )}
          </SettingsCard>
          <SettingsCard
            title="More integrations"
            description="Whoop, Apple Health, Polar, and other wearables are on the roadmap."
            action={<span className="settingsCardBadge muted">Coming soon</span>}
          />
        </div>

        <div className="sectionBlock delay8">
          <SectionTitle text="PRIVACY & ACCOUNT" />
          <SettingsCard
            title="Data & privacy"
            description="Your data is used only to run your programme and improve your experience. Export or delete your data anytime."
          >
            <div className="settingsPrefList">
              <p className="settingsCardMeta" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                Account and programme data are stored securely. To request an export or account deletion, contact support from your profile email.
              </p>
            </div>
          </SettingsCard>
        </div>
      </div>

      <style jsx>{`
        .settingsOuter {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0a0f 0%, #0f1117 50%, #0a0a0f 100%);
          color: #fff;
        }
        .settingsToast {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          z-index: 10002;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .settingsToast.ok {
          background: rgba(39, 224, 166, 0.2);
          border: 1px solid rgba(39, 224, 166, 0.5);
          color: #27E0A6;
        }
        .settingsToast.err {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.5);
          color: #f87171;
        }
        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .brand {
          font-size: 12px;
          letter-spacing: 2px;
          opacity: 0.6;
        }
        .tabs {
          display: flex;
          gap: 30px;
        }
        .container {
          max-width: 1200px;
          margin: 40px auto;
          padding: 0 40px;
        }
        .settingsHero {
          margin-bottom: 48px;
        }
        .settingsPageTitle {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 8px 0;
        }
        .settingsPageSub {
          font-size: 15px;
          opacity: 0.7;
          margin: 0;
          max-width: 560px;
        }
        .sectionBlock {
          margin-bottom: 36px;
          animation: sectionFadeIn 0.5s ease-out backwards;
        }
        .sectionBlock.delay1 { animation-delay: 0.08s; }
        .sectionBlock.delay2 { animation-delay: 0.16s; }
        .sectionBlock.delay3 { animation-delay: 0.24s; }
        .sectionBlock.delay4 { animation-delay: 0.32s; }
        .sectionBlock.delay5 { animation-delay: 0.4s; }
        .sectionBlock.delay6 { animation-delay: 0.48s; }
        .sectionBlock.delay7 { animation-delay: 0.56s; }
        .sectionBlock.delay8 { animation-delay: 0.64s; }
        @keyframes sectionFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .settingsCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px 28px;
          margin-bottom: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        }
        .settingsCardHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }
        .settingsCardTitle {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .settingsCardDesc {
          font-size: 14px;
          opacity: 0.7;
          line-height: 1.45;
          max-width: 520px;
        }
        .settingsCardBtn {
          display: inline-block;
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s, border-color 0.2s;
        }
        .settingsCardBtn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }
        .settingsCardBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .settingsCardBtnPrimary {
          border-color: #2F80ED;
          background: rgba(47, 128, 237, 0.25);
        }
        .settingsCardBtnPrimary:hover:not(:disabled) {
          background: rgba(47, 128, 237, 0.4);
        }
        .settingsCardBadge {
          padding: 8px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 12px;
          font-weight: 500;
          opacity: 0.9;
        }
        .settingsCardBadge.muted {
          opacity: 0.5;
        }
        .settingsCardMeta {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .settingsCardMetaValue {
          font-weight: 600;
          color: #27E0A6;
        }
        .settingsPrefList {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .settingsPrefRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          font-size: 14px;
          cursor: pointer;
        }
        .settingsPrefRow span {
          opacity: 0.9;
        }
        .settingsSelect {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #fff;
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
        }
        .settingsCheck {
          accent-color: #2F80ED;
          cursor: pointer;
        }
        @media (max-width: 768px) {
          .nav { flex-wrap: wrap; padding: 16px; gap: 12px; }
          .tabs { gap: 16px; flex-wrap: wrap; }
          .container { padding: 0 16px; margin: 24px auto; }
          .settingsPageTitle { font-size: 26px; }
          .settingsCardHead { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
```

## app/components/StrategyAdjustmentsPanel.tsx

```tsx
"use client";

import type { StrategyGoal } from "@/lib/strategyStore";
import type { ExecutionProbabilityResult } from "@/lib/goalEngine";
import {
  getStrategicAdjustments,
  type StrategicAdjustment,
  type AdjustmentSource,
} from "@/lib/strategyAdjustmentsEngine";

export type StrategyAdjustmentsPanelProps = {
  goal: StrategyGoal | null;
  execution: ExecutionProbabilityResult | null;
  className?: string;
};

const SOURCE_LABELS: Record<AdjustmentSource, string> = {
  injury: "From your injury & notes",
  notes: "From your constraints",
  deviation: "From your progress",
  risk: "From your timeline & targets",
  load: "From your event & load",
  category: "From your goal type",
};

const SOURCE_ORDER: AdjustmentSource[] = ["injury", "notes", "deviation", "risk", "load", "category"];

function groupBySource(adjustments: StrategicAdjustment[]): Map<AdjustmentSource, StrategicAdjustment[]> {
  const map = new Map<AdjustmentSource, StrategicAdjustment[]>();
  for (const a of adjustments) {
    const list = map.get(a.source) ?? [];
    list.push(a);
    map.set(a.source, list);
  }
  return map;
}

export default function StrategyAdjustmentsPanel({
  goal,
  execution,
  className = "",
}: StrategyAdjustmentsPanelProps) {
  const adjustments = getStrategicAdjustments(goal, execution);
  if (adjustments.length === 0) return null;

  const bySource = groupBySource(adjustments);

  return (
    <div className={`strategyAdjustmentsPanel ${className}`}>
      <h3 className="strategyAdjustmentsPanelTitle">Strategic adjustments</h3>
      <p className="strategyAdjustmentsPanelSub">
        Recommendations derived from your injury notes, constraints, milestone results, and timeline—prioritised so you can act on what matters first.
      </p>
      <div className="strategyAdjustmentsPanelGroups">
        {SOURCE_ORDER.filter((src) => bySource.get(src)?.length).map((source) => (
          <div key={source} className="strategyAdjustmentsPanelGroup">
            <span className="strategyAdjustmentsPanelGroupLabel">{SOURCE_LABELS[source]}</span>
            <ul className="strategyAdjustmentsPanelList">
              {(bySource.get(source) ?? []).map((a) => (
                <li key={a.id} className="strategyAdjustmentsPanelItem">
                  <span className="strategyAdjustmentsPanelItemTitle">{a.title}</span>
                  <p className="strategyAdjustmentsPanelItemRec">{a.recommendation}</p>
                  <p className="strategyAdjustmentsPanelItemRationale">{a.rationale}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <style jsx>{`
        .strategyAdjustmentsPanel {
          padding: 24px 28px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
        }
        .strategyAdjustmentsPanelTitle {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin: 0 0 6px;
          color: #fff;
        }
        .strategyAdjustmentsPanelSub {
          font-size: 11px;
          opacity: 0.7;
          margin: 0 0 20px;
          line-height: 1.5;
        }
        .strategyAdjustmentsPanelGroups {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .strategyAdjustmentsPanelGroup {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .strategyAdjustmentsPanelGroupLabel {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(39, 224, 166, 0.9);
        }
        .strategyAdjustmentsPanelList {
          margin: 0;
          padding-left: 0;
          list-style: none;
        }
        .strategyAdjustmentsPanelItem {
          margin-bottom: 16px;
          padding: 12px 14px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
          border-left: 3px solid rgba(255, 255, 255, 0.12);
        }
        .strategyAdjustmentsPanelItem:last-child {
          margin-bottom: 0;
        }
        .strategyAdjustmentsPanelItemTitle {
          display: block;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #fff;
        }
        .strategyAdjustmentsPanelItemRec {
          font-size: 12px;
          line-height: 1.5;
          margin: 0 0 6px;
          opacity: 0.95;
        }
        .strategyAdjustmentsPanelItemRationale {
          font-size: 11px;
          line-height: 1.45;
          margin: 0;
          opacity: 0.7;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
```

## app/components/StrategyKPIPanel.tsx

```tsx
"use client";

import type { KpiSuggestion } from "@/lib/goalEngine";
import { formatToHHMMSS } from "@/lib/timeFormatter";

export type StrategyKPIPanelProps = {
  kpis: KpiSuggestion[];
  className?: string;
};

function formatKpiValue(value: number, unit: string): string {
  if (unit === "sec") return formatToHHMMSS(value);
  return `${value} ${unit}`;
}

export default function StrategyKPIPanel({
  kpis,
  className = "",
}: StrategyKPIPanelProps) {
  if (kpis.length === 0) return null;

  return (
    <div className={`strategyKPIPanel ${className}`}>
      <h3 className="strategyKPIPanelTitle">Metric targets</h3>
      <div className="strategyKPIPanelGrid">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className={`strategyKPICard strategyKPICard--${kpi.risk}`}
          >
            <div className="strategyKPIName">{kpi.name}</div>
            <div className="strategyKPIValues">
              <span className="strategyKPICurrent">
                {kpi.currentValue != null ? formatKpiValue(kpi.currentValue, kpi.unit) : "—"}
              </span>
              <span className="strategyKPITarget">{formatKpiValue(kpi.targetValue, kpi.unit)}</span>
            </div>
            <div className="strategyKPIRate">
              {kpi.unit === "sec"
                ? (kpi.ratePerWeek >= 0 ? "+" : "−") + formatToHHMMSS(Math.abs(kpi.ratePerWeek)) + " /week"
                : (kpi.ratePerWeek >= 0 ? "+" : "") + kpi.ratePerWeek + " " + kpi.unit + "/week"}
            </div>
            <div className={`strategyKPIRisk strategyKPIRisk--${kpi.risk}`}>
              {kpi.risk === "green" ? "Achievable" : kpi.risk === "amber" ? "Aggressive" : "Unrealistic"}
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .strategyKPIPanel {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .strategyKPIPanel:hover {
          box-shadow: 0 0 28px rgba(47, 128, 237, 0.22), 0 0 56px rgba(39, 224, 166, 0.12), 0 20px 60px rgba(0, 0, 0, 0.4);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .strategyKPIPanelTitle {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 20px;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .strategyKPIPanelGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .strategyKPICard {
          padding: 18px 20px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .strategyKPICard:hover {
          border-color: rgba(47, 128, 237, 0.25);
          box-shadow: 0 0 20px rgba(47, 128, 237, 0.2);
        }
        .strategyKPICard--green:hover {
          box-shadow: 0 0 20px rgba(39, 224, 166, 0.25);
          border-color: rgba(39, 224, 166, 0.3);
        }
        .strategyKPICard--amber:hover {
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .strategyKPICard--red:hover {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .strategyKPIName {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          opacity: 0.9;
          margin-bottom: 10px;
        }
        .strategyKPIValues {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 6px;
        }
        .strategyKPICurrent {
          font-size: 13px;
          opacity: 0.8;
        }
        .strategyKPITarget {
          font-size: 16px;
          font-weight: 700;
          color: #27e0a6;
        }
        .strategyKPIRate {
          font-size: 11px;
          opacity: 0.75;
          margin-bottom: 8px;
        }
        .strategyKPIRisk {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-block;
        }
        .strategyKPIRisk--green {
          background: rgba(39, 224, 166, 0.2);
          color: #27e0a6;
        }
        .strategyKPIRisk--amber {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }
        .strategyKPIRisk--red {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
```

## app/components/UPDEDashboard.tsx

```tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ALL_BENCHMARK_DISPLAY_NAMES } from "@/lib/profile/benchmarkSchema";
import { ALL_OPTION_DISPLAY_NAMES } from "@/lib/profile/benchmarkExerciseOptions";
import { identityLabel } from "@/lib/profile/identityModel";
import RemakerProgressBlock from "@/app/ui/RemakerProgressBlock";
import WeeklyBrief from "@/app/ui/WeeklyBrief";
import ForecastSummary from "@/app/components/ForecastSummary";
import { usePerformanceForecast } from "@/hooks/usePerformanceForecast";
import DecisionLog from "@/app/ui/DecisionLog";
import type { DecisionLogEntry } from "@/app/ui/DecisionLog";
import type { InjuryEntry } from "@/engine/injuryMemoryEngine";
import { getAdvisories } from "@/engine/advisoriesEngine";
import { generateWeeklyBrief } from "@/engine/weeklyBriefGenerator";
import { systemBiasPhrase } from "@/engine/systemBias";
import { getRiskSignals } from "@/engine/riskIndex";
import RiskBadge from "@/app/ui/RiskBadge";
import { PerformanceEngine } from "@/lib/performanceEngine";
import { subscribe as subscribePerformance } from "@/lib/performanceEvents";

type Profile = {
  id: string;
  readiness_score: number;
  aerobic_score: number;
  strength_upper: number;
  strength_lower: number;
  mobility_score: number;
  sleep_score: number;
  primary_limiter: string;
  momentum: string;
  stress_level?: number;
  fatigue_score?: number;
  focus?: string;
  goal?: string;
  current_week?: number;
  days_per_week?: number;
  minutes_per_session?: number;
  checkin_date?: string;
  checkin_readiness?: number;
  checkin_feel?: string;
  checkin_pain?: string;
  checkin_pain_areas?: string;
  checkin_energy?: string;
  checkin_sleep?: string;
  performance_benchmarks?: import("@/lib/profile/benchmarkSchema").PerformanceBenchmarks | null;
  last_session_focus?: string | null;
};

type TodaySession = {
  sessionTitle: string;
  duration: string;
  intensity: string;
  exercisesCount: number;
  detail: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function UPDEDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    readiness: 7,
    feel: "good" as "good" | "okay" | "poor",
    pain: "none" as "none" | "yes",
    painAreas: "",
    energy: "medium" as "low" | "medium" | "high",
    sleep: "good" as "poor" | "okay" | "good",
  });
  const [todaySession, setTodaySession] = useState<TodaySession | null>(null);
  const [sessionsThisWeek, setSessionsThisWeek] = useState<{ completed: number; planned: number } | null>(null);
  const [behaviourDrift, setBehaviourDrift] = useState<{
    simplificationRecommended?: boolean;
  } | null>(null);
  const [activeInjuries, setActiveInjuries] = useState<InjuryEntry[]>([]);
  const [decisionLogEntries, setDecisionLogEntries] = useState<DecisionLogEntry[]>([]);
  const [decisionCollapsed, setDecisionCollapsed] = useState(true);
  const [domainCollapsed, setDomainCollapsed] = useState(true);
  const [strategicInsights, setStrategicInsights] = useState<string[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<ReturnType<typeof PerformanceEngine.getMetrics> | null>(null);
  const [readinessComposite, setReadinessComposite] = useState<number | null>(null);
  const [readinessBreakdown, setReadinessBreakdown] = useState<ReturnType<typeof PerformanceEngine.getReadinessBreakdown> | null>(null);
  const [capacityBreakdownExpanded, setCapacityBreakdownExpanded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setStrategicInsights(PerformanceEngine.getStrategicInsights());
    setPerformanceMetrics(PerformanceEngine.getMetrics());
    setReadinessComposite(PerformanceEngine.getReadinessComposite());
    setReadinessBreakdown(PerformanceEngine.getReadinessBreakdown());
    const unsubRecalc = subscribePerformance("stateRecalculated", () => {
      setStrategicInsights(PerformanceEngine.getStrategicInsights());
      setPerformanceMetrics(PerformanceEngine.getMetrics());
      setReadinessComposite(PerformanceEngine.getReadinessComposite());
      setReadinessBreakdown(PerformanceEngine.getReadinessBreakdown());
    });
    const unsubInsights = subscribePerformance("strategicInsightsUpdated", () => {
      setStrategicInsights(PerformanceEngine.getStrategicInsights());
    });
    return () => {
      unsubRecalc();
      unsubInsights();
    };
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      setProfile(data);
    }

    load();
  }, []);

  useEffect(() => {
    if (!checkinOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCheckinOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [checkinOpen]);

  useEffect(() => {
    if (!profile || !checkinOpen || profile.checkin_date !== todayStr()) return;
    setCheckinForm({
      readiness: profile.checkin_readiness ?? 7,
      feel: (profile.checkin_feel as "good" | "okay" | "poor") ?? "okay",
      pain: (profile.checkin_pain as "none" | "yes") ?? "none",
      painAreas: profile.checkin_pain_areas ?? "",
      energy: (profile.checkin_energy as "low" | "medium" | "high") ?? "medium",
      sleep: (profile.checkin_sleep as "poor" | "okay" | "good") ?? "good",
    });
  }, [checkinOpen, profile]);

  useEffect(() => {
    if (!profile?.id || pathname !== "/profile") return;
    fetch("/api/today-session")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.todaySession) setTodaySession(data.todaySession);
        if (data?.sessionsThisWeek) setSessionsThisWeek(data.sessionsThisWeek);
      })
      .catch(() => {});
  }, [profile?.id, pathname]);

  useEffect(() => {
    if (!profile?.id || pathname !== "/profile") return;
    fetch("/api/behaviour-drift")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBehaviourDrift(d))
      .catch(() => setBehaviourDrift(null));
  }, [profile?.id, pathname]);

  useEffect(() => {
    if (!profile?.id || pathname !== "/profile") return;
    fetch("/api/injuries")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setActiveInjuries((d.entries ?? []).filter((e: InjuryEntry) => !e.resolved)))
      .catch(() => setActiveInjuries([]));
  }, [profile?.id, pathname]);

  useEffect(() => {
    if (!profile?.id || pathname !== "/profile") return;
    fetch("/api/decision-log?limit=10")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setDecisionLogEntries(d.entries ?? []))
      .catch(() => setDecisionLogEntries([]));
  }, [profile?.id, pathname]);

  async function submitCheckin() {
    if (!profile) return;
    setCheckinSubmitting(true);
    const updates = {
      checkin_date: todayStr(),
      checkin_readiness: checkinForm.readiness,
      checkin_feel: checkinForm.feel,
      checkin_pain: checkinForm.pain,
      checkin_pain_areas: checkinForm.painAreas,
      checkin_energy: checkinForm.energy,
      checkin_sleep: checkinForm.sleep,
    };
    await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);
    const { data: fresh } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.id)
      .single();
    if (fresh) setProfile(fresh as Profile);
    else setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    setCheckinSubmitting(false);
    setCheckinOpen(false);
  }

  const profileSnapshot = useMemo(
    () =>
      profile
        ? {
            aerobic_score: profile.aerobic_score,
            strength_upper: profile.strength_upper,
            strength_lower: profile.strength_lower,
            sleep_score: profile.sleep_score,
            stress_level: profile.stress_level,
            readiness_score: readinessComposite ?? profile.readiness_score,
            primary_limiter: profile.primary_limiter,
            goal: profile.goal,
            focus: profile.focus,
            current_week: profile.current_week,
            loadProgressionPercent: performanceMetrics?.loadProgressionPercent,
            nutritionAlignmentScore: performanceMetrics?.nutritionAlignmentScore,
          }
        : null,
    [profile, readinessComposite, performanceMetrics]
  );

  const capacityBreakdown = useMemo(
    () => PerformanceEngine.calculateCapacityBreakdown(profileSnapshot),
    [profileSnapshot]
  );
  const recoveryBreakdown = useMemo(
    () => PerformanceEngine.calculateRecoveryBreakdown(profileSnapshot),
    [profileSnapshot]
  );
  const identityProfile = useMemo(
    () => PerformanceEngine.calculateIdentityProfile(profileSnapshot),
    [profileSnapshot]
  );
  const trendDeltas = useMemo(
    () => PerformanceEngine.calculateTrendDeltas(profileSnapshot),
    [profileSnapshot]
  );
  const decisionTransparency = useMemo(
    () => PerformanceEngine.getDecisionTransparency(profileSnapshot),
    [profileSnapshot]
  );

  if (!profile) return null;
  const p = profile;

  /* =========================
     DERIVED METRICS
  ========================= */

  const avgStrength =
    (p.strength_upper + p.strength_lower) / 2;

  const workCapacity = Math.round(
    p.aerobic_score * 0.5 +
      avgStrength * 0.5
  );

  const readinessScore = readinessComposite ?? p.readiness_score ?? 70;
  const circumference = 2 * Math.PI * 80;
  const offset =
    circumference -
    (readinessScore / 100) *
      circumference;

  const domains = [
    { label: "Aerobic Capacity", value: p.aerobic_score },
    { label: "Sleep Quality", value: p.sleep_score },
    { label: "Hip Mobility", value: p.mobility_score },
    { label: "Strength (Upper)", value: p.strength_upper },
    { label: "Strength (Lower)", value: p.strength_lower },
    { label: "Work Capacity", value: workCapacity },
  ];

  function getAdaptation(): "reduce" | "normal" | "increase" {
    if (p.checkin_date !== todayStr()) return "normal";
    const readiness = p.checkin_readiness ?? 7;
    const feel = p.checkin_feel ?? "okay";
    const pain = p.checkin_pain ?? "none";
    const energy = p.checkin_energy ?? "medium";
    const sleep = p.checkin_sleep ?? "okay";
    if (pain === "yes" || feel === "poor" || energy === "low" || sleep === "poor" || readiness < 5) return "reduce";
    if (feel === "good" && (energy === "high" || sleep === "good") && readiness >= 7 && pain === "none") return "increase";
    return "normal";
  }

  const adaptation = getAdaptation();
  const advisories = getAdvisories({
    readiness: p.checkin_readiness ?? 7,
    feel: (p.checkin_feel as "good" | "okay" | "poor") ?? "okay",
    pain: (p.checkin_pain as "none" | "yes") ?? "none",
    painAreas: p.checkin_pain_areas ?? null,
    energy: (p.checkin_energy as "low" | "medium" | "high") ?? "medium",
    sleep: (p.checkin_sleep as "poor" | "okay" | "good") ?? "okay",
    adaptation,
    sessionFocus: "Lower body",
  });
  const hasCheckinToday = profile.checkin_date === todayStr();

  const DASHBOARD_PHASES = ["Accumulation", "Accumulation", "Intensification", "Intensification", "Overreach", "Deload"];
  const MACROCYCLE_LABELS: Record<string, string> = { Accumulation: "GPP", Intensification: "SPP", Overreach: "SPP", Deload: "Recovery" };
  const weekNum = p.current_week ?? 1;
  const phaseLabel = DASHBOARD_PHASES[(weekNum - 1) % DASHBOARD_PHASES.length] ?? "Accumulation";
  const macrocycle = MACROCYCLE_LABELS[phaseLabel] ?? "GPP";
  const programmeLabel = p.goal ? String(p.goal).replace(/^./, (c) => c.toUpperCase()) : (p.focus ? String(p.focus) : "Strength–Endurance Hybrid");
  const weeklyBriefData = generateWeeklyBrief({
    ...p,
    phase: phaseLabel,
    macrocycle,
    current_week: weekNum,
  });
  const trainingFocus = systemBiasPhrase(p);
  const capacityPts = Math.round((p.aerobic_score + (p.strength_upper + p.strength_lower) / 2) / 2);

  const historicalPps = (() => {
    const base = p.readiness_score ?? 70;
    return Array.from({ length: 8 }, (_, i) => base - 4 + i + (i % 3 === 0 ? 1 : 0));
  })();
  const adherence = 0.85;
  const consistencyScore = Math.round((p.aerobic_score + p.strength_upper + p.strength_lower) / 3) || 70;
  const performanceForecast = usePerformanceForecast(historicalPps, adherence, consistencyScore, 8);
  const baselinePps = historicalPps[historicalPps.length - 1] ?? 70;
  const projectedPpsPercent =
    performanceForecast.projected.length > 0
      ? performanceForecast.projected.map(
          (p) => ((p - baselinePps) / baselinePps) * 100
        )
      : undefined;

  return (
    <div className="outer">

      {/* NAVIGATION */}

      <nav className="nav">
        <div className="brand">
          PERFORMANCE PATHFINDER OS
        </div>
        <div className="tabs">
          <NavTab href="/" label="Home" pathname={pathname} />
          <NavTab href="/profile" label="Profile" pathname={pathname} />
          <NavTab href="/programme" label="Programme" pathname={pathname} />
          <NavTab href="/tactical" label="Tactical" pathname={pathname} />
          <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
          <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
          <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
          <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
          <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
          <NavTab href="/strategy" label="Strategy" pathname={pathname} />
          <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
          <NavTab href="/settings" label="Settings" pathname={pathname} />
        </div>
      </nav>

      {/* DESKTOP LAYOUT — command centre (unchanged) */}
      <div className="hidden lg:block">
        <div className="container containerDesktop">
          <div className="dashboardContent">

          {/* 1) Top row: Weekly Brief + Performance Readiness side by side */}
          <section className="dashboardSection dashboardTopRow">
            <div className="topRowBrief">
              <WeeklyBrief
                phaseIntent={weeklyBriefData.phaseIntent}
                systemBias={weeklyBriefData.systemBias}
                primaryLimiter={weeklyBriefData.primaryLimiter}
                recoveryBandwidth={weeklyBriefData.recoveryBandwidth}
                whyThisWeek={weeklyBriefData.whyThisWeek}
                weekNumber={weekNum}
              />
            </div>
            <div className="topRowReadiness">
              <div className="readinessBlock">
                <div className="readinessLabel">Performance Readiness</div>
                <svg width="200" height="200" viewBox="0 0 200 200" className="readinessGauge" aria-hidden>
                  <defs>
                    <linearGradient id="readinessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2F80ED" />
                      <stop offset="50%" stopColor="#5b9cf2" />
                      <stop offset="100%" stopColor="#27E0A6" />
                    </linearGradient>
                    <filter id="readinessGlow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <circle cx="100" cy="100" r="80" stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="transparent" className="readinessGaugeBg" />
                  <circle cx="100" cy="100" r="80" stroke="url(#readinessGradient)" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="readinessGaugeArc" style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)", filter: "drop-shadow(0 0 8px rgba(47,128,237,0.5))" }} />
                  <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="44" fill="#fff" fontWeight="700" className="readinessGaugeText">{readinessScore}</text>
                </svg>
                <div className="readinessSub">out of 100 · data-driven composite</div>
                {readinessBreakdown && (
                  <div className="readinessBreakdown" style={{ marginTop: 10, fontSize: 11, display: "flex", flexWrap: "wrap", gap: "8px 12px", justifyContent: "center" }}>
                    <span title="Recovery">Recovery {readinessBreakdown.recovery}</span>
                    <span title="Load balance">Load {readinessBreakdown.loadBalance}</span>
                    <span title="Nutrition">Nutrition {readinessBreakdown.nutrition}</span>
                    <span title="Injury">Injury {readinessBreakdown.injury}</span>
                    <span title="Sentiment">Sentiment {readinessBreakdown.sentiment}</span>
                  </div>
                )}
                <div className="programmeBox">
                  <span className="programmeBoxLabel">Your programme</span>
                  <span className="programmeBoxValue">{programmeLabel} · {phaseLabel}</span>
                </div>
              </div>
            </div>
          </section>

          {/* 2) Active Injury Alert */}
          {activeInjuries.length > 0 && (
            <section className="dashboardSection dashboardSectionInjury">
              <div className="activeInjuryAlert">
                <span className="activeInjuryIcon" aria-hidden>⚠</span>
                <div className="activeInjuryText">
                  {activeInjuries[0].body_part.replace(/_/g, " ")} — Severity {activeInjuries[0].severity}
                  {activeInjuries[0].risk_level && ` (${activeInjuries[0].risk_level.replace(/^./, (c) => c.toUpperCase())} Risk)`}
                </div>
                <Link href="/settings" className="activeInjuryLink">Manage</Link>
              </div>
            </section>
          )}

          {/* 2b) Strategic insights from PerformanceEngine */}
          {strategicInsights.length > 0 && (
            <section className="dashboardSection" style={{ padding: "12px 16px", background: "rgba(39, 224, 166, 0.06)", border: "1px solid rgba(39, 224, 166, 0.15)", borderRadius: 12 }}>
              <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Strategic insights</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
                {strategicInsights.map((s, i) => (
                  <li key={i} style={{ marginTop: 4 }}>{s}</li>
                ))}
              </ul>
              {performanceMetrics && (performanceMetrics.executionProbability != null || performanceMetrics.injuryRiskScore != null) && (
                <div style={{ marginTop: 10, fontSize: 11, opacity: 0.8 }}>
                  {performanceMetrics.executionProbability != null && <span>Execution probability: {performanceMetrics.executionProbability.score}%</span>}
                  {performanceMetrics.executionProbability != null && performanceMetrics.injuryRiskScore != null && " · "}
                  {performanceMetrics.injuryRiskScore != null && <span>Injury risk: {performanceMetrics.injuryRiskScore}%</span>}
                </div>
              )}
            </section>
          )}

          {/* 4) Engagement / Risk ribbon — only when there is content */}
          {(() => {
            const risk = getRiskSignals(p);
            const hasRibbonContent =
              behaviourDrift?.simplificationRecommended ||
              risk.overloadRisk !== "low" ||
              risk.neuralStrain !== "low" ||
              risk.recoveryCompression !== "stable";
            if (!hasRibbonContent) return null;
            return (
              <section className="dashboardSection dashboardSectionRibbon">
                <div className="engagementRibbon">
                  {behaviourDrift?.simplificationRecommended && (
                    <div className="engagementDriftCard">
                      Engagement trending ↓ — simplifying architecture.
                    </div>
                  )}
                  <RiskBadge
                    overloadRisk={risk.overloadRisk}
                    neuralStrain={risk.neuralStrain}
                    recoveryCompression={risk.recoveryCompression}
                  />
                </div>
              </section>
            );
          })()}

          {/* 5) Headline + meta + check-in — one clear box */}
          <section className="dashboardSection dashboardSectionHeadline">
            <div className="headlineCard">
              <div className="headlineCardLeft">
                <h1 className="headline">
                  {readinessScore > 65 ? "You're in a good place to train." : readinessScore > 45 ? "Recovery on track — train if you feel ready." : "Prioritise recovery. Light work or rest today."}
                </h1>
                <div className="metaRow">
                  <Meta label="What's holding you back" value={p.primary_limiter} />
                  <Meta label="How you're trending" value={`↑ ${p.momentum}`} highlight />
                  <Meta label="Sessions this week" value={sessionsThisWeek ? `${sessionsThisWeek.completed} of ${sessionsThisWeek.planned} done` : "—"} />
                </div>
              </div>
              <div className="checkinRow">
                <button type="button" className="dailyCheckinBtn" onClick={() => setCheckinOpen(true)} aria-label="Daily check-in — adapt today's programme">
                  <span className="dailyCheckinBtnOrb" aria-hidden />
                  <span className="dailyCheckinBtnText">
                    <span className="dailyCheckinBtnLabel">Daily check-in</span>
                    <span className="dailyCheckinBtnSub">Adapt today&apos;s programme</span>
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* 6) Today Session card */}
          <section className="dashboardSection">
            <a href="/programme" className="sessionCardWrap sessionCardLink sessionCardAnimate" aria-label="View programme" onClick={(e) => { e.preventDefault(); window.location.href = "/programme"; }}>
              <div className="sessionCardInner sessionCardBridge">
                <div className="sessionCardMeta">TODAY'S SESSION</div>
                <div className="sessionCardTitle">{todaySession?.sessionTitle ?? "Lower Body Strength"}</div>
                <div className="sessionCardDetail">{todaySession?.detail ?? "— min · 4 exercises · Moderate–High intensity"}</div>
                <div className="sessionCardCtaBlock"><span className="sessionCardCtaLink">View programme →</span></div>
                <div className="sessionCardHint">Targets what's holding you back: {p.primary_limiter}</div>
              </div>
            </a>
          </section>

          {/* 8) PPS chart */}
          <section className="dashboardSection">
            <SectionTitle text="PROGRESS OVERVIEW" />
            <RemakerProgressBlock
              readinessScore={profile.readiness_score ?? 70}
              strengthUpper={profile.strength_upper ?? 60}
              strengthLower={profile.strength_lower ?? 60}
              aerobicScore={profile.aerobic_score ?? 60}
              topBenchmarkLabel={getTop4Benchmarks(profile)[0]?.label}
              topBenchmarkValue={getTop4Benchmarks(profile)[0]?.value ?? null}
              sessionsThisWeek={sessionsThisWeek?.completed ?? 0}
              projectedPpsPercent={projectedPpsPercent}
            />
            <ForecastSummary forecast={performanceForecast} weeksForward={8} />
          </section>

          {/* 9) Identity + Bias */}
          <section className="dashboardSection">
            <SectionTitle text="PERFORMANCE IDENTITY" />
            <div className="identityCard identityCardLayered">
              <div className="identityRow">
                <Identity label="Identity" value={identityLabel(p)} />
                <Identity label="Training focus" value={trainingFocus} />
                <Identity label="Capacity" value={`~${capacityPts} pts`} />
                <Identity label="Phase" value={phaseLabel} />
                <Identity label="Recovery" value={weeklyBriefData.recoveryBandwidth} />
              </div>
              <div className="identityMetaRow">
                <span className="identityBias">Strength {identityProfile.strengthBiasPercent}% · Aerobic {identityProfile.aerobicBiasPercent}%</span>
                <span className="identityLoadTolerance">Load tolerance: {identityProfile.loadTolerance}</span>
                <span className="identityTrend" title="4-week trend">
                  {identityProfile.trend === "up" ? "↑" : identityProfile.trend === "down" ? "↓" : "→"} {identityProfile.delta !== 0 ? `${identityProfile.delta > 0 ? "+" : ""}${identityProfile.delta} (4w)` : "stable"}
                </span>
              </div>
            </div>
          </section>

          {/* 9b) Capacity card */}
          <section className="dashboardSection">
            <SectionTitle text="CAPACITY" />
            <div className="analysisCard analysisCardCapacity">
              <div className="analysisCardHead">
                <span className="analysisCardScore">{capacityBreakdown.score}<span className="analysisCardOutOf">/100</span></span>
                <span className="analysisCardPercentile">~{Math.min(99, Math.round((capacityBreakdown.score / 100) * 99))}th %ile</span>
                <span className="analysisCardTrend" title="Trend">{capacityBreakdown.trend === "up" ? "↑" : capacityBreakdown.trend === "down" ? "↓" : "→"}</span>
              </div>
              <button type="button" className="analysisCardExpand" onClick={() => setCapacityBreakdownExpanded((e) => !e)} aria-expanded={capacityBreakdownExpanded}>
                {capacityBreakdownExpanded ? "Hide breakdown" : "Show breakdown"}
              </button>
              {capacityBreakdownExpanded && (
                <div className="analysisCardBreakdown">
                  {capacityBreakdown.contributors.map((c, i) => (
                    <div key={i} className="analysisCardContributor">
                      <span className="contributorDot" style={{ background: c.value >= 70 ? "rgba(39,224,166,0.8)" : c.value >= 50 ? "rgba(47,128,237,0.8)" : "rgba(255,255,255,0.4)" }} />
                      <span>{c.name}</span>
                      <span>{c.value}</span>
                    </div>
                  ))}
                  {capacityBreakdown.limitingFactor && <div className="analysisCardLimiting">Limiting: {capacityBreakdown.limitingFactor}</div>}
                  {capacityBreakdown.programmeInfluence && <div className="analysisCardInfluence">{capacityBreakdown.programmeInfluence}</div>}
                </div>
              )}
            </div>
          </section>

          {/* 9c) Recovery card */}
          <section className="dashboardSection">
            <SectionTitle text="RECOVERY" />
            <div className="analysisCard analysisCardRecovery">
              <div className="analysisCardHead">
                <span className="analysisCardScore">{recoveryBreakdown.score}<span className="analysisCardOutOf">/100</span></span>
                <span className="analysisCardTrend">{recoveryBreakdown.trend === "up" ? "↑" : recoveryBreakdown.trend === "down" ? "↓" : "→"}</span>
              </div>
              <div className="recoveryWeights">
                {recoveryBreakdown.contributors.map((c, i) => (
                  <div key={i} className={`recoveryWeightItem ${recoveryBreakdown.limitingFactor === c.name ? "recoveryWeightLimiting" : ""}`}>
                    <span className="contributorDot" style={{ background: c.value >= 70 ? "rgba(39,224,166,0.8)" : c.value >= 50 ? "rgba(47,128,237,0.8)" : "rgba(239,68,68,0.6)" }} />
                    <span>{c.name}</span>
                    <span>{c.value}</span>
                  </div>
                ))}
              </div>
              {recoveryBreakdown.limitingFactor && <div className="analysisCardLimiting">Limiting factor: {recoveryBreakdown.limitingFactor}</div>}
              {recoveryBreakdown.programmeInfluence && <div className="analysisCardInfluence">{recoveryBreakdown.programmeInfluence}</div>}
            </div>
          </section>

          {/* 10) Benchmarks */}
          <section className="dashboardSection">
            <SectionTitle text="BENCHMARKS" />
            <Link href="/benchmarks" className="identityCard benchmarksCard benchmarksCardLink">
              <div className="benchmarksRow">
                {getTop4Benchmarks(profile).map(({ key, label, value }) => (
                  <BenchmarkPill key={key} label={label} value={value} />
                ))}
              </div>
            </Link>
          </section>

          {/* 11) Domain intelligence */}
          <section className="dashboardSection">
            <SectionTitle text="PERFORMANCE ANALYSIS" />
            <div className="grid">
              {domains.map((d, i) => (
                <DomainCard
                  key={i}
                  label={d.label}
                  value={Math.round(d.value)}
                  trend={trendDeltas[d.label] ? (trendDeltas[d.label][5] >= (trendDeltas[d.label][0] ?? 0) ? "up" : trendDeltas[d.label][5] < (trendDeltas[d.label][0] ?? 0) ? "down" : "stable") : "stable"}
                  sparklineData={trendDeltas[d.label] ?? []}
                  limitingFactor={d.label === "Work Capacity" ? capacityBreakdown.limitingFactor : d.label === "Sleep Quality" ? recoveryBreakdown.limitingFactor : null}
                  programmeInfluence={d.label === "Work Capacity" ? capacityBreakdown.programmeInfluence : d.label === "Sleep Quality" ? recoveryBreakdown.programmeInfluence : null}
                />
              ))}
            </div>
          </section>

          {/* 12) Decision transparency (collapsible) */}
          <section className="dashboardSection dashboardSectionDecision">
            <button type="button" className="decisionToggle" onClick={() => setDecisionCollapsed((c) => !c)} aria-expanded={!decisionCollapsed}>
              <span className="decisionToggleLabel">Decision transparency</span>
              <span className="decisionToggleChevron">{decisionCollapsed ? "▼" : "▲"}</span>
            </button>
            {!decisionCollapsed && (
              <div className="decisionTransparencyWrap">
                <div className="decisionTransparencyBlock">
                  <div className="decisionTransparencyLabel">Phase</div>
                  <div className="decisionTransparencyText">{decisionTransparency.phaseExplanation}</div>
                </div>
                <div className="decisionTransparencyBlock">
                  <div className="decisionTransparencyLabel">Focus</div>
                  <div className="decisionTransparencyText">{decisionTransparency.focusExplanation}</div>
                </div>
                <div className="decisionTransparencyBlock">
                  <div className="decisionTransparencyLabel">Capacity reasoning</div>
                  <div className="decisionTransparencyText">{decisionTransparency.capacityReasoning}</div>
                </div>
                {decisionTransparency.riskFlags.length > 0 && (
                  <div className="decisionTransparencyBlock decisionTransparencyRisks">
                    <div className="decisionTransparencyLabel">Risk flags</div>
                    <ul className="decisionTransparencyFlags">
                      {decisionTransparency.riskFlags.map((f, i) => (
                        <li key={i}><span className="contributorDot" style={{ background: "rgba(239,68,68,0.7)" }} />{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="decisionLogWrap">
                  <DecisionLog entries={decisionLogEntries} maxItems={10} />
                </div>
              </div>
            )}
          </section>

          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT — stacked briefing (separate hierarchy) */}
      <div className="block lg:hidden">
        <div className="containerMobile">
          <div className="mobileStack">
            {/* 1) Weekly Brief */}
            <section className="mobileSection">
              <WeeklyBrief
                phaseIntent={weeklyBriefData.phaseIntent}
                systemBias={weeklyBriefData.systemBias}
                primaryLimiter={weeklyBriefData.primaryLimiter}
                recoveryBandwidth={weeklyBriefData.recoveryBandwidth}
                whyThisWeek={weeklyBriefData.whyThisWeek}
                weekNumber={weekNum}
              />
            </section>

            {/* 2) Active Injury Alert */}
            {activeInjuries.length > 0 && (
              <section className="mobileSection">
                <div className="activeInjuryAlert">
                  <span className="activeInjuryIcon" aria-hidden>⚠</span>
                  <div className="activeInjuryText">
                    {activeInjuries[0].body_part.replace(/_/g, " ")} — Severity {activeInjuries[0].severity}
                    {activeInjuries[0].risk_level && ` (${activeInjuries[0].risk_level.replace(/^./, (c) => c.toUpperCase())} Risk)`}
                  </div>
                  <Link href="/settings" className="activeInjuryLink">Manage</Link>
                </div>
              </section>
            )}

            {/* 2b) Strategic insights (mobile) */}
            {strategicInsights.length > 0 && (
              <section className="mobileSection" style={{ padding: "12px 16px", background: "rgba(39, 224, 166, 0.06)", border: "1px solid rgba(39, 224, 166, 0.15)", borderRadius: 12 }}>
                <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Strategic insights</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
                  {strategicInsights.map((s, i) => (
                    <li key={i} style={{ marginTop: 4 }}>{s}</li>
                  ))}
                </ul>
                {performanceMetrics && (performanceMetrics.executionProbability != null || performanceMetrics.injuryRiskScore != null) && (
                  <div style={{ marginTop: 10, fontSize: 11, opacity: 0.8 }}>
                    {performanceMetrics.executionProbability != null && <span>Execution: {performanceMetrics.executionProbability.score}%</span>}
                    {performanceMetrics.executionProbability != null && performanceMetrics.injuryRiskScore != null && " · "}
                    {performanceMetrics.injuryRiskScore != null && <span>Injury risk: {performanceMetrics.injuryRiskScore}%</span>}
                  </div>
                )}
              </section>
            )}

            {/* 3) Readiness Dial */}
            <section className="mobileSection mobileSectionReadiness">
              <div className="readinessBlock">
                <div className="readinessLabel">Performance Readiness</div>
                <svg width="200" height="200" viewBox="0 0 200 200" className="readinessGauge" aria-hidden>
                  <defs>
                    <linearGradient id="readinessGradientMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2F80ED" />
                      <stop offset="50%" stopColor="#5b9cf2" />
                      <stop offset="100%" stopColor="#27E0A6" />
                    </linearGradient>
                    <filter id="readinessGlowMobile">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <circle cx="100" cy="100" r="80" stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="transparent" />
                  <circle cx="100" cy="100" r="80" stroke="url(#readinessGradientMobile)" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)", filter: "drop-shadow(0 0 8px rgba(47,128,237,0.5))" }} />
                  <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="44" fill="#fff" fontWeight="700">{readinessScore}</text>
                </svg>
                <div className="readinessSub">out of 100 · composite</div>
                {readinessBreakdown && (
                  <div style={{ marginTop: 8, fontSize: 10, display: "flex", flexWrap: "wrap", gap: "6px 10px", justifyContent: "center", opacity: 0.85 }}>
                    <span>R{readinessBreakdown.recovery}</span>
                    <span>L{readinessBreakdown.loadBalance}</span>
                    <span>N{readinessBreakdown.nutrition}</span>
                    <span>I{readinessBreakdown.injury}</span>
                    <span>S{readinessBreakdown.sentiment}</span>
                  </div>
                )}
                <div className="programmeBox">
                  <span className="programmeBoxLabel">Your programme</span>
                  <span className="programmeBoxValue">{programmeLabel} · {phaseLabel}</span>
                </div>
              </div>
            </section>

            {/* 4) Today Session */}
            <section className="mobileSection">
              <a href="/programme" className="sessionCardWrap sessionCardLink" aria-label="View programme" onClick={(e) => { e.preventDefault(); window.location.href = "/programme"; }}>
                <div className="sessionCardInner sessionCardBridge">
                  <div className="sessionCardMeta">TODAY'S SESSION</div>
                  <div className="sessionCardTitle">{todaySession?.sessionTitle ?? "Lower Body Strength"}</div>
                  <div className="sessionCardDetail">{todaySession?.detail ?? "— min · 4 exercises · Moderate–High intensity"}</div>
                  <div className="sessionCardCtaBlock"><span className="sessionCardCtaLink">View programme →</span></div>
                  <div className="sessionCardHint">Targets what's holding you back: {p.primary_limiter}</div>
                </div>
              </a>
            </section>

            {/* 5) Fuel Strategy */}
            <section className="mobileSection">
              <div className="mobileFuelStrategy">
                <div className="mobileFuelStrategyLabel">Fuel strategy today</div>
                <div className="mobileFuelStrategyText">Targets on programme · Prioritise protein and carbs around session.</div>
              </div>
            </section>

            {/* 6) Risk Ribbon — only when there is content */}
            {(() => {
              const risk = getRiskSignals(p);
              const hasRibbonContent =
                behaviourDrift?.simplificationRecommended ||
                risk.overloadRisk !== "low" ||
                risk.neuralStrain !== "low" ||
                risk.recoveryCompression !== "stable";
              if (!hasRibbonContent) return null;
              return (
                <section className="mobileSection">
                  <div className="engagementRibbon">
                    {behaviourDrift?.simplificationRecommended && (
                      <div className="engagementDriftCard">
                        Engagement trending ↓ — simplifying architecture.
                      </div>
                    )}
                    <RiskBadge
                      overloadRisk={risk.overloadRisk}
                      neuralStrain={risk.neuralStrain}
                      recoveryCompression={risk.recoveryCompression}
                    />
                  </div>
                </section>
              );
            })()}

            {/* 7) PPS (7-day) */}
            <section className="mobileSection">
              <div className="mobileSectionTitle">Progress (7-day)</div>
              <RemakerProgressBlock
                readinessScore={profile.readiness_score ?? 70}
                strengthUpper={profile.strength_upper ?? 60}
                strengthLower={profile.strength_lower ?? 60}
                aerobicScore={profile.aerobic_score ?? 60}
                topBenchmarkLabel={getTop4Benchmarks(profile)[0]?.label}
                topBenchmarkValue={getTop4Benchmarks(profile)[0]?.value ?? null}
                sessionsThisWeek={sessionsThisWeek?.completed ?? 0}
                projectedPpsPercent={projectedPpsPercent}
              />
              <ForecastSummary forecast={performanceForecast} weeksForward={8} />
            </section>

            {/* 8) Identity */}
            <section className="mobileSection">
              <div className="mobileSectionTitle">Identity</div>
              <div className="identityCard identityCardLayered">
                <div className="identityRow identityRowMobile">
                  <Identity label="Identity" value={identityLabel(p)} />
                  <Identity label="Training focus" value={trainingFocus} />
                  <Identity label="Capacity" value={`~${capacityPts} pts`} />
                  <Identity label="Phase" value={phaseLabel} />
                  <Identity label="Recovery" value={weeklyBriefData.recoveryBandwidth} />
                </div>
                <div className="identityMetaRow">
                  <span className="identityBias">Strength {identityProfile.strengthBiasPercent}% · Aerobic {identityProfile.aerobicBiasPercent}%</span>
                  <span className="identityLoadTolerance">Load: {identityProfile.loadTolerance}</span>
                  <span className="identityTrend">{identityProfile.trend === "up" ? "↑" : identityProfile.trend === "down" ? "↓" : "→"} {identityProfile.delta !== 0 ? `${identityProfile.delta > 0 ? "+" : ""}${identityProfile.delta} (4w)` : ""}</span>
                </div>
              </div>
            </section>

            {/* 9) Domain Grid (collapsible) */}
            <section className="mobileSection">
              <button type="button" className="decisionToggle" onClick={() => setDomainCollapsed((c) => !c)} aria-expanded={!domainCollapsed}>
                <span className="decisionToggleLabel">Performance analysis</span>
                <span className="decisionToggleChevron">{domainCollapsed ? "▼" : "▲"}</span>
              </button>
              {!domainCollapsed && (
                <div className="domainGridMobile">
                  {domains.map((d, i) => (
                    <DomainCard
                      key={i}
                      label={d.label}
                      value={Math.round(d.value)}
                      trend={trendDeltas[d.label] ? (trendDeltas[d.label][5] >= (trendDeltas[d.label][0] ?? 0) ? "up" : trendDeltas[d.label][5] < (trendDeltas[d.label][0] ?? 0) ? "down" : "stable") : "stable"}
                      sparklineData={trendDeltas[d.label] ?? []}
                      limitingFactor={d.label === "Work Capacity" ? capacityBreakdown.limitingFactor : d.label === "Sleep Quality" ? recoveryBreakdown.limitingFactor : null}
                      programmeInfluence={d.label === "Work Capacity" ? capacityBreakdown.programmeInfluence : d.label === "Sleep Quality" ? recoveryBreakdown.programmeInfluence : null}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* 10) Decision Log (collapsed) */}
            <section className="mobileSection">
              <button type="button" className="decisionToggle" onClick={() => setDecisionCollapsed((c) => !c)} aria-expanded={!decisionCollapsed}>
                <span className="decisionToggleLabel">Decision transparency</span>
                <span className="decisionToggleChevron">{decisionCollapsed ? "▼" : "▲"}</span>
              </button>
              {!decisionCollapsed && (
                <div className="decisionTransparencyWrap">
                  <div className="decisionTransparencyBlock">
                    <div className="decisionTransparencyLabel">Phase</div>
                    <div className="decisionTransparencyText">{decisionTransparency.phaseExplanation}</div>
                  </div>
                  <div className="decisionTransparencyBlock">
                    <div className="decisionTransparencyLabel">Focus</div>
                    <div className="decisionTransparencyText">{decisionTransparency.focusExplanation}</div>
                  </div>
                  <div className="decisionTransparencyBlock">
                    <div className="decisionTransparencyLabel">Capacity</div>
                    <div className="decisionTransparencyText">{decisionTransparency.capacityReasoning}</div>
                  </div>
                  {decisionTransparency.riskFlags.length > 0 && (
                    <div className="decisionTransparencyBlock decisionTransparencyRisks">
                      <div className="decisionTransparencyLabel">Risk flags</div>
                      <ul className="decisionTransparencyFlags">
                        {decisionTransparency.riskFlags.map((f, i) => (
                          <li key={i}><span className="contributorDot" style={{ background: "rgba(239,68,68,0.7)" }} />{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="decisionLogWrap">
                    <DecisionLog entries={decisionLogEntries} maxItems={10} />
                  </div>
                </div>
              )}
            </section>

          </div>
        </div>
      </div>

        {/* Daily check-in modal — same style as programme page */}
        {checkinOpen && (
          <div
            className="checkinBackdrop"
            onClick={() => setCheckinOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Daily check-in"
          >
            <div className="checkinModal" onClick={(e) => e.stopPropagation()}>
              <div className="checkinModalHeader">
                <span>Daily check-in</span>
                <button
                  type="button"
                  className="checkinModalClose"
                  onClick={() => setCheckinOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="checkinIntro">
                Answer 5 quick questions. Your programme will adapt today's session (volume, intensity, or alternatives).
              </p>
              <div className="checkinForm">
                <label>
                  <span>1. Readiness (1–10)</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={checkinForm.readiness}
                    onChange={(e) =>
                      setCheckinForm((f) => ({ ...f, readiness: +e.target.value }))
                    }
                  />
                  <span className="rangeVal">{checkinForm.readiness}</span>
                </label>
                <label>
                  <span>2. How do you feel?</span>
                  <select
                    value={checkinForm.feel}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        feel: e.target.value as "good" | "okay" | "poor",
                      }))
                    }
                  >
                    <option value="good">Good</option>
                    <option value="okay">Okay</option>
                    <option value="poor">Poor</option>
                  </select>
                </label>
                <label>
                  <span>3. Any pain?</span>
                  <select
                    value={checkinForm.pain}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        pain: e.target.value as "none" | "yes",
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="yes">Yes</option>
                  </select>
                  {checkinForm.pain === "yes" && (
                    <input
                      type="text"
                      placeholder="Where? (e.g. lower back, knee)"
                      value={checkinForm.painAreas}
                      onChange={(e) =>
                        setCheckinForm((f) => ({ ...f, painAreas: e.target.value }))
                      }
                      className="checkinText"
                    />
                  )}
                </label>
                <label>
                  <span>4. Energy level?</span>
                  <select
                    value={checkinForm.energy}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        energy: e.target.value as "low" | "medium" | "high",
                      }))
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label>
                  <span>5. Sleep last night?</span>
                  <select
                    value={checkinForm.sleep}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        sleep: e.target.value as "poor" | "okay" | "good",
                      }))
                    }
                  >
                    <option value="poor">Poor</option>
                    <option value="okay">Okay</option>
                    <option value="good">Good</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="checkinSubmitBtn"
                  onClick={submitCheckin}
                  disabled={checkinSubmitting}
                >
                  {checkinSubmitting ? "Saving…" : "Save & adapt programme"}
                </button>
              </div>
            </div>
          </div>
        )}

      <style jsx>{`

        .outer {
          background:
            radial-gradient(circle at 20% 10%, rgba(47,128,237,0.15), transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(39,224,166,0.12), transparent 40%),
            #0A1220;
          min-height:100vh;
          color:white;
          position:relative;
          overflow-x:hidden;
          overflow-y:auto;
        }

        .outer::before {
          content:"";
          position:absolute;
          inset:0;
          background:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size:40px 40px;
          opacity:0.4;
          animation:gridDrift 40s linear infinite;
        }

        @keyframes gridDrift {
          0% { background-position:0 0,0 0; }
          100% { background-position:200px 200px,200px 200px; }
        }

        .nav {
          display:flex;
          justify-content:space-between;
          padding:20px 40px;
          border-bottom:1px solid rgba(255,255,255,0.05);
        }

        .brand {
          font-size:12px;
          letter-spacing:2px;
          opacity:0.6;
        }

        .tabs { display:flex; gap:30px; }

        .container {
          width:100%;
          margin:0 auto;
          box-sizing:border-box;
        }

        .containerDesktop {
          max-width:1200px;
          padding:16px 40px 24px;
        }

        .containerMobile {
          width:100%;
          max-width:100%;
          margin:0 auto;
          padding:16px;
          box-sizing:border-box;
        }

        .mobileStack {
          display:flex;
          flex-direction:column;
          gap:24px;
        }

        .mobileSection {
          min-width:0;
        }

        .mobileSectionReadiness {
          display:flex;
          justify-content:center;
        }

        .mobileSectionTitle {
          font-size:11px;
          letter-spacing:0.08em;
          opacity:0.65;
          margin-bottom:12px;
        }

        .mobileFuelStrategy {
          padding:12px 16px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:12px;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .mobileFuelStrategy:hover {
          box-shadow:0 0 20px rgba(47,128,237,0.2),0 0 40px rgba(39,224,166,0.1);
          border-color:rgba(47,128,237,0.2);
        }

        .mobileFuelStrategyLabel {
          font-size:11px;
          letter-spacing:0.05em;
          opacity:0.7;
          margin-bottom:6px;
        }

        .mobileFuelStrategyText {
          font-size:13px;
          opacity:0.9;
          line-height:1.4;
        }

        .domainCard:hover {
          box-shadow:0 0 24px rgba(47,128,237,0.22),0 0 48px rgba(39,224,166,0.12);
        }
        .domainGridMobile {
          display:flex;
          flex-direction:column;
          gap:12px;
          margin-top:12px;
        }

        .identityRowMobile {
          display:flex;
          flex-direction:column;
          gap:12px;
        }

        .dashboardContent {
          display:flex;
          flex-direction:column;
          gap:16px;
        }

        .dashboardSection {
          min-width:0;
        }

        .dashboardTopRow {
          display:flex;
          align-items:stretch;
          gap:24px;
          flex-wrap:wrap;
        }
        .topRowBrief {
          flex:1;
          min-width:280px;
          display:flex;
        }
        .topRowBrief > * {
          flex:1;
          min-height:100%;
        }
        .topRowReadiness {
          flex-shrink:0;
          display:flex;
          align-items:stretch;
        }
        .topRowReadiness .readinessBlock {
          height:100%;
          min-height:100%;
        }
        .dashboardSectionInjury { }
        .dashboardSectionRibbon { }
        .dashboardSectionDecision { }

        .activeInjuryAlert {
          display:flex;
          align-items:center;
          gap:12px;
          padding:12px 16px;
          background:rgba(220,80,80,0.12);
          border:1px solid rgba(220,80,80,0.35);
          border-radius:12px;
          transition:box-shadow 0.3s ease;
        }
        .activeInjuryAlert:hover {
          box-shadow:0 0 20px rgba(220,80,80,0.25);
        }
        .activeInjuryIcon { font-size:18px; }
        .activeInjuryText { flex:1; font-size:14px; font-weight:500; }
        .activeInjuryLink { font-size:13px; color:#27E0A6; text-decoration:none; font-weight:600; }

        .readinessBlock {
          display:flex;
          flex-direction:column;
          align-items:center;
          padding:24px 16px;
          background:linear-gradient(135deg,rgba(17,24,39,0.95),rgba(30,41,59,0.95));
          border-radius:24px;
          border:1px solid rgba(255,255,255,0.08);
          box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 60px rgba(47,128,237,0.15);
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .readinessBlock:hover {
          box-shadow:0 0 28px rgba(47,128,237,0.25),0 0 56px rgba(39,224,166,0.12),0 20px 60px rgba(0,0,0,0.6);
          border-color:rgba(47,128,237,0.2);
        }

        .engagementRibbon {
          padding:16px;
          background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));
          border:1px solid rgba(255,255,255,0.08);
          border-radius:16px;
          display:flex;
          flex-direction:column;
          gap:12px;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .engagementRibbon:hover {
          box-shadow:0 0 24px rgba(47,128,237,0.18),0 0 48px rgba(39,224,166,0.08);
          border-color:rgba(47,128,237,0.18);
        }
        .engagementDriftCard {
          padding:8px 12px;
          border-radius:6px;
          background:rgba(255,255,255,0.06);
          font-size:13px;
          color:rgba(255,255,255,0.85);
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .engagementDriftCard:hover {
          box-shadow:0 0 16px rgba(47,128,237,0.2),0 0 28px rgba(39,224,166,0.1);
        }

        .decisionToggle {
          display:flex;
          align-items:center;
          justify-content:space-between;
          width:100%;
          padding:12px 16px;
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:12px;
          color:inherit;
          font:inherit;
          cursor:pointer;
          text-align:left;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .decisionToggle:hover {
          box-shadow:0 0 20px rgba(47,128,237,0.2),0 0 40px rgba(39,224,166,0.1);
          border-color:rgba(47,128,237,0.2);
        }
        .decisionToggleLabel { font-size:12px; letter-spacing:0.05em; opacity:0.85; }
        .decisionToggleChevron { font-size:10px; opacity:0.7; }
        .decisionLogWrap { margin-top:12px; }

        .dashboardSectionHeadline {
          padding:4px 0 8px;
        }

        .headlineCard {
          display:flex;
          flex-direction:row;
          align-items:center;
          justify-content:space-between;
          gap:24px;
          flex-wrap:wrap;
          padding:24px 28px;
          background:linear-gradient(135deg,rgba(17,24,39,0.95),rgba(30,41,59,0.9));
          border:1px solid rgba(255,255,255,0.1);
          border-radius:20px;
          box-shadow:0 8px 32px rgba(0,0,0,0.3);
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .headlineCard:hover {
          box-shadow:0 0 28px rgba(47,128,237,0.2),0 0 56px rgba(39,224,166,0.1),0 8px 32px rgba(0,0,0,0.3);
          border-color:rgba(47,128,237,0.25);
        }
        .headlineCardLeft {
          flex:1;
          min-width:0;
        }

        .readinessGauge {
          animation:gaugeFadeIn 1.2s cubic-bezier(0.4,0,0.2,1);
        }
        .readinessGaugeArc {
          animation:gaugeGlow 3s ease-in-out infinite;
        }
        @keyframes gaugeFadeIn {
          from { opacity:0; transform:scale(0.92); }
          to { opacity:1; transform:scale(1); }
        }
        @keyframes gaugeGlow {
          0%, 100% { filter:drop-shadow(0 0 8px rgba(47,128,237,0.5)); }
          50% { filter:drop-shadow(0 0 14px rgba(47,128,237,0.7)); }
        }

        .bridgeLeft {
          display:flex;
          flex-direction:column;
          align-items:center;
          flex-shrink:0;
        }

        .readinessLabel {
          font-size:11px;
          letter-spacing:2px;
          opacity:0.8;
          margin-bottom:8px;
        }

        .readinessSub {
          font-size:12px;
          opacity:0.6;
          margin-top:4px;
        }

        .programmeBox {
          margin-top:12px;
          padding:8px 12px;
          background:linear-gradient(135deg,rgba(47,128,237,0.12),rgba(39,224,166,0.06));
          border:1px solid rgba(47,128,237,0.2);
          border-radius:10px;
          text-align:center;
          min-width:0;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .programmeBox:hover {
          box-shadow:0 0 16px rgba(47,128,237,0.25),0 0 28px rgba(39,224,166,0.12);
          border-color:rgba(47,128,237,0.35);
        }
        .programmeBoxLabel {
          display:block;
          font-size:9px;
          letter-spacing:1.2px;
          opacity:0.7;
          margin-bottom:2px;
        }
        .programmeBoxValue {
          display:block;
          font-size:12px;
          font-weight:600;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .bridgeRight {
          flex:1;
          min-width:0;
        }

        .headline {
          font-size:20px;
          font-weight:600;
          margin:0 0 18px;
          line-height:1.35;
        }

        .metaRow {
          display:flex;
          gap:24px;
          margin-bottom:0;
        }

        .sessionCardAnimate {
          animation:sessionCardFadeIn 0.8s ease-out 0.15s both;
        }
        @keyframes sessionCardFadeIn {
          from { opacity:0; transform:translateY(12px); }
          to { opacity:1; transform:translateY(0); }
        }

        .checkinRow {
          display:flex;
          align-items:center;
          flex-shrink:0;
          margin-top:0;
        }

        .dailyCheckinBtn {
          display:inline-flex;
          align-items:center;
          gap:14px;
          padding:12px 22px 12px 14px;
          border-radius:9999px;
          border:1px solid rgba(255,255,255,0.25);
          background:rgba(255,255,255,0.12);
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          color:#fff;
          cursor:pointer;
          box-shadow:0 2px 24px rgba(0,0,0,0.2),0 0 0 1px rgba(255,255,255,0.06) inset;
          transition:background 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
          text-align:left;
        }

        .dailyCheckinBtn:hover {
          background:rgba(255,255,255,0.18);
          box-shadow:0 0 20px rgba(47,128,237,0.35),0 0 36px rgba(39,224,166,0.2),0 4px 32px rgba(0,0,0,0.25),0 0 0 1px rgba(255,255,255,0.1) inset;
          transform:scale(1.01);
        }

        .dailyCheckinBtn:active {
          transform:scale(0.99);
        }

        .dailyCheckinBtnOrb {
          width:32px;
          height:32px;
          border-radius:50%;
          background:radial-gradient(circle at 30% 30%, #27E0A6, #2F80ED 60%, rgba(17,24,39,0.9));
          box-shadow:0 0 16px rgba(47,128,237,0.6),0 0 28px rgba(39,224,166,0.4),0 2px 8px rgba(0,0,0,0.2) inset;
          flex-shrink:0;
        }

        .dailyCheckinBtnText {
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          gap:2px;
        }

        .dailyCheckinBtnLabel {
          font-weight:600;
          font-size:15px;
          letter-spacing:-0.02em;
        }

        .dailyCheckinBtnSub {
          font-size:12px;
          opacity:0.85;
          font-weight:400;
        }

        .sessionCardWrap {
          display:block;
        }
        .sessionCardLink {
          text-decoration:none;
          color:inherit;
          cursor:pointer;
        }
        .sessionCardLink:hover .sessionCardInner {
          box-shadow:0 0 24px rgba(47,128,237,0.22),0 0 48px rgba(39,224,166,0.12),0 12px 40px rgba(0,0,0,0.4);
        }

        .sessionCardCtaLink {
          display:inline-block;
          padding:0;
          border:none;
          background:none;
          font:inherit;
          color:#27E0A6;
          font-weight:600;
          text-decoration:none;
          cursor:pointer;
          transition:opacity 0.2s, color 0.2s;
        }
        .sessionCardCtaLink:hover {
          color:#3df5b8;
          text-decoration:underline;
        }

        .sessionCardInner {
          background:linear-gradient(135deg,rgba(17,24,39,0.95),rgba(30,41,59,0.95));
          padding:40px;
          border-radius:24px;
          border:1px solid rgba(255,255,255,0.08);
          box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 60px rgba(47,128,237,0.12);
          transition:box-shadow 0.3s ease;
        }

        .sessionCardBridge .sessionCardMeta {
          font-size:11px;
          letter-spacing:2px;
          opacity:0.65;
          margin-bottom:10px;
        }

        .sessionCardBridge .sessionCardTitle {
          font-size:22px;
          font-weight:600;
          margin-bottom:8px;
        }

        .sessionCardBridge .sessionCardDetail {
          font-size:15px;
          opacity:0.75;
          margin-bottom:16px;
        }

        .sessionCardCtaBlock {
          font-size:15px;
          font-weight:600;
          color:#27E0A6;
          margin-bottom:16px;
        }

        .sessionCardBridge .sessionCardHint {
          font-size:14px;
          opacity:0.75;
          margin-top:0;
        }

        .sectionBlock {
          animation:sectionFadeIn 0.7s ease-out both;
        }
        .sectionBlock.delay1 { animation-delay:0.08s; }
        .sectionBlock.delay2 { animation-delay:0.16s; }
        .sectionBlock.delay3 { animation-delay:0.24s; }
        .sectionBlock.delay4 { animation-delay:0.32s; }
        .sectionBlock.delay5 { animation-delay:0.4s; }
        .sectionBlock.delay6 { animation-delay:0.48s; }
        .sectionBlock.delay7 { animation-delay:0.56s; }
        .sectionBlock.delay8 { animation-delay:0.64s; }
        .sectionBlock.delay9 { animation-delay:0.72s; }
        @keyframes sectionFadeIn {
          from { opacity:0; transform:translateY(16px); }
          to { opacity:1; transform:translateY(0); }
        }

        .sessionCard { }

        .sessionCardHead {
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:24px;
        }

        .sessionCardMeta {
          font-size:11px;
          letter-spacing:2px;
          opacity:0.65;
          margin-bottom:10px;
        }

        .sessionCardTitle {
          font-size:22px;
          font-weight:600;
          margin-bottom:10px;
          letter-spacing:0.3px;
        }

        .sessionCardDetail {
          font-size:15px;
          opacity:0.75;
        }

        .sessionCardCta {
          font-size:15px;
          font-weight:600;
          color:#27E0A6;
          flex-shrink:0;
        }

        .sessionCardHint {
          margin-top:20px;
          font-size:14px;
          opacity:0.75;
        }

        .identityCard {
          background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));
          border:1px solid rgba(255,255,255,0.08);
          border-radius:20px;
          padding:24px;
          box-shadow:0 8px 32px rgba(0,0,0,0.3);
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .identityCard:hover {
          box-shadow:0 0 24px rgba(47,128,237,0.2),0 0 48px rgba(39,224,166,0.1),0 8px 32px rgba(0,0,0,0.3);
          border-color:rgba(47,128,237,0.2);
        }
        .identityCardLayered .identityMetaRow {
          display:flex;
          flex-wrap:wrap;
          gap:12px 20px;
          margin-top:14px;
          padding-top:14px;
          border-top:1px solid rgba(255,255,255,0.06);
          font-size:11px;
          letter-spacing:0.03em;
          opacity:0.85;
        }
        .identityBias { }
        .identityLoadTolerance { }
        .identityTrend { opacity:0.9; }

        .identityCard .identityRow {
          margin-bottom:0;
        }

        .contributorDot {
          display:inline-block;
          width:6px;
          height:6px;
          border-radius:50%;
          margin-right:6px;
          vertical-align:middle;
        }
        .analysisCard {
          background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));
          border:1px solid rgba(255,255,255,0.08);
          border-radius:18px;
          padding:20px 22px;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .analysisCard:hover {
          box-shadow:0 0 20px rgba(47,128,237,0.15),0 0 40px rgba(39,224,166,0.08);
          border-color:rgba(47,128,237,0.15);
        }
        .analysisCardHead {
          display:flex;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
          margin-bottom:12px;
        }
        .analysisCardScore { font-weight:700; font-size:28px; color:rgba(255,255,255,0.95); }
        .analysisCardOutOf { font-size:14px; font-weight:500; opacity:0.6; }
        .analysisCardPercentile { font-size:12px; opacity:0.7; }
        .analysisCardTrend { font-size:14px; opacity:0.9; }
        .analysisCardExpand {
          background:none;
          border:none;
          color:inherit;
          font-size:11px;
          letter-spacing:0.04em;
          opacity:0.8;
          cursor:pointer;
          padding:4px 0;
          margin-bottom:8px;
        }
        .analysisCardExpand:hover { opacity:1; }
        .analysisCardBreakdown { margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06); }
        .analysisCardContributor {
          display:flex;
          align-items:center;
          gap:8px;
          font-size:12px;
          margin-bottom:6px;
        }
        .analysisCardContributor span:last-child { margin-left:auto; font-weight:600; }
        .analysisCardLimiting { font-size:11px; opacity:0.85; margin-top:10px; }
        .analysisCardInfluence { font-size:11px; opacity:0.65; margin-top:4px; }
        .recoveryWeights {
          display:flex;
          flex-wrap:wrap;
          gap:8px 16px;
          margin-top:10px;
        }
        .recoveryWeightItem { display:flex; align-items:center; gap:6px; font-size:12px; }
        .recoveryWeightLimiting { font-weight:600; }
        .decisionTransparencyWrap { margin-top:12px; }
        .decisionTransparencyBlock {
          padding:14px 18px;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.06);
          border-radius:12px;
          margin-bottom:12px;
        }
        .decisionTransparencyLabel { font-size:10px; letter-spacing:0.08em; opacity:0.65; margin-bottom:6px; }
        .decisionTransparencyText { font-size:13px; line-height:1.45; opacity:0.9; }
        .decisionTransparencyRisks { }
        .decisionTransparencyFlags { list-style:none; margin:8px 0 0; padding:0; font-size:12px; }
        .decisionTransparencyFlags li { display:flex; align-items:center; margin-bottom:4px; }

        .benchmarksCard {
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          justify-content:space-between;
          gap:16px;
        }

        .benchmarksRow {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:20px;
          flex:1;
          min-width:0;
        }

        .benchmarksCardLink {
          text-decoration:none;
          color:inherit;
          transition:box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .benchmarksCardLink:hover {
          border-color:rgba(255,255,255,0.12);
          box-shadow:0 0 24px rgba(47,128,237,0.2),0 0 48px rgba(39,224,166,0.1),0 8px 32px rgba(0,0,0,0.3);
        }

        .grid {
          display:grid;
          grid-template-columns:1fr;
          gap:20px;
        }

        .identityRow {
          display:grid;
          grid-template-columns:1fr;
          gap:20px;
        }

        .checkinBackdrop {
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.75);
          display:flex;
          align-items:flex-start;
          justify-content:center;
          padding-top:48px;
          z-index:10002;
        }

        .checkinModal {
          background:#0A1220;
          border-radius:16px;
          overflow:hidden;
          max-width:420px;
          width:100%;
          border:1px solid rgba(255,255,255,0.1);
        }

        .checkinModalHeader {
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:14px 18px;
          border-bottom:1px solid rgba(255,255,255,0.08);
        }

        .checkinModalClose {
          background:none;
          border:none;
          color:white;
          font-size:24px;
          cursor:pointer;
          opacity:0.8;
          line-height:1;
        }

        .checkinModalClose:hover { opacity:1; }

        .checkinIntro {
          padding:0 18px 16px;
          font-size:13px;
          opacity:0.85;
          line-height:1.45;
        }

        .checkinForm {
          padding:0 18px 20px;
          display:flex;
          flex-direction:column;
          gap:14px;
        }

        .checkinForm label {
          display:flex;
          flex-direction:column;
          gap:6px;
          font-size:13px;
        }

        .checkinForm label span:first-of-type { opacity:0.9; }

        .checkinForm input[type="range"] {
          width:100%;
          accent-color:#2F80ED;
        }

        .checkinForm select {
          padding:8px 12px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:8px;
          color:white;
          font-size:14px;
        }

        .checkinText {
          padding:8px 12px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:8px;
          color:white;
          font-size:14px;
        }

        .rangeVal { font-weight:600; opacity:1; }

        .checkinSubmitBtn {
          margin-top:8px;
          padding:12px 20px;
          background:#2F80ED;
          border:none;
          border-radius:10px;
          color:white;
          font-weight:600;
          cursor:pointer;
        }

        .checkinSubmitBtn:hover:not(:disabled) {
          background:#2563eb;
        }

        .checkinSubmitBtn:disabled {
          opacity:0.7;
          cursor:not-allowed;
        }

        @media (min-width: 769px) {
          .container {
            max-width: 1200px;
            margin: 20px auto;
          }
          .readinessBlock {
            max-width: 320px;
          }
          .grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .identityRow {
            grid-template-columns: repeat(5, 1fr);
          }
          .benchmarksRow {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 768px) {
          .nav {
            flex-wrap: wrap;
            padding: 14px 16px;
            gap: 12px;
          }
          .brand {
            font-size: 10px;
            letter-spacing: 1.5px;
          }
          .tabs {
            gap: 16px;
            flex-wrap: wrap;
          }
          .container {
            padding: 16px;
            margin: 0 auto;
          }
          .headline {
            font-size: 18px;
          }
          .metaRow {
            flex-direction: column;
            gap: 12px;
            margin-bottom: 14px;
          }
          .sessionCardInner {
            padding: 24px 20px;
          }
          .sessionCardBridge .sessionCardTitle {
            font-size: 18px;
          }
          .grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .identityRow {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .identityCard {
            padding: 20px;
          }
          .benchmarksRow {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }

      `}</style>
      </div>
  );
}

/* ================= COMPONENTS ================= */

function NavTab({ href, label, pathname }: any) {
  const active = pathname === href;
  return (
    <Link href={href}>
      <span style={{
        fontSize:14,
        opacity:active?1:0.6,
        borderBottom:active?"2px solid #2F80ED":"2px solid transparent",
        paddingBottom:4,
        cursor:"pointer"
      }}>
        {label}
      </span>
    </Link>
  );
}

function Meta({ label, value, highlight }: any) {
  return (
    <div>
      <div style={{ fontSize:10, opacity:0.6 }}>{label}</div>
      <div style={highlight?{color:"#27E0A6"}:{}}>{value}</div>
    </div>
  );
}

function getScoreBand(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Elite", color: "#27E0A6" };
  if (score >= 60) return { label: "Strong", color: "#2F80ED" };
  if (score >= 40) return { label: "Good", color: "#93c5fd" };
  return { label: "Building", color: "rgba(255,255,255,0.5)" };
}

function getMetricInterpretation(label: string, score: number): string {
  const band = getScoreBand(score).label;
  if (label === "Aerobic Capacity")
    return band === "Elite" ? "Supports high training load" : band === "Strong" ? "Good base for endurance work" : band === "Good" ? "Room to build aerobic base" : "Focus on steady-state work";
  if (label === "Sleep Quality")
    return band === "Elite" ? "Optimal recovery" : band === "Strong" ? "Supports adaptation" : band === "Good" ? "Aim for consistency" : "Prioritise sleep to recover";
  if (label === "Hip Mobility")
    return band === "Elite" ? "Full range for lifts" : band === "Strong" ? "Good movement quality" : band === "Good" ? "Keep mobility work in" : "Add mobility each session";
  if (label === "Strength (Upper)")
    return band === "Elite" ? "Peak pushing/pulling" : band === "Strong" ? "Solid upper-body base" : band === "Good" ? "Building strength" : "Progressive loading";
  if (label === "Strength (Lower)")
    return band === "Elite" ? "Peak squat/hinge" : band === "Strong" ? "Solid lower-body base" : band === "Good" ? "Building strength" : "Progressive loading";
  if (label === "Work Capacity")
    return band === "Elite" ? "High volume tolerance" : band === "Strong" ? "Good mix of strength & cardio" : band === "Good" ? "Balancing both" : "Build base in both";
  return "";
}

function DomainCard({
  label,
  value,
  trend,
  sparklineData,
  limitingFactor,
  programmeInfluence,
}: {
  label: string;
  value: number;
  trend?: "up" | "down" | "stable";
  sparklineData?: number[];
  limitingFactor?: string | null;
  programmeInfluence?: string | null;
}) {
  const band = getScoreBand(value);
  const interpretation = getMetricInterpretation(label, value);
  const trendArrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const points = sparklineData?.length ? sparklineData : [value];
  const maxP = Math.max(...points);
  const minP = Math.min(...points);
  const range = maxP - minP || 1;

  return (
    <div className="domainCard domainCardLayered" style={{
      background:"linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",
      borderRadius:18,
      padding:22,
      transition:"box-shadow 0.3s ease, border-color 0.3s ease"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <span style={{fontSize:13,opacity:0.9}}>{label}</span>
        <span style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontWeight:700,fontSize:20,color:band.color}}>{value}</span>
          {trend && <span className="domainCardTrend" style={{fontSize:12,opacity:0.8}} title="Trend">{trendArrow}</span>}
        </span>
      </div>
      {points.length >= 2 && (
        <div className="domainCardSparkline" style={{height:24,marginBottom:10,display:"flex",alignItems:"flex-end",gap:2}}>
          {points.map((p, i) => (
            <div
              key={i}
              style={{
                flex:1,
                height: `${Math.max(4, ((p - minP) / range) * 100)}%`,
                minHeight:4,
                background: "linear-gradient(180deg, rgba(47,128,237,0.5), rgba(39,224,166,0.3))",
                borderRadius:2,
                transition: "height 0.25s ease",
              }}
              title={`${p}`}
            />
          ))}
        </div>
      )}
      <div style={{fontSize:11,opacity:0.7,marginBottom:8}}>
        {band.label} · out of 100
      </div>
      {interpretation && (
        <div style={{fontSize:12,opacity:0.75,lineHeight:1.4,marginBottom:8}}>
          {interpretation}
        </div>
      )}
      {limitingFactor && <div className="domainCardLimiting" style={{fontSize:11,opacity:0.8,marginTop:6}}>Limiting: {limitingFactor}</div>}
      {programmeInfluence && <div className="domainCardInfluence" style={{fontSize:11,opacity:0.65,marginTop:4}}>{programmeInfluence}</div>}
    </div>
  );
}

function Identity({ label, value }: any) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.05)",
      padding:18,
      borderRadius:16
    }}>
      <div style={{fontSize:10,opacity:0.6,marginBottom:4}}>
        {label}
      </div>
      <div style={{fontWeight:600}}>
        {value}
      </div>
    </div>
  );
}

function getBenchmarkKg(profile: Profile | null, key: string): number | null {
  if (!profile?.performance_benchmarks?.exerciseBenchmarks) return null;
  const b = profile.performance_benchmarks.exerciseBenchmarks[key as keyof typeof profile.performance_benchmarks.exerciseBenchmarks];
  if (!b) return null;
  const v = b.oneRM ?? b.estimatedOneRM;
  return v != null && v > 0 ? v : null;
}

function getTop4Benchmarks(profile: Profile | null): { key: string; label: string; value: number | null }[] {
  const bench = profile?.performance_benchmarks?.exerciseBenchmarks ?? {};
  const entries = Object.entries(bench)
    .map(([key, b]) => {
      const v = (b as { oneRM?: number; estimatedOneRM?: number })?.oneRM ?? (b as { estimatedOneRM?: number })?.estimatedOneRM ?? null;
      const label = ALL_BENCHMARK_DISPLAY_NAMES[key] ?? ALL_OPTION_DISPLAY_NAMES[key] ?? key.replace(/_/g, " ");
      return { key, label, value: v != null && v > 0 ? v : null };
    })
    .filter((e): e is { key: string; label: string; value: number } => e.value != null);
  entries.sort((a, b) => b.value - a.value);
  const top4: { key: string; label: string; value: number | null }[] = entries.slice(0, 4).map((e) => ({ key: e.key, label: e.label, value: e.value }));
  const placeholders = ["Back Squat", "Bench Press", "Deadlift", "Overhead Press"];
  while (top4.length < 4) {
    top4.push({ key: `p${top4.length}`, label: placeholders[top4.length], value: null });
  }
  return top4;
}

function BenchmarkPill({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.05)",
      padding:18,
      borderRadius:16
    }}>
      <div style={{fontSize:10,opacity:0.6,marginBottom:4}}>
        {label}
      </div>
      <div style={{fontWeight:600}}>
        {value != null ? `${value} kg` : "—"}
      </div>
    </div>
  );
}

function Signal({ title, subtitle }: any) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.05)",
      padding:18,
      borderRadius:16,
      marginBottom:12
    }}>
      <div style={{fontWeight:600}}>
        {title}
      </div>
      <div style={{opacity:0.6,fontSize:13}}>
        {subtitle}
      </div>
    </div>
  );
}

function SessionCard() {
  return (
    <div className="sessionCard">
      <div className="sessionCardHead">
        <div>
          <div className="sessionCardMeta">TODAY'S SESSION · VIEW PROGRAMME</div>
          <div className="sessionCardTitle">Lower Body Aerobic</div>
          <div className="sessionCardDetail">60 min · 4 exercises · Low–Mod intensity</div>
        </div>
        <Link href="/programme" className="sessionCardCtaLink">View programme →</Link>
      </div>
      <div className="sessionCardHint">
        Targets what's holding you back: Aerobic Capacity
      </div>
    </div>
  );
}

function SectionTitle({ text }: any) {
  return (
    <div style={{
      fontSize:11,
      letterSpacing:2,
      opacity:0.6,
      marginBottom:12
    }}>
      {text}
    </div>
  );
}
```

## app/components/programme/DayAccordion.tsx

```tsx
"use client";

import { useState, useMemo, useRef } from "react";
import SessionBlock, { type SessionBlockData, type ExerciseData, getTotalSetsFromBlocks } from "./SessionBlock";
import SessionProgress from "./SessionProgress";
import SessionOverview from "./SessionOverview";
import SessionSummary from "./SessionSummary";

/**
 * Day type for colour coding: Red = high load, Green = moderate, Recovery = light/off.
 */
export type DayType = "Red" | "Green" | "Recovery" | "Off";

export type ProgrammeDayData = {
  day: string;
  type: DayType;
  title: string;
  duration: number;
  performanceNotes?: string;
  blocks: SessionBlockData[];
};

export type DayAccordionProps = {
  day: ProgrammeDayData;
  dayId: string;
  expanded: boolean;
  onToggle: () => void;
  /** Session date for autosave (YYYY-MM-DD), default today */
  sessionDate?: string;
  unit?: "kg" | "lb";
  showRpe?: boolean;
};

const DAY_INDICATOR: Record<DayType, { char: string; color: string }> = {
  Red: { char: "🔴", color: "rgba(239,68,68,0.9)" },
  Green: { char: "🟢", color: "rgba(39,224,166,0.9)" },
  Recovery: { char: "⚪", color: "rgba(255,255,255,0.6)" },
  Off: { char: "⚫", color: "rgba(255,255,255,0.4)" },
};

export default function DayAccordion({
  day,
  dayId,
  expanded,
  onToggle,
  sessionDate: propsSessionDate,
  unit = "kg",
  showRpe = false,
}: DayAccordionProps) {
  const indicator = DAY_INDICATOR[day.type] ?? DAY_INDICATOR.Recovery;
  const sessionDate = propsSessionDate ?? (typeof window !== "undefined" ? new Date().toISOString().slice(0, 10) : "");

  const totalSets = useMemo(() => getTotalSetsFromBlocks(day.blocks), [day.blocks]);
  const [completedByKey, setCompletedByKey] = useState<Record<string, number>>({});
  const completedSets = useMemo(
    () => Object.values(completedByKey).reduce((a, b) => a + b, 0),
    [completedByKey]
  );
  const [completionTime, setCompletionTime] = useState<string | null>(null);
  const completionRecorded = useRef(false);

  if (totalSets > 0 && completedSets >= totalSets && !completionRecorded.current) {
    completionRecorded.current = true;
    const t = new Date();
    setCompletionTime(t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
  }
  if (completedSets < totalSets) completionRecorded.current = false;

  const handleSetCompletionChange = (
    blockIndex: number,
    exerciseIndex: number,
    completed: number
  ) => {
    setCompletedByKey((prev) => ({
      ...prev,
      [`${blockIndex}-${exerciseIndex}`]: completed,
    }));
  };

  const allComplete = totalSets > 0 && completedSets >= totalSets;

  return (
    <div
      style={{
        marginBottom: 10,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`day-content-${dayId}`}
        id={`day-header-${dayId}`}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "none",
          border: "none",
          color: "inherit",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }} aria-hidden>
            {indicator.char}
          </span>
          <span>
            {day.day} – {day.type} Day
          </span>
          {day.duration > 0 && (
            <span style={{ opacity: 0.75, fontWeight: 400 }}>
              ({day.duration} min)
            </span>
          )}
        </span>
        <span style={{ fontSize: 12, opacity: 0.8 }} aria-hidden>
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      {expanded && (
        <div
          id={`day-content-${dayId}`}
          role="region"
          aria-labelledby={`day-header-${dayId}`}
          style={{
            padding: "0 18px 18px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {totalSets > 0 && (
            <SessionProgress
              totalSets={totalSets}
              completedSets={completedSets}
              label="Session Progress"
            />
          )}

          <SessionOverview
            focus={day.title}
            duration={day.duration > 0 ? day.duration : undefined}
            objective={day.performanceNotes ?? "High force output, low fatigue"}
          />

          {day.blocks.map((block, i) => (
            <SessionBlock
              key={i}
              block={block}
              index={i}
              sessionDate={sessionDate}
              unit={unit}
              showRpe={showRpe}
              onSetCompletionChange={handleSetCompletionChange}
            />
          ))}

          {allComplete && (
            <SessionSummary
              totalSetsCompleted={completedSets}
              completionTime={completionTime ?? undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

## app/components/programme/ExerciseCard.tsx

```tsx
"use client";

import { useState, useEffect } from "react";
import SetTracker from "./SetTracker";
import RestTimer from "./RestTimer";

/**
 * ExerciseCard — high-performance execution card.
 * Prescription line, rest, tempo, coach notes, demo (modal), set pills, rest timer.
 */

export type ExerciseData = {
  name: string;
  sets?: number;
  reps?: number | string;
  load?: string;
  rest?: string;
  tempo?: string;
  notes?: string;
  demoUrl?: string;
};

export type ExerciseCardProps = {
  exercise: ExerciseData;
  index?: number;
  onCompletedChange?: (completed: number, total: number) => void;
  exerciseKey?: string;
  unit?: "kg" | "lb";
  sessionDate?: string;
  showRpe?: boolean;
};

function toEmbedUrl(url: string): string {
  const u = url.trim();
  const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  return u;
}

export default function ExerciseCard({
  exercise,
  index = 0,
  onCompletedChange,
  exerciseKey,
  unit = "kg",
  sessionDate,
  showRpe = false,
}: ExerciseCardProps) {
  const { name, sets, reps, load, rest, tempo, notes, demoUrl } = exercise;
  const setCount = sets ?? 0;
  const key = exerciseKey ?? `${name}-${index}`;
  const [demoOpen, setDemoOpen] = useState(false);

  const prescription =
    sets != null && reps != null
      ? load != null && load !== ""
        ? `${sets} × ${reps} @ ${load}`
        : `${sets} × ${reps}`
      : null;

  useEffect(() => {
    if (!demoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDemoOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [demoOpen]);

  const isYoutube = demoUrl?.includes("youtube") || demoUrl?.includes("youtu.be");

  return (
    <>
      <div
        style={{
          padding: "18px 20px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 8,
            opacity: 0.98,
            letterSpacing: "-0.01em",
          }}
        >
          {name}
        </div>

        {prescription && (
          <div style={{ fontSize: 15, fontWeight: 600, opacity: 0.9, marginBottom: 6 }}>
            {prescription}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 20px", fontSize: 13, opacity: 0.85, marginBottom: notes ? 10 : 0 }}>
          {rest != null && rest !== "" && <span>Rest {rest}</span>}
          {tempo != null && tempo !== "" && <span>Tempo {tempo}</span>}
        </div>

        {notes != null && notes !== "" && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              paddingLeft: 12,
              borderLeft: "3px solid rgba(47,128,237,0.5)",
              background: "rgba(0,0,0,0.15)",
              borderRadius: 0,
              fontSize: 12,
              lineHeight: 1.5,
              opacity: 0.9,
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: "0.06em", opacity: 0.75, marginBottom: 4 }}>Coach Note</div>
            {notes}
          </div>
        )}

        {demoUrl != null && demoUrl !== "" && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                background: "rgba(47,128,237,0.25)",
                border: "1px solid rgba(47,128,237,0.45)",
                borderRadius: 10,
                color: "#93c5fd",
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              Watch Demo
            </button>
          </div>
        )}

        {setCount > 0 && (
          <SetTracker
            sets={setCount}
            exerciseKey={key}
            sessionDate={sessionDate}
            showRpe={showRpe}
            unit={unit}
            onCompletedChange={onCompletedChange}
          />
        )}

        {rest != null && rest !== "" && <RestTimer rest={rest} label="Rest" />}
      </div>

      {demoOpen && demoUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Exercise demo video"
          onClick={() => setDemoOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0a0a0f",
              borderRadius: 16,
              overflow: "hidden",
              maxWidth: 640,
              width: "100%",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{name} — Demo</span>
              <button
                type="button"
                onClick={() => setDemoOpen(false)}
                aria-label="Close"
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: 24,
                  cursor: "pointer",
                  opacity: 0.8,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
              {isYoutube ? (
                <iframe
                  src={toEmbedUrl(demoUrl)}
                  title={`${name} demo`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={demoUrl}
                  controls
                  autoPlay
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

## app/components/programme/ProgrammeWeekView.tsx

```tsx
"use client";

import { useState, useCallback } from "react";
import DayAccordion, { type ProgrammeDayData } from "./DayAccordion";

/**
 * Data for a single week: week number and list of days.
 */
export type ProgrammeWeekData = {
  week: number;
  days: ProgrammeDayData[];
};

export type ProgrammeWeekViewProps = {
  /** The selected week's data */
  weekData: ProgrammeWeekData;
  /** Callback when user expands/collapses a day; parent can track expandedDay for controlled use */
  onExpandedDayChange?: (dayId: string | null) => void;
  /** Optional: controlled expanded day id (e.g. "monday-1"). If not provided, internal state is used. */
  expandedDayId?: string | null;
};

export default function ProgrammeWeekView({
  weekData,
  onExpandedDayChange,
  expandedDayId: controlledExpandedId,
}: ProgrammeWeekViewProps) {
  const [internalExpanded, setInternalExpanded] = useState<string | null>(null);

  const isControlled = controlledExpandedId !== undefined;
  const expandedDay = isControlled ? controlledExpandedId : internalExpanded;

  const handleToggle = useCallback(
    (dayId: string) => {
      const next = expandedDay === dayId ? null : dayId;
      if (isControlled && onExpandedDayChange) {
        onExpandedDayChange(next);
      } else {
        setInternalExpanded(next);
        onExpandedDayChange?.(next);
      }
    },
    [expandedDay, isControlled, onExpandedDayChange]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {weekData.days.map((day, i) => {
        const dayId = `${day.day.toLowerCase().replace(/\s/g, "-")}-w${weekData.week}-${i}`;
        return (
          <DayAccordion
            key={dayId}
            day={day}
            dayId={dayId}
            expanded={expandedDay === dayId}
            onToggle={() => handleToggle(dayId)}
          />
        );
      })}
    </div>
  );
}
```

## app/components/programme/RestTimer.tsx

```tsx
"use client";

import { useState, useEffect, useRef } from "react";

/**
 * RestTimer — compact rest card. Countdown when started.
 */

export type RestTimerProps = {
  rest: string;
  label?: string;
};

function parseRestToSeconds(rest: string): number {
  if (!rest || typeof rest !== "string") return 0;
  const trimmed = rest.trim();
  const colon = trimmed.indexOf(":");
  if (colon !== -1) {
    const min = parseInt(trimmed.slice(0, colon), 10) || 0;
    const sec = parseInt(trimmed.slice(colon + 1), 10) || 0;
    return min * 60 + sec;
  }
  const num = parseInt(trimmed.replace(/\D/g, ""), 10);
  return Number.isNaN(num) ? 0 : num;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RestTimer({ rest, label = "Rest" }: RestTimerProps) {
  const totalSeconds = parseRestToSeconds(rest);
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, totalSeconds]);

  const start = () => {
    setRemaining(totalSeconds > 0 ? totalSeconds : 60);
    setRunning(true);
  };

  const displaySeconds = totalSeconds > 0 ? totalSeconds : 60;

  return (
    <div
      style={{
        marginTop: 14,
        padding: "14px 16px",
        background: "rgba(47,128,237,0.08)",
        border: "1px solid rgba(47,128,237,0.2)",
        borderRadius: 12,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.08em", opacity: 0.75, width: "100%" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.95, letterSpacing: "0.02em" }}>
        {running ? formatTime(remaining) : formatTime(displaySeconds)}
      </div>
      <button
        type="button"
        onClick={start}
        disabled={running}
        style={{
          padding: "10px 18px",
          fontSize: 13,
          fontWeight: 600,
          background: running ? "rgba(255,255,255,0.08)" : "rgba(47,128,237,0.4)",
          border: "1px solid rgba(47,128,237,0.5)",
          borderRadius: 10,
          color: "#fff",
          cursor: running ? "default" : "pointer",
          minHeight: 44,
        }}
      >
        {running ? "Resting…" : "Start Rest"}
      </button>
    </div>
  );
}
```

## app/components/programme/SessionBlock.tsx

```tsx
"use client";

/**
 * SessionBlock — renders a single block within an expanded day (Prep, Main, Accessory, Conditioning, etc.).
 * Renders all exercises as ExerciseCards (name, sets, reps, load, rest, tempo, notes + SetTracker + RestTimer).
 * Supports both string exercises (parsed into ExerciseData) and structured ExerciseData objects.
 * Additive component; does not modify existing layout or styling.
 */

import ExerciseCard, { type ExerciseData } from "./ExerciseCard";

export type { ExerciseData };

export type SessionBlockType =
  | "performanceNotes"
  | "prep"
  | "main"
  | "accessory"
  | "conditioning"
  | "recovery";

export type SessionBlockData = {
  type: SessionBlockType;
  /** For performanceNotes */
  text?: string;
  /** For prep, main, accessory, conditioning, recovery: strings (legacy) or structured exercises */
  exercises?: (string | ExerciseData)[];
  /** Optional label override */
  label?: string;
};

const BLOCK_LABELS: Record<SessionBlockType, string> = {
  performanceNotes: "Performance Notes",
  prep: "PREP",
  main: "MAIN",
  accessory: "ACCESSORY",
  conditioning: "Conditioning",
  recovery: "Recovery",
};

function isExerciseData(x: string | ExerciseData): x is ExerciseData {
  return typeof x === "object" && x !== null && "name" in x;
}

/**
 * Parse string exercises like "Trap Bar Deadlift 6x2 @ 90%" or "Strict Press 4x5 @ RPE 8"
 * into ExerciseData so we can render ExerciseCard (with SetTracker + RestTimer).
 * If no pattern matches, returns { name: str } for basic card display.
 */
function parseStringToExerciseData(str: string): ExerciseData {
  const trimmed = str.trim();
  if (!trimmed) return { name: trimmed };

  // e.g. "Trap Bar Deadlift 6x2 @ 90%" or "Back Squat 4x4 @ 80%" or "Strict Press 4x5 @ RPE 8"
  const setsRepsLoad = trimmed.match(/^(.+?)\s+(\d+)x(\d+)(?:\s*@\s*(.+))?$/);
  if (setsRepsLoad) {
    const [, name, setsStr, repsStr, load] = setsRepsLoad;
    const nameTrim = (name ?? trimmed).trim();
    const sets = parseInt(setsStr ?? "0", 10);
    const reps = parseInt(repsStr ?? "0", 10);
    return {
      name: nameTrim,
      sets: Number.isNaN(sets) ? undefined : sets,
      reps: Number.isNaN(reps) ? undefined : reps,
      load: load?.trim() ?? undefined,
      rest: "2:00",
    };
  }

  // e.g. "Split Squat 3x8 ea" or "RDL 3x8" (no load)
  const setsRepsOnly = trimmed.match(/^(.+?)\s+(\d+)x(\d+)\s*(.*)$/);
  if (setsRepsOnly) {
    const [, name, setsStr, repsStr, suffix] = setsRepsOnly;
    const nameTrim = (name ?? "").trim();
    const sets = parseInt(setsStr ?? "0", 10);
    const repsVal = (suffix ?? "").trim() ? `${repsStr} ${suffix.trim()}` : repsStr;
    return {
      name: nameTrim,
      sets: Number.isNaN(sets) ? undefined : sets,
      reps: repsVal,
      rest: "2:00",
    };
  }

  return { name: trimmed };
}

/**
 * Normalize each exercise to ExerciseData so we always render ExerciseCard.
 */
function normalizeExercise(item: string | ExerciseData): ExerciseData {
  if (isExerciseData(item)) return item;
  return parseStringToExerciseData(item);
}

/**
 * Count total sets across all blocks (normalizes string exercises for count).
 * Used by DayAccordion for SessionProgress and SessionSummary.
 */
export function getTotalSetsFromBlocks(blocks: SessionBlockData[]): number {
  return blocks.reduce((sum, block) => {
    const ex = block.exercises ?? [];
    return sum + ex.reduce((s, e) => s + (normalizeExercise(e).sets ?? 0), 0);
  }, 0);
}

export type SessionBlockProps = {
  block: SessionBlockData;
  index?: number;
  onSetCompletionChange?: (blockIndex: number, exerciseIndex: number, completed: number, total: number) => void;
  /** Session date for SetTracker autosave (YYYY-MM-DD) */
  sessionDate?: string;
  /** Unit for weight display (kg/lb) */
  unit?: "kg" | "lb";
  showRpe?: boolean;
};

export default function SessionBlock({ block, index: blockIndex = 0, onSetCompletionChange, sessionDate, unit = "kg", showRpe = false }: SessionBlockProps) {
  const label = block.label ?? BLOCK_LABELS[block.type];

  if (block.type === "performanceNotes") {
    return (
      <div
        style={{
          padding: "14px 18px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            opacity: 0.7,
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>
          {block.text || "—"}
        </div>
      </div>
    );
  }

  const exercises = block.exercises ?? [];

  if (exercises.length === 0) {
    return (
      <div
        style={{
          padding: "14px 18px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            opacity: 0.85,
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>—</div>
      </div>
    );
  }

  const normalizedExercises = exercises.map(normalizeExercise);

  return (
    <div
      style={{
        padding: "14px 18px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          opacity: 0.85,
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {normalizedExercises.map((exercise, i) => (
          <ExerciseCard
            key={`${exercise.name}-${blockIndex}-${i}`}
            exercise={exercise}
            index={i}
            exerciseKey={`block-${blockIndex}-ex-${i}`}
            sessionDate={sessionDate}
            unit={unit}
            showRpe={showRpe}
            onCompletedChange={
              onSetCompletionChange
                ? (completed, total) => onSetCompletionChange(blockIndex, i, completed, total)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
```

## app/components/programme/SessionOverview.tsx

```tsx
"use client";

/**
 * SessionOverview — compact card at top of expanded session.
 * Shows session focus, estimated duration, primary objective.
 * Additive component; does not change programme page layout or styling.
 */

export type SessionOverviewProps = {
  /** Session focus (e.g. "Neural Strength") */
  focus?: string;
  /** Estimated duration in minutes */
  duration?: number;
  /** Primary objective (e.g. "High force output, low fatigue") */
  objective?: string;
};

export default function SessionOverview({
  focus,
  duration,
  objective,
}: SessionOverviewProps) {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: "14px 18px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.08em", opacity: 0.7, marginBottom: 10 }}>
        Session Overview
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, lineHeight: 1.5 }}>
        {focus != null && focus !== "" && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ opacity: 0.75, minWidth: 72 }}>Focus</span>
            <span style={{ opacity: 0.95 }}>{focus}</span>
          </div>
        )}
        {duration != null && duration > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ opacity: 0.75, minWidth: 72 }}>Duration</span>
            <span style={{ opacity: 0.95 }}>{duration} minutes</span>
          </div>
        )}
        {objective != null && objective !== "" && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ opacity: 0.75, minWidth: 72 }}>Objective</span>
            <span style={{ opacity: 0.95 }}>{objective}</span>
          </div>
        )}
        {(!focus || focus === "") && (!duration || duration <= 0) && (!objective || objective === "") && (
          <span style={{ opacity: 0.7 }}>—</span>
        )}
      </div>
    </div>
  );
}
```

## app/components/programme/SessionProgress.tsx

```tsx
"use client";

/**
 * SessionProgress — progress bar and sets count at top of expanded session.
 * Shows completed sets / total sets and percentage.
 */

export type SessionProgressProps = {
  totalSets: number;
  completedSets: number;
  label?: string;
};

export default function SessionProgress({
  totalSets,
  completedSets,
  label = "Session Progress",
}: SessionProgressProps) {
  const total = Math.max(0, totalSets);
  const completed = Math.max(0, Math.min(completedSets, total));
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "14px 18px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          fontSize: 12,
          letterSpacing: "0.05em",
          opacity: 0.85,
        }}
      >
        <span>{label}</span>
        <span>{completed} / {total} sets · {percent}%</span>
      </div>
      <div
        style={{
          height: 8,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "linear-gradient(90deg, rgba(47,128,237,0.6), rgba(39,224,166,0.5))",
            borderRadius: 4,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
```

## app/components/programme/SessionSummary.tsx

```tsx
"use client";

/**
 * SessionSummary — shown when all sets are complete.
 * Displays total sets completed, estimated load lifted, completion time.
 * Additive component; does not change programme page layout or styling.
 */

export type SessionSummaryProps = {
  /** Total sets completed */
  totalSetsCompleted: number;
  /** Estimated load lifted (e.g. "12,400 kg" or optional) */
  estimatedLoadLifted?: string;
  /** Completion time (e.g. "10:45 AM" or "42 min") */
  completionTime?: string;
};

export default function SessionSummary({
  totalSetsCompleted,
  estimatedLoadLifted,
  completionTime,
}: SessionSummaryProps) {
  return (
    <div
      style={{
        marginTop: 20,
        marginBottom: 16,
        padding: "18px 20px",
        background: "linear-gradient(135deg, rgba(39,224,166,0.1), rgba(47,128,237,0.08))",
        border: "1px solid rgba(39,224,166,0.25)",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 14,
          opacity: 0.95,
        }}
      >
        Session Complete
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.8 }}>Total Sets Completed</span>
          <span style={{ fontWeight: 600, opacity: 0.95 }}>{totalSetsCompleted}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.8 }}>Estimated Load Lifted</span>
          <span style={{ opacity: 0.95 }}>{estimatedLoadLifted ?? "—"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.8 }}>Completion Time</span>
          <span style={{ opacity: 0.95 }}>{completionTime ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}
```

## app/components/programme/SetTracker.tsx

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_PREFIX = "session";

/**
 * SetTracker — high-performance set execution as interactive pills.
 * Each pill: [ Set N ] weight ✓/○. Autosaves to localStorage.
 */

export type SetTrackerProps = {
  sets: number;
  onCompletedChange?: (completed: number, total: number) => void;
  exerciseKey?: string;
  sessionDate?: string;
  showRpe?: boolean;
  unit?: string;
};

type SetRow = {
  weight: string;
  completed: boolean;
  rpe: string;
};

function getStorageKey(sessionDate: string, exerciseKey: string): string {
  return `${STORAGE_PREFIX}-${sessionDate}-${exerciseKey}`;
}

function loadRows(key: string, sets: number): SetRow[] {
  if (typeof window === "undefined") return Array.from({ length: sets }, () => ({ weight: "", completed: false, rpe: "" }));
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return Array.from({ length: sets }, () => ({ weight: "", completed: false, rpe: "" }));
    const parsed = JSON.parse(raw) as SetRow[];
    const need = Math.max(0, sets);
    return Array.from({ length: need }, (_, i) => ({
      weight: parsed[i]?.weight ?? "",
      completed: parsed[i]?.completed ?? false,
      rpe: parsed[i]?.rpe ?? "",
    }));
  } catch {
    return Array.from({ length: sets }, () => ({ weight: "", completed: false, rpe: "" }));
  }
}

export default function SetTracker({
  sets,
  onCompletedChange,
  exerciseKey,
  sessionDate,
  showRpe = false,
  unit = "kg",
}: SetTrackerProps) {
  const dateStr = sessionDate ?? (typeof window !== "undefined" ? new Date().toISOString().slice(0, 10) : "");
  const storageKey = exerciseKey && dateStr ? getStorageKey(dateStr, exerciseKey) : "";

  const [rows, setRows] = useState<SetRow[]>(() =>
    storageKey ? loadRows(storageKey, Math.max(0, sets)) : Array.from({ length: Math.max(0, sets) }, () => ({ weight: "", completed: false, rpe: "" }))
  );

  useEffect(() => {
    const next = Math.max(0, sets);
    setRows((prev) => {
      if (prev.length === next) return prev;
      if (next > prev.length) {
        return [...prev, ...Array.from({ length: next - prev.length }, () => ({ weight: "", completed: false, rpe: "" }))];
      }
      return prev.slice(0, next);
    });
  }, [sets]);

  useEffect(() => {
    if (!storageKey || rows.length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(rows));
    } catch {
      // ignore
    }
  }, [storageKey, rows]);

  const completed = rows.filter((r) => r.completed).length;
  const total = rows.length;

  useEffect(() => {
    onCompletedChange?.(completed, total);
  }, [completed, total, onCompletedChange]);

  const setWeight = useCallback((index: number, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], weight: value };
      return next;
    });
  }, []);

  const setCompleted = useCallback((index: number, value: boolean) => {
    setRows((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], completed: value };
      return next;
    });
  }, []);

  const setRpe = useCallback((index: number, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], rpe: value };
      return next;
    });
  }, []);

  if (total === 0) return null;

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {rows.map((row, i) => (
          <div
            key={exerciseKey ? `${exerciseKey}-${i}` : i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              minHeight: 48,
              background: row.completed ? "rgba(39,224,166,0.12)" : "rgba(255,255,255,0.06)",
              border: row.completed ? "1px solid rgba(39,224,166,0.3)" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              flex: "1 1 140px",
              maxWidth: 220,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, minWidth: 36 }}>Set {i + 1}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder={unit}
              value={row.weight}
              onChange={(e) => setWeight(i, e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "8px 10px",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
              }}
              aria-label={`Set ${i + 1} weight`}
            />
            {showRpe && (
              <input
                type="text"
                inputMode="decimal"
                placeholder="RPE"
                value={row.rpe}
                onChange={(e) => setRpe(i, e.target.value)}
                style={{
                  width: 40,
                  padding: "8px 6px",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                  textAlign: "center",
                }}
                aria-label={`Set ${i + 1} RPE`}
              />
            )}
            <button
              type="button"
              onClick={() => setCompleted(i, !row.completed)}
              aria-label={row.completed ? `Set ${i + 1} completed` : `Mark set ${i + 1} complete`}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.3)",
                background: row.completed ? "rgba(39,224,166,0.5)" : "transparent",
                color: row.completed ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: 16,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {row.completed ? "✓" : "○"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## app/components/programme/WeekSelector.tsx

```tsx
"use client";

/**
 * WeekSelector — horizontal week selector for programme navigation.
 * Displays week buttons, highlights the active week, triggers week change via callback.
 * Additive component; does not modify existing layout or styling.
 */

export type WeekSelectorProps = {
  /** Total number of weeks in the phase */
  totalWeeks: number;
  /** Currently selected week (1-based) */
  selectedWeek: number;
  /** Callback when user selects a different week */
  onWeekChange: (week: number) => void;
  /** Optional class name for the container */
  className?: string;
};

export default function WeekSelector({
  totalWeeks,
  selectedWeek,
  onWeekChange,
  className = "",
}: WeekSelectorProps) {
  const weeks = Array.from({ length: Math.max(1, totalWeeks) }, (_, i) => i + 1);

  return (
    <div
      className={className}
      role="tablist"
      aria-label="Select week"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
      }}
    >
      {weeks.map((weekNum) => {
        const isActive = weekNum === selectedWeek;
        return (
          <button
            key={weekNum}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Week ${weekNum}`}
            onClick={() => onWeekChange(weekNum)}
            style={{
              padding: "10px 16px",
              minWidth: 72,
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "#fff" : "rgba(255,255,255,0.85)",
              background: isActive
                ? "linear-gradient(135deg, rgba(47,128,237,0.4), rgba(39,224,166,0.2))"
                : "rgba(255,255,255,0.06)",
              border: isActive ? "1px solid rgba(47,128,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              cursor: "pointer",
              transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            Week {weekNum}
          </button>
        );
      })}
    </div>
  );
}
```

## app/globals.css

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
  /* Mobile-first spacing scale */
  --space-inner: 12px;
  --space-block: 24px;
  --space-page: 16px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

html,
body {
  height: 100%;
  margin: 0;
  overflow-x: hidden;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

## app/intake/page.tsx

```tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { TRAINING_TARGET_GROUPS } from "@/lib/trainingTargets";

type Option = {
  label: string;
  score?: number;
  programmeType?: string;
};

type Question = {
  id: string;
  text: string;
  type: "select" | "text";
  options?: Option[];
  groupLabel?: string;
};

/* Flat list of all training targets for the first question */
const TRAINING_OPTIONS: Option[] = TRAINING_TARGET_GROUPS.flatMap((g) =>
  g.options.map((o) => ({ label: o.label, programmeType: o.programmeType, score: 70 }))
);

const QUESTIONS: Question[] = [
  {
    id: "goal",
    text: "What are you training for? (sport, course, or goal)",
    type: "select",
    options: TRAINING_OPTIONS,
  },
  {
    id: "days_per_week",
    text: "How many days per week can you train?",
    type: "select",
    options: [
      { label: "2 days", score: 2 },
      { label: "3 days", score: 3 },
      { label: "4 days", score: 4 },
      { label: "5 days", score: 5 },
      { label: "6 days", score: 6 },
    ],
  },
  {
    id: "minutes_per_session",
    text: "Typical session length?",
    type: "select",
    options: [
      { label: "45 min", score: 45 },
      { label: "60 min", score: 60 },
      { label: "75 min", score: 75 },
      { label: "90 min", score: 90 },
      { label: "90+ min", score: 105 },
    ],
  },
  {
    id: "equipment",
    text: "Primary training environment?",
    type: "select",
    options: [
      { label: "Full gym (barbells, racks, cardio)", score: 90 },
      { label: "Limited gym (dumbbells, some kit)", score: 65 },
      { label: "Home (minimal equipment)", score: 45 },
      { label: "Outdoor / bodyweight focus", score: 50 },
    ],
  },
  {
    id: "experience",
    text: "Training experience level?",
    type: "select",
    options: [
      { label: "Beginner", score: 1 },
      { label: "Intermediate", score: 2 },
      { label: "Advanced", score: 3 },
    ],
  },
  {
    id: "sleep",
    text: "Average sleep per night?",
    type: "select",
    options: [
      { label: "5 hours or less", score: 40 },
      { label: "6 hours", score: 60 },
      { label: "7 hours", score: 75 },
      { label: "8+ hours", score: 90 },
    ],
  },
  {
    id: "stress",
    text: "Daily stress level?",
    type: "select",
    options: [
      { label: "High (8–10)", score: 40 },
      { label: "Moderate (4–7)", score: 65 },
      { label: "Low (1–3)", score: 85 },
    ],
  },
  {
    id: "aerobic",
    text: "Current aerobic fitness?",
    type: "select",
    options: [
      { label: "Low", score: 45 },
      { label: "Moderate", score: 65 },
      { label: "High", score: 85 },
    ],
  },
  {
    id: "strength",
    text: "Current strength level?",
    type: "select",
    options: [
      { label: "Low", score: 45 },
      { label: "Moderate", score: 70 },
      { label: "High", score: 85 },
    ],
  },
  {
    id: "mobility",
    text: "Mobility quality?",
    type: "select",
    options: [
      { label: "Limited", score: 45 },
      { label: "Average", score: 65 },
      { label: "Good", score: 85 },
    ],
  },
  {
    id: "injury_notes",
    text: "Any injuries or limitations?",
    type: "text",
  },
];

export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [textInput, setTextInput] = useState("");

  const current = QUESTIONS[step];
  const progress = Math.round((step / QUESTIONS.length) * 100);

  async function handleSelect(option: Option) {
    const updated = { ...answers, [current.id]: option };
    setAnswers(updated);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      await buildProfile(updated);
    }
  }

  async function handleTextSubmit() {
    const updated = { ...answers, [current.id]: textInput };
    setAnswers(updated);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      setTextInput("");
    } else {
      await buildProfile(updated);
    }
  }

  async function buildProfile(data: Record<string, any>) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return;

    const aerobic_score = data.aerobic?.score ?? 50;
    const strength_score = data.strength?.score ?? 50;
    const mobility_score = data.mobility?.score ?? 50;
    const sleep_score = data.sleep?.score ?? 50;
    const stress_score = data.stress?.score ?? 50;

    const readiness_score = Math.round(
      aerobic_score * 0.25 +
        strength_score * 0.25 +
        mobility_score * 0.15 +
        sleep_score * 0.20 +
        stress_score * 0.15
    );

    const scores = {
      Aerobic: aerobic_score,
      Strength: strength_score,
      Mobility: mobility_score,
      Sleep: sleep_score,
    };

    const primary_limiter =
      Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];

    const goalLabel = data.goal?.label ?? "General fitness";
    const programmeType = data.goal?.programmeType ?? "hybrid";
    const daysPerWeek = data.days_per_week?.score ?? 3;
    const minutesPerSession = data.minutes_per_session?.score ?? 60;
    const equipmentLabel = data.equipment?.label ?? "Full gym";
    const experienceLabel =
      data.experience?.label ?? "Beginner";

    await supabase.from("profiles").upsert(
      {
        id: session.user.id,
        goal: goalLabel,
        sport: goalLabel,
        focus: programmeType,
        days_per_week: daysPerWeek,
        minutes_per_session: minutesPerSession,
        equipment: equipmentLabel,
        experience: experienceLabel,
        aerobic_score,
        strength_upper: strength_score,
        strength_lower: strength_score,
        mobility_score,
        sleep_score,
        readiness_score,
        primary_limiter,
        injury_notes: data.injury_notes || null,
        momentum: "Building",
      },
      { onConflict: "id" }
    );

    router.push("/profile");
  }

  return (
    <div style={outer}>
      <div style={gridOverlay} />

      <div style={card}>
        <div style={header}>
          <div style={branding}>Performance Pathfinder OS</div>
          <div style={progressBar}>
            <div style={{ ...progressFill, width: `${progress}%` }} />
          </div>
        </div>

        <div style={chatArea}>
          <div style={questionBubble}>{current.text}</div>

          {current.type === "select" && (
            <div style={current.id === "goal" ? optionsScroll : undefined}>
              {current.options?.map((opt, i) => (
                <button
                  key={i}
                  style={optionButton}
                  onClick={() => handleSelect(opt)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {current.type === "text" && (
            <>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type here..."
                style={textArea}
              />
              <button onClick={handleTextSubmit} style={continueButton}>
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const outer = {
  height: "100vh",
  background: "radial-gradient(circle at center,#0E1A2B 0%,#050A14 70%)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  position: "relative" as const,
};

const gridOverlay = {
  position: "absolute" as const,
  inset: 0,
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
};

const card = {
  width: 650,
  padding: 40,
  borderRadius: 24,
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(25px)",
  boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
  zIndex: 2,
  display: "flex",
  flexDirection: "column" as const,
};

const header = {
  marginBottom: 30,
};

const branding = {
  fontSize: 14,
  opacity: 0.6,
  marginBottom: 10,
  letterSpacing: 1,
};

const progressBar = {
  height: 4,
  background: "rgba(255,255,255,0.1)",
  borderRadius: 4,
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  background: "linear-gradient(90deg,#2F80ED,#6C5CE7)",
};

const chatArea = {
  display: "flex",
  flexDirection: "column" as const,
};

const questionBubble = {
  background: "rgba(255,255,255,0.08)",
  padding: 14,
  borderRadius: 16,
  marginBottom: 20,
};

const optionsScroll = {
  maxHeight: 320,
  overflowY: "auto" as const,
  marginBottom: 8,
};

const optionButton = {
  marginBottom: 12,
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(90deg,#2F80ED,#6C5CE7)",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

const continueButton = optionButton;

const textArea = {
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: "rgba(255,255,255,0.1)",
  color: "white",
  marginBottom: 15,
};
```

## app/layout.tsx

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Performance Pathfinder",
  description: "Adaptive strength and conditioning programmes built from your physiology.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
```

## app/login/page.tsx

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AIContainer from "@/app/components/AIContainer";

const inputStyle: React.CSSProperties = {
  padding: "16px 20px",
  minHeight: 48,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 16,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "16px 20px",
  minHeight: 52,
  borderRadius: 16,
  border: "none",
  background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 16,
  width: "100%",
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      router.push("/profile");
    }
  }

  return (
    <AIContainer>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: "clamp(24px, 5vw, 30px)", fontWeight: 600, marginBottom: 12 }}>
          Welcome back
        </h1>
        <p style={{ opacity: 0.65, fontSize: 14 }}>
          Access your performance dashboard and continue building.
        </p>
      </div>

      <form
        onSubmit={handleLogin}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="off"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          autoComplete="current-password"
        />

        <button type="submit" style={buttonStyle}>
          Enter System →
        </button>
      </form>

      <div className="saveHint" role="complementary" aria-label="Tip for saving the app">
        <span className="saveHintIcon" aria-hidden>⊕</span>
        <div className="saveHintContent">
          <strong>Save for later</strong>
          <p>
            Add this page to your home screen for quick access: open your browser menu (⋮ or Share) and choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.
          </p>
        </div>
      </div>

      <style jsx>{`
        .saveHint {
          display: none;
          margin-top: 28px;
          padding: 16px 20px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          gap: 12px;
          align-items: flex-start;
        }
        @media (max-width: 768px) {
          .saveHint {
            display: flex;
          }
        }
        .saveHintIcon {
          font-size: 20px;
          opacity: 0.8;
          flex-shrink: 0;
        }
        .saveHintContent {
          flex: 1;
        }
        .saveHintContent strong {
          display: block;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .saveHintContent p {
          margin: 0;
          font-size: 13px;
          opacity: 0.85;
          line-height: 1.45;
        }
      `}</style>
    </AIContainer>
  );
}
```

## app/nutrition/page.tsx

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect, useCallback } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import NutritionMacroChart from "@/app/components/NutritionMacroChart";
import type { MacroDay } from "@/app/components/NutritionMacroChart";
import MacroSummaryCards from "@/app/components/MacroSummaryCards";
import type { MacroSummary } from "@/app/components/MacroSummaryCards";
import FuelStrategyTool from "@/app/components/FuelStrategyTool";
import LogMacrosModal from "@/app/components/LogMacrosModal";
import BodyCompositionModal from "@/app/components/BodyCompositionModal";
import { getMacroLogs } from "@/lib/nutritionStore";
import { getBodyComposition } from "@/lib/nutritionStore";
import { PerformanceEngine } from "@/lib/performanceEngine";
import { subscribe as subscribePerformance } from "@/lib/performanceEvents";

function NavTab({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={active ? "active" : undefined}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

function mockMacroSummaries(): MacroSummary[] {
  const last7 = { protein: 82, carbs: 280, fats: 58, calories: 1920 };
  const prev7 = { protein: 78, carbs: 260, fats: 62, calories: 1880 };
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
  return [
    { label: "Protein", sevenDayAvg: last7.protein, percentChangeVsPrevious7: pct(last7.protein, prev7.protein), unit: "g" },
    { label: "Carbs", sevenDayAvg: last7.carbs, percentChangeVsPrevious7: pct(last7.carbs, prev7.carbs), unit: "g" },
    { label: "Fats", sevenDayAvg: last7.fats, percentChangeVsPrevious7: pct(last7.fats, prev7.fats), unit: "g" },
    { label: "Calories", sevenDayAvg: last7.calories, percentChangeVsPrevious7: pct(last7.calories, prev7.calories), unit: "kcal" },
  ];
}

function buildChartDataFromLogs(logs: { date: string; protein: number; carbs: number; fats: number; calories: number }[]): MacroDay[] {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const out: MacroDay[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const log = byDate.get(dateStr);
    out.push(
      log
        ? { date: dateStr, protein: log.protein, carbs: log.carbs, fats: log.fats, calories: log.calories }
        : { date: dateStr, protein: 0, carbs: 0, fats: 0, calories: 0 }
    );
  }
  return out;
}

export default function NutritionPage() {
  const pathname = usePathname();
  const [showMacroModal, setShowMacroModal] = useState(false);
  const [showBodyCompModal, setShowBodyCompModal] = useState(false);
  const [macroLogs, setMacroLogs] = useState<ReturnType<typeof getMacroLogs>>([]);
  const [bodyComposition, setBodyComposition] = useState<ReturnType<typeof getBodyComposition>>(null);

  const refreshMacroLogs = useCallback(() => {
    setMacroLogs(getMacroLogs());
    PerformanceEngine.updateNutrition({ macroLogs: getMacroLogs() });
  }, []);
  const refreshBodyComposition = useCallback(() => {
    setBodyComposition(getBodyComposition());
    PerformanceEngine.updateNutrition({ bodyComposition: getBodyComposition() });
  }, []);

  const [strategicInsights, setStrategicInsights] = useState<string[]>([]);

  useEffect(() => {
    refreshMacroLogs();
    refreshBodyComposition();
  }, [refreshMacroLogs, refreshBodyComposition]);

  useEffect(() => {
    setStrategicInsights(PerformanceEngine.getStrategicInsights());
    const unsub = subscribePerformance("stateRecalculated", () => {
      setStrategicInsights(PerformanceEngine.getStrategicInsights());
    });
    return () => unsub();
  }, []);

  const chartData = useMemo(() => buildChartDataFromLogs(macroLogs), [macroLogs]);

  const macroSummariesResolved = useMemo(() => {
    const sorted = [...macroLogs].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 14) return mockMacroSummaries();
    const last7 = sorted.slice(-7);
    const prev7 = sorted.slice(-14, -7);
    const avg = (arr: typeof last7, key: keyof typeof last7[0]) =>
      arr.reduce((s, d) => s + d[key], 0) / arr.length;
    const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
    return [
      { label: "Protein", sevenDayAvg: Math.round(avg(last7, "protein")), percentChangeVsPrevious7: pct(avg(last7, "protein"), avg(prev7, "protein")), unit: "g" },
      { label: "Carbs", sevenDayAvg: Math.round(avg(last7, "carbs")), percentChangeVsPrevious7: pct(avg(last7, "carbs"), avg(prev7, "carbs")), unit: "g" },
      { label: "Fats", sevenDayAvg: Math.round(avg(last7, "fats")), percentChangeVsPrevious7: pct(avg(last7, "fats"), avg(prev7, "fats")), unit: "g" },
      { label: "Calories", sevenDayAvg: Math.round(avg(last7, "calories")), percentChangeVsPrevious7: pct(avg(last7, "calories"), avg(prev7, "calories")), unit: "kcal" },
    ];
  }, [macroLogs]);

  return (
    <RequireAuth>
      <OSLayer>
        <div className="nutritionOuter">
          <nav className="nutritionNav">
            <div className="nutritionBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="nutritionTabs">
              <NavTab href="/profile" label="Dashboard" pathname={pathname} />
              <NavTab href="/programme" label="Programme" pathname={pathname} />
              <NavTab href="/tactical" label="Tactical" pathname={pathname} />
              <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
              <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
              <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
              <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
              <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
              <NavTab href="/strategy" label="Strategy" pathname={pathname} />
              <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
              <NavTab href="/settings" label="Settings" pathname={pathname} />
            </div>
          </nav>

          <div className="nutritionContainer">
            <div className="nutritionHeader">
              <div className="nutritionPhase">NUTRITION</div>
              <h1 className="nutritionHeadline">Fuel strategy</h1>
              <p className="nutritionSub">
                Adaptive fuelling from training demand, readiness, and recovery. No meal logging — targets and reasoning only.
              </p>
            </div>
            {strategicInsights.length > 0 && (
              <div className="nutritionInsightsBanner" style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(47, 128, 237, 0.08)", border: "1px solid rgba(47, 128, 237, 0.2)", borderRadius: 12, fontSize: 12 }}>
                <strong style={{ letterSpacing: "0.04em" }}>Performance insights</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {strategicInsights.map((s, i) => (
                    <li key={i} style={{ marginTop: 2 }}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="nutritionPlaceholder">
              <p className="nutritionPlaceholderText">Weekly overview and daily strategies will appear here.</p>
              <div className="nutritionPlaceholderButtons">
                <button type="button" className="nutritionLogMacrosBtn nutritionBodyCompBtn" onClick={() => setShowBodyCompModal(true)} aria-label="Update body composition">
                  <span className="nutritionLogMacrosOrb" aria-hidden />
                  <span className="nutritionLogMacrosText">
                    <span className="nutritionLogMacrosLabel">Update body composition</span>
                    <span className="nutritionLogMacrosSub">Weight, body fat, muscle mass</span>
                  </span>
                </button>
                <button type="button" className="nutritionLogMacrosBtn" onClick={() => setShowMacroModal(true)} aria-label="Log macros">
                  <span className="nutritionLogMacrosOrb" aria-hidden />
                  <span className="nutritionLogMacrosText">
                    <span className="nutritionLogMacrosLabel">Log macros</span>
                    <span className="nutritionLogMacrosSub">Add today&apos;s intake</span>
                  </span>
                </button>
              </div>
            </div>
            <LogMacrosModal isOpen={showMacroModal} onClose={() => setShowMacroModal(false)} onSaved={refreshMacroLogs} />
            <BodyCompositionModal isOpen={showBodyCompModal} onClose={() => setShowBodyCompModal(false)} onSaved={refreshBodyComposition} />
            <div className="nutritionContent">
              <NutritionMacroChart data={chartData} />
              <MacroSummaryCards summaries={macroSummariesResolved} />
              <FuelStrategyTool bodyComposition={bodyComposition} />
            </div>
          </div>

          <style jsx>{`
            .nutritionOuter {
              min-height: 100vh;
              background:
                radial-gradient(circle at 20% 10%, rgba(47,128,237,0.12), transparent 40%),
                radial-gradient(circle at 80% 90%, rgba(39,224,166,0.08), transparent 40%),
                linear-gradient(180deg, #0a0a0f 0%, #0f1117 50%, #0a0a0f 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .nutritionOuter::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
              background-size: 40px 40px;
              opacity: 0.4;
              pointer-events: none;
            }
            .nutritionNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .nutritionBrand {
              font-size: 12px;
              letter-spacing: 2px;
              opacity: 0.6;
            }
            .nutritionTabs {
              display: flex;
              gap: 30px;
            }
            .nutritionContainer {
              max-width: 1200px;
              margin: 0 auto;
              padding: 40px;
            }
            .nutritionHeader {
              margin-bottom: 32px;
            }
            .nutritionPhase {
              font-size: 11px;
              letter-spacing: 0.12em;
              opacity: 0.6;
              margin-bottom: 8px;
            }
            .nutritionHeadline {
              font-size: 28px;
              font-weight: 600;
              margin: 0 0 12px;
            }
            .nutritionSub {
              font-size: 15px;
              opacity: 0.8;
              margin: 0;
              line-height: 1.5;
            }
            .nutritionPlaceholder {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 24px;
              padding: 24px 28px;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 16px;
              font-size: 14px;
              opacity: 0.8;
              flex-wrap: wrap;
            }
            .nutritionPlaceholderText {
              margin: 0;
              flex: 1;
              min-width: 0;
            }
            .nutritionPlaceholderButtons {
              display: flex;
              align-items: center;
              gap: 12px;
              flex-shrink: 0;
              flex-wrap: wrap;
            }
            .nutritionLogMacrosBtn {
              display: inline-flex;
              align-items: center;
              gap: 14px;
              padding: 12px 22px 12px 14px;
              border-radius: 9999px;
              border: 1px solid rgba(255,255,255,0.25);
              background: rgba(255,255,255,0.12);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              color: #fff;
              cursor: pointer;
              font: inherit;
              box-shadow: 0 2px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06) inset;
              transition: background 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
              text-align: left;
              flex-shrink: 0;
            }
            .nutritionLogMacrosBtn:hover {
              background: rgba(255,255,255,0.18);
              box-shadow: 0 0 20px rgba(47,128,237,0.35), 0 0 36px rgba(39,224,166,0.2), 0 4px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1) inset;
              transform: scale(1.01);
            }
            .nutritionLogMacrosOrb {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: radial-gradient(circle at 30% 30%, #27E0A6, #2F80ED 60%, rgba(17,24,39,0.9));
              box-shadow: 0 0 16px rgba(47,128,237,0.6), 0 0 28px rgba(39,224,166,0.4), 0 2px 8px rgba(0,0,0,0.2) inset;
              flex-shrink: 0;
            }
            .nutritionLogMacrosText {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 2px;
            }
            .nutritionLogMacrosLabel {
              font-weight: 600;
              font-size: 15px;
              letter-spacing: -0.02em;
            }
            .nutritionLogMacrosSub {
              font-size: 12px;
              opacity: 0.85;
            }
            .nutritionContent {
              display: flex;
              flex-direction: column;
              gap: 20px;
              margin-top: 20px;
            }
            @media (max-width: 768px) {
              .nutritionNav { padding: 16px; flex-wrap: wrap; gap: 12px; }
              .nutritionTabs { gap: 16px; flex-wrap: wrap; }
              .nutritionContainer { padding: 16px; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
```

## app/page.tsx

```tsx
"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="outer">

      {/* ===== OS NAVIGATION ===== */}

      <div className="topNav">
        <div className="logo">
          Performance Pathfinder
        </div>

        <div className="tabs">
          <button onClick={() => router.push("/login")}>
            Login
          </button>

          <button onClick={() => router.push("/signup")}>
            Sign Up
          </button>
        </div>
      </div>

      {/* ===== HERO OS PANEL ===== */}

      <div className="container">

        <div className="heroCard">

          <div className="phase">
            HUMAN PERFORMANCE INTELLIGENCE OS
          </div>

          <h1 className="headline">
            Adaptive Programming.
            <br />
            Built From Your Physiology.
          </h1>

          <p className="subtext">
            Performance Pathfinder OS generates fully adaptive,
            phase-driven strength and conditioning programmes
            using real performance inputs — not templates.
          </p>

          <div className="ctaRow">
            <button
              className="primaryBtn"
              onClick={() => router.push("/signup")}
            >
              Build Your Programme
            </button>

            <button
              className="secondaryBtn"
              onClick={() => router.push("/login")}
            >
              Enter OS
            </button>
          </div>

        </div>

        {/* ===== INTELLIGENCE PREVIEW ===== */}

        <div className="intelGrid">

          <div className="intelCard">
            <div className="intelTitle">
              Adaptive Periodisation
            </div>
            <div className="intelText">
              Phase progression automatically shifts based on readiness,
              fatigue accumulation, and recovery balance.
            </div>
          </div>

          <div className="intelCard">
            <div className="intelTitle">
              Domain Intelligence
            </div>
            <div className="intelText">
              Strength, aerobic capacity, mobility, and recovery are
              continuously modelled and recalibrated.
            </div>
          </div>

          <div className="intelCard">
            <div className="intelTitle">
              Tactical-Grade Programming
            </div>
            <div className="intelText">
              Detailed session architecture including main lifts,
              accessory blocks, trunk capacity, and energy systems.
            </div>
          </div>

        </div>

      </div>

      {/* ===== STYLES ===== */}

      <style jsx>{`
        .outer {
          background:
            radial-gradient(circle at 20% 10%, rgba(47,128,237,0.15), transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(39,224,166,0.12), transparent 40%),
            #0A1220;
          min-height:100vh;
          color:white;
        }

        .topNav {
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:16px 20px;
          border-bottom:1px solid rgba(255,255,255,0.08);
        }
        @media (min-width: 769px) {
          .topNav { padding:20px 40px; }
        }

        .logo {
          font-weight:600;
          letter-spacing:1px;
          opacity:0.85;
          font-size:clamp(14px, 4vw, 16px);
        }

        .tabs button {
          margin-left:12px;
          padding:10px 16px;
          min-height:44px;
          background:none;
          border:none;
          color:white;
          cursor:pointer;
          opacity:0.6;
          font-size:14px;
          -webkit-tap-highlight-color:transparent;
        }
        @media (min-width: 769px) {
          .tabs button { margin-left:18px; padding:0; min-height:auto; }
        }
        .tabs button:hover {
          opacity:1;
        }

        .container {
          max-width:1400px;
          margin:40px auto;
          padding:0 20px;
        }
        @media (min-width: 769px) {
          .container { margin:100px auto; padding:0 40px; }
        }

        .heroCard {
          background:rgba(255,255,255,0.05);
          border-radius:24px;
          padding:32px 24px;
          backdrop-filter:blur(8px);
          margin-bottom:40px;
        }
        @media (min-width: 769px) {
          .heroCard { padding:60px; margin-bottom:60px; }
        }

        .phase {
          font-size:12px;
          letter-spacing:2px;
          opacity:0.6;
          margin-bottom:16px;
        }

        .headline {
          font-size:clamp(28px, 6vw, 42px);
          line-height:1.2;
          margin-bottom:24px;
        }

        .subtext {
          font-size:16px;
          opacity:0.75;
          max-width:700px;
          margin-bottom:40px;
        }

        .ctaRow {
          display:flex;
          flex-wrap:wrap;
          gap:12px;
        }
        .primaryBtn, .secondaryBtn {
          min-height:48px;
          padding:14px 24px;
          border-radius:10px;
          font-size:16px;
          cursor:pointer;
          -webkit-tap-highlight-color:transparent;
        }
        .primaryBtn {
          background:#2F80ED;
          border:none;
          color:white;
          font-weight:600;
        }
        .secondaryBtn {
          background:rgba(255,255,255,0.08);
          border:none;
          color:white;
        }

        .intelGrid {
          display:grid;
          grid-template-columns:1fr;
          gap:20px;
        }
        @media (min-width: 769px) {
          .intelGrid {
            grid-template-columns:repeat(3,1fr);
            gap:30px;
          }
        }

        .intelCard {
          background:rgba(255,255,255,0.04);
          padding:28px;
          border-radius:20px;
        }

        .intelTitle {
          font-weight:600;
          margin-bottom:10px;
        }

        .intelText {
          font-size:14px;
          opacity:0.7;
        }
      `}</style>

    </div>
  );
}
```

## app/profile/page.tsx

```tsx
"use client";

import UPDEDashboard from "@/app/components/UPDEDashboard";
import OSLayer from "@/app/components/OSLayer";
import { RequireAuth } from "@/lib/requireAuth";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <OSLayer>
        <UPDEDashboard />
      </OSLayer>
    </RequireAuth>
  );
}
```

## app/programme/page.tsx

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/lib/requireAuth";
import type { ProgrammeType } from "@/lib/trainingTargets";
import { getExerciseVideos } from "@/lib/exerciseVideos";
import { getBenchmarks } from "@/engine/benchmarkEngine";
import { prescribe } from "@/engine/prescriptionEngine";
import { getRiskSignals } from "@/engine/riskIndex";
import { generateWeeklyBrief } from "@/engine/weeklyBriefGenerator";
import { EXERCISE_DISPLAY_NAMES } from "@/lib/profile/benchmarkSchema";
import ProgrammeCard from "@/app/ui/ProgrammeCard";
import WeeklyBrief from "@/app/ui/WeeklyBrief";
import DailyAdvisories from "@/app/ui/DailyAdvisories";
import { getAdvisories } from "@/engine/advisoriesEngine";
import type { InjuryEntry } from "@/engine/injuryMemoryEngine";
import { getAdaptiveGuardrails, applyIntensityCap } from "@/engine/adaptiveGuardrails";
import type { BehaviourDriftOutput } from "@/engine/behaviourDriftModel";
import { PerformanceEngine } from "@/lib/performanceEngine";
import { subscribe as subscribePerformance } from "@/lib/performanceEvents";
import type { ProgrammeData, ProgrammeInjuryAdjustment } from "@/lib/performanceEngine";
import OSLayer from "@/app/components/OSLayer";
import WeekSelector from "@/app/components/programme/WeekSelector";
import ProgrammeWeekView from "@/app/components/programme/ProgrammeWeekView";
import type { ProgrammeWeekData } from "@/app/components/programme/ProgrammeWeekView";
import type { ProgrammeDayData } from "@/app/components/programme/DayAccordion";
import type { SessionBlockData } from "@/app/components/programme/SessionBlock";
import programme from "@/data/programmes";
import type { ProgrammeDay as ProgrammeDayFromData, ProgrammeSessionBlock } from "@/data/programmes";

function NavTab({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={active ? "active" : undefined}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

/* ======================================================
   PROFILE TYPE (linked from intake)
====================================================== */

type Profile = {
  id: string;
  goal: string;
  sport: string;
  experience: string;
  focus?: string;
  days_per_week: number;
  minutes_per_session: number;
  equipment?: string;
  sleep_score: number;
  stress_level: number;
  aerobic_score: number;
  strength_upper: number;
  strength_lower: number;
  mobility_score: number;
  readiness_score: number;
  primary_limiter: string;
  momentum: string;
  current_week: number;
  fatigue_score: number;
  deload_active: boolean;
  /* Daily check-in (adapts programme) */
  checkin_date?: string;
  checkin_readiness?: number;
  checkin_feel?: string;
  checkin_pain?: string;
  checkin_pain_areas?: string;
  checkin_energy?: string;
  checkin_sleep?: string;
  performance_benchmarks?: import("@/lib/profile/benchmarkSchema").PerformanceBenchmarks | null;
};

type AdaptationLevel = "reduce" | "normal" | "increase";

/* ======================================================
   PHASE MODEL (GPP → SPP → Performance/Peaking)
   Recovery programmed, not reactive. Conditioning supports strength.
====================================================== */

const PHASES = [
  "Accumulation",
  "Accumulation",
  "Intensification",
  "Intensification",
  "Overreach",
  "Deload",
];

const MACROCYCLE_LABELS: Record<string, string> = {
  Accumulation: "GPP",
  Intensification: "SPP",
  Overreach: "SPP",
  Deload: "Recovery",
};

/* Performance markers (philosophy): RFD, tendon stiffness, aerobic threshold,
   load carriage resilience, movement symmetry, nervous system readiness */
const PERFORMANCE_MARKERS = [
  "Rate of Force Development",
  "Aerobic Threshold Efficiency",
  "Load Carriage Resilience",
  "Movement Symmetry",
  "Nervous System Readiness",
];

export default function ProgrammePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [videoModal, setVideoModal] = useState<{
    videoId: string;
    label: string;
    startSeconds?: number;
    endSeconds?: number;
  } | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    readiness: 7,
    feel: "good" as "good" | "okay" | "poor",
    pain: "none" as "none" | "yes",
    painAreas: "",
    energy: "medium" as "low" | "medium" | "high",
    sleep: "good" as "poor" | "okay" | "good",
  });
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [debriefSessionName, setDebriefSessionName] = useState<string | null>(null);
  const [debriefForm, setDebriefForm] = useState({ howFelt: 3, niggles: "", readyNext: 3 });
  const [debriefSubmitting, setDebriefSubmitting] = useState(false);
  const [injuries, setInjuries] = useState<InjuryEntry[]>([]);
  const [behaviourDrift, setBehaviourDrift] = useState<BehaviourDriftOutput | null>(null);
  const [programmeEngineData, setProgrammeEngineData] = useState<ProgrammeData | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<number>(0);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const lastDecisionLogDateRef = useRef<string | null>(null);
  const guardrailLoggedRef = useRef(false);
  const simplificationLoggedRef = useRef(false);
  const router = useRouter();
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(data);
    }

    load();
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    fetch("/api/injuries")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setInjuries(d.entries ?? []))
      .catch(() => setInjuries([]));
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    fetch("/api/behaviour-drift")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d ? setBehaviourDrift(d as BehaviourDriftOutput) : setBehaviourDrift(null)))
      .catch(() => setBehaviourDrift(null));
  }, [profile?.id]);

  useEffect(() => {
    setProgrammeEngineData(PerformanceEngine.getProgrammeData());
    const unsubRecalc = subscribePerformance("stateRecalculated", () => {
      setProgrammeEngineData(PerformanceEngine.getProgrammeData());
    });
    const unsubProg = subscribePerformance("programmeUpdated", () => {
      setProgrammeEngineData(PerformanceEngine.getProgrammeData());
    });
    return () => {
      unsubRecalc();
      unsubProg();
    };
  }, []);

  useEffect(() => {
    if (profile?.current_week == null) return;
    const w = profile.current_week;
    const phase0Weeks = programme.phases[0]?.duration ?? 6;
    if (w <= phase0Weeks) {
      setSelectedPhase(0);
      setSelectedWeek(w);
    } else {
      setSelectedPhase(1);
      setSelectedWeek(Math.min(w - phase0Weeks, programme.phases[1]?.duration ?? 4));
    }
  }, [profile?.current_week]);

  useEffect(() => {
    const progPhase = programme.phases[selectedPhase];
    if (!progPhase || selectedWeek <= progPhase.duration) return;
    setSelectedWeek(progPhase.duration);
  }, [selectedPhase, selectedWeek]);

  useEffect(() => {
    if (!profile) return;
    const gr = getAdaptiveGuardrails({
      ...profile,
      fatigue_score: profile.fatigue_score,
      readiness_score: profile.readiness_score,
      sleep_score: profile.sleep_score,
      stress_level: profile.stress_level,
      activeInjuries: injuries,
      plannedSessions: profile.days_per_week ?? 4,
    });
    if (gr.reasons.length > 0 && !guardrailLoggedRef.current) {
      guardrailLoggedRef.current = true;
      fetch("/api/decision-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionType: "guardrail_applied",
          adjustmentMade: gr.reasons.join(" "),
          explanation: gr.reasons.join(" "),
          triggerVariables: { reasons: gr.reasons },
        }),
      }).catch(() => {});
    }
    if (gr.reasons.length === 0) guardrailLoggedRef.current = false;
  }, [profile, injuries]);

  useEffect(() => {
    if (!videoModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVideoModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [videoModal]);

  useEffect(() => {
    if (!checkinOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCheckinOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [checkinOpen]);

  useEffect(() => {
    if (!profile || !checkinOpen || profile.checkin_date !== todayStr) return;
    setCheckinForm({
      readiness: profile.checkin_readiness ?? 7,
      feel: (profile.checkin_feel as "good" | "okay" | "poor") ?? "okay",
      pain: (profile.checkin_pain as "none" | "yes") ?? "none",
      painAreas: profile.checkin_pain_areas ?? "",
      energy: (profile.checkin_energy as "low" | "medium" | "high") ?? "medium",
      sleep: (profile.checkin_sleep as "poor" | "okay" | "good") ?? "good",
    });
  }, [checkinOpen, profile, todayStr]);

  useEffect(() => {
    if (!profile?.id || !behaviourDrift?.simplificationRecommended || simplificationLoggedRef.current) return;
    simplificationLoggedRef.current = true;
    fetch("/api/decision-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decisionType: "behaviour_drift_simplification",
        adjustmentMade: "Weekly volume reduced 10–15%; submax bias applied.",
        explanation: "Engagement trending down — simplifying architecture to protect adherence.",
        triggerVariables: {
          frictionIndex: behaviourDrift.frictionIndex,
          complianceVelocity: behaviourDrift.complianceVelocity,
          engagementLevel: behaviourDrift.engagementLevel,
        },
      }),
    }).catch(() => {});
  }, [profile?.id, behaviourDrift?.simplificationRecommended, behaviourDrift?.frictionIndex, behaviourDrift?.complianceVelocity, behaviourDrift?.engagementLevel]);

  useEffect(() => {
    if (!profile?.id || lastDecisionLogDateRef.current === todayStr) return;
    const risk = getRiskSignals(profile);
    let adapt: AdaptationLevel = "normal";
    if (risk.shouldReduceVolume || risk.shouldReduceIntensity) adapt = "reduce";
    else if (profile.checkin_date === todayStr) {
      const r = profile.checkin_readiness ?? 7;
      const f = profile.checkin_feel ?? "okay";
      const pain = profile.checkin_pain ?? "none";
      const energy = profile.checkin_energy ?? "medium";
      const sleep = profile.checkin_sleep ?? "okay";
      if (pain === "yes" || f === "poor" || energy === "low" || sleep === "poor" || r < 5) adapt = "reduce";
    }
    if (adapt !== "reduce") return;
    lastDecisionLogDateRef.current = todayStr;
    supabase.from("decision_logs").insert({
      profile_id: profile.id,
      decision_type: "volume_reduction",
      trigger_variables: {
        fatigue_risk: risk.fatigueRisk,
        readiness: profile.checkin_readiness ?? null,
        sleep: profile.checkin_sleep ?? null,
        checkin_date: profile.checkin_date ?? null,
      },
      threshold_breached: risk.shouldReduceIntensity ? "fatigue_risk_high" : "fatigue_risk_volume",
      adjustment_made: "Volume and intensity reduced today",
      explanation: "Programme adapted due to recovery bandwidth and fatigue risk. Volume and intensity reduced to protect adaptation.",
    });
  }, [profile, todayStr]);

  async function submitCheckin() {
    setCheckinSubmitting(true);
    const updates = {
      checkin_date: todayStr,
      checkin_readiness: checkinForm.readiness,
      checkin_feel: checkinForm.feel,
      checkin_pain: checkinForm.pain,
      checkin_pain_areas: checkinForm.painAreas,
      checkin_energy: checkinForm.energy,
      checkin_sleep: checkinForm.sleep,
    };
    const { data: updated } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", p.id)
      .select()
      .single();
    setCheckinSubmitting(false);
    if (updated) setProfile(updated);
    setCheckinOpen(false);
  }

  if (!profile) return null;
  const p = profile;

  /* ======================================================
     DERIVED METRICS
  ======================================================= */

  const week = p.current_week || 1;
  const phase = PHASES[week - 1] || "Accumulation";
  const macrocycle = MACROCYCLE_LABELS[phase] || "GPP";
  const programmeType: ProgrammeType = (p.focus as ProgrammeType) || "hybrid";
  const trainingGoal = p.goal || p.sport || "General fitness";
  const sessionMins = p.minutes_per_session || 60;
  const daysPerWeek = p.days_per_week || 3;

  const strengthIndex =
    ((p.strength_upper || 60) + (p.strength_lower || 60)) / 2;

  const aerobicIndex = p.aerobic_score || 60;

  const recoveryIndex =
    (p.sleep_score || 60) * 0.6 +
    (100 - (p.stress_level || 40)) * 0.4;

  function getAdaptation(): AdaptationLevel {
    const risk = getRiskSignals(p);
    if (risk.shouldReduceVolume || risk.shouldReduceIntensity) return "reduce";
    if (p.checkin_date !== todayStr) return "normal";
    const readiness = p.checkin_readiness ?? 7;
    const feel = p.checkin_feel ?? "okay";
    const pain = p.checkin_pain ?? "none";
    const energy = p.checkin_energy ?? "medium";
    const sleep = p.checkin_sleep ?? "okay";
    if (pain === "yes" || feel === "poor" || energy === "low" || sleep === "poor" || readiness < 5)
      return "reduce";
    if (feel === "good" && (energy === "high" || sleep === "good") && readiness >= 7 && pain === "none")
      return "increase";
    return "normal";
  }

  const programmeInjuryAdjustment = PerformanceEngine.getProgrammeInjuryAdjustment();
  const adaptation: AdaptationLevel =
    programmeInjuryAdjustment.reduceIntensity ? "reduce" : getAdaptation();

  const weeklyBriefData = generateWeeklyBrief({
    ...p,
    phase,
    macrocycle,
    current_week: week,
  });

  const readinessBias =
    p.readiness_score > 75 ? 1.05 :
    p.readiness_score > 65 ? 1 :
    0.9;

  const fatigueBias =
    p.fatigue_score > 60 ? 0.85 : 1;

  const isDeload =
    p.deload_active ||
    p.readiness_score < 55 ||
    p.fatigue_score > 75;

  const intensityScale =
    readinessBias * fatigueBias * (isDeload ? 0.85 : 1);

  const guardrails = getAdaptiveGuardrails({
    ...p,
    fatigue_score: p.fatigue_score,
    readiness_score: p.readiness_score,
    sleep_score: p.sleep_score,
    stress_level: p.stress_level,
    activeInjuries: injuries,
    plannedSessions: daysPerWeek,
  });

  const experience = p.experience?.toLowerCase() || "beginner";

  const setsMain =
    experience.includes("advanced") ? 5 :
    experience.includes("intermediate") ? 4 :
    3;

  const rpeTarget =
    experience.includes("advanced") ? "8–9" :
    experience.includes("intermediate") ? "7–8" :
    "6–7";

  function formatIntensityPct(base: number) {
    if (!p.strength_upper || !p.strength_lower)
      return `RPE ${rpeTarget}`;

    const scaled = base * intensityScale;
    return `${Math.round(scaled * 100)}%`;
  }

  /* ======================================================
     CONDITIONING — driven by programme type (from intake goal).
     Supports strength where applicable; emphasis matches training target.
  ======================================================= */

  function conditioningPrescription() {
    const aerobicBias =
      programmeType === "pure_endurance" ||
      programmeType === "aerobic_first" ||
      programmeType === "load_carriage_endurance";
    const strengthBias = programmeType === "strength" || programmeType === "power_speed";

    if (aerobicBias || aerobicIndex > strengthIndex) {
      const isLoadCarriage = programmeType === "load_carriage_endurance";
      return {
        description: isLoadCarriage ? "Load carriage + threshold" : "Threshold Intervals",
        prescription: isLoadCarriage
          ? "Loaded march 20–30 min · or 4×6 min @ 85–90% HRmax · 2 min recovery"
          : "4 × 6 min @ 85–90% HRmax · 2 min easy recovery",
        intent:
          "Aerobic threshold efficiency. " +
          (isLoadCarriage
            ? "Load carriage resilience for selection/operational demand. Conditioning integrated with strength."
            : "Conditioning integrated with strength — interference controlled."),
      };
    }

    if (strengthBias) {
      return {
        description: "Conditioning (minimal interference)",
        prescription:
          "15–20 min Zone 2 · or sled/assault bike 4×2 min · Rest 90s",
        intent:
          "Maintain aerobic base without compromising strength. Short, controlled.",
      };
    }

    return {
      description: "Zone 2 Aerobic Base",
      prescription:
        "30–40 min @ 65–75% HRmax · nasal breathing focus",
      intent:
        "Aerobic base & mitochondrial density. Human-first: sustainable output. Supports strength development.",
    };
  }

  /* ======================================================
     SESSION BUILDER — tactical alignment, movement quality,
     nervous system readiness, programmed recovery.
  ======================================================= */

  function buildSession(dayIndex: number, adapt: AdaptationLevel) {
    const recoveryDay = dayIndex === Math.floor(daysPerWeek / 2);

    let volScale = adapt === "reduce" ? 0.6 : adapt === "increase" ? 1.2 : 1;
    let intensityScaleAdapt = adapt === "reduce" ? 0.85 : adapt === "increase" ? 1.05 : 1;
    if (behaviourDrift?.simplificationRecommended) {
      volScale *= 0.85;
      intensityScaleAdapt *= 0.95;
    }
    const effectiveIntensity = intensityScale * intensityScaleAdapt;
    const setsAdapted = Math.max(2, Math.round(setsMain * volScale));
    const mainLiftAlt = adapt === "reduce" ? " (or Goblet Squat if pain)" : "";
    const accessoryNote =
      adapt === "reduce"
        ? " Reduced volume today. Option: substitute any exercise for a lighter variant."
        : adapt === "increase"
          ? " Optional: add 1 set or RPE +0.5 if feeling strong."
          : "";

    function prescribeAdapt(base: number) {
      if (!p.strength_upper || !p.strength_lower) return `RPE ${rpeTarget}`;
      const scaled = base * effectiveIntensity;
      return `${Math.round(scaled * 100)}%`;
    }

    if (recoveryDay) {
      const recoveryDetail =
        adapt === "reduce"
          ? "Zone 1 15–20 min · Mobility only · Breathing · HR < 110 bpm"
          : "Zone 1 20–30 min · Mobility circuits · Parasympathetic breathing · HR < 120 bpm";
      const recoveryLines =
        adapt === "reduce"
          ? ["Zone 1 15–20 min", "Mobility only", "Breathing", "HR < 110 bpm"]
          : ["Zone 1 20–30 min", "Mobility circuits", "Parasympathetic breathing", "HR < 120 bpm"];
      return {
        title: `Day ${dayIndex + 1} — Regeneration`,
        blocks: [
          {
            section: "Programmed Recovery (not reactive)",
            detail: recoveryDetail,
            detailLines: recoveryLines,
            notes:
              "Human-first: nervous system regulation and movement quality before output. Recovery is programmed — long-term adaptation over short-term peaks.",
            exerciseKeys: ["zone1", "mobility_circuits", "parasympathetic_breathing"],
          },
        ],
        card: {
          sessionTitle: "Regeneration",
          sessionSubtitle: "Programmed recovery",
          duration: "20–30 min",
          intensity: "Low",
          primaryFocus: "Nervous system regulation & mobility",
          exercises: [
            { letter: "A", title: "Zone 1 · Mobility · Breathing", prescription: recoveryDetail },
          ],
        },
      };
    }

    const conditioning = conditioningPrescription();
    const isLoadCarriage = programmeType === "load_carriage_endurance";
    const isStrength = programmeType === "strength";
    const isPower = programmeType === "power_speed";

    const mainLift =
      (isStrength ? "Back Squat" : isPower ? "Power Clean or Back Squat" : "Back Squat") + mainLiftAlt;
    const secondaryLift =
      isLoadCarriage ? "Weighted Pull-Up / Loaded carry prep" : "Weighted Pull-Up";

    const mainLiftKeys = isPower ? ["power_clean", "back_squat"] : ["back_squat"];
    const secondaryLiftKeys = isLoadCarriage
      ? ["weighted_pull_up", "loaded_carry"]
      : ["weighted_pull_up"];

    const blocks: { section: string; detail: string; notes: string; exerciseKeys?: string[]; detailLines?: string[] }[] = [
      {
        section: "Prep — Nervous System Readiness",
        detail:
          isPower
            ? "Jump rope 5 min · Dynamic mobility · 3×5 pogos · 3×3 broad jump"
            : "6 min progressive bike → Dynamic mobility → 3×5 pogos",
        detailLines: isPower
          ? ["Jump rope 5 min", "Dynamic mobility", "3×5 pogos", "3×3 broad jump"]
          : ["6 min progressive bike →", "Dynamic mobility → 3×5 pogos"],
        notes:
          "Clarity over complexity: prime CNS without fatigue. Movement quality and symmetry first.",
        exerciseKeys: isPower
          ? ["jump_rope", "dynamic_mobility", "pogos", "broad_jump"]
          : ["bike", "dynamic_mobility", "pogos"],
      },
      {
        section: isPower ? "Main Lift (RFD / Power)" : "Main Lift (RFD & Force Production)",
        detail:
          `${mainLift} · ${setsAdapted}×3–5 · ${prescribeAdapt(0.8)} · Tempo 31X1 · Rest 2–3 min`,
        detailLines: [
          `${mainLift} · ${setsAdapted}×3–5 · ${prescribeAdapt(0.8)} · Tempo 31X1 · Rest 2–3 min`,
        ],
        notes:
          (isStrength
            ? "Max strength focus. Terminate if bar speed drops >20%."
            : isLoadCarriage
              ? "Lower-body strength base for load carriage. Rate of force development."
              : "RFD & max force. Tactical alignment: lower-body strength base.") + accessoryNote,
        exerciseKeys: mainLiftKeys,
      },
      {
        section: "Secondary Lift",
        detail:
          `${secondaryLift} · ${setsAdapted}×5–6 · ${prescribeAdapt(0.75)} · Rest 2 min`,
        detailLines: [
          `${secondaryLift} · ${setsAdapted}×5–6 · ${prescribeAdapt(0.75)} · Rest 2 min`,
        ],
        notes:
          "Vertical pull, full ROM. Movement symmetry and durability. Strength integrated, not isolated." +
          accessoryNote,
        exerciseKeys: secondaryLiftKeys,
      },
      {
        section: "Accessory Block (Durability & Symmetry)",
        detail:
          adapt === "reduce"
            ? "Split Squat 2×6 ea · DB Press 2×8 · RDL 2×6 · Rest 90s"
            : adapt === "increase"
              ? "Split Squat 3×8 ea · DB Press 3×10 · RDL 3×8 · Optional +1 set each · Rest 60–90s"
              : "Split Squat 3×8 ea · DB Press 3×10 · RDL 3×8 · Rest 60–90s",
        detailLines:
          adapt === "reduce"
            ? ["Split Squat 2×6 ea", "DB Press 2×8", "RDL 2×6 · Rest 90s"]
            : adapt === "increase"
              ? ["Split Squat 3×8 ea", "DB Press 3×10", "RDL 3×8 · Optional +1 set each · Rest 60–90s"]
              : ["Split Squat 3×8 ea", "DB Press 3×10", "RDL 3×8 · Rest 60–90s"],
        notes:
          "Unilateral stability, tendon resilience, movement quality. Human-first: long-term resilience." +
          accessoryNote,
        exerciseKeys: ["split_squat", "db_press", "rdl"],
      },
    ];

    if (isLoadCarriage) {
      blocks.push({
        section: "Load Carriage Resilience",
        detail:
          adapt === "reduce"
            ? "Loaded march 1×600 m (lighter) · Med Ball 2×5 ea · Side Plank 2×20s"
            : adapt === "increase"
              ? "Loaded march 2×800 m · Med Ball 3×5 ea · Side Plank 3×30s · Optional +1 round"
              : "Loaded march 2×800 m (e.g. 15–25 kg) · Med Ball Rotational Throws 3×5 ea · Side Plank 3×30s",
        detailLines:
          adapt === "reduce"
            ? ["Loaded march 1×600 m (lighter)", "Med Ball 2×5 ea", "Side Plank 2×20s"]
            : adapt === "increase"
              ? ["Loaded march 2×800 m", "Med Ball 3×5 ea", "Side Plank 3×30s · Optional +1 round"]
              : ["Loaded march 2×800 m (e.g. 15–25 kg)", "Med Ball Rotational Throws 3×5 ea", "Side Plank 3×30s"],
        notes:
          "Operational demand: load carriage resilience. Rotational power and frontal plane stability.",
        exerciseKeys: ["loaded_march", "med_ball_rotational_throw", "side_plank"],
      });
    } else {
      const trunkLines =
        adapt === "reduce"
          ? ["Med Ball 2×5 ea", "Side Plank 2×20s"]
          : ["Med Ball Rotational Throws 3×5 ea", "Side Plank 3×30s"].concat(
              programmeType === "hybrid" || programmeType === "team_sport"
                ? [adapt === "increase" ? "Load carry 2×60 m" : "Load carry 2×60 m optional"]
                : []
            );
      blocks.push({
        section: "Trunk & Load Carriage Resilience",
        detail:
          adapt === "reduce"
            ? "Med Ball 2×5 ea · Side Plank 2×20s"
            : adapt === "increase"
              ? "Med Ball Rotational Throws 3×5 ea · Side Plank 3×30s" +
                (programmeType === "hybrid" || programmeType === "team_sport" ? " · Load carry 2×60 m" : "")
              : "Med Ball Rotational Throws 3×5 ea · Side Plank 3×30s" +
                (programmeType === "hybrid" || programmeType === "team_sport" ? " · Load carry 2×60 m optional" : ""),
        detailLines: trunkLines,
        notes:
          "Rotational power, frontal plane stability. Load carriage where relevant to goal.",
        exerciseKeys:
          programmeType === "hybrid" || programmeType === "team_sport"
            ? ["med_ball_rotational_throw", "side_plank", "loaded_carry"]
            : ["med_ball_rotational_throw", "side_plank"],
      });
    }

    const condDetail =
      adapt === "reduce"
        ? "15–20 min easy · Zone 2 or skip if needed"
        : adapt === "increase"
          ? `${conditioning.description} · ${conditioning.prescription} · Optional +5 min`
          : `${conditioning.description} · ${conditioning.prescription}`;
    blocks.push({
      section: "Energy System",
      detail: condDetail,
      detailLines: [condDetail],
      notes: conditioning.intent,
      exerciseKeys: ["threshold_intervals", "zone2"],
    });

    const benchmarks = getBenchmarks(p);
    const cardExercises: { letter: string; title: string; prescription: string; rest?: string }[] = [];
    const rpeT = rpeTarget;

    const pctA = applyIntensityCap(0.8, guardrails);
    const pctB = applyIntensityCap(0.75, guardrails);
    cardExercises.push({
      letter: "A",
      title: EXERCISE_DISPLAY_NAMES[mainLiftKeys[0]] ?? mainLift.split(" (or")[0].trim(),
      prescription: prescribe(benchmarks, mainLiftKeys[0], {
        sets: setsAdapted,
        reps: "3–5",
        percentage: pctA,
        rpeFallback: rpeT,
      }).display,
      rest: "2–3 min",
    });
    cardExercises.push({
      letter: "B",
      title: EXERCISE_DISPLAY_NAMES[secondaryLiftKeys[0]] ?? secondaryLift.split(" /")[0].trim(),
      prescription: prescribe(benchmarks, secondaryLiftKeys[0], {
        sets: setsAdapted,
        reps: "5–6",
        percentage: pctB,
        rpeFallback: rpeT,
      }).display,
      rest: "2 min",
    });
    cardExercises.push({
      letter: "C",
      title: "Accessory · Split Squat · DB Press · RDL",
      prescription:
        adapt === "reduce"
          ? "2×6 ea · 2×8 · 2×6 @ RPE 7"
          : adapt === "increase"
            ? "3×8 ea · 3×10 · 3×8 @ RPE 7–8 · Optional +1 set"
            : "3×8 ea · 3×10 · 3×8 @ RPE 7",
      rest: "60–90 sec",
    });
    cardExercises.push({
      letter: "D",
      title: conditioning.description,
      prescription: condDetail,
    });

    const card = {
      sessionTitle: isPower ? "Lower Body · RFD / Power" : "Lower Body Strength · Neural Bias",
      sessionSubtitle: isLoadCarriage ? "Load carriage emphasis" : undefined,
      duration: `${sessionMins - 10}–${sessionMins} min`,
      intensity: isStrength ? "High" : "Moderate–High",
      primaryFocus: isStrength ? "Maximal force output" : isPower ? "Rate of force development" : "Force output & work capacity",
      exercises: cardExercises,
    };

    return {
      title: `Day ${dayIndex + 1} — ${phase}`,
      blocks,
      card,
    };
  }

  const sessions = Array.from(
    { length: daysPerWeek },
    (_, i) => buildSession(i, adaptation)
  );

  /* Programme data from /data/programmes.ts: phase → week → days (unique per week/day) */
  const programmePhase = programme.phases[selectedPhase];
  const phaseWeekIndex = Math.min(Math.max(0, selectedWeek - 1), (programmePhase?.weeks?.length ?? 1) - 1);
  const weekData = programmePhase?.weeks?.[phaseWeekIndex];
  const programmeDays = weekData?.days ?? [];

  function mapProgrammeBlockToSessionBlock(b: ProgrammeSessionBlock): SessionBlockData {
    if (b.type === "performanceNotes") {
      return { type: "performanceNotes", text: b.text };
    }
    return {
      type: b.type,
      exercises: b.exercises ?? [],
    };
  }

  function mapProgrammeDayToWeekDay(d: ProgrammeDayFromData): ProgrammeDayData {
    return {
      day: d.day,
      type: d.type,
      title: d.title,
      duration: d.duration,
      performanceNotes: undefined,
      blocks: d.blocks.map(mapProgrammeBlockToSessionBlock),
    };
  }

  const programmeWeekData: ProgrammeWeekData = {
    week: selectedWeek,
    days: programmeDays.map(mapProgrammeDayToWeekDay),
  };

  const programmeAdvisories = getAdvisories({
    readiness: p.checkin_readiness ?? 7,
    feel: (p.checkin_feel as "good" | "okay" | "poor") ?? "okay",
    pain: (p.checkin_pain as "none" | "yes") ?? "none",
    painAreas: p.checkin_pain_areas ?? null,
    energy: (p.checkin_energy as "low" | "medium" | "high") ?? "medium",
    sleep: (p.checkin_sleep as "poor" | "okay" | "good") ?? "okay",
    adaptation,
    sessionFocus: "Lower body",
  });

  async function completeSession(name: string, sessionTitle?: string) {
    await supabase.from("session_logs").insert({
      profile_id: p.id,
      week,
      session_name: name,
      perceived_exertion: p.readiness_score,
      completed: true,
    });

    const focus =
      sessionTitle?.split(" · ")[0]?.trim() ||
      (name.toLowerCase().includes("lower") ? "Lower body" : name.toLowerCase().includes("upper") ? "Upper body" : null);

    await supabase
      .from("profiles")
      .update({
        fatigue_score: p.fatigue_score + 5,
        ...(focus ? { last_session_focus: focus } : {}),
      })
      .eq("id", p.id);

    setDebriefSessionName(name);
    setDebriefForm({ howFelt: 3, niggles: "", readyNext: 3 });
    setDebriefOpen(true);
  }

  async function submitDebrief() {
    if (!debriefSessionName) return;
    setDebriefSubmitting(true);
    await supabase.from("session_debriefs").insert({
      profile_id: p.id,
      session_name: debriefSessionName,
      week,
      how_felt: debriefForm.howFelt,
      niggles: debriefForm.niggles.trim() || null,
      ready_next: debriefForm.readyNext,
    });
    setDebriefSubmitting(false);
    setDebriefOpen(false);
    setDebriefSessionName(null);
    window.location.reload();
  }

  const pathname = usePathname();

  return (
    <RequireAuth>
      <OSLayer>
        <div className="outer">
          <nav className="programmeNav">
            <div className="programmeBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="programmeTabs">
              <NavTab href="/profile" label="Dashboard" pathname={pathname} />
              <NavTab href="/programme" label="Programme" pathname={pathname} />
              <NavTab href="/tactical" label="Tactical" pathname={pathname} />
              <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
              <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
              <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
              <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
              <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
              <NavTab href="/strategy" label="Strategy" pathname={pathname} />
              <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
              <NavTab href="/settings" label="Settings" pathname={pathname} />
            </div>
          </nav>

          <div className="container">
        <div className="header">
          <div className="phase">
            WEEK {week} · {phase} · {macrocycle}
          </div>

          <h1 className="headline">
            Adaptive Performance Programme
          </h1>

          <p className="builtFor">
            Built for: <strong>{trainingGoal}</strong>
            {sessionMins ? ` · ~${sessionMins} min sessions · ${daysPerWeek} days/week` : ""}
          </p>

          <p className="philosophy">
            Built with intent. Structured for adaptation. Designed for operational performance.
            Clarity over complexity — human-first, data-informed.
          </p>

          <div className="meta">
            Strength {Math.round(strengthIndex)} ·
            Aerobic {Math.round(aerobicIndex)} ·
            Recovery {Math.round(recoveryIndex)} ·
            Fatigue {p.fatigue_score}
          </div>

          <div className="markers">
            <span className="markersLabel">Performance markers:</span>
            {" "}
            {PERFORMANCE_MARKERS.slice(0, 3).join(" · ")}
            {" · "}
            <span className="markersMore">{PERFORMANCE_MARKERS.slice(3).join(" · ")}</span>
          </div>
        </div>

        <div className="checkinRow">
          <button
            type="button"
            className="dailyCheckinBtn"
            onClick={() => setCheckinOpen(true)}
            aria-label="Daily readiness check-in — adapt today's programme"
          >
            <span className="dailyCheckinBtnIcon">◇</span>
            {p.checkin_date === todayStr
              ? "Today’s check-in done — programme adapted"
              : "Daily check-in — adapt today’s programme"}
          </button>
          {adaptation !== "normal" && (
            <span className="adaptationBadge">
              {adaptation === "reduce"
                ? "Reduced volume & intensity today"
                : "Optional progressions today"}
            </span>
          )}
        </div>

        <div className="advisoriesWrap">
          <DailyAdvisories advisories={programmeAdvisories} />
        </div>

        {programmeEngineData && (programmeEngineData.injuryAdjusted || programmeEngineData.roadmapPhases.length > 0) && (
          <div className="programmeEngineBanner" style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(39, 224, 166, 0.08)", border: "1px solid rgba(39, 224, 166, 0.2)", borderRadius: 12, fontSize: 12 }}>
            <strong style={{ letterSpacing: "0.04em" }}>Strategy roadmap</strong>
            {programmeEngineData.injuryAdjusted && (
              <span style={{ display: "block", marginTop: 4, opacity: 0.9 }}>
                Foundation extended by {programmeEngineData.foundationExtendedWeeks} week(s). Volume cap {programmeEngineData.volumeCapPercent ?? 100}%.
              </span>
            )}
            {programmeEngineData.roadmapPhases.length > 0 && !programmeEngineData.injuryAdjusted && (
              <span style={{ display: "block", marginTop: 4, opacity: 0.9 }}>
                Phases: {programmeEngineData.roadmapPhases.map((ph) => `${ph.name} (W${ph.startWeek}–W${ph.endWeek})`).join(" · ")}
              </span>
            )}
          </div>
        )}

        {programmeInjuryAdjustment.showAdjustmentBanner && (
          <div className="programmeInjuryAdjustmentBanner" style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: 12, fontSize: 12 }}>
            <strong style={{ letterSpacing: "0.04em" }}>Injury adjustment</strong>
            <span style={{ display: "block", marginTop: 4, opacity: 0.9 }}>
              {programmeInjuryAdjustment.swapExercises && "Exercises swapped for joint-friendly options. "}
              {programmeInjuryAdjustment.reduceIntensity && "Intensity reduced. "}
              {programmeInjuryAdjustment.reason ?? "Programme adapted for current limitation."}
            </span>
          </div>
        )}

        <div className="briefAndLog">
          <div className="briefWrap">
            <WeeklyBrief
              weekNumber={weeklyBriefData.weekNumber}
              phaseIntent={weeklyBriefData.phaseIntent}
              systemBias={weeklyBriefData.systemBias}
              primaryLimiter={weeklyBriefData.primaryLimiter}
              recoveryBandwidth={weeklyBriefData.recoveryBandwidth}
              whyThisWeek={weeklyBriefData.whyThisWeek}
            />
          </div>
          <div className="decisionLogWrap performanceAdjustmentsWrap">
            <div className="performanceAdjustmentsTitle">Performance adjustments</div>
            <div className="performanceAdjustmentsSignal">
              <div className="performanceAdjustmentsSignalTitle">This week</div>
              <div className="performanceAdjustmentsSignalSub">{weeklyBriefData.whyThisWeek}</div>
            </div>
            {p.readiness_score >= 65 && (
              <div className="performanceAdjustmentsSignal">
                <div className="performanceAdjustmentsSignalTitle">Readiness</div>
                <div className="performanceAdjustmentsSignalSub">You&apos;re in a good window to train. Programme is aligned to your current state.</div>
              </div>
            )}
            {programmeAdvisories.length > 0 && (
              <div className="performanceAdjustmentsSignal">
                <div className="performanceAdjustmentsSignalTitle">{programmeAdvisories[0].label}</div>
                <div className="performanceAdjustmentsSignalSub">{programmeAdvisories[0].message}</div>
              </div>
            )}
          </div>
        </div>

        <div className="weekIntro">
          <h2 className="weekIntroTitle">Your sessions this week</h2>
          <p className="weekIntroSub">Tap a day to see the full session. Complete your check-in to adapt volume and intensity.</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", opacity: 0.7, marginBottom: 8 }}>
            PHASE: {programmePhase?.name ?? macrocycle}
            {programme.phases.length > 1 && (
              <span style={{ marginLeft: 12 }}>
                {programme.phases.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedPhase(i)}
                    style={{
                      marginRight: 8,
                      padding: "4px 10px",
                      fontSize: 11,
                      background: selectedPhase === i ? "rgba(47,128,237,0.3)" : "rgba(255,255,255,0.06)",
                      border: selectedPhase === i ? "1px solid rgba(47,128,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6,
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    Phase {i + 1}
                  </button>
                ))}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>Duration: {programmePhase?.duration ?? 6} weeks</div>
        </div>
        <WeekSelector
          totalWeeks={programmePhase?.duration ?? 6}
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
        />
        <ProgrammeWeekView
          weekData={programmeWeekData}
          expandedDayId={expandedDay}
          onExpandedDayChange={setExpandedDay}
        />

        {videoModal && (
          <div
            className="videoModalBackdrop"
            onClick={() => setVideoModal(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Exercise video"
          >
            <div className="videoModal" onClick={(e) => e.stopPropagation()}>
              <div className="videoModalHeader">
                <span>{videoModal.label}</span>
                <button
                  type="button"
                  className="videoModalClose"
                  onClick={() => setVideoModal(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="videoModalFrame">
                <iframe
                  src={`https://www.youtube.com/embed/${videoModal.videoId}?autoplay=1${videoModal.startSeconds != null ? `&start=${videoModal.startSeconds}` : ""}${videoModal.endSeconds != null ? `&end=${videoModal.endSeconds}` : ""}`}
                  title={videoModal.label}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {checkinOpen && (
          <div
            className="videoModalBackdrop checkinBackdrop"
            onClick={() => setCheckinOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Daily check-in"
          >
            <div className="checkinModal" onClick={(e) => e.stopPropagation()}>
              <div className="videoModalHeader">
                <span>Daily check-in</span>
                <button
                  type="button"
                  className="videoModalClose"
                  onClick={() => setCheckinOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="checkinIntro">
                Answer 5 quick questions. Your programme will adapt today’s session (volume, intensity, or alternatives).
              </p>
              <div className="checkinForm">
                <label>
                  <span>1. Readiness (1–10)</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={checkinForm.readiness}
                    onChange={(e) =>
                      setCheckinForm((f) => ({ ...f, readiness: +e.target.value }))
                    }
                  />
                  <span className="rangeVal">{checkinForm.readiness}</span>
                </label>
                <label>
                  <span>2. How do you feel?</span>
                  <select
                    value={checkinForm.feel}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        feel: e.target.value as "good" | "okay" | "poor",
                      }))
                    }
                  >
                    <option value="good">Good</option>
                    <option value="okay">Okay</option>
                    <option value="poor">Poor</option>
                  </select>
                </label>
                <label>
                  <span>3. Any pain?</span>
                  <select
                    value={checkinForm.pain}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        pain: e.target.value as "none" | "yes",
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="yes">Yes</option>
                  </select>
                  {checkinForm.pain === "yes" && (
                    <input
                      type="text"
                      placeholder="Where? (e.g. lower back, knee)"
                      value={checkinForm.painAreas}
                      onChange={(e) =>
                        setCheckinForm((f) => ({ ...f, painAreas: e.target.value }))
                      }
                      className="checkinText"
                    />
                  )}
                </label>
                <label>
                  <span>4. Energy level?</span>
                  <select
                    value={checkinForm.energy}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        energy: e.target.value as "low" | "medium" | "high",
                      }))
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label>
                  <span>5. Sleep last night?</span>
                  <select
                    value={checkinForm.sleep}
                    onChange={(e) =>
                      setCheckinForm((f) => ({
                        ...f,
                        sleep: e.target.value as "poor" | "okay" | "good",
                      }))
                    }
                  >
                    <option value="poor">Poor</option>
                    <option value="okay">Okay</option>
                    <option value="good">Good</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="completeBtn checkinSubmit"
                  onClick={submitCheckin}
                  disabled={checkinSubmitting}
                >
                  {checkinSubmitting ? "Saving…" : "Save & adapt programme"}
                </button>
              </div>
            </div>
          </div>
        )}

        {debriefOpen && (
          <div
            className="videoModalBackdrop checkinBackdrop"
            onClick={() => setDebriefOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Post-session debrief"
          >
            <div className="checkinModal" onClick={(e) => e.stopPropagation()}>
              <div className="videoModalHeader">
                <span>Quick debrief — {debriefSessionName}</span>
                <button
                  type="button"
                  className="videoModalClose"
                  onClick={() => setDebriefOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="checkinIntro">
                2–3 quick questions to recalibrate next session.
              </p>
              <div className="checkinForm">
                <label>
                  <span>1. How did that feel? (1–5)</span>
                  <select
                    value={debriefForm.howFelt}
                    onChange={(e) =>
                      setDebriefForm((f) => ({ ...f, howFelt: +e.target.value }))
                    }
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} — {n <= 2 ? "rough" : n === 3 ? "okay" : "good"}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>2. Any niggles or pain?</span>
                  <input
                    type="text"
                    placeholder="e.g. knee, lower back"
                    value={debriefForm.niggles}
                    onChange={(e) =>
                      setDebriefForm((f) => ({ ...f, niggles: e.target.value }))
                    }
                    className="checkinText"
                  />
                </label>
                <label>
                  <span>3. Ready for next session? (1–5)</span>
                  <select
                    value={debriefForm.readyNext}
                    onChange={(e) =>
                      setDebriefForm((f) => ({ ...f, readyNext: +e.target.value }))
                    }
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} — {n <= 2 ? "need recovery" : n === 3 ? "neutral" : "ready"}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="completeBtn checkinSubmit"
                  onClick={submitDebrief}
                  disabled={debriefSubmitting}
                >
                  {debriefSubmitting ? "Saving…" : "Done"}
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>

        <style jsx>{`
        .outer {
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 10%, rgba(47,128,237,0.12), transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(39,224,166,0.08), transparent 40%),
            linear-gradient(180deg, #0a0a0f 0%, #0f1117 50%, #0a0a0f 100%);
          color: #fff;
          position: relative;
          overflow-x: hidden;
        }
        .outer::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.4;
          pointer-events: none;
        }
        .programmeNav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: relative;
          z-index: 1;
        }
        .programmeBrand {
          font-size: 12px;
          letter-spacing: 2px;
          opacity: 0.6;
        }
        .programmeTabs {
          display: flex;
          gap: 30px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px;
          position: relative;
          z-index: 1;
        }

        .header { margin-bottom:48px; }

        .phase {
          font-size:12px;
          opacity:0.6;
          letter-spacing:2px;
        }

        .headline {
          font-size:28px;
          font-weight:700;
          margin:16px 0 8px;
          letter-spacing:-0.02em;
          line-height:1.25;
        }

        .meta {
          opacity:0.7;
          font-size:14px;
        }

        .builtFor {
          font-size:14px;
          opacity:0.9;
          margin:8px 0 4px;
        }

        .builtFor strong { font-weight:600; }

        .philosophy {
          font-size:13px;
          opacity:0.8;
          max-width:720px;
          margin:12px 0 16px;
          line-height:1.5;
        }

        .markers {
          font-size:12px;
          opacity:0.65;
          margin-top:8px;
        }

        .markersLabel { opacity:0.85; }

        .markersMore { opacity:0.75; }

        .checkinRow {
          display:flex;
          align-items:center;
          gap:16px;
          flex-wrap:wrap;
          margin-bottom:28px;
          padding:20px 24px;
          background:linear-gradient(135deg, rgba(47,128,237,0.12), rgba(39,224,166,0.08));
          border:1px solid rgba(47,128,237,0.35);
          border-radius:16px;
        }

        .advisoriesWrap {
          margin-bottom:28px;
        }

        .dailyCheckinBtn {
          display:inline-flex;
          align-items:center;
          gap:10px;
          padding:14px 24px;
          background:rgba(47,128,237,0.4);
          border:1px solid rgba(47,128,237,0.7);
          border-radius:12px;
          color:#fff;
          font-weight:600;
          font-size:15px;
          cursor:pointer;
          box-shadow:0 2px 12px rgba(47,128,237,0.25);
        }

        .dailyCheckinBtn:hover {
          background:rgba(47,128,237,0.55);
          box-shadow:0 4px 16px rgba(47,128,237,0.35);
        }

        .dailyCheckinBtnIcon {
          opacity:0.9;
          font-size:14px;
        }

        .adaptationBadge {
          font-size:12px;
          opacity:0.85;
          padding:6px 12px;
          background:rgba(39,224,166,0.15);
          border-radius:8px;
          color:#6ee7b7;
        }

        .checkinBackdrop { align-items:flex-start; padding-top:48px; }

        .checkinModal {
          background:#0A1220;
          border-radius:16px;
          overflow:hidden;
          max-width:420px;
          width:100%;
          border:1px solid rgba(255,255,255,0.1);
        }

        .checkinIntro {
          padding:0 18px 16px;
          font-size:13px;
          opacity:0.85;
          line-height:1.45;
        }

        .checkinForm {
          padding:0 18px 20px;
          display:flex;
          flex-direction:column;
          gap:14px;
        }

        .checkinForm label {
          display:flex;
          flex-direction:column;
          gap:6px;
          font-size:13px;
        }

        .checkinForm label span:first-of-type { opacity:0.9; }

        .checkinForm input[type="range"] {
          width:100%;
          accent-color:#2F80ED;
        }

        .checkinForm select {
          padding:8px 12px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:8px;
          color:white;
          font-size:14px;
        }

        .checkinText {
          padding:8px 12px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:8px;
          color:white;
          font-size:14px;
        }

        .rangeVal {
          font-weight:600;
          opacity:1;
        }

        .checkinSubmit { margin-top:8px; }

        .briefAndLog {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:28px;
          margin-bottom:40px;
        }
        @media (max-width: 768px) {
          .briefAndLog { grid-template-columns:1fr; }
        }
        .briefWrap, .decisionLogWrap { min-width:0; }

        .performanceAdjustmentsWrap {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 16px 20px;
        }
        .performanceAdjustmentsTitle {
          font-size: 11px;
          letter-spacing: 0.08em;
          opacity: 0.65;
          margin-bottom: 12px;
        }
        .performanceAdjustmentsSignal {
          background: rgba(255,255,255,0.05);
          padding: 18px;
          border-radius: 16px;
          margin-bottom: 12px;
        }
        .performanceAdjustmentsSignal:last-child { margin-bottom: 0; }
        .performanceAdjustmentsSignalTitle { font-weight: 600; margin-bottom: 4px; }
        .performanceAdjustmentsSignalSub { opacity: 0.6; font-size: 13px; line-height: 1.4; }

        .weekIntro {
          margin-bottom:28px;
        }
        .weekIntroTitle {
          font-size:18px;
          font-weight:600;
          margin:0 0 8px;
          letter-spacing:-0.01em;
        }
        .weekIntroSub {
          font-size:14px;
          opacity:0.8;
          margin:0;
          line-height:1.5;
        }

        .weekGrid {
          display:grid;
          grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));
          gap:20px;
        }
        @media (max-width: 768px) {
          .weekGrid { grid-template-columns:1fr; }
        }

        .dayCard {
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:16px;
          overflow:hidden;
          transition:background 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .dayCardExpanded {
          background:rgba(255,255,255,0.07);
          border-color:rgba(47,128,237,0.25);
          box-shadow:0 8px 32px rgba(0,0,0,0.3);
        }

        .dayHeader {
          width:100%;
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:18px 20px;
          font-size:15px;
          font-weight:600;
          text-align:left;
          color:inherit;
          background:none;
          border:none;
          cursor:pointer;
          transition:background 0.2s;
        }
        .dayHeader:hover {
          background:rgba(255,255,255,0.05);
        }
        .dayHeaderLabel { flex:1; }
        .dayHeaderChevron {
          font-size:10px;
          opacity:0.7;
          margin-left:8px;
        }

        .blocks {
          padding:0 20px 24px;
          margin-top:0;
          border-top:1px solid rgba(255,255,255,0.06);
          animation:dayExpand 0.25s ease-out;
        }
        @keyframes dayExpand {
          from { opacity:0; }
          to { opacity:1; }
        }

        .programmeCardWrap { margin:20px 0 28px; }

        .blockCard {
          margin-bottom:20px;
          padding:20px;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:14px;
        }

        .blockCardHeader {
          display:flex;
          align-items:center;
          gap:10px;
          margin-bottom:14px;
        }

        .blockCardStep {
          font-size:11px;
          font-weight:600;
          text-transform:uppercase;
          letter-spacing:0.06em;
          color:#2F80ED;
          opacity:0.95;
        }

        .blockCardSection {
          font-size:15px;
          font-weight:600;
          margin:0;
          color:#fff;
        }

        .blockDetailList {
          list-style:none;
          margin:0 0 12px;
          padding:0;
        }

        .blockDetailItem {
          font-size:15px;
          font-weight:500;
          line-height:1.5;
          padding:6px 0;
          border-bottom:1px solid rgba(255,255,255,0.05);
        }
        .blockDetailItem:last-child { border-bottom:none; }

        .blockNotes {
          display:flex;
          gap:10px;
          margin-top:12px;
          padding:12px 14px;
          background:rgba(0,0,0,0.2);
          border-radius:10px;
          border-left:3px solid rgba(47,128,237,0.5);
        }

        .blockNotesIcon { font-size:14px; flex-shrink:0; }
        .blockNotesText {
          font-size:13px;
          opacity:0.85;
          line-height:1.5;
          margin:0;
        }

        .exerciseVideos {
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          gap:8px;
          margin-top:14px;
        }

        .videoLabel {
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:0.05em;
          opacity:0.7;
          margin-right:8px;
        }

        .videoBtn {
          padding:8px 14px;
          font-size:13px;
          background:rgba(47,128,237,0.2);
          border:1px solid rgba(47,128,237,0.4);
          border-radius:8px;
          color:#93c5fd;
          cursor:pointer;
          transition:background 0.2s, border-color 0.2s;
        }

        .videoBtn:hover {
          background:rgba(47,128,237,0.35);
          border-color:rgba(47,128,237,0.6);
        }

        .sessionActions {
          margin-top:24px;
          padding:18px 20px;
          background:rgba(47,128,237,0.08);
          border:1px solid rgba(47,128,237,0.2);
          border-radius:12px;
          display:flex;
          flex-wrap:wrap;
          align-items:center;
          gap:12px;
        }

        .sessionActionBtn {
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:12px 20px;
          background:rgba(47,128,237,0.3);
          border:1px solid rgba(47,128,237,0.5);
          border-radius:10px;
          color:#fff;
          font-size:14px;
          font-weight:600;
          cursor:pointer;
          transition:opacity 0.2s, transform 0.2s;
        }
        .sessionActionBtn:hover {
          opacity:0.95;
          transform:translateY(-1px);
        }
        .sessionActionIcon { font-size:16px; }
        .sessionActionHint {
          font-size:13px;
          opacity:0.75;
        }

        .videoModalBackdrop {
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.75);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:1000;
          padding:24px;
        }

        .videoModal {
          background:#0A1220;
          border-radius:16px;
          overflow:hidden;
          max-width:900px;
          width:100%;
          border:1px solid rgba(255,255,255,0.1);
        }

        .videoModalHeader {
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:14px 18px;
          border-bottom:1px solid rgba(255,255,255,0.08);
        }

        .videoModalClose {
          background:none;
          border:none;
          color:white;
          font-size:24px;
          cursor:pointer;
          opacity:0.8;
          line-height:1;
        }

        .videoModalClose:hover { opacity:1; }

        .videoModalFrame {
          position:relative;
          padding-bottom:56.25%;
          height:0;
        }

        .videoModalFrame iframe {
          position:absolute;
          top:0;
          left:0;
          width:100%;
          height:100%;
          border:none;
        }

        .completeBtn {
          margin-top:24px;
          padding:14px 24px;
          width:100%;
          max-width:280px;
          background:linear-gradient(135deg, #2F80ED, #2563eb);
          border:none;
          border-radius:12px;
          color:white;
          font-size:15px;
          font-weight:600;
          cursor:pointer;
          transition:opacity 0.2s, transform 0.2s;
        }
        .completeBtn:hover {
          opacity:0.95;
          transform:translateY(-1px);
        }
        .completeBtn:active {
          transform:translateY(0);
        }
      `}</style>
      </OSLayer>
    </RequireAuth>
  );
}
```

## app/settings/page.tsx

```tsx
"use client";

import OSLayer from "@/app/components/OSLayer";
import SettingsView from "@/app/components/SettingsView";

export default function SettingsPage() {
  return (
    <OSLayer>
      <SettingsView />
    </OSLayer>
  );
}
```

## app/signup/page.tsx

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AIContainer from "@/app/components/AIContainer";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!error) {
      router.push("/intake");
    }
  }

  return (
    <AIContainer>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 30, fontWeight: 600, marginBottom: 12 }}>
          Build your performance system
        </h1>

        <p style={{ opacity: 0.65, fontSize: 14, lineHeight: 1.6 }}>
          Answer a few intelligent questions and we’ll generate your adaptive
          training model — tailored to your goals, constraints, and capacity.
        </p>
      </div>

      <form
        onSubmit={handleSignup}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Create password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button type="submit" style={buttonStyle}>
          Begin →
        </button>
      </form>
    </AIContainer>
  );
}

const inputStyle = {
  padding: "16px 20px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};

const buttonStyle = {
  padding: "16px 20px",
  borderRadius: 16,
  border: "none",
  background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};
```

## app/strategy/page.tsx

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import { supabase } from "@/lib/supabaseClient";
import OSLayer from "@/app/components/OSLayer";
import GoalInputCard from "@/app/components/GoalInputCard";
import RoadmapTimeline from "@/app/components/RoadmapTimeline";
import GoalProjectionChart from "@/app/components/GoalProjectionChart";
import StrategyKPIPanel from "@/app/components/StrategyKPIPanel";
import InjuryStatusPanel from "@/app/components/InjuryStatusPanel";
import StrategyAdjustmentsPanel from "@/app/components/StrategyAdjustmentsPanel";
import MilestoneUpdateModal from "@/app/components/MilestoneUpdateModal";
import {
  calculateExecutionProbability,
  calculateExecutionProbabilityDynamic,
  type GoalRoadmapResult,
  type CurrentBenchmarks,
} from "@/lib/goalEngine";
import type { PerformanceBenchmarks } from "@/lib/profile/benchmarkSchema";
import {
  loadStrategyGoals,
  addStrategyGoal,
  removeStrategyGoal,
  updateStrategyGoal,
  type StrategyGoal,
  type InjuryStatus,
  type MilestoneProgressEntry,
} from "@/lib/strategyStore";
import { PerformanceEngine } from "@/lib/performanceEngine";
import { subscribe as subscribePerformance } from "@/lib/performanceEvents";

function profileToCurrentBenchmarks(pb: PerformanceBenchmarks | null | undefined): CurrentBenchmarks | null {
  if (!pb?.exerciseBenchmarks) return null;
  const eb = pb.exerciseBenchmarks;
  const num = (key: string): number | null => {
    const b = eb[key];
    if (!b) return null;
    const v = b.oneRM ?? b.estimatedOneRM ?? null;
    return v != null && v > 0 ? v : null;
  };
  const twoMile = pb.aerobicBenchmarks?.two_mile_time ?? null;
  return {
    back_squat: num("back_squat"),
    bench_press: num("bench_press"),
    deadlift: num("deadlift"),
    overhead_press: num("overhead_press"),
    two_mile_time_sec: twoMile,
  };
}

function NavTab({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={active ? "active" : undefined}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

export default function StrategyPage() {
  const pathname = usePathname();
  const [goals, setGoals] = useState<StrategyGoal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentBenchmarks, setCurrentBenchmarks] = useState<CurrentBenchmarks | null>(null);
  const [milestoneModalMilestone, setMilestoneModalMilestone] = useState<{ id: string; label: string; week: number; targetValue: number } | null>(null);

  useEffect(() => {
    setGoals(PerformanceEngine.getGoals());
    const unsub = subscribePerformance("stateRecalculated", () => {
      setGoals(PerformanceEngine.getGoals());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (goals.length > 0 && !selectedId) setSelectedId(goals[0].id);
    if (goals.length === 0) setSelectedId(null);
    if (selectedId && !goals.some((g) => g.id === selectedId)) setSelectedId(goals[0]?.id ?? null);
  }, [goals, selectedId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("performance_benchmarks")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setCurrentBenchmarks(profileToCurrentBenchmarks(data?.performance_benchmarks ?? null));
    })();
    return () => { cancelled = true; };
  }, []);

  const addGoal = useCallback((result: GoalRoadmapResult) => {
    const title = result.goalTitle || "My goal";
    const category = result.kpis.length ? "Custom" : "Custom";
    const added = PerformanceEngine.addGoal({
      title,
      category,
      deadline: result.deadline,
      roadmap: result,
      goalDetails: result.goalDetails,
    });
    setGoals(PerformanceEngine.getGoals());
    setSelectedId(added.id);
  }, []);

  const removeGoal = useCallback((id: string) => {
    const next = PerformanceEngine.removeGoal(id);
    setGoals(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }, [selectedId]);

  const selected = goals.find((g) => g.id === selectedId);

  const executionLegacy = selected
    ? calculateExecutionProbability(
        selected.roadmap.totalWeeks,
        selected.roadmap.priority,
        (selected.roadmap.constraints || "").length,
        selected.roadmap.kpis
      )
    : null;

  const execution = selected
    ? calculateExecutionProbabilityDynamic(
        selected.roadmap.totalWeeks,
        selected.roadmap.priority,
        (selected.roadmap.constraints || "").length,
        selected.roadmap.kpis,
        {
          injuryActive: selected.injuryStatus?.active,
          injurySeverity: selected.injuryStatus?.severity,
          milestoneDeviations: selected.milestoneProgress?.map((m) => m.deviation ?? 0).filter((d) => d !== 0),
          eventDistanceKm: selected.eventDistance,
        }
      )
    : null;

  const riskHeat = selected?.roadmap.weeklyTargets?.slice(0, selected.roadmap.totalWeeks).map((_, i) => {
    if (selected.injuryStatus?.active && (i + 1) % 4 === 0) return "red" as const;
    const kpiRisk = selected.roadmap.kpis[0]?.risk;
    if (kpiRisk === "red") return "red" as const;
    if (kpiRisk === "amber") return "amber" as const;
    return "green" as const;
  });

  const handleInjuryChange = useCallback(
    (status: InjuryStatus | null) => {
      if (!selectedId) return;
      PerformanceEngine.updateGoal(selectedId, { injuryStatus: status ?? undefined });
      setGoals(PerformanceEngine.getGoals());
    },
    [selectedId]
  );

  const handleMilestoneSave = useCallback(
    (milestoneId: string, actualValue: number, notes: string) => {
      if (!selected || !milestoneModalMilestone) return;
      const milestone = selected.roadmap.milestones.find((m) => m.id === milestoneId);
      if (!milestone) return;
      const primaryKpi = selected.roadmap.kpis[0];
      if (!primaryKpi) return;
      const targetAtMilestone =
        (primaryKpi.currentValue ?? primaryKpi.targetValue - primaryKpi.ratePerWeek * selected.roadmap.totalWeeks) +
        (primaryKpi.targetValue - (primaryKpi.currentValue ?? primaryKpi.targetValue - primaryKpi.ratePerWeek * selected.roadmap.totalWeeks)) *
          (milestone.week / selected.roadmap.totalWeeks);
      const deviation = targetAtMilestone !== 0 ? ((actualValue - targetAtMilestone) / targetAtMilestone) * 100 : 0;
      const existing = selected.milestoneProgress ?? [];
      const next = existing.filter((m) => m.milestoneId !== milestoneId);
      next.push({ milestoneId, completed: Math.abs(deviation) <= 5, actualValue, deviation });
      PerformanceEngine.updateMilestone(selectedId, next);
      setGoals(PerformanceEngine.getGoals());
      setMilestoneModalMilestone(null);
    },
    [selected, selectedId, milestoneModalMilestone]
  );

  return (
    <RequireAuth>
      <OSLayer>
        <div className="strategyOuter">
          <nav className="strategyNav">
            <div className="strategyBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="strategyTabs">
              <NavTab href="/profile" label="Dashboard" pathname={pathname} />
              <NavTab href="/programme" label="Programme" pathname={pathname} />
              <NavTab href="/tactical" label="Tactical" pathname={pathname} />
              <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
              <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
              <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
              <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
              <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
              <NavTab href="/strategy" label="Strategy" pathname={pathname} />
              <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
              <NavTab href="/settings" label="Settings" pathname={pathname} />
            </div>
          </nav>

          <div className="strategyContainer">
            <div className="strategyHeaderRow">
              <div className="strategyHeader">
                <div className="strategyPhase">STRATEGY</div>
                <h1 className="strategyHeadline">Strategy Roadmap</h1>
                <p className="strategySub">Turn intent into execution.</p>
              </div>
            </div>

            <div className="strategyGoalBar">
              <div className="strategyGoalPills">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`strategyGoalPill ${g.id === selectedId ? "active" : ""}`}
                    onClick={() => setSelectedId(g.id)}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
              <div className="strategyGoalActions">
                <a href="#strategy-goal-form" className="strategyGoalBtn strategyGoalBtnAdd">
                  Add Goal
                </a>
                {selectedId && (
                  <button
                    type="button"
                    className="strategyGoalBtn strategyGoalBtnRemove"
                    onClick={() => removeGoal(selectedId)}
                    aria-label="Remove goal"
                  >
                    Remove Goal
                  </button>
                )}
              </div>
            </div>

            {selected && (
              <>
                <div className="strategySection strategySectionExecution">
                  <div className="strategyExecutionCard">
                    <div className="strategyExecutionGlow" />
                    <div className="strategyExecutionPercent">{execution?.score ?? executionLegacy?.percentage ?? 0}%</div>
                    <div className="strategyExecutionConfidence">
                      {(execution?.confidenceBand ?? executionLegacy?.band ?? "medium").toUpperCase()} CONFIDENCE
                    </div>
                    {execution?.riskDrivers?.length ? (
                      <ul className="strategyExecutionRiskDrivers">
                        {execution.riskDrivers.slice(0, 3).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>

                {selected.roadmap.kpis.length > 0 && (
                  <div className="strategySection">
                    <GoalProjectionChart
                      totalWeeks={selected.roadmap.totalWeeks}
                      phases={selected.roadmap.phases}
                      milestones={selected.roadmap.milestones}
                      primaryKpi={selected.roadmap.kpis[0]}
                      milestoneProgress={selected.milestoneProgress}
                    />
                  </div>
                )}

                <div className="strategySection">
                  <RoadmapTimeline
                    phases={selected.roadmap.phases}
                    milestones={selected.roadmap.milestones}
                    totalWeeks={selected.roadmap.totalWeeks}
                    progressPercent={0}
                    riskHeat={riskHeat}
                  />
                </div>

                <div className="strategySection">
                  <StrategyAdjustmentsPanel goal={selected} execution={execution ?? null} />
                </div>

                <div className="strategySection">
                  <InjuryStatusPanel
                    injuryStatus={selected.injuryStatus ?? null}
                    onChange={handleInjuryChange}
                  />
                </div>

                <div className="strategySection strategyMilestoneControls">
                  <h3 className="strategyMilestoneControlsTitle">Milestone updates</h3>
                  <p className="strategyMilestoneControlsSub">Record actual performance to track deviation.</p>
                  <div className="strategyMilestoneButtons">
                    {selected.roadmap.milestones.map((m) => {
                      const targetVal =
                        selected.roadmap.kpis[0] &&
                        (selected.roadmap.kpis[0].currentValue ??
                          selected.roadmap.kpis[0].targetValue -
                            selected.roadmap.kpis[0].ratePerWeek * selected.roadmap.totalWeeks) +
                          (selected.roadmap.kpis[0].targetValue -
                            (selected.roadmap.kpis[0].currentValue ??
                              selected.roadmap.kpis[0].targetValue -
                                selected.roadmap.kpis[0].ratePerWeek * selected.roadmap.totalWeeks)) *
                            (m.week / selected.roadmap.totalWeeks);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className="strategyMilestoneBtn"
                          onClick={() =>
                            setMilestoneModalMilestone({
                              id: m.id,
                              label: m.label,
                              week: m.week,
                              targetValue: targetVal,
                            })
                          }
                        >
                          {m.label} — W{m.week}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="strategySection">
                  <StrategyKPIPanel kpis={selected.roadmap.kpis} />
                </div>
              </>
            )}

            {milestoneModalMilestone && selected && selected.roadmap.kpis[0] && (
              <MilestoneUpdateModal
                milestone={selected.roadmap.milestones.find((m) => m.id === milestoneModalMilestone.id) ?? null}
                primaryUnit={selected.roadmap.kpis[0].unit}
                isTimeMetric={selected.roadmap.kpis[0].unit === "sec"}
                existingProgress={selected.milestoneProgress?.find((p) => p.milestoneId === milestoneModalMilestone.id)}
                onSave={(actualValue, notes) => handleMilestoneSave(milestoneModalMilestone.id, actualValue, notes)}
                onClose={() => setMilestoneModalMilestone(null)}
              />
            )}

            <div id="strategy-goal-form" className="strategySection strategySectionForm">
              <GoalInputCard onGenerate={addGoal} currentBenchmarks={currentBenchmarks} />
            </div>
          </div>

          <style jsx>{`
            .strategyOuter {
              min-height: 100vh;
              background:
                radial-gradient(circle at 20% 10%, rgba(47,128,237,0.12), transparent 40%),
                radial-gradient(circle at 80% 90%, rgba(39,224,166,0.08), transparent 40%),
                linear-gradient(180deg, #0a0a0f 0%, #0f1117 50%, #0a0a0f 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .strategyOuter::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
              background-size: 40px 40px;
              opacity: 0.4;
              pointer-events: none;
            }
            .strategyNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .strategyBrand {
              font-size: 12px;
              letter-spacing: 2px;
              opacity: 0.6;
            }
            .strategyTabs {
              display: flex;
              gap: 30px;
            }
            .strategyContainer {
              max-width: 1200px;
              margin: 0 auto;
              padding: 40px;
              position: relative;
              z-index: 1;
            }
            .strategyHeaderRow {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              margin-bottom: 48px;
              flex-wrap: wrap;
            }
            .strategyHeader {
              margin-bottom: 0;
            }
            .strategyPhase {
              font-size: 11px;
              letter-spacing: 0.12em;
              opacity: 0.6;
              margin-bottom: 8px;
            }
            .strategyHeadline {
              font-size: 28px;
              font-weight: 600;
              margin: 0 0 12px;
            }
            .strategySub {
              font-size: 15px;
              opacity: 0.8;
              margin: 0;
              line-height: 1.5;
            }
            .strategyGoalBar {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 48px;
            }
            .strategyGoalPills {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .strategyGoalPill {
              padding: 10px 18px;
              font-size: 12px;
              font-weight: 500;
              letter-spacing: 0.03em;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 999px;
              color: rgba(255, 255, 255, 0.8);
              cursor: pointer;
              transition: box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
            }
            .strategyGoalPill:hover {
              background: rgba(255, 255, 255, 0.08);
              border-color: rgba(39, 224, 166, 0.25);
              box-shadow: 0 0 20px rgba(39, 224, 166, 0.15);
            }
            .strategyGoalPill.active {
              background: rgba(39, 224, 166, 0.12);
              border-color: rgba(39, 224, 166, 0.4);
              color: #fff;
              box-shadow: 0 0 24px rgba(39, 224, 166, 0.25);
            }
            .strategyGoalActions {
              display: flex;
              gap: 10px;
            }
            .strategyGoalBtn {
              padding: 8px 14px;
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              border-radius: 8px;
              cursor: pointer;
              transition: opacity 0.2s ease, box-shadow 0.2s ease;
              text-decoration: none;
              color: inherit;
            }
            .strategyGoalBtnAdd {
              background: rgba(39, 224, 166, 0.15);
              border: 1px solid rgba(39, 224, 166, 0.35);
              color: rgba(39, 224, 166, 0.95);
            }
            .strategyGoalBtnAdd:hover {
              box-shadow: 0 0 20px rgba(39, 224, 166, 0.25);
            }
            .strategyGoalBtnRemove {
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.15);
              color: rgba(255, 255, 255, 0.7);
            }
            .strategyGoalBtnRemove:hover {
              border-color: rgba(239, 68, 68, 0.4);
              color: rgba(254, 202, 202, 0.95);
            }
            .strategySection {
              margin-bottom: 48px;
            }
            .strategySectionForm {
              margin-bottom: 0;
            }
            .strategySectionExecution {
              display: flex;
              justify-content: flex-start;
            }
            .strategyExecutionCard {
              position: relative;
              width: 120px;
              padding: 24px 28px;
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.06);
              border-radius: 12px;
              text-align: center;
              box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
            }
            .strategyExecutionGlow {
              position: absolute;
              inset: -20px;
              background: radial-gradient(circle, rgba(39, 224, 166, 0.12) 0%, transparent 70%);
              border-radius: 50%;
              pointer-events: none;
              animation: strategyExecutionPulse 3s ease-in-out infinite;
            }
            .strategyExecutionPercent {
              position: relative;
              font-size: 36px;
              font-weight: 700;
              letter-spacing: -0.02em;
              color: #fff;
              line-height: 1.1;
            }
            .strategyExecutionConfidence {
              position: relative;
              margin-top: 8px;
              font-size: 9px;
              font-weight: 600;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              opacity: 0.65;
            }
            .strategyExecutionRiskDrivers {
              position: relative;
              margin: 12px 0 0;
              padding-left: 14px;
              font-size: 9px;
              opacity: 0.7;
              line-height: 1.4;
            }
            .strategyMilestoneControlsTitle {
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 0.04em;
              margin: 0 0 6px;
              color: #fff;
            }
            .strategyMilestoneControlsSub {
              font-size: 11px;
              opacity: 0.65;
              margin: 0 0 14px;
              line-height: 1.4;
            }
            .strategyMilestoneButtons {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .strategyMilestoneBtn {
              padding: 8px 14px;
              font-size: 11px;
              font-weight: 500;
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              color: rgba(255, 255, 255, 0.9);
              cursor: pointer;
              transition: box-shadow 0.2s ease, border-color 0.2s ease;
            }
            .strategyMilestoneBtn:hover {
              border-color: rgba(39, 224, 166, 0.35);
              box-shadow: 0 0 16px rgba(39, 224, 166, 0.12);
            }
            @keyframes strategyExecutionPulse {
              0%, 100% { opacity: 0.6; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.05); }
            }
            @media (max-width: 768px) {
              .strategyNav { padding: 16px; flex-wrap: wrap; gap: 12px; }
              .strategyTabs { gap: 16px; flex-wrap: wrap; }
              .strategyContainer { padding: 16px; }
              .strategyHeaderRow { margin-bottom: 32px; }
              .strategyGoalBar { margin-bottom: 32px; }
              .strategySection { margin-bottom: 32px; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
```

## app/tactical/command/page.tsx

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import { loadReadinessEntries } from "@/lib/tacticalReadinessStorage";
import {
  getFullReadinessFromEntries,
  getReadinessTrendData,
  type FullReadinessRow,
  type TrendDataPoint,
} from "@/lib/tacticalMapData";
import type { TrendIndicator } from "@/lib/readinessAlgorithm";

function NavTab({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

const DIAL_SIZE = 320;
const DIAL_R = 140;
const DIAL_CX = DIAL_SIZE / 2;
const DIAL_CY = DIAL_SIZE / 2;

function trendArrow(t: TrendIndicator): string {
  return t === "IMPROVING" ? "↑" : t === "DECLINING" ? "↓" : "→";
}

export default function TacticalCommandPage() {
  const pathname = usePathname();
  const [entries, setEntries] = useState(loadReadinessEntries());
  const [viewMode, setViewMode] = useState<"unit" | "individual">("unit");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

  useEffect(() => {
    setEntries(loadReadinessEntries());
  }, []);

  const fullRows = useMemo(() => getFullReadinessFromEntries(entries), [entries]);
  const idList = useMemo(
    () => fullRows.map((r) => r.id).sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10)),
    [fullRows]
  );

  const activeRow = useMemo((): FullReadinessRow | null => {
    if (viewMode === "individual" && selectedId) {
      return fullRows.find((r) => r.id === selectedId) ?? null;
    }
    return null;
  }, [viewMode, selectedId, fullRows]);

  const unitAggregate = useMemo(() => {
    if (fullRows.length === 0)
      return {
        readinessScore: 0,
        readinessStatus: "RISK" as const,
        readinessStatusColor: "red" as const,
        recoveryScore: 0,
        structuralScore: 0,
        exposureScore: 0,
        capacityBuffer: 0,
        trend: "STABLE" as TrendIndicator,
        highRiskCount: 0,
        overCapacityCount: 0,
        bottomThirdCount: 0,
      };
    const sorted = [...fullRows].sort((a, b) => a.readinessScore - b.readinessScore);
    const third = Math.max(1, Math.floor(sorted.length / 3));
    const bottomThird = sorted.slice(0, third);
    return {
      readinessScore: fullRows.reduce((s, r) => s + r.readinessScore, 0) / fullRows.length,
      readinessStatus: fullRows.filter((r) => r.readinessScore >= 75).length >= fullRows.length / 2 ? "READY" : fullRows.filter((r) => r.readinessScore >= 60).length >= fullRows.length / 2 ? "MANAGE" : "RISK",
      readinessStatusColor: (() => {
        const avg = fullRows.reduce((s, r) => s + r.readinessScore, 0) / fullRows.length;
        return avg >= 75 ? "green" : avg >= 60 ? "amber" : "red";
      })(),
      recoveryScore: fullRows.reduce((s, r) => s + r.recoveryScore, 0) / fullRows.length,
      structuralScore: fullRows.reduce((s, r) => s + r.structuralScore, 0) / fullRows.length,
      exposureScore: fullRows.reduce((s, r) => s + r.exposureScore, 0) / fullRows.length,
      capacityBuffer: fullRows.reduce((s, r) => s + r.capacityBuffer, 0) / fullRows.length,
      trend: fullRows.filter((r) => r.trend === "DECLINING").length > fullRows.filter((r) => r.trend === "IMPROVING").length ? "DECLINING" : fullRows.filter((r) => r.trend === "IMPROVING").length > fullRows.filter((r) => r.trend === "DECLINING").length ? "IMPROVING" : "STABLE",
      highRiskCount: fullRows.filter((r) => r.riskLevel === "HIGH").length,
      overCapacityCount: fullRows.filter((r) => r.capacityBuffer < -10).length,
      bottomThirdCount: bottomThird.length,
    };
  }, [fullRows]);

  const displayValue = viewMode === "unit" ? unitAggregate.readinessScore : activeRow?.readinessScore ?? 0;
  const displayStatus = viewMode === "unit"
    ? (unitAggregate.readinessScore >= 75 ? "READY" : unitAggregate.readinessScore >= 60 ? "MANAGE" : "HIGH RISK")
    : (activeRow ? (activeRow.readinessScore >= 75 ? "READY" : activeRow.readinessScore >= 60 ? "MANAGE" : "HIGH RISK") : "—");
  const displayColor = viewMode === "unit"
    ? unitAggregate.readinessStatusColor
    : (activeRow?.readinessStatusColor ?? "red");

  const trendData = useMemo(
    () => getReadinessTrendData(entries, trendDays),
    [entries, trendDays]
  );

  const recoveryVal = viewMode === "unit" ? unitAggregate.recoveryScore : activeRow?.recoveryScore ?? 0;
  const recoveryTrend = viewMode === "unit" ? unitAggregate.trend : activeRow?.trend ?? "STABLE";
  const structuralVal = viewMode === "unit" ? unitAggregate.structuralScore : activeRow?.structuralScore ?? 0;
  const structuralTrend = viewMode === "unit" ? unitAggregate.trend : activeRow?.trend ?? "STABLE";
  const exposureVal = viewMode === "unit" ? unitAggregate.exposureScore : activeRow?.exposureScore ?? 0;
  const exposureTrend = viewMode === "unit" ? unitAggregate.trend : activeRow?.trend ?? "STABLE";

  const avgBuffer = viewMode === "unit" ? unitAggregate.capacityBuffer : (activeRow?.capacityBuffer ?? 0);
  const bufferLabel = avgBuffer >= 0 ? "Stable Capacity Margin" : "Overloaded System";

  const arcStart = 270;
  const arcSpan = 180;
  const arcEndAngle = arcStart - (displayValue / 100) * arcSpan;
  const zoneColor = displayColor === "green" ? "rgba(39,224,166,0.9)" : displayColor === "amber" ? "rgba(234,179,8,0.9)" : "rgba(239,68,68,0.9)";
  const zoneGlow = displayColor === "green" ? "0 0 30px rgba(39,224,166,0.6)" : displayColor === "amber" ? "0 0 30px rgba(234,179,8,0.5)" : "0 0 30px rgba(239,68,68,0.5)";

  const chartHeight = 120;
  const chartWidth = 340;
  const maxR = trendData.length ? Math.max(...trendData.map((d) => d.avgReadiness), 1) : 100;
  const minR = trendData.length ? Math.min(...trendData.map((d) => d.avgReadiness), 99) : 0;
  const range = maxR - minR || 1;
  const points = trendData
    .map((d, i) => {
      const x = (i / Math.max(trendData.length - 1, 1)) * (chartWidth - 40) + 20;
      const y = chartHeight - 20 - ((d.avgReadiness - minR) / range) * (chartHeight - 40);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <RequireAuth>
      <OSLayer>
        <div className="cmdOuter">
          <nav className="cmdNav">
            <div className="cmdBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="cmdTabs">
              <NavTab href="/profile" label="Dashboard" pathname={pathname} />
              <NavTab href="/programme" label="Programme" pathname={pathname} />
              <NavTab href="/tactical" label="Tactical" pathname={pathname} />
              <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
              <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
              <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
              <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
              <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
              <NavTab href="/strategy" label="Strategy" pathname={pathname} />
              <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
              <NavTab href="/settings" label="Settings" pathname={pathname} />
            </div>
          </nav>

          <div className="cmdContainer">
            <div className="cmdHeader">
              <div className="cmdPhase">TACTICAL</div>
              <h1 className="cmdHeadline">Command Readiness</h1>
              <p className="cmdSub">High-level operational readiness signal. Is the unit ready to perform today?</p>
              <Link href="/tactical" className="cmdBackLink">← Back to Tactical Dashboard</Link>
            </div>

            {/* VIEW toggle */}
            <section className="cmdSection">
              <h2 className="cmdSectionTitle">VIEW</h2>
              <div className="viewRow">
                <button type="button" className={`viewBtn ${viewMode === "unit" ? "active" : ""}`} onClick={() => setViewMode("unit")}>Unit</button>
                <button type="button" className={`viewBtn ${viewMode === "individual" ? "active" : ""}`} onClick={() => setViewMode("individual")}>Individual</button>
              </div>
              {viewMode === "individual" && (
                <div className="focusSelectWrap">
                  <label className="cmdLabel">Select ID</label>
                  <select value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value || null)} className="cmdSelect">
                    <option value="">—</option>
                    {idList.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
              )}
            </section>

            {/* Main dial */}
            <section className="cmdSection dialSection">
              <h2 className="cmdSectionTitle">UNIT READINESS STATUS</h2>
              <div className="dialWrap">
                <svg className="dialSvg" viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`} width={DIAL_SIZE} height={DIAL_SIZE}>
                  <defs>
                    <filter id="dialGlow">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <circle cx={DIAL_CX} cy={DIAL_CY} r={DIAL_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                  <circle cx={DIAL_CX} cy={DIAL_CY} r={DIAL_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  {/* Zone arcs: red 0-59, amber 60-74, green 75-100 (arc from left 270° to right 90°) */}
                  <path d={describeArc(DIAL_CX, DIAL_CY, DIAL_R, arcStart, arcStart - (59 / 100) * arcSpan)} fill="none" stroke="rgba(239,68,68,0.35)" strokeWidth="10" strokeLinecap="round" />
                  <path d={describeArc(DIAL_CX, DIAL_CY, DIAL_R, arcStart - (60 / 100) * arcSpan, arcStart - (74 / 100) * arcSpan)} fill="none" stroke="rgba(234,179,8,0.35)" strokeWidth="10" strokeLinecap="round" />
                  <path d={describeArc(DIAL_CX, DIAL_CY, DIAL_R, arcStart - (75 / 100) * arcSpan, 90)} fill="none" stroke="rgba(39,224,166,0.35)" strokeWidth="10" strokeLinecap="round" />
                  {/* Value arc */}
                  <path
                    d={describeArc(DIAL_CX, DIAL_CY, DIAL_R, arcStart, arcEndAngle)}
                    fill="none"
                    stroke={zoneColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    filter="url(#dialGlow)"
                    style={{ boxShadow: zoneGlow, transition: "stroke-dasharray 0.5s ease, stroke 0.4s ease" }}
                  />
                </svg>
                <div className="dialValueWrap" style={{ color: zoneColor, textShadow: zoneGlow }}>
                  <span className="dialValue">{Math.round(displayValue)}</span>
                  <span className="dialStatus">{displayStatus}</span>
                </div>
              </div>
            </section>

            {/* Secondary metrics */}
            <section className="cmdSection">
              <h2 className="cmdSectionTitle">Secondary metrics</h2>
              <div className="metricsRow">
                <div className="metricCard">
                  <div className="metricLabel">Recovery State</div>
                  <div className="metricValue">{Math.round(recoveryVal)}</div>
                  <div className="metricTrend">{trendArrow(recoveryTrend)} {recoveryTrend === "IMPROVING" ? "increasing" : recoveryTrend === "DECLINING" ? "declining" : "stable"}</div>
                </div>
                <div className="metricCard">
                  <div className="metricLabel">Structural Integrity</div>
                  <div className="metricValue">{Math.round(structuralVal)}</div>
                  <div className="metricTrend">{trendArrow(structuralTrend)} {structuralTrend === "IMPROVING" ? "increasing" : structuralTrend === "DECLINING" ? "declining" : "stable"}</div>
                </div>
                <div className="metricCard">
                  <div className="metricLabel">Exposure Load</div>
                  <div className="metricValue">{Math.round(exposureVal)}</div>
                  <div className="metricTrend">{trendArrow(exposureTrend)} {exposureTrend === "IMPROVING" ? "increasing" : exposureTrend === "DECLINING" ? "declining" : "stable"}</div>
                </div>
              </div>
            </section>

            {/* Readiness Trend chart */}
            <section className="cmdSection">
              <h2 className="cmdSectionTitle">Unit Readiness Trend</h2>
              <div className="trendFilters">
                <button type="button" className={`trendBtn ${trendDays === 7 ? "active" : ""}`} onClick={() => setTrendDays(7)}>Last 7 days</button>
                <button type="button" className={`trendBtn ${trendDays === 30 ? "active" : ""}`} onClick={() => setTrendDays(30)}>Last 30 days</button>
              </div>
              <div className="chartWrap">
                {trendData.length === 0 ? (
                  <p className="chartEmpty">No trend data. Log entries on Daily Input.</p>
                ) : (
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} className="trendChart">
                    <polyline points={points} fill="none" stroke="rgba(47,128,237,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 8px rgba(47,128,237,0.5))" }} />
                  </svg>
                )}
              </div>
            </section>

            {/* Risk Summary + Capacity Buffer */}
            <div className="twoCol">
              <section className="cmdSection">
                <h2 className="cmdSectionTitle">System Risk Summary</h2>
                <div className="riskGrid">
                  <div className="riskRow"><span className="riskLabel">IDs in High Risk Zone</span><span className="riskVal">{viewMode === "unit" ? unitAggregate.highRiskCount : (activeRow && activeRow.riskLevel === "HIGH" ? 1 : 0)}</span></div>
                  <div className="riskRow"><span className="riskLabel">IDs Over Capacity</span><span className="riskVal">{viewMode === "unit" ? unitAggregate.overCapacityCount : (activeRow && activeRow.capacityBuffer < -10 ? 1 : 0)}</span></div>
                  <div className="riskRow"><span className="riskLabel">Bottom Third Count</span><span className="riskVal">{viewMode === "unit" ? unitAggregate.bottomThirdCount : "—"}</span></div>
                </div>
              </section>
              <section className="cmdSection">
                <h2 className="cmdSectionTitle">Average Capacity Buffer</h2>
                <div className="bufferWrap">
                  <span className={`bufferValue ${avgBuffer < 0 ? "negative" : ""}`}>{avgBuffer >= 0 ? "+" : ""}{Math.round(avgBuffer)}</span>
                  <span className="bufferLabel">{bufferLabel}</span>
                </div>
              </section>
            </div>
          </div>

          <style jsx>{`
            .cmdOuter {
              min-height: 100vh;
              background: #08090c;
              background-image:
                radial-gradient(ellipse 80% 50% at 20% 20%, rgba(47,128,237,0.12), transparent),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(39,224,166,0.06), transparent),
                linear-gradient(180deg, #08090c 0%, #0c0e12 50%, #08090c 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .cmdOuter::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
              background-size: 40px 40px;
              opacity: 0.35;
              pointer-events: none;
            }
            .cmdNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.06);
              position: relative;
              z-index: 2;
            }
            .cmdBrand { font-size: 12px; letter-spacing: 2px; opacity: 0.7; }
            .cmdTabs { display: flex; gap: 16px; flex-wrap: wrap; }
            .cmdContainer { max-width: 720px; margin: 0 auto; padding: 40px; position: relative; z-index: 1; }
            .cmdHeader { margin-bottom: 32px; }
            .cmdPhase { font-size: 11px; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 8px; }
            .cmdHeadline { font-size: 26px; font-weight: 600; margin: 0 0 10px; }
            .cmdSub { font-size: 14px; opacity: 0.8; margin: 0 0 14px; line-height: 1.5; }
            .cmdBackLink { font-size: 13px; color: rgba(47,128,237,0.95); text-decoration: none; }
            .cmdBackLink:hover { text-decoration: underline; }
            .cmdSection {
              margin-bottom: 28px;
              padding: 24px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              box-shadow: 0 0 30px rgba(47,128,237,0.06);
              backdrop-filter: blur(8px);
            }
            .cmdSectionTitle { font-size: 15px; font-weight: 600; margin: 0 0 14px; letter-spacing: 0.03em; }
            .viewRow { display: flex; gap: 12px; flex-wrap: wrap; }
            .viewBtn {
              padding: 10px 20px;
              font-size: 13px; font-weight: 500;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 10px;
              color: rgba(255,255,255,0.9);
              cursor: pointer;
              transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            .viewBtn.active { background: rgba(47,128,237,0.25); border-color: rgba(47,128,237,0.5); color: #fff; box-shadow: 0 0 18px rgba(47,128,237,0.25); }
            .focusSelectWrap { margin-top: 14px; }
            .cmdLabel { display: block; font-size: 13px; opacity: 0.9; margin-bottom: 6px; }
            .cmdSelect { padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(47,128,237,0.35); border-radius: 10px; color: #fff; font-size: 14px; min-width: 140px; }
            .dialSection { text-align: center; }
            .dialWrap { position: relative; display: inline-block; }
            .dialSvg { display: block; }
            .dialValueWrap { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); text-align: center; }
            .dialValue { display: block; font-size: 48px; font-weight: 700; line-height: 1.1; transition: color 0.4s ease; }
            .dialStatus { display: block; font-size: 14px; font-weight: 600; letter-spacing: 0.08em; opacity: 0.95; margin-top: 4px; }
            .metricsRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .metricCard {
              padding: 18px;
              background: rgba(0,0,0,0.2);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 12px;
              text-align: center;
            }
            .metricLabel { font-size: 11px; letter-spacing: 0.06em; opacity: 0.8; margin-bottom: 8px; }
            .metricValue { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
            .metricTrend { font-size: 12px; opacity: 0.85; }
            .trendFilters { display: flex; gap: 10px; margin-bottom: 14px; }
            .trendBtn { padding: 8px 16px; font-size: 12px; font-weight: 500; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: rgba(255,255,255,0.9); cursor: pointer; }
            .trendBtn.active { background: rgba(47,128,237,0.25); border-color: rgba(47,128,237,0.5); color: #fff; }
            .chartWrap { min-height: 120px; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 12px; }
            .chartEmpty { margin: 0; font-size: 13px; opacity: 0.75; text-align: center; padding: 40px 0; }
            .trendChart { display: block; width: 100%; }
            .twoCol { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .riskGrid { display: flex; flex-direction: column; gap: 12px; }
            .riskRow { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
            .riskRow:last-child { border-bottom: none; }
            .riskLabel { font-size: 13px; opacity: 0.9; }
            .riskVal { font-size: 18px; font-weight: 700; }
            .bufferWrap { text-align: center; padding: 16px 0; }
            .bufferValue { font-size: 36px; font-weight: 700; color: rgba(39,224,166,0.95); }
            .bufferValue.negative { color: rgba(239,68,68,0.95); }
            .bufferLabel { display: block; font-size: 13px; opacity: 0.9; margin-top: 8px; }
            @media (max-width: 768px) {
              .cmdNav { padding: 16px; }
              .cmdTabs { gap: 12px; }
              .cmdContainer { padding: 16px; }
              .metricsRow { grid-template-columns: 1fr; }
              .twoCol { grid-template-columns: 1fr; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const large = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
```

## app/tactical/input/page.tsx

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import {
  loadReadinessEntries,
  saveReadinessEntries,
  getStoredIdList,
  type ReadinessEntry,
} from "@/lib/tacticalReadinessStorage";

const DEFAULT_ID_LIST = ["ID 1", "ID 2", "ID 3", "ID 4", "ID 5"];

const defaultForm: Omit<ReadinessEntry, "id" | "date"> = {
  sleep_hours: 7,
  sleep_quality: 3,
  fatigue_level: 2,
  stress_level: 2,
  knee_pain: 0,
  back_pain: 0,
  shin_pain: 0,
  shoulder_pain: 0,
  hip_pain: 0,
  ankle_pain: 0,
  elbow_pain: 0,
  neck_pain: 0,
  muscle_tightness: 0,
  joint_stiffness: 0,
  tendon_irritation: 0,
  movement_restriction: 0,
  strength_index: 70,
  explosive_power: 70,
  neuromuscular_readiness: 70,
  aerobic_capacity: 70,
  movement_durability: 70,
  coordination_quality: 70,
  neuromuscular_fatigue: 2,
  central_fatigue: 2,
  training_load: 5,
  operational_hours: 8,
  high_intensity_exposure: false,
  external_workload: "moderate",
};

function NavTab({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

export default function TacticalInputPage() {
  const pathname = usePathname();
  const [entries, setEntries] = useState<ReadinessEntry[]>([]);
  const [idList, setIdList] = useState<string[]>(DEFAULT_ID_LIST);
  const [selectedId, setSelectedId] = useState<string>("ID 1");
  const [form, setForm] = useState(defaultForm);
  const [saved, setSaved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newIdInput, setNewIdInput] = useState("");

  useEffect(() => {
    const loaded = loadReadinessEntries();
    setEntries(loaded);
    const fromStorage = getStoredIdList(loaded);
    if (fromStorage.length > 0) {
      setIdList((prev) => {
        const combined = new Set([...DEFAULT_ID_LIST, ...fromStorage]);
        return Array.from(combined).sort((a, b) => {
          const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
          const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
          return na - nb;
        });
      });
      if (!selectedId || !fromStorage.includes(selectedId)) setSelectedId(fromStorage[0]);
    }
  }, []);

  function addNewId() {
    const num = parseInt(newIdInput.trim(), 10);
    if (Number.isNaN(num) || num < 1) return;
    const label = `ID ${num}`;
    if (!idList.includes(label)) {
      setIdList((prev) => [...prev, label].sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
        const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
        return na - nb;
      }));
      setSelectedId(label);
    }
    setNewIdInput("");
    setModalOpen(false);
  }

  function update<K extends keyof Omit<ReadinessEntry, "id" | "date">>(key: K, value: ReadinessEntry[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    const date = new Date().toISOString().slice(0, 10);
    const entry: ReadinessEntry = { id: selectedId, date, ...form };
    const next = [entry, ...entries];
    setEntries(next);
    saveReadinessEntries(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const sectionClass = "tacticalInputSection";
  const labelClass = "tacticalLabel";

  return (
    <RequireAuth>
      <OSLayer>
        <div className="tacticalOuter">
          <nav className="tacticalNav">
            <div className="tacticalBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="tacticalTabs">
              <NavTab href="/profile" label="Dashboard" pathname={pathname} />
              <NavTab href="/programme" label="Programme" pathname={pathname} />
              <NavTab href="/tactical" label="Tactical" pathname={pathname} />
              <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
              <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
              <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
              <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
              <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
              <NavTab href="/strategy" label="Strategy" pathname={pathname} />
              <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
              <NavTab href="/settings" label="Settings" pathname={pathname} />
            </div>
          </nav>

          <div className="tacticalContainer">
            <div className="tacticalHeader">
              <div className="tacticalPhase">TACTICAL</div>
              <h1 className="tacticalHeadline">Daily Readiness Input</h1>
              <p className="tacticalSub">Log recovery, structural, capacity and exposure. All data is stored per ID.</p>
              <Link href="/tactical" className="tacticalBackLink">← Back to Tactical Dashboard</Link>
            </div>

            {/* SECTION 1 — ID MANAGEMENT */}
            <section className={`${sectionClass} idManagementPanel`}>
              <h2 className="tacticalSectionTitle">ID Management</h2>
              <div className="idManagementRow">
                <div className="idSelectWrap">
                  <label className={labelClass}>Select ID</label>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="idSelect"
                  >
                    {idList.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
                <button type="button" className="addIdBtn" onClick={() => setModalOpen(true)}>
                  Add New ID
                </button>
              </div>
            </section>

            {/* SECTION 2 — RECOVERY INPUTS */}
            <section className={sectionClass}>
              <h2 className="tacticalSectionTitle">Recovery Inputs</h2>
              <div className="tacticalInputGrid">
                <label className="tacticalField">
                  <span className={labelClass}>sleep_hours</span>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={form.sleep_hours}
                    onChange={(e) => update("sleep_hours", parseFloat(e.target.value) || 0)}
                    className="tacticalInput numInput"
                  />
                </label>
                <label className="tacticalField sliderField">
                  <span className={labelClass}>sleep_quality (1–5)</span>
                  <div className="sliderRow">
                    <input type="range" min={1} max={5} value={form.sleep_quality}
                      onChange={(e) => update("sleep_quality", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.sleep_quality}</span>
                  </div>
                </label>
                <label className="tacticalField sliderField">
                  <span className={labelClass}>fatigue_level (1–5)</span>
                  <div className="sliderRow">
                    <input type="range" min={1} max={5} value={form.fatigue_level}
                      onChange={(e) => update("fatigue_level", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.fatigue_level}</span>
                  </div>
                </label>
                <label className="tacticalField sliderField">
                  <span className={labelClass}>stress_level (1–5)</span>
                  <div className="sliderRow">
                    <input type="range" min={1} max={5} value={form.stress_level}
                      onChange={(e) => update("stress_level", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.stress_level}</span>
                  </div>
                </label>
              </div>
            </section>

            {/* SECTION 3 — STRUCTURAL INTEGRITY */}
            <section className={sectionClass}>
              <h2 className="tacticalSectionTitle">Structural Integrity Inputs</h2>
              <p className="tacticalSectionSub">Pain scale 0–10</p>
              <div className="tacticalInputGrid">
                {(["knee_pain", "back_pain", "shin_pain", "shoulder_pain", "hip_pain", "ankle_pain", "elbow_pain", "neck_pain"] as const).map((key) => (
                  <label key={key} className="tacticalField sliderField">
                    <span className={labelClass}>{key.replace(/_/g, " ")}</span>
                    <div className="sliderRow">
                      <input type="range" min={0} max={10} value={form[key]}
                        onChange={(e) => update(key, parseInt(e.target.value, 10))} className="glowSlider" />
                      <span className="liveVal">{form[key]}</span>
                    </div>
                  </label>
                ))}
                {(["muscle_tightness", "joint_stiffness", "tendon_irritation", "movement_restriction"] as const).map((key) => (
                  <label key={key} className="tacticalField sliderField">
                    <span className={labelClass}>{key.replace(/_/g, " ")}</span>
                    <div className="sliderRow">
                      <input type="range" min={0} max={10} value={form[key]}
                        onChange={(e) => update(key, parseInt(e.target.value, 10))} className="glowSlider" />
                      <span className="liveVal">{form[key]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* SECTION 4 — PERFORMANCE CAPACITY */}
            <section className={sectionClass}>
              <h2 className="tacticalSectionTitle">Performance Capacity Inputs</h2>
              <p className="tacticalSectionSub">Elite performance markers 0–100</p>
              <div className="tacticalInputGrid">
                {(["strength_index", "explosive_power", "neuromuscular_readiness", "aerobic_capacity", "movement_durability", "coordination_quality"] as const).map((key) => (
                  <label key={key} className="tacticalField sliderField">
                    <span className={labelClass}>{key.replace(/_/g, " ")}</span>
                    <div className="sliderRow">
                      <input type="range" min={0} max={100} value={form[key]}
                        onChange={(e) => update(key, parseInt(e.target.value, 10))} className="glowSlider" />
                      <span className="liveVal">{form[key]}</span>
                    </div>
                  </label>
                ))}
                <label className="tacticalField sliderField">
                  <span className={labelClass}>neuromuscular_fatigue (0–10)</span>
                  <div className="sliderRow">
                    <input type="range" min={0} max={10} value={form.neuromuscular_fatigue}
                      onChange={(e) => update("neuromuscular_fatigue", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.neuromuscular_fatigue}</span>
                  </div>
                </label>
                <label className="tacticalField sliderField">
                  <span className={labelClass}>central_fatigue (0–10)</span>
                  <div className="sliderRow">
                    <input type="range" min={0} max={10} value={form.central_fatigue}
                      onChange={(e) => update("central_fatigue", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.central_fatigue}</span>
                  </div>
                </label>
              </div>
            </section>

            {/* SECTION 5 — EXPOSURE */}
            <section className={sectionClass}>
              <h2 className="tacticalSectionTitle">Exposure Inputs</h2>
              <div className="tacticalInputGrid">
                <label className="tacticalField sliderField">
                  <span className={labelClass}>training_load (1–10)</span>
                  <div className="sliderRow">
                    <input type="range" min={1} max={10} value={form.training_load}
                      onChange={(e) => update("training_load", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.training_load}</span>
                  </div>
                </label>
                <label className="tacticalField">
                  <span className={labelClass}>operational_hours</span>
                  <input type="number" min={0} max={24} value={form.operational_hours}
                    onChange={(e) => update("operational_hours", parseInt(e.target.value, 10) || 0)} className="tacticalInput numInput" />
                </label>
                <label className="tacticalField toggleField">
                  <span className={labelClass}>high_intensity_exposure</span>
                  <button type="button" role="switch" aria-checked={form.high_intensity_exposure}
                    className={`tacticalToggle ${form.high_intensity_exposure ? "on" : ""}`}
                    onClick={() => update("high_intensity_exposure", !form.high_intensity_exposure)}>
                    {form.high_intensity_exposure ? "Yes" : "No"}
                  </button>
                </label>
                <label className="tacticalField">
                  <span className={labelClass}>external_workload</span>
                  <select value={form.external_workload} onChange={(e) => update("external_workload", e.target.value as "light" | "moderate" | "heavy")} className="idSelect workloadSelect">
                    <option value="light">light</option>
                    <option value="moderate">moderate</option>
                    <option value="heavy">heavy</option>
                  </select>
                </label>
              </div>
            </section>

            {/* SECTION 6 – SAVE */}
            <section className={`${sectionClass} saveSection`}>
              <button
                type="button"
                className="saveEntryBtn"
                onClick={handleSave}
                disabled={saved}
              >
                {saved ? "Saved" : "Save Readiness Entry"}
              </button>
              {entries.length > 0 && <span className="entryCount">{entries.length} entries in log</span>}
            </section>
          </div>

          {/* Add New ID Modal */}
          {modalOpen && (
            <div className="modalOverlay" onClick={() => setModalOpen(false)}>
              <div className="modalGlass" onClick={(e) => e.stopPropagation()}>
                <h3 className="modalTitle">Add New ID</h3>
                <label className={labelClass}>ID Number</label>
                <p className="modalHint">e.g. 11 → creates ID 11</p>
                <input type="number" min={1} value={newIdInput} onChange={(e) => setNewIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNewId()} className="tacticalInput modalInput" placeholder="11" />
                <div className="modalActions">
                  <button type="button" className="modalBtn secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="button" className="modalBtn primary" onClick={addNewId}>Add ID</button>
                </div>
              </div>
            </div>
          )}

          <style jsx>{`
            .tacticalOuter {
              min-height: 100vh;
              background: #08090c;
              background-image:
                radial-gradient(ellipse 80% 50% at 20% 20%, rgba(47,128,237,0.14), transparent),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(39,224,166,0.08), transparent),
                linear-gradient(180deg, #08090c 0%, #0c0e12 50%, #08090c 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .tacticalOuter::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
              background-size: 40px 40px;
              opacity: 0.35;
              pointer-events: none;
            }
            .tacticalNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.06);
              position: relative;
              z-index: 2;
            }
            .tacticalBrand { font-size: 12px; letter-spacing: 2px; opacity: 0.7; }
            .tacticalTabs { display: flex; gap: 20px; flex-wrap: wrap; }
            .tacticalContainer { max-width: 820px; margin: 0 auto; padding: 40px; position: relative; z-index: 1; }
            .tacticalHeader { margin-bottom: 36px; }
            .tacticalPhase { font-size: 11px; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 8px; }
            .tacticalHeadline { font-size: 26px; font-weight: 600; margin: 0 0 10px; }
            .tacticalSub { font-size: 14px; opacity: 0.8; margin: 0 0 14px; line-height: 1.5; }
            .tacticalBackLink { font-size: 13px; color: rgba(47,128,237,0.95); text-decoration: none; }
            .tacticalBackLink:hover { text-decoration: underline; }
            .tacticalInputSection {
              margin-bottom: 32px;
              padding: 24px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              box-shadow: 0 0 30px rgba(47,128,237,0.06);
              backdrop-filter: blur(8px);
            }
            .idManagementPanel { border-color: rgba(39,224,166,0.2); box-shadow: 0 0 24px rgba(39,224,166,0.08); }
            .tacticalSectionTitle { font-size: 15px; font-weight: 600; margin: 0 0 6px; letter-spacing: 0.03em; }
            .tacticalSectionSub { font-size: 12px; opacity: 0.7; margin: 0 0 16px; }
            .idManagementRow { display: flex; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
            .idSelectWrap { display: flex; flex-direction: column; gap: 8px; }
            .idSelect, .workloadSelect {
              padding: 12px 16px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(47,128,237,0.35);
              border-radius: 10px;
              color: #fff;
              font-size: 14px;
              min-width: 140px;
              box-shadow: 0 0 16px rgba(47,128,237,0.15);
            }
            .idSelect:focus, .workloadSelect:focus { outline: none; border-color: rgba(47,128,237,0.6); box-shadow: 0 0 20px rgba(47,128,237,0.25); }
            .addIdBtn {
              padding: 12px 24px;
              font-size: 14px; font-weight: 600;
              background: linear-gradient(135deg, rgba(39,224,166,0.25), rgba(47,128,237,0.2));
              border: 1px solid rgba(39,224,166,0.5);
              border-radius: 10px;
              color: #fff;
              cursor: pointer;
              transition: box-shadow 0.2s, transform 0.2s;
            }
            .addIdBtn:hover { box-shadow: 0 0 24px rgba(39,224,166,0.35); transform: translateY(-1px); }
            .tacticalInputGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
            .tacticalField { display: flex; flex-direction: column; gap: 8px; }
            .tacticalLabel { font-size: 13px; opacity: 0.92; }
            .tacticalInput.numInput {
              padding: 12px 14px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 10px;
              color: #fff;
              font-size: 14px;
              max-width: 120px;
            }
            .tacticalInput:focus { outline: none; border-color: rgba(47,128,237,0.5); box-shadow: 0 0 0 2px rgba(47,128,237,0.2); }
            .sliderField .sliderRow { display: flex; align-items: center; gap: 12px; }
            .glowSlider {
              flex: 1;
              max-width: 200px;
              height: 8px;
              -webkit-appearance: none;
              appearance: none;
              background: linear-gradient(90deg, rgba(47,128,237,0.3), rgba(39,224,166,0.3));
              border-radius: 4px;
              box-shadow: 0 0 12px rgba(47,128,237,0.25), inset 0 0 8px rgba(0,0,0,0.2);
            }
            .glowSlider::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 20px; height: 20px;
              border-radius: 50%;
              background: linear-gradient(135deg, #2F80ED, #27E0A6);
              box-shadow: 0 0 16px rgba(47,128,237,0.6), 0 0 8px rgba(39,224,166,0.4);
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            .glowSlider::-webkit-slider-thumb:hover { transform: scale(1.1); box-shadow: 0 0 24px rgba(47,128,237,0.8); }
            .glowSlider::-moz-range-thumb {
              width: 20px; height: 20px;
              border-radius: 50%;
              background: linear-gradient(135deg, #2F80ED, #27E0A6);
              box-shadow: 0 0 16px rgba(47,128,237,0.6);
              cursor: pointer;
              border: none;
            }
            .liveVal { font-size: 14px; font-weight: 700; min-width: 28px; color: rgba(39,224,166,0.95); text-shadow: 0 0 12px rgba(39,224,166,0.5); }
            .toggleField { flex-direction: row; align-items: center; flex-wrap: wrap; }
            .tacticalToggle {
              padding: 10px 20px;
              font-size: 13px; font-weight: 500;
              background: rgba(255,255,255,0.08);
              border: 1px solid rgba(255,255,255,0.15);
              border-radius: 10px;
              color: rgba(255,255,255,0.85);
              cursor: pointer;
              transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            .tacticalToggle:hover { background: rgba(255,255,255,0.1); }
            .tacticalToggle.on {
              background: rgba(47,128,237,0.25);
              border-color: rgba(47,128,237,0.5);
              color: #fff;
              box-shadow: 0 0 20px rgba(47,128,237,0.3);
            }
            .saveSection { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
            .saveEntryBtn {
              padding: 16px 32px;
              font-size: 16px; font-weight: 600;
              background: linear-gradient(135deg, rgba(47,128,237,0.45), rgba(39,224,166,0.25));
              border: 1px solid rgba(47,128,237,0.55);
              border-radius: 12px;
              color: #fff;
              cursor: pointer;
              transition: opacity 0.2s, box-shadow 0.2s, transform 0.2s;
              box-shadow: 0 0 28px rgba(47,128,237,0.25);
            }
            .saveEntryBtn:hover:not(:disabled) { box-shadow: 0 0 36px rgba(47,128,237,0.4); transform: translateY(-1px); }
            .saveEntryBtn:disabled { opacity: 0.85; cursor: default; }
            .entryCount { font-size: 13px; opacity: 0.75; }
            .modalOverlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.7);
              backdrop-filter: blur(6px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 100;
              animation: fadeIn 0.2s ease;
            }
            .modalGlass {
              padding: 28px;
              background: rgba(12,14,18,0.95);
              border: 1px solid rgba(47,128,237,0.3);
              border-radius: 16px;
              box-shadow: 0 0 40px rgba(47,128,237,0.2), inset 0 0 20px rgba(255,255,255,0.02);
              min-width: 280px;
              animation: scaleIn 0.25s ease;
            }
            .modalTitle { font-size: 18px; font-weight: 600; margin: 0 0 16px; }
            .modalHint { font-size: 12px; opacity: 0.7; margin: 0 0 8px; }
            .modalInput { max-width: 100%; }
            .modalActions { display: flex; gap: 12px; margin-top: 20px; }
            .modalBtn { padding: 10px 20px; font-size: 14px; font-weight: 500; border-radius: 10px; cursor: pointer; transition: opacity 0.2s; }
            .modalBtn.secondary { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #fff; }
            .modalBtn.primary { background: linear-gradient(135deg, rgba(47,128,237,0.5), rgba(39,224,166,0.3)); border: 1px solid rgba(47,128,237,0.5); color: #fff; }
            .modalBtn.primary:hover { opacity: 0.95; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
            @media (max-width: 768px) {
              .tacticalNav { padding: 16px; }
              .tacticalTabs { gap: 14px; }
              .tacticalContainer { padding: 16px; }
              .tacticalInputGrid { grid-template-columns: 1fr; }
              .idManagementRow { flex-direction: column; align-items: stretch; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
```

## app/tactical/map/page.tsx

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import { loadReadinessEntries } from "@/lib/tacticalReadinessStorage";
import { getMapDataFromEntries, type MapPoint } from "@/lib/tacticalMapData";

function NavTab({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

const GRID_SIZE = 420;
const PADDING = 52;
const PLOT_SIZE = GRID_SIZE - PADDING * 2;

function toX(fatigue: number) {
  return PADDING + (fatigue / 100) * PLOT_SIZE;
}
function toY(readiness: number) {
  return PADDING + (1 - readiness / 100) * PLOT_SIZE;
}

type FilterType = "all" | "highRisk" | "bottomThird";
type ViewModeType = "individual" | "full";

export default function TacticalMapPage() {
  const pathname = usePathname();
  const [entries, setEntries] = useState(loadReadinessEntries());
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewModeType>("full");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(loadReadinessEntries());
  }, []);

  const allPoints = useMemo(() => getMapDataFromEntries(entries), [entries]);

  const filteredPoints = useMemo(() => {
    if (filter === "all") return allPoints;
    if (filter === "highRisk")
      return allPoints.filter((p) => p.riskLevel === "HIGH");
    if (filter === "bottomThird") {
      const sorted = [...allPoints].sort((a, b) => a.readinessScore - b.readinessScore);
      const third = Math.max(1, Math.floor(sorted.length / 3));
      return sorted.slice(0, third);
    }
    return allPoints;
  }, [allPoints, filter]);

  const idList = useMemo(
    () => allPoints.map((p) => p.id).sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10)),
    [allPoints]
  );

  const riskGlow = (p: MapPoint) => {
    if (p.readinessStatusColor === "green") return "0 0 20px rgba(39,224,166,0.6), 0 0 40px rgba(39,224,166,0.3)";
    if (p.readinessStatusColor === "amber") return "0 0 20px rgba(234,179,8,0.6), 0 0 40px rgba(234,179,8,0.3)";
    return "0 0 20px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.3)";
  };

  const riskStroke = (p: MapPoint) => {
    if (p.readinessStatusColor === "green") return "rgba(39,224,166,0.9)";
    if (p.readinessStatusColor === "amber") return "rgba(234,179,8,0.9)";
    return "rgba(239,68,68,0.9)";
  };

  const isDimmed = (id: string) =>
    viewMode === "individual" && focusId !== null && focusId !== id;

  const tooltipPoint = hoverId ? filteredPoints.find((p) => p.id === hoverId) : null;

  return (
    <RequireAuth>
      <OSLayer>
        <div className="mapOuter">
          <nav className="mapNav">
            <div className="mapBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="mapTabs">
              <NavTab href="/profile" label="Dashboard" pathname={pathname} />
              <NavTab href="/programme" label="Programme" pathname={pathname} />
              <NavTab href="/tactical" label="Tactical" pathname={pathname} />
              <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
              <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
              <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
              <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
              <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
              <NavTab href="/strategy" label="Strategy" pathname={pathname} />
              <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
              <NavTab href="/settings" label="Settings" pathname={pathname} />
            </div>
          </nav>

          <div className="mapContainer">
            <div className="mapHeader">
              <div className="mapPhase">TACTICAL</div>
              <h1 className="mapHeadline">Unit Readiness Map</h1>
              <p className="mapSub">
                Performance state of all IDs. X = Fatigue load, Y = Readiness. Identify who is optimal, fatiguing, undertrained, or at risk.
              </p>
              <Link href="/tactical" className="mapBackLink">← Back to Tactical Dashboard</Link>
            </div>

            {/* Controls */}
            <section className="mapSection">
              <h2 className="mapSectionTitle">Filter</h2>
              <div className="filterRow">
                <button
                  type="button"
                  className={`filterBtn ${filter === "all" ? "active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  All IDs
                </button>
                <button
                  type="button"
                  className={`filterBtn ${filter === "highRisk" ? "active" : ""}`}
                  onClick={() => setFilter("highRisk")}
                >
                  High Risk Only
                </button>
                <button
                  type="button"
                  className={`filterBtn ${filter === "bottomThird" ? "active" : ""}`}
                  onClick={() => setFilter("bottomThird")}
                >
                  Bottom Third
                </button>
              </div>
            </section>

            <section className="mapSection">
              <h2 className="mapSectionTitle">View Mode</h2>
              <div className="viewRow">
                <button
                  type="button"
                  className={`viewBtn ${viewMode === "individual" ? "active" : ""}`}
                  onClick={() => setViewMode("individual")}
                >
                  Individual focus
                </button>
                <button
                  type="button"
                  className={`viewBtn ${viewMode === "full" ? "active" : ""}`}
                  onClick={() => setViewMode("full")}
                >
                  Full unit
                </button>
              </div>
              {viewMode === "individual" && (
                <div className="focusSelectWrap">
                  <label className="mapLabel">Select ID</label>
                  <select
                    value={focusId ?? ""}
                    onChange={(e) => setFocusId(e.target.value || null)}
                    className="mapSelect"
                  >
                    <option value="">—</option>
                    {idList.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
              )}
            </section>

            {/* Grid */}
            <section className="mapSection gridSection">
              <h2 className="mapSectionTitle">Readiness grid</h2>
              <div className="gridWrap">
                <svg
                  className="gridSvg"
                  viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
                  width={GRID_SIZE}
                  height={GRID_SIZE}
                >
                  <defs>
                    <filter id="glowOptimal">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="rgba(39,224,166,0.25)" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glowMonitor">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="rgba(234,179,8,0.25)" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glowUndertrained">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="rgba(47,128,237,0.25)" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glowHighRisk">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="rgba(239,68,68,0.25)" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  {/* Quadrant fills */}
                  <rect x={PADDING} y={PADDING} width={PLOT_SIZE / 2} height={PLOT_SIZE / 2} fill="rgba(39,224,166,0.12)" filter="url(#glowOptimal)" />
                  <rect x={PADDING + PLOT_SIZE / 2} y={PADDING} width={PLOT_SIZE / 2} height={PLOT_SIZE / 2} fill="rgba(234,179,8,0.12)" filter="url(#glowMonitor)" />
                  <rect x={PADDING} y={PADDING + PLOT_SIZE / 2} width={PLOT_SIZE / 2} height={PLOT_SIZE / 2} fill="rgba(47,128,237,0.12)" filter="url(#glowUndertrained)" />
                  <rect x={PADDING + PLOT_SIZE / 2} y={PADDING + PLOT_SIZE / 2} width={PLOT_SIZE / 2} height={PLOT_SIZE / 2} fill="rgba(239,68,68,0.12)" filter="url(#glowHighRisk)" />
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((v) => (
                    <line key={`v${v}`} x1={toX(v)} y1={PADDING} x2={toX(v)} y2={PADDING + PLOT_SIZE} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  ))}
                  {[0, 25, 50, 75, 100].map((v) => (
                    <line key={`h${v}`} x1={PADDING} y1={toY(v)} x2={PADDING + PLOT_SIZE} y2={toY(v)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  ))}
                  {/* Axis lines */}
                  <line x1={toX(50)} y1={PADDING} x2={toX(50)} y2={PADDING + PLOT_SIZE} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                  <line x1={PADDING} y1={toY(50)} x2={PADDING + PLOT_SIZE} y2={toY(50)} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                  {/* Quadrant labels */}
                  <text x={PADDING + PLOT_SIZE / 4} y={PADDING + PLOT_SIZE / 4 - 8} textAnchor="middle" className="quadrantLabel optimal">OPTIMAL</text>
                  <text x={PADDING + (3 * PLOT_SIZE) / 4} y={PADDING + PLOT_SIZE / 4 - 8} textAnchor="middle" className="quadrantLabel monitor">MONITOR</text>
                  <text x={PADDING + PLOT_SIZE / 4} y={PADDING + (3 * PLOT_SIZE) / 4 + 8} textAnchor="middle" className="quadrantLabel undertrained">UNDERTRAINED</text>
                  <text x={PADDING + (3 * PLOT_SIZE) / 4} y={PADDING + (3 * PLOT_SIZE) / 4 + 8} textAnchor="middle" className="quadrantLabel highrisk">HIGH RISK</text>
                  {/* Axis labels */}
                  <text x={PADDING + PLOT_SIZE / 2} y={GRID_SIZE - 12} textAnchor="middle" className="axisLabel">Fatigue Load →</text>
                  <text x={12} y={PADDING + PLOT_SIZE / 2} textAnchor="middle" className="axisLabel vertical">Readiness ↑</text>
                  {/* Dots */}
                  {filteredPoints.map((p) => {
                    const x = toX(p.fatigueScore);
                    const y = toY(p.readinessScore);
                    const dimmed = isDimmed(p.id);
                    const isHover = hoverId === p.id;
                    return (
                      <g
                        key={p.id}
                        className="dotGroup"
                        style={{ opacity: dimmed ? 0.35 : 1 }}
                        onMouseEnter={() => setHoverId(p.id)}
                        onMouseLeave={() => setHoverId(null)}
                      >
                        <circle
                          cx={x}
                          cy={y}
                          r={isHover ? 14 : 11}
                          fill="rgba(0,0,0,0.4)"
                          stroke={riskStroke(p)}
                          strokeWidth={2}
                          style={{
                            filter: riskGlow(p),
                            transition: "r 0.2s ease, opacity 0.2s ease",
                            animation: "dotPulse 2.5s ease-in-out infinite",
                          }}
                        />
                        <text
                          x={x}
                          y={y + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="dotLabel"
                        >
                          {p.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {filteredPoints.length === 0 && (
                  <p className="gridEmpty">No data to display. Log entries on Daily Input.</p>
                )}
              </div>

              {/* Tooltip */}
              {tooltipPoint && (
                <div className="tooltip" style={{ position: "absolute", left: "50%", bottom: 24, transform: "translateX(-50%)" }}>
                  <div className="tooltipTitle">{tooltipPoint.id}</div>
                  <div className="tooltipRow">Readiness: {tooltipPoint.readinessScore}</div>
                  <div className="tooltipRow">Fatigue: {tooltipPoint.fatigueScore}</div>
                  <div className="tooltipRow">Risk: {tooltipPoint.riskLevel === "HIGH" ? "High" : tooltipPoint.riskLevel === "MODERATE" ? "Moderate" : "Low"}</div>
                  <div className="tooltipRow">Capacity Buffer: {tooltipPoint.capacityBuffer >= 0 ? "+" : ""}{tooltipPoint.capacityBuffer}</div>
                </div>
              )}
            </section>
          </div>

          <style jsx>{`
            .mapOuter {
              min-height: 100vh;
              background: #08090c;
              background-image:
                radial-gradient(ellipse 80% 50% at 20% 20%, rgba(47,128,237,0.12), transparent),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(39,224,166,0.06), transparent),
                linear-gradient(180deg, #08090c 0%, #0c0e12 50%, #08090c 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .mapOuter::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
              background-size: 40px 40px;
              opacity: 0.3;
              pointer-events: none;
            }
            .mapNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.06);
              position: relative;
              z-index: 2;
            }
            .mapBrand { font-size: 12px; letter-spacing: 2px; opacity: 0.7; }
            .mapTabs { display: flex; gap: 18px; flex-wrap: wrap; }
            .mapContainer { max-width: 720px; margin: 0 auto; padding: 40px; position: relative; z-index: 1; }
            .mapHeader { margin-bottom: 32px; }
            .mapPhase { font-size: 11px; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 8px; }
            .mapHeadline { font-size: 26px; font-weight: 600; margin: 0 0 10px; }
            .mapSub { font-size: 14px; opacity: 0.8; margin: 0 0 14px; line-height: 1.5; }
            .mapBackLink { font-size: 13px; color: rgba(47,128,237,0.95); text-decoration: none; }
            .mapBackLink:hover { text-decoration: underline; }
            .mapSection {
              margin-bottom: 28px;
              padding: 24px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              box-shadow: 0 0 30px rgba(47,128,237,0.06);
              backdrop-filter: blur(8px);
            }
            .mapSectionTitle { font-size: 15px; font-weight: 600; margin: 0 0 14px; letter-spacing: 0.03em; }
            .filterRow, .viewRow { display: flex; gap: 12px; flex-wrap: wrap; }
            .filterBtn, .viewBtn {
              padding: 10px 20px;
              font-size: 13px; font-weight: 500;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 10px;
              color: rgba(255,255,255,0.9);
              cursor: pointer;
              transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            .filterBtn:hover, .viewBtn:hover { background: rgba(255,255,255,0.08); }
            .filterBtn.active, .viewBtn.active {
              background: rgba(47,128,237,0.25);
              border-color: rgba(47,128,237,0.5);
              color: #fff;
              box-shadow: 0 0 18px rgba(47,128,237,0.25);
            }
            .focusSelectWrap { margin-top: 14px; }
            .mapLabel { display: block; font-size: 13px; opacity: 0.9; margin-bottom: 6px; }
            .mapSelect {
              padding: 10px 14px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(47,128,237,0.35);
              border-radius: 10px;
              color: #fff;
              font-size: 14px;
              min-width: 140px;
            }
            .gridSection { position: relative; }
            .gridWrap {
              position: relative;
              display: inline-block;
              padding: 20px;
              background: rgba(0,0,0,0.25);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 16px;
              box-shadow: 0 0 40px rgba(47,128,237,0.08), inset 0 0 30px rgba(0,0,0,0.2);
            }
            .gridSvg { display: block; }
            .quadrantLabel { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; opacity: 0.9; }
            .quadrantLabel.optimal { fill: rgba(39,224,166,0.95); }
            .quadrantLabel.monitor { fill: rgba(234,179,8,0.95); }
            .quadrantLabel.undertrained { fill: rgba(47,128,237,0.95); }
            .quadrantLabel.highrisk { fill: rgba(239,68,68,0.95); }
            .axisLabel { font-size: 11px; fill: rgba(255,255,255,0.7); }
            .axisLabel.vertical { transform: rotate(-90deg); transform-origin: center; }
            .dotLabel { font-size: 9px; font-weight: 700; fill: #fff; pointer-events: none; }
            .dotGroup { cursor: pointer; }
            .gridEmpty { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 14px; opacity: 0.75; margin: 0; }
            .tooltip {
              padding: 14px 20px;
              background: rgba(12,14,18,0.95);
              border: 1px solid rgba(47,128,237,0.4);
              border-radius: 12px;
              box-shadow: 0 0 30px rgba(47,128,237,0.2);
              min-width: 200px;
              animation: tooltipIn 0.2s ease;
            }
            .tooltipTitle { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
            .tooltipRow { font-size: 13px; opacity: 0.9; margin-bottom: 4px; }
            .tooltipRow:last-child { margin-bottom: 0; }
            @keyframes tooltipIn { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            @keyframes dotPulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.85; }
            }
            @media (max-width: 768px) {
              .mapNav { padding: 16px; }
              .mapTabs { gap: 12px; }
              .mapContainer { padding: 16px; }
              .filterRow, .viewRow { flex-direction: column; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
```

## app/tactical/page.tsx

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import { computeTrajectory, type TrajectoryResult } from "@/lib/trajectoryEngine";

/* ========== MOCK DATA ========== */

export type TacticalRecord = {
  id: number;
  displayId: string;
  readiness_score: number;
  sleep_score: number;
  injury_marker: string | null;
  operational_output: number;
  capacity_score: number;
  exposure_score: number;
  trend: "up" | "down" | "stable";
  risk_driver: string | null;
  recovery_domain: "green" | "amber" | "red";
  structural_domain: "green" | "amber" | "red";
  output_domain: "green" | "amber" | "red";
  sevenDayRisk: "HIGH" | "MODERATE" | "LOW";
};

const MOCK_DATA: TacticalRecord[] = [
  { id: 1, displayId: "ID 1", readiness_score: 82, sleep_score: 78, injury_marker: null, operational_output: 85, capacity_score: 80, exposure_score: 72, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 2, displayId: "ID 2", readiness_score: 68, sleep_score: 62, injury_marker: null, operational_output: 80, capacity_score: 72, exposure_score: 78, trend: "down", risk_driver: "Recovery Deficit", recovery_domain: "amber", structural_domain: "green", output_domain: "green", sevenDayRisk: "HIGH" },
  { id: 3, displayId: "ID 3", readiness_score: 58, sleep_score: 55, injury_marker: "knee stress", operational_output: 72, capacity_score: 65, exposure_score: 82, trend: "down", risk_driver: "Neuromuscular Fatigue", recovery_domain: "red", structural_domain: "amber", output_domain: "green", sevenDayRisk: "HIGH" },
  { id: 4, displayId: "ID 4", readiness_score: 88, sleep_score: 82, injury_marker: null, operational_output: 90, capacity_score: 72, exposure_score: 88, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 5, displayId: "ID 5", readiness_score: 71, sleep_score: 68, injury_marker: null, operational_output: 74, capacity_score: 70, exposure_score: 68, trend: "stable", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "amber", sevenDayRisk: "LOW" },
  { id: 6, displayId: "ID 6", readiness_score: 55, sleep_score: 48, injury_marker: null, operational_output: 60, capacity_score: 58, exposure_score: 75, trend: "down", risk_driver: "Recovery Deficit", recovery_domain: "red", structural_domain: "amber", output_domain: "amber", sevenDayRisk: "HIGH" },
  { id: 7, displayId: "ID 7", readiness_score: 60, sleep_score: 52, injury_marker: null, operational_output: 65, capacity_score: 68, exposure_score: 65, trend: "down", risk_driver: "Recovery Deficit", recovery_domain: "amber", structural_domain: "green", output_domain: "amber", sevenDayRisk: "MODERATE" },
  { id: 8, displayId: "ID 8", readiness_score: 79, sleep_score: 72, injury_marker: null, operational_output: 78, capacity_score: 78, exposure_score: 70, trend: "stable", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 9, displayId: "ID 9", readiness_score: 76, sleep_score: 74, injury_marker: null, operational_output: 80, capacity_score: 76, exposure_score: 72, trend: "stable", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 10, displayId: "ID 10", readiness_score: 90, sleep_score: 88, injury_marker: null, operational_output: 92, capacity_score: 88, exposure_score: 75, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 11, displayId: "ID 11", readiness_score: 74, sleep_score: 70, injury_marker: null, operational_output: 76, capacity_score: 74, exposure_score: 72, trend: "stable", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 12, displayId: "ID 12", readiness_score: 52, sleep_score: 45, injury_marker: null, operational_output: 52, capacity_score: 55, exposure_score: 80, trend: "stable", risk_driver: "Structural Risk", recovery_domain: "red", structural_domain: "amber", output_domain: "red", sevenDayRisk: "HIGH" },
  { id: 13, displayId: "ID 13", readiness_score: 81, sleep_score: 76, injury_marker: null, operational_output: 83, capacity_score: 82, exposure_score: 70, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 14, displayId: "ID 14", readiness_score: 66, sleep_score: 60, injury_marker: null, operational_output: 70, capacity_score: 68, exposure_score: 82, trend: "down", risk_driver: "Exposure Spike", recovery_domain: "amber", structural_domain: "green", output_domain: "green", sevenDayRisk: "HIGH" },
  { id: 15, displayId: "ID 15", readiness_score: 77, sleep_score: 74, injury_marker: null, operational_output: 79, capacity_score: 76, exposure_score: 72, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 16, displayId: "ID 16", readiness_score: 72, sleep_score: 65, injury_marker: null, operational_output: 73, capacity_score: 72, exposure_score: 74, trend: "stable", risk_driver: null, recovery_domain: "amber", structural_domain: "green", output_domain: "green", sevenDayRisk: "MODERATE" },
  { id: 17, displayId: "ID 17", readiness_score: 59, sleep_score: 52, injury_marker: "shoulder", operational_output: 58, capacity_score: 62, exposure_score: 70, trend: "stable", risk_driver: "Structural Risk", recovery_domain: "amber", structural_domain: "red", output_domain: "amber", sevenDayRisk: "HIGH" },
  { id: 18, displayId: "ID 18", readiness_score: 86, sleep_score: 84, injury_marker: null, operational_output: 88, capacity_score: 85, exposure_score: 72, trend: "up", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
  { id: 19, displayId: "ID 19", readiness_score: 63, sleep_score: 56, injury_marker: null, operational_output: 64, capacity_score: 66, exposure_score: 85, trend: "down", risk_driver: "Load Carriage Exposure", recovery_domain: "red", structural_domain: "amber", output_domain: "amber", sevenDayRisk: "HIGH" },
  { id: 20, displayId: "ID 20", readiness_score: 78, sleep_score: 75, injury_marker: null, operational_output: 80, capacity_score: 78, exposure_score: 68, trend: "stable", risk_driver: null, recovery_domain: "green", structural_domain: "green", output_domain: "green", sevenDayRisk: "LOW" },
];

function getReadinessBand(score: number): "green" | "amber" | "red" {
  if (score >= 70) return "green";
  if (score >= 50) return "amber";
  return "red";
}

function NavTab({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

const TREND_UP = "↑";
const TREND_DOWN = "↓";
const TREND_STABLE = "→";
function trendLabel(t: "up" | "down" | "stable") {
  return t === "up" ? TREND_UP + " Improving" : t === "down" ? TREND_DOWN + " Declining" : TREND_STABLE + " Stable";
}
function trendArrow(t: "up" | "down" | "stable") {
  return t === "up" ? TREND_UP : t === "down" ? TREND_DOWN : TREND_STABLE;
}

const DECLINE_PREDICTORS = [
  { id: "sleep", label: "Sleep Deficit Trend", trend: "down" as const, risk: "Moderate" },
  { id: "cmj", label: "Neuromuscular Fatigue (CMJ)", trend: "down" as const, risk: "High" },
  { id: "exposure", label: "Exposure Spike", trend: "up" as const, risk: "Moderate" },
  { id: "structural", label: "Structural Stress Marker", trend: "stable" as const, risk: "Low" },
  { id: "output", label: "Operational Output Decline", trend: "down" as const, risk: "Moderate" },
];

function domainToScore(d: "green" | "amber" | "red"): number {
  return d === "green" ? 80 : d === "amber" ? 65 : 50;
}

function syntheticReadinessHistory(score: number, trend: "up" | "down" | "stable"): number[] {
  const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));
  if (trend === "down") return [clamp(score + 6), clamp(score + 4), clamp(score + 2), clamp(score + 1), score, clamp(score - 1), clamp(score - 2)];
  if (trend === "up") return [clamp(score - 2), clamp(score - 1), score, clamp(score + 1), clamp(score + 2), clamp(score + 4), clamp(score + 6)];
  return [score, score, score, score, score, score, score];
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="sparklineEmpty">—</span>;
  const w = 80;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 4) + 2;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="sparklineSvg" viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <polyline points={pts} fill="none" stroke="rgba(47,128,237,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 4px rgba(47,128,237,0.6))" }} />
    </svg>
  );
}

export default function TacticalPage() {
  const pathname = usePathname();
  const [trendScale, setTrendScale] = useState<"daily" | "weekly" | "monthly">("weekly");
  const total = MOCK_DATA.length;

  const { green, amber, red, greenTrend, amberTrend, redTrend } = useMemo(() => {
    const bands = MOCK_DATA.map((o) => ({ band: getReadinessBand(o.readiness_score), trend: o.trend }));
    const g = bands.filter((b) => b.band === "green");
    const a = bands.filter((b) => b.band === "amber");
    const r = bands.filter((b) => b.band === "red");
    const trend = (list: typeof bands) => {
      const u = list.filter((b) => b.trend === "up").length;
      const d = list.filter((b) => b.trend === "down").length;
      return u > d ? "up" : d > u ? "down" : "stable";
    };
    return {
      green: g.length,
      amber: a.length,
      red: r.length,
      greenTrend: trend(g),
      amberTrend: trend(a),
      redTrend: trend(r),
    };
  }, []);

  const greenPct = total ? Math.round((green / total) * 100) : 0;
  const amberPct = total ? Math.round((amber / total) * 100) : 0;
  const redPct = total ? Math.round((red / total) * 100) : 0;

  const bottomThirdCount = Math.max(1, Math.floor(total * 0.3));
  const sortedByReadiness = useMemo(() => [...MOCK_DATA].sort((a, b) => a.readiness_score - b.readiness_score), []);
  const bottomThird = useMemo(() => sortedByReadiness.slice(0, bottomThirdCount), [sortedByReadiness, bottomThirdCount]);
  const topPerformers = useMemo(() => sortedByReadiness.slice(-Math.max(1, Math.floor(total * 0.2))).reverse(), [sortedByReadiness, total]);

  const unitAvgReadiness = useMemo(() => Math.round(MOCK_DATA.reduce((s, o) => s + o.readiness_score, 0) / total), [total]);
  const bottomThirdAvg = useMemo(() => (bottomThird.length ? Math.round(bottomThird.reduce((s, o) => s + o.readiness_score, 0) / bottomThird.length) : 0), [bottomThird]);
  const topAvg = useMemo(() => (topPerformers.length ? Math.round(topPerformers.reduce((s, o) => s + o.readiness_score, 0) / topPerformers.length) : 0), [topPerformers]);

  const trendData = useMemo(() => {
    const points = trendScale === "daily" ? 14 : trendScale === "weekly" ? 12 : 6;
    return Array.from({ length: points }, (_, i) => {
      const t = i / Math.max(1, points - 1);
      return {
        label: trendScale === "daily" ? `D${i + 1}` : trendScale === "weekly" ? `W${i + 1}` : `M${i + 1}`,
        unit: Math.min(98, Math.max(20, unitAvgReadiness + (t - 0.5) * 4 + (i % 2 === 0 ? 1 : -1))),
        bottom: Math.min(95, Math.max(15, bottomThirdAvg + (t - 0.5) * 6)),
        top: Math.min(98, Math.max(60, topAvg + (t - 0.5) * 2)),
      };
    });
  }, [trendScale, unitAvgReadiness, bottomThirdAvg, topAvg]);

  const pillarRecovery = useMemo(() => Math.round(MOCK_DATA.reduce((s, o) => s + o.sleep_score, 0) / total), [total]);
  const pillarStructural = useMemo(() => {
    const scores = MOCK_DATA.map((o) => (o.injury_marker ? 40 : o.readiness_score));
    return Math.round(scores.reduce((a, b) => a + b, 0) / total);
  }, [total]);
  const pillarOperational = useMemo(() => Math.round(MOCK_DATA.reduce((s, o) => s + o.operational_output, 0) / total), [total]);

  const opMetrics = useMemo(
    () => [
      { label: "Load Carriage Pace", value: "5:10/km", trend: "down" as const, impact: "Moderate" },
      { label: "Strength Capacity", value: "92%", trend: "stable" as const, impact: "Low" },
      { label: "Aerobic Endurance", value: "78%", trend: "up" as const, impact: "Low" },
      { label: "Movement Durability", value: "71%", trend: "stable" as const, impact: "Moderate" },
    ],
    []
  );

  const primaryConstraint = "Recovery Deficit";
  const secondaryConstraint = "Neuromuscular Fatigue";
  const emergingRisk = "Exposure Overload";

  const trajectoryRows = useMemo((): (TrajectoryResult & { currentReadiness: number; readinessHistory: number[] })[] => {
    return MOCK_DATA.map((o) => {
      const history = syntheticReadinessHistory(o.readiness_score, o.trend);
      const capacityBuffer = o.capacity_score - o.exposure_score;
      const result = computeTrajectory({
        id: o.displayId,
        readinessHistory: history,
        exposureScore: o.exposure_score,
        recoveryScore: domainToScore(o.recovery_domain),
        structuralScore: domainToScore(o.structural_domain),
        capacityBuffer,
      });
      return { ...result, currentReadiness: o.readiness_score, readinessHistory: history };
    });
  }, []);

  function domainGlow(d: "green" | "amber" | "red") {
    return d === "green"
      ? "0 0 12px rgba(39,224,166,0.5), 0 0 24px rgba(39,224,166,0.2)"
      : d === "amber"
        ? "0 0 12px rgba(234,179,8,0.5), 0 0 24px rgba(234,179,8,0.2)"
        : "0 0 12px rgba(239,68,68,0.5), 0 0 24px rgba(239,68,68,0.2)";
  }
  function domainBg(d: "green" | "amber" | "red") {
    return d === "green" ? "rgba(39,224,166,0.35)" : d === "amber" ? "rgba(234,179,8,0.35)" : "rgba(239,68,68,0.35)";
  }

  const chartHeight = 180;
  const maxVal = 100;
  const minVal = 0;

  return (
    <RequireAuth>
      <OSLayer>
        <div className="tacticalOuter">
          <nav className="tacticalNav">
            <div className="tacticalBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="tacticalTabs">
              <NavTab href="/profile" label="Dashboard" pathname={pathname} />
              <NavTab href="/programme" label="Programme" pathname={pathname} />
              <NavTab href="/tactical" label="Tactical" pathname={pathname} />
              <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
              <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
              <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
              <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
              <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
              <NavTab href="/strategy" label="Strategy" pathname={pathname} />
              <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
              <NavTab href="/settings" label="Settings" pathname={pathname} />
            </div>
          </nav>

          <div className="tacticalContainer">
            <div className="tacticalHeader">
              <div className="tacticalPhase">TACTICAL</div>
              <h1 className="tacticalHeadline">Tactical Human Performance Intelligence</h1>
              <p className="tacticalSub">Unit readiness, risk, and performance trends. Command centre for human performance.</p>
              <Link href="/tactical/input" className="tacticalBackLink">Daily readiness input →</Link>
            </div>

            {/* SECTION 1 — Unit Readiness Overview (glowing tiles) */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Unit Readiness Overview</h2>
              <div className="tacticalTiles">
                <div className="tacticalTile tacticalTileGreen">
                  <div className="tacticalTileLabel">READY</div>
                  <div className="tacticalTileCount">{green} IDs</div>
                  <div className="tacticalTilePct">{greenPct}%</div>
                  <div className="tacticalTileTrend">{trendLabel(greenTrend)}</div>
                </div>
                <div className="tacticalTile tacticalTileAmber">
                  <div className="tacticalTileLabel">MANAGE</div>
                  <div className="tacticalTileCount">{amber} IDs</div>
                  <div className="tacticalTilePct">{amberPct}%</div>
                  <div className="tacticalTileTrend">{trendLabel(amberTrend)}</div>
                </div>
                <div className="tacticalTile tacticalTileRed">
                  <div className="tacticalTileLabel">RISK</div>
                  <div className="tacticalTileCount">{red} IDs</div>
                  <div className="tacticalTilePct">{redPct}%</div>
                  <div className="tacticalTileTrend">{trendLabel(redTrend)}</div>
                </div>
              </div>
            </section>

            {/* SECTION 2 — Performance Risk Group */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Performance Risk Group</h2>
              <p className="tacticalSectionSub">Bottom ~30% — intervention priority.</p>
              <div className="tacticalTableWrap neonTable">
                <table className="tacticalTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Readiness Score</th>
                      <th>Primary Risk Driver</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bottomThird.map((o) => (
                      <tr key={o.id}>
                        <td>{o.displayId}</td>
                        <td>{o.readiness_score}</td>
                        <td>{o.risk_driver ?? "—"}</td>
                        <td><span className="trendIndicator">{trendArrow(o.trend)}</span> {trendLabel(o.trend).replace(/^[↑↓→]\s*/, "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 3 — Readiness State Map (neon bars) */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Readiness State Map</h2>
              <div className="tacticalPillars">
                <div className="tacticalPillarRow">
                  <span className="tacticalPillarName">Recovery (Sleep)</span>
                  <div className="tacticalPillarBarWrap">
                    <div
                      className="tacticalPillarBar tacticalPillarBarFill neonBar"
                      style={{
                        width: `${pillarRecovery}%`,
                        background: pillarRecovery >= 70 ? "linear-gradient(90deg, rgba(39,224,166,0.9), rgba(39,224,166,0.5))" : pillarRecovery >= 50 ? "linear-gradient(90deg, rgba(234,179,8,0.9), rgba(234,179,8,0.5))" : "linear-gradient(90deg, rgba(239,68,68,0.9), rgba(239,68,68,0.5))",
                        boxShadow: pillarRecovery >= 70 ? "0 0 20px rgba(39,224,166,0.6)" : pillarRecovery >= 50 ? "0 0 20px rgba(234,179,8,0.5)" : "0 0 20px rgba(239,68,68,0.5)",
                      }}
                    />
                  </div>
                  <span className="tacticalPillarVal">{pillarRecovery}%</span>
                </div>
                <div className="tacticalPillarRow">
                  <span className="tacticalPillarName">Structural Integrity</span>
                  <div className="tacticalPillarBarWrap">
                    <div
                      className="tacticalPillarBar tacticalPillarBarFill neonBar"
                      style={{
                        width: `${pillarStructural}%`,
                        background: pillarStructural >= 70 ? "linear-gradient(90deg, rgba(39,224,166,0.9), rgba(39,224,166,0.5))" : pillarStructural >= 50 ? "linear-gradient(90deg, rgba(234,179,8,0.9), rgba(234,179,8,0.5))" : "linear-gradient(90deg, rgba(239,68,68,0.9), rgba(239,68,68,0.5))",
                        boxShadow: pillarStructural >= 70 ? "0 0 20px rgba(39,224,166,0.6)" : pillarStructural >= 50 ? "0 0 20px rgba(234,179,8,0.5)" : "0 0 20px rgba(239,68,68,0.5)",
                      }}
                    />
                  </div>
                  <span className="tacticalPillarVal">{pillarStructural}%</span>
                </div>
                <div className="tacticalPillarRow">
                  <span className="tacticalPillarName">Operational Performance</span>
                  <div className="tacticalPillarBarWrap">
                    <div
                      className="tacticalPillarBar tacticalPillarBarFill neonBar"
                      style={{
                        width: `${pillarOperational}%`,
                        background: pillarOperational >= 70 ? "linear-gradient(90deg, rgba(39,224,166,0.9), rgba(39,224,166,0.5))" : pillarOperational >= 50 ? "linear-gradient(90deg, rgba(234,179,8,0.9), rgba(234,179,8,0.5))" : "linear-gradient(90deg, rgba(239,68,68,0.9), rgba(239,68,68,0.5))",
                        boxShadow: pillarOperational >= 70 ? "0 0 20px rgba(39,224,166,0.6)" : pillarOperational >= 50 ? "0 0 20px rgba(234,179,8,0.5)" : "0 0 20px rgba(239,68,68,0.5)",
                      }}
                    />
                  </div>
                  <span className="tacticalPillarVal">{pillarOperational}%</span>
                </div>
              </div>
            </section>

            {/* SECTION 4 — Readiness Trends (neon line graph) */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Readiness Trends</h2>
              <div className="tacticalTrendControls">
                {(["daily", "weekly", "monthly"] as const).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    className={`tacticalTrendBtn ${trendScale === scale ? "active" : ""}`}
                    onClick={() => setTrendScale(scale)}
                  >
                    {scale.charAt(0).toUpperCase() + scale.slice(1)}
                  </button>
                ))}
              </div>
              <div className="tacticalChartWrap neonChartWrap">
                <div className="tacticalLineChart" style={{ height: chartHeight }}>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ overflow: "visible", display: "block" }}>
                    {(() => {
                      const n = trendData.length;
                      const step = n > 1 ? 100 / (n - 1) : 100;
                      const toY = (v: number) => 100 - (v - minVal) / (maxVal - minVal || 1) * 100;
                      const unitPath = trendData.map((d, i) => `${i === 0 ? "M" : "L"} ${i * step} ${toY(d.unit)}`).join(" ");
                      const bottomPath = trendData.map((d, i) => `${i === 0 ? "M" : "L"} ${i * step} ${toY(d.bottom)}`).join(" ");
                      const topPath = trendData.map((d, i) => `${i === 0 ? "M" : "L"} ${i * step} ${toY(d.top)}`).join(" ");
                      return (
                        <g>
                          <path d={unitPath} fill="none" stroke="rgba(47,128,237,0.9)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" className="neonLine" style={{ filter: "drop-shadow(0 0 4px rgba(47,128,237,0.8))" }} />
                          <path d={bottomPath} fill="none" stroke="rgba(234,179,8,0.9)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" className="neonLine" style={{ filter: "drop-shadow(0 0 4px rgba(234,179,8,0.6))" }} />
                          <path d={topPath} fill="none" stroke="rgba(39,224,166,0.9)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" className="neonLine" style={{ filter: "drop-shadow(0 0 4px rgba(39,224,166,0.8))" }} />
                        </g>
                      );
                    })()}
                  </svg>
                </div>
                <div className="tacticalChartLabels">
                  {trendData.map((d) => (
                    <span key={d.label} className="tacticalChartLabel">{d.label}</span>
                  ))}
                </div>
                <div className="tacticalChartLegend">
                  <span><i className="legendUnit" /> Unit avg</span>
                  <span><i className="legendBottom" /> Bottom third</span>
                  <span><i className="legendTop" /> Top performers</span>
                </div>
              </div>
            </section>

            {/* SECTION 5 — Readiness Forecast */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Readiness Forecast</h2>
              <p className="tacticalSectionSub">Predicted risk based on trends.</p>
              <div className="tacticalTableWrap neonTable">
                <table className="tacticalTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Current Status</th>
                      <th>Trend</th>
                      <th>7 Day Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_DATA.slice(0, 10).map((o) => (
                      <tr key={o.id}>
                        <td>{o.displayId}</td>
                        <td><span className={`statusPill status${getReadinessBand(o.readiness_score).toUpperCase()}`}>{getReadinessBand(o.readiness_score).toUpperCase()}</span></td>
                        <td><span className="trendIndicator">{trendArrow(o.trend)}</span></td>
                        <td><span className={`riskPill risk${o.sevenDayRisk}`}>{o.sevenDayRisk}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 6 — Exposure vs Capacity */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Exposure vs Capacity Monitor</h2>
              <div className="tacticalTableWrap neonTable">
                <table className="tacticalTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Capacity</th>
                      <th>Exposure</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_DATA.map((o) => (
                      <tr key={o.id}>
                        <td>{o.displayId}</td>
                        <td>
                          <div className="capacityBarWrap">
                            <div className="capacityBar" style={{ width: `${o.capacity_score}%`, background: "linear-gradient(90deg, rgba(47,128,237,0.7), rgba(39,224,166,0.5))", boxShadow: "0 0 10px rgba(47,128,237,0.4)" }} />
                          </div>
                          <span className="capacityVal">{o.capacity_score}</span>
                        </td>
                        <td>
                          <div className="capacityBarWrap">
                            <div className="capacityBar" style={{ width: `${o.exposure_score}%`, background: o.exposure_score > o.capacity_score ? "linear-gradient(90deg, rgba(239,68,68,0.7), rgba(239,68,68,0.4))" : "linear-gradient(90deg, rgba(234,179,8,0.6), rgba(234,179,8,0.3))", boxShadow: o.exposure_score > o.capacity_score ? "0 0 10px rgba(239,68,68,0.5)" : "0 0 8px rgba(234,179,8,0.3)" }} />
                          </div>
                          <span className="capacityVal">{o.exposure_score}</span>
                        </td>
                        <td>
                          <span className={o.exposure_score > o.capacity_score ? "statusOverload" : "statusBalanced"}>
                            {o.exposure_score > o.capacity_score ? "OVERLOAD" : "BALANCED"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 7 — Operational Performance Monitor */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Operational Performance Monitor</h2>
              <div className="tacticalOpGrid">
                {opMetrics.map((m) => (
                  <div key={m.label} className="tacticalOpCard neonCard">
                    <div className="tacticalOpLabel">{m.label}</div>
                    <div className="tacticalOpValue">{m.value}</div>
                    <div className="tacticalOpTrend">{trendLabel(m.trend)}</div>
                    <div className="tacticalOpImpact">Impact: {m.impact}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 7b — Performance Trajectory */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Performance Trajectory</h2>
              <p className="tacticalSectionSub">Short-term readiness projection. Who is declining, improving, or approaching failure.</p>
              <div className="tacticalTableWrap neonTable">
                <table className="tacticalTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Current Readiness</th>
                      <th>Trend</th>
                      <th>Readiness history</th>
                      <th>Projected Readiness</th>
                      <th>Forecast Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trajectoryRows.map((row) => (
                      <tr key={row.id} className={row.forecastStatus === "HIGH RISK" ? "trajectoryRowHighRisk" : ""}>
                        <td>{row.id}</td>
                        <td>{row.currentReadiness}</td>
                        <td>
                          {row.trend === "improving" ? "↑ improving" : row.trend === "declining" ? "↓ declining" : "→ stable"}
                        </td>
                        <td>
                          <Sparkline values={row.readinessHistory} />
                        </td>
                        <td>{row.projectedReadiness}</td>
                        <td>
                          <span className={`trajectoryForecast trajectoryForecast${row.forecastStatus === "READY" ? "Ready" : row.forecastStatus === "MANAGE" ? "Manage" : "HighRisk"}`}>
                            {row.forecastStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 8 — Risk Heatmap */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Readiness Risk Heatmap</h2>
              <p className="tacticalSectionSub">Recovery · Structural Integrity · Operational Output</p>
              <div className="tacticalTableWrap neonTable tacticalHeatmapWrap">
                <table className="tacticalTable tacticalHeatmap">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Recovery</th>
                      <th>Structural</th>
                      <th>Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_DATA.map((o) => (
                      <tr key={o.id}>
                        <td>{o.displayId}</td>
                        <td><span className="heatmapCell" style={{ background: domainBg(o.recovery_domain), boxShadow: domainGlow(o.recovery_domain) }} /></td>
                        <td><span className="heatmapCell" style={{ background: domainBg(o.structural_domain), boxShadow: domainGlow(o.structural_domain) }} /></td>
                        <td><span className="heatmapCell" style={{ background: domainBg(o.output_domain), boxShadow: domainGlow(o.output_domain) }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 9 — Performance Decline Predictors */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Performance Decline Predictors</h2>
              <div className="tacticalPredictorsGrid">
                {DECLINE_PREDICTORS.map((p) => (
                  <div key={p.id} className="tacticalPredictorCard neonCard">
                    <div className="tacticalPredictorLabel">{p.label}</div>
                    <div className="tacticalPredictorTrend">Trend: <span className="trendIndicator">{trendArrow(p.trend)}</span></div>
                    <div className="tacticalPredictorRisk">Risk: {p.risk}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 10 — System Constraint Detector */}
            <section className="tacticalSection">
              <h2 className="tacticalSectionTitle">Primary System Constraints</h2>
              <div className="tacticalConstraints">
                <div className="tacticalConstraintCard primary neonCard">
                  <div className="tacticalConstraintLabel">Primary Constraint</div>
                  <div className="tacticalConstraintValue">{primaryConstraint}</div>
                </div>
                <div className="tacticalConstraintCard neonCard">
                  <div className="tacticalConstraintLabel">Secondary Constraint</div>
                  <div className="tacticalConstraintValue">{secondaryConstraint}</div>
                </div>
                <div className="tacticalConstraintCard emerging neonCard">
                  <div className="tacticalConstraintLabel">Emerging Risk</div>
                  <div className="tacticalConstraintValue">{emergingRisk}</div>
                </div>
              </div>
            </section>
          </div>

          <style jsx>{`
            .tacticalOuter {
              min-height: 100vh;
              background: #08090c;
              background-image:
                radial-gradient(ellipse 80% 50% at 20% 20%, rgba(47,128,237,0.15), transparent),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(39,224,166,0.08), transparent),
                linear-gradient(180deg, #08090c 0%, #0c0e12 50%, #08090c 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .tacticalOuter::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
              background-size: 40px 40px;
              opacity: 0.35;
              pointer-events: none;
            }
            .tacticalNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.06);
              position: relative;
              z-index: 1;
            }
            .tacticalBrand { font-size: 12px; letter-spacing: 2px; opacity: 0.7; }
            .tacticalTabs { display: flex; gap: 30px; }
            .tacticalContainer { max-width: 1200px; margin: 0 auto; padding: 40px; position: relative; z-index: 1; }
            .tacticalHeader { margin-bottom: 48px; }
            .tacticalPhase { font-size: 11px; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 8px; }
            .tacticalHeadline { font-size: 28px; font-weight: 600; margin: 0 0 12px; }
            .tacticalSub { font-size: 15px; opacity: 0.8; margin: 0; line-height: 1.5; }
            .tacticalBackLink { display: inline-block; font-size: 13px; color: rgba(47,128,237,0.95); text-decoration: none; margin-top: 12px; }
            .tacticalBackLink:hover { text-decoration: underline; }
            .tacticalSection { margin-bottom: 48px; }
            .tacticalSectionTitle {
              font-size: 16px;
              font-weight: 600;
              margin: 0 0 8px;
              letter-spacing: 0.03em;
            }
            .tacticalSectionSub { font-size: 13px; opacity: 0.7; margin: 0 0 16px; }
            .tacticalTiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .tacticalTile {
              padding: 24px;
              border-radius: 14px;
              border: 1px solid rgba(255,255,255,0.1);
              background: rgba(255,255,255,0.03);
              transition: box-shadow 0.3s ease, transform 0.2s ease;
            }
            .tacticalTile:hover { transform: translateY(-2px); }
            .tacticalTileGreen {
              border-color: rgba(39,224,166,0.4);
              background: rgba(39,224,166,0.06);
              box-shadow: 0 0 30px rgba(39,224,166,0.2), inset 0 0 20px rgba(39,224,166,0.05);
            }
            .tacticalTileGreen:hover { box-shadow: 0 0 40px rgba(39,224,166,0.35), inset 0 0 20px rgba(39,224,166,0.08); }
            .tacticalTileAmber {
              border-color: rgba(234,179,8,0.4);
              background: rgba(234,179,8,0.06);
              box-shadow: 0 0 30px rgba(234,179,8,0.15), inset 0 0 20px rgba(234,179,8,0.04);
            }
            .tacticalTileAmber:hover { box-shadow: 0 0 40px rgba(234,179,8,0.25), inset 0 0 20px rgba(234,179,8,0.06); }
            .tacticalTileRed {
              border-color: rgba(239,68,68,0.4);
              background: rgba(239,68,68,0.06);
              box-shadow: 0 0 30px rgba(239,68,68,0.2), inset 0 0 20px rgba(239,68,68,0.05);
            }
            .tacticalTileRed:hover { box-shadow: 0 0 40px rgba(239,68,68,0.35), inset 0 0 20px rgba(239,68,68,0.08); }
            .tacticalTileLabel { font-size: 11px; letter-spacing: 0.1em; opacity: 0.95; margin-bottom: 12px; font-weight: 600; }
            .tacticalTileCount { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
            .tacticalTilePct { font-size: 15px; opacity: 0.9; margin-bottom: 8px; }
            .tacticalTileTrend { font-size: 13px; opacity: 0.85; }
            .neonTable {
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 12px;
              background: rgba(255,255,255,0.02);
              box-shadow: 0 0 20px rgba(47,128,237,0.08);
            }
            .tacticalTableWrap { overflow-x: auto; border-radius: 12px; }
            .tacticalTable { width: 100%; border-collapse: collapse; font-size: 13px; }
            .tacticalTable th, .tacticalTable td { padding: 12px 16px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
            .tacticalTable th { font-size: 11px; letter-spacing: 0.06em; opacity: 0.85; }
            .tacticalTable tbody tr:last-child td { border-bottom: none; }
            .tacticalTable tbody tr:hover { background: rgba(255,255,255,0.03); }
            .trendIndicator { font-weight: 700; opacity: 1; }
            .statusPill, .riskPill { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; }
            .statusGREEN { background: rgba(39,224,166,0.25); color: #6ee7b7; box-shadow: 0 0 12px rgba(39,224,166,0.3); }
            .statusAMBER { background: rgba(234,179,8,0.25); color: #fcd34d; box-shadow: 0 0 12px rgba(234,179,8,0.3); }
            .statusRED { background: rgba(239,68,68,0.25); color: #fca5a5; box-shadow: 0 0 12px rgba(239,68,68,0.3); }
            .riskHIGH { background: rgba(239,68,68,0.3); color: #fca5a5; }
            .riskMODERATE { background: rgba(234,179,8,0.25); color: #fcd34d; }
            .riskLOW { background: rgba(39,224,166,0.2); color: #6ee7b7; }
            .statusOverload { color: #f87171; font-weight: 600; text-shadow: 0 0 10px rgba(239,68,68,0.5); }
            .statusBalanced { color: #6ee7b7; font-weight: 600; }
            .capacityBarWrap { height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; margin-bottom: 4px; max-width: 120px; }
            .capacityBar { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
            .capacityVal { font-size: 12px; opacity: 0.9; }
            .tacticalPillars { display: flex; flex-direction: column; gap: 18px; }
            .tacticalPillarRow { display: grid; grid-template-columns: 200px 1fr 52px; gap: 16px; align-items: center; }
            .tacticalPillarName { font-size: 13px; opacity: 0.9; }
            .tacticalPillarBarWrap {
              height: 28px;
              background: rgba(0,0,0,0.3);
              border-radius: 8px;
              overflow: hidden;
              border: 1px solid rgba(255,255,255,0.06);
            }
            .tacticalPillarBar { height: 100%; border-radius: 8px; transition: width 0.4s ease; }
            .tacticalPillarBarFill { min-width: 4px; }
            .neonBar { transition: box-shadow 0.3s ease; }
            .tacticalPillarVal { font-size: 13px; font-weight: 600; opacity: 0.95; }
            .tacticalTrendControls { display: flex; gap: 8px; margin-bottom: 16px; }
            .tacticalTrendBtn {
              padding: 8px 18px;
              font-size: 12px;
              font-weight: 500;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 8px;
              color: inherit;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            .tacticalTrendBtn:hover { border-color: rgba(47,128,237,0.4); background: rgba(47,128,237,0.1); }
            .tacticalTrendBtn.active {
              background: rgba(47,128,237,0.2);
              border-color: rgba(47,128,237,0.6);
              box-shadow: 0 0 20px rgba(47,128,237,0.3);
            }
            .neonChartWrap {
              padding: 24px;
              background: rgba(0,0,0,0.2);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              box-shadow: 0 0 30px rgba(47,128,237,0.1), inset 0 0 30px rgba(0,0,0,0.2);
            }
            .tacticalLineChart { width: 100%; margin-bottom: 8px; }
            .tacticalLineChart svg { display: block; }
            .neonLine { stroke-linecap: round; stroke-linejoin: round; }
            .tacticalChartLabels { display: flex; justify-content: space-between; padding: 0 2%; font-size: 10px; opacity: 0.7; }
            .tacticalChartLabel { flex: 1; text-align: center; min-width: 0; }
            .tacticalChartLegend { display: flex; flex-wrap: wrap; gap: 20px; font-size: 11px; opacity: 0.9; margin-top: 14px; }
            .tacticalChartLegend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 8px; vertical-align: middle; }
            .legendUnit { background: rgba(47,128,237,0.8); box-shadow: 0 0 10px rgba(47,128,237,0.6); }
            .legendBottom { background: rgba(234,179,8,0.8); box-shadow: 0 0 10px rgba(234,179,8,0.5); }
            .legendTop { background: rgba(39,224,166,0.8); box-shadow: 0 0 10px rgba(39,224,166,0.6); }
            .tacticalOpGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
            .tacticalOpCard, .neonCard {
              padding: 18px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 12px;
              box-shadow: 0 0 20px rgba(47,128,237,0.06);
              transition: box-shadow 0.3s ease, border-color 0.2s ease;
            }
            .tacticalOpCard:hover, .neonCard:hover { border-color: rgba(47,128,237,0.25); box-shadow: 0 0 28px rgba(47,128,237,0.15); }
            .tacticalOpLabel { font-size: 11px; letter-spacing: 0.05em; opacity: 0.8; margin-bottom: 6px; }
            .tacticalOpValue { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
            .tacticalOpTrend { font-size: 12px; opacity: 0.85; margin-bottom: 4px; }
            .tacticalOpImpact { font-size: 11px; opacity: 0.7; }
            .heatmapCell {
              display: inline-block;
              width: 20px;
              height: 20px;
              border-radius: 6px;
            }
            .tacticalHeatmapWrap .tacticalTable td { padding: 10px 16px; }
            .tacticalPredictorsGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
            .tacticalPredictorCard { padding: 16px; }
            .tacticalPredictorLabel { font-size: 12px; font-weight: 600; margin-bottom: 8px; opacity: 0.95; }
            .tacticalPredictorTrend, .tacticalPredictorRisk { font-size: 11px; opacity: 0.85; margin-top: 4px; }
            .tacticalConstraints { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .tacticalConstraintCard { padding: 20px; }
            .tacticalConstraintCard.primary { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.06); box-shadow: 0 0 25px rgba(239,68,68,0.15); }
            .tacticalConstraintCard.emerging { border-color: rgba(234,179,8,0.4); background: rgba(234,179,8,0.06); box-shadow: 0 0 25px rgba(234,179,8,0.12); }
            .tacticalConstraintLabel { font-size: 10px; letter-spacing: 0.08em; opacity: 0.75; margin-bottom: 8px; }
            .tacticalConstraintValue { font-size: 15px; font-weight: 600; }
            .trajectoryRowHighRisk {
              background: rgba(239,68,68,0.08);
              box-shadow: inset 0 0 20px rgba(239,68,68,0.15);
              border-left: 3px solid rgba(239,68,68,0.6);
            }
            .trajectoryForecast { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; }
            .trajectoryForecastReady { background: rgba(39,224,166,0.25); color: #6ee7b7; box-shadow: 0 0 12px rgba(39,224,166,0.3); }
            .trajectoryForecastManage { background: rgba(234,179,8,0.25); color: #fcd34d; box-shadow: 0 0 12px rgba(234,179,8,0.3); }
            .trajectoryForecastHighRisk { background: rgba(239,68,68,0.25); color: #fca5a5; box-shadow: 0 0 12px rgba(239,68,68,0.3); }
            .sparklineSvg { display: inline-block; vertical-align: middle; }
            .sparklineEmpty { font-size: 12px; opacity: 0.6; }
            @media (max-width: 768px) {
              .tacticalNav { padding: 16px; flex-wrap: wrap; gap: 12px; }
              .tacticalTabs { gap: 16px; flex-wrap: wrap; }
              .tacticalContainer { padding: 16px; }
              .tacticalTiles { grid-template-columns: 1fr; }
              .tacticalPillarRow { grid-template-columns: 1fr 1fr auto; }
              .tacticalConstraints, .tacticalPredictorsGrid { grid-template-columns: 1fr; }
              .tacticalOpGrid { grid-template-columns: 1fr; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
```

## app/tactical/radar/page.tsx

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import {
  loadReadinessEntries,
  getStoredIdList,
  getPillarScoresFromEntry,
  type ReadinessEntry,
  type PillarScores,
} from "@/lib/tacticalReadinessStorage";

const PILLAR_LABELS: (keyof PillarScores)[] = [
  "recovery",
  "structuralIntegrity",
  "strengthCapacity",
  "aerobicCapacity",
  "movementDurability",
];

const AXIS_LABELS: Record<keyof PillarScores, string> = {
  recovery: "Recovery",
  structuralIntegrity: "Structural Integrity",
  strengthCapacity: "Strength Capacity",
  aerobicCapacity: "Aerobic Capacity",
  movementDurability: "Movement Durability",
};

function NavTab({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

/** Latest entry per ID (by date). */
function getLatestById(entries: ReadinessEntry[]): Map<string, ReadinessEntry> {
  const byId = new Map<string, ReadinessEntry>();
  entries.forEach((e) => {
    const existing = byId.get(e.id);
    if (!existing || e.date > existing.date) byId.set(e.id, e);
  });
  return byId;
}

function scoreColor(score: number): string {
  if (score >= 70) return "green";
  if (score >= 50) return "amber";
  return "red";
}

export default function TacticalRadarPage() {
  const pathname = usePathname();
  const [entries, setEntries] = useState<ReadinessEntry[]>([]);
  const [viewMode, setViewMode] = useState<"Individual" | "Unit">("Individual");
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    setEntries(loadReadinessEntries());
  }, []);

  const idList = useMemo(() => {
    const fromStorage = getStoredIdList(entries);
    return fromStorage.length > 0 ? fromStorage : ["ID 1", "ID 2", "ID 3", "ID 4", "ID 5"];
  }, [entries]);

  useEffect(() => {
    if (idList.length > 0 && !idList.includes(selectedId)) setSelectedId(idList[0]);
    else if (!selectedId && idList.length > 0) setSelectedId(idList[0]);
  }, [idList, selectedId]);

  const latestById = useMemo(() => getLatestById(entries), [entries]);

  const pillarScores = useMemo((): PillarScores | null => {
    if (viewMode === "Individual" && selectedId) {
      const entry = latestById.get(selectedId);
      if (!entry) return null;
      return getPillarScoresFromEntry(entry);
    }
    if (viewMode === "Unit") {
      const ids = Array.from(latestById.keys());
      if (ids.length === 0) return null;
      const sums: PillarScores = {
        recovery: 0,
        structuralIntegrity: 0,
        strengthCapacity: 0,
        aerobicCapacity: 0,
        movementDurability: 0,
      };
      ids.forEach((id) => {
        const p = getPillarScoresFromEntry(latestById.get(id)!);
        (Object.keys(sums) as (keyof PillarScores)[]).forEach((k) => (sums[k] += p[k]));
      });
      (Object.keys(sums) as (keyof PillarScores)[]).forEach((k) => (sums[k] = Math.round(sums[k] / ids.length)));
      return sums;
    }
    return null;
  }, [viewMode, selectedId, latestById]);

  const radarSize = 280;
  const center = radarSize / 2;
  const maxRadius = center - 48;

  const polygonPoints = useMemo(() => {
    if (!pillarScores) return "";
    return PILLAR_LABELS.map((key, i) => {
      const angle = (i * 360) / PILLAR_LABELS.length - 90;
      const rad = (angle * Math.PI) / 180;
      const r = (pillarScores[key] / 100) * maxRadius;
      const x = center + r * Math.cos(rad);
      const y = center + r * Math.sin(rad);
      return `${x},${y}`;
    }).join(" ");
  }, [pillarScores, maxRadius, center]);

  const axisLines = useMemo(() => {
    return PILLAR_LABELS.map((_, i) => {
      const angle = (i * 360) / PILLAR_LABELS.length - 90;
      const rad = (angle * Math.PI) / 180;
      const x = center + maxRadius * Math.cos(rad);
      const y = center + maxRadius * Math.sin(rad);
      return { x1: center, y1: center, x2: x, y2: y };
    });
  }, [maxRadius, center]);

  const axisLabelPositions = useMemo(() => {
    return PILLAR_LABELS.map((key, i) => {
      const angle = (i * 360) / PILLAR_LABELS.length - 90;
      const rad = (angle * Math.PI) / 180;
      const r = maxRadius + 28;
      const x = center + r * Math.cos(rad);
      const y = center + r * Math.sin(rad);
      return { key, x, y };
    });
  }, [maxRadius, center]);

  const fillColor = pillarScores
    ? (() => {
        const avg = Object.values(pillarScores).reduce((a, b) => a + b, 0) / 5;
        const c = scoreColor(avg);
        return c === "green"
          ? "rgba(39,224,166,0.4)"
          : c === "amber"
            ? "rgba(234,179,8,0.4)"
            : "rgba(239,68,68,0.4)";
      })()
    : "rgba(47,128,237,0.2)";
  const strokeColor = pillarScores
    ? (() => {
        const avg = Object.values(pillarScores).reduce((a, b) => a + b, 0) / 5;
        const c = scoreColor(avg);
        return c === "green"
          ? "rgba(39,224,166,0.9)"
          : c === "amber"
            ? "rgba(234,179,8,0.9)"
            : "rgba(239,68,68,0.9)";
      })()
    : "rgba(47,128,237,0.6)";

  return (
    <RequireAuth>
      <OSLayer>
        <div className="radarOuter">
          <nav className="radarNav">
            <div className="radarBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="radarTabs">
              <NavTab href="/profile" label="Dashboard" pathname={pathname} />
              <NavTab href="/programme" label="Programme" pathname={pathname} />
              <NavTab href="/tactical" label="Tactical" pathname={pathname} />
              <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
              <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
              <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
              <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
              <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
              <NavTab href="/strategy" label="Strategy" pathname={pathname} />
              <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
              <NavTab href="/settings" label="Settings" pathname={pathname} />
            </div>
          </nav>

          <div className="radarContainer">
            <div className="radarHeader">
              <div className="radarPhase">TACTICAL</div>
              <h1 className="radarHeadline">Performance Radar</h1>
              <p className="radarSub">Five core readiness pillars: Recovery, Structural Integrity, Strength, Aerobic Capacity, Durability.</p>
              <Link href="/tactical" className="radarBackLink">← Back to Tactical Dashboard</Link>
            </div>

            {/* View mode toggle */}
            <section className="radarSection">
              <h2 className="radarSectionTitle">View Mode</h2>
              <div className="viewToggle">
                <button
                  type="button"
                  className={`viewBtn ${viewMode === "Individual" ? "active" : ""}`}
                  onClick={() => setViewMode("Individual")}
                >
                  Individual
                </button>
                <button
                  type="button"
                  className={`viewBtn ${viewMode === "Unit" ? "active" : ""}`}
                  onClick={() => setViewMode("Unit")}
                >
                  Unit
                </button>
              </div>
            </section>

            {viewMode === "Individual" && (
              <section className="radarSection">
                <label className="radarLabel">Select ID</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="radarSelect"
                >
                  {idList.map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </section>
            )}

            {/* Radar chart */}
            <section className="radarSection radarChartSection">
              <h2 className="radarSectionTitle">
                {viewMode === "Individual" ? `${selectedId} — Readiness pillars` : "Unit average — Readiness pillars"}
              </h2>
              {!pillarScores && (
                <p className="radarEmpty">No readiness data yet. Log entries on the Daily Input page.</p>
              )}
              {pillarScores && (
                <div className="radarWrap">
                  <svg
                    className="radarSvg"
                    viewBox={`0 0 ${radarSize} ${radarSize}`}
                    width={radarSize}
                    height={radarSize}
                  >
                    <defs>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="glowStrong">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    {/* Grid rings */}
                    {[0.25, 0.5, 0.75, 1].map((scale) => (
                      <circle
                        key={scale}
                        cx={center}
                        cy={center}
                        r={maxRadius * scale}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Axis lines */}
                    {axisLines.map((line, i) => (
                      <line
                        key={i}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Data polygon */}
                    <polygon
                      points={polygonPoints}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth="2"
                      filter="url(#glowStrong)"
                      className="radarPolygon"
                    />
                    {/* Axis labels */}
                    {axisLabelPositions.map(({ key, x, y }) => (
                      <text
                        key={key}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="radarAxisLabel"
                      >
                        {AXIS_LABELS[key]}
                      </text>
                    ))}
                    {/* Value labels at polygon vertices */}
                    {pillarScores &&
                      axisLabelPositions.map(({ key }, i) => {
                        const score = pillarScores[key];
                        const angle = (i * 360) / PILLAR_LABELS.length - 90;
                        const rad = (angle * Math.PI) / 180;
                        const r = (score / 100) * maxRadius * 0.7;
                        const x = center + r * Math.cos(rad);
                        const y = center + r * Math.sin(rad);
                        return (
                          <text
                            key={`val-${key}`}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className={`radarValueLabel value-${scoreColor(score)}`}
                          >
                            {Math.round(score)}
                          </text>
                        );
                      })}
                  </svg>
                </div>
              )}
              {pillarScores && (
                <div className="radarLegend">
                  <span className="legendItem green">Strong (70+)</span>
                  <span className="legendItem amber">Moderate (50–69)</span>
                  <span className="legendItem red">Weak (&lt;50)</span>
                </div>
              )}
            </section>
          </div>

          <style jsx>{`
            .radarOuter {
              min-height: 100vh;
              background: #08090c;
              background-image:
                radial-gradient(ellipse 80% 50% at 20% 20%, rgba(47,128,237,0.12), transparent),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(39,224,166,0.06), transparent),
                linear-gradient(180deg, #08090c 0%, #0c0e12 50%, #08090c 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .radarOuter::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
              background-size: 40px 40px;
              opacity: 0.3;
              pointer-events: none;
            }
            .radarNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.06);
              position: relative;
              z-index: 2;
            }
            .radarBrand { font-size: 12px; letter-spacing: 2px; opacity: 0.7; }
            .radarTabs { display: flex; gap: 20px; flex-wrap: wrap; }
            .radarContainer { max-width: 680px; margin: 0 auto; padding: 40px; position: relative; z-index: 1; }
            .radarHeader { margin-bottom: 32px; }
            .radarPhase { font-size: 11px; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 8px; }
            .radarHeadline { font-size: 26px; font-weight: 600; margin: 0 0 10px; }
            .radarSub { font-size: 14px; opacity: 0.8; margin: 0 0 14px; line-height: 1.5; }
            .radarBackLink { font-size: 13px; color: rgba(47,128,237,0.95); text-decoration: none; }
            .radarBackLink:hover { text-decoration: underline; }
            .radarSection {
              margin-bottom: 28px;
              padding: 24px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              box-shadow: 0 0 30px rgba(47,128,237,0.06);
              backdrop-filter: blur(8px);
            }
            .radarSectionTitle { font-size: 15px; font-weight: 600; margin: 0 0 16px; letter-spacing: 0.03em; }
            .viewToggle { display: flex; gap: 12px; }
            .viewBtn {
              padding: 12px 24px;
              font-size: 14px; font-weight: 500;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 10px;
              color: rgba(255,255,255,0.85);
              cursor: pointer;
              transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            .viewBtn:hover { background: rgba(255,255,255,0.08); }
            .viewBtn.active {
              background: rgba(47,128,237,0.25);
              border-color: rgba(47,128,237,0.5);
              color: #fff;
              box-shadow: 0 0 20px rgba(47,128,237,0.25);
            }
            .radarLabel { display: block; font-size: 13px; opacity: 0.9; margin-bottom: 8px; }
            .radarSelect {
              padding: 12px 16px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(47,128,237,0.35);
              border-radius: 10px;
              color: #fff;
              font-size: 14px;
              min-width: 160px;
              box-shadow: 0 0 16px rgba(47,128,237,0.15);
            }
            .radarSelect:focus { outline: none; border-color: rgba(47,128,237,0.6); }
            .radarChartSection { text-align: center; }
            .radarEmpty { font-size: 14px; opacity: 0.75; margin: 0; }
            .radarWrap {
              display: inline-block;
              padding: 20px;
              border-radius: 16px;
              background: rgba(0,0,0,0.2);
              border: 1px solid rgba(255,255,255,0.06);
              box-shadow: 0 0 40px rgba(47,128,237,0.1), inset 0 0 30px rgba(0,0,0,0.2);
            }
            .radarSvg { display: block; }
            .radarPolygon { transition: fill 0.3s ease, stroke 0.3s ease; }
            .radarAxisLabel {
              font-size: 11px;
              fill: rgba(255,255,255,0.85);
              letter-spacing: 0.02em;
            }
            .radarValueLabel {
              font-size: 12px;
              font-weight: 700;
            }
            .radarValueLabel.value-green { fill: rgba(39,224,166,0.95); text-shadow: 0 0 10px rgba(39,224,166,0.6); }
            .radarValueLabel.value-amber { fill: rgba(234,179,8,0.95); text-shadow: 0 0 10px rgba(234,179,8,0.5); }
            .radarValueLabel.value-red { fill: rgba(239,68,68,0.95); text-shadow: 0 0 10px rgba(239,68,68,0.5); }
            .radarLegend { display: flex; justify-content: center; gap: 24px; margin-top: 20px; font-size: 12px; opacity: 0.9; }
            .legendItem.green { color: rgba(39,224,166,0.95); }
            .legendItem.amber { color: rgba(234,179,8,0.95); }
            .legendItem.red { color: rgba(239,68,68,0.95); }
            @media (max-width: 768px) {
              .radarNav { padding: 16px; }
              .radarTabs { gap: 14px; }
              .radarContainer { padding: 16px; }
              .viewToggle { flex-direction: column; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
```

## app/u/[id]/page.tsx

```tsx
"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function UltraPremiumInterface() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Mouse parallax tracking
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  async function handleSubmit() {
    if (!input.trim()) return;

    setLoading(true);
    setResponse("");
    setVisible(false);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: input }],
        }),
      });

      const data = await res.json();
      setResponse(data.message?.content || "No response.");
      setTimeout(() => setVisible(true), 200);
    } catch {
      setResponse("Connection error.");
      setVisible(true);
    }

    setLoading(false);
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-GB";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };

    recognition.start();
  }

  return (
    <div className="wrapper">
      <div className="background" />

      <div
        className="panel"
        style={{
          transform: `rotateX(${mouse.y}deg) rotateY(${mouse.x}deg)`
        }}
      >
        <div
          className={`orb ${listening ? "listening" : ""} ${
            loading ? "thinking" : ""
          }`}
        />

        <h1 className="title">What can I help you optimise?</h1>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Define your performance intent..."
          className="input"
        />

        <div className="buttons">
          <button onClick={handleSubmit} className="glass primary">
            {loading ? "Thinking..." : "Submit"}
          </button>

          <button onClick={startListening} className="glass">
            🎙 Speak
          </button>
        </div>

        {response && (
          <div className={`response ${visible ? "visible" : ""}`}>
  <ReactMarkdown
  components={{
    h1: ({ node, ...props }) => (
      <h1 style={{ fontSize: "26px", marginBottom: "16px", fontWeight: 600 }} {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 style={{ fontSize: "22px", marginTop: "20px", marginBottom: "10px", fontWeight: 600 }} {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 style={{ fontSize: "18px", marginTop: "18px", marginBottom: "8px", fontWeight: 600 }} {...props} />
    ),
    p: ({ node, ...props }) => (
      <p style={{ marginBottom: "12px", lineHeight: 1.6, opacity: 0.9 }} {...props} />
    ),
    li: ({ node, ...props }) => (
      <li style={{ marginBottom: "6px", lineHeight: 1.5 }} {...props} />
    ),
    strong: ({ node, ...props }) => (
      <strong style={{ fontWeight: 600 }} {...props} />
    ),
  }}
>
  {response}
</ReactMarkdown>
          </div>
        )}
      </div>

      <style jsx>{`
        .wrapper {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: black;
          overflow: hidden;
          perspective: 1000px;
          position: relative;
          color: white;
        }

        .background {
          position: absolute;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            from 0deg,
            #0A84FF,
            #9d4edd,
            #ff006e,
            #00f5ff,
            #0A84FF
          );
          animation: rotateBg 40s linear infinite;
          filter: blur(200px);
          opacity: 0.2;
        }

        @keyframes rotateBg {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .panel {
          position: relative;
          z-index: 2;
          width: 90%;
          max-width: 750px;
          padding: 60px;
          border-radius: 40px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(60px);
          box-shadow:
            0 0 80px rgba(0,150,255,0.3),
            inset 0 0 40px rgba(255,255,255,0.05);
          transition: transform 0.1s ease;
          text-align: center;
        }

        .orb {
          width: 160px;
          height: 160px;
          margin: 0 auto 50px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffffff, transparent 40%),
                      conic-gradient(#00f5ff, #0A84FF, #9d4edd, #ff006e, #00f5ff);
          animation: breathe 4s ease-in-out infinite;
          box-shadow: 0 0 100px rgba(0,150,255,0.8);
        }

        .listening {
          animation: spin 3s linear infinite;
        }

        .thinking {
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes breathe {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .title {
          font-size: 30px;
          margin-bottom: 25px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        .input {
          width: 100%;
          padding: 18px;
          border-radius: 50px;
          border: none;
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          font-size: 16px;
          margin-bottom: 25px;
        }

        .buttons {
          display: flex;
          gap: 20px;
          justify-content: center;
        }

        .glass {
          padding: 14px 30px;
          border-radius: 50px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(20px);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .glass:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-3px);
        }

        .primary {
          background: linear-gradient(135deg, #0A84FF, #9d4edd);
          border: none;
        }

        .response {
          margin-top: 50px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s ease;
          text-align: left;
          max-height: 300px;
          overflow-y: auto;
        }

        .response.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
```

## app/ui/BenchmarkManager.tsx

```tsx
"use client";

/**
 * Benchmark Manager — view/edit 1RM and other benchmarks for percentage prescription.
 * Phase 1: structure in place; wire to profile.performance_benchmarks and API.
 */

import type { PerformanceBenchmarks, ExerciseBenchmarkKey } from "@/lib/profile/benchmarkSchema";
import { EXERCISE_BENCHMARK_KEYS, EXERCISE_DISPLAY_NAMES } from "@/lib/profile/benchmarkSchema";

export type BenchmarkManagerProps = {
  benchmarks: PerformanceBenchmarks;
  onUpdate?: (key: ExerciseBenchmarkKey, oneRM: number | null, estimatedOneRM: number | null) => void;
  className?: string;
};

export default function BenchmarkManager({
  benchmarks,
  onUpdate,
  className = "",
}: BenchmarkManagerProps) {
  const exercise = benchmarks.exerciseBenchmarks ?? {};

  return (
    <div className={`benchmarkManager ${className}`}>
      <div className="benchmarkManagerTitle">Strength benchmarks (kg)</div>
      <p className="benchmarkManagerHint">
        Add 1RM to get weight-based prescriptions (e.g. 3×5 @ 70% → 105kg). Otherwise we use RPE.
      </p>
      <div className="benchmarkManagerGrid">
        {EXERCISE_BENCHMARK_KEYS.map((key) => {
          const b = exercise[key];
          const displayName = EXERCISE_DISPLAY_NAMES[key] ?? key;
          const value = b?.oneRM ?? b?.estimatedOneRM ?? null;
          return (
            <div key={key} className="benchmarkManagerRow">
              <label className="benchmarkManagerLabel">{displayName}</label>
              <span className="benchmarkManagerValue">
                {value != null ? `${value} kg` : "—"}
                {b?.estimatedOneRM != null && b?.oneRM == null ? " (est.)" : ""}
              </span>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .benchmarkManager {
          background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 20px 24px;
        }
        .benchmarkManagerTitle {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .benchmarkManagerHint {
          font-size: 12px;
          opacity: 0.65;
          margin: 0 0 16px;
          line-height: 1.4;
        }
        .benchmarkManagerGrid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .benchmarkManagerRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .benchmarkManagerLabel { opacity: 0.85; }
        .benchmarkManagerValue { opacity: 0.9; font-weight: 500; }
      `}</style>
    </div>
  );
}
```

## app/ui/BodyReportChart.tsx

```tsx
"use client";

/** Stress level for body regions: high = red, medium = amber, low = green */
export type StressLevel = "high" | "medium" | "low" | "none";

export type BodyRegionStress = {
  chest?: StressLevel;
  shoulders?: StressLevel;
  abs?: StressLevel;
  lats?: StressLevel;
  lowerBack?: StressLevel;
  glutes?: StressLevel;
  quads?: StressLevel;
  hamstrings?: StressLevel;
  calves?: StressLevel;
  biceps?: StressLevel;
  triceps?: StressLevel;
  forearms?: StressLevel;
};

const STRESS_COLORS: Record<StressLevel, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
  none: "#6b7280",
};

const BASE_BODY = "#eab308";
const GREY_NEUTRAL = "#6b7280";
const TEAL = "#14b8a6";

export type BodyReportChartProps = {
  stress?: BodyRegionStress | null;
  lastSessionFocus?: string | null;
  sessions?: number;
  exercises?: number;
  sets?: number;
  reps?: number;
  volumeKg?: number;
  className?: string;
};

function deriveStressFromSessionFocus(focus: string): BodyRegionStress {
  const f = focus.toLowerCase();
  const s: BodyRegionStress = {};
  if (f.includes("lower") || f.includes("leg") || f.includes("squat") || f.includes("deadlift")) {
    s.quads = "high";
    s.glutes = "high";
    s.hamstrings = "high";
    s.lowerBack = "medium";
  }
  if (f.includes("upper") || f.includes("push") || f.includes("bench") || f.includes("press")) {
    s.chest = "high";
    s.shoulders = "high";
    s.triceps = "high";
  }
  if (f.includes("pull") || f.includes("row") || f.includes("lat")) {
    s.lats = "high";
    s.biceps = "medium";
  }
  if (f.includes("full") || f.includes("body")) {
    s.chest = s.shoulders = s.lats = s.quads = s.glutes = s.hamstrings = "medium";
    s.lowerBack = "medium";
  }
  return s;
}

/** Fill for a region: stress color if set, else grey for shoulders/neck, else base orange/yellow */
function fillFor(regions: BodyRegionStress, key: keyof BodyRegionStress): string {
  const level = regions[key];
  if (level && level !== "none") return STRESS_COLORS[level];
  if (key === "shoulders") return GREY_NEUTRAL;
  return BASE_BODY;
}

export default function BodyReportChart({
  stress,
  lastSessionFocus = "Lower body",
  sessions = 0,
  exercises = 0,
  sets = 0,
  reps = 0,
  volumeKg = 0,
  className = "",
}: BodyReportChartProps) {
  const regions = stress ?? deriveStressFromSessionFocus(lastSessionFocus || "");
  const get = (key: keyof BodyRegionStress) => fillFor(regions, key);

  const stats = [
    { label: "SESSIONS", value: sessions },
    { label: "EXERCISES", value: exercises },
    { label: "SETS", value: sets },
    { label: "REPS", value: reps },
    { label: "VOLUME (KG)", value: volumeKg.toLocaleString() },
  ];

  return (
    <div className={`bodyReport ${className}`}>
      <div className="bodyReportTitle">Body report</div>
      <div className="bodyReportSub">Last trained · stress by area</div>
      <div className="bodyReportLayout">
        <div className="bodyReportRow1">
          <div className="bodyReportFigure">
            <div className="bodyReportFigureLabel">FRONT</div>
            <svg viewBox="0 0 120 200" className="bodyReportSvg">
              {/* Head - oval, base orange */}
              <ellipse cx="60" cy="18" rx="14" ry="10" fill={get("shoulders")} stroke={GREY_NEUTRAL} strokeWidth="1" />
              {/* Neck/shoulders - grey blocks */}
              <path d="M 44 28 L 52 38 L 68 38 L 76 28 Z" fill={GREY_NEUTRAL} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
              {/* Chest/torso */}
              <path d="M 38 38 Q 60 48 82 38 L 78 72 Q 60 68 42 72 Z" fill={get("chest")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              <rect x="48" y="72" width="24" height="38" rx="2" fill={get("abs")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              {/* Arms raised - block style */}
              <rect x="28" y="32" width="14" height="32" rx="2" fill={get("biceps")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              <rect x="78" y="32" width="14" height="32" rx="2" fill={get("triceps")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              {/* Lower body - trapezoidal */}
              <path d="M 40 110 L 52 200 L 68 200 L 80 110 Z" fill={get("quads")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            </svg>
          </div>
          <div className="bodyReportStats">
            {stats.map(({ label, value }) => (
              <div key={label} className="bodyReportStatRow">
                <span className="bodyReportStatLabel">{label}</span>
                <span className="bodyReportStatValue">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bodyReportFigure bodyReportBack">
          <div className="bodyReportFigureLabel">BACK</div>
          <svg viewBox="0 0 120 200" className="bodyReportSvg">
            <ellipse cx="60" cy="18" rx="14" ry="10" fill={BASE_BODY} stroke={GREY_NEUTRAL} strokeWidth="1" />
            <path d="M 44 28 L 52 38 L 68 38 L 76 28 Z" fill={GREY_NEUTRAL} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
            <path d="M 42 38 Q 60 34 78 38 L 78 72 Q 60 76 42 72 Z" fill={get("lats")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <path d="M 42 72 L 42 110 Q 60 108 78 110 L 78 72 Z" fill={get("lowerBack")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <rect x="28" y="32" width="14" height="32" rx="2" fill={get("triceps")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <rect x="78" y="32" width="14" height="32" rx="2" fill={get("triceps")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <path d="M 42 110 Q 60 118 78 110 L 72 200 L 48 200 Z" fill={get("glutes")} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
            <path d="M 48 200 L 52 112 M 72 200 L 68 112" fill="none" stroke={get("hamstrings")} strokeWidth="8" strokeLinecap="round" />
            <path d="M 52 182 L 52 198 M 68 182 L 68 198" fill="none" stroke={get("calves")} strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="bodyReportLegend">
        <span className="bodyReportLegendItem high">High stress</span>
        <span className="bodyReportLegendItem medium">Medium</span>
        <span className="bodyReportLegendItem low">Low / recovered</span>
      </div>
      <style jsx>{`
        .bodyReport {
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px;
        }
        .bodyReportTitle {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
          color: #fff;
        }
        .bodyReportSub {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 16px;
          color: #fff;
        }
        .bodyReportLayout {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 20px;
        }
        .bodyReportRow1 {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 28px;
        }
        .bodyReportFigure {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .bodyReportBack {
          align-self: center;
        }
        .bodyReportFigureLabel {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #fff;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .bodyReportSvg {
          width: 100%;
          max-width: 95px;
          height: auto;
        }
        .bodyReportStats {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 110px;
        }
        .bodyReportStatRow {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .bodyReportStatLabel {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #fff;
          opacity: 0.95;
        }
        .bodyReportStatValue {
          font-size: 18px;
          font-weight: 700;
          color: ${TEAL};
        }
        .bodyReportLegend {
          display: flex;
          gap: 12px;
          margin-top: 14px;
          font-size: 10px;
          opacity: 0.9;
        }
        .bodyReportLegendItem.high { color: #ef4444; }
        .bodyReportLegendItem.medium { color: #f59e0b; }
        .bodyReportLegendItem.low { color: #22c55e; }
      `}</style>
    </div>
  );
}
```

## app/ui/DailyAdvisories.tsx

```tsx
"use client";

import type { Advisory } from "@/engine/advisoriesEngine";

export type DailyAdvisoriesProps = {
  advisories: Advisory[];
  /** When true, show a short line prompting check-in */
  showCheckinPrompt?: boolean;
  className?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  training: "Training",
  nutrition: "Nutrition",
  psych: "Psych",
  soft_tissue: "Soft tissue",
  recovery: "Recovery",
};

export default function DailyAdvisories({
  advisories,
  showCheckinPrompt = false,
  className = "",
}: DailyAdvisoriesProps) {
  return (
    <div className={`dailyAdvisories ${className}`}>
      <div className="dailyAdvisoriesTitle">Today&apos;s advisories</div>
      {showCheckinPrompt && (
        <p className="dailyAdvisoriesPrompt">Complete your daily check-in to get personalised advisories for training, nutrition and recovery.</p>
      )}
      {advisories.length === 0 && !showCheckinPrompt && (
        <p className="dailyAdvisoriesEmpty">No advisories right now. You&apos;re good to go.</p>
      )}
      <ul className="dailyAdvisoriesList">
        {advisories.map((a, i) => (
          <li key={i} className={`dailyAdvisoriesItem ${a.priority}`}>
            <span className="dailyAdvisoriesCategory">{a.label}</span>
            <p className="dailyAdvisoriesMessage">{a.message}</p>
          </li>
        ))}
      </ul>
      <style jsx>{`
        .dailyAdvisories {
          background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 20px 24px;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .dailyAdvisories:hover {
          box-shadow: 0 0 24px rgba(47,128,237,0.2), 0 0 48px rgba(39,224,166,0.1);
          border-color: rgba(47,128,237,0.2);
        }
        .dailyAdvisoriesTitle {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.03em;
          margin-bottom: 12px;
        }
        .dailyAdvisoriesPrompt, .dailyAdvisoriesEmpty {
          font-size: 13px;
          opacity: 0.75;
          margin: 0 0 12px;
        }
        .dailyAdvisoriesList {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .dailyAdvisoriesItem {
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .dailyAdvisoriesItem:last-child { border-bottom: none; }
        .dailyAdvisoriesCategory {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #14b8a6;
          margin-bottom: 4px;
        }
        .dailyAdvisoriesItem.high .dailyAdvisoriesCategory { color: #f59e0b; }
        .dailyAdvisoriesMessage {
          font-size: 13px;
          line-height: 1.45;
          opacity: 0.9;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
```

## app/ui/DecisionLog.tsx

```tsx
"use client";

/**
 * Decision Transparency Log — why programme changed.
 * Phase 2: every programme change logs trigger, threshold, adjustment.
 */

export type DecisionLogEntry = {
  id: string;
  createdAt: string;
  decisionType: string;
  adjustmentMade: string;
  explanation: string;
  triggerVariables?: Record<string, unknown>;
  thresholdBreached?: string;
};

export type DecisionLogProps = {
  entries: DecisionLogEntry[];
  maxItems?: number;
  className?: string;
};

export default function DecisionLog({
  entries,
  maxItems = 5,
  className = "",
}: DecisionLogProps) {
  const show = entries.slice(0, maxItems);
  return (
    <div className={`decisionLog ${className}`}>
      <div className="decisionLogTitle">Why this changed</div>
      {show.length === 0 ? (
        <p className="decisionLogEmpty">No programme changes logged yet.</p>
      ) : (
        <ul className="decisionLogList">
          {show.map((e) => (
            <li key={e.id} className="decisionLogItem">
              <div className="decisionLogAdjustment">{e.adjustmentMade}</div>
              {e.triggerVariables && Object.keys(e.triggerVariables).length > 0 && (
                <ul className="decisionLogTriggers">
                  {Object.entries(e.triggerVariables).map(([k, v]) => (
                    <li key={k}>
                      {String(k).replace(/_/g, " ")}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </li>
                  ))}
                </ul>
              )}
              {e.thresholdBreached && (
                <div className="decisionLogThreshold">Threshold: {e.thresholdBreached}</div>
              )}
              <div className="decisionLogExplanation">{e.explanation}</div>
              <div className="decisionLogMeta">{e.createdAt}</div>
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        .decisionLog {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 16px 20px;
        }
        .decisionLogTitle {
          font-size: 11px;
          letter-spacing: 0.08em;
          opacity: 0.65;
          margin-bottom: 12px;
        }
        .decisionLogEmpty {
          font-size: 13px;
          opacity: 0.6;
          margin: 0;
        }
        .decisionLogList { list-style: none; margin: 0; padding: 0; }
        .decisionLogItem {
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .decisionLogItem:last-child { border-bottom: none; }
        .decisionLogAdjustment { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
        .decisionLogTriggers { list-style: none; margin: 4px 0 6px; padding: 0; font-size: 12px; opacity: 0.8; }
        .decisionLogTriggers li { margin-bottom: 2px; }
        .decisionLogTriggers li::before { content: "• "; color: rgba(47, 128, 237, 0.8); }
        .decisionLogThreshold { font-size: 11px; opacity: 0.65; margin-bottom: 2px; }
        .decisionLogExplanation { font-size: 12px; opacity: 0.8; line-height: 1.4; }
        .decisionLogMeta { font-size: 11px; opacity: 0.5; margin-top: 4px; }
      `}</style>
    </div>
  );
}
```

## app/ui/ProgrammeCard.tsx

```tsx
"use client";

/**
 * Premium programme card — coaching-grade session layout.
 * Clear hierarchy, clean spacing, minimal borders, subtle glow. No clutter.
 * Format: Block · Bias | Duration · Intensity | Primary Focus | A. B. C. D. (with rest / aerobic flush).
 */

export type ProgrammeCardExercise = {
  letter: string;
  title: string;
  prescription: string;
  rest?: string;
};

export type ProgrammeCardProps = {
  /** e.g. "LOWER BODY · NEURAL BIAS" */
  sessionTitle: string;
  sessionSubtitle?: string;
  /** e.g. "60–75 min" */
  duration: string;
  /** e.g. "Moderate–High" */
  intensity: string;
  /** e.g. "Primary Focus: Max Force Output" or "Max Force Output" */
  primaryFocus: string;
  exercises: ProgrammeCardExercise[];
  className?: string;
};

export default function ProgrammeCard({
  sessionTitle,
  sessionSubtitle,
  duration,
  intensity,
  primaryFocus,
  exercises,
  className = "",
}: ProgrammeCardProps) {
  const focusLabel = primaryFocus.startsWith("Primary Focus") ? primaryFocus : `Primary Focus: ${primaryFocus}`;

  return (
    <div className={`programmeCard ${className}`}>
      <div className="programmeCardSummary">
        <h2 className="programmeCardSessionTitle">{sessionTitle}</h2>
        {sessionSubtitle && (
          <p className="programmeCardSessionSubtitle">{sessionSubtitle}</p>
        )}
        <div className="programmeCardMeta">
          <span>{duration}</span>
          <span className="programmeCardMetaDot" aria-hidden>·</span>
          <span>{intensity}</span>
        </div>
        <div className="programmeCardFocus">{focusLabel}</div>
      </div>

      <div className="programmeCardExercises">
        {exercises.map((ex, i) => (
          <div key={i} className="programmeCardExerciseRow">
            <span className="programmeCardExerciseLetter">{ex.letter}.</span>
            <div className="programmeCardExerciseMain">
              <div className="programmeCardExerciseTitle">{ex.title}</div>
              <div className="programmeCardPrescription">{ex.prescription}</div>
              {ex.rest && (
                <div className="programmeCardRest">Rest: {ex.rest}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .programmeCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.6), rgba(30, 41, 59, 0.5));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.02);
        }

        .programmeCardSummary {
          padding: 28px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .programmeCardSessionTitle {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.12em;
          margin: 0 0 8px;
          color: rgba(255, 255, 255, 0.95);
        }

        .programmeCardSessionSubtitle {
          font-size: 13px;
          opacity: 0.7;
          margin: 0 0 12px;
        }

        .programmeCardMeta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
          opacity: 0.88;
          margin-bottom: 10px;
        }

        .programmeCardMetaDot {
          opacity: 0.5;
          font-size: 10px;
        }

        .programmeCardFocus {
          font-size: 13px;
          opacity: 0.82;
          letter-spacing: 0.02em;
        }

        .programmeCardExercises {
          padding: 20px 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .programmeCardExerciseRow {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }

        .programmeCardExerciseLetter {
          flex-shrink: 0;
          width: 28px;
          font-size: 15px;
          font-weight: 700;
          color: rgba(47, 128, 237, 0.95);
        }

        .programmeCardExerciseMain {
          flex: 1;
          min-width: 0;
        }

        .programmeCardExerciseTitle {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
          color: #fff;
        }

        .programmeCardPrescription {
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.45;
        }

        .programmeCardRest {
          font-size: 12px;
          opacity: 0.65;
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}
```

## app/ui/RemakerProgressBlock.tsx

```tsx
"use client";

import { useState } from "react";

const TEAL = "#14b8a6";
const GREEN = "#22c55e";
const BLUE = "#3b82f6";
const PURPLE = "#a855f7";

const TAB_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pps: { bg: "rgba(34,197,94,0.35)", border: GREEN, text: "#fff" },
  weight: { bg: "rgba(59,130,246,0.35)", border: BLUE, text: "#fff" },
  velocity: { bg: "rgba(168,85,247,0.35)", border: PURPLE, text: "#fff" },
  consistency: { bg: "rgba(20,184,166,0.35)", border: TEAL, text: "#fff" },
};

const LINE_COLORS: Record<string, string> = {
  pps: GREEN,
  weight: BLUE,
  velocity: PURPLE,
  consistency: "#ef4444",
};

/** Mock trend: cumulative % change Feb 2025 – Feb 2026 (PPS, Weight, Velocity, Consistency) */
function mockPPSData() {
  const labels = ["Feb 2025", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec 2025", "Feb 2026"];
  return Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return {
      label: labels[i],
      pps: Math.round((t * 5 - 2 + Math.sin(i * 0.7) * 4) * 10) / 10,
      weight: Math.round((-35 * t - 5 + Math.sin(i * 0.5) * 5) * 10) / 10,
      velocity: Math.round((15 * Math.min(t, 0.5) - 10 * Math.max(0, t - 0.5) + Math.sin(i * 0.6) * 3) * 10) / 10,
      consistency: Math.round((-40 * Math.min(t, 0.4) + 45 * Math.max(0, t - 0.4) + Math.sin(i * 0.4) * 5) * 10) / 10,
    };
  });
}

export type RemakerProgressBlockProps = {
  readinessScore?: number;
  strengthUpper?: number;
  strengthLower?: number;
  aerobicScore?: number;
  topBenchmarkLabel?: string;
  topBenchmarkValue?: number | null;
  sessionsThisWeek?: number;
  className?: string;
  /** Projected PPS as % change from baseline (extends chart when on PPS tab) */
  projectedPpsPercent?: number[];
};

export default function RemakerProgressBlock({
  className = "",
  projectedPpsPercent,
}: RemakerProgressBlockProps) {
  const [activeTab, setActiveTab] = useState<"pps" | "weight" | "velocity" | "consistency">("pps");
  const trend = mockPPSData();
  const projLen = projectedPpsPercent?.length ?? 0;
  const totalLen = trend.length + projLen;
  const allValues = trend.flatMap((d) => [d.pps, d.weight, d.velocity, d.consistency]);
  const allWithProj = projLen > 0 ? [...allValues, ...(projectedPpsPercent ?? [])] : allValues;
  const minY = Math.min(...allWithProj, -40) - 2;
  const maxY = Math.max(...allWithProj, 20) + 2;
  const range = maxY - minY || 1;
  const w = 700;
  const h = 280;
  const pad = { top: 20, right: 16, bottom: 36, left: 44 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const toX = (i: number) =>
    pad.left + (i / Math.max(totalLen - 1, 1)) * innerW;
  const toY = (v: number) => pad.top + innerH - ((v - minY) / range) * innerH;

  const metricIds = ["pps", "weight", "velocity", "consistency"] as const;
  const pathDs = metricIds.map((id) =>
    trend
      .map((d) => d[id])
      .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`)
      .join(" ")
  );
  const lastFourWeeks = trend.map((d) => d[activeTab]).slice(-4);
  const avgPPS = lastFourWeeks.length ? (lastFourWeeks.reduce((a, b) => a + b, 0) / lastFourWeeks.length).toFixed(0) : "0";

  const tabs = [
    { id: "pps" as const, label: "PPS" },
    { id: "weight" as const, label: "Weight" },
    { id: "velocity" as const, label: "Velocity" },
    { id: "consistency" as const, label: "Consistency" },
  ];

  return (
    <div className={`remakerBlock ${className}`}>
      <div className="remakerProgressCard">
        <div className="remakerProgressHead">
          <h2 className="remakerProgressTitle">Performance Pathfinder Score</h2>
          <div className="remakerProgressSummary">
            <span className="remakerProgressSummaryLabel">Average PPS in the last 4 weeks:</span>
            <span className="remakerProgressSummaryPill">{avgPPS}% PPS</span>
          </div>
        </div>
        <div
          className="remakerTabs"
          role="tablist"
          aria-label="Select metric for chart"
          style={{ position: "relative", zIndex: 1 }}
        >
          {tabs.map((tab) => {
            const style = TAB_COLORS[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-controls="remaker-chart-panel"
                id={`remaker-tab-${tab.id}`}
                className={`remakerTab ${isActive ? "active" : ""}`}
                style={
                  isActive
                    ? { background: style.bg, borderColor: style.border, color: style.text }
                    : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTab(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveTab(tab.id);
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="remakerProgressDesc1">
          Above are the key metrics contributing to the athlete&apos;s PPS (Performance Pathfinder Score).
        </p>
        <p className="remakerProgressDesc2">
          Below is a plot showing cumulative percentage change in PPS and a breakdown in terms of the key metrics.
        </p>
        <div id="remaker-chart-panel" className="remakerChartWrap" role="tabpanel" aria-labelledby={`remaker-tab-${activeTab}`}>
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="remakerChart" preserveAspectRatio="xMidYMid meet">
            <defs>
              {metricIds.map((id) => (
                <filter key={id} id={`remakerGlow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
              <filter id="remakerGlow-projection" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="remakerProjectionFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={GREEN} stopOpacity="0.35" />
                <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, -10, -20, -30, -40, 10, 20].map((v) => {
              const y = toY(v);
              return (
                <line
                  key={v}
                  x1={pad.left}
                  y1={y}
                  x2={w - pad.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                  strokeDasharray={v % 10 === 0 ? "4 4" : "2 2"}
                />
              );
            })}
            {metricIds.map((id, idx) => {
              const isActive = activeTab === id;
              const color = LINE_COLORS[id];
              return (
                <g
                  key={id}
                  opacity={isActive ? 1 : 0.35}
                  style={{ transition: "opacity 0.35s ease" }}
                >
                  <path
                    d={pathDs[idx]}
                    fill="none"
                    stroke={color}
                    strokeWidth={isActive ? 3 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={isActive ? `url(#remakerGlow-${id})` : undefined}
                  />
                  {trend.map((d, i) => (
                    <circle
                      key={i}
                      cx={toX(i)}
                      cy={toY(d[id])}
                      r={isActive ? 4 : 2.5}
                      fill={color}
                      filter={isActive ? `url(#remakerGlow-${id})` : undefined}
                    />
                  ))}
                </g>
              );
            })}
            {activeTab === "pps" && projectedPpsPercent && projectedPpsPercent.length > 0 && (() => {
              const lastX = toX(trend.length - 1);
              const lastY = toY(trend[trend.length - 1].pps);
              const projPoints = projectedPpsPercent.map((v, i) => ({ x: toX(trend.length + i), y: toY(v) }));
              const areaPath = `M ${lastX} ${lastY} ${projPoints.map((p) => `L ${p.x} ${p.y}`).join(" ")} L ${projPoints[projPoints.length - 1].x} ${pad.top + innerH} L ${lastX} ${pad.top + innerH} Z`;
              const linePath = `M ${lastX} ${lastY} ${projPoints.map((p) => `L ${p.x} ${p.y}`).join(" ")}`;
              return (
                <g className="remakerProjection" style={{ transition: "opacity 0.35s ease" }}>
                  <path d={areaPath} fill="url(#remakerProjectionFill)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={GREEN}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="6 6"
                    filter="url(#remakerGlow-projection)"
                  />
                  {projPoints.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={4}
                      fill={GREEN}
                      filter="url(#remakerGlow-projection)"
                    />
                  ))}
                </g>
              );
            })()}
            <line x1={pad.left} y1={pad.top + innerH} x2={w - pad.right} y2={pad.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <text x={pad.left - 6} y={pad.top + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.6)">PPS (%)</text>
            {[maxY, 0, minY].filter((v, i, a) => a.indexOf(v) === i).map((v) => (
              <text key={v} x={pad.left - 6} y={toY(v) + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.5)">{Math.round(v)}</text>
            ))}
          </svg>
        </div>
        <div className="remakerChartX">
          {trend.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
          {projectedPpsPercent?.map((_, i) => (
            <span key={`f${i}`}>W{i + 1}</span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .remakerBlock {
          margin-bottom: 48px;
        }
        .remakerProgressCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px 24px 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .remakerProgressCard:hover {
          box-shadow: 0 0 28px rgba(47, 128, 237, 0.22), 0 0 56px rgba(39, 224, 166, 0.12), 0 20px 60px rgba(0, 0, 0, 0.4);
          border-color: rgba(47, 128, 237, 0.2);
        }
        .remakerProgressHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }
        .remakerProgressTitle {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .remakerProgressSummary {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .remakerProgressSummaryLabel {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
        }
        .remakerProgressSummaryPill {
          font-size: 13px;
          font-weight: 600;
          padding: 6px 12px;
          background: rgba(34, 197, 94, 0.35);
          border: 1px solid ${GREEN};
          border-radius: 10px;
          color: ${GREEN};
        }
        .remakerTabs {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }
        .remakerTab {
          padding: 10px 20px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          pointer-events: auto;
          user-select: none;
          transition: all 0.2s ease;
        }
        .remakerTab:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .remakerProgressDesc1 {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          margin: 0 0 6px;
          line-height: 1.5;
        }
        .remakerProgressDesc2 {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
          margin: 0 0 20px;
          line-height: 1.5;
        }
        .remakerChartWrap {
          overflow: hidden;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.25);
        }
        .remakerChart {
          display: block;
        }
        .remakerChartX {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          padding: 0 44px 0 48px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
```

## app/ui/RiskBadge.tsx

```tsx
"use client";

/**
 * Risk badge — surface overload/neural/recovery subtly on dashboard.
 * Minimal, premium; no clutter.
 */

import type { RiskLevel, RecoveryTrend } from "@/engine/riskIndex";

export type RiskBadgeProps = {
  overloadRisk?: RiskLevel;
  neuralStrain?: RiskLevel;
  recoveryCompression?: RecoveryTrend;
  className?: string;
};

function levelColor(level: RiskLevel): string {
  if (level === "high") return "rgba(239, 68, 68, 0.25)";
  if (level === "moderate") return "rgba(234, 179, 8, 0.2)";
  return "rgba(34, 197, 94, 0.15)";
}

function levelBorder(level: RiskLevel): string {
  if (level === "high") return "rgba(239, 68, 68, 0.5)";
  if (level === "moderate") return "rgba(234, 179, 8, 0.5)";
  return "rgba(34, 197, 94, 0.4)";
}

export default function RiskBadge({
  overloadRisk,
  neuralStrain,
  recoveryCompression,
  className = "",
}: RiskBadgeProps) {
  const show = [overloadRisk, neuralStrain, recoveryCompression].some(Boolean);
  if (!show) return null;

  return (
    <div className={`riskBadge ${className}`}>
      {overloadRisk && (
        <span
          className="riskBadgePill"
          style={{
            background: levelColor(overloadRisk),
            borderColor: levelBorder(overloadRisk),
          }}
        >
          Load: {overloadRisk}
        </span>
      )}
      {neuralStrain && (
        <span
          className="riskBadgePill"
          style={{
            background: levelColor(neuralStrain),
            borderColor: levelBorder(neuralStrain),
          }}
        >
          Neural: {neuralStrain}
        </span>
      )}
      {recoveryCompression && (
        <span className="riskBadgePill riskBadgePillNeutral">
          Recovery: {recoveryCompression}
        </span>
      )}
      <style jsx>{`
        .riskBadge {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .riskBadgePill {
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid;
          text-transform: capitalize;
        }
        .riskBadgePillNeutral {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </div>
  );
}
```

## app/ui/WeeklyBrief.tsx

```tsx
"use client";

/**
 * Weekly Strategic Brief — coach-voice summary before each training week.
 * Phase 2: pull from readiness trends, momentum, fatigue model.
 */

export type WeeklyBriefProps = {
  phaseIntent?: string;
  systemBias?: string;
  primaryLimiter?: string;
  recoveryBandwidth?: string;
  whyThisWeek?: string;
  weekNumber?: number;
  className?: string;
};

export default function WeeklyBrief({
  phaseIntent = "GPP — building aerobic floor and work capacity",
  systemBias = "Strength-dominant; aerobic floor building",
  primaryLimiter = "—",
  recoveryBandwidth = "Adequate",
  whyThisWeek = "This week maintains volume with moderate intensity to consolidate last block. Recovery bandwidth supports the planned load.",
  weekNumber,
  className = "",
}: WeeklyBriefProps) {
  return (
    <div className={`weeklyBrief ${className}`}>
      {weekNumber != null && (
        <div className="weeklyBriefWeek">Week {weekNumber}</div>
      )}
      <div className="weeklyBriefSection">
        <span className="weeklyBriefLabel">Phase intent</span>
        <span className="weeklyBriefValue">{phaseIntent}</span>
      </div>
      <div className="weeklyBriefSection">
        <span className="weeklyBriefLabel">System bias</span>
        <span className="weeklyBriefValue">{systemBias}</span>
      </div>
      <div className="weeklyBriefSection">
        <span className="weeklyBriefLabel">Primary limiter</span>
        <span className="weeklyBriefValue">{primaryLimiter}</span>
      </div>
      <div className="weeklyBriefSection">
        <span className="weeklyBriefLabel">Recovery bandwidth</span>
        <span className="weeklyBriefValue">{recoveryBandwidth}</span>
      </div>
      <p className="weeklyBriefWhy">{whyThisWeek}</p>
      <style jsx>{`
        .weeklyBrief {
          background: linear-gradient(135deg, rgba(17,24,39,0.95), rgba(30,41,59,0.9));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 24px 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 60px rgba(47,128,237,0.15);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .weeklyBrief:hover {
          box-shadow: 0 0 28px rgba(47,128,237,0.25), 0 0 56px rgba(39,224,166,0.12), 0 20px 60px rgba(0,0,0,0.6);
          border-color: rgba(47,128,237,0.2);
        }
        .weeklyBriefWeek {
          font-size: 11px;
          letter-spacing: 0.1em;
          opacity: 0.6;
          margin-bottom: 14px;
        }
        .weeklyBriefSection {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 14px;
        }
        .weeklyBriefSection:last-of-type { margin-bottom: 16px; }
        .weeklyBriefLabel {
          font-size: 11px;
          opacity: 0.65;
        }
        .weeklyBriefValue { font-size: 14px; opacity: 0.9; }
        .weeklyBriefWhy {
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.8;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
```

## engine/adaptiveGuardrails.ts

```ts
/**
 * Adaptive guardrails: run AFTER prescriptionEngine and BEFORE ProgrammeCard rendering.
 * If injury active: hard cap intensity (e.g. 75%), remove explosive work, limit weekly volume.
 * If overload risk high: shift to submax bias, increase recovery exposure, add flush session.
 */

import type { InjuryEntry } from "./injuryMemoryEngine";
import { getActiveInjuries } from "./injuryMemoryEngine";
import type { RiskSignals } from "./riskIndex";
import { getRiskSignals } from "./riskIndex";
import type { FatigueInputs } from "./fatigueModel";

export type GuardrailOutput = {
  /** Cap prescribed intensity (0–1). e.g. 0.75 = 75% max. */
  maxIntensity: number;
  /** Remove explosive/plyometric work. */
  removeExplosive: boolean;
  /** Max sessions this week (optional; null = no cap). */
  maxWeeklySessions: number | null;
  /** Bias toward submax work. */
  submaxBias: boolean;
  /** Add a flush/recovery session. */
  addFlushSession: boolean;
  /** Human-readable reason for decision log. */
  reasons: string[];
};

const DEFAULT: GuardrailOutput = {
  maxIntensity: 1,
  removeExplosive: false,
  maxWeeklySessions: null,
  submaxBias: false,
  addFlushSession: false,
  reasons: [],
};

export type GuardrailInputs = FatigueInputs & {
  activeInjuries?: InjuryEntry[];
  /** Planned sessions this week (optional). */
  plannedSessions?: number;
};

/**
 * Compute guardrails from profile, risk, and active injuries.
 * Programme builder applies maxIntensity to prescribe(), removes explosive when removeExplosive, etc.
 */
export function getAdaptiveGuardrails(inputs: GuardrailInputs): GuardrailOutput {
  const risk: RiskSignals = getRiskSignals(inputs);
  const active = getActiveInjuries(inputs.activeInjuries ?? []);
  const reasons: string[] = [];

  let maxIntensity = 1;
  let removeExplosive = false;
  let maxWeeklySessions: number | null = null;
  let submaxBias = false;
  let addFlushSession = false;

  if (active.length > 0) {
    maxIntensity = 0.75;
    removeExplosive = true;
    maxWeeklySessions = 4;
    reasons.push(`Active injury: intensity capped at 75%, explosive work removed, weekly volume limited.`);
  }

  if (risk.overloadRisk === "high" || risk.shouldReduceIntensity) {
    if (maxIntensity > 0.8) maxIntensity = 0.8;
    submaxBias = true;
    addFlushSession = true;
    reasons.push("Overload risk high: submax bias and flush session added.");
  } else if (risk.overloadRisk === "moderate" || risk.shouldReduceVolume) {
    submaxBias = true;
    reasons.push("Moderate overload risk: submax bias applied.");
  }

  return {
    maxIntensity,
    removeExplosive,
    maxWeeklySessions,
    submaxBias,
    addFlushSession,
    reasons: reasons.length ? reasons : [],
  };
}

/**
 * Apply guardrail cap to a prescribed percentage (for use when calling prescribe()).
 */
export function applyIntensityCap(percentage: number, guardrails: GuardrailOutput): number {
  if (percentage <= 0) return percentage;
  return Math.min(percentage, guardrails.maxIntensity);
}
```

## engine/advisoriesEngine.ts

```ts
/**
 * Daily advisories: training, nutrition, psych, soft tissue (and more).
 * Driven by check-in answers and adaptation level so programme and dashboard can show "today's advisories".
 */

export type AdvisoryCategory = "training" | "nutrition" | "psych" | "soft_tissue" | "recovery";

export type Advisory = {
  category: AdvisoryCategory;
  label: string;
  message: string;
  priority: "high" | "medium" | "low";
};

export type AdvisoryInputs = {
  readiness?: number | null;
  feel?: "good" | "okay" | "poor" | null;
  pain?: "none" | "yes" | null;
  painAreas?: string | null;
  energy?: "low" | "medium" | "high" | null;
  sleep?: "poor" | "okay" | "good" | null;
  /** "reduce" | "normal" | "increase" from adaptation */
  adaptation?: string | null;
  /** Optional: today's session focus for targeted advice */
  sessionFocus?: string | null;
};

function trainingAdvisory(inputs: AdvisoryInputs): Advisory | null {
  const adapt = inputs.adaptation ?? "normal";
  if (adapt === "reduce") {
    return {
      category: "training",
      label: "Training",
      message: "Keep volume moderate today. Session is adapted for recovery — focus on quality over quantity.",
      priority: "high",
    };
  }
  if (adapt === "increase") {
    return {
      category: "training",
      label: "Training",
      message: "You're clear for optional progressions. Add a set or slight load increase if it feels right.",
      priority: "low",
    };
  }
  if ((inputs.readiness ?? 7) < 5) {
    return {
      category: "training",
      label: "Training",
      message: "Consider shortening the session or swapping to lower intensity. Readiness suggests prioritising recovery.",
      priority: "high",
    };
  }
  return {
    category: "training",
    label: "Training",
    message: "Stick to the planned session. Warm up well and respect RPE.",
    priority: "low",
  };
}

function nutritionAdvisory(inputs: AdvisoryInputs): Advisory | null {
  const energy = inputs.energy ?? "medium";
  const sleep = inputs.sleep ?? "good";
  if (energy === "low" || sleep === "poor") {
    return {
      category: "nutrition",
      label: "Nutrition",
      message: "Prioritise protein and hydration today. Consider a balanced meal 1–2 hours before training.",
      priority: "high",
    };
  }
  return {
    category: "nutrition",
    label: "Nutrition",
    message: "Stay on top of hydration and protein spread across the day to support recovery.",
    priority: "low",
  };
}

function psychAdvisory(inputs: AdvisoryInputs): Advisory | null {
  const feel = inputs.feel ?? "okay";
  const adapt = inputs.adaptation ?? "normal";
  if (feel === "poor" || adapt === "reduce") {
    return {
      category: "psych",
      label: "Psych",
      message: "Keep the session under 60 min if possible. No need to push — consistency over intensity today.",
      priority: "high",
    };
  }
  return {
    category: "psych",
    label: "Psych",
    message: "Session is within your capacity. Focus on execution and breathing under load.",
    priority: "low",
  };
}

function softTissueAdvisory(inputs: AdvisoryInputs): Advisory | null {
  const pain = inputs.pain ?? "none";
  const areas = (inputs.painAreas ?? "").toLowerCase();
  const sessionFocus = (inputs.sessionFocus ?? "").toLowerCase();
  if (pain === "yes" && areas) {
    return {
      category: "soft_tissue",
      label: "Soft tissue",
      message: `Consider foam rolling or mobility work for ${areas} before and after the session. Avoid aggravating load.`,
      priority: "high",
    };
  }
  if (sessionFocus.includes("lower") || sessionFocus.includes("leg")) {
    return {
      category: "soft_tissue",
      label: "Soft tissue",
      message: "Pre-session: quads, glutes and hamstrings. Post-session: calves and hip flexors if time.",
      priority: "medium",
    };
  }
  if (sessionFocus.includes("upper") || sessionFocus.includes("push")) {
    return {
      category: "soft_tissue",
      label: "Soft tissue",
      message: "Pre-session: pecs, lats and shoulders. Post-session: triceps and upper back if needed.",
      priority: "medium",
    };
  }
  return {
    category: "soft_tissue",
    label: "Soft tissue",
    message: "5–10 min mobility or foam rolling pre-session will prime the system.",
    priority: "low",
  };
}

function recoveryAdvisory(inputs: AdvisoryInputs): Advisory | null {
  const sleep = inputs.sleep ?? "good";
  if (sleep === "poor") {
    return {
      category: "recovery",
      label: "Recovery",
      message: "Sleep was suboptimal. Prioritise tonight: wind-down, limit screens, consistent bedtime.",
      priority: "high",
    };
  }
  return null;
}

/**
 * Return today's advisories for the given check-in / adaptation inputs.
 */
export function getAdvisories(inputs: AdvisoryInputs): Advisory[] {
  const out: Advisory[] = [];
  const t = trainingAdvisory(inputs);
  if (t) out.push(t);
  const n = nutritionAdvisory(inputs);
  if (n) out.push(n);
  const p = psychAdvisory(inputs);
  if (p) out.push(p);
  const s = softTissueAdvisory(inputs);
  if (s) out.push(s);
  const r = recoveryAdvisory(inputs);
  if (r) out.push(r);
  return out.sort((a, b) => (a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0));
}
```

## engine/behaviourDriftModel.ts

```ts
/**
 * Behavioural drift engine — track engagement and friction.
 * Session completion, RPE inflation, log detail, missed sessions, neutral sentiment.
 * Outputs friction index, compliance velocity, engagement level, simplification recommendation.
 */

export type ComplianceWeek = {
  week: number;
  done: number;
  planned: number;
};

export type DebriefSummary = {
  how_felt: number;
  niggles: string | null;
  ready_next: number;
};

export type BehaviourDriftInputs = {
  /** Last 2–4 weeks: completed vs planned sessions per week */
  compliance_weeks?: ComplianceWeek[];
  /** Recent debriefs (e.g. last 5–10) for sentiment and log detail */
  recent_debriefs?: DebriefSummary[];
  /** Optional: average perceived RPE vs prescribed (e.g. 7.2 vs 7) → inflation if actual > prescribed */
  rpe_inflation?: number; // e.g. 0.2 = 0.2 higher on average
};

export type ComplianceVelocity = "rising" | "stable" | "falling";
export type EngagementLevel = "high" | "moderate" | "low";

export type BehaviourDriftOutput = {
  frictionIndex: number;
  complianceVelocity: ComplianceVelocity;
  engagementLevel: EngagementLevel;
  simplificationRecommended: boolean;
};

const NEUTRAL_KEYWORDS = ["ok", "fine", "same", "n/a", "none", "—", "-", ""];

function isNeutralNiggles(niggles: string | null): boolean {
  if (!niggles || !niggles.trim()) return true;
  const t = niggles.trim().toLowerCase();
  return NEUTRAL_KEYWORDS.some((k) => t === k || t.startsWith(k + " ") || t.endsWith(" " + k));
}

function isNeutralSentiment(how_felt: number, ready_next: number): boolean {
  return how_felt >= 2.5 && how_felt <= 3.5 && ready_next >= 2.5 && ready_next <= 3.5;
}

/**
 * Compute compliance velocity from last weeks vs previous weeks.
 */
function getComplianceVelocity(weeks: ComplianceWeek[]): ComplianceVelocity {
  if (weeks.length < 2) return "stable";
  const recent = weeks.slice(0, 2);
  const older = weeks.slice(2, 4);
  const recentRate =
    recent.reduce((s, w) => s + w.done, 0) / Math.max(1, recent.reduce((s, w) => s + w.planned, 0));
  const olderRate =
    older.length === 0
      ? recentRate
      : older.reduce((s, w) => s + w.done, 0) / Math.max(1, older.reduce((s, w) => s + w.planned, 0));
  const delta = recentRate - olderRate;
  if (delta > 0.1) return "rising";
  if (delta < -0.1) return "falling";
  return "stable";
}

/**
 * Friction index 0–100 from compliance, debrief detail, sentiment, and consecutive misses.
 */
function getFrictionIndex(inputs: BehaviourDriftInputs): number {
  let score = 0;
  const weeks = inputs.compliance_weeks ?? [];
  const debriefs = inputs.recent_debriefs ?? [];

  if (weeks.length > 0) {
    const totalDone = weeks.reduce((s, w) => s + w.done, 0);
    const totalPlanned = weeks.reduce((s, w) => s + w.planned, 0);
    const compliance = totalPlanned > 0 ? totalDone / totalPlanned : 1;
    score += (1 - compliance) * 40;
    const consecutiveMissed = weeks.filter((w) => w.planned > 0 && w.done < w.planned * 0.5).length;
    score += Math.min(20, consecutiveMissed * 8);
  }

  if (debriefs.length > 0) {
    const shortDetail = debriefs.filter((d) => (d.niggles?.length ?? 0) < 4).length;
    score += (shortDetail / debriefs.length) * 15;
    const neutral = debriefs.filter((d) => isNeutralSentiment(d.how_felt, d.ready_next) && isNeutralNiggles(d.niggles)).length;
    score += (neutral / debriefs.length) * 15;
  }

  if (inputs.rpe_inflation != null && inputs.rpe_inflation > 0) {
    score += Math.min(10, inputs.rpe_inflation * 20);
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Engagement level from friction and compliance velocity.
 */
function getEngagementLevel(frictionIndex: number, complianceVelocity: ComplianceVelocity): EngagementLevel {
  if (frictionIndex >= 55 || complianceVelocity === "falling") return "low";
  if (frictionIndex >= 35 || complianceVelocity === "stable") return "moderate";
  return "high";
}

/**
 * Single entry point: compute behaviour drift output.
 */
export function getBehaviourDrift(inputs: BehaviourDriftInputs): BehaviourDriftOutput {
  const weeks = inputs.compliance_weeks ?? [];
  const frictionIndex = getFrictionIndex(inputs);
  const complianceVelocity = getComplianceVelocity(weeks);
  const engagementLevel = getEngagementLevel(frictionIndex, complianceVelocity);
  const simplificationRecommended = frictionIndex >= 50 || engagementLevel === "low";

  return {
    frictionIndex,
    complianceVelocity,
    engagementLevel,
    simplificationRecommended,
  };
}
```

## engine/benchmarkEngine.ts

```ts
/**
 * Benchmark engine: get/set 1RM, round to nearest 2.5kg for prescription.
 * Supports manual updates, timestamp, and future auto-estimation (estimateOneRM).
 */

import type { PerformanceBenchmarks, ExerciseBenchmarkKey, ExerciseBenchmark } from "@/lib/profile/benchmarkSchema";

export function getBenchmarks(profile: { performance_benchmarks?: PerformanceBenchmarks | null }): PerformanceBenchmarks {
  return profile.performance_benchmarks ?? {};
}

/** Alias for getExerciseBenchmark (spec: getBenchmark). */
export function getBenchmark(
  benchmarks: PerformanceBenchmarks,
  key: string
): { oneRM: number | null; estimatedOneRM: number | null; lastUpdated: string | null } {
  return getExerciseBenchmark(benchmarks, key);
}

export function getExerciseBenchmark(
  benchmarks: PerformanceBenchmarks,
  key: string
): { oneRM: number | null; estimatedOneRM: number | null; lastUpdated: string | null } {
  const exercise = benchmarks.exerciseBenchmarks?.[key as ExerciseBenchmarkKey];
  return {
    oneRM: exercise?.oneRM ?? null,
    estimatedOneRM: exercise?.estimatedOneRM ?? null,
    lastUpdated: exercise?.lastUpdated ?? null,
  };
}

/** Get best available 1RM (confirmed oneRM, else estimatedOneRM) */
export function getEffectiveOneRM(
  benchmarks: PerformanceBenchmarks,
  exerciseKey: string
): { value: number; isEstimated: boolean } | null {
  const b = getExerciseBenchmark(benchmarks, exerciseKey);
  if (b.oneRM != null && b.oneRM > 0) return { value: b.oneRM, isEstimated: false };
  if (b.estimatedOneRM != null && b.estimatedOneRM > 0) return { value: b.estimatedOneRM, isEstimated: true };
  return null;
}

/** Round to nearest 2.5 kg for bar loading */
export function roundToNearest2_5(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

/** Working weight from 1RM and percentage (0–1). Returns kg rounded to 2.5. */
export function workingWeightFrom1RM(oneRM: number, percentage: number): number {
  const raw = oneRM * percentage;
  return Math.max(2.5, roundToNearest2_5(raw));
}

const nowIso = () => new Date().toISOString().slice(0, 10);

/**
 * Estimate 1RM from weight and reps (Epley formula).
 * Use for "estimated" 1RM when user enters e.g. 100kg x 5.
 */
export function estimateOneRM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Validate a single benchmark value (strength 1RM, aerobic, or power).
 * Returns null if valid, or an error message.
 */
export function validateBenchmark(
  kind: "strength" | "aerobic" | "power",
  key: string,
  value: number | null
): string | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return "Invalid number";
  if (kind === "strength") {
    if (value < 0 || value > 500) return "1RM should be between 0 and 500 kg";
  }
  if (kind === "aerobic") {
    if (key === "MAS" && (value < 0 || value > 15)) return "MAS typically 0–15 m/s";
    if (key === "vo2max" && (value < 0 || value > 100)) return "VO₂max typically 0–100";
  }
  if (kind === "power") {
    if ((key === "CMJ" || key === "sprint_10m") && value < 0) return "Value must be positive";
  }
  return null;
}

/**
 * Update one exercise benchmark and set last_updated.
 * Returns the new PerformanceBenchmarks object (does not persist to DB).
 */
export function updateBenchmark(
  current: PerformanceBenchmarks,
  exerciseKey: string,
  update: { oneRM?: number | null; estimatedOneRM?: number | null }
): PerformanceBenchmarks {
  const existing = current.exerciseBenchmarks ?? {};
  const exercise = existing[exerciseKey] ?? { oneRM: null, estimatedOneRM: null, lastUpdated: null };
  const nextExercise: ExerciseBenchmark = {
    oneRM: update.oneRM !== undefined ? update.oneRM : exercise.oneRM,
    estimatedOneRM: update.estimatedOneRM !== undefined ? update.estimatedOneRM : exercise.estimatedOneRM,
    lastUpdated: nowIso(),
  };
  return {
    ...current,
    last_updated: nowIso(),
    exerciseBenchmarks: { ...existing, [exerciseKey]: nextExercise },
  };
}
```

## engine/constraintModel.ts

```ts
/**
 * Constraint intelligence — work stress, travel, cognitive load.
 * When volatility rises: reduce bilateral load, increase unilateral tempo,
 * shift intensity distribution, modify weekly density.
 */

export type ConstraintInputs = {
  /** 1–5 scale */
  work_stress?: number | null;
  /** Travel this week */
  travel_week?: boolean | null;
  /** 1–5 scale */
  cognitive_load?: number | null;
  /** Optional: sleep volatility low / medium / high */
  sleep_volatility?: "low" | "medium" | "high" | null;
};

export type VolatilityLevel = "low" | "medium" | "high";

export type ConstraintRecommendations = {
  volatility: VolatilityLevel;
  reduceBilateralLoad: boolean;
  increaseUnilateralTempo: boolean;
  shiftIntensityDistribution: boolean;
  modifyWeeklyDensity: boolean;
  /** Short narrative for coach brief */
  summary: string;
};

/**
 * Compute volatility from constraint inputs (work, travel, cognitive, sleep).
 */
export function constraintVolatility(profile: ConstraintInputs): VolatilityLevel {
  const w = profile.work_stress ?? 0;
  const c = profile.cognitive_load ?? 0;
  const travel = profile.travel_week === true ? 1 : 0;
  const sleepV = profile.sleep_volatility === "high" ? 1 : profile.sleep_volatility === "medium" ? 0.5 : 0;
  const raw = (w / 5) * 0.35 + (c / 5) * 0.35 + travel * 0.2 + sleepV * 0.2;
  if (raw >= 0.6) return "high";
  if (raw >= 0.35) return "medium";
  return "low";
}

/**
 * Recommendations when volatility rises: bilateral reduction, unilateral tempo,
 * intensity shift, weekly density.
 */
export function getConstraintRecommendations(profile: ConstraintInputs): ConstraintRecommendations {
  const vol = constraintVolatility(profile);
  const reduceBilateral = vol === "high" || vol === "medium";
  const increaseUnilateral = vol === "high";
  const shiftIntensity = vol === "high";
  const modifyDensity = vol !== "low";

  let summary = "Constraints are low; full programme supported.";
  if (vol === "medium") {
    summary = "Moderate constraints (work/travel/cognitive load). Consider slightly reduced bilateral volume and more unilateral tempo work.";
  } else if (vol === "high") {
    summary = "High constraint week. Reduce bilateral load, increase unilateral tempo, shift intensity distribution, and consider fewer sessions or shorter density.";
  }

  return {
    volatility: vol,
    reduceBilateralLoad: reduceBilateral,
    increaseUnilateralTempo: increaseUnilateral,
    shiftIntensityDistribution: shiftIntensity,
    modifyWeeklyDensity: modifyDensity,
    summary,
  };
}
```

## engine/decisionLog.ts

```ts
/**
 * Decision log — write programme adjustment events for transparency.
 * Frontend or API calls logDecision; DecisionLog component reads via API.
 */

export type DecisionLogPayload = {
  decisionType: string;
  triggerVariables?: Record<string, unknown>;
  thresholdBreached?: string;
  adjustmentMade: string;
  explanation?: string;
};

/**
 * Insert a decision log entry. Call from API route or server action with Supabase client.
 * Example:
 *   await logDecision(supabase, userId, {
 *     decisionType: "volume_reduction",
 *     triggerVariables: { sleep_trend_pct: -18, rpe_density: "high" },
 *     thresholdBreached: "sleep_trend_below_0.85",
 *     adjustmentMade: "Lower-body volume reduced",
 *     explanation: "Lower-body volume reduced due to sleep trend -18% and rising RPE density.",
 *   });
 */
/** Minimal type for Supabase client used only for insert (avoids strict PostgrestFilterBuilder mismatch). */
type SupabaseInsertClient = {
  from: (table: string) => { insert: (row: unknown) => PromiseLike<{ error: unknown }> };
};

export async function logDecision(
  supabase: SupabaseInsertClient,
  profileId: string,
  payload: DecisionLogPayload
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from("decision_logs")
    .insert({
      profile_id: profileId,
      decision_type: payload.decisionType,
      trigger_variables: payload.triggerVariables ?? {},
      threshold_breached: payload.thresholdBreached ?? null,
      adjustment_made: payload.adjustmentMade,
      explanation: payload.explanation ?? null,
    });
  return { error };
}
```

## engine/fatigueModel.ts

```ts
/**
 * Fatigue model — recovery bandwidth and fatigue score for adaptive programming.
 * Used by programme builder to reduce volume/intensity when recovery is compressed.
 * Phase 2: wire to readiness trends, sleep trend, session density.
 */

export type FatigueInputs = {
  fatigue_score?: number | null;
  readiness_score?: number | null;
  sleep_score?: number | null;
  stress_level?: number | null;
  /** Optional: trailing 7d readiness deltas for trend */
  readiness_trend?: number[] | null;
  /** Optional: sessions completed this week vs planned */
  sessions_done?: number;
  sessions_planned?: number;
};

export type RecoveryBandwidth = "adequate" | "compressed" | "critical";

/**
 * Normalised fatigue score 0–100 (higher = more fatigue).
 * Uses profile fatigue_score if present; else derived from readiness/sleep/stress.
 */
export function fatigueScore(profile: FatigueInputs): number {
  const raw = profile.fatigue_score ?? null;
  if (raw != null && raw >= 0 && raw <= 100) return raw;

  const readiness = profile.readiness_score ?? 70;
  const sleep = profile.sleep_score ?? 70;
  const stress = profile.stress_level ?? 40;
  // Inverse of recovery: low readiness/sleep + high stress → higher fatigue
  const derived = 100 - (readiness * 0.4 + sleep * 0.4 + (100 - stress) * 0.2);
  return Math.max(0, Math.min(100, Math.round(derived)));
}

/**
 * Recovery bandwidth status for narrative and programme decisions.
 * "adequate" → full programme; "compressed" → consider reduce; "critical" → reduce or rest.
 */
export function recoveryBandwidth(profile: FatigueInputs): RecoveryBandwidth {
  const f = fatigueScore(profile);
  if (f >= 70) return "critical";
  if (f >= 50) return "compressed";
  return "adequate";
}

/**
 * Human-readable label for UI (e.g. Weekly Brief).
 */
export function recoveryBandwidthLabel(profile: FatigueInputs): string {
  const b = recoveryBandwidth(profile);
  switch (b) {
    case "adequate":
      return "Adequate";
    case "compressed":
      return "Compressed";
    case "critical":
      return "Critical — prioritise recovery";
    default:
      return "Adequate";
  }
}
```

## engine/identityClassifier.ts

```ts
/**
 * Identity classifier — Neural Dominant, Aerobic Deficit, Recovery Limited, Hybrid Balanced.
 * Classification logic based on strength vs aerobic gap, recovery bandwidth, trend velocity.
 * Re-exports from identityModel for modular engine surface; spec labels aligned.
 */

import type { IdentityType } from "@/lib/profile/identityModel";
import { classifyIdentity } from "@/lib/profile/identityModel";

export type IdentityLabel =
  | "Neural Dominant"
  | "Aerobic Deficit"
  | "Recovery Limited"
  | "Hybrid Balanced";

/** Map full identity type to short spec label for UI. */
export function identityToSpecLabel(type: IdentityType): IdentityLabel {
  if (type === "Neural Dominant Responder") return "Neural Dominant";
  if (type === "Aerobic Deficit Profile") return "Aerobic Deficit";
  if (type === "Recovery-Limited Performer") return "Recovery Limited";
  if (type === "Hybrid Balanced Responder" || type === "Load Carriage Focus") return "Hybrid Balanced";
  return "Hybrid Balanced";
}

export type IdentityClassifierInputs = Parameters<typeof classifyIdentity>[0];

/**
 * Classify identity and return spec-aligned label.
 * Uses strength vs aerobic gap, recovery bandwidth, friction/trend velocity.
 */
export function classifyIdentitySpec(profile: IdentityClassifierInputs): IdentityLabel {
  const full = classifyIdentity(profile);
  return identityToSpecLabel(full);
}

export { classifyIdentity };
export type { IdentityType };
```

## engine/injuryMemoryEngine.ts

```ts
/**
 * Persistent injury memory engine.
 * Log, update, resolve injuries; classify and calculate risk.
 * Used by guardrails and programme modification.
 */

export type InjuryRiskLevel = "low" | "moderate" | "high";

export type InjuryEntry = {
  id: string;
  profile_id: string;
  body_part: string;
  severity: number;
  context: string | null;
  first_reported: string;
  last_reported: string;
  resolved: boolean;
  resolved_at: string | null;
  classification: string | null;
  risk_level: InjuryRiskLevel;
};

export type InjuryPayload = {
  body_part: string;
  severity: number;
  context?: string | null;
  classification?: string | null;
};

/** Classify injury from context/body part (e.g. tendon irritation, instability, overload). */
export function classifyInjury(context: string, bodyPart?: string): string {
  const c = (context ?? "").toLowerCase();
  const b = (bodyPart ?? "").toLowerCase();
  if (c.includes("tendon") || c.includes("tendin") || b.includes("patella") && c.includes("front")) return "tendon irritation";
  if (c.includes("instab") || c.includes("giving way") || c.includes("buckle")) return "instability";
  if (c.includes("overload") || c.includes("load") || c.includes("volume")) return "overload";
  if (c.includes("stiff") || c.includes("tight")) return "stiffness";
  if (c.includes("sharp") || c.includes("acute")) return "acute irritation";
  return "general discomfort";
}

/**
 * Calculate risk_level from severity (1–10) and optional report count (frequency).
 * Higher severity + more reports → higher risk.
 */
export function calculateInjuryRisk(severity: number, reportCount: number = 1): InjuryRiskLevel {
  const s = Math.max(1, Math.min(10, severity));
  const f = Math.max(1, reportCount);
  const score = (s / 10) * 0.7 + Math.min(1, f / 4) * 0.3;
  if (score >= 0.6) return "high";
  if (score >= 0.35) return "moderate";
  return "low";
}

/** Filter to active (unresolved) injuries. */
export function getActiveInjuries(entries: InjuryEntry[]): InjuryEntry[] {
  return entries.filter((e) => !e.resolved);
}

/** Build payload for logging a new injury (sets first_reported, last_reported, risk_level). */
export function logInjury(payload: InjuryPayload, existingCountForBodyPart: number = 0): Omit<InjuryEntry, "id" | "profile_id"> & { risk_level: InjuryRiskLevel } {
  const now = new Date().toISOString();
  const classification = payload.classification ?? classifyInjury(payload.context ?? "", payload.body_part);
  const risk_level = calculateInjuryRisk(payload.severity, existingCountForBodyPart + 1);
  return {
    body_part: payload.body_part,
    severity: payload.severity,
    context: payload.context ?? null,
    first_reported: now,
    last_reported: now,
    resolved: false,
    resolved_at: null,
    classification,
    risk_level,
  };
}

/** Build payload for updating an injury (e.g. re-report: update last_reported, optionally severity/context). */
export function updateInjury(
  existing: InjuryEntry,
  updates: Partial<Pick<InjuryPayload, "severity" | "context">>,
  reportCount: number
): Partial<InjuryEntry> {
  const now = new Date().toISOString();
  const severity = updates.severity ?? existing.severity;
  const context = updates.context ?? existing.context;
  const classification = updates.context ? classifyInjury(updates.context, existing.body_part) : existing.classification;
  const risk_level = calculateInjuryRisk(severity, reportCount);
  return {
    last_reported: now,
    severity,
    context,
    classification,
    risk_level,
  };
}

/** Build payload for resolving an injury (set resolved, resolved_at). */
export function resolveInjury(): Pick<InjuryEntry, "resolved" | "resolved_at"> {
  const now = new Date().toISOString();
  return {
    resolved: true,
    resolved_at: now,
  };
}
```

## engine/injuryModifier.ts

```ts
/**
 * Injury-based programme modification (guardrail logic).
 * If knee pain: reduce knee-dominant loading, remove plyometrics, limit depth, hip-dominant emphasis.
 * If shoulder: remove overhead loading, modify pressing volume, scapular stability.
 * If tendon: reduce eccentric velocity, increase isometric exposure.
 * All changes should be logged via DecisionLog.
 */

import type { InjuryEntry } from "./injuryMemoryEngine";
import { getActiveInjuries } from "./injuryMemoryEngine";

export type InjuryModifierFlags = {
  reduceKneeDominant: boolean;
  removePlyometrics: boolean;
  limitDepth: boolean;
  hipDominantEmphasis: boolean;
  removeOverheadLoading: boolean;
  modifyPressingVolume: boolean;
  scapularStabilityFocus: boolean;
  reduceEccentricVelocity: boolean;
  increaseIsometricExposure: boolean;
  /** Human-readable summary for decision log */
  summary: string[];
};

const BODY_KNEE = ["knee", "knees", "patella", "patellar", "quad", "quads"];
const BODY_SHOULDER = ["shoulder", "shoulders", "rotator", "ac", "glenohumeral"];
const BODY_LOWER = ["hip", "back", "lower back", "lumbar", "hamstring", "calf", "ankle"];

function bodyPartMatches(bodyPart: string, list: string[]): boolean {
  const b = bodyPart.toLowerCase();
  return list.some((k) => b.includes(k));
}

function hasTendonClassification(entries: InjuryEntry[]): boolean {
  return entries.some((e) => (e.classification ?? "").toLowerCase().includes("tendon"));
}

/**
 * Compute programme modification flags from active injuries.
 * Caller applies these when building sessions and logs via logDecision.
 */
export function getInjuryModifiers(entries: InjuryEntry[]): InjuryModifierFlags {
  const active = getActiveInjuries(entries);
  const summary: string[] = [];
  const flags: InjuryModifierFlags = {
    reduceKneeDominant: false,
    removePlyometrics: false,
    limitDepth: false,
    hipDominantEmphasis: false,
    removeOverheadLoading: false,
    modifyPressingVolume: false,
    scapularStabilityFocus: false,
    reduceEccentricVelocity: false,
    increaseIsometricExposure: false,
    summary: [],
  };

  if (active.length === 0) {
    flags.summary = [];
    return flags;
  }

  const kneeInjuries = active.filter((e) => bodyPartMatches(e.body_part, BODY_KNEE));
  const shoulderInjuries = active.filter((e) => bodyPartMatches(e.body_part, BODY_SHOULDER));
  const tendon = hasTendonClassification(active);

  if (kneeInjuries.length > 0) {
    flags.reduceKneeDominant = true;
    flags.removePlyometrics = true;
    flags.limitDepth = true;
    flags.hipDominantEmphasis = true;
    summary.push("Knee load reduced: less knee-dominant work, no plyometrics, depth limited, hip-dominant emphasis.");
  }

  if (shoulderInjuries.length > 0) {
    flags.removeOverheadLoading = true;
    flags.modifyPressingVolume = true;
    flags.scapularStabilityFocus = true;
    summary.push("Shoulder protection: overhead loading removed, pressing volume modified, scapular stability emphasised.");
  }

  if (tendon) {
    flags.reduceEccentricVelocity = true;
    flags.increaseIsometricExposure = true;
    summary.push("Tendon-friendly: reduced eccentric velocity, increased isometric exposure.");
  }

  flags.summary = summary;
  return flags;
}
```

## engine/momentumEngine.ts

```ts
/**
 * Momentum engine — adaptation velocity and friction index.
 * Phase 2: compute from session_logs + check-ins; persist or derive on demand.
 * Feeds identity classifier and programme bias.
 */

export type MomentumInputs = {
  momentum?: string | null; // e.g. "rising" | "stable" | "declining"
  /** Sessions completed vs planned last 2–4 weeks (optional) */
  compliance_weeks?: { done: number; planned: number }[] | null;
  /** Optional: readiness trend (e.g. last 7 days) */
  readiness_trend?: number[] | null;
};

/**
 * Adaptation velocity: rate of performance/readiness change.
 * Phase 2: from snapshots or readiness_trend; Phase 3: from benchmark deltas.
 */
export function adaptationVelocity(profile: MomentumInputs): "rising" | "stable" | "declining" {
  const m = (profile.momentum ?? "").toLowerCase();
  if (m === "rising" || m === "declining" || m === "stable") return m as "rising" | "stable" | "declining";

  const trend = profile.readiness_trend ?? [];
  if (trend.length < 3) return "stable";
  const recent = trend.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const older = trend.slice(0, -3).length ? trend.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, trend.length - 3) : recent;
  const delta = recent - older;
  if (delta > 3) return "rising";
  if (delta < -3) return "declining";
  return "stable";
}

/**
 * Friction index 0–1: compliance + behavioural drift (higher = more friction).
 * Phase 2: from compliance_weeks (missed sessions, drop-off).
 */
export function frictionIndex(profile: MomentumInputs): number {
  const weeks = profile.compliance_weeks ?? [];
  if (weeks.length === 0) return 0;
  const totalDone = weeks.reduce((s, w) => s + w.done, 0);
  const totalPlanned = weeks.reduce((s, w) => s + w.planned, 0);
  if (totalPlanned === 0) return 0;
  const compliance = totalDone / totalPlanned;
  return Math.max(0, 1 - compliance);
}
```

## engine/nutritionModel.ts

```ts
/**
 * Full macro engine — adaptive performance nutrition intelligence.
 * Training-linked carb periodisation, injury-aware modulation, recovery adjustment,
 * behaviour-aware simplification. Outputs structured targets and evidence-based guidance.
 */

import type { RecoveryBandwidth } from "./fatigueModel";

export type TrainingBlockType = "neural" | "hypertrophy" | "aerobic";
export type NutritionGoal = "gain" | "maintain" | "recomposition" | "endurance_bias";
export type SessionIntensity = "low" | "moderate" | "high";

export type NutritionInputs = {
  /** kg; if null, targets use default weight for g/kg and calories may be null */
  bodyweight_kg?: number | null;
  goal: NutritionGoal;
  /** Sessions per week */
  weekly_volume: number;
  /** Today's session intensity */
  session_intensity: SessionIntensity;
  /** Training block type for today */
  training_block_type: TrainingBlockType;
  /** Active (unresolved) injuries present */
  active_injuries: boolean;
  /** Tendon-classified injury (for collagen protocol) */
  tendon_injury?: boolean;
  recovery_bandwidth: RecoveryBandwidth;
  readiness_score: number;
  /** 0–100; high = simplify guidance */
  behaviour_drift_friction?: number;
  deload_week?: boolean;
};

export type MacroTarget = { g: number; gPerKg: number };

export type NutritionOutput = {
  totalCalories: number | null;
  proteinTarget: MacroTarget;
  carbTarget: MacroTarget;
  fatTarget: MacroTarget;
  carbTimingStrategy: string;
  intraSessionFuel: string;
  postSessionRecovery: string;
  hydrationStrategy: string;
  sodiumAdjustment: number;
  omega3Recommendation: string;
  creatineRecommendation: string;
  collagenProtocol: string | null;
  explanation: string;
  /** Numeric hydration target (L) for UI */
  hydrationLitres?: number;
  /** When behaviour drift is high, guidance is simplified */
  simplified?: boolean;
};

const DEFAULT_WEIGHT_KG = 75;

/**
 * Full adaptive macro and fueling guidance.
 */
export function getNutritionGuidance(inputs: NutritionInputs): NutritionOutput {
  const {
    bodyweight_kg,
    goal,
    weekly_volume,
    session_intensity,
    training_block_type,
    active_injuries,
    tendon_injury = false,
    recovery_bandwidth,
    readiness_score,
    behaviour_drift_friction = 0,
    deload_week = false,
  } = inputs;

  const bw = bodyweight_kg ?? DEFAULT_WEIGHT_KG;
  const hasWeight = bodyweight_kg != null && bodyweight_kg > 0;
  const simplified = behaviour_drift_friction >= 50;

  // —— Protein (injury → up to 2.2 g/kg) ——
  const proteinPerKg = active_injuries ? 2.2 : training_block_type === "aerobic" ? 1.5 : 1.8;
  const proteinG = Math.round(proteinPerKg * bw);
  const proteinTarget: MacroTarget = { g: proteinG, gPerKg: Math.round(proteinPerKg * 100) / 100 };

  // —— Carbs ——
  // High neural → higher carbs; aerobic density → steady distribution; low readiness → moderate
  const neuralHigh = training_block_type === "neural" && session_intensity === "high";
  const aerobicDense = training_block_type === "aerobic" && weekly_volume >= 4;
  let carbPerKg = 4;
  if (neuralHigh) carbPerKg = 5.5;
  else if (aerobicDense) carbPerKg = 5;
  if (readiness_score > 75) carbPerKg *= 1.1;
  if (readiness_score < 50) carbPerKg *= 0.85; // moderate carbs, protein maintained
  if (simplified) carbPerKg = Math.min(carbPerKg, 4); // simplify
  const carbG = Math.round(carbPerKg * bw);
  const carbTarget: MacroTarget = { g: carbG, gPerKg: Math.round(carbPerKg * 100) / 100 };

  // —— Fat ——
  const fatPerKg = goal === "endurance_bias" ? 0.9 : 1.0;
  const fatG = Math.round(Math.max(45, fatPerKg * bw));
  const fatTarget: MacroTarget = { g: fatG, gPerKg: Math.round(fatPerKg * 100) / 100 };

  // —— Total calories (deload taper; recovery +5%) ——
  let totalCalories: number | null = null;
  if (hasWeight) {
    let kcal = proteinG * 4 + carbG * 4 + fatG * 9;
    if (recovery_bandwidth === "compressed" || recovery_bandwidth === "critical") kcal *= 1.05;
    if (deload_week) kcal *= 0.92;
    if (goal === "gain") kcal *= 1.05;
    if (goal === "recomposition") kcal *= 0.98;
    totalCalories = Math.round(kcal);
  }

  // —— Carb timing ——
  let carbTimingStrategy: string;
  if (neuralHigh) {
    carbTimingStrategy = "Higher carbs pre-session (1–1.5 g/kg 60–90 min prior) and post-session (1 g/kg within 2 h) for glycogen and CNS.";
  } else if (aerobicDense) {
    carbTimingStrategy = "Steady carb distribution across the day; no single large spike. Support sustained aerobic demand.";
  } else if (readiness_score < 50) {
    carbTimingStrategy = "Moderate carbs; prioritise around session only. Maintain protein at target.";
  } else {
    carbTimingStrategy = "Distribute carbs across 3–4 feedings; bias around training window.";
  }
  if (simplified) carbTimingStrategy = "Keep carbs around training. No strict timing rules.";

  // —— Intra-session fuel ——
  let intraSessionFuel: string;
  if (session_intensity === "high" && !simplified) {
    intraSessionFuel = "Optional: 30–60 g carbohydrate per hour for sessions > 90 min. Electrolytes if high sweat.";
  } else if (training_block_type === "aerobic" && weekly_volume >= 4) {
    intraSessionFuel = "30–60 g/hr for sessions > 90 min. Steady intake preferred over bolus.";
  } else {
    intraSessionFuel = "Not required for typical session length. Hydration and electrolytes if needed.";
  }
  if (simplified) intraSessionFuel = "Hydration focus. Add carbs only if session long or you feel low.";

  // —— Post-session recovery ——
  let postSessionRecovery: string;
  if (neuralHigh) {
    postSessionRecovery = "1 g/kg carb + 0.25–0.3 g/kg protein within 2 h. Supports glycogen and MPS.";
  } else if (active_injuries) {
    postSessionRecovery = "Protein-first (30–40 g); adequate carbs. Supports repair and adaptation.";
  } else {
    postSessionRecovery = "Protein 30–40 g; moderate carbs. Full meal within 2 h acceptable.";
  }
  if (simplified) postSessionRecovery = "Protein-rich meal within 2 h. Don't skip recovery eating.";

  // —— Hydration ——
  let hydrationLitres = 2.5;
  if (training_block_type === "aerobic" && weekly_volume >= 4) hydrationLitres += 0.5;
  if (session_intensity === "high") hydrationLitres += 0.3;
  hydrationLitres = Math.round(hydrationLitres * 10) / 10;
  const hydrationStrategy =
    hydrationLitres +
    " L baseline. Increase on high-intensity or long sessions. Spread intake; small amounts pre/during/post.";

  // —— Sodium ——
  let sodiumAdjustment = 0;
  if (session_intensity === "high") sodiumAdjustment += 1;
  if (training_block_type === "aerobic" && session_intensity !== "low") sodiumAdjustment += 0.5;
  sodiumAdjustment = Math.round(sodiumAdjustment * 10) / 10;

  // —— Omega-3 ——
  let omega3Recommendation: string;
  if (recovery_bandwidth === "compressed" || recovery_bandwidth === "critical") {
    omega3Recommendation = "2–3 g EPA+DHA daily. Supports recovery and inflammatory balance.";
  } else if (active_injuries) {
    omega3Recommendation = "2–3 g EPA+DHA. Evidence for modulation of inflammatory response.";
  } else {
    omega3Recommendation = "1–2 g EPA+DHA daily if not consistently hitting fatty fish. Optional but supported.";
  }

  // —— Creatine ——
  const creatineRecommendation =
    "3–5 g creatine monohydrate daily. Evidence for strength and power; timing non-critical. Contraindicated only in specific medical conditions.";

  // —— Collagen (tendon injury) ——
  let collagenProtocol: string | null = null;
  if (tendon_injury) {
    collagenProtocol =
      "10–15 g collagen (or gelatin) with 30–60 mg vitamin C, 30–60 min before tendon-loading session. Evidence for tendon matrix support.";
  }

  // —— Explanation (concise) ——
  const parts: string[] = [];
  if (neuralHigh) parts.push("Neural day: higher carbs pre/post and optional intra-session.");
  if (aerobicDense) parts.push("Aerobic density: steady carb distribution and hydration.");
  if (deload_week) parts.push("Deload: slight caloric taper.");
  if (active_injuries) parts.push("Injury: protein at 2.2 g/kg; collagen protocol if tendon.");
  if (readiness_score < 50) parts.push("Low readiness: moderate carbs, protein maintained.");
  if (simplified) parts.push("Simplified guidance due to engagement; focus on protein minimum and recovery.");
  if (recovery_bandwidth !== "adequate") parts.push("Recovery compressed: kcal and omega-3 emphasis.");
  const explanation = parts.length > 0 ? parts.join(" ") : "Targets aligned to training and recovery.";

  const output: NutritionOutput = {
    totalCalories,
    proteinTarget,
    carbTarget,
    fatTarget,
    carbTimingStrategy,
    intraSessionFuel,
    postSessionRecovery,
    hydrationStrategy,
    sodiumAdjustment,
    omega3Recommendation,
    creatineRecommendation,
    collagenProtocol,
    explanation,
    hydrationLitres,
  };
  if (simplified) output.simplified = true;
  return output;
}

/** Legacy shape: flat g targets + dailyCaloriesTarget, fuelingStrategy, recoveryFocus for backward compatibility. */
export type NutritionOutputLegacy = {
  dailyCaloriesTarget: number | null;
  carbTarget: number;
  proteinTarget: number;
  proteinTargetRange?: [number, number];
  fatTarget: number;
  hydrationTarget: number;
  sodiumAdjustment: number;
  fuelingStrategy: string;
  recoveryFocus: string;
};

export function getNutritionGuidanceLegacy(inputs: NutritionInputs): NutritionOutputLegacy {
  const out = getNutritionGuidance(inputs);
  const bw = inputs.bodyweight_kg ?? DEFAULT_WEIGHT_KG;
  return {
    dailyCaloriesTarget: out.totalCalories,
    carbTarget: out.carbTarget.g,
    proteinTarget: out.proteinTarget.g,
    proteinTargetRange: inputs.active_injuries
      ? [Math.round(1.8 * bw), Math.round(2.2 * bw)]
      : undefined,
    fatTarget: out.fatTarget.g,
    hydrationTarget: out.hydrationLitres ?? 2.5,
    sodiumAdjustment: out.sodiumAdjustment,
    fuelingStrategy: out.carbTimingStrategy + " " + out.postSessionRecovery,
    recoveryFocus: out.omega3Recommendation + (out.collagenProtocol ? " " + out.collagenProtocol : ""),
  };
}
```

## engine/prescriptionEngine.ts

```ts
/**
 * Prescription engine: convert percentage to weight (from 1RM) or fallback to RPE.
 * Used by programme cards for clean "3x5 @ 70% (105kg)" or "3x5 @ RPE 7" display.
 */

import type { PerformanceBenchmarks } from "@/lib/profile/benchmarkSchema";
import { EXERCISE_KEY_TO_BENCHMARK } from "@/lib/profile/benchmarkSchema";
import { getEffectiveOneRM, workingWeightFrom1RM } from "./benchmarkEngine";

function benchmarkKeyFor(exerciseKey: string): string {
  return EXERCISE_KEY_TO_BENCHMARK[exerciseKey] ?? exerciseKey;
}

export type PrescriptionResult = {
  display: string;
  isEstimated?: boolean;
};

/**
 * Prescribe one exercise line for programme card.
 * - If profile has valid 1RM (or estimated): "3x5 @ 70% (105kg)" or "(105kg estimated)"
 * - Else: "3x5 @ RPE 7"
 */
export function prescribe(
  benchmarks: PerformanceBenchmarks,
  exerciseKey: string,
  options: {
    sets: number;
    reps: string; // e.g. "5" or "3–5"
    percentage?: number; // 0–1, e.g. 0.7 for 70%
    rpeFallback: string; // e.g. "7" or "7–8"
  }
): PrescriptionResult {
  const { sets, reps, percentage = 0.7, rpeFallback } = options;
  const bmKey = benchmarkKeyFor(exerciseKey);
  const effective = getEffectiveOneRM(benchmarks, bmKey);

  if (effective && percentage > 0) {
    const kg = workingWeightFrom1RM(effective.value, percentage);
    const pct = Math.round(percentage * 100);
    const estTag = effective.isEstimated ? " (estimated)" : "";
    return {
      display: `${sets}×${reps} @ ${pct}% (${kg}kg)${estTag}`,
      isEstimated: effective.isEstimated,
    };
  }

  return {
    display: `${sets}×${reps} @ RPE ${rpeFallback}`,
  };
}

/** Aerobic prescription: if MAS exists use speed/HR zone; else RPE or conversational pace. */
export type AerobicPrescriptionResult = {
  display: string;
  /** e.g. "4.8 m/s" or "Zone 2" */
  zoneOrSpeed?: string;
};

export function prescribeAerobic(
  benchmarks: PerformanceBenchmarks,
  options: {
    durationMinutes: number;
    zoneLabel?: string; // e.g. "Zone 2"
    /** Percentage of MAS for pace (e.g. 0.7 for easy) */
    masFraction?: number;
    rpeFallback?: string; // e.g. "RPE 4" or "Conversational"
  }
): AerobicPrescriptionResult {
  const { durationMinutes, zoneLabel, masFraction = 0.7, rpeFallback = "Conversational pace" } = options;
  const aerobic = benchmarks.aerobicBenchmarks;
  const mas = aerobic?.MAS ?? null;

  if (mas != null && mas > 0 && (zoneLabel || masFraction > 0)) {
    const speed = masFraction * mas;
    const speedRounded = Math.round(speed * 10) / 10;
    const zone = zoneLabel ?? `~${Math.round(masFraction * 100)}% MAS`;
    return {
      display: `${durationMinutes} min ${zone} (${speedRounded} m/s)`,
      zoneOrSpeed: `${speedRounded} m/s`,
    };
  }

  return {
    display: `${durationMinutes} min ${rpeFallback}`,
  };
}
```

## engine/riskIndex.ts

```ts
/**
 * Risk index — fatigue risk and adaptation risk for programme adjustments.
 * Models: sleep trend, RPE inflation, eccentric density, weekly load clustering, mobility suppression.
 * Phase 2: programme builder uses these to reduce load or shift structure.
 * Phase 3: forecasting (e.g. next 7 days risk).
 */

import type { FatigueInputs } from "./fatigueModel";
import { fatigueScore, recoveryBandwidth } from "./fatigueModel";

export type RiskLevel = "low" | "moderate" | "high";
export type RecoveryTrend = "rising" | "stable" | "decreasing";

export type RiskSignals = {
  fatigueRisk: number; // 0–1, higher = more risk
  adaptationRisk: number; // 0–1, capacity to adapt vs overload
  shouldReduceVolume: boolean;
  shouldReduceIntensity: boolean;
  /** Spec: overload risk (training load vs recovery) */
  overloadRisk: RiskLevel;
  /** Spec: neural / CNS strain */
  neuralStrain: RiskLevel;
  /** Spec: recovery bandwidth trend */
  recoveryCompression: RecoveryTrend;
};

/**
 * Compute fatigue risk (0–1) from fatigue score and recovery bandwidth.
 */
export function fatigueRisk(profile: FatigueInputs): number {
  const f = fatigueScore(profile);
  const band = recoveryBandwidth(profile);
  if (band === "critical") return 0.9;
  if (band === "compressed") return 0.6 + (f - 50) / 100;
  return Math.min(1, f / 80);
}

/**
 * Adaptation risk: likelihood that current load will exceed recovery.
 * Uses fatigue + optional session density / compliance (Phase 2).
 */
export function adaptationRisk(profile: FatigueInputs): number {
  const fr = fatigueRisk(profile);
  return fr * 0.9; // Can add compliance/session-density factor later
}

function toLevel(v: number): RiskLevel {
  if (v >= 0.7) return "high";
  if (v >= 0.4) return "moderate";
  return "low";
}

/**
 * Recovery compression trend from optional readiness_trend (last 7d).
 * "decreasing" = recovery bandwidth shrinking; "rising" = improving; "stable" = no clear trend.
 */
function recoveryCompressionTrend(profile: FatigueInputs): RecoveryTrend {
  const trend = profile.readiness_trend ?? [];
  if (trend.length < 4) return "stable";
  const recent = trend.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const older = trend.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, trend.length - 3);
  const delta = recent - older;
  if (delta <= -5) return "decreasing";
  if (delta >= 5) return "rising";
  return "stable";
}

/**
 * Single call for all risk signals used by programme builder.
 * Surfaces overloadRisk, neuralStrain, recoveryCompression for dashboard/brief.
 */
export function getRiskSignals(profile: FatigueInputs): RiskSignals {
  const fr = fatigueRisk(profile);
  const ar = adaptationRisk(profile);
  const band = recoveryBandwidth(profile);
  return {
    fatigueRisk: fr,
    adaptationRisk: ar,
    shouldReduceVolume: fr >= 0.6,
    shouldReduceIntensity: fr >= 0.75,
    overloadRisk: toLevel(fr),
    neuralStrain: band === "critical" ? "high" : band === "compressed" ? "moderate" : "low",
    recoveryCompression: recoveryCompressionTrend(profile),
  };
}
```

## engine/systemBias.ts

```ts
/**
 * System bias — classify user's dominant system (strength / aerobic / hybrid)
 * for narrative (Weekly Brief) and programme emphasis.
 * Phase 2: identity model can refine further.
 */

export type SystemBiasInputs = {
  aerobic_score?: number | null;
  strength_upper?: number | null;
  strength_lower?: number | null;
  focus?: string | null;
  programme_type?: string | null; // e.g. "hybrid" | "strength" | "load_carriage_endurance"
};

export type SystemBiasLabel =
  | "Strength-dominant"
  | "Aerobic-dominant"
  | "Hybrid balanced"
  | "Load carriage / endurance"
  | "Neural / power";

/**
 * Classify current system bias for "System bias" line in Weekly Brief
 * and for programme emphasis (e.g. more Zone 2 if aerobic-deficit).
 */
export function classifySystemBias(profile: SystemBiasInputs): SystemBiasLabel {
  const focus = (profile.focus ?? profile.programme_type ?? "").toLowerCase();
  if (focus.includes("load") || focus.includes("endurance")) return "Load carriage / endurance";
  if (focus.includes("power") || focus.includes("neural")) return "Neural / power";
  if (focus.includes("strength")) return "Strength-dominant";
  if (focus.includes("aerobic") || focus.includes("cardio")) return "Aerobic-dominant";

  const a = profile.aerobic_score ?? 60;
  const s = (Number(profile.strength_upper ?? 60) + Number(profile.strength_lower ?? 60)) / 2;
  const diff = s - a;
  if (diff > 15) return "Strength-dominant";
  if (diff < -15) return "Aerobic-dominant";
  return "Hybrid balanced";
}

/**
 * Short narrative phrase for Weekly Brief (e.g. "Strength-dominant; aerobic floor building").
 */
export function systemBiasPhrase(profile: SystemBiasInputs): string {
  const bias = classifySystemBias(profile);
  const a = profile.aerobic_score ?? 60;
  if (bias === "Strength-dominant" && a < 65) return "Strength-dominant; aerobic floor building";
  if (bias === "Aerobic-dominant") return "Aerobic-dominant; strength maintenance";
  if (bias === "Hybrid balanced") return "Hybrid balanced; concurrent development";
  return bias;
}
```

## engine/weeklyBriefGenerator.ts

```ts
/**
 * Weekly Strategic Brief generator — coach-voice summary before each training week.
 * Pulls from risk index, momentum, fatigue, system bias, identity.
 * Feels like a coach speaking.
 */

import type { FatigueInputs } from "./fatigueModel";
import { recoveryBandwidthLabel } from "./fatigueModel";
import { getRiskSignals } from "./riskIndex";
import { systemBiasPhrase } from "./systemBias";
import type { SystemBiasInputs } from "./systemBias";

export type WeeklyBriefData = {
  phaseIntent: string;
  systemBias: string;
  primaryLimiter: string;
  recoveryBandwidth: string;
  whyThisWeek: string;
  weekNumber?: number;
};

export type WeeklyBriefInputs = FatigueInputs & SystemBiasInputs & {
  primary_limiter?: string | null;
  current_week?: number | null;
  /** Phase label e.g. "Accumulation" | "Intensification" | "Overreach" | "Deload" */
  phase?: string | null;
  /** Macrocycle e.g. "GPP" | "SPP" | "Recovery" */
  macrocycle?: string | null;
};

function getPhaseIntent(phase: string, macrocycle: string): string {
  if (phase === "Deload") return "Recovery — reduced volume and intensity to consolidate and supercompensate.";
  if (phase === "Overreach") return "SPP — short overreach before taper or deload.";
  if (phase === "Intensification") return "SPP — intensity emphasis, volume moderated.";
  if (macrocycle === "GPP") return "GPP — building aerobic floor and work capacity.";
  return "Accumulation — volume and work capacity focus.";
}

/**
 * Generate the weekly brief object for WeeklyBrief component.
 * Coach-voice: "This week biases aerobic density while stabilising neural output. Sleep variability narrowed recovery bandwidth."
 */
export function generateWeeklyBrief(profile: WeeklyBriefInputs): WeeklyBriefData {
  const phase = profile.phase ?? "Accumulation";
  const macrocycle = profile.macrocycle ?? "GPP";
  const phaseIntent = getPhaseIntent(phase, macrocycle);
  const systemBias = systemBiasPhrase(profile);
  const primaryLimiter = profile.primary_limiter ?? "—";
  const recoveryBandwidth = recoveryBandwidthLabel(profile);
  const risk = getRiskSignals(profile);

  let whyThisWeek: string;
  if (recoveryBandwidth.startsWith("Critical") || recoveryBandwidth === "Compressed") {
    whyThisWeek = "Recovery bandwidth is limited. Volume and intensity are moderated to protect adaptation and reduce injury risk. ";
  } else if (risk.recoveryCompression === "decreasing") {
    whyThisWeek = "This week biases aerobic density while stabilising neural output. Sleep variability narrowed recovery bandwidth. ";
  } else if (risk.overloadRisk === "moderate" || risk.overloadRisk === "high") {
    whyThisWeek = "Load is sitting high relative to recovery. This week holds structure and prioritises quality over density. ";
  } else {
    whyThisWeek = "This week maintains the planned structure. Recovery bandwidth supports the planned load. ";
  }
  whyThisWeek += `${phaseIntent} ${systemBias}.`;

  return {
    phaseIntent,
    systemBias,
    primaryLimiter,
    recoveryBandwidth,
    whyThisWeek,
    weekNumber: profile.current_week ?? undefined,
  };
}
```

## hooks/usePerformanceForecast.ts

```ts
"use client";

import {
  extractTrend,
  generateProjection,
  calculateConfidence,
} from "@/lib/forecastEngine";
import type { ForecastResult } from "@/types/forecast";

const DEFAULT_WEEKS_FORWARD = 8;
const DEFAULT_DECAY_CONSTANT = 0.12;
const CONSISTENCY_MIN = 0.8;
const CONSISTENCY_MAX = 1.1;

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance =
    arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function usePerformanceForecast(
  historicalData: number[],
  adherence: number,
  consistencyScore: number,
  weeksForward: number = DEFAULT_WEEKS_FORWARD
): ForecastResult {
  const weeks = Math.min(Math.max(historicalData.length, 2), 12);
  const slope = extractTrend(historicalData, weeks);
  const volatility = stdDev(historicalData);
  const adherenceClamped = Math.max(0, Math.min(1, adherence));
  const consistencyFactor =
    CONSISTENCY_MIN +
    (CONSISTENCY_MAX - CONSISTENCY_MIN) * Math.max(0, Math.min(1, consistencyScore / 100));
  const currentValue =
    historicalData.length > 0
      ? historicalData[historicalData.length - 1]
      : 0;

  const projected = generateProjection(
    currentValue,
    slope,
    weeksForward,
    consistencyFactor,
    DEFAULT_DECAY_CONSTANT
  );

  const confidence = calculateConfidence(
    historicalData,
    adherenceClamped,
    volatility
  );

  return {
    historical: [...historicalData],
    projected,
    slope,
    confidence,
  };
}
```

## lib/adaptive/adaptiveController.ts

```ts
/**
 * Adaptive Training Controller — combines all adaptive systems.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI.
 */

import { analyseReadiness, type ReadinessAnalysisInput } from "./readinessAnalysis";
import { detectAthleteState } from "./athleteState";
import { computeTrainingAdjustment, type SessionType } from "./trainingAdjustment";
import { recommendSubstitutions, type ExerciseSubstitutionInput } from "./exerciseSubstitution";
import { parseSessionFeedback } from "./sessionFeedbackParser";

export type AdaptiveControllerInput = {
  /** Inputs for readiness analysis */
  readiness: ReadinessAnalysisInput;
  /** Planned session type (red | green | recovery) */
  plannedSessionType: SessionType;
  /** Optional: planned exercise names */
  plannedExercises?: string[];
  /** Optional: athlete written feedback (e.g. "Knee pain after split squats") */
  athleteFeedback?: string;
  /** Optional: has plyometrics in session */
  hasPlyometrics?: boolean;
};

export type AdaptiveControllerOutput = {
  sessionModified: boolean;
  recommendedSessionType: SessionType;
  intensityAdjustment: number;
  volumeAdjustment: number;
  exerciseChanges: { remove: string; replace: string; reason: string }[];
  coachingNotes: string[];
};

/**
 * Orchestrates readiness analysis, athlete state, training adjustment,
 * feedback parsing, and exercise substitution.
 */
export function runAdaptiveController(
  input: AdaptiveControllerInput
): AdaptiveControllerOutput {
  const coachingNotes: string[] = [];

  const readinessResult = analyseReadiness(input.readiness);
  const athleteStateResult = detectAthleteState({
    readinessScore: readinessResult.readinessScore,
    fatigueFlag: readinessResult.fatigueFlag,
  });

  const adjustmentResult = computeTrainingAdjustment({
    readinessScore: readinessResult.readinessScore,
    fatigueFlag: readinessResult.fatigueFlag,
    athleteState: athleteStateResult.state,
    plannedSessionType: input.plannedSessionType,
    hasPlyometrics: input.hasPlyometrics,
  });

  coachingNotes.push(...adjustmentResult.notes);

  let exerciseChanges: { remove: string; replace: string; reason: string }[] = [];

  const feedbackParse = input.athleteFeedback
    ? parseSessionFeedback(input.athleteFeedback)
    : null;

  if (feedbackParse?.joint || feedbackParse?.relatedExercise) {
    const subInput: ExerciseSubstitutionInput = {
      plannedExercises: input.plannedExercises,
    };
    if (feedbackParse.joint === "knee") subInput.kneePain = true;
    if (feedbackParse.joint === "shoulder") subInput.shoulderPain = true;
    if (feedbackParse.joint === "back" || feedbackParse.joint === "lumbar")
      subInput.lumbarFatigue = true;

    const subResult = recommendSubstitutions(subInput);
    exerciseChanges = subResult.substitutions.map((s) => ({
      remove: s.remove,
      replace: s.replace,
      reason: s.reason,
    }));
    coachingNotes.push(
      ...subResult.substitutions.map((s) => `Substitution: ${s.remove} → ${s.replace}. ${s.reason}`)
    );
  }

  return {
    sessionModified: adjustmentResult.modifySession || exerciseChanges.length > 0,
    recommendedSessionType: adjustmentResult.sessionType,
    intensityAdjustment: adjustmentResult.intensityAdjustment,
    volumeAdjustment: adjustmentResult.volumeAdjustment,
    exerciseChanges,
    coachingNotes,
  };
}
```

## lib/adaptive/athleteState.ts

```ts
/**
 * Athlete State Detector — determines physiological state from readiness and risk.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI.
 */

export type AthleteStateType =
  | "recovered"
  | "ready"
  | "fatigued"
  | "overreached"
  | "injuryRisk";

export type RiskLevel = "low" | "moderate" | "high";

export type AthleteStateInput = {
  /** Readiness score 0–100 from readiness analysis */
  readinessScore: number;
  /** Optional: injury risk 0–100 */
  injuryRisk?: number;
  /** Optional: fatigue flag from readiness analysis */
  fatigueFlag?: boolean;
};

export type AthleteStateOutput = {
  state: AthleteStateType;
  riskLevel: RiskLevel;
};

/**
 * IF readinessScore > 80 → state = "ready" (or "recovered")
 * IF readinessScore 60–80 → state = "moderate fatigue" (map to ready/fatigued)
 * IF readinessScore < 60 → state = "fatigued"
 * IF readinessScore < 40 → state = "overreached"
 */
export function detectAthleteState(input: AthleteStateInput): AthleteStateOutput {
  const { readinessScore, injuryRisk = 0, fatigueFlag = false } = input;

  if (injuryRisk >= 65) {
    return {
      state: "injuryRisk",
      riskLevel: injuryRisk >= 80 ? "high" : "moderate",
    };
  }

  if (readinessScore < 40) {
    return {
      state: "overreached",
      riskLevel: "high",
    };
  }

  if (readinessScore < 60) {
    return {
      state: "fatigued",
      riskLevel: readinessScore < 50 ? "high" : "moderate",
    };
  }

  if (readinessScore >= 60 && readinessScore <= 80) {
    return {
      state: fatigueFlag ? "fatigued" : "ready",
      riskLevel: fatigueFlag ? "moderate" : "low",
    };
  }

  return {
    state: readinessScore >= 85 ? "recovered" : "ready",
    riskLevel: "low",
  };
}
```

## lib/adaptive/exerciseSubstitution.ts

```ts
/**
 * Exercise Substitution Engine — recommends substitutions when risk is detected.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI.
 */

export type SubstitutionRecommendation = {
  remove: string;
  replace: string;
  reason: string;
};

export type ExerciseSubstitutionInput = {
  /** Detected pain/risk: joint or region */
  kneePain?: boolean;
  lumbarFatigue?: boolean;
  shoulderPain?: boolean;
  /** Optional: other restriction (e.g. "ankle") */
  otherRestrictions?: string[];
  /** Planned exercises (names) for context */
  plannedExercises?: string[];
};

export type ExerciseSubstitutionOutput = {
  substitutions: SubstitutionRecommendation[];
};

const SQUAT_PATTERN = [
  "Back Squat",
  "Front Squat",
  "Split Squat",
  "Lunge",
  "Bulgarian Split Squat",
];
const HINGE_PATTERN = ["Trap Bar Deadlift", "RDL", "Romanian Deadlift", "Hip Hinge"];
const OVERHEAD_PATTERN = ["Overhead Press", "Strict Press", "Push Press", "Snatch"];

/**
 * IF knee pain detected → remove squat pattern, suggest hinge/alternatives
 * IF lumbar fatigue detected → reduce hinge intensity / suggest regressions
 * IF shoulder pain detected → remove overhead pressing
 */
export function recommendSubstitutions(
  input: ExerciseSubstitutionInput
): ExerciseSubstitutionOutput {
  const substitutions: SubstitutionRecommendation[] = [];

  if (input.kneePain) {
    const planned = input.plannedExercises ?? [];
    for (const ex of SQUAT_PATTERN) {
      if (planned.some((p) => p.toLowerCase().includes(ex.toLowerCase()))) {
        substitutions.push({
          remove: ex,
          replace: "Trap Bar Deadlift",
          reason: "Knee pain detected; squat pattern replaced with hinge.",
        });
      }
    }
    if (substitutions.length === 0) {
      substitutions.push({
        remove: "Back Squat",
        replace: "Trap Bar Deadlift",
        reason: "Knee pain detected; avoid squat pattern.",
      });
    }
  }

  if (input.lumbarFatigue) {
    substitutions.push({
      remove: "Deadlift",
      replace: "Trap Bar Deadlift (reduced load)",
      reason: "Lumbar fatigue; reduce hinge intensity.",
    });
  }

  if (input.shoulderPain) {
    const hasOverhead = substitutions.some((s) =>
      OVERHEAD_PATTERN.some((ex) => s.remove.toLowerCase().includes(ex.toLowerCase()))
    );
    if (!hasOverhead) {
      substitutions.push({
        remove: "Overhead Press",
        replace: "Landmine Press",
        reason: "Shoulder pain detected; avoid overhead pressing.",
      });
    }
  }

  return { substitutions };
}
```

## lib/adaptive/readinessAnalysis.ts

```ts
/**
 * Readiness Analysis Engine — analyses athlete recovery metrics.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI; provides readiness score, level, and fatigue flag.
 */

export type ReadinessLevel = "high" | "moderate" | "low";

export type ReadinessAnalysisInput = {
  /** HRV trend: percent change vs baseline (e.g. -12 = 12% drop) */
  hrvTrendPercent?: number;
  /** Resting heart rate (bpm) */
  restingHrBpm?: number;
  /** Sleep duration in hours */
  sleepDurationHours?: number;
  /** Sleep quality 0–100 */
  sleepQuality?: number;
  /** Previous day training load (arbitrary scale, e.g. 0–100) */
  previousDayLoad?: number;
  /** Subjective readiness score 0–100 */
  subjectiveReadiness?: number;
};

export type ReadinessAnalysisOutput = {
  readinessScore: number;
  readinessLevel: ReadinessLevel;
  fatigueFlag: boolean;
};

const DEFAULT_READINESS = 70;

/**
 * IF HRV drop > 12% from baseline → reduce readiness score
 * IF sleep < 5 hours → reduce readiness score
 * IF previous load high → increase fatigue risk
 */
export function analyseReadiness(input: ReadinessAnalysisInput): ReadinessAnalysisOutput {
  let score = input.subjectiveReadiness ?? DEFAULT_READINESS;

  if (input.hrvTrendPercent != null && input.hrvTrendPercent < -12) {
    score -= Math.min(25, Math.abs(input.hrvTrendPercent));
  }

  if (input.restingHrBpm != null) {
    if (input.restingHrBpm > 65) score -= 5;
    if (input.restingHrBpm > 75) score -= 10;
  }

  if (input.sleepDurationHours != null && input.sleepDurationHours < 5) {
    score -= 20;
  } else if (input.sleepDurationHours != null && input.sleepDurationHours < 6) {
    score -= 10;
  }

  if (input.sleepQuality != null && input.sleepQuality < 50) {
    score -= 15;
  } else if (input.sleepQuality != null && input.sleepQuality < 70) {
    score -= 5;
  }

  if (input.previousDayLoad != null && input.previousDayLoad >= 80) {
    score -= 10;
  }

  const readinessScore = Math.max(0, Math.min(100, Math.round(score)));

  let readinessLevel: ReadinessLevel = "moderate";
  if (readinessScore >= 75) readinessLevel = "high";
  else if (readinessScore < 55) readinessLevel = "low";

  const fatigueFlag =
    readinessScore < 60 ||
    (input.previousDayLoad != null && input.previousDayLoad >= 85) ||
    (input.sleepDurationHours != null && input.sleepDurationHours < 5) ||
    (input.hrvTrendPercent != null && input.hrvTrendPercent < -15);

  return {
    readinessScore,
    readinessLevel,
    fatigueFlag,
  };
}
```

## lib/adaptive/sessionFeedbackParser.ts

```ts
/**
 * Session Feedback Parser — analyses athlete written feedback.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI.
 */

export type SessionFeedbackParseResult = {
  joint: string | null;
  severity: "low" | "moderate" | "high" | null;
  relatedExercise: string | null;
  /** Raw phrases detected */
  rawPhrases: string[];
};

const JOINT_PATTERNS: Record<string, RegExp[]> = {
  knee: [/\bknee\b/i, /\bknees\b/i, /\bpatella\b/i],
  shoulder: [/\bshoulder\b/i, /\bshoulders\b/i, /\brotator\b/i],
  back: [/\bback\b/i, /\blower\s*back\b/i, /\blumbar\b/i, /\bspine\b/i],
  hip: [/\bhip\b/i, /\bhips\b/i, /\bgroin\b/i],
  ankle: [/\bankle\b/i, /\bankles\b/i],
  elbow: [/\belbow\b/i, /\belbows\b/i],
  wrist: [/\bwrist\b/i, /\bwrists\b/i],
  neck: [/\bneck\b/i, /\bcervical\b/i],
};

const SEVERITY_PATTERNS = {
  high: [/\bsevere\b/i, /\bsharp\b/i, /\bbad\b/i, /\breally\s*hurt\b/i, /\bcan't\b/i],
  moderate: [/\bmoderate\b/i, /\bsome\s*pain\b/i, /\bniggling\b/i, /\bache\b/i],
  low: [/\bslight\b/i, /\bminor\b/i, /\ba\s*bit\b/i],
};

const EXERCISE_PATTERNS = [
  /\bsplit\s*squat\b/i,
  /\bback\s*squat\b/i,
  /\bfront\s*squat\b/i,
  /\bdeadlift\b/i,
  /\brdl\b/i,
  /\bpress\b/i,
  /\bbench\b/i,
  /\blunge\b/i,
  /\bclean\b/i,
  /\bsnatch\b/i,
  /\bcarry\b/i,
  /\bplank\b/i,
  /\bsquat\b/i,
  /\bhinge\b/i,
];

function detectJoint(text: string): string | null {
  for (const [joint, patterns] of Object.entries(JOINT_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) return joint;
  }
  return null;
}

function detectSeverity(text: string): "low" | "moderate" | "high" | null {
  if (SEVERITY_PATTERNS.high.some((p) => p.test(text))) return "high";
  if (SEVERITY_PATTERNS.moderate.some((p) => p.test(text))) return "moderate";
  if (SEVERITY_PATTERNS.low.some((p) => p.test(text))) return "low";
  if (/\bpain\b/i.test(text) || /\bhurt\b/i.test(text)) return "moderate";
  return null;
}

function detectExercise(text: string): string | null {
  for (const pattern of EXERCISE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

/**
 * Parse free-text feedback e.g. "Knee pain after split squats"
 */
export function parseSessionFeedback(freeText: string): SessionFeedbackParseResult {
  const t = (freeText ?? "").trim();
  const rawPhrases: string[] = [];

  const joint = detectJoint(t);
  if (joint) rawPhrases.push(joint);

  const severity = detectSeverity(t);
  const relatedExercise = detectExercise(t);
  if (relatedExercise) rawPhrases.push(relatedExercise);

  return {
    joint,
    severity,
    relatedExercise,
    rawPhrases,
  };
}
```

## lib/adaptive/trainingAdjustment.ts

```ts
/**
 * Training Modification Engine — determines whether a planned session should be modified.
 * Part of the Adaptive Training Intelligence Layer.
 * Does not modify UI.
 */

export type SessionType = "red" | "green" | "recovery";

export type TrainingAdjustmentInput = {
  /** Readiness score 0–100 */
  readinessScore: number;
  /** Fatigue flag from readiness analysis */
  fatigueFlag: boolean;
  /** Athlete state from athlete state detector */
  athleteState: "recovered" | "ready" | "fatigued" | "overreached" | "injuryRisk";
  /** Planned session type (red = high load, green = moderate, recovery = light) */
  plannedSessionType: SessionType;
  /** Optional: has plyometrics in session */
  hasPlyometrics?: boolean;
};

export type TrainingAdjustmentOutput = {
  modifySession: boolean;
  sessionType: SessionType;
  intensityAdjustment: number;
  volumeAdjustment: number;
  notes: string[];
};

/**
 * IF readinessScore < 60 → convert Red day to Green day
 * IF readinessScore < 45 → convert session to recovery
 * IF fatigueFlag true → reduce intensity 10–20%
 * IF athleteState = fatigued → reduce plyometrics volume
 */
export function computeTrainingAdjustment(
  input: TrainingAdjustmentInput
): TrainingAdjustmentOutput {
  const notes: string[] = [];
  let sessionType = input.plannedSessionType;
  let intensityAdjustment = 0;
  let volumeAdjustment = 0;

  if (input.readinessScore < 45) {
    sessionType = "recovery";
    intensityAdjustment = -40;
    volumeAdjustment = -50;
    notes.push("Readiness low; session converted to recovery.");
  } else if (input.readinessScore < 60) {
    if (input.plannedSessionType === "red") {
      sessionType = "green";
      intensityAdjustment = -15;
      volumeAdjustment = -20;
      notes.push("Red day converted to green; intensity and volume reduced.");
    } else if (input.plannedSessionType === "green") {
      intensityAdjustment = -10;
      volumeAdjustment = -15;
      notes.push("Moderate reduction applied for readiness.");
    }
  }

  if (input.fatigueFlag && sessionType !== "recovery") {
    const reduction = input.readinessScore < 50 ? 20 : 10;
    intensityAdjustment = Math.min(intensityAdjustment, -reduction);
    if (volumeAdjustment === 0) volumeAdjustment = -reduction;
    notes.push(`Fatigue flag: intensity reduced by ${reduction}%.`);
  }

  if (input.athleteState === "fatigued" && input.hasPlyometrics) {
    volumeAdjustment = Math.min(volumeAdjustment, -25);
    notes.push("Plyometrics volume reduced (fatigued state).");
  }

  if (input.athleteState === "overreached") {
    sessionType = "recovery";
    intensityAdjustment = Math.min(intensityAdjustment, -50);
    volumeAdjustment = Math.min(volumeAdjustment, -60);
    notes.push("Overreached state; recovery session recommended.");
  }

  const modifySession =
    sessionType !== input.plannedSessionType ||
    intensityAdjustment !== 0 ||
    volumeAdjustment !== 0;

  return {
    modifySession,
    sessionType,
    intensityAdjustment,
    volumeAdjustment,
    notes,
  };
}
```

## lib/athleteState.ts

```ts
/**
 * Athlete State Model — physiological state and training recommendation.
 * Determines: Recovered | Ready | Fatigued | Overreached | Injury Risk.
 * Does not modify UI or existing components.
 */

export type AthleteState =
  | "recovered"
  | "ready"
  | "fatigued"
  | "overreached"
  | "injuryRisk";

export type TrainingRecommendation =
  | "full training"
  | "reduce intensity"
  | "recovery session";

export type AthleteStateInput = {
  readinessScore: number;
  /** HRV trend: percent change vs baseline (e.g. -10 = 10% drop) */
  hrvTrendPercent?: number;
  /** Sleep duration in hours (e.g. 5, 7) */
  sleepHours?: number;
  /** Injury risk 0–100 from performance data engine */
  injuryRisk?: number;
  /** Fatigue level from performance data engine */
  fatigueLevel?: "low" | "moderate" | "high";
};

export type AthleteStateOutput = {
  state: AthleteState;
  trainingRecommendation: TrainingRecommendation;
};

/**
 * IF readinessScore < 40 → state = "Overreached"
 * IF readinessScore < 55 AND HRV drop > 10% AND sleep < 5h → state = "Fatigued"
 * IF injury risk elevated → state = "Injury Risk"
 * IF recovered/ready → state = "Recovered" or "Ready"
 */
export function calculateAthleteState(input: AthleteStateInput): AthleteStateOutput {
  const {
    readinessScore,
    hrvTrendPercent = 0,
    sleepHours,
    injuryRisk = 0,
    fatigueLevel,
  } = input;

  let state: AthleteState = "ready";
  let trainingRecommendation: TrainingRecommendation = "full training";

  if (readinessScore < 40) {
    state = "overreached";
    trainingRecommendation = "recovery session";
    return { state, trainingRecommendation };
  }

  if (injuryRisk >= 65) {
    state = "injuryRisk";
    trainingRecommendation = "reduce intensity";
    return { state, trainingRecommendation };
  }

  if (
    readinessScore < 55 &&
    hrvTrendPercent < -10 &&
    sleepHours != null &&
    sleepHours < 5
  ) {
    state = "fatigued";
    trainingRecommendation = "reduce intensity";
    return { state, trainingRecommendation };
  }

  if (fatigueLevel === "high" || readinessScore < 55) {
    state = "fatigued";
    trainingRecommendation = "reduce intensity";
    return { state, trainingRecommendation };
  }

  if (fatigueLevel === "moderate" || (readinessScore >= 55 && readinessScore < 70)) {
    state = "ready";
    trainingRecommendation = "full training";
    return { state, trainingRecommendation };
  }

  if (readinessScore >= 70 && (fatigueLevel === "low" || fatigueLevel === undefined)) {
    state = "recovered";
    trainingRecommendation = "full training";
    return { state, trainingRecommendation };
  }

  return { state, trainingRecommendation };
}

/**
 * Convenience: compute athlete state from performance data engine output.
 */
export function athleteStateFromPerformanceData(performanceData: {
  readinessScore: number;
  fatigueLevel: "low" | "moderate" | "high";
  injuryRisk: number;
}, options?: { hrvTrendPercent?: number; sleepHours?: number }): AthleteStateOutput {
  return calculateAthleteState({
    readinessScore: performanceData.readinessScore,
    fatigueLevel: performanceData.fatigueLevel,
    injuryRisk: performanceData.injuryRisk,
    hrvTrendPercent: options?.hrvTrendPercent,
    sleepHours: options?.sleepHours,
  });
}
```

## lib/exerciseVideos.ts

```ts
/**
 * Exercise demo videos — Human Performance OS.
 * Short clips (≤30s) only. Each ID verified for correct exercise.
 * Embed: start/end params for in-page popup.
 */

export type ExerciseVideo = {
  videoId: string;
  label: string;
  startSeconds?: number;
  endSeconds?: number;
};

const S = 30; // max seconds for in-page clip

export const EXERCISE_VIDEOS: Record<string, ExerciseVideo> = {
  back_squat: {
    videoId: "BeM2oyJ0W0E",
    label: "Back Squat",
    startSeconds: 0,
    endSeconds: S,
  },
  power_clean: {
    videoId: "p2ytaRB3l1E",
    label: "Power Clean",
    startSeconds: 0,
    endSeconds: S,
  },
  weighted_pull_up: {
    videoId: "eGo4IYlbE5g",
    label: "Weighted Pull-Up",
    startSeconds: 0,
    endSeconds: S,
  },
  loaded_carry: {
    videoId: "pSHjTRCQxIw",
    label: "Loaded Carry",
    startSeconds: 0,
    endSeconds: S,
  },
  split_squat: {
    videoId: "ggjWqAi0AAc",
    label: "Split Squat",
    startSeconds: 0,
    endSeconds: S,
  },
  db_press: {
    videoId: "VKIGahyqO2s",
    label: "Dumbbell Press",
    startSeconds: 0,
    endSeconds: S,
  },
  rdl: {
    videoId: "eHLuROg0FSI",
    label: "RDL",
    startSeconds: 0,
    endSeconds: S,
  },
  med_ball_rotational_throw: {
    videoId: "lPt8hGynNn0",
    label: "Med Ball Rotational Throw",
    startSeconds: 0,
    endSeconds: S,
  },
  side_plank: {
    videoId: "K2VljzCC16g",
    label: "Side Plank",
    startSeconds: 0,
    endSeconds: S,
  },
  loaded_march: {
    videoId: "pSHjTRCQxIw",
    label: "Loaded March",
    startSeconds: 0,
    endSeconds: S,
  },
  jump_rope: {
    videoId: "cfnqZhB0dEM",
    label: "Jump Rope",
    startSeconds: 0,
    endSeconds: S,
  },
  dynamic_mobility: {
    videoId: "gL145LmJRvM",
    label: "Dynamic Mobility",
    startSeconds: 0,
    endSeconds: S,
  },
  pogos: {
    videoId: "_XJyhqPS-PI",
    label: "Pogos",
    startSeconds: 0,
    endSeconds: S,
  },
  broad_jump: {
    videoId: "T3Npnu7kGgg",
    label: "Broad Jump",
    startSeconds: 0,
    endSeconds: S,
  },
  bike: {
    videoId: "Mn3L5VwLvnc",
    label: "Bike / Cycling",
    startSeconds: 0,
    endSeconds: S,
  },
  zone1: {
    videoId: "Mn3L5VwLvnc",
    label: "Zone 1 Cardio",
    startSeconds: 0,
    endSeconds: S,
  },
  mobility_circuits: {
    videoId: "gL145LmJRvM",
    label: "Mobility Circuits",
    startSeconds: 0,
    endSeconds: S,
  },
  parasympathetic_breathing: {
    videoId: "pSHjTRCQxIw",
    label: "Recovery Breathing",
    startSeconds: 0,
    endSeconds: S,
  },
  threshold_intervals: {
    videoId: "Mn3L5VwLvnc",
    label: "Threshold Intervals",
    startSeconds: 0,
    endSeconds: S,
  },
  zone2: {
    videoId: "Mn3L5VwLvnc",
    label: "Zone 2 Conditioning",
    startSeconds: 0,
    endSeconds: S,
  },
};

export function getExerciseVideo(key: string): ExerciseVideo | undefined {
  return EXERCISE_VIDEOS[key];
}

export function getExerciseVideos(keys: string[]): ExerciseVideo[] {
  return keys
    .map((k) => EXERCISE_VIDEOS[k])
    .filter((v): v is ExerciseVideo => Boolean(v));
}
```

## lib/feedbackInterpreter.ts

```ts
/**
 * Free-text feedback interpreter for injury and readiness detection.
 * Used by PerformanceEngine.interpretSessionFeedback().
 */

export type FeedbackInterpretation = {
  kneePain: boolean;
  shoulderPain: boolean;
  backPain: boolean;
  fatigue: boolean;
  positiveReadiness: boolean;
  rawAreas: string[];
  sentiment: "positive" | "neutral" | "negative";
};

const KNEE_PATTERNS = [
  /\bknee\b/i,
  /\bknees\b/i,
  /\bpatella\b/i,
  /\bacl\b/i,
  /\bmcl\b/i,
  /\bit band\b/i,
  /\bquad\s*above\s*knee\b/i,
];

const SHOULDER_PATTERNS = [
  /\bshoulder\b/i,
  /\bshoulders\b/i,
  /\brotator\b/i,
  /\bimpingement\b/i,
  /\bdeltoid\b/i,
  /\bac joint\b/i,
  /\bglenohumeral\b/i,
];

const BACK_PATTERNS = [
  /\bback\b/i,
  /\blower\s*back\b/i,
  /\bupper\s*back\b/i,
  /\bspine\b/i,
  /\blumbar\b/i,
  /\bthoracic\b/i,
  /\bsi\s*joint\b/i,
  /\bsacro\b/i,
];

const FATIGUE_PATTERNS = [
  /\bfatigue[d]?\b/i,
  /\btired\b/i,
  /\bexhausted\b/i,
  /\bheavy\s*legs\b/i,
  /\bno\s*energy\b/i,
  /\bworn\s*out\b/i,
  /\bdeload\b/i,
];

const POSITIVE_READINESS_PATTERNS = [
  /\bfelt\s*good\b/i,
  /\bstrong\b/i,
  /\bready\b/i,
  /\bgreat\s*session\b/i,
  /\bsolid\b/i,
  /\bno\s*pain\b/i,
  /\bcleaned\s*up\b/i,
  /\bgood\s*recovery\b/i,
  /\bprimed\b/i,
];

function matchAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

export function interpretFeedback(freeText: string): FeedbackInterpretation {
  const t = (freeText ?? "").trim();
  const kneePain = matchAny(t, KNEE_PATTERNS) && !/no\s+knee\s+pain|knee\s+fine|knees\s+good/i.test(t);
  const shoulderPain = matchAny(t, SHOULDER_PATTERNS) && !/no\s+shoulder|shoulder\s+fine|shoulders\s+good/i.test(t);
  const backPain = matchAny(t, BACK_PATTERNS) && !/back\s+fine|no\s+back\s+pain|back\s+good/i.test(t);
  const fatigue = matchAny(t, FATIGUE_PATTERNS);
  const positiveReadiness = matchAny(t, POSITIVE_READINESS_PATTERNS);

  const rawAreas: string[] = [];
  if (kneePain) rawAreas.push("knee");
  if (shoulderPain) rawAreas.push("shoulder");
  if (backPain) rawAreas.push("back");

  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  if (positiveReadiness && !kneePain && !shoulderPain && !backPain && !fatigue) sentiment = "positive";
  else if (kneePain || shoulderPain || backPain || fatigue) sentiment = "negative";

  return {
    kneePain,
    shoulderPain,
    backPain,
    fatigue,
    positiveReadiness,
    rawAreas,
    sentiment,
  };
}
```

## lib/forecastEngine.ts

```ts
/**
 * Performance Forecast Engine — pure functions for 8–12 week PPS projection.
 * No side effects, no external libraries, TypeScript strict.
 */

/**
 * Linear regression on the last `weeks` data points.
 * Returns slope (rate of change per week).
 */
export function extractTrend(data: number[], weeks: number): number {
  if (data.length === 0 || weeks < 1) return 0;
  const n = Math.min(weeks, data.length);
  const start = data.length - n;
  const slice = data.slice(start, start + n);
  const count = slice.length;
  if (count < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < count; i++) {
    const x = i;
    const y = slice[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = count * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  return (count * sumXY - sumX * sumY) / denominator;
}

/**
 * Exponential decay: slope * Math.exp(-decayConstant * weekIndex)
 */
export function applyDecay(slope: number, weekIndex: number, decayConstant: number): number {
  return slope * Math.exp(-decayConstant * weekIndex);
}

/**
 * Projected weekly values:
 * current + (decayedSlope × consistencyFactor × weekIndex) per week.
 * Clamped: maxHistorical + 25% upper, -100% lower.
 */
export function generateProjection(
  currentValue: number,
  slope: number,
  weeksForward: number,
  consistencyFactor: number,
  decayConstant: number
): number[] {
  const out: number[] = [];
  const maxHistorical = currentValue;
  const upperClamp = maxHistorical + Math.max(maxHistorical * 0.25, 25);
  const lowerClamp = -100;

  for (let w = 0; w < weeksForward; w++) {
    const decayed = applyDecay(slope, w, decayConstant);
    const delta = decayed * consistencyFactor * (w + 1);
    let val = currentValue + delta;
    val = Math.max(lowerClamp, Math.min(upperClamp, val));
    out.push(val);
  }

  return out;
}

/**
 * R² from regression, combined with adherence (0–1), penalized by volatility (std dev).
 * Returns confidence score 0–1.
 */
export function calculateConfidence(
  data: number[],
  adherence: number,
  volatility: number
): number {
  if (data.length < 2) return Math.max(0, Math.min(1, adherence));

  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = data[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }

  const meanY = sumY / n;
  const ssTot = sumYY - n * meanY * meanY;
  if (ssTot <= 0) return Math.max(0, Math.min(1, adherence));

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return Math.max(0, Math.min(1, adherence));

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = meanY - slope * (sumX / n);

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    ssRes += (data[i] - pred) ** 2;
  }

  const r2 = 1 - ssRes / ssTot;
  const r2Clamped = Math.max(0, Math.min(1, r2));

  const volPenalty = Math.max(0, 1 - volatility / 50);
  const combined = (r2Clamped * 0.5 + adherence * 0.5) * volPenalty;
  return Math.max(0, Math.min(1, combined));
}
```

## lib/fuelingEngine.ts

```ts
/**
 * Fueling Strategy Engine — estimates macro targets and timing from event and goal.
 * Pure logic; no side effects.
 */

export type Intensity = "low" | "moderate" | "high";
export type Goal = "performance" | "cut" | "maintenance" | "mass";

/** Optional body composition from store — used for lean-mass protein and deficit/surplus. */
export type BodyCompositionInput = {
  bodyweight: number;
  bodyFat: number;
  muscleMass: number;
  lastUpdated: string;
  waistCm?: number;
};

export type FuelStrategyInput = {
  eventType: string;
  durationMinutes: number;
  intensity: Intensity;
  bodyweight: number;
  goal: Goal;
  /** When provided, protein may use lean mass and carbs/calories adapt to body fat and goal. */
  bodyComposition?: BodyCompositionInput | null;
};

export type FuelStrategyOutput = {
  totalCalories: number;
  carbsGrams: number;
  proteinGrams: number;
  fatsGrams: number;
  preEventStrategy: string;
  intraEventStrategy: string;
  postEventStrategy: string;
};

const CARB_PER_KG: Record<Intensity, [number, number]> = {
  low: [3, 5],
  moderate: [5, 7],
  high: [6, 10],
};

/** Event-type carb modifier: scale the intensity-based carbs (e.g. Rest Day = lower, Endurance = higher). */
const EVENT_CARB_MODIFIER: Record<string, number> = {
  "Rest Day": 0.5,
  "Skill / Mobility": 0.7,
  Strength: 1,
  Hypertrophy: 1.05,
  HIIT: 1.1,
  Endurance: 1.25,
};

const PROTEIN_PER_KG: [number, number] = [1.6, 2.2];
const CALORIES_PER_GRAM_CARB = 4;
const CALORIES_PER_GRAM_PROTEIN = 4;
const CALORIES_PER_GRAM_FAT = 9;

function goalMultiplier(goal: Goal): number {
  switch (goal) {
    case "cut":
      return 0.85;
    case "maintenance":
      return 1;
    case "performance":
      return 1.05;
    case "mass":
      return 1.15;
    default:
      return 1;
  }
}

/**
 * Estimate maintenance calories (no deficit/surplus). Used when goal is cut or mass and body comp is available.
 */
export function calculateMaintenanceCalories(
  bodyweight: number,
  bodyFat?: number
): number {
  const leanFactor = bodyFat != null && bodyFat > 0 ? 1 - bodyFat / 100 : 1;
  const base = 22 * bodyweight * leanFactor + 500;
  return Math.round(base);
}

function getEventSpecificStrategies(
  eventType: string,
  durationMinutes: number,
  carbsGrams: number,
  proteinGrams: number,
  bodyweight: number
): { pre: string; intra: string; post: string } {
  const intraLong =
    durationMinutes > 90
      ? "30–60g carbs per hour during the session (gel, drink, or banana)."
      : "Not required for sessions under 90 min.";

  switch (eventType) {
    case "Rest Day":
      return {
        pre: "No pre-session timing. Focus on consistent meals: moderate carbs, prioritise protein (1.6–2g/kg) and fats. Keep fibre and hydration up.",
        intra: "N/A — no session.",
        post: "Even intake across the day. Slightly lower total carbs; use fats for satiety. Target: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
    case "Skill / Mobility":
      return {
        pre: "Light meal 1–2h before: 0.5–1g/kg carbs, small protein. Avoid heavy fibre or fat close to session.",
        intra: "Water and electrolytes only unless session exceeds 90 min.",
        post: "Standard recovery: 0.25–0.3g/kg protein within 1–2h. Carbs only if you have another session later. Target: ~" + proteinGrams + "g protein.",
      };
    case "Strength":
      return {
        pre: "2–3h before: 1–2g/kg carbs, 0.2–0.3g/kg protein. 30–60 min before: 0.5–1g/kg carbs if tolerated (e.g. banana, rice cakes).",
        intra: intraLong,
        post: "Within 30–60 min: 1–1.2g/kg carbs + 0.25–0.3g/kg protein. Repeat in 2h if same-day load. Target today: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
    case "Hypertrophy":
      return {
        pre: "2–3h before: 1–2g/kg carbs, 0.25–0.35g/kg protein. Closer to session: 0.5–1g/kg carbs to fuel volume.",
        intra: intraLong,
        post: "Within 30–60 min: 1–1.2g/kg carbs + 0.3–0.4g/kg protein. Prioritise protein spread across 4–6 meals. Target: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
    case "Endurance":
      return {
        pre: "2–3h before: 2–3g/kg carbs, light protein. Top up 30–60 min before with 0.5–1g/kg carbs. Carb-load optional if race or very long session.",
        intra: intraLong,
        post: "Within 30–60 min: 1.2–1.5g/kg carbs + 0.25–0.3g/kg protein. Refill glycogen; repeat carbs in 2h if needed. Target: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
    case "HIIT":
      return {
        pre: "1.5–2h before: 1–1.5g/kg carbs, 0.2g/kg protein. 30–45 min before: 0.3–0.5g/kg carbs (easy to digest).",
        intra: intraLong,
        post: "Within 30–45 min: 1–1.2g/kg carbs + 0.25–0.3g/kg protein. Quick refuel to support recovery and any later activity. Target: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
    default:
      return {
        pre: "2–3 hours before: 1–2g/kg carbs, 0.2–0.3g/kg protein. 30–60 min before: 0.5–1g/kg carbs if tolerated. Event: " + eventType + ".",
        intra: intraLong,
        post: "Within 30–60 min: 1–1.2g/kg carbs + 0.25–0.3g/kg protein. Target today: ~" + carbsGrams + "g carbs, ~" + proteinGrams + "g protein.",
      };
  }
}

export function generateFuelStrategy(input: FuelStrategyInput): FuelStrategyOutput {
  const { eventType, durationMinutes, intensity, bodyweight, goal, bodyComposition } = input;
  const [carbLow, carbHigh] = CARB_PER_KG[intensity];
  let modifier = EVENT_CARB_MODIFIER[eventType] ?? 1;
  if (bodyComposition && bodyComposition.bodyFat > 20) {
    modifier = modifier * 0.9;
  }
  const carbPerKg = ((carbLow + carbHigh) / 2) * modifier;
  let carbsGrams = Math.round(Math.max(0, carbPerKg * bodyweight));
  const [proteinLow, proteinHigh] = PROTEIN_PER_KG;
  let proteinPerKg = (proteinLow + proteinHigh) / 2;
  if (bodyComposition && goal === "performance" && bodyComposition.muscleMass > 0) {
    proteinPerKg = 2.2;
  }
  const proteinGrams = bodyComposition && goal === "performance" && bodyComposition.muscleMass > 0
    ? Math.round(2.2 * bodyComposition.muscleMass)
    : Math.round(proteinPerKg * bodyweight);
  let baseCalories =
    carbsGrams * CALORIES_PER_GRAM_CARB +
    proteinGrams * CALORIES_PER_GRAM_PROTEIN;
  let mult = goalMultiplier(goal);
  let targetCalories = Math.round(
    (baseCalories + 50 * bodyweight) * mult
  );
  if (bodyComposition && (goal === "cut" || goal === "mass")) {
    const maintenance = calculateMaintenanceCalories(bodyweight, bodyComposition.bodyFat);
    if (goal === "cut") {
      targetCalories = Math.max(1200, Math.round(maintenance - 400));
    } else if (goal === "mass") {
      targetCalories = Math.round(maintenance + 325);
    }
  }
  const remainingCals = Math.max(0, targetCalories - baseCalories);
  const fatsGrams = Math.round(remainingCals / CALORIES_PER_GRAM_FAT);
  const totalCalories =
    carbsGrams * CALORIES_PER_GRAM_CARB +
    proteinGrams * CALORIES_PER_GRAM_PROTEIN +
    fatsGrams * CALORIES_PER_GRAM_FAT;

  const { pre, intra, post } = getEventSpecificStrategies(
    eventType,
    durationMinutes,
    carbsGrams,
    proteinGrams,
    bodyweight
  );

  return {
    totalCalories,
    carbsGrams,
    proteinGrams,
    fatsGrams,
    preEventStrategy: pre,
    intraEventStrategy: intra,
    postEventStrategy: post,
  };
}
```

## lib/getUserProfileData.ts

```ts
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getUserProfileData(userId: string) {
  const { data, error } = await supabase
    .from("questionnaire_responses")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) {
    console.error("Error fetching questionnaire:", error)
    return null
  }

  return data
}
```

## lib/goalEngine.ts

```ts
/**
 * Goal Roadmap Engine — phases, milestones, weekly targets, KPIs from goal input.
 */

export type Phase = {
  id: string;
  name: string;
  startWeek: number;
  endWeek: number;
  description: string;
};

export type Milestone = {
  id: string;
  label: string;
  percent: number;
  week: number;
  targetDescription: string;
};

export type WeeklyTarget = {
  week: number;
  focus: string;
  targetValue?: number;
  unit?: string;
  volumeKm?: number;
};

export type KpiSuggestion = {
  id: string;
  name: string;
  unit: string;
  currentValue: number | null;
  targetValue: number;
  ratePerWeek: number;
  risk: "green" | "amber" | "red";
};

/** Current benchmark values (e.g. from profile) for tracking. */
export type CurrentBenchmarks = {
  back_squat?: number | null;
  bench_press?: number | null;
  deadlift?: number | null;
  overhead_press?: number | null;
  two_mile_time_sec?: number | null;
  [key: string]: number | null | undefined;
};

/** User-specified targets for weightlifting or time-based goals. */
export type TargetAchievements = {
  squat_kg?: number;
  bench_kg?: number;
  deadlift_kg?: number;
  overhead_press_kg?: number;
  target_time_sec?: number;
  target_time_label?: string;
};

export type GoalDetails = {
  currentValue?: number;
  targetValue?: number;
  distance?: number;
  currentTime?: number;
  targetTime?: number;
  currentBodyweight?: number;
  targetBodyweight?: number;
  currentBodyFat?: number;
  targetBodyFat?: number;
  leanMass?: number;
  primaryLift?: string;
  current1RM?: number;
  target1RM?: number;
  primaryKpi?: string;
  skillType?: string;
  currentProficiency?: number;
  targetProficiency?: number;
  loadCarriageDistance?: number;
  loadWeight?: number;
  weeklyVolumeKm?: number;
  longRunBaselineKm?: number;
  customKpiName?: string;
  [key: string]: unknown;
};

export type GoalRoadmapInput = {
  goalTitle: string;
  category: string;
  deadline: string;
  priority: string;
  constraints?: string;
  targetAchievements?: TargetAchievements;
  currentBenchmarks?: CurrentBenchmarks | null;
  eventDistance?: number;
  injuryStatus?: { active: boolean; severity?: "low" | "moderate" | "high" };
  goalDetails?: GoalDetails;
};

export type GoalRoadmapResult = {
  goalTitle: string;
  deadline: string;
  phases: Phase[];
  milestones: Milestone[];
  weeklyTargets: WeeklyTarget[];
  kpis: KpiSuggestion[];
  totalWeeks: number;
  priority: string;
  constraints?: string;
  goalDetails?: GoalDetails;
};

const CATEGORY_KPIS: Record<string, { name: string; unit: string; targetDelta: number }[]> = {
  Performance: [
    { name: "PPS", unit: "%", targetDelta: 12 },
    { name: "Velocity", unit: "%", targetDelta: 8 },
    { name: "VO2 proxy", unit: "mL/kg/min", targetDelta: 4 },
  ],
  "Body Composition": [
    { name: "Body fat", unit: "%", targetDelta: -3 },
    { name: "Lean mass", unit: "kg", targetDelta: 2 },
  ],
  Strength: [
    { name: "Squat 1RM", unit: "kg", targetDelta: 15 },
    { name: "Bench 1RM", unit: "kg", targetDelta: 10 },
    { name: "Deadlift 1RM", unit: "kg", targetDelta: 20 },
    { name: "Overhead 1RM", unit: "kg", targetDelta: 8 },
  ],
  Endurance: [
    { name: "Threshold pace", unit: "/km", targetDelta: -15 },
    { name: "Long duration", unit: "sec", targetDelta: 1800 },
  ],
  Marathon: [
    { name: "Threshold pace", unit: "/km", targetDelta: -15 },
    { name: "Long duration", unit: "sec", targetDelta: 1800 },
  ],
  Skill: [
    { name: "Skill score", unit: "pts", targetDelta: 20 },
    { name: "Consistency", unit: "%", targetDelta: 15 },
  ],
  Tactical: [
    { name: "Load carriage", unit: "kg·km", targetDelta: 25 },
    { name: "Work capacity", unit: "pts", targetDelta: 18 },
  ],
  Custom: [
    { name: "Primary metric", unit: "units", targetDelta: 10 },
    { name: "Secondary metric", unit: "units", targetDelta: 5 },
  ],
};

function getPhases(totalWeeks: number): Phase[] {
  if (totalWeeks <= 4) {
    return [
      { id: "p1", name: "Foundation", startWeek: 1, endWeek: totalWeeks, description: "Base building and assessment." },
    ];
  }
  if (totalWeeks <= 8) {
    return [
      { id: "p1", name: "Foundation", startWeek: 1, endWeek: Math.floor(totalWeeks * 0.35), description: "Establish baseline and habits." },
      { id: "p2", name: "Build", startWeek: Math.floor(totalWeeks * 0.35) + 1, endWeek: Math.floor(totalWeeks * 0.7), description: "Progressive overload and volume." },
      { id: "p3", name: "Peak", startWeek: Math.floor(totalWeeks * 0.7) + 1, endWeek: totalWeeks, description: "Peak performance and taper." },
    ];
  }
  const f = Math.floor(totalWeeks * 0.2);
  const b = Math.floor(totalWeeks * 0.45);
  const p = Math.floor(totalWeeks * 0.75);
  return [
    { id: "p1", name: "Foundation", startWeek: 1, endWeek: f, description: "Base building, screening, and capacity." },
    { id: "p2", name: "Build", startWeek: f + 1, endWeek: b, description: "Structured progression and volume." },
    { id: "p3", name: "Peak", startWeek: b + 1, endWeek: p, description: "Intensity and specificity." },
    { id: "p4", name: "Consolidate", startWeek: p + 1, endWeek: totalWeeks, description: "Refinement and readiness." },
  ];
}

function getMilestones(totalWeeks: number): Milestone[] {
  return [
    { id: "m1", label: "25%", percent: 25, week: Math.max(1, Math.floor(totalWeeks * 0.25)), targetDescription: "First checkpoint — baseline reassessment." },
    { id: "m2", label: "50%", percent: 50, week: Math.max(1, Math.floor(totalWeeks * 0.5)), targetDescription: "Midpoint — progress review and taper check." },
    { id: "m3", label: "75%", percent: 75, week: Math.max(1, Math.floor(totalWeeks * 0.75)), targetDescription: "Peak phase — final intensity block." },
    { id: "m4", label: "100%", percent: 100, week: totalWeeks, targetDescription: "Goal deadline — event or target day." },
  ];
}

function getWeeklyTargets(totalWeeks: number, category: string): WeeklyTarget[] {
  const out: WeeklyTarget[] = [];
  const focuses = ["Volume", "Intensity", "Recovery", "Skill", "Assessment"];
  for (let w = 1; w <= totalWeeks; w++) {
    out.push({
      week: w,
      focus: focuses[(w - 1) % focuses.length],
      targetValue: w * 2,
      unit: category === "Strength" ? "kg" : "%",
    });
  }
  return out;
}

/**
 * Required weekly volume progression (km) for distance-based events.
 * Taper in final 2–3 weeks.
 */
export function calculateVolumeProgression(distanceKm: number, weeksRemaining: number): { week: number; volumeKm: number }[] {
  if (weeksRemaining < 1) return [];
  const taperWeeks = Math.min(3, Math.max(2, Math.floor(weeksRemaining * 0.15)));
  const buildWeeks = weeksRemaining - taperWeeks;
  if (buildWeeks < 1) return [];
  const baseWeekly = distanceKm * 0.4;
  const peakWeekly = distanceKm * 1.2;
  const progression = (peakWeekly - baseWeekly) / Math.max(buildWeeks - 1, 1);
  const out: { week: number; volumeKm: number }[] = [];
  for (let w = 1; w <= weeksRemaining; w++) {
    if (w <= buildWeeks) {
      out.push({ week: w, volumeKm: Math.round((baseWeekly + (w - 1) * progression) * 10) / 10 });
    } else {
      const taperProgress = (w - buildWeeks) / taperWeeks;
      out.push({ week: w, volumeKm: Math.round((peakWeekly * (1 - taperProgress * 0.5)) * 10) / 10 });
    }
  }
  return out;
}

function getPhasesWithDistance(totalWeeks: number, eventDistanceKm: number): Phase[] {
  const taperWeeks = Math.min(3, Math.max(2, Math.floor(totalWeeks * 0.15)));
  if (eventDistanceKm < 10) {
    const foundEnd = Math.min(2, Math.max(1, totalWeeks - 2));
    const buildEnd = Math.max(foundEnd + 1, totalWeeks - taperWeeks);
    return [
      { id: "p1", name: "Foundation", startWeek: 1, endWeek: foundEnd, description: "Short base." },
      { id: "p2", name: "Build", startWeek: foundEnd + 1, endWeek: buildEnd, description: "Build to race." },
      { id: "p3", name: "Taper", startWeek: buildEnd + 1, endWeek: totalWeeks, description: "Taper." },
    ];
  }
  if (eventDistanceKm <= 21.1) {
    const f = Math.floor(totalWeeks * 0.25);
    const b = Math.floor(totalWeeks * 0.6);
    return [
      { id: "p1", name: "Foundation", startWeek: 1, endWeek: f, description: "Base building." },
      { id: "p2", name: "Build", startWeek: f + 1, endWeek: b, description: "Progressive volume." },
      { id: "p3", name: "Peak", startWeek: b + 1, endWeek: totalWeeks - taperWeeks, description: "Peak load." },
      { id: "p4", name: "Taper", startWeek: totalWeeks - taperWeeks + 1, endWeek: totalWeeks, description: "Taper 2–3 weeks." },
    ];
  }
  const f = Math.floor(totalWeeks * 0.3);
  const b = Math.floor(totalWeeks * 0.55);
  const p = Math.floor(totalWeeks * 0.8);
  return [
    { id: "p1", name: "Foundation", startWeek: 1, endWeek: f, description: "Extended foundation." },
    { id: "p2", name: "Build", startWeek: f + 1, endWeek: b, description: "Progressive overload." },
    { id: "p3", name: "Peak", startWeek: b + 1, endWeek: p, description: "Peak phase." },
    { id: "p4", name: "Taper", startWeek: p + 1, endWeek: totalWeeks, description: "Taper." },
  ];
}

function riskFromRate(ratePerWeek: number, priority: string): "green" | "amber" | "red" {
  const aggressive = Math.abs(ratePerWeek);
  if (aggressive > 3 && priority !== "High") return "red";
  if (aggressive > 2) return "amber";
  return "green";
}

export function generateGoalRoadmap(input: GoalRoadmapInput): GoalRoadmapResult {
  const { goalTitle, category, deadline, priority } = input;
  const end = new Date(deadline);
  const start = new Date();
  let totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));

  const gd = input.goalDetails;
  const eventDistanceKm = input.eventDistance ?? gd?.distance;
  const isDistanceCategory = (category === "Endurance" || category === "Tactical" || category === "Marathon") && eventDistanceKm != null && eventDistanceKm > 0;
  const injuryActive = input.injuryStatus?.active === true;

  let phases = isDistanceCategory && eventDistanceKm
    ? getPhasesWithDistance(totalWeeks, eventDistanceKm)
    : getPhases(totalWeeks);

  if (injuryActive && phases.length > 0) {
    const foundation = phases[0];
    const extendBy = Math.max(1, Math.floor((foundation.endWeek - foundation.startWeek + 1) * 0.15));
    const newEnd = Math.min(foundation.endWeek + extendBy, totalWeeks);
    const shift = newEnd - foundation.endWeek;
    phases = [
      { ...foundation, endWeek: newEnd, description: foundation.description + " Extended for injury management." },
      ...phases.slice(1).map((p) => ({
        ...p,
        startWeek: p.startWeek + shift,
        endWeek: Math.min(p.endWeek + shift, totalWeeks),
      })),
    ];
  }

  const milestones = getMilestones(totalWeeks);
  let weeklyTargets = getWeeklyTargets(totalWeeks, category);

  if (isDistanceCategory && eventDistanceKm) {
    const volProgression = calculateVolumeProgression(eventDistanceKm, totalWeeks);
    const volMap = new Map(volProgression.map((v) => [v.week, v.volumeKm]));
    weeklyTargets = weeklyTargets.map((wt) => ({
      ...wt,
      volumeKm: volMap.get(wt.week),
    }));
  }

  const targets = input.targetAchievements;
  const current = input.currentBenchmarks;
  const kpiTemplates = CATEGORY_KPIS[category] ?? CATEGORY_KPIS.Custom;

  const strengthMap: Record<string, { key: string; target?: number }> = {
    "Squat 1RM": { key: "back_squat", target: targets?.squat_kg },
    "Bench 1RM": { key: "bench_press", target: targets?.bench_kg },
    "Deadlift 1RM": { key: "deadlift", target: targets?.deadlift_kg },
    "Overhead 1RM": { key: "overhead_press", target: targets?.overhead_press_kg },
  };
  const enduranceCurrent = gd?.currentTime ?? current?.two_mile_time_sec;
  const enduranceTarget = gd?.targetTime ?? targets?.target_time_sec;
  const isTimeCategory = category === "Endurance" || category === "Marathon";

  const kpis: KpiSuggestion[] = kpiTemplates.map((t, i) => {
    let targetValue: number;
    let currentValue: number | null = null;
    if (category === "Strength" && strengthMap[t.name]) {
      const { key, target } = strengthMap[t.name];
      targetValue = target ?? gd?.target1RM ?? (70 + t.targetDelta + i * 5);
      const cur = current?.[key];
      currentValue = (gd?.current1RM != null ? gd.current1RM : cur != null && cur > 0 ? cur : null) as number | null;
    } else if (category === "Body Composition" && (t.name === "Body fat" || t.name === "Lean mass")) {
      targetValue = t.name === "Body fat" ? (gd?.targetBodyFat ?? 70 + t.targetDelta) : (gd?.targetBodyweight ?? 70 + t.targetDelta);
      currentValue = t.name === "Body fat" ? (gd?.currentBodyFat ?? null) : (gd?.currentBodyweight ?? null);
    } else if (gd?.targetValue != null && (category === "Performance" || category === "Custom" || (category === "Skill" && t.name === "Skill score"))) {
      targetValue = category === "Skill" ? (gd?.targetProficiency ?? gd.targetValue) : gd.targetValue;
      currentValue = category === "Skill" ? (gd?.currentProficiency ?? gd.currentValue ?? null) : (gd.currentValue ?? null);
    } else if (isTimeCategory && t.name === "Long duration" && t.unit === "sec") {
      targetValue = enduranceTarget ?? 3600 + t.targetDelta;
      currentValue = enduranceCurrent ?? null;
    } else if (isTimeCategory && (t.name === "Threshold pace" || t.name === "Long duration")) {
      targetValue = enduranceTarget ? Math.round(enduranceTarget / 60) : 70 + t.targetDelta;
      currentValue = enduranceCurrent != null ? Math.round(enduranceCurrent / 60) : null;
    } else if (category === "Tactical" && gd?.targetTime != null) {
      targetValue = Math.round((gd.targetTime ?? 0) / 60);
      currentValue = gd.currentTime != null ? Math.round(gd.currentTime / 60) : null;
    } else {
      targetValue = gd?.targetValue ?? 70 + t.targetDelta + i * 5;
      currentValue = gd?.currentValue ?? 70 + i * 3;
    }
    const effectiveCurrent = currentValue ?? targetValue - t.targetDelta - i * 2;
    const ratePerWeek = totalWeeks > 0 ? (targetValue - effectiveCurrent) / totalWeeks : 0;
    return {
      id: `kpi-${i}`,
      name: t.name,
      unit: t.unit,
      currentValue,
      targetValue,
      ratePerWeek: Math.round(ratePerWeek * 100) / 100,
      risk: riskFromRate(ratePerWeek, priority),
    };
  });

  return {
    goalTitle: input.goalTitle,
    deadline: input.deadline,
    phases,
    milestones,
    weeklyTargets,
    kpis,
    totalWeeks,
    priority,
    constraints: input.constraints,
    goalDetails: input.goalDetails,
  };
}

export function calculateExecutionProbability(
  totalWeeks: number,
  priority: string,
  constraintsLength: number,
  kpis: KpiSuggestion[]
): { percentage: number; band: "low" | "medium" | "high" } {
  let p = 70;
  if (totalWeeks >= 12) p += 10;
  else if (totalWeeks >= 8) p += 5;
  else if (totalWeeks < 4) p -= 15;
  if (priority === "High") p += 5;
  if (priority === "Low") p -= 5;
  if (constraintsLength > 50) p -= 10;
  const redCount = kpis.filter((k) => k.risk === "red").length;
  const amberCount = kpis.filter((k) => k.risk === "amber").length;
  p -= redCount * 8;
  p -= amberCount * 3;
  p = Math.max(0, Math.min(100, p));
  const band = p >= 75 ? "high" : p >= 50 ? "medium" : "low";
  return { percentage: Math.round(p), band };
}

export type ExecutionProbabilityResult = {
  score: number;
  confidenceBand: "low" | "moderate" | "high";
  riskDrivers: string[];
};

export function calculateExecutionProbabilityDynamic(
  totalWeeks: number,
  priority: string,
  constraintsLength: number,
  kpis: KpiSuggestion[],
  options?: {
    injurySeverity?: "low" | "moderate" | "high";
    injuryActive?: boolean;
    milestoneDeviations?: number[];
    eventDistanceKm?: number;
    historicalPpsTrend?: number;
  }
): ExecutionProbabilityResult {
  const riskDrivers: string[] = [];
  let p = 70;

  if (totalWeeks >= 12) p += 10;
  else if (totalWeeks >= 8) p += 5;
  else if (totalWeeks < 4) {
    p -= 15;
    riskDrivers.push("Short timeline");
  }
  if (priority === "High") p += 5;
  if (priority === "Low") {
    p -= 5;
    riskDrivers.push("Low priority");
  }
  if (constraintsLength > 50) {
    p -= 10;
    riskDrivers.push("Heavy constraints");
  }

  const redCount = kpis.filter((k) => k.risk === "red").length;
  const amberCount = kpis.filter((k) => k.risk === "amber").length;
  p -= redCount * 8;
  p -= amberCount * 3;
  if (redCount > 0) riskDrivers.push("Unrealistic KPI targets");
  if (amberCount > 0) riskDrivers.push("Aggressive progression");

  if (options?.injuryActive) {
    const sev = options.injurySeverity ?? "moderate";
    if (sev === "high") {
      p -= 20;
      riskDrivers.push("Active injury (high severity)");
    } else if (sev === "moderate") {
      p -= 12;
      riskDrivers.push("Active injury (moderate)");
    } else {
      p -= 5;
      riskDrivers.push("Active injury (low)");
    }
  }

  if (options?.milestoneDeviations?.length) {
    const avgDev = options.milestoneDeviations.reduce((a, b) => a + b, 0) / options.milestoneDeviations.length;
    if (avgDev > 15) {
      p -= 15;
      riskDrivers.push("Milestone deviation >15%");
    } else if (avgDev > 10) {
      p -= 8;
      riskDrivers.push("Milestone deviation >10%");
    }
  }

  if (options?.eventDistanceKm != null && options.eventDistanceKm >= 42) {
    p -= 5;
    riskDrivers.push("Marathon+ distance load");
  }

  if (options?.historicalPpsTrend != null && options.historicalPpsTrend < 0) {
    p -= 5;
    riskDrivers.push("Declining PPS trend");
  }

  p = Math.max(0, Math.min(100, p));
  const confidenceBand = p >= 75 ? "high" : p >= 50 ? "moderate" : "low";
  return { score: Math.round(p), confidenceBand, riskDrivers };
}
```

## lib/nutritionStore.ts

```ts
/**
 * Nutrition data persistence — localStorage only. No external libraries.
 */

export interface DailyMacroLog {
  date: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
}

export interface BodyComposition {
  bodyweight: number;
  bodyFat: number;
  muscleMass: number;
  lastUpdated: string;
  waistCm?: number;
}

const MACRO_LOGS_KEY = "nutrition_macro_logs";
const BODY_COMP_KEY = "nutrition_body_composition";

function safeParse<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function saveMacroLog(log: DailyMacroLog): void {
  const logs = getMacroLogs();
  const idx = logs.findIndex((l) => l.date === log.date);
  const next = idx >= 0 ? logs.map((l, i) => (i === idx ? log : l)) : [...logs, log];
  next.sort((a, b) => a.date.localeCompare(b.date));
  safeSet(MACRO_LOGS_KEY, JSON.stringify(next));
}

export function getMacroLogs(): DailyMacroLog[] {
  const raw = safeParse<DailyMacroLog[] | null>(MACRO_LOGS_KEY, null);
  return Array.isArray(raw) ? raw : [];
}

export function saveBodyComposition(data: BodyComposition): void {
  const withDate = { ...data, lastUpdated: data.lastUpdated || new Date().toISOString().slice(0, 10) };
  safeSet(BODY_COMP_KEY, JSON.stringify(withDate));
}

export function getBodyComposition(): BodyComposition | null {
  const raw = safeParse<BodyComposition | null>(BODY_COMP_KEY, null);
  if (raw == null || typeof raw.bodyweight !== "number") return null;
  return {
    bodyweight: raw.bodyweight,
    bodyFat: typeof raw.bodyFat === "number" ? raw.bodyFat : 0,
    muscleMass: typeof raw.muscleMass === "number" ? raw.muscleMass : raw.bodyweight * 0.9,
    lastUpdated: typeof raw.lastUpdated === "string" ? raw.lastUpdated : new Date().toISOString().slice(0, 10),
    waistCm: typeof raw.waistCm === "number" ? raw.waistCm : undefined,
  };
}
```

## lib/performanceDataEngine.ts

```ts
/**
 * Performance Data Engine — Human Performance Intelligence System.
 * Calculates readiness, fatigue, recovery, injury risk, training load balance, and performance trend.
 * Reusable across the application. Does not modify UI or existing components.
 *
 * Weights (example structure):
 *   Readiness = Sleep Quality (30%) + HRV Trend (25%) + Resting HR (10%)
 *             + Training Load Balance (20%) + Subjective Readiness (15%)
 */

export type FatigueLevel = "low" | "moderate" | "high";

export type PerformanceTrendDirection = "positive" | "neutral" | "negative";

export type PerformanceDataInput = {
  /** Sleep quality 0–100 (e.g. from sleep_score or derived) */
  sleepQuality: number;
  /** HRV trend: percent change vs baseline, e.g. -10 = 10% drop */
  hrvTrendPercent?: number;
  /** Resting HR (bpm). Lower is better; normalized to 0–100 contribution */
  restingHrBpm?: number;
  /** Training load balance 0–100 (e.g. acute:chronic, zone compliance) */
  trainingLoadBalance: number;
  /** Subjective readiness 0–100 (e.g. checkin_readiness * 10) */
  subjectiveReadiness: number;
  /** Optional: recent fatigue score 0–100 for fatigue level */
  fatigueScore?: number;
  /** Optional: recovery score 0–100 for recovery metric */
  recoveryScoreInput?: number;
  /** Optional: injury risk factors 0–100 aggregate */
  injuryRiskInput?: number;
  /** Optional: strength/performance trend for performanceTrend */
  strengthTrendInput?: "up" | "stable" | "down";
  /** Optional: endurance trend */
  enduranceTrendInput?: "up" | "stable" | "down";
};

export type PerformanceDataOutput = {
  readinessScore: number;
  fatigueLevel: FatigueLevel;
  recoveryScore: number;
  injuryRisk: number;
  trainingLoadBalance: number;
  performanceTrend: PerformanceTrendDirection;
};

const WEIGHT_SLEEP = 0.3;
const WEIGHT_HRV = 0.25;
const WEIGHT_RHR = 0.1;
const WEIGHT_LOAD_BALANCE = 0.2;
const WEIGHT_SUBJECTIVE = 0.15;

/**
 * Normalise resting HR to a 0–100 contribution (e.g. 50 bpm = high score, 80+ = lower).
 * Assumes typical range ~45–85 bpm.
 */
function normaliseRestingHr(bpm: number): number {
  const clamped = Math.max(40, Math.min(90, bpm));
  return Math.round(100 - ((clamped - 40) / 50) * 100);
}

/**
 * Convert HRV trend percent to 0–100 (positive trend = higher score).
 * e.g. +5% => high, -15% => low.
 */
function hrvTrendToScore(percent: number): number {
  const clamped = Math.max(-30, Math.min(20, percent));
  return Math.round(70 + clamped * 1.5);
}

/**
 * Compute readiness from weighted inputs.
 */
function computeReadinessScore(input: PerformanceDataInput): number {
  const sleep = Math.max(0, Math.min(100, input.sleepQuality));
  const hrv = input.hrvTrendPercent != null
    ? Math.max(0, Math.min(100, hrvTrendToScore(input.hrvTrendPercent)))
    : 70;
  const rhr = input.restingHrBpm != null
    ? Math.max(0, Math.min(100, normaliseRestingHr(input.restingHrBpm)))
    : 70;
  const load = Math.max(0, Math.min(100, input.trainingLoadBalance));
  const subj = Math.max(0, Math.min(100, input.subjectiveReadiness));

  const raw =
    sleep * WEIGHT_SLEEP +
    hrv * WEIGHT_HRV +
    rhr * WEIGHT_RHR +
    load * WEIGHT_LOAD_BALANCE +
    subj * WEIGHT_SUBJECTIVE;

  return Math.round(Math.max(0, Math.min(100, raw)));
}

function deriveFatigueLevel(
  readinessScore: number,
  fatigueScore?: number,
  hrvTrendPercent?: number,
  sleepQuality?: number
): FatigueLevel {
  if (fatigueScore != null) {
    if (fatigueScore >= 70) return "high";
    if (fatigueScore >= 45) return "moderate";
    return "low";
  }
  if (readinessScore < 45) return "high";
  if (readinessScore < 60) return "moderate";
  if (hrvTrendPercent != null && hrvTrendPercent < -15 && (sleepQuality ?? 100) < 50) return "high";
  return "low";
}

function deriveRecoveryScore(
  input: PerformanceDataInput,
  readinessScore: number
): number {
  if (input.recoveryScoreInput != null) {
    return Math.max(0, Math.min(100, input.recoveryScoreInput));
  }
  const sleep = Math.max(0, Math.min(100, input.sleepQuality));
  const load = Math.max(0, Math.min(100, input.trainingLoadBalance));
  const subj = Math.max(0, Math.min(100, input.subjectiveReadiness));
  return Math.round(
    readinessScore * 0.4 + sleep * 0.3 + load * 0.15 + subj * 0.15
  );
}

function deriveInjuryRisk(
  input: PerformanceDataInput,
  readinessScore: number,
  fatigueLevel: FatigueLevel
): number {
  if (input.injuryRiskInput != null) {
    return Math.max(0, Math.min(100, input.injuryRiskInput));
  }
  let risk = 100 - readinessScore;
  if (fatigueLevel === "high") risk += 20;
  else if (fatigueLevel === "moderate") risk += 10;
  if (input.trainingLoadBalance < 40) risk += 10;
  return Math.round(Math.max(0, Math.min(100, risk)));
}

function derivePerformanceTrend(input: PerformanceDataInput): PerformanceTrendDirection {
  if (input.strengthTrendInput != null || input.enduranceTrendInput != null) {
    const up = [input.strengthTrendInput, input.enduranceTrendInput].filter((t) => t === "up").length;
    const down = [input.strengthTrendInput, input.enduranceTrendInput].filter((t) => t === "down").length;
    if (up > down) return "positive";
    if (down > up) return "negative";
    return "neutral";
  }
  const readiness = computeReadinessScore(input);
  if (readiness >= 70) return "positive";
  if (readiness <= 45) return "negative";
  return "neutral";
}

/**
 * Main entry: compute all performance data metrics from athlete inputs.
 */
export function calculatePerformanceData(input: PerformanceDataInput): PerformanceDataOutput {
  const readinessScore = computeReadinessScore(input);
  const fatigueLevel = deriveFatigueLevel(
    readinessScore,
    input.fatigueScore,
    input.hrvTrendPercent,
    input.sleepQuality
  );
  const recoveryScore = deriveRecoveryScore(input, readinessScore);
  const injuryRisk = deriveInjuryRisk(input, readinessScore, fatigueLevel);
  const trainingLoadBalance = Math.max(0, Math.min(100, input.trainingLoadBalance));
  const performanceTrend = derivePerformanceTrend(input);

  return {
    readinessScore,
    fatigueLevel,
    recoveryScore: Math.max(0, Math.min(100, recoveryScore)),
    injuryRisk,
    trainingLoadBalance,
    performanceTrend,
  };
}
```

## lib/performanceEngine.ts

```ts
/**
 * Central performance intelligence layer.
 * All modules read/write through this engine; every update triggers recalculateAll().
 */

import {
  loadStrategyGoals,
  saveStrategyGoals,
  addStrategyGoal as addStrategyGoalStore,
  removeStrategyGoal as removeStrategyGoalStore,
  type StrategyGoal,
  type MilestoneProgressEntry,
} from "@/lib/strategyStore";
import { getMacroLogs, getBodyComposition, type DailyMacroLog, type BodyComposition } from "@/lib/nutritionStore";
import {
  calculateExecutionProbabilityDynamic,
  type ExecutionProbabilityResult,
  type KpiSuggestion,
} from "@/lib/goalEngine";
import { emit } from "@/lib/performanceEvents";
import { interpretFeedback, type FeedbackInterpretation } from "@/lib/feedbackInterpreter";

export type ReadinessBreakdown = {
  recovery: number;
  loadBalance: number;
  nutrition: number;
  injury: number;
  sentiment: number;
};

export type ProgrammeInjuryAdjustment = {
  swapExercises: boolean;
  reduceIntensity: boolean;
  showAdjustmentBanner: boolean;
  reason: string | null;
};

export type ProgrammeData = {
  roadmapPhases: { name: string; startWeek: number; endWeek: number }[];
  weeklyTargets: { week: number; volumeKm?: number; focus: string }[];
  injuryAdjusted: boolean;
  volumeCapPercent: number | null;
  foundationExtendedWeeks: number;
};

export type NutritionData = {
  macroLogs: DailyMacroLog[];
  bodyComposition: BodyComposition | null;
  weeklyCalorieTarget: number | null;
  deficitDetected: boolean;
  recoveryRiskFlag: boolean;
};

export type InjuryData = {
  active: boolean;
  severity: "low" | "moderate" | "high" | null;
  type: string | null;
  limitationNotes: string | null;
  sourceGoalId: string | null;
};

export type Metrics = {
  executionProbability: ExecutionProbabilityResult | null;
  injuryRiskScore: number;
  recoveryStatus: "low" | "moderate" | "high";
  performanceForecastSlope: number;
  loadProgressionPercent: number;
  nutritionAlignmentScore: number;
};

export type PerformanceState = {
  goals: StrategyGoal[];
  programmeData: ProgrammeData;
  nutritionData: NutritionData;
  injuryData: InjuryData;
  milestoneProgress: Record<string, MilestoneProgressEntry[]>;
  forecasts: { slope: number; confidence: string }[];
  metrics: Metrics;
  strategicInsights: string[];
  /** Data-driven composite readiness (0–100) */
  readinessComposite: number;
  /** Per-factor breakdown for dial display */
  readinessBreakdown: ReadinessBreakdown;
  /** Last session feedback interpretation (free-text) */
  sessionFeedbackInterpretation: FeedbackInterpretation | null;
  /** Programme adjustment flags when injury detected */
  programmeInjuryAdjustment: ProgrammeInjuryAdjustment;
};

const DEFAULT_PROGRAMME: ProgrammeData = {
  roadmapPhases: [],
  weeklyTargets: [],
  injuryAdjusted: false,
  volumeCapPercent: null,
  foundationExtendedWeeks: 0,
};

const DEFAULT_NUTRITION: NutritionData = {
  macroLogs: [],
  bodyComposition: null,
  weeklyCalorieTarget: null,
  deficitDetected: false,
  recoveryRiskFlag: false,
};

const DEFAULT_INJURY: InjuryData = {
  active: false,
  severity: null,
  type: null,
  limitationNotes: null,
  sourceGoalId: null,
};

const DEFAULT_METRICS: Metrics = {
  executionProbability: null,
  injuryRiskScore: 0,
  recoveryStatus: "moderate",
  performanceForecastSlope: 0,
  loadProgressionPercent: 0,
  nutritionAlignmentScore: 100,
};

const DEFAULT_READINESS_BREAKDOWN: ReadinessBreakdown = {
  recovery: 70,
  loadBalance: 70,
  nutrition: 100,
  injury: 100,
  sentiment: 70,
};

const DEFAULT_PROGRAMME_INJURY_ADJUSTMENT: ProgrammeInjuryAdjustment = {
  swapExercises: false,
  reduceIntensity: false,
  showAdjustmentBanner: false,
  reason: null,
};

/**
 * Dependency matrix (logical):
 * - Milestone deviation increase → execution probability, weekly targets, notify Programme
 * - Injury active → extend foundation, reduce weekly volume, programme adjustments, lower forecast slope
 * - Nutrition deficit → reduce adaptation rate, flag recovery risk
 * - Programme load spike → injury risk probability, roadmap pacing
 */
class PerformanceEngineClass {
  state: PerformanceState = {
    goals: [],
    programmeData: DEFAULT_PROGRAMME,
    nutritionData: DEFAULT_NUTRITION,
    injuryData: DEFAULT_INJURY,
    milestoneProgress: {},
    forecasts: [],
    metrics: DEFAULT_METRICS,
    strategicInsights: [],
    readinessComposite: 70,
    readinessBreakdown: DEFAULT_READINESS_BREAKDOWN,
    sessionFeedbackInterpretation: null,
    programmeInjuryAdjustment: DEFAULT_PROGRAMME_INJURY_ADJUSTMENT,
  };

  private _hydrated = false;

  private hydrate(): void {
    if (this._hydrated) return;
    this.state.goals = loadStrategyGoals();
    this.state.milestoneProgress = {};
    this.state.goals.forEach((g) => {
      if (g.milestoneProgress?.length) this.state.milestoneProgress[g.id] = g.milestoneProgress;
    });
    this.state.nutritionData = {
      ...DEFAULT_NUTRITION,
      macroLogs: getMacroLogs(),
      bodyComposition: getBodyComposition(),
    };
    const activeGoal = this.state.goals.find((g) => g.injuryStatus?.active);
    if (activeGoal?.injuryStatus) {
      this.state.injuryData = {
        active: true,
        severity: activeGoal.injuryStatus.severity ?? null,
        type: activeGoal.injuryStatus.type ?? null,
        limitationNotes: activeGoal.injuryStatus.limitationNotes ?? null,
        sourceGoalId: activeGoal.id,
      };
    } else {
      this.state.injuryData = DEFAULT_INJURY;
    }
    this._hydrated = true;
    this.recalculateAll();
  }

  getState(): PerformanceState {
    this.hydrate();
    return this.state;
  }

  getGoals(): StrategyGoal[] {
    this.hydrate();
    return this.state.goals;
  }

  getProgrammeData(): ProgrammeData {
    this.hydrate();
    return this.state.programmeData;
  }

  getNutritionData(): NutritionData {
    this.hydrate();
    return this.state.nutritionData;
  }

  getInjuryData(): InjuryData {
    this.hydrate();
    return this.state.injuryData;
  }

  getMetrics(): Metrics {
    this.hydrate();
    return this.state.metrics;
  }

  getStrategicInsights(): string[] {
    this.hydrate();
    return this.state.strategicInsights;
  }

  getReadinessComposite(): number {
    this.hydrate();
    return this.state.readinessComposite;
  }

  getReadinessBreakdown(): ReadinessBreakdown {
    this.hydrate();
    return this.state.readinessBreakdown;
  }

  getProgrammeInjuryAdjustment(): ProgrammeInjuryAdjustment {
    this.hydrate();
    return this.state.programmeInjuryAdjustment;
  }

  interpretSessionFeedback(freeText: string): FeedbackInterpretation {
    this.hydrate();
    const interp = interpretFeedback(freeText);
    this.state.sessionFeedbackInterpretation = interp;
    const hasPain = interp.kneePain || interp.shoulderPain || interp.backPain;
    if (hasPain && this.state.goals.length > 0) {
      const area = interp.rawAreas[0] ?? "general";
      this.updateInjury({
        active: true,
        severity: "moderate",
        type: area,
        limitationNotes: freeText.slice(0, 200),
        sourceGoalId: this.state.goals[0].id,
      });
    }
    this.recalculateAll();
    return interp;
  }

  updateGoal(goalId: string, updates: Partial<Omit<StrategyGoal, "id" | "createdAt">>): void {
    this.hydrate();
    const idx = this.state.goals.findIndex((g) => g.id === goalId);
    if (idx < 0) return;
    this.state.goals[idx] = { ...this.state.goals[idx], ...updates };
    saveStrategyGoals(this.state.goals);
    emit("goalUpdated", { goalId, updates });
    this.recalculateAll();
  }

  addGoal(goal: Omit<StrategyGoal, "id" | "createdAt">): StrategyGoal {
    this.hydrate();
    const added = addStrategyGoalStore(goal);
    this.state.goals = loadStrategyGoals();
    emit("goalUpdated", { goalId: added.id, updates: goal });
    this.recalculateAll();
    return added;
  }

  removeGoal(goalId: string): StrategyGoal[] {
    this.hydrate();
    const next = removeStrategyGoalStore(goalId);
    this.state.goals = next;
    emit("goalsReplaced", { goals: next });
    this.recalculateAll();
    return next;
  }

  setGoals(goals: StrategyGoal[]): void {
    this.hydrate();
    this.state.goals = goals;
    saveStrategyGoals(goals);
    emit("goalsReplaced", { goals });
    this.recalculateAll();
  }

  updateMilestone(goalId: string, milestoneProgress: MilestoneProgressEntry[]): void {
    this.hydrate();
    this.state.milestoneProgress[goalId] = milestoneProgress;
    const g = this.state.goals.find((go) => go.id === goalId);
    if (g) {
      g.milestoneProgress = milestoneProgress;
      saveStrategyGoals(this.state.goals);
    }
    emit("milestoneUpdated", { goalId, milestoneProgress });
    this.recalculateAll();
  }

  updateProgramme(data: Partial<ProgrammeData>): void {
    this.hydrate();
    this.state.programmeData = { ...this.state.programmeData, ...data };
    emit("programmeUpdated", this.state.programmeData);
    this.recalculateAll();
  }

  updateNutrition(data: Partial<NutritionData>): void {
    this.hydrate();
    this.state.nutritionData = { ...this.state.nutritionData, ...data };
    emit("nutritionUpdated", this.state.nutritionData);
    this.recalculateAll();
  }

  updateInjury(data: Partial<InjuryData>): void {
    this.hydrate();
    this.state.injuryData = { ...this.state.injuryData, ...data };
    emit("injuryUpdated", this.state.injuryData);
    this.recalculateAll();
  }

  recalculateAll(): void {
    this.hydrate();
    this.calculateExecutionProbability();
    this.calculateInjuryRisk();
    this.calculateRecoveryStatus();
    this.calculatePerformanceForecast();
    this.calculateLoadProgression();
    this.calculateNutritionAlignment();
    this.calculateReadiness();
    this.state.programmeData = this.deriveProgrammeData();
    this.state.injuryData = this.deriveInjuryData();
    this.adjustProgrammeForInjury();
    this.state.strategicInsights = this.generateStrategicInsights();
    emit("stateRecalculated", this.state);
    emit("strategicInsightsUpdated", this.state.strategicInsights);
  }

  private calculateExecutionProbability(): void {
    const selected = this.state.goals[0];
    if (!selected?.roadmap) {
      this.state.metrics.executionProbability = null;
      return;
    }
    const r = selected.roadmap;
    this.state.metrics.executionProbability = calculateExecutionProbabilityDynamic(
      r.totalWeeks,
      r.priority,
      (r.constraints ?? "").length,
      r.kpis,
      {
        injuryActive: selected.injuryStatus?.active,
        injurySeverity: selected.injuryStatus?.severity,
        milestoneDeviations: selected.milestoneProgress?.map((m) => m.deviation ?? 0).filter((d) => d !== 0),
        eventDistanceKm: selected.eventDistance,
      }
    );
  }

  private calculateInjuryRisk(): void {
    if (this.state.injuryData.active && this.state.injuryData.severity === "high") {
      this.state.metrics.injuryRiskScore = 75;
    } else if (this.state.injuryData.active && this.state.injuryData.severity === "moderate") {
      this.state.metrics.injuryRiskScore = 50;
    } else if (this.state.injuryData.active) {
      this.state.metrics.injuryRiskScore = 30;
    } else {
      this.state.metrics.injuryRiskScore = Math.min(25, this.state.metrics.loadProgressionPercent);
    }
  }

  private calculateRecoveryStatus(): void {
    if (this.state.nutritionData.deficitDetected || this.state.nutritionData.recoveryRiskFlag) {
      this.state.metrics.recoveryStatus = "low";
    } else if (this.state.injuryData.active) {
      this.state.metrics.recoveryStatus = "moderate";
    } else {
      this.state.metrics.recoveryStatus = "high";
    }
  }

  private calculatePerformanceForecast(): void {
    let slope = 2;
    if (this.state.injuryData.active) slope -= 0.8;
    if (this.state.nutritionData.deficitDetected) slope -= 0.5;
    const exec = this.state.metrics.executionProbability;
    if (exec && exec.confidenceBand === "low") slope -= 0.5;
    this.state.metrics.performanceForecastSlope = Math.max(0, slope);
    this.state.forecasts = [{ slope: this.state.metrics.performanceForecastSlope, confidence: exec?.confidenceBand ?? "moderate" }];
  }

  private calculateLoadProgression(): void {
    const prog = this.state.programmeData;
    const cap = prog.volumeCapPercent ?? 100;
    this.state.metrics.loadProgressionPercent = Math.min(100, cap);
  }

  private calculateNutritionAlignment(): void {
    const logs = this.state.nutritionData.macroLogs;
    const last7 = logs.slice(-7);
    const avgCal = last7.length ? last7.reduce((s, l) => s + l.calories, 0) / last7.length : 0;
    this.state.nutritionData.deficitDetected = avgCal > 0 && avgCal < 2000;
    this.state.nutritionData.recoveryRiskFlag =
      this.state.nutritionData.deficitDetected || (avgCal > 0 && avgCal < 1800 && !this.state.nutritionData.bodyComposition);
    let score = 100;
    if (this.state.nutritionData.deficitDetected) score -= 25;
    if (this.state.nutritionData.recoveryRiskFlag) score -= 15;
    this.state.metrics.nutritionAlignmentScore = Math.max(0, score);
  }

  calculateReadiness(): void {
    const recovery = this.state.metrics.recoveryStatus === "high" ? 85 : this.state.metrics.recoveryStatus === "moderate" ? 65 : 45;
    const loadBalance = Math.max(0, 100 - this.state.metrics.loadProgressionPercent);
    const nutrition = this.state.metrics.nutritionAlignmentScore;
    const injury = this.state.injuryData.active
      ? (this.state.injuryData.severity === "high" ? 30 : this.state.injuryData.severity === "moderate" ? 50 : 70)
      : 100;
    const feedback = this.state.sessionFeedbackInterpretation;
    const sentiment = feedback?.sentiment === "positive" ? 90 : feedback?.sentiment === "negative" ? 40 : 70;
    this.state.readinessBreakdown = {
      recovery,
      loadBalance,
      nutrition,
      injury,
      sentiment,
    };
    const w = { recovery: 0.25, loadBalance: 0.2, nutrition: 0.2, injury: 0.2, sentiment: 0.15 };
    this.state.readinessComposite = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          recovery * w.recovery +
            loadBalance * w.loadBalance +
            nutrition * w.nutrition +
            injury * w.injury +
            sentiment * w.sentiment
        )
      )
    );
  }

  private adjustProgrammeForInjury(): void {
    const active = this.state.injuryData.active;
    const feedback = this.state.sessionFeedbackInterpretation;
    const hasPainFromFeedback = feedback?.kneePain || feedback?.shoulderPain || feedback?.backPain;
    if (!active && !hasPainFromFeedback) {
      this.state.programmeInjuryAdjustment = DEFAULT_PROGRAMME_INJURY_ADJUSTMENT;
      return;
    }
    const reason = this.state.injuryData.type
      ? `${this.state.injuryData.type} limitation`
      : feedback?.rawAreas?.length
        ? `${feedback.rawAreas.join("/")} pain from feedback`
        : "Injury flagged";
    this.state.programmeInjuryAdjustment = {
      swapExercises: true,
      reduceIntensity: true,
      showAdjustmentBanner: true,
      reason,
    };
  }

  private deriveProgrammeData(): ProgrammeData {
    const g = this.state.goals.find((x) => x.roadmap?.phases?.length);
    if (!g?.roadmap) return { ...this.state.programmeData, roadmapPhases: [], weeklyTargets: [] };
    const injuryActive = g.injuryStatus?.active ?? false;
    const phases = g.roadmap.phases.map((p) => ({ name: p.name, startWeek: p.startWeek, endWeek: p.endWeek }));
    const weeklyTargets = g.roadmap.weeklyTargets ?? [];
    return {
      roadmapPhases: phases,
      weeklyTargets,
      injuryAdjusted: injuryActive,
      volumeCapPercent: injuryActive ? 85 : null,
      foundationExtendedWeeks: injuryActive ? 2 : 0,
    };
  }

  private deriveInjuryData(): InjuryData {
    const active = this.state.goals.find((g) => g.injuryStatus?.active);
    if (!active?.injuryStatus) return DEFAULT_INJURY;
    return {
      active: true,
      severity: active.injuryStatus.severity ?? null,
      type: active.injuryStatus.type ?? null,
      limitationNotes: active.injuryStatus.limitationNotes ?? null,
      sourceGoalId: active.id,
    };
  }

  generateStrategicInsights(): string[] {
    const out: string[] = [];
    const g = this.state.goals[0];
    if (g?.milestoneProgress?.length) {
      const devs = g.milestoneProgress.map((m) => m.deviation ?? 0).filter((d) => d !== 0);
      const avg = devs.length ? devs.reduce((a, b) => a + b, 0) / devs.length : 0;
      if (avg > 10) {
        const behind = g.milestoneProgress.filter((m) => (m.deviation ?? 0) > 8);
        behind.forEach((m, i) => out.push(`Milestone ${i + 1} behind by ${Math.round(m.deviation ?? 0)}%`));
      }
    }
    if (this.state.metrics.loadProgressionPercent > 0 && this.state.programmeData.volumeCapPercent != null) {
      const excess = this.state.metrics.loadProgressionPercent - (this.state.programmeData.volumeCapPercent ?? 100);
      if (excess > 10) out.push(`Volume progression exceeds safe threshold by ${Math.round(excess)}%`);
    }
    if (this.state.nutritionData.deficitDetected) {
      out.push("Nutrition deficit may limit peak phase adaptation");
    }
    if (this.state.injuryData.active) {
      out.push("Active injury: foundation extended and volume capped");
    }
    const exec = this.state.metrics.executionProbability;
    if (exec && exec.confidenceBand === "low" && exec.riskDrivers?.length) {
      out.push(`Execution risk: ${exec.riskDrivers[0]}`);
    }
    return out;
  }

  /** Profile snapshot for identity/capacity/recovery breakdown (pass from dashboard). */
  calculateCapacityBreakdown(snapshot: {
    aerobic_score?: number;
    strength_upper?: number;
    strength_lower?: number;
    loadProgressionPercent?: number;
    nutritionAlignmentScore?: number;
  } | null): {
    score: number;
    trend: "up" | "down" | "stable";
    delta: number;
    contributors: { name: string; value: number }[];
    limitingFactor: string | null;
    programmeInfluence: string | null;
  } {
    this.hydrate();
    const a = snapshot?.aerobic_score ?? 60;
    const s = (snapshot?.strength_upper ?? 60 + (snapshot?.strength_lower ?? 60)) / 2;
    const load = snapshot?.loadProgressionPercent ?? this.state.metrics.loadProgressionPercent;
    const nut = snapshot?.nutritionAlignmentScore ?? this.state.metrics.nutritionAlignmentScore;
    const score = Math.round((a * 0.5 + s * 0.5) * 0.6 + (100 - load) * 0.2 + nut * 0.01 * 20);
    const capped = Math.max(0, Math.min(100, score));
    const contributors = [
      { name: "Aerobic", value: a },
      { name: "Strength", value: Math.round(s) },
      { name: "Load balance", value: 100 - load },
      { name: "Nutrition", value: nut },
    ];
    const limiting = nut < 70 ? "Nutrition" : load > 80 ? "Load" : a < s ? "Aerobic" : "Strength";
    const programmeInfluence = this.state.programmeData.injuryAdjusted ? "Volume capped for injury" : "Full programme load";
    return {
      score: capped,
      trend: capped >= 72 ? "up" : capped <= 55 ? "down" : "stable",
      delta: capped >= 72 ? 4 : capped <= 55 ? -3 : 0,
      contributors,
      limitingFactor: limiting,
      programmeInfluence,
    };
  }

  calculateRecoveryBreakdown(snapshot: { sleep_score?: number; stress_level?: number } | null): {
    score: number;
    trend: "up" | "down" | "stable";
    delta: number;
    contributors: { name: string; value: number }[];
    limitingFactor: string | null;
    programmeInfluence: string | null;
  } {
    this.hydrate();
    const rb = this.state.readinessBreakdown;
    const sleep = snapshot?.sleep_score ?? 70;
    const stress = 100 - (snapshot?.stress_level ?? 40);
    const score = Math.round(
      rb.recovery * 0.35 + rb.loadBalance * 0.2 + rb.nutrition * 0.2 + rb.injury * 0.15 + rb.sentiment * 0.1
    );
    const capped = Math.max(0, Math.min(100, score));
    const contributors = [
      { name: "Recovery", value: rb.recovery },
      { name: "Load", value: rb.loadBalance },
      { name: "Nutrition", value: rb.nutrition },
      { name: "Injury", value: rb.injury },
      { name: "Sentiment", value: rb.sentiment },
    ];
    const limiting =
      rb.injury < 60 ? "Injury" : rb.recovery < 60 ? "Recovery" : rb.nutrition < 70 ? "Nutrition" : null;
    return {
      score: capped,
      trend: capped >= 70 ? "up" : capped <= 50 ? "down" : "stable",
      delta: capped >= 70 ? 3 : capped <= 50 ? -4 : 0,
      contributors,
      limitingFactor: limiting,
      programmeInfluence: this.state.injuryData.active ? "Recovery prioritised in programme" : null,
    };
  }

  calculateIdentityProfile(snapshot: {
    aerobic_score?: number;
    strength_upper?: number;
    strength_lower?: number;
    primary_limiter?: string;
    goal?: string;
    focus?: string;
  } | null): {
    score: number;
    trend: "up" | "down" | "stable";
    delta: number;
    contributors: { name: string; value: number }[];
    limitingFactor: string | null;
    programmeInfluence: string | null;
    strengthBiasPercent: number;
    aerobicBiasPercent: number;
    loadTolerance: string;
  } {
    this.hydrate();
    const a = snapshot?.aerobic_score ?? 60;
    const su = snapshot?.strength_upper ?? 60;
    const sl = snapshot?.strength_lower ?? 60;
    const strength = (su + sl) / 2;
    const total = a + strength;
    const strengthBiasPercent = total > 0 ? Math.round((strength / total) * 100) : 50;
    const aerobicBiasPercent = total > 0 ? Math.round((a / total) * 100) : 50;
    const score = Math.round((a * 0.5 + strength * 0.5));
    const loadTolerance =
      this.state.metrics.loadProgressionPercent > 85 ? "Capped" : this.state.metrics.loadProgressionPercent > 60 ? "Moderate" : "High";
    return {
      score: Math.max(0, Math.min(100, score)),
      trend: score >= 70 ? "up" : score <= 50 ? "down" : "stable",
      delta: score >= 70 ? 2 : score <= 50 ? -2 : 0,
      contributors: [
        { name: "Aerobic", value: a },
        { name: "Strength (upper)", value: su },
        { name: "Strength (lower)", value: sl },
      ],
      limitingFactor: snapshot?.primary_limiter ?? null,
      programmeInfluence: this.state.programmeData.roadmapPhases.length ? "Aligned to current phase" : null,
      strengthBiasPercent,
      aerobicBiasPercent,
      loadTolerance,
    };
  }

  calculateTrendDeltas(snapshot: {
    aerobic_score?: number;
    strength_upper?: number;
    strength_lower?: number;
    sleep_score?: number;
    readiness_score?: number;
  } | null): Record<string, number[]> {
    this.hydrate();
    const a = snapshot?.aerobic_score ?? 65;
    const s = ((snapshot?.strength_upper ?? 60) + (snapshot?.strength_lower ?? 60)) / 2;
    const sleep = snapshot?.sleep_score ?? 70;
    const readiness = snapshot?.readiness_score ?? this.state.readinessComposite;
    const gen = (base: number, drift: number) =>
      Array.from({ length: 6 }, (_, i) => Math.max(0, Math.min(100, base + (i - 2) * drift + (i % 2 === 0 ? 1 : -1))));
    return {
      "Aerobic Capacity": gen(a, 1.5),
      "Sleep Quality": gen(sleep, 0.8),
      "Hip Mobility": gen(65, 0.5),
      "Strength (Upper)": gen(snapshot?.strength_upper ?? 60, 1),
      "Strength (Lower)": gen(snapshot?.strength_lower ?? 60, 1),
      "Work Capacity": gen((a + s) / 2, 1.2),
      Recovery: gen(readiness, 1),
      Capacity: gen((a * 0.5 + s * 0.5), 1),
    };
  }

  getDecisionTransparency(snapshot: {
    current_week?: number;
    goal?: string;
    focus?: string;
    primary_limiter?: string;
  } | null): {
    phaseExplanation: string;
    focusExplanation: string;
    capacityReasoning: string;
    riskFlags: string[];
  } {
    this.hydrate();
    const week = snapshot?.current_week ?? 1;
    const phase =
      week <= 2 ? "Accumulation" : week <= 4 ? "Intensification" : week <= 5 ? "Overreach" : "Deload";
    const phaseExplanation = `Week ${week}: ${phase} — ${phase === "Accumulation" ? "Building volume and base." : phase === "Intensification" ? "Increasing intensity and specificity." : phase === "Overreach" ? "Short overload before taper." : "Recovery and consolidation."}`;
    const focusExplanation = snapshot?.goal || snapshot?.focus
      ? `Programme targets ${snapshot.goal || snapshot.focus}. Primary limiter: ${snapshot.primary_limiter ?? "—"}.`
      : "No specific goal set. Set a goal in Strategy to align programme.";
    const cap = this.calculateCapacityBreakdown(snapshot);
    const capacityReasoning = cap.limitingFactor
      ? `Capacity limited by ${cap.limitingFactor}. ${cap.programmeInfluence ?? ""}`
      : `Capacity at ${cap.score}/100. ${cap.programmeInfluence ?? ""}`;
    const riskFlags: string[] = [];
    if (this.state.injuryData.active) riskFlags.push("Active injury");
    if (this.state.nutritionData.deficitDetected) riskFlags.push("Nutrition deficit");
    if (this.state.metrics.injuryRiskScore > 50) riskFlags.push("Elevated injury risk");
    return { phaseExplanation, focusExplanation, capacityReasoning, riskFlags };
  }

  invalidate(): void {
    this._hydrated = false;
  }
}

export const PerformanceEngine = new PerformanceEngineClass();
```

## lib/performanceEvents.ts

```ts
/**
 * Lightweight event bus for performance intelligence layer.
 * Modules subscribe to relevant events; engine emits on state changes.
 */

export type PerformanceEvent =
  | "goalUpdated"
  | "goalsReplaced"
  | "milestoneUpdated"
  | "programmeUpdated"
  | "nutritionUpdated"
  | "injuryUpdated"
  | "stateRecalculated"
  | "strategicInsightsUpdated";

type Listener = (data: unknown) => void;

const listeners = new Map<PerformanceEvent, Set<Listener>>();

function getListeners(event: PerformanceEvent): Set<Listener> {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  return set;
}

export function subscribe(event: PerformanceEvent, callback: Listener): () => void {
  const set = getListeners(event);
  set.add(callback);
  return () => set.delete(callback);
}

export function emit(event: PerformanceEvent, data?: unknown): void {
  getListeners(event).forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.warn("[performanceEvents]", event, e);
    }
  });
}
```

## lib/profile/benchmarkExerciseOptions.ts

```ts
/**
 * Full exercise options for benchmarks — used for "Add exercise" dropdown per section.
 * Each section has hundreds of options so users can add any exercise they track.
 */

export type BenchmarkOption = { key: string; label: string; unit?: string };

/** Strength (1RM kg) — compound and isolation exercises */
export const STRENGTH_OPTIONS: BenchmarkOption[] = [
  // Squat pattern
  { key: "back_squat", label: "Back Squat" },
  { key: "front_squat", label: "Front Squat" },
  { key: "overhead_squat", label: "Overhead Squat" },
  { key: "safety_bar_squat", label: "Safety Bar Squat" },
  { key: "box_squat", label: "Box Squat" },
  { key: "pause_squat", label: "Pause Squat" },
  { key: "goblet_squat", label: "Goblet Squat" },
  { key: "belt_squat", label: "Belt Squat" },
  { key: "hack_squat", label: "Hack Squat" },
  { key: "leg_press", label: "Leg Press" },
  { key: "split_squat", label: "Rear-Foot Elevated Split Squat" },
  { key: "bulgarian_split_squat", label: "Bulgarian Split Squat" },
  { key: "lunge", label: "Walking Lunge" },
  { key: "lateral_lunge", label: "Lateral Lunge" },
  { key: "step_up", label: "Step-Up" },
  { key: "single_leg_squat", label: "Single Leg Squat" },
  { key: "sissy_squat", label: "Sissy Squat" },
  // Hip hinge
  { key: "deadlift", label: "Deadlift" },
  { key: "trap_bar_deadlift", label: "Trap Bar Deadlift" },
  { key: "rdl", label: "Romanian Deadlift" },
  { key: "db_rdl", label: "Dumbbell RDL" },
  { key: "stiff_leg_deadlift", label: "Stiff Leg Deadlift" },
  { key: "deficit_deadlift", label: "Deficit Deadlift" },
  { key: "snatch_grip_deadlift", label: "Snatch Grip Deadlift" },
  { key: "good_morning", label: "Good Morning" },
  { key: "hip_thrust", label: "Hip Thrust" },
  { key: "glute_bridge", label: "Glute Bridge" },
  { key: "single_leg_hip_thrust", label: "Single Leg Hip Thrust" },
  { key: "kettlebell_swing", label: "Kettlebell Swing" },
  // Horizontal push
  { key: "bench_press", label: "Bench Press" },
  { key: "incline_bench_press", label: "Incline Bench Press" },
  { key: "decline_bench_press", label: "Decline Bench Press" },
  { key: "close_grip_bench", label: "Close Grip Bench Press" },
  { key: "floor_press", label: "Floor Press" },
  { key: "db_press", label: "Dumbbell Press" },
  { key: "db_incline_press", label: "Dumbbell Incline Press" },
  { key: "db_decline_press", label: "Dumbbell Decline Press" },
  { key: "push_up", label: "Push-Up" },
  { key: "dip", label: "Weighted Dip" },
  { key: "chest_fly", label: "Cable/Dumbbell Fly" },
  { key: "pec_deck", label: "Pec Deck" },
  { key: "machine_chest_press", label: "Machine Chest Press" },
  { key: "landmine_press", label: "Landmine Press" },
  // Vertical push
  { key: "overhead_press", label: "Overhead Press" },
  { key: "push_press", label: "Push Press" },
  { key: "strict_press", label: "Strict Press" },
  { key: "db_shoulder_press", label: "Dumbbell Shoulder Press" },
  { key: "arnold_press", label: "Arnold Press" },
  { key: "seated_ohp", label: "Seated Overhead Press" },
  { key: "landmine_ohp", label: "Landmine OHP" },
  { key: "machine_ohp", label: "Machine Shoulder Press" },
  { key: "lateral_raise", label: "Lateral Raise" },
  { key: "front_raise", label: "Front Raise" },
  { key: "reverse_fly", label: "Reverse Fly" },
  { key: "face_pull", label: "Face Pull" },
  { key: "upright_row", label: "Upright Row" },
  // Horizontal pull
  { key: "barbell_row", label: "Barbell Row" },
  { key: "db_row", label: "Dumbbell Row" },
  { key: "t_bar_row", label: "T-Bar Row" },
  { key: "chest_supported_row", label: "Chest Supported Row" },
  { key: "cable_row", label: "Cable Row" },
  { key: "inverted_row", label: "Inverted Row" },
  { key: "landmine_row", label: "Landmine Row" },
  { key: "single_arm_row", label: "Single Arm Row" },
  { key: "pendlay_row", label: "Pendlay Row" },
  { key: "yates_row", label: "Yates Row" },
  // Vertical pull
  { key: "weighted_pullup", label: "Weighted Pull-Up" },
  { key: "chin_up", label: "Chin-Up" },
  { key: "neutral_pullup", label: "Neutral Grip Pull-Up" },
  { key: "lat_pulldown", label: "Lat Pulldown" },
  { key: "close_grip_pulldown", label: "Close Grip Pulldown" },
  { key: "straight_arm_pulldown", label: "Straight Arm Pulldown" },
  { key: "assisted_pullup", label: "Assisted Pull-Up" },
  // Olympic & power
  { key: "power_clean", label: "Power Clean" },
  { key: "clean_and_jerk", label: "Clean & Jerk" },
  { key: "snatch", label: "Snatch" },
  { key: "hang_clean", label: "Hang Clean" },
  { key: "hang_snatch", label: "Hang Snatch" },
  { key: "clean_pull", label: "Clean Pull" },
  { key: "snatch_pull", label: "Snatch Pull" },
  { key: "push_jerk", label: "Push Jerk" },
  { key: "split_jerk", label: "Split Jerk" },
  // Leg isolation
  { key: "leg_curl", label: "Leg Curl" },
  { key: "leg_extension", label: "Leg Extension" },
  { key: "standing_leg_curl", label: "Standing Leg Curl" },
  { key: "seated_leg_curl", label: "Seated Leg Curl" },
  { key: "nordic_curl", label: "Nordic Curl" },
  { key: "hip_abduction", label: "Hip Abduction" },
  { key: "hip_adduction", label: "Hip Adduction" },
  { key: "calf_raise", label: "Calf Raise" },
  { key: "seated_calf_raise", label: "Seated Calf Raise" },
  // Arms & misc
  { key: "barbell_curl", label: "Barbell Curl" },
  { key: "db_curl", label: "Dumbbell Curl" },
  { key: "hammer_curl", label: "Hammer Curl" },
  { key: "preacher_curl", label: "Preacher Curl" },
  { key: "cable_curl", label: "Cable Curl" },
  { key: "tricep_pushdown", label: "Tricep Pushdown" },
  { key: "skull_crusher", label: "Skull Crusher" },
  { key: "tricep_extension", label: "Tricep Extension" },
  { key: "overhead_tricep", label: "Overhead Tricep Extension" },
  { key: "close_grip_pushup", label: "Close Grip Push-Up" },
  { key: "wrist_curl", label: "Wrist Curl" },
  { key: "reverse_wrist_curl", label: "Reverse Wrist Curl" },
  { key: "farmer_carry", label: "Farmer Carry" },
  { key: "suitcase_carry", label: "Suitcase Carry" },
  // Kettlebell
  { key: "kb_goblet_squat", label: "KB Goblet Squat" },
  { key: "kb_clean", label: "Kettlebell Clean" },
  { key: "kb_press", label: "Kettlebell Press" },
  { key: "kb_snatch", label: "Kettlebell Snatch" },
  { key: "kb_tgu", label: "Turkish Get-Up" },
  // More variants (expand to 200+)
  { key: "zercher_squat", label: "Zercher Squat" },
  { key: "jefferson_deadlift", label: "Jefferson Deadlift" },
  { key: "sumo_deadlift", label: "Sumo Deadlift" },
  { key: "conventional_deadlift", label: "Conventional Deadlift" },
  { key: "pin_squat", label: "Pin Squat" },
  { key: "v_squat", label: "V-Squat" },
  { key: "pistol_squat", label: "Pistol Squat" },
  { key: "cossack_squat", label: "Cossack Squat" },
  { key: "squat_jump", label: "Squat Jump (loaded)" },
  { key: "board_press", label: "Board Press" },
  { key: "spoto_press", label: "Spoto Press" },
  { key: "jm_press", label: "JM Press" },
  { key: "bradford_press", label: "Bradford Press" },
  { key: "behind_neck_press", label: "Behind Neck Press" },
  { key: "cuban_press", label: "Cuban Press" },
  { key: "bent_over_lateral", label: "Bent Over Lateral Raise" },
  { key: "pull_up_wide", label: "Wide Grip Pull-Up" },
  { key: "pull_up_close", label: "Close Grip Pull-Up" },
  { key: "commando_pullup", label: "Commando Pull-Up" },
  { key: "muscle_up", label: "Muscle-Up" },
  { key: "front_raise_cable", label: "Cable Front Raise" },
  { key: "shrug", label: "Barbell Shrug" },
  { key: "db_shrug", label: "Dumbbell Shrug" },
  { key: "rack_pull", label: "Rack Pull" },
  { key: "block_pull", label: "Block Pull" },
  { key: "romanian_deadlift_single", label: "Single Leg RDL" },
  { key: "back_extension", label: "Back Extension" },
  { key: "reverse_hyper", label: "Reverse Hyper" },
  { key: "ghr", label: "Glute Ham Raise" },
  { key: "ab_wheel", label: "Ab Wheel" },
  { key: "pallof_press", label: "Pallof Press" },
  { key: "dead_bug", label: "Dead Bug" },
  { key: "hanging_leg_raise", label: "Hanging Leg Raise" },
  { key: "plank", label: "Plank" },
  { key: "dragon_flag", label: "Dragon Flag" },
  { key: "squat_clean", label: "Squat Clean" },
  { key: "power_snatch", label: "Power Snatch" },
  { key: "squat_snatch", label: "Squat Snatch" },
  { key: "one_arm_row", label: "One Arm Row" },
  { key: "meadows_row", label: "Meadows Row" },
  { key: "machine_row", label: "Machine Row" },
  { key: "chest_press_machine", label: "Machine Chest Press" },
  { key: "smith_bench", label: "Smith Machine Bench" },
  { key: "smith_squat", label: "Smith Machine Squat" },
  { key: "smith_ohp", label: "Smith Machine OHP" },
  { key: "cable_fly_high", label: "High Cable Fly" },
  { key: "cable_fly_low", label: "Low Cable Fly" },
  { key: "crossover", label: "Cable Crossover" },
  { key: "concentration_curl", label: "Concentration Curl" },
  { key: "spider_curl", label: "Spider Curl" },
  { key: "ez_bar_curl", label: "EZ Bar Curl" },
  { key: "reverse_curl", label: "Reverse Curl" },
  { key: "lying_tricep", label: "Lying Tricep Extension" },
  { key: "diamond_pushup", label: "Diamond Push-Up" },
  { key: "bench_dip", label: "Bench Dip" },
  { key: "pullover", label: "Pullover" },
  { key: "lat_pull_single", label: "Single Arm Lat Pulldown" },
  { key: "neutral_lat_pull", label: "Neutral Lat Pulldown" },
  { key: "reverse_grip_pulldown", label: "Reverse Grip Pulldown" },
  { key: "wide_lat_pull", label: "Wide Grip Lat Pulldown" },
  { key: "leg_press_single", label: "Single Leg Press" },
  { key: "hack_squat_narrow", label: "Narrow Hack Squat" },
  { key: "v_squat_wide", label: "Wide V-Squat" },
  { key: "curtsy_lunge", label: "Curtsy Lunge" },
  { key: "reverse_lunge", label: "Reverse Lunge" },
  { key: "deficit_reverse_lunge", label: "Deficit Reverse Lunge" },
  { key: "rdl_single_leg", label: "Single Leg RDL" },
  { key: "back_squat_high_bar", label: "High Bar Back Squat" },
  { key: "back_squat_low_bar", label: "Low Bar Back Squat" },
  { key: "front_rack_lunge", label: "Front Rack Lunge" },
  { key: "sldl", label: "Stiff Leg Deadlift" },
  { key: "sumo_rdl", label: "Sumo RDL" },
  { key: "snatch_balance", label: "Snatch Balance" },
  { key: "heaving_snatch", label: "Heaving Snatch Balance" },
  { key: "drop_snatch", label: "Drop Snatch" },
  { key: "push_press_behind", label: "Behind Neck Push Press" },
  { key: "btn_snatch_grip", label: "BTN Snatch Grip Press" },
  { key: "z_press", label: "Z-Press" },
  { key: "seated_good_morning", label: "Seated Good Morning" },
  { key: "good_morning_safety_bar", label: "Safety Bar Good Morning" },
  { key: "belt_squat_leg", label: "Belt Squat (single leg)" },
  { key: "sissy_squat_weighted", label: "Weighted Sissy Squat" },
  { key: "leg_extension_single", label: "Single Leg Extension" },
  { key: "leg_curl_standing_single", label: "Standing Single Leg Curl" },
  { key: "glute_kickback", label: "Glute Kickback" },
  { key: "hip_abduction_seated", label: "Seated Hip Abduction" },
  { key: "hip_abduction_standing", label: "Standing Hip Abduction" },
  { key: "donkey_kick", label: "Donkey Kick" },
  { key: "calf_raise_leg_press", label: "Leg Press Calf Raise" },
  { key: "donkey_calf_raise", label: "Donkey Calf Raise" },
  { key: "tibia_raise", label: "Tibia Raise" },
  { key: "bicep_curl_cable", label: "Cable Bicep Curl" },
  { key: "inceline_db_curl", label: "Incline Dumbbell Curl" },
  { key: "reverse_pec_deck", label: "Reverse Pec Deck" },
  { key: "scaption", label: "Scaption" },
  { key: "prone_y_raise", label: "Prone Y-Raise" },
  { key: "external_rotation", label: "External Rotation" },
  { key: "internal_rotation", label: "Internal Rotation" },
  { key: "cuban_rotation", label: "Cuban Rotation" },
  { key: "bottoms_up_kb_press", label: "Bottoms Up KB Press" },
  { key: "kb_floor_press", label: "KB Floor Press" },
  { key: "db_pullover", label: "Dumbbell Pullover" },
  { key: "straight_arm_pulldown_db", label: "Straight Arm DB Pullover" },
  { key: "renegade_row", label: "Renegade Row" },
  { key: "single_arm_landmine", label: "Single Arm Landmine Row" },
  { key: "chest_supported_incline", label: "Incline Chest Supported Row" },
  { key: "seal_row", label: "Seal Row" },
  { key: "ring_row", label: "Ring Row" },
  { key: "trx_row", label: "TRX Row" },
  { key: "bodyweight_row", label: "Bodyweight Row" },
  { key: "australian_pullup", label: "Australian Pull-Up" },
  { key: "archer_pullup", label: "Archer Pull-Up" },
  { key: "typewriter_pullup", label: "Typewriter Pull-Up" },
  { key: "weighted_chinup", label: "Weighted Chin-Up" },
  { key: "assisted_chinup", label: "Assisted Chin-Up" },
  { key: "neutral_dip", label: "Neutral Grip Dip" },
  { key: "ring_dip", label: "Ring Dip" },
  { key: "bench_press_single_arm", label: "Single Arm Bench Press" },
  { key: "db_floor_press", label: "Dumbbell Floor Press" },
  { key: "db_pullover_chest", label: "DB Pullover (chest)" },
  { key: "cable_crossover_high", label: "High Cable Crossover" },
  { key: "cable_crossover_low", label: "Low Cable Crossover" },
  { key: "pec_fly_machine", label: "Pec Fly Machine" },
  { key: "incline_db_fly", label: "Incline Dumbbell Fly" },
  { key: "decline_db_fly", label: "Decline Dumbbell Fly" },
  { key: "push_up_weighted", label: "Weighted Push-Up" },
  { key: "deficit_push_up", label: "Deficit Push-Up" },
  { key: "ring_push_up", label: "Ring Push-Up" },
  { key: "sphinx_push_up", label: "Sphinx Push-Up" },
  { key: "pike_push_up", label: "Pike Push-Up" },
  { key: "handstand_push_up", label: "Handstand Push-Up" },
  { key: "wall_walk", label: "Wall Walk" },
  { key: "db_z_press", label: "Dumbbell Z-Press" },
  { key: "kettlebell_press_seated", label: "Seated KB Press" },
  { key: "double_kb_press", label: "Double KB Press" },
  { key: "double_kb_front_squat", label: "Double KB Front Squat" },
  { key: "suitcase_deadlift", label: "Suitcase Deadlift" },
  { key: "sandbag_carry", label: "Sandbag Carry" },
  { key: "sandbag_shoulder", label: "Sandbag Shoulder" },
  { key: "yoke_walk", label: "Yoke Walk" },
  { key: "sled_push", label: "Sled Push" },
  { key: "sled_pull", label: "Sled Pull" },
  { key: "trap_bar_shrug", label: "Trap Bar Shrug" },
  { key: "rack_pull_high", label: "High Rack Pull" },
  { key: "block_pull_sumo", label: "Sumo Block Pull" },
  { key: "straddle_lift", label: "Straddle Lift" },
  { key: "suitcase_squat", label: "Suitcase Squat" },
  { key: "goblet_step_up", label: "Goblet Step-Up" },
  { key: "bulgarian_rdl", label: "Bulgarian RDL" },
  { key: "kb_sumo_deadlift", label: "KB Sumo Deadlift" },
  { key: "db_sumo_squat", label: "Dumbbell Sumo Squat" },
  { key: "ball_squat", label: "Ball Squat" },
  { key: "wall_sit", label: "Wall Sit" },
  { key: "thruster", label: "Thruster" },
  { key: "db_thruster", label: "Dumbbell Thruster" },
  { key: "kb_thruster", label: "Kettlebell Thruster" },
  { key: "man_maker", label: "Man Maker" },
  { key: "devil_press", label: "Devil Press" },
  { key: "clean_and_press", label: "Clean and Press" },
  { key: "db_clean", label: "Dumbbell Clean" },
  { key: "db_snatch", label: "Dumbbell Snatch" },
  { key: "single_arm_snatch", label: "Single Arm Snatch" },
  { key: "alternating_db_snatch", label: "Alternating DB Snatch" },
  { key: "windmill", label: "Windmill" },
  { key: "bent_press", label: "Bent Press" },
  { key: "side_press", label: "Side Press" },
  { key: "see_saw_press", label: "See Saw Press" },
  { key: "double_clean", label: "Double KB Clean" },
  { key: "double_snatch", label: "Double KB Snatch" },
  { key: "long_cycle", label: "Long Cycle" },
  { key: "jerk", label: "Jerk" },
  { key: "power_jerk", label: "Power Jerk" },
  { key: "squat_jerk", label: "Squat Jerk" },
  { key: "push_jerk_from_rack", label: "Push Jerk from Rack" },
  { key: "split_jerk_from_rack", label: "Split Jerk from Rack" },
  { key: "hang_power_clean", label: "Hang Power Clean" },
  { key: "hang_squat_clean", label: "Hang Squat Clean" },
  { key: "hang_power_snatch", label: "Hang Power Snatch" },
  { key: "hang_squat_snatch", label: "Hang Squat Snatch" },
  { key: "clean_from_blocks", label: "Clean from Blocks" },
  { key: "snatch_from_blocks", label: "Snatch from Blocks" },
  { key: "pull_from_blocks", label: "Pull from Blocks" },
  { key: "rdl_clean_pull", label: "RDL Clean Pull" },
  { key: "rdl_snatch_pull", label: "RDL Snatch Pull" },
  { key: "muscle_snatch", label: "Muscle Snatch" },
  { key: "power_clean_from_floor", label: "Power Clean (floor)" },
  { key: "squat_clean_from_floor", label: "Squat Clean (floor)" },
  { key: "snatch_pull_high", label: "High Snatch Pull" },
  { key: "clean_pull_high", label: "High Clean Pull" },
  { key: "pause_clean", label: "Pause Clean" },
  { key: "pause_snatch", label: "Pause Snatch" },
  { key: "tall_clean", label: "Tall Clean" },
  { key: "tall_snatch", label: "Tall Snatch" },
  { key: "drop_clean", label: "Drop Clean" },
  { key: "floating_clean", label: "Floating Clean" },
  { key: "segment_clean", label: "Segment Clean" },
  { key: "segment_snatch", label: "Segment Snatch" },
  { key: "pull_clean", label: "Pull + Clean" },
  { key: "pull_snatch", label: "Pull + Snatch" },
  { key: "jerk_dip", label: "Jerk Dip" },
  { key: "jerk_drive", label: "Jerk Drive" },
  { key: "push_press_from_rack", label: "Push Press from Rack" },
  { key: "strict_press_from_rack", label: "Strict Press from Rack" },
  { key: "bench_press_pause", label: "Pause Bench Press" },
  { key: "bench_press_2ct_pause", label: "2-Count Pause Bench" },
  { key: "spoto_bench", label: "Spoto Bench Press" },
  { key: "pin_bench", label: "Pin Bench Press" },
  { key: "floor_bench", label: "Floor Bench Press" },
  { key: "reverse_band_bench", label: "Reverse Band Bench" },
  { key: "slingshot_bench", label: "Slingshot Bench" },
  { key: "chain_bench", label: "Bench with Chains" },
  { key: "competition_bench", label: "Competition Bench" },
  { key: "wide_grip_bench", label: "Wide Grip Bench" },
  { key: "narrow_grip_bench", label: "Narrow Grip Bench" },
  { key: "cgb_bench", label: "Close Grip Bench" },
  { key: "incline_cgb", label: "Incline Close Grip Bench" },
  { key: "jm_bench", label: "JM Press (bench)" },
  { key: "skull_crusher_ez", label: "EZ Bar Skull Crusher" },
  { key: "skull_crusher_db", label: "Dumbbell Skull Crusher" },
  { key: "french_press", label: "French Press" },
  { key: "nosebreaker", label: "Nosebreaker" },
  { key: "tate_press", label: "Tate Press" },
  { key: "kickback", label: "Tricep Kickback" },
  { key: "overhead_cable_extension", label: "Overhead Cable Extension" },
  { key: "rope_pushdown", label: "Rope Pushdown" },
  { key: "v_bar_pushdown", label: "V-Bar Pushdown" },
  { key: "straight_bar_pushdown", label: "Straight Bar Pushdown" },
  { key: "single_arm_pushdown", label: "Single Arm Pushdown" },
  { key: "reverse_grip_pushdown", label: "Reverse Grip Pushdown" },
  { key: "dip_weighted", label: "Weighted Dip" },
  { key: "bench_dip_weighted", label: "Weighted Bench Dip" },
  { key: "diamond_dip", label: "Diamond Dip" },
  { key: "ring_dip_weighted", label: "Weighted Ring Dip" },
  { key: "curl_bar_ez", label: "EZ Bar Curl" },
  { key: "curl_bar_straight", label: "Straight Bar Curl" },
  { key: "curl_cable_straight", label: "Cable Straight Bar Curl" },
  { key: "curl_cable_rope", label: "Cable Rope Curl" },
  { key: "curl_incline_db", label: "Incline Dumbbell Curl" },
  { key: "curl_concentration", label: "Concentration Curl" },
  { key: "curl_spider", label: "Spider Curl" },
  { key: "curl_drag", label: "Drag Curl" },
  { key: "curl_reverse", label: "Reverse Curl" },
  { key: "curl_hammer", label: "Hammer Curl" },
  { key: "curl_cross_body", label: "Cross Body Hammer Curl" },
  { key: "curl_zottman", label: "Zottman Curl" },
  { key: "curl_21s", label: "21s Curl" },
  { key: "curl_preacher", label: "Preacher Curl" },
  { key: "curl_scott", label: "Scott Curl" },
  { key: "row_barbell_bent", label: "Bent Over Barbell Row" },
  { key: "row_barbell_yates", label: "Yates Row" },
  { key: "row_barbell_pendlay", label: "Pendlay Row" },
  { key: "row_tbar", label: "T-Bar Row" },
  { key: "row_tbar_close", label: "Close Grip T-Bar Row" },
  { key: "row_tbar_wide", label: "Wide Grip T-Bar Row" },
  { key: "row_chest_supported", label: "Chest Supported Row" },
  { key: "row_chest_supported_incline", label: "Incline Chest Supported Row" },
  { key: "row_dumbbell_one_arm", label: "One Arm Dumbbell Row" },
  { key: "row_dumbbell_bent", label: "Bent Over Two Arm Row" },
  { key: "row_cable_seated", label: "Seated Cable Row" },
  { key: "row_cable_straight_arm", label: "Straight Arm Cable Row" },
  { key: "row_landmine", label: "Landmine Row" },
  { key: "row_meadows", label: "Meadows Row" },
  { key: "row_machine", label: "Machine Row" },
  { key: "row_machine_chest_supported", label: "Chest Supported Machine Row" },
  { key: "row_inverted", label: "Inverted Row" },
  { key: "row_ring", label: "Ring Row" },
  { key: "row_trx", label: "TRX Row" },
  { key: "pull_up", label: "Pull-Up" },
  { key: "pull_up_weighted", label: "Weighted Pull-Up" },
  { key: "pull_up_wide_grip", label: "Wide Grip Pull-Up" },
  { key: "pull_up_close_grip", label: "Close Grip Pull-Up" },
  { key: "pull_up_neutral", label: "Neutral Grip Pull-Up" },
  { key: "pull_up_commando", label: "Commando Pull-Up" },
  { key: "pull_up_archer", label: "Archer Pull-Up" },
  { key: "pull_up_typewriter", label: "Typewriter Pull-Up" },
  { key: "chin_up_weighted", label: "Weighted Chin-Up" },
  { key: "chin_up_assisted", label: "Assisted Chin-Up" },
  { key: "lat_pulldown_wide", label: "Wide Grip Lat Pulldown" },
  { key: "lat_pulldown_close", label: "Close Grip Lat Pulldown" },
  { key: "lat_pulldown_reverse", label: "Reverse Grip Lat Pulldown" },
  { key: "lat_pulldown_neutral", label: "Neutral Lat Pulldown" },
  { key: "lat_pulldown_single_arm", label: "Single Arm Lat Pulldown" },
  { key: "lat_pulldown_straight_arm", label: "Straight Arm Pulldown" },
  { key: "pullover_cable", label: "Cable Pullover" },
  { key: "pullover_dumbbell", label: "Dumbbell Pullover" },
  { key: "pullover_machine", label: "Machine Pullover" },
  { key: "muscle_up_weighted", label: "Weighted Muscle-Up" },
  { key: "muscle_up_strict", label: "Strict Muscle-Up" },
  { key: "muscle_up_kipping", label: "Kipping Muscle-Up" },
  { key: "front_lever", label: "Front Lever" },
  { key: "back_lever", label: "Back Lever" },
  { key: "planche", label: "Planche" },
  { key: "l_sit", label: "L-Sit" },
  { key: "hollow_hold", label: "Hollow Hold" },
  { key: "arch_hold", label: "Arch Hold" },
  { key: "ab_crunch", label: "Ab Crunch" },
  { key: "cable_crunch", label: "Cable Crunch" },
  { key: "decline_crunch", label: "Decline Crunch" },
  { key: "bicycle_crunch", label: "Bicycle Crunch" },
  { key: "russian_twist", label: "Russian Twist" },
  { key: "wood_chop", label: "Wood Chop" },
  { key: "pallof_hold", label: "Pallof Hold" },
  { key: "side_plank", label: "Side Plank" },
  { key: "dead_bug_weighted", label: "Weighted Dead Bug" },
  { key: "v_up", label: "V-Up" },
  { key: "toe_touch", label: "Toe Touch" },
  { key: "leg_raise_hanging", label: "Hanging Leg Raise" },
  { key: "leg_raise_lying", label: "Lying Leg Raise" },
  { key: "leg_raise_captain", label: "Captain's Chair Leg Raise" },
  { key: "reverse_crunch", label: "Reverse Crunch" },
  { key: "flutter_kick", label: "Flutter Kick" },
  { key: "scissor_kick", label: "Scissor Kick" },
  { key: "mountain_climber", label: "Mountain Climber" },
  { key: "bear_crawl", label: "Bear Crawl" },
  { key: "bird_dog", label: "Bird Dog" },
  { key: "superman", label: "Superman" },
  { key: "reverse_hyperextension", label: "Reverse Hyperextension" },
  { key: "back_extension_weighted", label: "Weighted Back Extension" },
  { key: "ghr_sit_up", label: "GHR Sit-Up" },
  { key: "sit_up", label: "Sit-Up" },
  { key: "weighted_sit_up", label: "Weighted Sit-Up" },
  { key: "medicine_ball_slam", label: "Medicine Ball Slam" },
  { key: "medicine_ball_throw", label: "Medicine Ball Throw" },
  { key: "medicine_ball_chest_pass", label: "Medicine Ball Chest Pass" },
  { key: "medicine_ball_rotational_throw", label: "Med Ball Rotational Throw" },
  { key: "wall_ball", label: "Wall Ball" },
  { key: "thruster_barbell", label: "Barbell Thruster" },
  { key: "thruster_dumbbell", label: "Dumbbell Thruster" },
  { key: "thruster_kettlebell", label: "Kettlebell Thruster" },
  { key: "cluster", label: "Cluster" },
  { key: "power_clean_thruster", label: "Power Clean + Thruster" },
];

/** Cardiovascular — running, rowing, bike, swim, etc. */
export const CARDIO_OPTIONS: BenchmarkOption[] = [
  { key: "MAS", label: "MAS (m/s)", unit: "m/s" },
  { key: "vo2max", label: "VO₂ max (ml/kg/min)", unit: "ml/kg/min" },
  { key: "vt1", label: "VT1 (bpm or pace)", unit: "" },
  { key: "vt2", label: "VT2 (bpm or pace)", unit: "" },
  { key: "two_mile_time", label: "2 Mile Time (sec)", unit: "sec" },
  { key: "five_k_time", label: "5K Time (sec)", unit: "sec" },
  { key: "ten_k_time", label: "10K Time (sec)", unit: "sec" },
  { key: "half_marathon_time", label: "Half Marathon (sec)", unit: "sec" },
  { key: "marathon_time", label: "Marathon (sec)", unit: "sec" },
  { key: "row_2k", label: "2K Row (sec)", unit: "sec" },
  { key: "row_5k", label: "5K Row (sec)", unit: "sec" },
  { key: "bike_ftp", label: "FTP (watts)", unit: "W" },
  { key: "swim_400", label: "400 m Swim (sec)", unit: "sec" },
  { key: "one_mile_time", label: "1 Mile Time (sec)", unit: "sec" },
  { key: "three_k_time", label: "3K Time (sec)", unit: "sec" },
  { key: "fifteen_k_time", label: "15K Time (sec)", unit: "sec" },
  { key: "twenty_k_time", label: "20K Time (sec)", unit: "sec" },
  { key: "row_500", label: "500 m Row (sec)", unit: "sec" },
  { key: "row_1k", label: "1K Row (sec)", unit: "sec" },
  { key: "row_6k", label: "6K Row (sec)", unit: "sec" },
  { key: "row_10k", label: "10K Row (sec)", unit: "sec" },
  { key: "row_21k", label: "Half Marathon Row (sec)", unit: "sec" },
  { key: "row_42k", label: "Marathon Row (sec)", unit: "sec" },
  { key: "swim_50", label: "50 m Swim (sec)", unit: "sec" },
  { key: "swim_100", label: "100 m Swim (sec)", unit: "sec" },
  { key: "swim_200", label: "200 m Swim (sec)", unit: "sec" },
  { key: "swim_800", label: "800 m Swim (sec)", unit: "sec" },
  { key: "swim_1500", label: "1500 m Swim (sec)", unit: "sec" },
  { key: "bike_1min", label: "1 min Bike (kJ)", unit: "kJ" },
  { key: "bike_5min", label: "5 min Bike (kJ)", unit: "kJ" },
  { key: "bike_20min", label: "20 min Bike (watts)", unit: "W" },
  { key: "bike_60min", label: "60 min Bike (watts)", unit: "W" },
  { key: "run_100m", label: "100 m Run (sec)", unit: "sec" },
  { key: "run_200m", label: "200 m Run (sec)", unit: "sec" },
  { key: "run_400m", label: "400 m Run (sec)", unit: "sec" },
  { key: "run_800m", label: "800 m Run (sec)", unit: "sec" },
  { key: "run_1500m", label: "1500 m Run (sec)", unit: "sec" },
  { key: "run_3k", label: "3K Run (sec)", unit: "sec" },
  { key: "run_5k", label: "5K Run (sec)", unit: "sec" },
  { key: "run_10k", label: "10K Run (sec)", unit: "sec" },
  { key: "run_half", label: "Half Marathon (sec)", unit: "sec" },
  { key: "run_marathon", label: "Marathon (sec)", unit: "sec" },
  { key: "ski_500", label: "500 m Ski (sec)", unit: "sec" },
  { key: "ski_1k", label: "1K Ski (sec)", unit: "sec" },
  { key: "ski_2k", label: "2K Ski (sec)", unit: "sec" },
  { key: "ski_5k", label: "5K Ski (sec)", unit: "sec" },
  { key: "assault_bike_1min", label: "Assault Bike 1 min (cal)", unit: "cal" },
  { key: "assault_bike_4min", label: "Assault Bike 4 min (cal)", unit: "cal" },
  { key: "assault_bike_10min", label: "Assault Bike 10 min (cal)", unit: "cal" },
  { key: "echo_bike_1min", label: "Echo Bike 1 min (cal)", unit: "cal" },
  { key: "echo_bike_4min", label: "Echo Bike 4 min (cal)", unit: "cal" },
  { key: "concept2_bike_1min", label: "C2 Bike 1 min (kJ)", unit: "kJ" },
  { key: "concept2_bike_4min", label: "C2 Bike 4 min (kJ)", unit: "kJ" },
  { key: "rhr", label: "Resting Heart Rate (bpm)", unit: "bpm" },
  { key: "max_hr", label: "Max Heart Rate (bpm)", unit: "bpm" },
  { key: "lactate_threshold_hr", label: "Lactate Threshold HR (bpm)", unit: "bpm" },
  { key: "critical_power_run", label: "Critical Power Run (m/s)", unit: "m/s" },
  { key: "critical_power_bike", label: "Critical Power Bike (W)", unit: "W" },
  { key: "anaerobic_capacity_run", label: "Anaerobic Capacity Run (m/s)", unit: "m/s" },
  { key: "cooper_test", label: "Cooper Test (m in 12 min)", unit: "m" },
  { key: "one_five_test", label: "1.5 Mile Test (sec)", unit: "sec" },
  { key: "beep_test", label: "Beep Test (level)", unit: "" },
  { key: "yo_yo_ir1", label: "Yo-Yo IR1 (m)", unit: "m" },
  { key: "yo_yo_ir2", label: "Yo-Yo IR2 (m)", unit: "m" },
  { key: "step_test", label: "Step Test (recovery bpm)", unit: "bpm" },
  { key: "rockport_walk", label: "Rockport Walk Test (VO2 estimate)", unit: "" },
  { key: "treadmill_vo2", label: "Treadmill VO2 (ml/kg/min)", unit: "ml/kg/min" },
  { key: "bike_vo2", label: "Bike VO2 (ml/kg/min)", unit: "ml/kg/min" },
  { key: "swim_vo2", label: "Swim VO2 (ml/kg/min)", unit: "ml/kg/min" },
  { key: "pace_zone2", label: "Zone 2 Pace (min/km)", unit: "min/km" },
  { key: "pace_zone3", label: "Zone 3 Pace (min/km)", unit: "min/km" },
  { key: "pace_zone4", label: "Zone 4 Pace (min/km)", unit: "min/km" },
  { key: "pace_zone5", label: "Zone 5 Pace (min/km)", unit: "min/km" },
  { key: "cycling_zone2", label: "Zone 2 Power (W)", unit: "W" },
  { key: "cycling_zone3", label: "Zone 3 Power (W)", unit: "W" },
  { key: "cycling_zone4", label: "Zone 4 Power (W)", unit: "W" },
  { key: "cycling_zone5", label: "Zone 5 Power (W)", unit: "W" },
  { key: "rowing_split_2k", label: "2K Split (min/500m)", unit: "min/500m" },
  { key: "rowing_split_5k", label: "5K Split (min/500m)", unit: "min/500m" },
  { key: "swim_pace_100", label: "100 m Swim Pace (sec)", unit: "sec" },
  { key: "swim_pace_400", label: "400 m Swim Pace (sec)", unit: "sec" },
  { key: "elliptical_vo2", label: "Elliptical VO2 (ml/kg/min)", unit: "ml/kg/min" },
  { key: "stair_climb_1min", label: "1 min Stair Climb (floors)", unit: "" },
  { key: "stair_climb_4min", label: "4 min Stair Climb (floors)", unit: "" },
  { key: "hiking_vert", label: "Hiking Vertical (m)", unit: "m" },
  { key: "time_trial_20k_bike", label: "20K Bike TT (sec)", unit: "sec" },
  { key: "time_trial_40k_bike", label: "40K Bike TT (sec)", unit: "sec" },
  { key: "triathlon_sprint_swim", label: "Sprint Tri Swim (sec)", unit: "sec" },
  { key: "triathlon_sprint_bike", label: "Sprint Tri Bike (sec)", unit: "sec" },
  { key: "triathlon_sprint_run", label: "Sprint Tri Run (sec)", unit: "sec" },
  { key: "triathlon_olympic_swim", label: "Olympic Tri Swim (sec)", unit: "sec" },
  { key: "triathlon_olympic_bike", label: "Olympic Tri Bike (sec)", unit: "sec" },
  { key: "triathlon_olympic_run", label: "Olympic Tri Run (sec)", unit: "sec" },
  { key: "triathlon_half_swim", label: "Half Iron Swim (sec)", unit: "sec" },
  { key: "triathlon_half_bike", label: "Half Iron Bike (sec)", unit: "sec" },
  { key: "triathlon_half_run", label: "Half Iron Run (sec)", unit: "sec" },
  { key: "triathlon_iron_swim", label: "Ironman Swim (sec)", unit: "sec" },
  { key: "triathlon_iron_bike", label: "Ironman Bike (sec)", unit: "sec" },
  { key: "triathlon_iron_run", label: "Ironman Run (sec)", unit: "sec" },
  { key: "duathlon_run1", label: "Duathlon Run 1 (sec)", unit: "sec" },
  { key: "duathlon_bike", label: "Duathlon Bike (sec)", unit: "sec" },
  { key: "duathlon_run2", label: "Duathlon Run 2 (sec)", unit: "sec" },
  { key: "aquathon_swim", label: "Aquathon Swim (sec)", unit: "sec" },
  { key: "aquathon_run", label: "Aquathon Run (sec)", unit: "sec" },
  { key: "open_water_1k", label: "Open Water 1K (sec)", unit: "sec" },
  { key: "open_water_2k", label: "Open Water 2K (sec)", unit: "sec" },
  { key: "open_water_5k", label: "Open Water 5K (sec)", unit: "sec" },
  { key: "pool_100_back", label: "100 m Backstroke (sec)", unit: "sec" },
  { key: "pool_100_breast", label: "100 m Breaststroke (sec)", unit: "sec" },
  { key: "pool_100_fly", label: "100 m Butterfly (sec)", unit: "sec" },
  { key: "pool_200_im", label: "200 m IM (sec)", unit: "sec" },
  { key: "pool_400_im", label: "400 m IM (sec)", unit: "sec" },
  { key: "indoor_row_1min", label: "1 min Row (m)", unit: "m" },
  { key: "indoor_row_4min", label: "4 min Row (m)", unit: "m" },
  { key: "indoor_row_30min", label: "30 min Row (m)", unit: "m" },
  { key: "indoor_row_60min", label: "60 min Row (m)", unit: "m" },
  { key: "running_economy", label: "Running Economy (ml/kg/km)", unit: "" },
  { key: "cycling_efficiency", label: "Cycling Efficiency (%)", unit: "%" },
  { key: "swim_eff", label: "Swim Efficiency (SWOLF)", unit: "" },
  { key: "hr_z1_upper", label: "Z1 Upper (bpm)", unit: "bpm" },
  { key: "hr_z2_lower", label: "Z2 Lower (bpm)", unit: "bpm" },
  { key: "hr_z2_upper", label: "Z2 Upper (bpm)", unit: "bpm" },
  { key: "hr_z3_lower", label: "Z3 Lower (bpm)", unit: "bpm" },
  { key: "hr_z3_upper", label: "Z3 Upper (bpm)", unit: "bpm" },
  { key: "hr_z4_lower", label: "Z4 Lower (bpm)", unit: "bpm" },
  { key: "hr_z4_upper", label: "Z4 Upper (bpm)", unit: "bpm" },
  { key: "hr_z5_lower", label: "Z5 Lower (bpm)", unit: "bpm" },
  { key: "power_z2_lower", label: "Power Z2 Lower (W)", unit: "W" },
  { key: "power_z2_upper", label: "Power Z2 Upper (W)", unit: "W" },
  { key: "power_z3_lower", label: "Power Z3 Lower (W)", unit: "W" },
  { key: "power_z3_upper", label: "Power Z3 Upper (W)", unit: "W" },
  { key: "power_z4_lower", label: "Power Z4 Lower (W)", unit: "W" },
  { key: "power_z4_upper", label: "Power Z4 Upper (W)", unit: "W" },
  { key: "power_z5_lower", label: "Power Z5 Lower (W)", unit: "W" },
  { key: "power_z5_upper", label: "Power Z5 Upper (W)", unit: "W" },
];

/** Power & speed — jumps, sprints, throws */
export const POWER_OPTIONS: BenchmarkOption[] = [
  { key: "CMJ", label: "Countermovement Jump (cm)", unit: "cm" },
  { key: "SJ", label: "Squat Jump (cm)", unit: "cm" },
  { key: "RSI", label: "RSI (reactive strength)", unit: "" },
  { key: "sprint_10m", label: "10 m Sprint (sec)", unit: "sec" },
  { key: "sprint_20m", label: "20 m Sprint (sec)", unit: "sec" },
  { key: "sprint_30m", label: "30 m Sprint (sec)", unit: "sec" },
  { key: "broad_jump", label: "Broad Jump (cm)", unit: "cm" },
  { key: "med_ball_throw", label: "Med Ball Throw (m)", unit: "m" },
  { key: "sprint_40m", label: "40 m Sprint (sec)", unit: "sec" },
  { key: "sprint_60m", label: "60 m Sprint (sec)", unit: "sec" },
  { key: "sprint_100m", label: "100 m Sprint (sec)", unit: "sec" },
  { key: "sprint_200m", label: "200 m Sprint (sec)", unit: "sec" },
  { key: "flying_10m", label: "Flying 10 m (sec)", unit: "sec" },
  { key: "flying_20m", label: "Flying 20 m (sec)", unit: "sec" },
  { key: "flying_30m", label: "Flying 30 m (sec)", unit: "sec" },
  { key: "standing_long_jump", label: "Standing Long Jump (cm)", unit: "cm" },
  { key: "triple_jump", label: "Triple Jump (m)", unit: "m" },
  { key: "vertical_jump", label: "Vertical Jump (cm)", unit: "cm" },
  { key: "drop_jump", label: "Drop Jump (cm)", unit: "cm" },
  { key: "single_leg_cmj", label: "Single Leg CMJ (cm)", unit: "cm" },
  { key: "single_leg_sj", label: "Single Leg Squat Jump (cm)", unit: "cm" },
  { key: "alternate_leg_bound", label: "Alternate Leg Bound (m)", unit: "m" },
  { key: "single_leg_bound", label: "Single Leg Bound (m)", unit: "m" },
  { key: "triple_hop", label: "Triple Hop (m)", unit: "m" },
  { key: "cross_over_hop", label: "Crossover Hop (m)", unit: "m" },
  { key: "med_ball_chest_throw", label: "Med Ball Chest Pass (m)", unit: "m" },
  { key: "med_ball_overhead_throw", label: "Med Ball Overhead Throw (m)", unit: "m" },
  { key: "med_ball_rotational_throw", label: "Med Ball Rotational Throw (m)", unit: "m" },
  { key: "med_ball_slam", label: "Med Ball Slam (height/cm)", unit: "cm" },
  { key: "med_ball_2kg_throw", label: "2 kg Med Ball Throw (m)", unit: "m" },
  { key: "med_ball_3kg_throw", label: "3 kg Med Ball Throw (m)", unit: "m" },
  { key: "med_ball_4kg_throw", label: "4 kg Med Ball Throw (m)", unit: "m" },
  { key: "med_ball_5kg_throw", label: "5 kg Med Ball Throw (m)", unit: "m" },
  { key: "box_jump", label: "Box Jump (cm)", unit: "cm" },
  { key: "depth_jump", label: "Depth Jump (cm)", unit: "cm" },
  { key: "reactive_strength_index", label: "Reactive Strength Index", unit: "" },
  { key: "contact_time", label: "Contact Time (ms)", unit: "ms" },
  { key: "flight_time", label: "Flight Time (ms)", unit: "ms" },
  { key: "peak_force_cmj", label: "Peak Force CMJ (N)", unit: "N" },
  { key: "peak_power_cmj", label: "Peak Power CMJ (W)", unit: "W" },
  { key: "peak_velocity_cmj", label: "Peak Velocity CMJ (m/s)", unit: "m/s" },
  { key: "impulse", label: "Impulse (Ns)", unit: "Ns" },
  { key: "acceleration_0_10m", label: "Acceleration 0–10 m (sec)", unit: "sec" },
  { key: "acceleration_0_20m", label: "Acceleration 0–20 m (sec)", unit: "sec" },
  { key: "acceleration_0_30m", label: "Acceleration 0–30 m (sec)", unit: "sec" },
  { key: "max_velocity", label: "Max Velocity (m/s)", unit: "m/s" },
  { key: "agility_t_test", label: "T-Test (sec)", unit: "sec" },
  { key: "agility_505", label: "505 Agility (sec)", unit: "sec" },
  { key: "agility_pro", label: "Pro Agility (sec)", unit: "sec" },
  { key: "agility_3cone", label: "3-Cone Drill (sec)", unit: "sec" },
  { key: "agility_illinois", label: "Illinois Agility (sec)", unit: "sec" },
  { key: "agility_arrowhead", label: "Arrowhead Agility (sec)", unit: "sec" },
  { key: "change_of_direction", label: "Change of Direction (sec)", unit: "sec" },
  { key: "zigzag_run", label: "Zigzag Run (sec)", unit: "sec" },
  { key: "hexagon_test", label: "Hexagon Test (sec)", unit: "sec" },
  { key: "lateral_jump", label: "Lateral Jump (cm)", unit: "cm" },
  { key: "lateral_bound", label: "Lateral Bound (m)", unit: "m" },
  { key: "single_leg_hop", label: "Single Leg Hop (cm)", unit: "cm" },
  { key: "single_leg_triple_hop", label: "Single Leg Triple Hop (m)", unit: "m" },
  { key: "ankle_stiffness", label: "Ankle Stiffness (kN/m)", unit: "kN/m" },
  { key: "eccentric_utilization", label: "Eccentric Utilization Ratio", unit: "" },
  { key: "bounce_drop_jump", label: "Bounce Drop Jump (cm)", unit: "cm" },
  { key: "countermovement_rebound", label: "Countermovement Rebound (cm)", unit: "cm" },
  { key: "stiffness", label: "Leg Stiffness (kN/m)", unit: "kN/m" },
  { key: "power_clean_1rm", label: "Power Clean 1RM (kg)", unit: "kg" },
  { key: "hang_clean_1rm", label: "Hang Clean 1RM (kg)", unit: "kg" },
  { key: "push_jerk_1rm", label: "Push Jerk 1RM (kg)", unit: "kg" },
  { key: "jump_squat_30", label: "Jump Squat 30% (cm)", unit: "cm" },
  { key: "jump_squat_50", label: "Jump Squat 50% (cm)", unit: "cm" },
  { key: "jump_squat_0", label: "Jump Squat Unloaded (cm)", unit: "cm" },
  { key: "weighted_jump_squat", label: "Weighted Jump Squat (kg)", unit: "kg" },
  { key: "loaded_cmj", label: "Loaded CMJ (kg)", unit: "kg" },
  { key: "isometric_mid_thigh_pull", label: "Isometric Mid-Thigh Pull (N)", unit: "N" },
  { key: "isometric_leg_press", label: "Isometric Leg Press (N)", unit: "N" },
  { key: "rate_of_force_dev", label: "Rate of Force Development (N/s)", unit: "N/s" },
  { key: "time_to_peak_force", label: "Time to Peak Force (ms)", unit: "ms" },
  { key: "peak_force_isometric", label: "Peak Force Isometric (N)", unit: "N" },
  { key: "bench_throw", label: "Bench Throw (m)", unit: "m" },
  { key: "bench_throw_30", label: "Bench Throw 30% (m)", unit: "m" },
  { key: "bench_throw_50", label: "Bench Throw 50% (m)", unit: "m" },
  { key: "seated_shot_put", label: "Seated Shot Put (m)", unit: "m" },
  { key: "standing_shot_put", label: "Standing Shot Put (m)", unit: "m" },
  { key: "overhead_shot_put", label: "Overhead Shot Put (m)", unit: "m" },
  { key: "backward_throw", label: "Backward Overhead Throw (m)", unit: "m" },
  { key: "sprint_fatigue", label: "Sprint Fatigue Index (%)", unit: "%" },
  { key: "repeat_sprint_ability", label: "Repeat Sprint Ability (sec)", unit: "sec" },
  { key: "yo_yo_ie2", label: "Yo-Yo IE2 (m)", unit: "m" },
  { key: "running_anaerobic", label: "Running Anaerobic Test (m)", unit: "m" },
  { key: "wingate_5", label: "Wingate 5 s (W)", unit: "W" },
  { key: "wingate_30", label: "Wingate 30 s (W)", unit: "W" },
  { key: "wingate_peak", label: "Wingate Peak Power (W)", unit: "W" },
  { key: "wingate_mean", label: "Wingate Mean Power (W)", unit: "W" },
  { key: "cycling_sprint_5s", label: "5 s Cycling Sprint (W)", unit: "W" },
  { key: "cycling_sprint_10s", label: "10 s Cycling Sprint (W)", unit: "W" },
  { key: "rowing_sprint_1min", label: "1 min Rowing Sprint (m)", unit: "m" },
  { key: "rowing_sprint_500m", label: "500 m Row Sprint (sec)", unit: "sec" },
];

/** All options by section id for dropdowns */
export const OPTIONS_BY_SECTION: Record<string, BenchmarkOption[]> = {
  strength: STRENGTH_OPTIONS,
  cardiovascular: CARDIO_OPTIONS,
  power: POWER_OPTIONS,
};

/** Build display name map for all options (for dashboard etc.) */
export const ALL_OPTION_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  [...STRENGTH_OPTIONS, ...CARDIO_OPTIONS, ...POWER_OPTIONS].map((e) => [e.key, e.label])
);
```

## lib/profile/benchmarkSchema.ts

```ts
/**
 * Performance benchmarks schema for coaching-grade prescription.
 * Stored as profiles.performance_benchmarks (jsonb).
 */

export type ExerciseBenchmark = {
  oneRM: number | null;
  estimatedOneRM: number | null;
  lastUpdated: string | null; // ISO date
};

export type ExerciseBenchmarkKey =
  | "back_squat"
  | "bench_press"
  | "deadlift"
  | "overhead_press"
  | "weighted_pullup"
  | "trap_bar_deadlift"
  | "hip_thrust"
  | "split_squat";

export type AerobicBenchmarks = {
  vo2max: number | null;
  vt1: number | null;
  vt2: number | null;
  MAS: number | null; // m/s
  two_mile_time: number | null; // seconds
};

export type PowerBenchmarks = {
  CMJ: number | null; // cm
  RSI: number | null;
  sprint_10m: number | null;
  sprint_30m: number | null;
};

export type ExerciseBenchmarks = Partial<Record<ExerciseBenchmarkKey, ExerciseBenchmark>> & Record<string, ExerciseBenchmark | undefined>;

export type PerformanceBenchmarks = {
  exerciseBenchmarks?: Record<string, ExerciseBenchmark>;
  aerobicBenchmarks?: Partial<AerobicBenchmarks>;
  powerBenchmarks?: Partial<PowerBenchmarks>;
  /** Top-level timestamp for "last updated" (optional; exercises can have lastUpdated too). */
  last_updated?: string | null; // ISO date
};

export const EXERCISE_BENCHMARK_KEYS: ExerciseBenchmarkKey[] = [
  "back_squat",
  "bench_press",
  "deadlift",
  "overhead_press",
  "weighted_pullup",
  "trap_bar_deadlift",
  "hip_thrust",
  "split_squat",
];

/** Map programme exercise keys to benchmark keys where they differ */
export const EXERCISE_KEY_TO_BENCHMARK: Record<string, ExerciseBenchmarkKey> = {
  back_squat: "back_squat",
  weighted_pull_up: "weighted_pullup",
  rdl: "deadlift", // RDL often prescribed from deadlift 1RM or separate
  split_squat: "split_squat",
  bench_press: "bench_press",
  overhead_press: "overhead_press",
  deadlift: "deadlift",
  trap_bar_deadlift: "trap_bar_deadlift",
  hip_thrust: "hip_thrust",
};

export const EXERCISE_DISPLAY_NAMES: Record<string, string> = {
  back_squat: "Back Squat",
  bench_press: "Bench Press",
  deadlift: "Deadlift",
  overhead_press: "Overhead Press",
  weighted_pullup: "Weighted Pull-Up",
  weighted_pull_up: "Weighted Pull-Up",
  trap_bar_deadlift: "Trap Bar Deadlift",
  hip_thrust: "Hip Thrust",
  split_squat: "Rear-Foot Elevated Split Squat",
  rdl: "Romanian Deadlift",
  power_clean: "Power Clean",
  db_press: "Dumbbell Press",
};

/** Sections for benchmarks page: Strength, Cardiovascular, Power. Keys can be any string for storage. */
export const BENCHMARK_SECTIONS: { id: string; title: string; exercises: { key: string; label: string; unit?: string }[] }[] = [
  {
    id: "strength",
    title: "Strength (1RM kg)",
    exercises: [
      { key: "back_squat", label: "Back Squat" },
      { key: "front_squat", label: "Front Squat" },
      { key: "bench_press", label: "Bench Press" },
      { key: "incline_bench_press", label: "Incline Bench Press" },
      { key: "overhead_press", label: "Overhead Press" },
      { key: "push_press", label: "Push Press" },
      { key: "deadlift", label: "Deadlift" },
      { key: "trap_bar_deadlift", label: "Trap Bar Deadlift" },
      { key: "rdl", label: "Romanian Deadlift" },
      { key: "power_clean", label: "Power Clean" },
      { key: "clean_and_jerk", label: "Clean & Jerk" },
      { key: "snatch", label: "Snatch" },
      { key: "weighted_pullup", label: "Weighted Pull-Up" },
      { key: "barbell_row", label: "Barbell Row" },
      { key: "hip_thrust", label: "Hip Thrust" },
      { key: "split_squat", label: "Rear-Foot Elevated Split Squat" },
      { key: "lunge", label: "Walking Lunge" },
      { key: "leg_press", label: "Leg Press" },
      { key: "leg_curl", label: "Leg Curl" },
      { key: "lat_pulldown", label: "Lat Pulldown" },
      { key: "dip", label: "Weighted Dip" },
      { key: "goblet_squat", label: "Goblet Squat" },
      { key: "db_press", label: "Dumbbell Press" },
      { key: "db_row", label: "Dumbbell Row" },
      { key: "db_rdl", label: "Dumbbell RDL" },
      { key: "kettlebell_swing", label: "Kettlebell Swing" },
      { key: "strict_press", label: "Strict Press" },
    ],
  },
  {
    id: "cardiovascular",
    title: "Cardiovascular",
    exercises: [
      { key: "MAS", label: "MAS (m/s)", unit: "m/s" },
      { key: "vo2max", label: "VO₂ max (ml/kg/min)", unit: "ml/kg/min" },
      { key: "vt1", label: "VT1 (bpm or pace)", unit: "" },
      { key: "vt2", label: "VT2 (bpm or pace)", unit: "" },
      { key: "two_mile_time", label: "2 Mile Time (sec)", unit: "sec" },
      { key: "five_k_time", label: "5K Time (sec)", unit: "sec" },
      { key: "ten_k_time", label: "10K Time (sec)", unit: "sec" },
      { key: "half_marathon_time", label: "Half Marathon (sec)", unit: "sec" },
      { key: "marathon_time", label: "Marathon (sec)", unit: "sec" },
      { key: "row_2k", label: "2K Row (sec)", unit: "sec" },
      { key: "row_5k", label: "5K Row (sec)", unit: "sec" },
      { key: "bike_ftp", label: "FTP (watts)", unit: "W" },
      { key: "swim_400", label: "400 m Swim (sec)", unit: "sec" },
    ],
  },
  {
    id: "power",
    title: "Power & Speed",
    exercises: [
      { key: "CMJ", label: "Countermovement Jump (cm)", unit: "cm" },
      { key: "SJ", label: "Squat Jump (cm)", unit: "cm" },
      { key: "RSI", label: "RSI (reactive strength)", unit: "" },
      { key: "sprint_10m", label: "10 m Sprint (sec)", unit: "sec" },
      { key: "sprint_20m", label: "20 m Sprint (sec)", unit: "sec" },
      { key: "sprint_30m", label: "30 m Sprint (sec)", unit: "sec" },
      { key: "broad_jump", label: "Broad Jump (cm)", unit: "cm" },
      { key: "med_ball_throw", label: "Med Ball Throw (m)", unit: "m" },
    ],
  },
];

/** All benchmark keys to display name (for dashboard top 5 etc.) */
export const ALL_BENCHMARK_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  BENCHMARK_SECTIONS.flatMap((s) => s.exercises.map((e) => [e.key, e.label]))
);
```

## lib/profile/identityModel.ts

```ts
/**
 * Identity model — classify user into a performance identity type
 * for narrative (Weekly Brief) and programme bias.
 * Phase 2: wire to dashboard and programme builder.
 */

import type { SystemBiasLabel } from "@/engine/systemBias";
import { classifySystemBias } from "@/engine/systemBias";
import type { RecoveryBandwidth } from "@/engine/fatigueModel";
import { recoveryBandwidth } from "@/engine/fatigueModel";
import type { FatigueInputs } from "@/engine/fatigueModel";
import type { MomentumInputs } from "@/engine/momentumEngine";
import { frictionIndex } from "@/engine/momentumEngine";

export type IdentityType =
  | "Neural Dominant Responder"
  | "Aerobic Deficit Profile"
  | "Recovery-Limited Performer"
  | "Hybrid Balanced Responder"
  | "Load Carriage Focus";

export type IdentityInputs = FatigueInputs & MomentumInputs & {
  primary_limiter?: string | null;
  aerobic_score?: number | null;
  strength_upper?: number | null;
  strength_lower?: number | null;
  focus?: string | null;
  programme_type?: string | null;
};

/**
 * Classify identity from system bias, recovery bandwidth, primary limiter, friction.
 * Programming bias can then emphasise recovery, aerobic base, or neural work accordingly.
 */
export function classifyIdentity(profile: IdentityInputs): IdentityType {
  const bias: SystemBiasLabel = classifySystemBias(profile);
  const band: RecoveryBandwidth = recoveryBandwidth(profile);
  const friction = frictionIndex(profile);
  const limiter = (profile.primary_limiter ?? "").toLowerCase();

  if (band === "critical" || band === "compressed") return "Recovery-Limited Performer";
  if (friction > 0.4) return "Recovery-Limited Performer"; // Compliance drop-off

  if (bias === "Load carriage / endurance") return "Load Carriage Focus";
  if (bias === "Neural / power") return "Neural Dominant Responder";
  if (bias === "Aerobic-dominant") return "Hybrid Balanced Responder";

  const a = profile.aerobic_score ?? 60;
  if (bias === "Strength-dominant" && a < 55) return "Aerobic Deficit Profile";
  if (bias === "Strength-dominant") return "Neural Dominant Responder";

  return "Hybrid Balanced Responder";
}

/**
 * Short label for UI (e.g. Performance Identity card on dashboard).
 */
export function identityLabel(profile: IdentityInputs): string {
  return classifyIdentity(profile);
}
```

## lib/profile/identitySchema.ts

```ts
/**
 * Identity schema — types and labels for performance identity classification.
 * Used by engine/identityClassifier and dashboard identity row.
 */

export type IdentityLabel =
  | "Neural Dominant"
  | "Aerobic Deficit"
  | "Recovery Limited"
  | "Hybrid Balanced";

export type IdentityType =
  | "Neural Dominant Responder"
  | "Aerobic Deficit Profile"
  | "Recovery-Limited Performer"
  | "Hybrid Balanced Responder"
  | "Load Carriage Focus";

export const IDENTITY_LABELS: IdentityLabel[] = [
  "Neural Dominant",
  "Aerobic Deficit",
  "Recovery Limited",
  "Hybrid Balanced",
];
```

## lib/readinessAlgorithm.ts

```ts
/**
 * Tactical Human Performance — Readiness & Risk Algorithm
 *
 * Calculates readiness, risk, and capacity buffer per individual.
 * Powers: Readiness tiles, Exposure vs Capacity, Predictive risk, Performance risk group, Heatmap.
 */

const CLAMP = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

// ---------------------------------------------------------------------------
// DATA INPUT STRUCTURE
// ---------------------------------------------------------------------------

export type ReadinessInput = {
  id: number | string;
  sleep_hours: number;
  sleep_quality: number;
  fatigue_level: number;
  stress_level: number;
  knee_pain: number;
  back_pain: number;
  shin_pain: number;
  shoulder_pain: number;
  strength_index: number;
  endurance_index: number;
  durability_index: number;
  training_load: number;
  operational_hours: number;
  high_intensity_exposure: boolean;
  load_carriage_exposure: boolean;
  capacity_score: number;
};

// ---------------------------------------------------------------------------
// OUTPUT TYPES
// ---------------------------------------------------------------------------

export type ReadinessStatus = "READY" | "MANAGE" | "RISK";
export type ReadinessStatusColor = "green" | "amber" | "red";
export type BufferStatus = "SAFE" | "BALANCED" | "OVERLOAD RISK";
export type TrendIndicator = "IMPROVING" | "STABLE" | "DECLINING";
export type RiskLevel = "HIGH" | "MODERATE" | "LOW";

export type ReadinessResult = {
  id: number | string;
  recoveryScore: number;
  structuralScore: number;
  operationalScore: number;
  exposureScore: number;
  readinessScore: number;
  readinessStatus: ReadinessStatus;
  readinessStatusColor: ReadinessStatusColor;
  capacityBuffer: number;
  bufferStatus: BufferStatus;
  trend: TrendIndicator;
  riskLevel: RiskLevel;
};

export type CalculateReadinessOptions = {
  /** Last 7 readiness scores, most recent first (index 0 = today/latest). Used for trend. */
  recentReadinessScores?: number[];
};

// ---------------------------------------------------------------------------
// STEP 1 — RECOVERY SCORE
// ---------------------------------------------------------------------------

function calcRecoveryScore(r: ReadinessInput): number {
  const SleepScore = (r.sleep_hours / 8) * 100;
  const QualityScore = r.sleep_quality * 20;
  const FatiguePenalty = r.fatigue_level * 10;
  const StressPenalty = r.stress_level * 10;
  const raw =
    SleepScore * 0.4 +
    QualityScore * 0.3 -
    FatiguePenalty * 0.2 -
    StressPenalty * 0.1;
  return CLAMP(raw, 0, 100);
}

// ---------------------------------------------------------------------------
// STEP 2 — STRUCTURAL INTEGRITY SCORE
// ---------------------------------------------------------------------------

function calcStructuralScore(r: ReadinessInput): number {
  const PainTotal =
    r.knee_pain + r.back_pain + r.shin_pain + r.shoulder_pain;
  const raw = 100 - PainTotal * 15;
  return CLAMP(raw, 0, 100);
}

// ---------------------------------------------------------------------------
// STEP 3 — OPERATIONAL OUTPUT SCORE
// ---------------------------------------------------------------------------

function calcOperationalScore(r: ReadinessInput): number {
  const raw =
    r.strength_index * 0.35 +
    r.endurance_index * 0.35 +
    r.durability_index * 0.3;
  return CLAMP(raw, 0, 100);
}

// ---------------------------------------------------------------------------
// STEP 4 — EXPOSURE SCORE
// ---------------------------------------------------------------------------

function calcExposureScore(r: ReadinessInput): number {
  const raw =
    r.training_load * 8 +
    r.operational_hours * 4 +
    (r.high_intensity_exposure ? 10 : 0) +
    (r.load_carriage_exposure ? 8 : 0);
  return CLAMP(raw, 0, 100);
}

// ---------------------------------------------------------------------------
// STEP 5 — FINAL READINESS SCORE
// ---------------------------------------------------------------------------

function calcReadinessScore(
  recovery: number,
  structural: number,
  operational: number,
  exposure: number
): number {
  const raw =
    recovery * 0.3 +
    structural * 0.25 +
    operational * 0.25 -
    exposure * 0.2;
  return CLAMP(raw, 0, 100);
}

// ---------------------------------------------------------------------------
// STEP 6 — READINESS STATUS
// ---------------------------------------------------------------------------

function getReadinessStatus(readiness: number): {
  status: ReadinessStatus;
  color: ReadinessStatusColor;
} {
  if (readiness >= 75) return { status: "READY", color: "green" };
  if (readiness >= 60) return { status: "MANAGE", color: "amber" };
  return { status: "RISK", color: "red" };
}

// ---------------------------------------------------------------------------
// STEP 7 — CAPACITY BUFFER
// ---------------------------------------------------------------------------

function getCapacityBuffer(
  capacity_score: number,
  exposureScore: number
): { buffer: number; status: BufferStatus } {
  const buffer = capacity_score - exposureScore;
  if (buffer > 10) return { buffer, status: "SAFE" };
  if (buffer >= -10) return { buffer, status: "BALANCED" };
  return { buffer, status: "OVERLOAD RISK" };
}

// ---------------------------------------------------------------------------
// STEP 8 — TREND DETECTION
// ---------------------------------------------------------------------------

function getTrend(recentReadinessScores: number[]): TrendIndicator {
  // Need at least 3 scores (newest first: [today, yesterday, 2 days ago])
  if (recentReadinessScores.length < 3) return "STABLE";
  const [a, b, c] = recentReadinessScores;
  // Consecutive decrease: a < b < c (each day lower)
  if (a < b && b < c) return "DECLINING";
  // Consecutive increase: a > b > c
  if (a > b && b > c) return "IMPROVING";
  return "STABLE";
}

// ---------------------------------------------------------------------------
// STEP 9 — PREDICTIVE RISK DETECTION
// ---------------------------------------------------------------------------

function getRiskLevel(
  recoveryScore: number,
  structuralScore: number,
  exposureScore: number,
  trend: TrendIndicator,
  bufferStatus: BufferStatus
): RiskLevel {
  let signals = 0;
  if (recoveryScore < 50) signals++;
  if (structuralScore < 60) signals++;
  if (exposureScore > 70) signals++;
  if (trend === "DECLINING") signals++;
  if (bufferStatus === "OVERLOAD RISK") signals++;

  if (signals >= 3) return "HIGH";
  if (signals === 2) return "MODERATE";
  return "LOW";
}

// ---------------------------------------------------------------------------
// MAIN ENTRY — CALCULATE READINESS FOR ONE RECORD
// ---------------------------------------------------------------------------

/**
 * Calculate readiness, risk, and capacity buffer for one individual.
 *
 * @param record - Single individual record (raw inputs)
 * @param options - Optional: recentReadinessScores (most recent first) for trend
 * @returns Full result for dashboard consumption
 */
export function calculateReadiness(
  record: ReadinessInput,
  options?: CalculateReadinessOptions
): ReadinessResult {
  const recoveryScore = calcRecoveryScore(record);
  const structuralScore = calcStructuralScore(record);
  const operationalScore = calcOperationalScore(record);
  const exposureScore = calcExposureScore(record);
  const readinessScore = calcReadinessScore(
    recoveryScore,
    structuralScore,
    operationalScore,
    exposureScore
  );
  const { status: readinessStatus, color: readinessStatusColor } =
    getReadinessStatus(readinessScore);
  const { buffer: capacityBuffer, status: bufferStatus } = getCapacityBuffer(
    record.capacity_score,
    exposureScore
  );
  const recent = options?.recentReadinessScores ?? [];
  const trendScores = [readinessScore, ...recent].slice(0, 7);
  const trend = getTrend(trendScores);
  const riskLevel = getRiskLevel(
    recoveryScore,
    structuralScore,
    exposureScore,
    trend,
    bufferStatus
  );

  return {
    id: record.id,
    recoveryScore,
    structuralScore,
    operationalScore,
    exposureScore,
    readinessScore,
    readinessStatus,
    readinessStatusColor,
    capacityBuffer,
    bufferStatus,
    trend,
    riskLevel,
  };
}

// ---------------------------------------------------------------------------
// BATCH — CALCULATE FOR MULTIPLE RECORDS WITH HISTORY
// ---------------------------------------------------------------------------

export type ReadinessHistoryMap = Record<string | number, number[]>;

/**
 * Calculate readiness for multiple records. Use when you have a list of
 * current records and optional per-ID history of past readiness scores.
 *
 * @param records - Array of individual records
 * @param historyById - Optional map: id -> recentReadinessScores (most recent first)
 */
export function calculateReadinessBatch(
  records: ReadinessInput[],
  historyById?: ReadinessHistoryMap
): ReadinessResult[] {
  return records.map((r) =>
    calculateReadiness(r, {
      recentReadinessScores: historyById?.[String(r.id)] ?? historyById?.[Number(r.id)],
    })
  );
}
```

## lib/requireAuth.tsx

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export type AuthState = {
  user: User | null;
  loading: boolean;
};

/**
 * Check Supabase session. Returns loading state and user.
 * Redirects to /login if no session once loading is false.
 */
export function useRequireAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  return { user, loading };
}

const spinnerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  width: "100%",
  background: "linear-gradient(180deg, #0a0a0f 0%, #0f1117 100%)",
  color: "rgba(255,255,255,0.6)",
  fontSize: 14,
};

/**
 * Wrapper: shows loading spinner while checking session,
 * redirects to /login if unauthenticated, otherwise renders children.
 * No protected content is shown before redirect.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <div style={spinnerStyle} aria-live="polite">
        <span>Loading…</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

## lib/session.ts

```ts
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = localStorage.getItem("pathfinder_session");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("pathfinder_session", sessionId);
  }

  return sessionId;
}
```

## lib/strategyAdjustmentsEngine.ts

```ts
/**
 * Strategic adjustments engine: derives high-signal recommendations
 * from injury data, constraint notes, milestone deviation, and risk drivers.
 */

import type { StrategyGoal } from "@/lib/strategyStore";
import type { ExecutionProbabilityResult } from "@/lib/goalEngine";

export type AdjustmentSource = "injury" | "notes" | "deviation" | "risk" | "load" | "category";

export type StrategicAdjustment = {
  id: string;
  title: string;
  recommendation: string;
  rationale: string;
  priority: 1 | 2 | 3;
  source: AdjustmentSource;
};

const LOWER_BODY_KEYWORDS = /\b(lower back|back|spine|lumbar|hip|knee|knees|quad|hamstring|calf|ankle|foot|it band|glute|squat|deadlift|lunges?|running|impact|jumping)\b/i;
const UPPER_BODY_KEYWORDS = /\b(shoulder|elbow|wrist|neck|cervical|bench|press|overhead|row|pull)\b/i;
const LOAD_KEYWORDS = /\b(heavy|load|max|1rm|intensity|weighted|compression)\b/i;
const CARDIO_KEYWORDS = /\b(run|running|volume|mile|km|distance|aerobic|endurance)\b/i;
const SCHEDULE_KEYWORDS = /\b(schedule|busy|work|travel|limited|days? per week|hours?|time)\b/i;
const RECOVERY_KEYWORDS = /\b(recovery|sleep|stress|fatigue|overtraining|rest)\b/i;
const IMPACT_KEYWORDS = /\b(impact|pounding|plyometric|jump|landing)\b/i;

function inferFromInjury(
  type?: string,
  severity?: "low" | "moderate" | "high",
  notes?: string
): StrategicAdjustment[] {
  const out: StrategicAdjustment[] = [];
  const t = (type ?? "").toLowerCase();
  const n = (notes ?? "").toLowerCase();
  const combined = `${t} ${n}`;
  const sev = severity ?? "moderate";

  if (sev === "high") {
    out.push({
      id: "inj-sev-high",
      title: "Extend foundation phase",
      recommendation: "Add 2–3 weeks to your foundation phase and keep intensity in the 60–70% range until you have a clear rehab sign-off.",
      rationale: "High-severity injury needs more time to settle before progressive load.",
      priority: 1,
      source: "injury",
    });
    out.push({
      id: "inj-sev-cap",
      title: "Cap weekly progression",
      recommendation: "Limit weekly volume or load increases to 3–5% until you have 2 consecutive weeks pain-free at current load.",
      rationale: "Slower progression reduces re-injury risk and lets you monitor response.",
      priority: 1,
      source: "injury",
    });
  } else if (sev === "moderate") {
    out.push({
      id: "inj-sev-mod",
      title: "Extend foundation by 1–2 weeks",
      recommendation: "Shift 1–2 weeks from Build into Foundation so you can introduce load more gradually.",
      rationale: "Moderate severity benefits from a longer ramp before higher intensity.",
      priority: 1,
      source: "injury",
    });
    out.push({
      id: "inj-mod-rate",
      title: "Reduce weekly volume step-ups",
      recommendation: "Use 5–6% weekly volume increases instead of 8–10% while the injury is active.",
      rationale: "Slightly flatter progression is easier to tolerate and adjust if symptoms flare.",
      priority: 2,
      source: "injury",
    });
  }

  if (LOWER_BODY_KEYWORDS.test(combined)) {
    out.push({
      id: "inj-lower",
      title: "Adjust lower-body loading",
      recommendation: "Prioritise bilateral, controlled movements; reduce or substitute high-impact and heavy axial load (e.g. running, heavy squats/deadlifts) until symptoms allow.",
      rationale: "Your notes mention lower-body or spinal load—programme should respect that until you’re ready to progress.",
      priority: 1,
      source: "injury",
    });
  }
  if (UPPER_BODY_KEYWORDS.test(combined)) {
    out.push({
      id: "inj-upper",
      title: "Modify upper-body intensity",
      recommendation: "Cap pressing and pulling intensity in the Build phase; use tempo and range-of-motion progressions before adding load.",
      rationale: "Upper-body or shoulder/elbow issues respond better to graded exposure than big jumps in load.",
      priority: 1,
      source: "injury",
    });
  }
  if (CARDIO_KEYWORDS.test(combined) && (type ?? notes)) {
    out.push({
      id: "inj-cardio",
      title: "Soft-surface and volume control",
      recommendation: "If running is in the plan, prefer soft surfaces and cap weekly distance increases at 5–8%; consider cross-training to maintain fitness without aggravating the issue.",
      rationale: "Running and distance load are sensitive—your notes suggest tailoring volume and surface to your current capacity.",
      priority: 2,
      source: "injury",
    });
  }
  if (IMPACT_KEYWORDS.test(combined)) {
    out.push({
      id: "inj-impact",
      title: "Defer high-impact work",
      recommendation: "Delay plyometrics and high-impact drills until Foundation is pain-free; substitute with low-impact options in the meantime.",
      rationale: "Impact and landing stress can flare the area you’ve noted—ease back in only when ready.",
      priority: 2,
      source: "injury",
    });
  }
  if (LOAD_KEYWORDS.test(combined)) {
    out.push({
      id: "inj-load",
      title: "Ramp max-effort work slowly",
      recommendation: "Keep top sets at 80–85% for 1–2 weeks longer than planned before introducing 90%+ efforts.",
      rationale: "Heavy and max loads need a conservative build when you’re managing an injury.",
      priority: 2,
      source: "injury",
    });
  }

  if (notes && notes.trim().length > 20 && out.length === 0) {
    out.push({
      id: "inj-notes",
      title: "Use your notes to shape the plan",
      recommendation: "Your limitation notes should drive exercise selection and load: avoid or regress anything that touches on the areas you described until you’re confident they’re ready.",
      rationale: "We’ve used your injury notes to flag this—apply them when choosing exercises and intensity each week.",
      priority: 2,
      source: "injury",
    });
  }

  return out;
}

function inferFromConstraints(constraints?: string, category?: string): StrategicAdjustment[] {
  const out: StrategicAdjustment[] = [];
  const c = (constraints ?? "").toLowerCase();
  if (!c.trim()) return out;

  if (SCHEDULE_KEYWORDS.test(c)) {
    out.push({
      id: "con-schedule",
      title: "Match volume to available time",
      recommendation: "Reduce planned sessions or session length so your weekly plan fits your real schedule; protect 1–2 key sessions and treat the rest as optional.",
      rationale: "Your constraints mention schedule or time—programme should be feasible within the hours you have.",
      priority: 1,
      source: "notes",
    });
  }
  if (RECOVERY_KEYWORDS.test(c)) {
    out.push({
      id: "con-recovery",
      title: "Add a recovery buffer",
      recommendation: "Insert a deload or light week every 3–4 weeks, and cap the number of high-intensity sessions per week to 2 until recovery improves.",
      rationale: "You’ve noted recovery, sleep, or stress—building in more recovery helps sustainability.",
      priority: 1,
      source: "notes",
    });
  }
  if (c.length > 80) {
    out.push({
      id: "con-complex",
      title: "Simplify the first block",
      recommendation: "Focus the first 2–3 weeks on a small set of priorities (e.g. one main lift and one conditioning metric) so you can adapt to your constraints without overload.",
      rationale: "Several constraints are in play—starting simple makes it easier to adjust as you go.",
      priority: 2,
      source: "notes",
    });
  }

  return out;
}

function inferFromDeviation(
  milestoneProgress: StrategyGoal["milestoneProgress"],
  milestones: { id: string; label: string; week: number }[]
): StrategicAdjustment[] {
  const out: StrategicAdjustment[] = [];
  if (!milestoneProgress?.length) return out;

  const withDev = milestoneProgress.filter((m) => m.deviation != null) as { milestoneId: string; deviation: number }[];
  if (withDev.length === 0) return out;

  const avgDev = withDev.reduce((a, m) => a + m.deviation!, 0) / withDev.length;
  const maxDev = Math.max(...withDev.map((m) => m.deviation!));
  const behindCount = withDev.filter((m) => m.deviation! > 5).length;

  if (avgDev > 15 || maxDev > 20) {
    out.push({
      id: "dev-major",
      title: "Delay peak and add catch-up",
      recommendation: "Shift the start of your peak phase back by 1–2 weeks and add a single recovery microcycle (e.g. one week at ~70% volume) before the next build block.",
      rationale: "Milestone results are meaningfully behind target—a short delay and a recovery week improve the chance of hitting the next checkpoint.",
      priority: 1,
      source: "deviation",
    });
  } else if (avgDev > 10 || behindCount >= 2) {
    out.push({
      id: "dev-moderate",
      title: "Light week before next push",
      recommendation: "Insert one reduced-volume week (about 20% less than planned) before your next intensity block so you can consolidate and then push again.",
      rationale: "A couple of milestones are behind—a brief pullback helps you get back on track without forcing the timeline.",
      priority: 2,
      source: "deviation",
    });
  }

  if (behindCount >= 1 && withDev.length >= 2) {
    out.push({
      id: "dev-review",
      title: "Recheck targets and pacing",
      recommendation: "Review whether your target and weekly progression are still realistic; if you’re consistently behind, consider a small target adjustment or a short deadline extension.",
      rationale: "Repeated deviation suggests the plan may be too aggressive—a small tweak can improve execution.",
      priority: 2,
      source: "deviation",
    });
  }

  return out;
}

function inferFromRisk(execution: ExecutionProbabilityResult | null, totalWeeks: number): StrategicAdjustment[] {
  const out: StrategicAdjustment[] = [];
  if (!execution?.riskDrivers?.length) return out;

  if (execution.riskDrivers.some((r) => r.includes("Unrealistic") || r.includes("Aggressive"))) {
    out.push({
      id: "risk-kpi",
      title: "Soften targets or extend deadline",
      recommendation: "Either reduce one or two KPI targets by 5–10%, or extend the goal deadline by 2–4 weeks so weekly required improvement is more achievable.",
      rationale: "Current targets and timeline are flagged as aggressive—a small adjustment improves execution probability.",
      priority: 1,
      source: "risk",
    });
  }
  if (execution.riskDrivers.some((r) => r.includes("Short timeline"))) {
    out.push({
      id: "risk-timeline",
      title: "Prioritise and extend if possible",
      recommendation: totalWeeks < 6
        ? "With very few weeks left, focus on 1–2 non-negotiable outcomes and treat the rest as secondary; if the deadline is flexible, adding 2–4 weeks will help."
        : "Concentrate on the next 1–2 milestones; if you can extend the deadline slightly, do it to reduce time pressure.",
      rationale: "Short timeline is a key risk—narrowing focus or extending the date reduces that pressure.",
      priority: 1,
      source: "risk",
    });
  }
  if (execution.riskDrivers.some((r) => r.includes("Heavy constraints"))) {
    out.push({
      id: "risk-constraints",
      title: "Simplify the plan",
      recommendation: "Strip the programme down to the minimum effective dose: one main focus per phase and fewer optional sessions so constraints don’t derail you.",
      rationale: "Heavy constraints make a complex plan hard to execute—simplifying increases the chance of consistency.",
      priority: 2,
      source: "risk",
    });
  }
  if (execution.riskDrivers.some((r) => r.includes("injury"))) {
    out.push({
      id: "risk-injury",
      title: "Keep injury as the main governor",
      recommendation: "Let pain and tolerance drive progression: only add load or volume when the injury is stable, and pull back as soon as symptoms increase.",
      rationale: "Execution probability is reduced by active injury—prioritising injury response keeps the plan sustainable.",
      priority: 2,
      source: "risk",
    });
  }

  return out;
}

function inferFromLoad(goal: StrategyGoal): StrategicAdjustment[] {
  const out: StrategicAdjustment[] = [];
  const dist = goal.eventDistance;
  const totalWeeks = goal.roadmap?.totalWeeks ?? 0;
  const category = goal.category;

  if (dist != null && dist >= 42 && totalWeeks > 0 && totalWeeks < 18) {
    out.push({
      id: "load-marathon",
      title: "Marathon on a short timeline",
      recommendation: "Use a longer foundation (4–5 weeks) and keep weekly distance increases to 8–10% max; plan a 2–3 week taper and avoid back-to-back long runs.",
      rationale: "Marathon distance with limited weeks needs a conservative build and a clear taper.",
      priority: 1,
      source: "load",
    });
  }
  if ((category === "Endurance" || category === "Marathon") && dist != null && dist > 21 && totalWeeks > 0 && totalWeeks < 14) {
    out.push({
      id: "load-half-plus",
      title: "Half-marathon+ with limited time",
      recommendation: "Extend foundation by 1–2 weeks and cap peak weekly volume at 1.2× race distance to reduce injury risk.",
      rationale: "Longer distance with fewer weeks benefits from a steadier build and a volume cap.",
      priority: 2,
      source: "load",
    });
  }
  if (category === "Tactical" && (goal.goalDetails as { loadWeight?: number; loadCarriageDistance?: number } | undefined)?.loadWeight) {
    out.push({
      id: "load-tactical",
      title: "Load carriage progression",
      recommendation: "Progress load and distance separately: fix one variable (e.g. distance) while increasing the other (load), then switch. Avoid increasing both in the same week.",
      rationale: "Staggering load and distance progressions reduces injury risk and improves adaptation.",
      priority: 2,
      source: "load",
    });
  }

  return out;
}

export function getStrategicAdjustments(
  goal: StrategyGoal | null,
  execution: ExecutionProbabilityResult | null
): StrategicAdjustment[] {
  if (!goal) return [];

  const injury = goal.injuryStatus?.active
    ? inferFromInjury(goal.injuryStatus.type, goal.injuryStatus.severity, goal.injuryStatus.limitationNotes)
    : [];
  const notes = inferFromConstraints(goal.roadmap?.constraints, goal.category);
  const deviation = inferFromDeviation(goal.milestoneProgress, goal.roadmap?.milestones ?? []);
  const risk = inferFromRisk(execution, goal.roadmap?.totalWeeks ?? 0);
  const load = inferFromLoad(goal);

  const all = [...injury, ...notes, ...deviation, ...risk, ...load];
  const seen = new Set<string>();
  const deduped = all.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  return deduped.sort((a, b) => a.priority - b.priority);
}
```

## lib/strategyStore.ts

```ts
import type { GoalRoadmapResult } from "@/lib/goalEngine";

export type RoadmapData = GoalRoadmapResult;

export type MilestoneProgressEntry = {
  milestoneId: string;
  completed: boolean;
  actualValue?: number;
  deviation?: number;
};

export type InjuryStatus = {
  active: boolean;
  type?: string;
  severity?: "low" | "moderate" | "high";
  limitationNotes?: string;
};

export interface StrategyGoal {
  id: string;
  title: string;
  category: string;
  deadline: string;
  eventDistance?: number;
  injuryStatus?: InjuryStatus;
  milestoneProgress?: MilestoneProgressEntry[];
  goalDetails?: unknown;
  roadmap: RoadmapData;
  createdAt: string;
}

const STORAGE_KEY = "upde_strategy_goals";

export function loadStrategyGoals(): StrategyGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((g) => migrateGoal(g as Record<string, unknown>)).filter((g): g is StrategyGoal => g != null);
  } catch {
    return [];
  }
}

function migrateGoal(g: Record<string, unknown>): StrategyGoal | null {
  const roadmap = g.roadmap && typeof g.roadmap === "object" && Array.isArray((g.roadmap as RoadmapData).phases)
    ? (g.roadmap as RoadmapData)
    : null;
  if (!roadmap) return null;
  return {
    id: typeof g.id === "string" ? g.id : crypto.randomUUID(),
    title: typeof g.title === "string" ? g.title : "Goal",
    category: typeof g.category === "string" ? g.category : "Custom",
    deadline: typeof g.deadline === "string" ? g.deadline : new Date().toISOString().slice(0, 10),
    eventDistance: typeof g.eventDistance === "number" ? g.eventDistance : undefined,
    injuryStatus: g.injuryStatus && typeof g.injuryStatus === "object" ? (g.injuryStatus as InjuryStatus) : undefined,
    milestoneProgress: Array.isArray(g.milestoneProgress) ? (g.milestoneProgress as MilestoneProgressEntry[]) : undefined,
    goalDetails: g.goalDetails,
    roadmap,
    createdAt: typeof g.createdAt === "string" ? g.createdAt : new Date().toISOString(),
  };
}

export function saveStrategyGoals(goals: StrategyGoal[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  } catch {
    // ignore
  }
}

export function addStrategyGoal(goal: Omit<StrategyGoal, "id" | "createdAt">): StrategyGoal {
  const full: StrategyGoal = {
    ...goal,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const goals = loadStrategyGoals();
  goals.push(full);
  saveStrategyGoals(goals);
  return full;
}

export function removeStrategyGoal(id: string): StrategyGoal[] {
  const goals = loadStrategyGoals().filter((g) => g.id !== id);
  saveStrategyGoals(goals);
  return goals;
}

export function getStrategyGoals(): StrategyGoal[] {
  return loadStrategyGoals();
}

export function setStrategyGoals(goals: StrategyGoal[]): void {
  saveStrategyGoals(goals);
}

export function updateStrategyGoal(id: string, updates: Partial<Omit<StrategyGoal, "id" | "createdAt">>): StrategyGoal | null {
  const goals = loadStrategyGoals();
  const idx = goals.findIndex((g) => g.id === id);
  if (idx < 0) return null;
  goals[idx] = { ...goals[idx], ...updates };
  saveStrategyGoals(goals);
  return goals[idx];
}
```

## lib/supabaseClient.ts

```ts
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

## lib/supabaseServer.ts

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}
```

## lib/tacticalMapData.ts

```ts
/**
 * Unit Readiness Map — data for 2D readiness grid.
 * Maps stored ReadinessEntry to algorithm output and fatigue score.
 */

import { calculateReadiness, type ReadinessInput, type ReadinessResult } from "@/lib/readinessAlgorithm";
import type { ReadinessEntry } from "@/lib/tacticalReadinessStorage";

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

/** Convert stored entry to algorithm input (uses latest 4 pain sites + derived capacity). */
function entryToReadinessInput(entry: ReadinessEntry): ReadinessInput {
  const capacity_score =
    (entry.strength_index + entry.aerobic_capacity + entry.movement_durability) / 3;
  return {
    id: entry.id,
    sleep_hours: entry.sleep_hours,
    sleep_quality: entry.sleep_quality,
    fatigue_level: entry.fatigue_level,
    stress_level: entry.stress_level,
    knee_pain: entry.knee_pain,
    back_pain: entry.back_pain,
    shin_pain: entry.shin_pain,
    shoulder_pain: entry.shoulder_pain,
    strength_index: entry.strength_index,
    endurance_index: entry.aerobic_capacity,
    durability_index: entry.movement_durability,
    training_load: entry.training_load,
    operational_hours: entry.operational_hours,
    high_intensity_exposure: entry.high_intensity_exposure,
    load_carriage_exposure: false,
    capacity_score,
  };
}

/**
 * Fatigue score 0–100 from exposure and fatigue indicators.
 * Formula: (exposureScore * 0.6) + (neuromuscular_fatigue * 20) + (central_fatigue * 20), clamped.
 * Entry fatigue values are 0–10 scale → scale to 0–20 contribution each.
 */
function computeFatigueScore(
  exposureScore: number,
  neuromuscular_fatigue: number,
  central_fatigue: number
): number {
  const raw =
    exposureScore * 0.6 +
    (neuromuscular_fatigue / 10) * 20 +
    (central_fatigue / 10) * 20;
  return clamp(raw, 0, 100);
}

export type MapPoint = {
  id: string;
  readinessScore: number;
  fatigueScore: number;
  exposureScore: number;
  riskLevel: ReadinessResult["riskLevel"];
  capacityBuffer: number;
  readinessStatusColor: ReadinessResult["readinessStatusColor"];
};

/** Get latest entry per ID from entries (by date). */
function getLatestById(entries: ReadinessEntry[]): Map<string, ReadinessEntry> {
  const byId = new Map<string, ReadinessEntry>();
  entries.forEach((e) => {
    const existing = byId.get(e.id);
    if (!existing || e.date > existing.date) byId.set(e.id, e);
  });
  return byId;
}

/**
 * Build map plot data from stored readiness entries.
 * One point per ID (latest entry); includes readiness, fatigue, risk, buffer.
 */
export function getMapDataFromEntries(entries: ReadinessEntry[]): MapPoint[] {
  const latestById = getLatestById(entries);
  const points: MapPoint[] = [];
  latestById.forEach((entry, id) => {
    const input = entryToReadinessInput(entry);
    const result = calculateReadiness(input);
    const fatigueScore = computeFatigueScore(
      result.exposureScore,
      entry.neuromuscular_fatigue,
      entry.central_fatigue
    );
    points.push({
      id,
      readinessScore: Math.round(result.readinessScore * 10) / 10,
      fatigueScore: Math.round(fatigueScore * 10) / 10,
      exposureScore: result.exposureScore,
      riskLevel: result.riskLevel,
      capacityBuffer: result.capacityBuffer,
      readinessStatusColor: result.readinessStatusColor,
    });
  });
  return points.sort((a, b) => {
    const na = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
}

// ---------------------------------------------------------------------------
// Command Readiness — full algorithm output per ID and trend data
// ---------------------------------------------------------------------------

export type FullReadinessRow = { id: string } & ReadinessResult;

/**
 * Full readiness result per ID (latest entry per ID).
 * Used by Command Readiness page for dial, secondary metrics, risk summary.
 */
export function getFullReadinessFromEntries(entries: ReadinessEntry[]): FullReadinessRow[] {
  const latestById = getLatestById(entries);
  const rows: FullReadinessRow[] = [];
  latestById.forEach((entry, id) => {
    const input = entryToReadinessInput(entry);
    const result = calculateReadiness(input);
    rows.push({ id, ...result });
  });
  return rows.sort((a, b) => {
    const na = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
}

export type TrendDataPoint = { date: string; avgReadiness: number };

/**
 * Average readiness by date for the last N days (from entries).
 * Each date: average of readiness scores from all entries on that date.
 */
export function getReadinessTrendData(
  entries: ReadinessEntry[],
  lastNDays: number
): TrendDataPoint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lastNDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const byDate = new Map<string, number[]>();
  entries.forEach((entry) => {
    if (entry.date >= cutoffStr) {
      const input = entryToReadinessInput(entry);
      const result = calculateReadiness(input);
      const list = byDate.get(entry.date) ?? [];
      list.push(result.readinessScore);
      byDate.set(entry.date, list);
    }
  });
  const points: TrendDataPoint[] = [];
  byDate.forEach((scores, date) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    points.push({ date, avgReadiness: Math.round(avg * 10) / 10 });
  });
  return points.sort((a, b) => a.date.localeCompare(b.date));
}
```

## lib/tacticalReadinessStorage.ts

```ts
/**
 * Tactical Readiness Entry — flat structure for input form and radar.
 * Used by /app/tactical/input and /app/tactical/radar.
 */

export const TACTICAL_READINESS_STORAGE_KEY = "tactical-readiness-entries";

export type ReadinessEntry = {
  id: string;
  date: string;
  sleep_hours: number;
  sleep_quality: number;
  fatigue_level: number;
  stress_level: number;
  knee_pain: number;
  back_pain: number;
  shin_pain: number;
  shoulder_pain: number;
  hip_pain: number;
  ankle_pain: number;
  elbow_pain: number;
  neck_pain: number;
  muscle_tightness: number;
  joint_stiffness: number;
  tendon_irritation: number;
  movement_restriction: number;
  strength_index: number;
  explosive_power: number;
  neuromuscular_readiness: number;
  aerobic_capacity: number;
  movement_durability: number;
  coordination_quality: number;
  neuromuscular_fatigue: number;
  central_fatigue: number;
  training_load: number;
  operational_hours: number;
  high_intensity_exposure: boolean;
  external_workload: "light" | "moderate" | "heavy";
};

export function loadReadinessEntries(): ReadinessEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TACTICAL_READINESS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveReadinessEntries(entries: ReadinessEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TACTICAL_READINESS_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

/** Get unique ID labels from stored entries (e.g. ["ID 1", "ID 2"]). */
export function getStoredIdList(entries: ReadinessEntry[]): string[] {
  const set = new Set<string>();
  entries.forEach((e) => set.add(e.id));
  return Array.from(set).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
}

export type PillarScores = {
  recovery: number;
  structuralIntegrity: number;
  strengthCapacity: number;
  aerobicCapacity: number;
  movementDurability: number;
};

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

/** Compute the five radar pillars (0–100) from a single readiness entry. */
export function getPillarScoresFromEntry(entry: ReadinessEntry): PillarScores {
  const sleepContrib = (entry.sleep_hours / 8) * 40;
  const qualityContrib = (entry.sleep_quality / 5) * 30;
  const fatiguePenalty = (entry.fatigue_level / 5) * 15;
  const stressPenalty = (entry.stress_level / 5) * 15;
  const recovery = clamp(sleepContrib + qualityContrib - fatiguePenalty - stressPenalty, 0, 100);

  const painTotal =
    entry.knee_pain +
    entry.back_pain +
    entry.shin_pain +
    entry.shoulder_pain +
    entry.hip_pain +
    entry.ankle_pain +
    entry.elbow_pain +
    entry.neck_pain;
  const tissueTotal =
    entry.muscle_tightness +
    entry.joint_stiffness +
    entry.tendon_irritation +
    entry.movement_restriction;
  const structuralIntegrity = clamp(100 - (painTotal / 8) * 12 - (tissueTotal / 4) * 10, 0, 100);

  const strengthCapacity =
    (entry.strength_index + entry.explosive_power + entry.neuromuscular_readiness) / 3;
  const aerobicCapacity = entry.aerobic_capacity;
  const movementDurability = (entry.movement_durability + entry.coordination_quality) / 2;

  return {
    recovery,
    structuralIntegrity,
    strengthCapacity,
    aerobicCapacity,
    movementDurability,
  };
}
```

## lib/timeFormatter.ts

```ts
/**
 * Format seconds as HH:MM:SS with leading zeros.
 * 9000 → "02:30:00"
 * 5421 → "01:30:21"
 */
export function formatToHHMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
```

## lib/timeInputParser.ts

```ts
/**
 * Parse "HH:MM:SS" or "MM:SS" or plain seconds string to seconds.
 * Returns 0 for invalid input.
 */
export function parseHHMMSS(input: string): number {
  const s = String(input).trim();
  if (!s) return 0;
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  if (parts.length === 3) {
    const [h, m, sec] = parts;
    return h * 3600 + m * 60 + sec;
  }
  if (parts.length === 2) {
    const [m, sec] = parts;
    return m * 60 + sec;
  }
  if (parts.length === 1) return Math.floor(parts[0]);
  return 0;
}

/**
 * Format seconds as HH:MM:SS with leading zeros.
 */
export function formatHHMMSS(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
```

## lib/todaySessionSummary.ts

```ts
/**
 * Minimal "today's session" summary for the dashboard.
 * Derives phase, adaptation, and a single session card line without duplicating full buildSession.
 */

const PHASES = [
  "Accumulation",
  "Accumulation",
  "Intensification",
  "Intensification",
  "Overreach",
  "Deload",
];

export type TodaySessionSummary = {
  sessionTitle: string;
  duration: string;
  intensity: string;
  exercisesCount: number;
  detail: string;
};

type ProfileInput = {
  current_week?: number | null;
  days_per_week?: number | null;
  minutes_per_session?: number | null;
  checkin_date?: string | null;
  checkin_readiness?: number | null;
  checkin_feel?: string | null;
  checkin_pain?: string | null;
  checkin_energy?: string | null;
  checkin_sleep?: string | null;
  focus?: string | null;
  goal?: string | null;
};

function getAdaptation(p: ProfileInput): "reduce" | "normal" | "increase" {
  const today = new Date().toISOString().slice(0, 10);
  if (p.checkin_date !== today) return "normal";
  const readiness = p.checkin_readiness ?? 7;
  const feel = p.checkin_feel ?? "okay";
  const pain = p.checkin_pain ?? "none";
  const energy = p.checkin_energy ?? "medium";
  const sleep = p.checkin_sleep ?? "okay";
  if (pain === "yes" || feel === "poor" || energy === "low" || sleep === "poor" || readiness < 5)
    return "reduce";
  if (feel === "good" && (energy === "high" || sleep === "good") && readiness >= 7 && pain === "none")
    return "increase";
  return "normal";
}

/**
 * Returns a single-session summary for "today" based on day of week and profile.
 * Uses simple rules: middle day = Regeneration, else Lower Body / Upper Body style.
 */
export function getTodaySessionSummary(profile: ProfileInput): TodaySessionSummary {
  const week = profile.current_week ?? 1;
  const phase = PHASES[(week - 1) % PHASES.length] ?? "Accumulation";
  const daysPerWeek = Math.min(5, Math.max(2, profile.days_per_week ?? 3));
  const sessionMins = Math.min(90, Math.max(30, profile.minutes_per_session ?? 60));
  const adaptation = getAdaptation(profile);

  const dayOfWeek = new Date().getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const sessionIndex = Math.min(todayIndex, daysPerWeek - 1);
  const isRecoveryDay = sessionIndex === Math.floor(daysPerWeek / 2);

  if (isRecoveryDay) {
    return {
      sessionTitle: "Regeneration",
      duration: "20–30 min",
      intensity: "Low",
      exercisesCount: 1,
      detail: "Zone 1 · Mobility · Parasympathetic breathing",
    };
  }

  const focus = (profile.focus ?? profile.goal ?? "").toLowerCase();
  const isPower = focus.includes("power") || focus.includes("neural");
  const title = isPower ? "Lower Body · RFD / Power" : "Lower Body Strength · Neural Bias";
  const intensity = adaptation === "reduce" ? "Moderate" : "Moderate–High";
  const mins = adaptation === "reduce" ? `${sessionMins - 20}–${sessionMins - 10}` : `${sessionMins - 10}–${sessionMins}`;

  return {
    sessionTitle: title,
    duration: `${mins} min`,
    intensity,
    exercisesCount: 4,
    detail: `${mins} min · 4 exercises · ${intensity} intensity`,
  };
}
```

## lib/trainingTargets.ts

```ts
/**
 * Training targets: goal/sport/course options for intake.
 * programmeType drives the programme builder (load, conditioning, exercise choice).
 */

export type ProgrammeType =
  | "load_carriage_endurance"  // P Company, All Arms, load-heavy selection
  | "pure_endurance"           // marathon, ultra, long-distance
  | "strength"                 // powerlifting, strongman, max strength
  | "hybrid"                    // general fitness, tactical, cross-training
  | "power_speed"              // sprinting, jumping, RFD
  | "team_sport"               // rugby, football, field sports
  | "combat"                   // boxing, BJJ, MMA
  | "aerobic_first";           // triathlon, cycling, swimming focus

export type TrainingOption = {
  label: string;
  programmeType: ProgrammeType;
  /** Optional short tag for display in programme header */
  tag?: string;
};

/** Grouped training targets for intake. Order and programmeType shape the programme. */
export const TRAINING_TARGET_GROUPS: { group: string; options: TrainingOption[] }[] = [
  {
    group: "Military & Selection",
    options: [
      { label: "P Company (Paras)", programmeType: "load_carriage_endurance", tag: "Load carriage · Endurance" },
      { label: "All Arms Commando Course", programmeType: "load_carriage_endurance", tag: "Load carriage · Endurance" },
      { label: "Royal Marines Commando", programmeType: "load_carriage_endurance", tag: "Load carriage · Endurance" },
      { label: "UKSF Selection", programmeType: "load_carriage_endurance", tag: "Load carriage · Endurance" },
      { label: "Infantry Phase 1/2", programmeType: "load_carriage_endurance", tag: "Load carriage · Hybrid" },
      { label: "Officer Selection (e.g. AOSB)", programmeType: "hybrid", tag: "Hybrid · Fitness standards" },
      { label: "Other military / tactical course", programmeType: "load_carriage_endurance", tag: "Tactical" },
    ],
  },
  {
    group: "Endurance & Running",
    options: [
      { label: "Marathon", programmeType: "pure_endurance", tag: "Aerobic · Threshold" },
      { label: "Half marathon", programmeType: "pure_endurance", tag: "Aerobic · Threshold" },
      { label: "10K / 5K", programmeType: "pure_endurance", tag: "Aerobic · Speed" },
      { label: "Ultra / trail", programmeType: "pure_endurance", tag: "Aerobic · Durability" },
      { label: "Triathlon (sprint / standard)", programmeType: "aerobic_first", tag: "Multi-discipline" },
      { label: "Ironman / long-course tri", programmeType: "aerobic_first", tag: "Aerobic first" },
      { label: "Cycling (road / sportive)", programmeType: "aerobic_first", tag: "Aerobic" },
      { label: "Swimming (distance / open water)", programmeType: "aerobic_first", tag: "Aerobic" },
      { label: "Rowing (2K / 5K)", programmeType: "hybrid", tag: "Hybrid · Power-endurance" },
    ],
  },
  {
    group: "Strength & Power",
    options: [
      { label: "Powerlifting", programmeType: "strength", tag: "Max strength" },
      { label: "Strongman", programmeType: "strength", tag: "Strength · Conditioning" },
      { label: "Weightlifting (Olympic)", programmeType: "power_speed", tag: "Power · RFD" },
      { label: "CrossFit / functional fitness", programmeType: "hybrid", tag: "Hybrid" },
      { label: "Bodybuilding / hypertrophy", programmeType: "strength", tag: "Hypertrophy" },
      { label: "Sprinting (track / field)", programmeType: "power_speed", tag: "Power · Speed" },
      { label: "Jumping / plyometrics", programmeType: "power_speed", tag: "RFD · Power" },
    ],
  },
  {
    group: "Team & Field Sports",
    options: [
      { label: "Rugby (union / league)", programmeType: "team_sport", tag: "Power · Endurance" },
      { label: "Football / soccer", programmeType: "team_sport", tag: "Repeat sprint · Aerobic" },
      { label: "Hockey (field)", programmeType: "team_sport", tag: "Hybrid" },
      { label: "Basketball", programmeType: "team_sport", tag: "Power · Agility" },
      { label: "American football", programmeType: "team_sport", tag: "Power · Speed" },
      { label: "Netball", programmeType: "team_sport", tag: "Agility · Endurance" },
      { label: "Lacrosse", programmeType: "team_sport", tag: "Hybrid" },
    ],
  },
  {
    group: "Combat & Martial Arts",
    options: [
      { label: "Boxing", programmeType: "combat", tag: "Power · Conditioning" },
      { label: "BJJ / grappling", programmeType: "combat", tag: "Strength-endurance" },
      { label: "MMA", programmeType: "combat", tag: "Hybrid · Conditioning" },
      { label: "Judo", programmeType: "combat", tag: "Power · Grips" },
      { label: "Muay Thai / kickboxing", programmeType: "combat", tag: "Power · Conditioning" },
      { label: "Wrestling", programmeType: "combat", tag: "Strength · Power" },
    ],
  },
  {
    group: "General & Lifestyle",
    options: [
      { label: "General fitness", programmeType: "hybrid", tag: "Hybrid" },
      { label: "Fat loss", programmeType: "hybrid", tag: "Hybrid · Conditioning" },
      { label: "Hybrid performance (strength + cardio)", programmeType: "hybrid", tag: "Hybrid" },
      { label: "Long-term health & resilience", programmeType: "hybrid", tag: "Human-first" },
      { label: "Return from injury / rebuild", programmeType: "hybrid", tag: "Durability first" },
      { label: "Other (describe in next steps)", programmeType: "hybrid", tag: "Custom" },
    ],
  },
];

/** Flat list of all options for a single select if needed */
export const ALL_TRAINING_OPTIONS: TrainingOption[] = TRAINING_TARGET_GROUPS.flatMap(
  (g) => g.options
);

export function getProgrammeTypeForGoal(goalLabel: string | null | undefined): ProgrammeType {
  if (!goalLabel) return "hybrid";
  const found = ALL_TRAINING_OPTIONS.find(
    (o) => o.label.toLowerCase() === goalLabel.toLowerCase()
  );
  return found?.programmeType ?? "hybrid";
}
```

## lib/trajectoryEngine.ts

```ts
/**
 * Tactical Human Performance — Short-term readiness trajectory prediction.
 * Predicts who is declining, improving, or approaching readiness failure.
 */

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

export type TrajectoryInput = {
  id: string;
  readinessHistory: number[];
  exposureScore: number;
  recoveryScore: number;
  structuralScore: number;
  capacityBuffer: number;
};

export type TrajectoryTrend = "declining" | "improving" | "stable";
export type ForecastStatus = "READY" | "MANAGE" | "HIGH RISK";

export type TrajectoryResult = {
  id: string;
  trend: TrajectoryTrend;
  projectedReadiness: number;
  forecastStatus: ForecastStatus;
};

/**
 * STEP 1 — Compute trend from last 3 entries (newest last in array).
 * Declining = each of last 3 lower than previous; improving = each higher; else stable.
 */
function getTrend(readinessHistory: number[]): TrajectoryTrend {
  if (readinessHistory.length < 3) return "stable";
  const last3 = readinessHistory.slice(-3);
  const [a, b, c] = last3;
  if (a > b && b > c) return "declining";
  if (a < b && b < c) return "improving";
  return "stable";
}

/**
 * STEP 2 — Projected readiness: average(history) + modifiers, clamped 0–100.
 */
function getProjectedReadiness(input: TrajectoryInput): number {
  const history = input.readinessHistory;
  const base = history.length ? history.reduce((s, v) => s + v, 0) / history.length : input.exposureScore ? 50 : 50;
  let projected = base;
  if (input.exposureScore > 70) projected -= 5;
  if (input.recoveryScore < 50) projected -= 5;
  if (input.structuralScore < 60) projected -= 3;
  if (input.capacityBuffer < -10) projected -= 7;
  return clamp(Math.round(projected * 10) / 10, 0, 100);
}

/**
 * STEP 3 — Forecast risk from projected readiness.
 */
function getForecastStatus(projectedReadiness: number): ForecastStatus {
  if (projectedReadiness >= 75) return "READY";
  if (projectedReadiness >= 60) return "MANAGE";
  return "HIGH RISK";
}

/**
 * Compute short-term trajectory for one ID.
 */
export function computeTrajectory(input: TrajectoryInput): TrajectoryResult {
  const trend = getTrend(input.readinessHistory);
  const projectedReadiness = getProjectedReadiness(input);
  const forecastStatus = getForecastStatus(projectedReadiness);
  return {
    id: input.id,
    trend,
    projectedReadiness,
    forecastStatus,
  };
}
```

## supabase/migrations/20250225000000_add_daily_checkin_columns.sql

```sql
-- Daily check-in columns for programme adaptation.
-- Run this in Supabase SQL editor if your profiles table doesn't have these yet.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS checkin_date text,
  ADD COLUMN IF NOT EXISTS checkin_readiness smallint,
  ADD COLUMN IF NOT EXISTS checkin_feel text,
  ADD COLUMN IF NOT EXISTS checkin_pain text,
  ADD COLUMN IF NOT EXISTS checkin_pain_areas text,
  ADD COLUMN IF NOT EXISTS checkin_energy text,
  ADD COLUMN IF NOT EXISTS checkin_sleep text;
```

## supabase/migrations/20250225100000_add_performance_benchmarks.sql

```sql
-- Performance benchmarks for 1RM and percentage prescription.
-- Stored as JSONB; structure see lib/profile/benchmarkSchema.ts

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS performance_benchmarks jsonb DEFAULT '{}';

COMMENT ON COLUMN profiles.performance_benchmarks IS 'exerciseBenchmarks, aerobicBenchmarks, powerBenchmarks per benchmarkSchema';
```

## supabase/migrations/20250226000000_decision_logs.sql

```sql
-- Decision transparency log: why programme changed.
-- Used by engine to log trigger, threshold, adjustment for "Why this changed" UI.

CREATE TABLE IF NOT EXISTS decision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  decision_type text NOT NULL,
  trigger_variables jsonb DEFAULT '{}',
  threshold_breached text,
  adjustment_made text NOT NULL,
  explanation text
);

CREATE INDEX IF NOT EXISTS idx_decision_logs_profile_created
  ON decision_logs(profile_id, created_at DESC);

COMMENT ON TABLE decision_logs IS 'Transparency log for programme adjustments: trigger, threshold, adjustment';
COMMENT ON COLUMN decision_logs.trigger_variables IS 'e.g. { "sleep_trend_pct": -18, "rpe_density": "high" }';
COMMENT ON COLUMN decision_logs.threshold_breached IS 'e.g. sleep_trend_below_0.85';
COMMENT ON COLUMN decision_logs.adjustment_made IS 'e.g. Lower-body volume reduced';
COMMENT ON COLUMN decision_logs.explanation IS 'Coach-voice sentence for UI';

-- RLS: users can only read/insert their own rows
ALTER TABLE decision_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own decision_logs"
  ON decision_logs FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own decision_logs"
  ON decision_logs FOR INSERT
  WITH CHECK (auth.uid() = profile_id);
```

## supabase/migrations/20250226100000_session_debriefs.sql

```sql
-- Post-session debrief: 2–3 reflective inputs after "Mark complete".
-- Used to detect friction and recalibrate next session.

CREATE TABLE IF NOT EXISTS session_debriefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name text NOT NULL,
  week integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  how_felt integer CHECK (how_felt >= 1 AND how_felt <= 5),
  niggles text,
  ready_next integer CHECK (ready_next >= 1 AND ready_next <= 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_debriefs_profile_created
  ON session_debriefs(profile_id, created_at DESC);

COMMENT ON TABLE session_debriefs IS 'Post-session reflective inputs; friction signals for recalibration';
COMMENT ON COLUMN session_debriefs.how_felt IS '1–5 how did that feel';
COMMENT ON COLUMN session_debriefs.niggles IS 'Any niggles or pain noted';
COMMENT ON COLUMN session_debriefs.ready_next IS '1–5 ready for next session';

ALTER TABLE session_debriefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own session_debriefs"
  ON session_debriefs FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own session_debriefs"
  ON session_debriefs FOR INSERT
  WITH CHECK (auth.uid() = profile_id);
```

## supabase/migrations/20250226200000_last_session_focus.sql

```sql
-- Store last completed session focus for body report (e.g. "Lower body", "Upper body").
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_session_focus text;

COMMENT ON COLUMN profiles.last_session_focus IS 'Focus of most recently completed session for body report stress map';
```

## supabase/migrations/20250227000000_add_user_preferences.sql

```sql
-- User preferences, marketing, and integration flags (settings page).
-- Structure: see app/api/settings/route.ts and SettingsView defaults.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_preferences jsonb DEFAULT '{}';

COMMENT ON COLUMN profiles.user_preferences IS 'weight_unit, session_reminders, weekly_summary_email, marketing_emails, product_updates, sms_notifications, garmin_connected, stripe_customer_id, etc.';
```

## supabase/migrations/20250227100000_user_injury_log.sql

```sql
-- Persistent injury memory for coaching-grade guardrails and follow-up.
-- Engine: injuryMemoryEngine.ts

CREATE TABLE IF NOT EXISTS user_injury_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body_part text NOT NULL,
  severity smallint NOT NULL CHECK (severity >= 1 AND severity <= 10),
  context text,
  first_reported timestamptz NOT NULL DEFAULT now(),
  last_reported timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  classification text,
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'moderate', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_injury_log_profile_resolved
  ON user_injury_log(profile_id, resolved) WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_user_injury_log_profile_last_reported
  ON user_injury_log(profile_id, last_reported DESC);

COMMENT ON TABLE user_injury_log IS 'Persistent injury memory: body_part, severity, context, risk_level; updates last_reported on re-report, resolved_at when resolved';
COMMENT ON COLUMN user_injury_log.classification IS 'e.g. tendon irritation, instability, overload';
COMMENT ON COLUMN user_injury_log.risk_level IS 'Derived from severity and frequency (engine: calculateInjuryRisk)';

ALTER TABLE user_injury_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own injury log"
  ON user_injury_log FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own injury log"
  ON user_injury_log FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own injury log"
  ON user_injury_log FOR UPDATE
  USING (auth.uid() = profile_id);
```

## types/forecast.ts

```ts
export interface ForecastResult {
  historical: number[];
  projected: number[];
  slope: number;
  confidence: number;
}
```

