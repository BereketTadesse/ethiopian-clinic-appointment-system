'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import {
  Activity,
  Layers,
  Building2,
  TrendingUp,
  CalendarOff,
  CalendarDays,
  RefreshCw,
  ClipboardList,
  UserCheck,
  Calendar,
  Users,
  User,
  Stethoscope,
  FileText,
  Clock,
  LogOut,
  Shield,
  ChevronRight,
  PlusCircle,
  Home,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTabQuery, setActiveTabQuery] = useState(searchParams?.get('tab') || '');
  const { user, logout, mounted } = useAuth();
  const { clinicName, clinicLogo } = useClinic();

  useEffect(() => {
    setActiveTabQuery(searchParams?.get('tab') || '');
  }, [searchParams, pathname]);

  useEffect(() => {
    const syncFromUrl = () => {
      try {
        const p = new URLSearchParams(window.location.search).get('tab');
        setActiveTabQuery(p || '');
      } catch (err) {}
    };
    const handleTabEvent = (e) => {
      setActiveTabQuery(e.detail?.tab || '');
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('app:tab-change', handleTabEvent);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('app:tab-change', handleTabEvent);
    };
  }, []);

  const handleNavClick = (e, item) => {
    onClose();
    const [itemPath, itemQuery] = item.href.split('?');
    const targetTab = itemQuery ? new URLSearchParams(itemQuery).get('tab') || '' : '';

    if (pathname === itemPath) {
      e.preventDefault();
      router.push(item.href);
      setActiveTabQuery(targetTab);
      window.dispatchEvent(
        new CustomEvent('app:tab-change', {
          detail: { path: itemPath, tab: targetTab }
        })
      );
    } else {
      setActiveTabQuery(targetTab);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const role = user?.role || 'patient';
  const isAdmin = role === 'admin';
  const isDoctor = role === 'doctor';
  const isReceptionist = role === 'receptionist';
  const isPatient = role === 'patient' || (!isAdmin && !isDoctor && !isReceptionist);

  // Brand link destinations based on role
  const brandLink = isAdmin
    ? '/admin/dashboard'
    : isReceptionist
    ? '/reception/dashboard'
    : isDoctor
    ? '/doctor/dashboard'
    : '/dashboard';

  // Role badge display config
  const roleConfig = isAdmin
    ? {
        label: 'Clinic Admin',
        color: '#b45309',
        bg: '#fef3c7',
        border: '#fde68a',
        icon: '👑'
      }
    : isReceptionist
    ? {
        label: 'Front Desk Reception',
        color: '#065f46',
        bg: '#ecfdf5',
        border: '#a7f3d0',
        icon: '📋'
      }
    : isDoctor
    ? {
        label: 'Attending Physician',
        color: '#4338ca',
        bg: '#e0e7ff',
        border: '#c7d2fe',
        icon: '🩺'
      }
    : {
        label: 'Patient Portal',
        color: '#0369a1',
        bg: '#f0f9ff',
        border: '#bae6fd',
        icon: '👤'
      };

  // Role-Based Navigation Sections
  const getNavSections = () => {
    if (isAdmin) {
      return [
        {
          title: 'CLINICAL OPERATIONS',
          items: [
            {
              name: 'Operations & Slots',
              href: '/admin/dashboard',
              icon: Layers,
              description: 'Triage, queue & slot intake'
            },
            {
              name: 'Clinic Profile & Media',
              href: '/admin/clinic',
              icon: Building2,
              description: 'Identity, hours & brand media'
            },
            {
              name: 'Analytics & Revenue',
              href: '/admin/analytics',
              icon: TrendingUp,
              description: 'Telebirr & CBE intake'
            }
          ]
        },
        {
          title: 'STAFF & SCHEDULES',
          items: [
            {
              name: 'Doctor Staff Roster',
              href: '/admin/dashboard?tab=doctors',
              icon: Stethoscope,
              description: 'Roster, shifts & specialties'
            },
            {
              name: 'Receptionist Staff',
              href: '/admin/dashboard?tab=receptionists',
              icon: Users,
              description: 'Onboard & manage front desk'
            },
            {
              name: 'Doctor Leave Requests',
              href: '/admin/clinic?tab=leaves',
              icon: CalendarOff,
              description: 'Review doctor time-off'
            },
            {
              name: 'Ethiopian Holidays',
              href: '/admin/clinic?tab=holidays',
              icon: CalendarDays,
              description: 'Public holidays calendar'
            },
            {
              name: 'Slot Maintenance',
              href: '/admin/clinic?tab=maintenance',
              icon: RefreshCw,
              description: 'Slot cleanup & cron status'
            }
          ]
        }
      ];
    }

    if (isReceptionist) {
      return [
        {
          title: 'FRONT DESK TERMINAL',
          items: [
            {
              name: 'Live Queue & Check-In',
              href: '/reception/dashboard',
              icon: ClipboardList,
              description: 'Arrivals & triage queue'
            },
            {
              name: 'Doctor Availability',
              href: '/reception/dashboard?tab=slots',
              icon: Calendar,
              description: 'Available physician slots'
            },
            {
              name: 'Patient Directory',
              href: '/reception/dashboard?tab=patients',
              icon: Users,
              description: 'Search & registration records'
            }
          ]
        },
        {
          title: 'STAFF ACCOUNT',
          items: [
            {
              name: 'Staff Profile & Access',
              href: '/profile',
              icon: User,
              description: 'Credentials & password'
            }
          ]
        }
      ];
    }

    if (isDoctor) {
      return [
        {
          title: 'CLINICAL WORKSPACE',
          items: [
            {
              name: 'Consultation Queue',
              href: '/doctor/dashboard',
              icon: Stethoscope,
              description: 'Waiting & active patients'
            },
            {
              name: 'Doctor Profile & Hours',
              href: '/doctor/profile',
              icon: UserCheck,
              description: 'License & specialization'
            }
          ]
        },
        {
          title: 'ACCOUNT',
          items: [
            {
              name: 'My Profile & Security',
              href: '/profile',
              icon: User,
              description: 'Account settings & password'
            }
          ]
        }
      ];
    }

    // Default: Patient
    return [
      {
        title: 'PATIENT CARE',
        items: [
          {
            name: 'My Appointments',
            href: '/dashboard',
            icon: Calendar,
            description: 'Upcoming slots & queue #'
          },
          {
            name: 'Family Members',
            href: '/family-members',
            icon: Users,
            description: 'Dependent healthcare records'
          },
          {
            name: 'My Medical Profile',
            href: '/profile',
            icon: User,
            description: 'Personal info & emergency contact'
          }
        ]
      }
    ];
  };

  const navSections = getNavSections();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="sidebar-backdrop"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`sidebar-aside ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        suppressHydrationWarning
      >
        {/* Top Header: Clinic Brand & Logo */}
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <Link
            href={brandLink}
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              minWidth: 0,
              flex: 1
            }}
          >
            {clinicLogo ? (
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <img
                  src={clinicLogo}
                  alt={clinicName}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4f46e5, #065f46)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                }}
              >
                <Activity size={22} />
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {clinicName}
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: '#64748b',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginTop: '2px'
                }}
              >
                Healthcare System
              </div>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="sidebar-close-btn"
            aria-label="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current User Role Badge */}
        <div style={{ padding: '12px 20px 8px' }}>
          <div
            style={{
              background: roleConfig.bg,
              border: `1px solid ${roleConfig.border}`,
              color: roleConfig.color,
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '0.76rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              letterSpacing: '0.3px'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>{roleConfig.icon}</span>
              <span style={{ textTransform: 'uppercase' }}>{roleConfig.label}</span>
            </span>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: roleConfig.color,
                display: 'inline-block'
              }}
            />
          </div>
        </div>

        {/* Middle Navigation Links (Scrollable) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {navSections.map((sec, idx) => (
            <div key={idx}>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#94a3b8',
                  letterSpacing: '0.8px',
                  padding: '0 10px',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}
              >
                {sec.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sec.items.map((item, itemIdx) => {
                  const ItemIcon = item.icon;
                  // Exact match or sub-path match for active styling
                  const [itemPath, itemQuery] = item.href.split('?');
                  let isCurrent = false;

                  if (itemQuery) {
                    const itemTab = new URLSearchParams(itemQuery).get('tab');
                    isCurrent = pathname === itemPath && activeTabQuery === itemTab;
                  } else {
                    if (activeTabQuery) {
                      isCurrent = false;
                    } else {
                      isCurrent = pathname === item.href || (
                        item.href !== '/dashboard' &&
                        item.href !== '/admin/dashboard' &&
                        item.href !== '/reception/dashboard' &&
                        item.href !== '/doctor/dashboard' &&
                        pathname.startsWith(item.href)
                      );
                    }
                  }

                  return (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                        background: isCurrent ? '#eef2ff' : 'transparent',
                        color: isCurrent ? '#4338ca' : '#475569',
                        fontWeight: isCurrent ? 800 : 600,
                        border: isCurrent ? '1px solid #c7d2fe' : '1px solid transparent'
                      }}
                      className="sidebar-nav-item"
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background: isCurrent ? '#ffffff' : '#f8fafc',
                          color: isCurrent ? '#4f46e5' : '#64748b',
                          boxShadow: isCurrent ? '0 2px 6px rgba(79, 70, 229, 0.15)' : 'none',
                          border: '1px solid',
                          borderColor: isCurrent ? '#c7d2fe' : '#e2e8f0'
                        }}
                      >
                        <ItemIcon size={16} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.86rem',
                            lineHeight: 1.25,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.name}
                        </div>
                        {item.description && (
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: isCurrent ? '#6366f1' : '#94a3b8',
                              fontWeight: 500,
                              marginTop: '2px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {item.description}
                          </div>
                        )}
                      </div>

                      {isCurrent && (
                        <div
                          style={{
                            width: '4px',
                            height: '16px',
                            borderRadius: '9999px',
                            background: '#4f46e5',
                            flexShrink: 0
                          }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Action: Patient Book Appointment shortcut if patient */}
          {isPatient && (
            <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
              <Link
                href="/dashboard"
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                  color: 'white',
                  padding: '11px 16px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
                }}
              >
                <PlusCircle size={16} />
                <span>Book Appointment</span>
              </Link>
            </div>
          )}
        </div>

        {/* Bottom User Profile Card & Logout */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafbfc'
          }}
        >
          {mounted && user ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <Link
                href="/profile"
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textDecoration: 'none',
                  minWidth: 0,
                  flex: 1
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: roleConfig.color,
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {user.name || 'User'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {user.email || user.phoneNumber || 'Authenticated'}
                  </div>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                title="Log out of account"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                className="logout-button"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link
                href="/login"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '0.82rem', padding: '8px' }}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn btn-primary btn-sm"
                style={{ flex: 1, fontSize: '0.82rem', padding: '8px' }}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
