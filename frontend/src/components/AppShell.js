'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar automatically on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Determine if the current page is a public marketing or authentication page
  const isPublicPage =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname?.startsWith('/reset-password');

  if (isPublicPage) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} suppressHydrationWarning>
        <Navbar />
        <main style={{ flex: 1 }} suppressHydrationWarning>
          {children}
        </main>
      </div>
    );
  }

  // Dashboard / Portal Layout for Authenticated Roles (Admin, Doctor, Receptionist, Patient)
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-page)',
        position: 'relative'
      }}
      className="dashboard-shell"
      suppressHydrationWarning
    >
      {/* 1. Left Navigation Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 2. Main Middle Area (Top Header + Role Page Contents) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          position: 'relative'
        }}
        className="dashboard-main-area"
        suppressHydrationWarning
      >
        <TopHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main
          style={{
            flex: 1,
            width: '100%',
            position: 'relative'
          }}
          className="dashboard-middle-content"
          suppressHydrationWarning
        >
          {children}
        </main>
      </div>
    </div>
  );
}
