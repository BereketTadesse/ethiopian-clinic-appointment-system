'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  Users,
  User,
  Stethoscope,
  Calendar,
  CreditCard,
  DollarSign,
  ArrowLeft,
  PieChart,
  BarChart3,
  Activity,
  CheckCircle2,
  Printer,
  Download,
  ShieldCheck,
  Building,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Timeframe Filter: 'month' | 'week' | 'today'
  const [timeframe, setTimeframe] = useState('month');

  // Dynamic Metrics Based on Timeframe
  const metrics = {
    today: {
      totalRevenue: '14,800',
      cardFees: '1,800', // 18 cards taken
      consultationFees: '13,000',
      totalUsers: 34,
      maleUsers: 19,
      femaleUsers: 15,
      totalDoctors: 5,
      activeDoctors: 5,
      patientsTreated: 26,
      telebirrRevenue: '9,176',
      cbeBirrRevenue: '4,144',
      chapaRevenue: '1,480'
    },
    week: {
      totalRevenue: '76,500',
      cardFees: '9,400',
      consultationFees: '67,100',
      totalUsers: 182,
      maleUsers: 98,
      femaleUsers: 84,
      totalDoctors: 5,
      activeDoctors: 5,
      patientsTreated: 148,
      telebirrRevenue: '47,430',
      cbeBirrRevenue: '21,420',
      chapaRevenue: '7,650'
    },
    month: {
      totalRevenue: '184,500',
      cardFees: '24,600',
      consultationFees: '159,900',
      totalUsers: 428,
      maleUsers: 231,
      femaleUsers: 197,
      totalDoctors: 5,
      activeDoctors: 5,
      patientsTreated: 312,
      telebirrRevenue: '114,390',
      cbeBirrRevenue: '51,660',
      chapaRevenue: '18,450'
    }
  };

  const current = metrics[timeframe];
  const malePercent = Math.round((current.maleUsers / current.totalUsers) * 100);
  const femalePercent = Math.round((current.femaleUsers / current.totalUsers) * 100);

  // Doctors Breakdown Data
  const doctorWorkload = [
    { name: 'Dr. Abebe Bekele', specialty: 'Internal Medicine', patients: 82, revenue: '41,000 ETB', capacity: '94%' },
    { name: 'Dr. Selamawit Bekele', specialty: 'General Internal Medicine', patients: 76, revenue: '38,000 ETB', capacity: '91%' },
    { name: 'Dr. Dawit Tadesse', specialty: 'Pediatrics & Child Health', patients: 68, revenue: '34,000 ETB', capacity: '86%' },
    { name: 'Dr. Hanna Girma', specialty: 'OB/GYN Clinic', patients: 54, revenue: '32,400 ETB', capacity: '80%' },
    { name: 'Dr. Yared Melaku', specialty: 'Cardiology Clinic', patients: 32, revenue: '22,400 ETB', capacity: '75%' },
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', minHeight: '94vh', padding: '30px 0 60px' }}>
      <div className="container">

        {/* Back Link & Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <Link
            href="/admin/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4f46e5', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}
          >
            <ArrowLeft size={16} /> Return to Operations & Slot Dashboard
          </Link>

          {/* Timeframe Filter Buttons */}
          <div style={{
            background: 'white',
            border: '1.5px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '4px',
            display: 'flex',
            gap: '4px'
          }}>
            <button
              onClick={() => setTimeframe('today')}
              style={{
                border: 'none',
                background: timeframe === 'today' ? '#4f46e5' : 'transparent',
                color: timeframe === 'today' ? 'white' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('week')}
              style={{
                border: 'none',
                background: timeframe === 'week' ? '#4f46e5' : 'transparent',
                color: timeframe === 'week' ? 'white' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeframe('month')}
              style={{
                border: 'none',
                background: timeframe === 'month' ? '#4f46e5' : 'transparent',
                color: timeframe === 'month' ? 'white' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              This Month
            </button>
          </div>
        </div>

        {/* ── HEADER BANNER ────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          color: 'white',
          marginBottom: '28px',
          boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.3)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.5px'
              }}>
                📊 CLINIC EXECUTIVE ANALYTICS
              </span>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>Bole Medhanealem Central Clinic</span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              Financial Revenue & Patient Demographics
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.92rem' }}>
              Live audit of clinic gross income, gender distribution, treated patient volume, and physician capacity.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="btn"
            style={{
              background: 'white',
              color: '#064e3b',
              fontWeight: 700,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <Printer size={16} /> Print / Export Report
          </button>
        </div>

        {/* ── 4 PRIMARY KPI HIGHLIGHTS ─────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '28px'
        }}>
          
          {/* 1. TOTAL MONEY / REVENUE */}
          <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Money Collected
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#047857', marginTop: '6px' }}>
                  {current.totalRevenue} <span style={{ fontSize: '1rem', fontWeight: 600 }}>ETB</span>
                </div>
              </div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#ecfdf5',
                color: '#047857',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarSign size={22} />
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              Card Fees: <strong>{current.cardFees} ETB</strong> • Consultations: <strong>{current.consultationFees} ETB</strong>
            </div>
          </div>

          {/* 2. TOTAL USERS & PATIENTS */}
          <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid #4f46e5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Users & Patients
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '6px' }}>
                  {current.totalUsers}
                </div>
              </div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={22} />
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              Registered accounts + family dependents on file
            </div>
          </div>

          {/* 3. TOTAL DOCTORS ON STAFF */}
          <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Amount of Doctors
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
                  {current.totalDoctors} <span style={{ fontSize: '1rem', fontWeight: 600 }}>Physicians</span>
                </div>
              </div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#fef3c7',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Stethoscope size={22} />
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontWeight: 600 }}>
              ✓ 100% Active Duty & Licensed by Ethiopian MOH
            </div>
          </div>

          {/* 4. TOTAL PATIENTS TREATED */}
          <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid #3b82f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Patients Treated
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#1d4ed8', marginTop: '6px' }}>
                  {current.patientsTreated} <span style={{ fontSize: '1rem', fontWeight: 600 }}>Visits</span>
                </div>
              </div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#dbeafe',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={22} />
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              Full consultation completed with clinical diagnosis
            </div>
          </div>

        </div>

        {/* ── TWO-COLUMN DETAILED ANALYSIS: GENDER & FINANCIALS ────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '24px',
          marginBottom: '28px'
        }}>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* USER DEMOGRAPHICS BY GENDER (የተጠቃሚዎች ጾታ ትንተና)            */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Total Users by Gender (የጾታ ክፍፍል)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Demographic ratio of registered primary patients and family members.
                </p>
              </div>
              <div style={{
                background: '#e0e7ff',
                color: '#4338ca',
                fontWeight: 800,
                fontSize: '0.85rem',
                padding: '4px 10px',
                borderRadius: '9999px'
              }}>
                {current.totalUsers} Total
              </div>
            </div>

            {/* Visual Gender Progress Bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                height: '24px',
                borderRadius: '12px',
                background: '#e2e8f0',
                display: 'flex',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div
                  style={{
                    width: `${malePercent}%`,
                    background: 'linear-gradient(90deg, #4f46e5, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    transition: 'width 0.5s ease'
                  }}
                >
                  {malePercent}%
                </div>
                <div
                  style={{
                    width: `${femalePercent}%`,
                    background: 'linear-gradient(90deg, #ec4899, #f43f5e)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    transition: 'width 0.5s ease'
                  }}
                >
                  {femalePercent}%
                </div>
              </div>
            </div>

            {/* Gender Statistic Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              
              {/* Male Card */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e0e7ff',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#e0e7ff',
                  color: '#4338ca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>
                  👨
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4338ca' }}>MALE (ወንድ)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {current.maleUsers}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {malePercent}% of user base
                  </div>
                </div>
              </div>

              {/* Female Card */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #fce7f3',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#fce7f3',
                  color: '#db2777',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>
                  👩
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#db2777' }}>FEMALE (ሴት)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {current.femaleUsers}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {femalePercent}% of user base
                  </div>
                </div>
              </div>

            </div>

            {/* Age Segment Breakdown */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Demographic Age Segments
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: '4px' }}>
                <span>• Pediatric & Children (0 - 14 yrs):</span>
                <strong>24% (102 Patients)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: '4px' }}>
                <span>• Working Adults (15 - 49 yrs):</span>
                <strong>62% (265 Patients)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>• Elderly & Seniors (50+ yrs):</span>
                <strong>14% (61 Patients)</strong>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* REVENUE BREAKDOWN & PAYMENT CHANNELS                        */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Payment Channel Distribution
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Breakdown by Ethiopian digital payment providers.
                </p>
              </div>
              <div style={{
                background: '#ecfdf5',
                color: '#047857',
                fontWeight: 800,
                fontSize: '0.85rem',
                padding: '4px 10px',
                borderRadius: '9999px'
              }}>
                100% Settled
              </div>
            </div>

            {/* Payment Channel Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
              
              {/* Telebirr */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📱 Telebirr (Ethio Telecom)
                  </span>
                  <span style={{ fontWeight: 800, color: '#047857' }}>
                    {current.telebirrRevenue} ETB (62%)
                  </span>
                </div>
                <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: '62%', height: '100%', background: '#0284c7' }} />
                </div>
              </div>

              {/* CBE Birr */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🏦 CBE Birr (Commercial Bank of Ethiopia)
                  </span>
                  <span style={{ fontWeight: 800, color: '#047857' }}>
                    {current.cbeBirrRevenue} ETB (28%)
                  </span>
                </div>
                <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: '28%', height: '100%', background: '#7c3aed' }} />
                </div>
              </div>

              {/* Chapa */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💳 Chapa / Cards & Cash at Desk
                  </span>
                  <span style={{ fontWeight: 800, color: '#047857' }}>
                    {current.chapaRevenue} ETB (10%)
                  </span>
                </div>
                <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: '10%', height: '100%', background: '#10b981' }} />
                </div>
              </div>

            </div>

            {/* Income Streams Summary Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                Clinic Income Streams
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#475569', marginBottom: '6px' }}>
                <span>• Clinic Card Registration Fees (100 ETB fixed):</span>
                <strong style={{ color: '#0f172a' }}>{current.cardFees} ETB</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#475569' }}>
                <span>• Physician Specialist Consultation Fees:</span>
                <strong style={{ color: '#0f172a' }}>{current.consultationFees} ETB</strong>
              </div>
            </div>

          </div>

        </div>

        {/* ── DOCTOR WORKLOAD & PERFORMANCE BREAKDOWN ──────────────── */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Physician Workload & Capacity Utilization ({current.totalDoctors} Doctors)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Patients treated, revenue contribution, and slot utilization rate per physician.
              </p>
            </div>
            <Link href="/admin/dashboard" className="btn btn-secondary btn-sm">
              <Stethoscope size={14} /> Manage Doctors Roster
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Doctor</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Specialization</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Patients Treated</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Capacity Rate</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {doctorWorkload.map((doc, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {doc.name}
                    </td>
                    <td style={{ padding: '14px', color: 'var(--text-muted)' }}>
                      {doc.specialty}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>
                      {doc.patients} Patients
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      <span style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        {doc.capacity}
                      </span>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: '#047857' }}>
                      {doc.revenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
