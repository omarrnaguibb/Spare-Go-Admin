"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminUser, PendingApprovalsCount } from "./types";
import { adminApi } from "./api";

interface AdminContextType {
  admin: AdminUser | null;
  loading: boolean;
  pendingCounts: PendingApprovalsCount | null;
  refreshPendingCounts: () => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCounts, setPendingCounts] = useState<PendingApprovalsCount | null>(null);

  const refreshPendingCounts = useCallback(async () => {
    try {
      const counts = await adminApi.getPendingApprovalsCount();
      setPendingCounts(counts);
    } catch {
      // ignore
    }
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const user = await adminApi.getMe();
      if (user.role !== "admin") {
        setAdmin(null);
        if (pathname !== "/login") router.push("/login");
        return;
      }
      setAdmin(user);
      await refreshPendingCounts();
    } catch {
      setAdmin(null);
      if (pathname !== "/login") router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [pathname, router, refreshPendingCounts]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    const handleExpired = () => {
      setAdmin(null);
      router.push("/login");
    };
    window.addEventListener("spare-go-admin-session-expired", handleExpired);
    return () => {
      window.removeEventListener("spare-go-admin-session-expired", handleExpired);
    };
  }, [router]);

  const logout = async () => {
    try {
      await adminApi.logout();
    } catch {
      // ignore
    } finally {
      setAdmin(null);
      router.push("/login");
    }
  };

  return (
    <AdminContext.Provider
      value={{
        admin,
        loading,
        pendingCounts,
        refreshPendingCounts,
        refreshMe,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return ctx;
}
