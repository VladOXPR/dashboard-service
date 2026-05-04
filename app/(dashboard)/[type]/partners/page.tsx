"use client";

import { useRequireAuth } from "@/lib/auth";
import PartnersView from "@/components/views/PartnersView";

export default function PartnersPage() {
  const { ready, user } = useRequireAuth({ adminOnly: true });
  if (!ready || !user) return null;
  return <PartnersView />;
}
