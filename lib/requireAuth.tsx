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
