"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "cuub_user";

export type CuubUser = {
  id?: string | number;
  username?: string;
  type?: string;
  stations?: string[];
  [key: string]: unknown;
};

type AuthContextValue = {
  user: CuubUser | null;
  ready: boolean;
  setUser: (user: CuubUser | null) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): CuubUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CuubUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<CuubUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUserState(readStoredUser());
    setReady(true);
  }, []);

  const setUser = useCallback((next: CuubUser | null) => {
    if (typeof window !== "undefined") {
      if (next) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setUserState(next);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    router.replace("/login");
  }, [router, setUser]);

  return (
    <AuthContext.Provider value={{ user, ready, setUser, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function isAdmin(user: CuubUser | null): boolean {
  return Boolean(user && (user.type ?? "").toString().toUpperCase() === "ADMIN");
}

export function useRequireAuth(opts: { adminOnly?: boolean } = {}) {
  const { user, ready, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user || !user.id) {
      signOut();
      return;
    }
    if (opts.adminOnly && !isAdmin(user)) {
      router.replace(`/${(user.type ?? "host").toString().toLowerCase()}/performance`);
    }
  }, [ready, user, opts.adminOnly, router, signOut]);

  return { user, ready };
}
