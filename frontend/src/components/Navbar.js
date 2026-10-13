'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Activity, User, LogOut, Users, Stethoscope } from 'lucide-react';

export default function Navbar() {
  const { user, logout, mounted } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const isDoctor = user?.role === 'doctor';
  const isAdmin = user?.role === 'admin';

  const brandLink = isAdmin ? '/admin/dashboard' : isDoctor ? '/doctor/dashboard' : '/';
  const subTitle = isAdmin
    ? 'CLINIC ADMIN & RECEPTION'
    : isDoctor
    ? 'PHYSICIAN CLINIC PORTAL'
    : 'CLINIC APPOINTMENTS';

  return (
    <header className="navbar-header" suppressHydrationWarning>
      <div className="navbar-container" suppressHydrationWarning>
        {/* Brand Logo */}
        <Link href={brandLink} className="navbar-brand-link" suppressHydrationWarning>
          <div className="navbar-logo-icon" suppressHydrationWarning>
            <Activity size={22} />
          </div>
          <div suppressHydrationWarning>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              CareSync <span style={{ color: '#4f46e5' }}>ET</span>
            </span>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '-3px' }}>
              {subTitle}
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="navbar-nav-links" suppressHydrationWarning>
          {mounted && user ? (
            <>
              {isAdmin ? (
                <>
                  <Link href="/admin/dashboard" className="navbar-nav-item" suppressHydrationWarning>
                    Operations & Slots
                  </Link>
                  <Link href="/admin/analytics" className="navbar-nav-item" suppressHydrationWarning>
                    Analytics & Revenue
                  </Link>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '9999px',
                    background: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    👑 Clinic Admin
                  </span>
                </>
              ) : isDoctor ? (
                <>
                  <Link href="/doctor/dashboard" className="navbar-nav-item" suppressHydrationWarning>
                    <Stethoscope size={16} /> Patient Queue & Slots
                  </Link>
                  <Link href="/doctor/profile" className="navbar-nav-item" suppressHydrationWarning>
                    <User size={16} /> Doctor Profile
                  </Link>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '9999px',
                    background: '#e0e7ff',
                    color: '#4338ca',
                    border: '1px solid #c7d2fe',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🩺 MD Doctor
                  </span>
                </>
              ) : (
                <>
                  <Link href="/dashboard" className="navbar-nav-item" suppressHydrationWarning>
                    Dashboard
                  </Link>
                  <Link href="/family-members" className="navbar-nav-item" suppressHydrationWarning>
                    <Users size={16} /> Family Members
                  </Link>
                  <Link href="/profile" className="navbar-nav-item" suppressHydrationWarning>
                    <User size={16} /> Profile
                  </Link>
                </>
              )}
              <button onClick={handleLogout} className="btn btn-secondary btn-sm" suppressHydrationWarning>
                <LogOut size={15} /> Logout
              </button>
            </>
          ) : (
            <div className="navbar-auth-buttons" suppressHydrationWarning>
              <Link href="/login" className="btn btn-secondary btn-sm" suppressHydrationWarning>
                Sign In
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm" suppressHydrationWarning>
                Register Account
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
