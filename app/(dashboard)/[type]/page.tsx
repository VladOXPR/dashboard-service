"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DashboardIndex() {
  const router = useRouter();
  const params = useParams<{ type: string }>();
  useEffect(() => {
    router.replace(`/${(params?.type ?? "host").toLowerCase()}/performance`);
  }, [router, params]);
  return null;
}
