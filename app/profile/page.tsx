"use client";

import AthleteHomeDashboard from "@/app/components/AthleteHomeDashboard";
import OSLayer from "@/app/components/OSLayer";
import { RequireAuth } from "@/lib/requireAuth";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <OSLayer>
        <AthleteHomeDashboard />
      </OSLayer>
    </RequireAuth>
  );
}