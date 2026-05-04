"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAdmin, useAuth } from "@/lib/auth";
import SidePanel from "@/components/sidebar/SidePanel";
import HostHeader from "@/components/header/HostHeader";

const VALID_TYPES = ["host", "admin", "distributer", "distributor"];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ type: string }>();
  const type = (params?.type ?? "host").toLowerCase();

  useEffect(() => {
    if (!ready) return;
    if (!user || !user.id) {
      router.replace("/login");
      return;
    }
    if (!VALID_TYPES.includes(type)) {
      const userType = (user.type ?? "host").toString().toLowerCase();
      router.replace(`/${userType}/performance`);
    }
  }, [ready, user, type, router]);

  useEffect(() => {
    if (!ready || !user) return;
    if (isAdmin(user)) {
      document.body.classList.remove("host-layout");
    } else {
      document.body.classList.add("host-layout");
    }
    return () => document.body.classList.remove("host-layout");
  }, [ready, user]);

  if (!ready || !user) {
    return null;
  }

  return (
    <div className="app-layout">
      <SidePanel type={type} />
      <div className="main-content">
        <HostHeader />
        <div className="main-scroll">{children}</div>
      </div>
      <div className="hamburger-overlay" aria-hidden="true" />
    </div>
  );
}
