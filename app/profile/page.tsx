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