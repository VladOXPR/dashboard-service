"use client";

import { useAuth } from "@/lib/auth";

export default function HostHeader() {
  const { user, signOut } = useAuth();
  return (
    <header className="host-header" aria-label="Host navigation">
      <div className="host-header-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/CUUB_Logo.png" alt="CUUB" className="host-header-logo" />
        <span className="host-header-username" aria-label="Logged in as">
          {user?.username ?? ""}
        </span>
      </div>
      <a
        href="/login"
        className="logout"
        onClick={(e) => {
          e.preventDefault();
          signOut();
        }}
      >
        Log out
      </a>
    </header>
  );
}
