"use client";

import { useRequireAuth } from "@/lib/auth";
import PosTestView from "@/components/views/PosTestView";

export default function PosTestPage() {
  const { ready, user } = useRequireAuth({ adminOnly: true });
  if (!ready || !user) return null;
  return <PosTestView />;
}
