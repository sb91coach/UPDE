"use client";

import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import UPDEDashboard from "@/app/components/UPDEDashboard";

/**
 * Coach Dashboard: full analytics (capacity radar, readiness trends, fatigue indicators,
 * performance changes, training compliance, programme diagnostics).
 * Athlete-facing analytics live here; athlete home is simplified.
 */
export default function CoachDashboardPage() {
  return (
    <RequireAuth>
      <OSLayer>
        <div className="min-h-screen bg-[#0a0a0a]">
          <div className="text-xs tracking-widest opacity-70 pt-4 px-6 md:px-8">Coach Dashboard</div>
          <p className="text-sm opacity-80 py-1 px-6 md:px-8 mb-0">Capacity radar, readiness trends, fatigue indicators, compliance, programme diagnostics.</p>
          <UPDEDashboard />
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
