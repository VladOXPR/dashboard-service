"use client";

import { useRequireAuth } from "@/lib/auth";
import MaintenanceView from "@/components/views/MaintenanceView";

export default function MaintenancePage() {
  const { ready, user } = useRequireAuth({ adminOnly: true });
  if (!ready || !user) return null;
  return <MaintenanceView />;
}
