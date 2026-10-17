'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import { clinicApi } from '@/lib/api';
import API from '@/lib/api';
import {
  ClipboardList,
  User,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Phone,
  CreditCard,
  X,
  Plus,
  Stethoscope,
  MapPin,
  FileText,
  UserCheck,
  Ban,
  Activity,
  Shield,
  RefreshCw,
  Eye,
  Check,
  Building2,
  CalendarDays
} from 'lucide-react';

function ReceptionDashboardContent() {
  const { user, mounted } = useAuth();
  const { clinicName, clinicLogo } = useClinic();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');

  // Active Main Tab: 'queue' | 'slots' | 'patients'
  const [activeTab, setActiveTab] = useState(
    tabParam && ['queue', 'slots', 'patients'].includes(tabParam) ? tabParam : 'queue'
  );

  // 1. Sync from Next.js searchParams
  useEffect(() => {
    if (tabParam && ['queue', 'slots', 'patients'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab('queue');
    }
  }, [tabParam]);

  // 2. Direct mount, popstate and custom tab-change event sync
  useEffect(() => {
    const syncFromUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t && ['queue', 'slots', 'patients'].includes(t)) {
          setActiveTab(t);
        } else if (!t) {
          setActiveTab('queue');
        }
      } catch (err) {}
    };

    const handleTabEvent = (e) => {
      const t = e.detail?.tab;
      if (t && ['queue', 'slots', 'patients'].includes(t)) {
        setActiveTab(t);
      } else if (!t) {
        setActiveTab('queue');
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('app:tab-change', handleTabEvent);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('app:tab-change', handleTabEvent);
    };
  }, []);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    router.replace(`/reception/dashboard?tab=${tabKey}`, { scroll: false });
    window.dispatchEvent(
      new CustomEvent('app:tab-change', {
        detail: { path: '/reception/dashboard', tab: tabKey }
      })
    );
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'scheduled' | 'checked_in' | 'in_consultation' | 'completed' | 'cancelled'
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
  const [notification, setNotification] = useState('');

  // Modals
  const [showPatientDetailModal, setShowPatientDetailModal] = useState(null);
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Walk-in booking form
  const [walkinForm, setWalkinForm] = useState({
    patientName: '',
    phoneNumber: '+251 9',
    gender: 'female',
    age: '28',
    chiefComplaint: '',
    paymentMethod: 'Cash',
    feeAmount: 500
  });

  // Clinic Status State
  const [clinicStatus, setClinicStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Doctors State
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorForSlots, setSelectedDoctorForSlots] = useState(null);

  // Today's Queue Data (with live updates & fallback)
  const [queue, setQueue] = useState([
    {
      id: 'apt-001',
      slotTime: '08:45 AM',
      date: 'Today, Oct 17',
      patientName: 'Bereket Tadesse',
      gender: 'male',
      age: 28,
      phoneNumber: '+251 91 144 5566',
      cardNumber: 'CLN-2026-00001',
      nationalId: 'ET-FAYDA-94821',
      doctorId: 'doc-101',
      doctorName: 'Dr. Abebe Bekele',
      specialty: 'Internal Medicine & General Practice',
      chiefComplaint: 'Persistent dry cough, mild chest tightness and evening fever for 3 days.',
      status: 'in_consultation',
      feePaid: 500,
      paymentMethod: 'Telebirr',
      bookedAt: 'Today, 07:30 AM',
      checkedInAt: '08:35 AM'
    },
    {
      id: 'apt-002',
      slotTime: '09:30 AM',
      date: 'Today, Oct 17',
      patientName: 'Almaz Wolde (Mother)',
      gender: 'female',
      age: 58,
      phoneNumber: '+251 91 199 8877',
      cardNumber: 'CLN-2026-00042',
      nationalId: 'ET-FAYDA-38192',
      doctorId: 'doc-101',
      doctorName: 'Dr. Abebe Bekele',
      specialty: 'Internal Medicine & General Practice',
      chiefComplaint: 'Hypertension checkup and renewal of daily anti-hypertensive medication.',
      status: 'checked_in',
      feePaid: 500,
      paymentMethod: 'CBE Birr',
      bookedAt: 'Today, 08:10 AM',
      checkedInAt: '09:15 AM'
    },
    {
      id: 'apt-003',
      slotTime: '10:15 AM',
      date: 'Today, Oct 17',
      patientName: 'Natnael Girma',
      gender: 'male',
      age: 7,
      phoneNumber: '+251 92 443 2199',
      cardNumber: 'CLN-2026-00019',
      nationalId: 'ET-FAYDA-11029',
      doctorId: 'doc-102',
      doctorName: 'Dr. Bethlehem Haile',
      specialty: 'Pediatrics & Child Health',
      chiefComplaint: 'High fever (38.8 C) with throat redness and appetite loss since yesterday.',
      status: 'scheduled',
      feePaid: 500,
      paymentMethod: 'Telebirr',
      bookedAt: 'Today, 08:45 AM',
      checkedInAt: null
    },
    {
      id: 'apt-004',
      slotTime: '11:00 AM',
      date: 'Today, Oct 17',
      patientName: 'Mulugeta Assefa',
      gender: 'male',
      age: 64,
      phoneNumber: '+251 91 300 1122',
      cardNumber: 'CLN-2026-00088',
      nationalId: 'ET-FAYDA-55120',
      doctorId: 'doc-101',
      doctorName: 'Dr. Abebe Bekele',
      specialty: 'Internal Medicine & General Practice',
      chiefComplaint: 'Type 2 Diabetes fasting blood sugar evaluation and foot examination.',
      status: 'scheduled',
      feePaid: 500,
      paymentMethod: 'Cash',
      bookedAt: 'Today, 09:00 AM',
      checkedInAt: null
    },
    {
      id: 'apt-005',
      slotTime: '08:00 AM',
      date: 'Today, Oct 17',
      patientName: 'Tigist Kebede',
      gender: 'female',
      age: 34,
      phoneNumber: '+251 93 555 4433',
      cardNumber: 'CLN-2026-00012',
      nationalId: 'ET-FAYDA-77192',
      doctorId: 'doc-102',
      doctorName: 'Dr. Bethlehem Haile',
      specialty: 'Pediatrics & Child Health',
      chiefComplaint: 'Post-treatment follow-up and vaccination administration.',
      status: 'completed',
      feePaid: 450,
      paymentMethod: 'CBE Birr',
      bookedAt: 'Yesterday, 04:30 PM',
      checkedInAt: '07:50 AM'
    }
  ]);

  // Available Time Slots for Walk-in Booking
  const [availableSlots, setAvailableSlots] = useState([
    { id: 'slot-101', time: '11:30 AM', doctorId: 'doc-101', doctorName: 'Dr. Abebe Bekele', specialty: 'Internal Medicine', room: 'Suite 201' },
    { id: 'slot-102', time: '02:00 PM', doctorId: 'doc-101', doctorName: 'Dr. Abebe Bekele', specialty: 'Internal Medicine', room: 'Suite 201' },
    { id: 'slot-103', time: '02:45 PM', doctorId: 'doc-101', doctorName: 'Dr. Abebe Bekele', specialty: 'Internal Medicine', room: 'Suite 201' },
    { id: 'slot-104', time: '03:30 PM', doctorId: 'doc-101', doctorName: 'Dr. Abebe Bekele', specialty: 'Internal Medicine', room: 'Suite 201' },
    { id: 'slot-201', time: '11:45 AM', doctorId: 'doc-102', doctorName: 'Dr. Bethlehem Haile', specialty: 'Pediatrics', room: 'Suite 204' },
    { id: 'slot-202', time: '01:30 PM', doctorId: 'doc-102', doctorName: 'Dr. Bethlehem Haile', specialty: 'Pediatrics', room: 'Suite 204' },
    { id: 'slot-203', time: '03:15 PM', doctorId: 'doc-102', doctorName: 'Dr. Bethlehem Haile', specialty: 'Pediatrics', room: 'Suite 204' }
  ]);

  // Auth Guard: Only Receptionist and Admin roles
  useEffect(() => {
    if (mounted && user) {
      if (user.role === 'patient') {
        router.push('/dashboard');
      } else if (user.role === 'doctor') {
        router.push('/doctor/dashboard');
      }
    } else if (mounted && !user) {
      router.push('/login');
    }
  }, [mounted, user, router]);

  // Fetch Clinic Status & Doctor Roster
  const fetchClinicOverview = async () => {
    setLoadingStatus(true);
    try {
      const res = await clinicApi.get('/status');
      if (res.data?.success) {
        setClinicStatus(res.data.data);
      }
    } catch (e) {
      console.warn('Clinic status fetch fallback');
      setClinicStatus({
        isOpen: true,
        message: 'Open Now • Regular Hours (Addis Ababa)',
        operatingHours: { open: '08:30', close: '17:30' }
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchDoctorRoster = async () => {
    setLoadingDoctors(true);
    try {
      const res = await clinicApi.get('/getAllDoctors?all=true');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const mapped = res.data.data.map((doc, idx) => {
          const account = doc.accountDetails && typeof doc.accountDetails === 'object' ? doc.accountDetails : {};
          const rawName = account.fullName || doc.name || `Staff Physician ${idx + 1}`;
          const formattedName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
          return {
            id: doc._id || doc.id || `doc-${idx + 1}`,
            name: formattedName,
            specialty: doc.specialization || 'General Practice',
            phone: account.phoneNumber || doc.phone || '+251 91 000 0000',
            room: doc.room || `Suite 20${(idx % 5) + 1}`,
            shift: (doc.startTime && doc.endTime) ? `${doc.startTime} - ${doc.endTime}` : '08:30 - 17:30',
            active: doc.isActive ?? true
          };
        });
        setDoctors(mapped);
        if (mapped.length > 0 && !selectedDoctorForSlots) {
          setSelectedDoctorForSlots(mapped[0].id);
        }
      }
    } catch (e) {
      console.warn('Doctors roster fallback');
      const fallbackDocs = [
        { id: 'doc-101', name: 'Dr. Abebe Bekele', specialty: 'Internal Medicine & General Practice', room: 'Suite 201', shift: '08:30 - 16:30', phone: '+251 91 123 4567', active: true },
        { id: 'doc-102', name: 'Dr. Bethlehem Haile', specialty: 'Pediatrics & Child Health', room: 'Suite 204', shift: '08:30 - 17:00', phone: '+251 91 234 5678', active: true }
      ];
      setDoctors(fallbackDocs);
      setSelectedDoctorForSlots('doc-101');
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchClinicOverview();
      fetchDoctorRoster();
    }
  }, [mounted]);

  // Mark Patient as Checked In
  const handleCheckInPatient = (aptId) => {
    setQueue(prev => prev.map(item => {
      if (item.id === aptId) {
        const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return { ...item, status: 'checked_in', checkedInAt: nowStr };
      }
      return item;
    }));
    setNotification('✅ Patient marked as arrived & checked in! Doctor queue notified.');
    setTimeout(() => setNotification(''), 4000);
  };

  // Submit Cancellation
  const handleCancelAppointment = () => {
    if (!showCancelModal) return;
    setQueue(prev => prev.map(item => {
      if (item.id === showCancelModal.id) {
        return { ...item, status: 'cancelled', cancelReason: cancelReason || 'Patient requested walk-out cancellation' };
      }
      return item;
    }));
    setShowCancelModal(null);
    setCancelReason('');
    setNotification('⚠️ Appointment cancelled and slot released back to inventory.');
    setTimeout(() => setNotification(''), 4000);
  };

  // Walk-in Slot Booking Submit
  const handleWalkinBookingSubmit = (e) => {
    e.preventDefault();
    if (!selectedSlotForBooking) return;

    const newApt = {
      id: `apt-${Date.now().toString().slice(-4)}`,
      slotTime: selectedSlotForBooking.time,
      date: 'Today, Oct 17',
      patientName: walkinForm.patientName.trim(),
      gender: walkinForm.gender,
      age: parseInt(walkinForm.age, 10) || 30,
      phoneNumber: walkinForm.phoneNumber.trim(),
      cardNumber: `CLN-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      nationalId: `ET-FAYDA-${Math.floor(10000 + Math.random() * 90000)}`,
      doctorId: selectedSlotForBooking.doctorId,
      doctorName: selectedSlotForBooking.doctorName,
      specialty: selectedSlotForBooking.specialty,
      chiefComplaint: walkinForm.chiefComplaint.trim() || 'Walk-in clinical consultation request.',
      status: 'checked_in', // walk-ins are physically present, so checked in immediately
      feePaid: walkinForm.feeAmount,
      paymentMethod: walkinForm.paymentMethod,
      bookedAt: 'Just Now (Walk-in Desk)',
      checkedInAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setQueue(prev => [newApt, ...prev]);
    setAvailableSlots(prev => prev.filter(s => s.id !== selectedSlotForBooking.id));

    setShowWalkinModal(false);
    setSelectedSlotForBooking(null);
    setWalkinForm({
      patientName: '',
      phoneNumber: '+251 9',
      gender: 'female',
      age: '28',
      chiefComplaint: '',
      paymentMethod: 'Cash',
      feeAmount: 500
    });

    setNotification(`🎉 Walk-in patient ${newApt.patientName} booked with ${newApt.doctorName} for ${newApt.slotTime}!`);
    setTimeout(() => setNotification(''), 5000);
  };

  // Filter queue
  const filteredQueue = queue.filter(item => {
    const matchesQuery = !searchQuery ||
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phoneNumber.includes(searchQuery) ||
      item.cardNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.doctorName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesDoctor = selectedDoctorFilter === 'all' || item.doctorId === selectedDoctorFilter;

    return matchesQuery && matchesStatus && matchesDoctor;
  });

  if (!mounted) {
    return (
      <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
          <div className="spinner" style={{ borderColor: '#059669', borderTopColor: 'transparent' }} />
          Loading Front Desk Portal...
        </div>
      </div>
    );
  }

  const staffName = user?.name || 'Front Desk Receptionist';
  const staffId = (user?._id || user?.id || '000000').slice(-6).toUpperCase();

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', minHeight: '94vh', padding: '28px 0 60px' }}>
      <div className="container">

        {/* ── RECEPTION DESK HERO BANNER ──────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          color: 'white',
          marginBottom: '26px',
          boxShadow: '0 10px 25px -5px rgba(6, 95, 70, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            right: '-30px',
            top: '-30px',
            width: '200px',
            height: '200px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            {clinicLogo && (
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  background: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                  flexShrink: 0
                }}
              >
                <img
                  src={clinicLogo}
                  alt={clinicName}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }}
                />
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ecfdf5',
                  padding: '3px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <ClipboardList size={13} /> {clinicName} • FRONT DESK
                </span>

                <span style={{
                  background: '#d1fae5',
                  color: '#065f46',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.74rem',
                  fontWeight: 800
                }}>
                  ETH-REC-{staffId}
                </span>
              </div>

              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                Welcome back, {staffName}
              </h1>
              <p style={{ margin: '6px 0 0', color: '#a7f3d0', fontSize: '0.9rem' }}>
                Patient reception, queue triage, and live physician slot booking at {clinicName}.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '10px 16px',
              borderRadius: '14px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#a7f3d0', textTransform: 'uppercase', fontWeight: 700 }}>
                Clinic Operating Status
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                Open (Addis Ababa)
              </div>
            </div>

            <button
              onClick={() => {
                if (availableSlots.length > 0) {
                  setSelectedSlotForBooking(availableSlots[0]);
                  setShowWalkinModal(true);
                } else {
                  setActiveTab('slots');
                }
              }}
              className="btn btn-primary"
              style={{
                background: '#ffffff',
                color: '#065f46',
                fontWeight: 800,
                border: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '12px'
              }}
            >
              <Plus size={18} /> Book Walk-in Patient
            </button>
          </div>
        </div>

        {/* ── NOTIFICATION ALERT ───────────────────────────────────────── */}
        {notification && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '12px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle2 size={18} />
            <span>{notification}</span>
          </div>
        )}

        {/* ── TABS NAVIGATION BAR ─────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '24px',
          gap: '8px',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => handleTabChange('queue')}
            style={{
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'queue' ? '#059669' : 'var(--text-muted)',
              borderBottom: activeTab === 'queue' ? '3px solid #059669' : '3px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <Users size={18} /> Today's Patient Queue ({queue.length})
            <span style={{
              background: '#ecfdf5',
              color: '#065f46',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {queue.filter(q => q.status === 'checked_in').length} In Waiting Room
            </span>
          </button>

          <button
            onClick={() => handleTabChange('slots')}
            style={{
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'slots' ? '#059669' : 'var(--text-muted)',
              borderBottom: activeTab === 'slots' ? '3px solid #059669' : '3px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <Clock size={18} /> Doctor Schedules & Available Slots ({availableSlots.length})
          </button>

          <button
            onClick={() => handleTabChange('patients')}
            style={{
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'patients' ? '#059669' : 'var(--text-muted)',
              borderBottom: activeTab === 'patients' ? '3px solid #059669' : '3px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <FileText size={18} /> Patient Cards & Registry Lookup
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: PATIENT INTAKE QUEUE                                    */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'queue' && (
          <div>
            {/* Search and Filters Toolbar */}
            <div className="glass-panel" style={{ padding: '18px 24px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 320px' }}>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '36px', height: '42px', borderRadius: '10px' }}
                      placeholder="Search patient, phone, or card number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-control"
                    style={{ height: '42px', borderRadius: '10px', width: '220px' }}
                    value={selectedDoctorFilter}
                    onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                  >
                    <option value="all">All Attending Doctors</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                    ))}
                  </select>
                </div>

                {/* Status Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'All Patients' },
                    { id: 'scheduled', label: 'Scheduled' },
                    { id: 'checked_in', label: 'Checked In / Waiting' },
                    { id: 'in_consultation', label: 'In Consultation' },
                    { id: 'completed', label: 'Treated' },
                    { id: 'cancelled', label: 'Cancelled' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: statusFilter === tab.id ? '#059669' : '#f1f5f9',
                        color: statusFilter === tab.id ? '#ffffff' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Queue Table */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '14px 20px' }}>Slot Time</th>
                      <th style={{ padding: '14px 20px' }}>Patient & Card Number</th>
                      <th style={{ padding: '14px 20px' }}>Assigned Physician</th>
                      <th style={{ padding: '14px 20px' }}>Status</th>
                      <th style={{ padding: '14px 20px' }}>Fee Status</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Front Desk Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No patients matching your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredQueue.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                          <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text-main)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={15} style={{ color: '#059669' }} />
                              <span>{item.slotTime}</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              {item.date}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.94rem' }}>
                              {item.patientName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
                              <span>{item.gender === 'male' ? 'M' : 'F'}, {item.age}y</span>
                              <span>•</span>
                              <span style={{ fontFamily: 'monospace' }}>{item.cardNumber}</span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Phone size={12} /> {item.phoneNumber}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              {item.doctorName}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                              {item.specialty}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: item.status === 'checked_in' ? '#d1fae5' :
                                item.status === 'in_consultation' ? '#e0e7ff' :
                                item.status === 'completed' ? '#f1f5f9' :
                                item.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                              color: item.status === 'checked_in' ? '#065f46' :
                                item.status === 'in_consultation' ? '#3730a3' :
                                item.status === 'completed' ? '#475569' :
                                item.status === 'cancelled' ? '#991b1b' : '#92400e'
                            }}>
                              {item.status === 'checked_in' && <CheckCircle2 size={12} />}
                              {item.status === 'in_consultation' && <Activity size={12} />}
                              {item.status === 'scheduled' && <Clock size={12} />}
                              {item.status === 'completed' && <Check size={12} />}
                              {item.status === 'cancelled' && <Ban size={12} />}
                              {item.status.replace('_', ' ')}
                            </span>
                            {item.checkedInAt && (
                              <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '3px' }}>
                                Arrived at {item.checkedInAt}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 800, color: '#15803d' }}>
                              {item.feePaid} ETB
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {item.paymentMethod}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              {item.status === 'scheduled' && (
                                <button
                                  onClick={() => handleCheckInPatient(item.id)}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#059669',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    borderRadius: '8px'
                                  }}
                                >
                                  <UserCheck size={14} /> Check In
                                </button>
                              )}

                              <button
                                onClick={() => setShowPatientDetailModal(item)}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  fontSize: '0.78rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  borderRadius: '8px'
                                }}
                              >
                                <Eye size={14} /> View
                              </button>

                              {item.status !== 'completed' && item.status !== 'cancelled' && (
                                <button
                                  onClick={() => setShowCancelModal(item)}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    border: '1px solid #fecaca',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    borderRadius: '8px'
                                  }}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: DOCTOR SCHEDULES & AVAILABLE SLOTS                      */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'slots' && (
          <div>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Live Doctor Consultation Schedules & Open Slots
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    Physician shifts on duty today. Click any open slot to instantly book an in-person walk-in patient.
                  </p>
                </div>

                <button
                  onClick={fetchDoctorRoster}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} className={loadingDoctors ? 'animate-spin' : ''} /> Refresh Roster
                </button>
              </div>
            </div>

            {/* Doctors Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              {doctors.map(doc => {
                const docSlots = availableSlots.filter(s => s.doctorId === doc.id);
                return (
                  <div key={doc.id} className="glass-panel" style={{ padding: '22px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: '#ecfdf5',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Stethoscope size={22} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                            {doc.name}
                          </h3>
                          <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                            {doc.specialty}
                          </span>
                        </div>
                      </div>

                      <span style={{
                        background: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        {docSlots.length} Open Slots
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} /> Shift: {doc.shift}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} /> Consultation Room: {doc.room}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={13} /> Physician Contact: {doc.phone}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                        Available Booking Slots Today:
                      </div>

                      {docSlots.length === 0 ? (
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                          Fully booked for today.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {docSlots.map(slot => (
                            <button
                              key={slot.id}
                              onClick={() => {
                                setSelectedSlotForBooking(slot);
                                setShowWalkinModal(true);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#166534',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Clock size={12} /> {slot.time}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: PATIENT REGISTRY & CARD LOOKUP                         */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'patients' && (
          <div>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '22px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main)' }}>
                Patient Medical Cards & Registry Lookup (የታካሚዎች መረጃ ፍለጋ)
              </h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                Look up registered patients by Ethiopian phone number, medical card ID, or name.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
              {queue.map(p => (
                <div key={p.id} className="glass-panel" style={{ padding: '20px', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {p.patientName}
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {p.cardNumber}
                      </span>
                    </div>
                    <span style={{
                      background: '#f1f5f9',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#475569'
                    }}>
                      Fayda: {p.nationalId}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    <div>Gender: {p.gender === 'male' ? 'Male' : 'Female'} • Age: {p.age} Years</div>
                    <div style={{ color: '#059669', fontWeight: 600 }}>Phone: {p.phoneNumber}</div>
                    <div>Assigned Physician: {p.doctorName}</div>
                  </div>

                  <button
                    onClick={() => setShowPatientDetailModal(p)}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Eye size={14} /> View Full Patient File
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: WALK-IN PATIENT BOOKING                                 */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showWalkinModal && selectedSlotForBooking && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '30px', background: 'white', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Book Walk-in Patient
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                    {selectedSlotForBooking.doctorName} • {selectedSlotForBooking.time}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowWalkinModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleWalkinBookingSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Dawit Abebe"
                  value={walkinForm.patientName}
                  onChange={(e) => setWalkinForm({ ...walkinForm, patientName: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="+251 91 123 4567"
                    value={walkinForm.phoneNumber}
                    onChange={(e) => setWalkinForm({ ...walkinForm, phoneNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender & Age</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      className="form-control"
                      value={walkinForm.gender}
                      onChange={(e) => setWalkinForm({ ...walkinForm, gender: e.target.value })}
                      style={{ width: '60%' }}
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Age"
                      value={walkinForm.age}
                      onChange={(e) => setWalkinForm({ ...walkinForm, age: e.target.value })}
                      style={{ width: '40%' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Chief Complaint / Symptoms *</label>
                <textarea
                  rows={2}
                  required
                  className="form-control"
                  placeholder="Brief reason for consultation..."
                  value={walkinForm.chiefComplaint}
                  onChange={(e) => setWalkinForm({ ...walkinForm, chiefComplaint: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '22px' }}>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-control"
                    value={walkinForm.paymentMethod}
                    onChange={(e) => setWalkinForm({ ...walkinForm, paymentMethod: e.target.value })}
                  >
                    <option value="Cash">Cash (በጥሬ ገንዘብ)</option>
                    <option value="Telebirr">Telebirr (ቴሌብር)</option>
                    <option value="CBE Birr">CBE Birr (ሲቢኢ ብር)</option>
                    <option value="Insurance">Insurance / Free</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Fee (ETB)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={walkinForm.feeAmount}
                    onChange={(e) => setWalkinForm({ ...walkinForm, feeAmount: parseInt(e.target.value, 10) || 500 })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowWalkinModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    flex: 2,
                    background: '#059669',
                    border: 'none',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <CheckCircle2 size={16} /> Confirm & Check In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: PATIENT FILE DETAILS DRAWER                             */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showPatientDetailModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'white', borderRadius: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Patient Intake Record
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                  {showPatientDetailModal.cardNumber}
                </span>
              </div>
              <button
                onClick={() => setShowPatientDetailModal(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Patient Name:</span>
                <strong>{showPatientDetailModal.patientName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gender & Age:</span>
                <span>{showPatientDetailModal.gender === 'male' ? 'Male' : 'Female'}, {showPatientDetailModal.age}y</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ethiopian National ID (Fayda):</span>
                <span>{showPatientDetailModal.nationalId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Contact Phone:</span>
                <span>{showPatientDetailModal.phoneNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Physician:</span>
                <strong>{showPatientDetailModal.doctorName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Appointment Time:</span>
                <span>{showPatientDetailModal.slotTime} ({showPatientDetailModal.date})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Consultation Fee:</span>
                <span style={{ color: '#15803d', fontWeight: 700 }}>{showPatientDetailModal.feePaid} ETB ({showPatientDetailModal.paymentMethod})</span>
              </div>
              <div style={{ marginTop: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>Chief Complaint:</span>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginTop: '4px', fontSize: '0.85rem' }}>
                  {showPatientDetailModal.chiefComplaint}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPatientDetailModal(null)}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '20px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CANCEL APPOINTMENT                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showCancelModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '26px', background: 'white', borderRadius: '18px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px', color: '#b91c1c' }}>
              Cancel Appointment
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '16px' }}>
              Are you sure you want to cancel the booking for <strong>{showCancelModal.patientName}</strong> with {showCancelModal.doctorName}?
            </p>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Cancellation Reason</label>
              <textarea
                rows={2}
                className="form-control"
                placeholder="e.g. Patient called to reschedule, walk-out"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowCancelModal(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Go Back
              </button>
              <button
                onClick={handleCancelAppointment}
                className="btn btn-sm"
                style={{
                  flex: 1,
                  background: '#dc2626',
                  color: 'white',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '10px'
                }}
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ReceptionDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Front Desk Terminal...</div>}>
      <ReceptionDashboardContent />
    </Suspense>
  );
}

