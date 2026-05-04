"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type CuubUser } from "@/lib/auth";
import { fetchAllUsers } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (user && user.id) {
      const type = ((user.type as string) || "host").toLowerCase();
      router.replace(`/${type}/performance`);
    }
  }, [ready, user, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter a username.");
      return;
    }
    setSubmitting(true);
    try {
      const json = await fetchAllUsers();
      const dataAny = json as unknown as { success?: boolean; data?: unknown };
      if (dataAny.success === false) {
        setError("Could not load users. Please try again.");
        return;
      }
      const list: CuubUser[] = Array.isArray(dataAny.data)
        ? (dataAny.data as CuubUser[])
        : Array.isArray((dataAny.data as { users?: CuubUser[] } | undefined)?.users)
        ? ((dataAny.data as { users?: CuubUser[] }).users as CuubUser[])
        : [];
      const matched = list.find(
        (u) => (u.username ?? "").toLowerCase() === trimmed.toLowerCase(),
      );
      if (!matched) {
        setError("No user found with that username.");
        return;
      }
      setUser(matched);
      const type = ((matched.type ?? "host") as string).toLowerCase();
      router.replace(`/${type}/performance`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-layout">
      <div className="login-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/payment-illustration.png" alt="" />
      </div>
      <div className="login-right">
        <div className="login-card">
          <h1>CUUB Dashboard</h1>
          <p className="subtitle">Sign in with your username</p>
          <form onSubmit={onSubmit}>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              autoComplete="username"
              required
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Log in"}
            </button>
          </form>
          {error ? <p className="login-error visible">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
