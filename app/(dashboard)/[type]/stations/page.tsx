"use client";

import { useRequireAuth } from "@/lib/auth";
import StationsView from "@/components/views/StationsView";

export default function StationsPage() {
  const { ready, user } = useRequireAuth({ adminOnly: true });
  if (!ready || !user) return null;
  return <StationsView />;
}
