"use client";

import { useRequireAuth } from "@/lib/auth";
import ScansView from "@/components/views/ScansView";

export default function ScansPage() {
  const { ready, user } = useRequireAuth({ adminOnly: true });
  if (!ready || !user) return null;
  return <ScansView />;
}
