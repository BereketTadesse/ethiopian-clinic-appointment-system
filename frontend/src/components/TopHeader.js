'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { clinicApi } from '../lib/api';
import {
  Menu,
  Clock,
  Calendar,
  Building2,
  Shield,
  User,
  Activity,
  Phone,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function TopHeader({ onToggleSidebar }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentTab, setCurrentTab] = useState(searchParams?.get('tab') || '');
  const { user, mounted } = useAuth();
  const { clinic, clinicName } = useClinic();
  const [runtimeStatus, setRuntimeStatus] = useState(null);

  useEffect(() => {
    setCurrentTab(searchParams?.get('tab') || '');
  }, [searchParams, pathname]);

  useEffect(() => {
    const handleTabEvent = (e) => {
      setCurrentTab(e.detail?.tab || '');
    };
    window.addEventListener('app:tab-change', handleTabEvent);
    return () => window.removeEventListener('app:tab-change', handleTabEvent);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await clinicApi.get('/status');
        if (isMounted && res.data?.success) {
          setRuntimeStatus(res.data);
        }
      } catch (err) {
        // Silently fallback to clinic working hours from context
      }
    };
    fetchStatus();
    return () => { isMounted = false; };
  }, []);

  // Compute breadcrumb/title from pathname and active query tab
  const getPageInfo = () => {
    if (pathname.startsWith('/admin/dashboard')) {
      if (currentTab === 'doctors') return { section: 'Medical Staff Roster', title: 'Doctor Directory & Shifts' };
      if (currentTab === 'receptionists') return { section: 'Front Desk Team', title: 'Reception Staff Directory' };
      if (currentTab === 'doctor_leaves') return { section: 'Staff Schedules', title: 'Doctor Leave Applications' };
      if (currentTab === 'open_slots') return { section: 'Clinical Operations', title: 'Open & Available Slots' };
      if (currentTab === 'treated') return { section: 'Clinical Operations', title: 'Consultation & Treated Archive' };
      return { section: 'Admin Operations', title: 'Clinic Triage & Slot Allocation' };
    }
    if (pathname.startsWith('/admin/clinic')) {
      if (currentTab === 'leaves') return { section: 'Staff Schedules', title: 'Doctor Leave Approvals' };
      if (currentTab === 'holidays') return { section: 'Clinic Calendar', title: 'Ethiopian Holidays & Closures' };
      if (currentTab === 'maintenance') return { section: 'Engine Maintenance', title: 'Automated Slot Generator' };
      return { section: 'Clinic Management', title: 'Operating Profile & Media Assets' };
    }
    if (pathname.startsWith('/admin/analytics')) {
      return { section: 'Business Intelligence', title: 'Analytics & Revenue Reports' };
    }
    if (pathname.startsWith('/reception/dashboard')) {
      if (currentTab === 'slots') return { section: 'Front Desk Terminal', title: 'Doctor Shift Availability' };
      if (currentTab === 'patients') return { section: 'Front Desk Terminal', title: 'Patient Registry & Cards' };
      return { section: 'Front Desk Terminal', title: 'Patient Intake & Queue Dispatch' };
    }
    if (pathname.startsWith('/doctor/dashboard')) {
      return { section: 'Physician Portal', title: 'Consultation & Clinical Evaluation' };
    }
    if (pathname.startsWith('/doctor/profile')) {
      return { section: 'Physician Profile', title: 'Credentials & Schedule Configuration' };
    }
    if (pathname.startsWith('/family-members')) {
      return { section: 'Family Health', title: 'Family Members & Dependents' };
    }
    if (pathname.startsWith('/profile')) {
      return { section: 'Account Settings', title: 'Profile & Security' };
    }
    if (pathname.startsWith('/dashboard')) {
      return { section: 'Patient Workspace', title: 'Appointments & Consultations' };
    }
    return { section: 'Healthcare Portal', title: 'Dashboard' };
  };

  const pageInfo = getPageInfo();

  const [isMounted, setIsMounted] = useState(false);
  const [todayStr, setTodayStr] = useState('');

  useEffect(() => {
    setIsMounted(true);
    try {
      setTodayStr(
        new Date().toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
      );
    } catch {
      // ignore
    }
  }, []);

  const isOpen = runtimeStatus ? runtimeStatus.isOpen : true;
  const openTime = clinic?.workingHours?.openTime || '08:00';
  const closeTime = clinic?.workingHours?.closeTime || '17:00';

  return (
    <header
      style={{
        height: '66px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        gap: '16px'
      }}
      className="dashboard-topbar"
    >
      {/* Left: Mobile Toggle & Page Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '8px',
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          className="sidebar-mobile-toggle"
          aria-label="Open Navigation Sidebar"
        >
          <Menu size={20} />
        </button>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#6366f1',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              lineHeight: 1
            }}
          >
            {pageInfo.section}
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.3px',
              marginTop: '3px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {pageInfo.title}
          </div>
        </div>
      </div>

      {/* Right: Status Pill, Date, and User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        {/* Operating Status Pill */}
        <div
          style={{
            padding: '5px 12px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isOpen ? '#f0fdf4' : '#fef2f2',
            color: isOpen ? '#15803d' : '#b91c1c',
            border: `1px solid ${isOpen ? '#bbf7d0' : '#fecaca'}`,
            whiteSpace: 'nowrap'
          }}
          className="hidden sm:inline-flex"
          suppressHydrationWarning
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isOpen ? '#22c55e' : '#ef4444',
              boxShadow: isOpen ? '0 0 6px #22c55e' : 'none',
              display: 'inline-block'
            }}
            suppressHydrationWarning
          />
          <span suppressHydrationWarning>{isOpen ? `Open (${openTime} - ${closeTime})` : 'Closed'}</span>
        </div>

        {/* Date Display */}
        {isMounted && todayStr ? (
          <div
            style={{
              fontSize: '0.78rem',
              color: '#64748b',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '5px 12px',
              borderRadius: '9999px',
              whiteSpace: 'nowrap'
            }}
            className="hidden md:inline-flex"
            suppressHydrationWarning
          >
            <Calendar size={13} style={{ color: '#4f46e5' }} />
            <span suppressHydrationWarning>{todayStr}</span>
          </div>
        ) : null}

        {/* User Quick Pill */}
        {mounted && user && (
          <Link
            href="/profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px 4px 6px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '9999px',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#0f172a',
                maxWidth: '120px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              className="hidden sm:inline"
            >
              {user.name?.split(' ')[0] || 'Account'}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
