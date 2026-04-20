'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../shared/components/Sidebar';
import Header from '../../shared/components/Header';
import { useAuth } from '@/features/auth';
import { isTokenExpired } from '@/shared/auth/client';
import { useStore } from 'zustand';

const TOKEN_CHECK_INTERVAL_MS = 60_000; // check every 60 seconds

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();

  // Wait for Zustand to rehydrate from localStorage before checking auth.
  // useStore with a selector triggers a re-render once the persisted state is loaded.
  const isAuthenticated = useStore(useAuth, (s) => s.isAuthenticated);
  const token = useStore(useAuth, (s) => s.token);
  const logout = useStore(useAuth, (s) => s.logout);
  const hasHydrated = useAuth.persist.hasHydrated();

  // Redirect if not authenticated after hydration
  useEffect(() => {
    if (hasHydrated && (!isAuthenticated || !token)) {
      router.replace('/login');
    }
  }, [hasHydrated, isAuthenticated, token, router]);

  // Check token expiry on mount and periodically — handles idle sessions
  useEffect(() => {
    if (!hasHydrated || !token) return;

    const checkExpiry = () => {
      if (isTokenExpired(token)) {
        logout();
        router.replace('/login');
      }
    };

    // Check immediately on mount
    checkExpiry();

    const interval = setInterval(checkExpiry, TOKEN_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasHydrated, token, logout, router]);

  // While Zustand is still rehydrating, render nothing to avoid a flash
  if (!hasHydrated) return null;

  // Token is gone — redirect is in flight, don't render the shell
  if (!isAuthenticated || !token) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
