'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { Activity, User, LogOut, Users, Stethoscope, Building2, ClipboardList } from 'lucide-react';

export default function Navbar() {
  const { user, logout, mounted } = useAuth();
  const { clinicName, clinicLogo } = useClinic();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const isDoctor = user?.role === 'doctor';
  const isAdmin = user?.role === 'admin';
  const isReceptionist = user?.role === 'receptionist';

  const brandLink = isAdmin
    ? '/admin/dashboard'
    : isReceptionist
    ? '/reception/dashboard'
    : isDoctor
    ? '/doctor/dashboard'
    : '/';

  const subTitle = isAdmin
    ? 'CLINIC ADMIN'
    : isReceptionist
    ? 'FRONT DESK RECEPTION'
    : isDoctor
    ? 'PHYSICIAN CLINIC PORTAL'
    : 'CLINIC APPOINTMENTS';

  return (
    <header className="navbar-header" suppressHydrationWarning>
      <div className="navbar-container" suppressHydrationWarning>
        {/* Brand Logo & Clinic Name */}
        <Link href={brandLink} className="navbar-brand-link" suppressHydrationWarning>
          {clinicLogo ? (
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
              suppressHydrationWarning
            >
              <img
                src={clinicLogo}
                alt={clinicName}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div className="navbar-logo-icon" suppressHydrationWarning>
              <Activity size={22} />
            </div>
          )}
          <div suppressHydrationWarning style={{ minWidth: 0 }}>
            <span
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.3px',
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '260px'
              }}
            >
              {clinicName}
            </span>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '-2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
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
                  <Link href="/admin/clinic" className="navbar-nav-item" suppressHydrationWarning style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Building2 size={15} /> Clinic Profile
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
              ) : isReceptionist ? (
                <>
                  <Link href="/reception/dashboard" className="navbar-nav-item" suppressHydrationWarning style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <ClipboardList size={16} /> Reception Desk
                  </Link>
                  <Link href="/profile" className="navbar-nav-item" suppressHydrationWarning style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <User size={15} /> Profile
                  </Link>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '9999px',
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    📋 Front Desk
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
