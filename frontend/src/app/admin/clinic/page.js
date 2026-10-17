'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { clinicApi } from '@/lib/api';
import {
  Building2,
  CalendarOff,
  CalendarDays,
  Clock,
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Calendar,
  Sparkles,
  ArrowLeft,
  Check,
  AlertTriangle,
  Stethoscope,
  Activity,
  Layers,
  Settings,
  Sun,
  Moon,
  Edit2,
  Globe,
  ExternalLink,
  Navigation,
  Users,
  CheckCircle,
  FileText,
  Building,
  Award,
  Info
} from 'lucide-react';

const formatDateSafe = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return String(dateVal);
  }
};

const formatDateTimeSafe = (dateVal) => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(dateVal);
  }
};

const calculateDays = (start, end) => {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  } catch {
    return 1;
  }
};

export default function AdminClinicManagementPage() {
  const { user, mounted } = useAuth();
  const router = useRouter();

  // Navigation tab: 'profile' | 'leaves' | 'holidays' | 'maintenance'
  const [activeTab, setActiveTab] = useState('profile');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  // 1. Doctor Leaves State
  const [leaves, setLeaves] = useState([]);
  const [leaveFilter, setLeaveFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [leaveSearch, setLeaveSearch] = useState('');
  const [reviewModal, setReviewModal] = useState(null); // { doctorId, leaveId, status, doctorDetails, leaveDetails }
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // 2. Holidays & Closures State
  const [holidays, setHolidays] = useState([]);
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayIsClosed, setNewHolidayIsClosed] = useState(true);
  const [newHolidayDesc, setNewHolidayDesc] = useState('');
  const [submittingHoliday, setSubmittingHoliday] = useState(false);
  const [seedingHolidays, setSeedingHolidays] = useState(false);

  // 3. Clinic Profile & Working Hours State
  const [clinicProfile, setClinicProfile] = useState({
    _id: '',
    name: 'Selam General Clinic',
    description: 'Premier outpatient clinic providing compassionate, high quality medical care.',
    phoneNumber: '+251911000000',
    email: 'reception@selamclinic.et',
    website: 'https://selamclinic.et',
    location: {
      city: 'Addis Ababa',
      subCity: 'Bole',
      woreda: '03',
      fullAddress: 'Bole Medhanialem, Edna Mall Area',
      coordinates: {
        latitude: 9.005401,
        longitude: 38.78426
      }
    },
    workingHours: {
      openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      openTime: '08:00',
      closeTime: '17:00',
      isOpenSaturday: true,
      isOpenSunday: false
    },
    services: ['General Checkup', 'Dental', 'Laboratory', 'Pediatrics'],
    media: {
      logo: '',
      coverImage: ''
    },
    createdAt: null,
    updatedAt: null
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editClinicForm, setEditClinicForm] = useState(null);
  const [newServiceInput, setNewServiceInput] = useState('');
  const [doctorsCount, setDoctorsCount] = useState(0);

  // 4. Runtime Status & Maintenance
  const [runtimeStatus, setRuntimeStatus] = useState(null);
  const [cleaningSlots, setCleaningSlots] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);

  // Initial Data Fetch
  const loadAllData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorNotice('');

    try {
      // Parallel fetch of clinic profile, status, holidays, leaves, and doctors roster
      const [statusRes, profileRes, holidaysRes, leavesRes, doctorsRes] = await Promise.allSettled([
        clinicApi.get('/status'),
        clinicApi.get('/'),
        clinicApi.get('/holidays'),
        clinicApi.get('/admin/doctor-leaves'),
        clinicApi.get('/getAllDoctors?all=true')
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value.data?.success) {
        setRuntimeStatus(statusRes.value.data);
      }
      if (profileRes.status === 'fulfilled' && profileRes.value.data?.data) {
        const p = profileRes.value.data.data;
        const openDays = Array.isArray(p.workingHours?.openDays) && p.workingHours.openDays.length > 0
          ? p.workingHours.openDays
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const loadedProfile = {
          _id: p._id || '',
          name: p.name || 'Selam General Clinic',
          description: p.description !== undefined ? p.description : 'Premier outpatient clinic providing compassionate, high quality medical care.',
          phoneNumber: p.phoneNumber || '+251911000000',
          email: p.email || 'reception@selamclinic.et',
          website: p.website || 'https://selamclinic.et',
          location: {
            city: p.location?.city || 'Addis Ababa',
            subCity: p.location?.subCity || 'Bole',
            woreda: p.location?.woreda || '03',
            fullAddress: p.location?.fullAddress || 'Bole Medhanialem, Edna Mall Area',
            coordinates: {
              latitude: p.location?.coordinates?.latitude ?? 9.005401,
              longitude: p.location?.coordinates?.longitude ?? 38.78426
            }
          },
          workingHours: {
            openDays,
            openTime: p.workingHours?.openTime || '08:00',
            closeTime: p.workingHours?.closeTime || '17:00',
            isOpenSaturday: p.workingHours?.isOpenSaturday ?? (openDays.some(d => d.toLowerCase() === 'saturday')),
            isOpenSunday: p.workingHours?.isOpenSunday ?? (openDays.some(d => d.toLowerCase() === 'sunday'))
          },
          services: Array.isArray(p.services) && p.services.length > 0
            ? p.services
            : ['General Checkup', 'Dental', 'Laboratory', 'Pediatrics'],
          media: {
            logo: p.media?.logo || '',
            coverImage: p.media?.coverImage || ''
          },
          createdAt: p.createdAt || null,
          updatedAt: p.updatedAt || null
        };

        setClinicProfile(loadedProfile);
        setEditClinicForm(JSON.parse(JSON.stringify(loadedProfile)));
      }
      if (holidaysRes.status === 'fulfilled' && holidaysRes.value.data?.success) {
        setHolidays(holidaysRes.value.data.data || []);
      }
      if (leavesRes.status === 'fulfilled' && leavesRes.value.data?.success) {
        setLeaves(leavesRes.value.data.data || []);
      }
      if (doctorsRes.status === 'fulfilled' && doctorsRes.value.data?.success) {
        const count = doctorsRes.value.data.count ?? (Array.isArray(doctorsRes.value.data.data) ? doctorsRes.value.data.data.length : 0);
        setDoctorsCount(count);
      }
    } catch (err) {
      console.error('Error loading clinic admin data:', err);
      setErrorNotice('Could not synchronize all clinic records. Please check service connectivity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadAllData();
    }
  }, [mounted]);

  // Auth Guard: Admin only
  useEffect(() => {
    if (mounted && user && user.role !== 'admin') {
      if (user.role === 'receptionist') {
        router.push('/reception/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [mounted, user, router]);


  // ── 1. LEAVE APPROVAL / REJECTION HANDLER ────────────────────────
  const handleReviewLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModal) return;
    const { doctorId, leaveId, status } = reviewModal;
    setSubmittingReview(true);

    try {
      const res = await clinicApi.patch(`/admin/doctor-leaves/${doctorId}/${leaveId}`, {
        status,
        adminNotes: adminNotes.trim() || (status === 'approved' ? 'Approved by administration' : 'Rejected by administration')
      });

      if (res.data?.success) {
        const removed = res.data.data?.unbookedSlotsRemoved || 0;
        const notice = res.data.data?.bookedAppointmentsNotice || '';
        const msg = status === 'approved'
          ? `🎉 Leave request approved! Automatically removed ${removed} unbooked slot(s). ${notice}`
          : `❌ Leave request rejected.`;
        setNotification(msg);
        setReviewModal(null);
        setAdminNotes('');
        loadAllData(true);
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit leave decision.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── 2. HOLIDAY MANAGEMENT HANDLERS ──────────────────────────────
  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) {
      alert('Please provide holiday name and date.');
      return;
    }
    setSubmittingHoliday(true);
    try {
      const res = await clinicApi.post('/holidays', {
        name: newHolidayName.trim(),
        date: newHolidayDate,
        isClosed: newHolidayIsClosed,
        description: newHolidayDesc.trim()
      });
      if (res.data?.success) {
        setNotification(`✅ Added holiday: "${newHolidayName}" (${newHolidayDate})`);
        setShowAddHolidayModal(false);
        setNewHolidayName('');
        setNewHolidayDate('');
        setNewHolidayDesc('');
        loadAllData(true);
        setTimeout(() => setNotification(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create holiday.');
    } finally {
      setSubmittingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (holidayId, name) => {
    if (!confirm(`Are you sure you want to delete holiday "${name}"?`)) return;
    try {
      const res = await clinicApi.delete(`/holidays/${holidayId}`);
      if (res.data?.success) {
        setNotification(`🗑️ Deleted holiday "${name}"`);
        loadAllData(true);
        setTimeout(() => setNotification(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete holiday.');
    }
  };

  const handleSeedEthiopianHolidays = async () => {
    if (!confirm('This will seed official Ethiopian national holidays (Enkutatash, Meskel, Timket, Adwa Victory Day, etc.) into the clinic calendar. Proceed?')) {
      return;
    }
    setSeedingHolidays(true);
    try {
      const res = await clinicApi.post('/holidays/seed-ethiopian');
      if (res.data?.success) {
        setNotification(`✨ Successfully seeded Ethiopian national holidays! (${res.data.count || res.data.data?.length || 0} dates updated)`);
        loadAllData(true);
        setTimeout(() => setNotification(''), 6000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to seed Ethiopian holidays.');
    } finally {
      setSeedingHolidays(false);
    }
  };

  // ── 3. CLINIC PROFILE EDIT & UPDATE HANDLERS ─────────────────────
  const handleStartEditing = () => {
    setEditClinicForm(JSON.parse(JSON.stringify(clinicProfile)));
    setIsEditingProfile(true);
  };

  const handleCancelEditing = () => {
    setEditClinicForm(JSON.parse(JSON.stringify(clinicProfile)));
    setIsEditingProfile(false);
  };

  const handleAddService = (e) => {
    if (e) e.preventDefault();
    const trimmed = newServiceInput.trim();
    if (!trimmed || !editClinicForm) return;
    if (!editClinicForm.services?.includes(trimmed)) {
      setEditClinicForm({
        ...editClinicForm,
        services: [...(editClinicForm.services || []), trimmed]
      });
    }
    setNewServiceInput('');
  };

  const handleRemoveService = (serviceToRemove) => {
    if (!editClinicForm) return;
    setEditClinicForm({
      ...editClinicForm,
      services: (editClinicForm.services || []).filter((s) => s !== serviceToRemove)
    });
  };

  const handleToggleDay = (day) => {
    if (!editClinicForm) return;
    const current = editClinicForm.workingHours?.openDays || [];
    const exists = current.includes(day);
    const updated = exists ? current.filter((d) => d !== day) : [...current, day];
    const isSatOpen = updated.some(d => d.toLowerCase() === 'saturday');
    const isSunOpen = updated.some(d => d.toLowerCase() === 'sunday');
    setEditClinicForm({
      ...editClinicForm,
      workingHours: {
        ...editClinicForm.workingHours,
        openDays: updated,
        isOpenSaturday: isSatOpen,
        isOpenSunday: isSunOpen
      }
    });
  };

  const handleSaveClinicProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    const target = editClinicForm || clinicProfile;
    try {
      const payload = {
        name: target.name,
        description: target.description,
        phoneNumber: target.phoneNumber,
        email: target.email,
        website: target.website,
        city: target.location?.city,
        subCity: target.location?.subCity,
        woreda: target.location?.woreda,
        fullAddress: target.location?.fullAddress,
        latitude: target.location?.coordinates?.latitude,
        longitude: target.location?.coordinates?.longitude,
        openTime: target.workingHours?.openTime,
        closeTime: target.workingHours?.closeTime,
        openDays: target.workingHours?.openDays,
        isOpenSaturday: target.workingHours?.isOpenSaturday,
        isOpenSunday: target.workingHours?.isOpenSunday,
        services: target.services,
        logo: target.media?.logo,
        coverImage: target.media?.coverImage
      };

      const res = await clinicApi.put('/updateClinicProfile', payload);
      if (res.data?.success) {
        setNotification('💾 Clinic operating profile, location & hours successfully saved in database!');
        setIsEditingProfile(false);
        loadAllData(true);
        setTimeout(() => setNotification(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update clinic profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── 4. EXPIRED SLOTS CLEANUP ────────────────────────────────────
  const handleTriggerExpiredCleanup = async () => {
    setCleaningSlots(true);
    setCleanupResult(null);
    try {
      const res = await clinicApi.post('/slots/cleanup-expired');
      if (res.data?.success) {
        const count = res.data.data?.cleanedCount ?? 0;
        setCleanupResult({
          success: true,
          message: `Cleaned up ${count} expired unbooked slot(s) older than the current hour.`
        });
        setNotification(`🧹 Cleaned up ${count} expired slot(s).`);
        setTimeout(() => setNotification(''), 5000);
      }
    } catch (err) {
      setCleanupResult({
        success: false,
        message: err.response?.data?.message || 'Slot cleanup failed'
      });
    } finally {
      setCleaningSlots(false);
    }
  };

  if (!mounted) return null;

  const pendingLeavesCount = leaves.filter((l) => l.status === 'pending').length;
  const filteredLeaves = leaves.filter((l) => {
    const matchesFilter = leaveFilter === 'all' || l.status === leaveFilter;
    const matchesSearch =
      !leaveSearch ||
      l.specialization?.toLowerCase().includes(leaveSearch.toLowerCase()) ||
      l.licenseNumber?.toLowerCase().includes(leaveSearch.toLowerCase()) ||
      l.reason?.toLowerCase().includes(leaveSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '80px' }} suppressHydrationWarning>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* TOP BREADCRUMB & BACK NAVIGATION */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#4f46e5', fontWeight: 600 }}>
              <ArrowLeft size={16} /> Admin Operations
            </Link>
            <span>/</span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Clinic Profile & Facility Management</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => loadAllData(true)}
              disabled={refreshing}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
              {refreshing ? 'Syncing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* HERO HEADER */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
            borderRadius: '24px',
            padding: '36px',
            color: 'white',
            marginBottom: '28px',
            boxShadow: '0 12px 30px rgba(49, 46, 129, 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.15)', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '14px' }}>
                <Building2 size={16} /> Ethiopia Central Clinic Facility Command
              </div>
              <h1 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.3rem)', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
                {clinicProfile.name}
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.98rem', maxWidth: '650px', lineHeight: 1.5 }}>
                Centralized administration for doctor leaves, Ethiopian public holidays, clinic closures, and weekly operating hours.
              </p>
            </div>

            {/* LIVE RUNTIME STATUS CARD */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                padding: '16px 22px',
                minWidth: '240px'
              }}
            >
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, fontWeight: 700, marginBottom: '6px' }}>
                Operational Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 800 }}>
                {runtimeStatus?.isOpen ? (
                  <>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 10px #4ade80' }} />
                    <span style={{ color: '#4ade80' }}>Open & Operating</span>
                  </>
                ) : (
                  <>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fb7185', display: 'inline-block', boxShadow: '0 0 10px #fb7185' }} />
                    <span style={{ color: '#fb7185' }}>Closed</span>
                  </>
                )}
              </div>
              {runtimeStatus?.isHoliday && (
                <div style={{ fontSize: '0.8rem', color: '#fef08a', marginTop: '6px', fontWeight: 600 }}>
                  🏖️ {runtimeStatus.holidayName || 'Holiday Closure'}
                </div>
              )}
              <div style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: '6px' }}>
                Addis Ababa Time: {runtimeStatus?.localTime || 'Active'} ({runtimeStatus?.localDay || ''})
              </div>
            </div>
          </div>
        </div>

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#047857',
              padding: '14px 20px',
              borderRadius: '14px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontWeight: 600,
              fontSize: '0.94rem',
              boxShadow: '0 4px 14px rgba(4, 120, 87, 0.1)'
            }}
          >
            <CheckCircle2 size={20} />
            <span>{notification}</span>
          </div>
        )}

        {/* ERROR NOTICE */}
        {errorNotice && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '14px 20px',
              borderRadius: '14px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontWeight: 600
            }}
          >
            <AlertCircle size={20} />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* PENDING LEAVES BANNER (IF ANY) */}
        {pendingLeavesCount > 0 && activeTab !== 'leaves' && (
          <div
            style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '14px 20px',
              borderRadius: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#f59e0b', color: 'white', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {pendingLeavesCount}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.96rem' }}>Action Required: {pendingLeavesCount} Doctor Leave Request(s)</div>
                <div style={{ fontSize: '0.85rem', color: '#b45309' }}>Physicians are awaiting administrative approval for upcoming leaves.</div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('leaves')}
              className="btn btn-sm"
              style={{ background: '#b45309', color: 'white', fontWeight: 700, borderRadius: '8px' }}
            >
              Review Requests Now
            </button>
          </div>
        )}

        {/* ── MAIN NAVIGATION TABS ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '28px',
            gap: '8px',
            overflowX: 'auto'
          }}
        >
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '14px 22px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'profile' ? '#4f46e5' : 'var(--text-muted)',
              borderBottom: activeTab === 'profile' ? '3px solid #4f46e5' : '3px solid transparent',
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
            <Building2 size={18} />
            <span>Clinic Profile & Details</span>
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            style={{
              padding: '14px 22px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'leaves' ? '#4f46e5' : 'var(--text-muted)',
              borderBottom: activeTab === 'leaves' ? '3px solid #4f46e5' : '3px solid transparent',
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
            <CalendarOff size={18} />
            <span>Doctor Leaves & Absences</span>
            {pendingLeavesCount > 0 && (
              <span style={{ background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 900 }}>
                {pendingLeavesCount} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('holidays')}
            style={{
              padding: '14px 22px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'holidays' ? '#4f46e5' : 'var(--text-muted)',
              borderBottom: activeTab === 'holidays' ? '3px solid #4f46e5' : '3px solid transparent',
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
            <CalendarDays size={18} />
            <span>Holidays & Closures</span>
            <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 800 }}>
              {holidays.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            style={{
              padding: '14px 22px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'maintenance' ? '#4f46e5' : 'var(--text-muted)',
              borderBottom: activeTab === 'maintenance' ? '3px solid #4f46e5' : '3px solid transparent',
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
            <Clock size={18} />
            <span>Slot Generator & Engine</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 1: DOCTOR LEAVE REQUESTS                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'leaves' && (
          <div>
            {/* Action Bar & Filters */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'pending', label: `Pending Review (${leaves.filter((l) => l.status === 'pending').length})` },
                  { id: 'all', label: `All Requests (${leaves.length})` },
                  { id: 'approved', label: `Approved (${leaves.filter((l) => l.status === 'approved').length})` },
                  { id: 'rejected', label: `Rejected (${leaves.filter((l) => l.status === 'rejected').length})` }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setLeaveFilter(f.id)}
                    className="btn btn-sm"
                    style={{
                      background: leaveFilter === f.id ? '#4f46e5' : '#ffffff',
                      color: leaveFilter === f.id ? 'white' : 'var(--text-main)',
                      border: '1px solid ' + (leaveFilter === f.id ? '#4f46e5' : 'var(--border-subtle)'),
                      fontWeight: 700,
                      borderRadius: '10px'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search by specialization, reason, license..."
                value={leaveSearch}
                onChange={(e) => setLeaveSearch(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'white',
                  fontSize: '0.88rem',
                  minWidth: '280px'
                }}
              />
            </div>

            {/* Leave List */}
            {filteredLeaves.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <CalendarOff size={44} style={{ color: '#94a3b8', margin: '0 auto 14px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px 0' }}>No Leave Requests Found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
                  {leaveFilter === 'pending'
                    ? 'Great news! There are no pending doctor leave requests awaiting your decision.'
                    : 'No requests matched the current search or filter criteria.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {filteredLeaves.map((l) => {
                  const days = calculateDays(l.startDate, l.endDate);
                  const isPending = l.status === 'pending';
                  const isApproved = l.status === 'approved';

                  return (
                    <div
                      key={l.leaveId}
                      className="glass-panel"
                      style={{
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderLeft: isPending
                          ? '5px solid #f59e0b'
                          : isApproved
                          ? '5px solid #10b981'
                          : '5px solid #ef4444'
                      }}
                    >
                      <div>
                        {/* Header: Status & Duration Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              background: isPending ? '#fef3c7' : isApproved ? '#dcfce7' : '#fee2e2',
                              color: isPending ? '#b45309' : isApproved ? '#15803d' : '#b91c1c',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            {isPending && <AlertTriangle size={12} />}
                            {isApproved && <CheckCircle2 size={12} />}
                            {!isPending && !isApproved && <X size={12} />}
                            {l.status}
                          </span>

                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                            {days} Day{days > 1 ? 's' : ''} Leave
                          </span>
                        </div>

                        {/* Doctor Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Stethoscope size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                              {l.specialization || 'Physician'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              License: {l.licenseNumber || 'Verified Doctor'}
                            </div>
                          </div>
                        </div>

                        {/* Dates */}
                        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', marginBottom: '14px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Requested Leave Period</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                            <Calendar size={15} style={{ color: '#4f46e5' }} />
                            <span>{formatDateSafe(l.startDate)}</span>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                            <span>{formatDateSafe(l.endDate)}</span>
                          </div>
                        </div>

                        {/* Reason */}
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Doctor's Reason:</div>
                          <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.4, fontStyle: 'italic', background: '#fafafa', padding: '8px 12px', borderRadius: '8px' }}>
                            "{l.reason || 'Personal / Medical leave'}"
                          </div>
                        </div>

                        {/* Admin Review Notes (if already reviewed) */}
                        {l.adminNotes && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                            <strong style={{ color: 'var(--text-main)' }}>Admin Notes:</strong> {l.adminNotes}
                          </div>
                        )}
                      </div>

                      {/* Action Decision Buttons */}
                      {isPending ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                          <button
                            onClick={() => {
                              setReviewModal({
                                doctorId: l.doctorId,
                                leaveId: l.leaveId,
                                status: 'approved',
                                doctorDetails: l
                              });
                              setAdminNotes('');
                            }}
                            className="btn btn-sm"
                            style={{
                              background: '#10b981',
                              color: 'white',
                              fontWeight: 700,
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <ThumbsUp size={14} /> Approve
                          </button>

                          <button
                            onClick={() => {
                              setReviewModal({
                                doctorId: l.doctorId,
                                leaveId: l.leaveId,
                                status: 'rejected',
                                doctorDetails: l
                              });
                              setAdminNotes('');
                            }}
                            className="btn btn-sm"
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              fontWeight: 700,
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <ThumbsDown size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '10px' }}>
                          Submitted: {formatDateSafe(l.createdAt)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 2: HOLIDAYS & CLINIC CLOSURES                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'holidays' && (
          <div>
            {/* Top Info Notice */}
            <div
              style={{
                background: '#e0e7ff',
                border: '1px solid #c7d2fe',
                color: '#3730a3',
                padding: '16px 20px',
                borderRadius: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <CalendarDays size={24} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                <strong>Automated Slot Protection:</strong> Dates configured here with <em>Clinic Closed = True</em> are automatically excluded by the slot generation cron. No appointment slots will be opened for any doctor on official holiday dates.
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                Configured Holidays & Closures ({holidays.length})
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleSeedEthiopianHolidays}
                  disabled={seedingHolidays}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Sparkles size={14} className={seedingHolidays ? 'spin-icon' : ''} />
                  {seedingHolidays ? 'Seeding...' : 'Seed Ethiopian Holidays'}
                </button>

                <button
                  onClick={() => setShowAddHolidayModal(true)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Plus size={15} /> Add Closure / Holiday
                </button>
              </div>
            </div>

            {/* Holidays Grid */}
            {holidays.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <CalendarDays size={44} style={{ color: '#94a3b8', margin: '0 auto 14px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px 0' }}>No Holidays Configured</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '18px' }}>
                  Click below to automatically seed standard Ethiopian national holidays into the clinic schedule.
                </p>
                <button onClick={handleSeedEthiopianHolidays} className="btn btn-primary btn-sm">
                  <Sparkles size={15} /> Seed Ethiopian National Holidays Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                {holidays.map((h) => (
                  <div
                    key={h._id}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: h.isClosed ? '4px solid #ef4444' : '4px solid #3b82f6'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            background: h.isClosed ? '#fee2e2' : '#dbeafe',
                            color: h.isClosed ? '#b91c1c' : '#1d4ed8'
                          }}
                        >
                          {h.isClosed ? '🚫 Clinic Closed' : 'ℹ️ Observance / Open'}
                        </span>

                        <button
                          onClick={() => handleDeleteHoliday(h._id, h.name)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                          title="Delete Holiday"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {h.name}
                      </h4>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, color: '#4f46e5', marginBottom: '8px' }}>
                        <Calendar size={14} />
                        <span>{formatDateSafe(h.date)}</span>
                      </div>

                      {h.description && (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {h.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 1: CLINIC PROFILE & COMPREHENSIVE FACILITY DETAILS        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div>
            {!isEditingProfile ? (
              /* ── VIEW MODE: DETAILED CLINIC PROFILE PRESENTATION ── */
              <div>
                {/* 1. CLINIC COVER & BRAND IDENTITY HERO CARD */}
                <div
                  className="glass-panel"
                  style={{
                    borderRadius: '24px',
                    overflow: 'hidden',
                    marginBottom: '28px',
                    background: 'white',
                    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.07)'
                  }}
                >
                  {/* Cover Photo Banner */}
                  <div
                    style={{
                      height: '240px',
                      width: '100%',
                      position: 'relative',
                      backgroundImage: clinicProfile.media?.coverImage
                        ? `linear-gradient(to bottom, rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.85)), url("${clinicProfile.media.coverImage}")`
                        : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '24px 32px'
                    }}
                  >
                    {/* Live Operating Status Badge (Top Right) */}
                    <div style={{ position: 'absolute', top: '20px', right: '24px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          borderRadius: '9999px',
                          padding: '7px 16px',
                          color: 'white',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        {runtimeStatus?.isOpen ? (
                          <>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80', display: 'inline-block' }} />
                            <span>Open Today ({clinicProfile.workingHours.openTime} - {clinicProfile.workingHours.closeTime})</span>
                          </>
                        ) : (
                          <>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fb7185', boxShadow: '0 0 10px #fb7185', display: 'inline-block' }} />
                            <span>Clinic Closed Today</span>
                          </>
                        )}
                      </div>
                      {runtimeStatus?.isHoliday && (
                        <div
                          style={{
                            background: 'rgba(217, 119, 6, 0.9)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '9999px',
                            padding: '7px 14px',
                            color: 'white',
                            fontSize: '0.82rem',
                            fontWeight: 700
                          }}
                        >
                          🏖️ {runtimeStatus.holidayName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Header Details Bar */}
                  <div style={{ padding: '0 32px 30px', position: 'relative' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        flexWrap: 'wrap',
                        gap: '20px',
                        marginTop: '-55px',
                        marginBottom: '20px'
                      }}
                    >
                      {/* Logo and Name */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            width: '110px',
                            height: '110px',
                            borderRadius: '24px',
                            background: 'white',
                            border: '4px solid white',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            zIndex: 2
                          }}
                        >
                          {clinicProfile.media?.logo ? (
                            <img
                              src={clinicProfile.media.logo}
                              alt={clinicProfile.name}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                              <Building2 size={48} />
                            </div>
                          )}
                        </div>

                        <div style={{ paddingBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.5px' }}>
                              {clinicProfile.name}
                            </h2>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0',
                                padding: '4px 12px',
                                borderRadius: '9999px',
                                fontSize: '0.78rem',
                                fontWeight: 800
                              }}
                            >
                              <CheckCircle2 size={14} /> MOH Ethiopia Certified Facility
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <MapPin size={15} style={{ color: '#4f46e5' }} />
                              {clinicProfile.location.city}, {clinicProfile.location.subCity} • Woreda {clinicProfile.location.woreda}
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Clock size={15} style={{ color: '#059669' }} />
                              Standard Shift: {clinicProfile.workingHours.openTime} - {clinicProfile.workingHours.closeTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={handleStartEditing}
                          className="btn btn-primary"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px', fontWeight: 800, borderRadius: '12px' }}
                        >
                          <Edit2 size={16} /> Edit Clinic Details
                        </button>
                        <button
                          onClick={() => loadAllData(true)}
                          disabled={refreshing}
                          className="btn btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 18px', borderRadius: '12px' }}
                        >
                          <RefreshCw size={15} className={refreshing ? 'spin-icon' : ''} />
                          <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Facility Description / Bio */}
                    {clinicProfile.description && (
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '16px',
                          padding: '18px 24px',
                          color: '#334155',
                          fontSize: '0.96rem',
                          lineHeight: 1.6,
                          marginTop: '8px'
                        }}
                      >
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Info size={14} style={{ color: '#4f46e5' }} /> Facility Profile & Clinical Mission
                        </div>
                        {clinicProfile.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. HIGH-LEVEL OPERATIONAL METRICS BAR */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                  {/* Metric 1: Real-time Runtime Status */}
                  <div className="glass-panel" style={{ padding: '20px 24px', background: 'white', borderRadius: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operating Status</span>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: runtimeStatus?.isOpen ? '#ecfdf5' : '#fef2f2', color: runtimeStatus?.isOpen ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={18} />
                      </div>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: runtimeStatus?.isOpen ? '#059669' : '#dc2626' }}>
                      {runtimeStatus?.isOpen ? 'Open & Active' : 'Closed'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Addis Ababa Time: <strong>{runtimeStatus?.localTime || 'Active'} ({runtimeStatus?.localDay || ''})</strong>
                    </div>
                  </div>

                  {/* Metric 2: Registered Physicians */}
                  <div className="glass-panel" style={{ padding: '20px 24px', background: 'white', borderRadius: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clinical Staff</span>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={18} />
                      </div>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e1b4b' }}>
                      {doctorsCount} Active Physician{doctorsCount !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Licensed medical practitioners on roster
                    </div>
                  </div>

                  {/* Metric 3: National Holidays & Closures */}
                  <div className="glass-panel" style={{ padding: '20px 24px', background: 'white', borderRadius: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Facility Closures</span>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CalendarDays size={18} />
                      </div>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e1b4b' }}>
                      {holidays.length} Holiday Date{holidays.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Ethiopian national & public holidays tracked
                    </div>
                  </div>

                  {/* Metric 4: Doctor Absence Requests */}
                  <div className="glass-panel" style={{ padding: '20px 24px', background: 'white', borderRadius: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Doctor Absences</span>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CalendarOff size={18} />
                      </div>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e1b4b' }}>
                      {leaves.length} Total Application{leaves.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: pendingLeavesCount > 0 ? '#b45309' : 'var(--text-muted)', marginTop: '4px', fontWeight: pendingLeavesCount > 0 ? 700 : 500 }}>
                      {pendingLeavesCount > 0 ? `⚠️ ${pendingLeavesCount} Pending Review` : 'All requests processed'}
                    </div>
                  </div>
                </div>

                {/* 3. TWO-COLUMN DETAILED CLINIC ATTRIBUTES */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
                  
                  {/* CARD A: PHYSICAL GEOGRAPHIC LOCATION */}
                  <div className="glass-panel" style={{ padding: '28px', background: 'white', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MapPin size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-main)' }}>Physical Location & Facility Address</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered physical address in Ethiopia</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>City / Region</span>
                          <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>{clinicProfile.location.city}</strong>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>Sub-City (ክፍለ ከተማ)</span>
                          <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>{clinicProfile.location.subCity}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>Woreda (ወረዳ)</span>
                          <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>{clinicProfile.location.woreda}</strong>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>Street & Landmark Address</span>
                          <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{clinicProfile.location.fullAddress}</strong>
                        </div>
                      </div>

                      {/* Coordinates & Google Map External Link */}
                      <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>GPS Coordinates</span>
                          <span style={{ fontSize: '0.88rem', fontFamily: 'monospace', color: '#334155', fontWeight: 600 }}>
                            {clinicProfile.location.coordinates?.latitude || 9.005401}° N, {clinicProfile.location.coordinates?.longitude || 38.78426}° E
                          </span>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${clinicProfile.location.coordinates?.latitude || 9.005401},${clinicProfile.location.coordinates?.longitude || 38.78426}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px', borderRadius: '8px' }}
                        >
                          <Navigation size={14} style={{ color: '#4f46e5' }} /> View on Google Maps <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* CARD B: OFFICIAL RECEPTION & CONTACT CHANNELS */}
                  <div className="glass-panel" style={{ padding: '28px', background: 'white', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Phone size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-main)' }}>Official Contact & Reception</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Patient appointment and inquiry channels</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Phone */}
                      <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>Main Reception Phone</span>
                          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{clinicProfile.phoneNumber}</strong>
                        </div>
                        <a
                          href={`tel:${clinicProfile.phoneNumber}`}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px', borderRadius: '8px' }}
                        >
                          <Phone size={13} style={{ color: '#059669' }} /> Call Now
                        </a>
                      </div>

                      {/* Email */}
                      <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>Official Reception Email</span>
                          <span style={{ fontSize: '0.94rem', color: '#0f172a', fontWeight: 600 }}>{clinicProfile.email}</span>
                        </div>
                        <a
                          href={`mailto:${clinicProfile.email}`}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px', borderRadius: '8px' }}
                        >
                          <Mail size={13} style={{ color: '#4f46e5' }} /> Send Mail
                        </a>
                      </div>

                      {/* Website */}
                      <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>Official Clinic Web Portal</span>
                          <span style={{ fontSize: '0.92rem', color: '#4f46e5', fontWeight: 600 }}>{clinicProfile.website}</span>
                        </div>
                        {clinicProfile.website && (
                          <a
                            href={clinicProfile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px', borderRadius: '8px' }}
                          >
                            <Globe size={13} /> Visit Site <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CARD C: WEEKLY OPERATING HOURS & SHIFT MATRIX */}
                  <div className="glass-panel" style={{ padding: '28px', background: 'white', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-main)' }}>Operating Hours & Weekly Shifts</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily appointment scheduling schedule window</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Daily Shift Window */}
                      <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ede9fe 100%)', padding: '14px 18px', borderRadius: '14px', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#6d28d9', fontWeight: 800 }}>Standard Working Shift</span>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4338ca', marginTop: '2px' }}>
                            {clinicProfile.workingHours.openTime} — {clinicProfile.workingHours.closeTime}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#6d28d9', fontWeight: 700, background: 'rgba(255,255,255,0.7)', padding: '4px 10px', borderRadius: '8px' }}>
                          Addis Ababa (EAT)
                        </div>
                      </div>

                      {/* Day of Week Matrix */}
                      <div>
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                          Active Days of Operation
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '6px' }}>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                            const isOpen = clinicProfile.workingHours.openDays?.some(d => d.toLowerCase() === day.toLowerCase()) ||
                              (day === 'Saturday' && clinicProfile.workingHours.isOpenSaturday) ||
                              (day === 'Sunday' && clinicProfile.workingHours.isOpenSunday);
                            return (
                              <div
                                key={day}
                                style={{
                                  padding: '8px 4px',
                                  borderRadius: '10px',
                                  textAlign: 'center',
                                  background: isOpen ? '#ecfdf5' : '#f8fafc',
                                  border: isOpen ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                                  color: isOpen ? '#047857' : '#94a3b8'
                                }}
                              >
                                <div style={{ fontSize: '0.72rem', fontWeight: 800 }}>{day.slice(0, 3)}</div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, marginTop: '2px' }}>
                                  {isOpen ? 'Open' : 'Off'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Weekend Status Flags */}
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '140px', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: clinicProfile.workingHours.isOpenSaturday ? '#10b981' : '#94a3b8' }} />
                          <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Saturday: <strong>{clinicProfile.workingHours.isOpenSaturday ? 'Open' : 'Closed'}</strong></span>
                        </div>
                        <div style={{ flex: 1, minWidth: '140px', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: clinicProfile.workingHours.isOpenSunday ? '#10b981' : '#94a3b8' }} />
                          <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Sunday: <strong>{clinicProfile.workingHours.isOpenSunday ? 'Open' : 'Closed'}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD D: CLINICAL DEPARTMENTS & SERVICES */}
                  <div className="glass-panel" style={{ padding: '28px', background: 'white', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Stethoscope size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-main)' }}>Clinical Specialties & Services</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Healthcare offerings available at this facility</div>
                      </div>
                    </div>

                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                        Accredited departments delivering comprehensive outpatient diagnosis, clinical management, and specialty triage:
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
                        {clinicProfile.services && clinicProfile.services.length > 0 ? (
                          clinicProfile.services.map((svc, i) => (
                            <span
                              key={i}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#f0f9ff',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                padding: '6px 14px',
                                borderRadius: '9999px',
                                fontSize: '0.86rem',
                                fontWeight: 700
                              }}
                            >
                              <Sparkles size={13} style={{ color: '#0284c7' }} />
                              {svc}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No specialties registered.</span>
                        )}
                      </div>

                      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                        💡 <strong>Scheduling note:</strong> Patients selecting these departments during appointment booking are routed to matching certified physicians.
                      </div>
                    </div>
                  </div>

                  {/* CARD E: FACILITY REGISTRY & ACCREDITATION METADATA */}
                  <div className="glass-panel" style={{ padding: '28px', background: 'white', borderRadius: '20px', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-main)' }}>Registry, Accreditation & System Metadata</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Central Ethiopian digital healthcare network synchronicity</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>System Record ID</span>
                        <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#334155', fontWeight: 600 }}>{clinicProfile._id || 'Primary Clinic Node'}</span>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>Initial Facility Registration</span>
                        <span style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 700 }}>{formatDateSafe(clinicProfile.createdAt) || 'Active Record'}</span>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>Last Configuration Update</span>
                        <span style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 700 }}>{formatDateTimeSafe(clinicProfile.updatedAt)}</span>
                      </div>

                      <div style={{ background: '#ecfdf5', padding: '12px 16px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                        <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#065f46', fontWeight: 800, display: 'block' }}>Central Network Connectivity</span>
                        <span style={{ fontSize: '0.88rem', color: '#047857', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <CheckCircle size={14} /> CareSync ET Active Node
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              /* ── EDIT MODE: COMPREHENSIVE CLINIC PROFILE EDITOR ── */
              <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Edit2 size={20} style={{ color: '#4f46e5' }} /> Edit Clinic Profile & Operating Configuration
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
                      Modify legal facility name, brand media, physical address, weekly hours, and services offered.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    className="btn btn-secondary"
                    style={{ fontWeight: 700, borderRadius: '10px' }}
                  >
                    Cancel / Discard
                  </button>
                </div>

                <form onSubmit={handleSaveClinicProfile}>
                  
                  {/* SECTION 1: FACILITY IDENTITY & MEDIA ASSETS */}
                  <div style={{ marginBottom: '28px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e1b4b' }}>
                      <Building2 size={18} style={{ color: '#4f46e5' }} /> 1. Brand Identity & Overview
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Facility Legal Name *</label>
                        <input
                          type="text"
                          value={editClinicForm?.name || ''}
                          onChange={(e) => setEditClinicForm({ ...editClinicForm, name: e.target.value })}
                          required
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.95rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Main Reception Phone (+251...) *</label>
                        <input
                          type="text"
                          value={editClinicForm?.phoneNumber || ''}
                          onChange={(e) => setEditClinicForm({ ...editClinicForm, phoneNumber: e.target.value })}
                          required
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.95rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Facility Description & Patient Mission Statement</label>
                      <textarea
                        rows={3}
                        value={editClinicForm?.description || ''}
                        onChange={(e) => setEditClinicForm({ ...editClinicForm, description: e.target.value })}
                        placeholder="Comprehensive healthcare clinic providing compassionate, high quality medical care..."
                        style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.92rem', lineHeight: 1.5 }}
                      />
                    </div>

                    {/* Media Assets: Logo & Cover Image */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Clinic Logo Image URL</label>
                        <input
                          type="url"
                          placeholder="https://.../logo.jpg"
                          value={editClinicForm?.media?.logo || ''}
                          onChange={(e) => setEditClinicForm({
                            ...editClinicForm,
                            media: { ...(editClinicForm?.media || {}), logo: e.target.value }
                          })}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.9rem' }}
                        />
                        {editClinicForm?.media?.logo && (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={editClinicForm.media.logo}
                              alt="Logo Preview"
                              style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #e2e8f0' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Logo Preview</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Clinic Cover Image Banner URL</label>
                        <input
                          type="url"
                          placeholder="https://.../cover.jpg"
                          value={editClinicForm?.media?.coverImage || ''}
                          onChange={(e) => setEditClinicForm({
                            ...editClinicForm,
                            media: { ...(editClinicForm?.media || {}), coverImage: e.target.value }
                          })}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.9rem' }}
                        />
                        {editClinicForm?.media?.coverImage && (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={editClinicForm.media.coverImage}
                              alt="Cover Preview"
                              style={{ width: '80px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Banner Preview</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: OFFICIAL CONTACT CHANNELS */}
                  <div style={{ marginBottom: '28px', borderTop: '1px solid #f1f5f9', paddingTop: '22px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e1b4b' }}>
                      <Phone size={18} style={{ color: '#059669' }} /> 2. Official Communication Channels
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Reception Email</label>
                        <input
                          type="email"
                          value={editClinicForm?.email || ''}
                          onChange={(e) => setEditClinicForm({ ...editClinicForm, email: e.target.value })}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.92rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Official Website URL</label>
                        <input
                          type="url"
                          value={editClinicForm?.website || ''}
                          onChange={(e) => setEditClinicForm({ ...editClinicForm, website: e.target.value })}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.92rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: PHYSICAL ADDRESS & GEOGRAPHY */}
                  <div style={{ marginBottom: '28px', borderTop: '1px solid #f1f5f9', paddingTop: '22px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e1b4b' }}>
                      <MapPin size={18} style={{ color: '#4f46e5' }} /> 3. Physical Address & Ethiopian Geography
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>City / Region</label>
                        <input
                          type="text"
                          value={editClinicForm?.location?.city || ''}
                          onChange={(e) => setEditClinicForm({
                            ...editClinicForm,
                            location: { ...(editClinicForm?.location || {}), city: e.target.value }
                          })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Sub-City (ክፍለ ከተማ)</label>
                        <input
                          type="text"
                          value={editClinicForm?.location?.subCity || ''}
                          onChange={(e) => setEditClinicForm({
                            ...editClinicForm,
                            location: { ...(editClinicForm?.location || {}), subCity: e.target.value }
                          })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Woreda (ወረዳ)</label>
                        <input
                          type="text"
                          value={editClinicForm?.location?.woreda || ''}
                          onChange={(e) => setEditClinicForm({
                            ...editClinicForm,
                            location: { ...(editClinicForm?.location || {}), woreda: e.target.value }
                          })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Full Street / Landmark Address</label>
                      <input
                        type="text"
                        value={editClinicForm?.location?.fullAddress || ''}
                        onChange={(e) => setEditClinicForm({
                          ...editClinicForm,
                          location: { ...(editClinicForm?.location || {}), fullAddress: e.target.value }
                        })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>GPS Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={editClinicForm?.location?.coordinates?.latitude ?? 9.005401}
                          onChange={(e) => setEditClinicForm({
                            ...editClinicForm,
                            location: {
                              ...(editClinicForm?.location || {}),
                              coordinates: {
                                ...(editClinicForm?.location?.coordinates || {}),
                                latitude: parseFloat(e.target.value) || 0
                              }
                            }
                          })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>GPS Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={editClinicForm?.location?.coordinates?.longitude ?? 38.78426}
                          onChange={(e) => setEditClinicForm({
                            ...editClinicForm,
                            location: {
                              ...(editClinicForm?.location || {}),
                              coordinates: {
                                ...(editClinicForm?.location?.coordinates || {}),
                                longitude: parseFloat(e.target.value) || 0
                              }
                            }
                          })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: OPERATING HOURS & WEEKLY SCHEDULE */}
                  <div style={{ marginBottom: '28px', borderTop: '1px solid #f1f5f9', paddingTop: '22px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e1b4b' }}>
                      <Clock size={18} style={{ color: '#b91c1c' }} /> 4. Operating Hours & Weekly Schedule
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Standard Opening Time</label>
                        <input
                          type="time"
                          value={editClinicForm?.workingHours?.openTime || '08:00'}
                          onChange={(e) => setEditClinicForm({
                            ...editClinicForm,
                            workingHours: { ...(editClinicForm?.workingHours || {}), openTime: e.target.value }
                          })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Standard Closing Time</label>
                        <input
                          type="time"
                          value={editClinicForm?.workingHours?.closeTime || '17:00'}
                          onChange={(e) => setEditClinicForm({
                            ...editClinicForm,
                            workingHours: { ...(editClinicForm?.workingHours || {}), closeTime: e.target.value }
                          })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                        />
                      </div>
                    </div>

                    {/* Day selector pills */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px' }}>
                        Active Operational Days (Click to toggle)
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                          const active = editClinicForm?.workingHours?.openDays?.some(d => d.toLowerCase() === day.toLowerCase());
                          return (
                            <button
                              type="button"
                              key={day}
                              onClick={() => handleToggleDay(day)}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '9999px',
                                border: active ? '1px solid #4f46e5' : '1px solid var(--border-subtle)',
                                background: active ? '#e0e7ff' : '#f8fafc',
                                color: active ? '#4338ca' : '#64748b',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {active && <Check size={14} />} {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Weekend flags */}
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={editClinicForm?.workingHours?.isOpenSaturday ?? true}
                          onChange={(e) => setEditClinicForm({
                            ...editClinicForm,
                            workingHours: { ...(editClinicForm?.workingHours || {}), isOpenSaturday: e.target.checked }
                          })}
                        />
                        <span>Open on Saturdays</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={editClinicForm?.workingHours?.isOpenSunday ?? false}
                          onChange={(e) => setEditClinicForm({
                            ...editClinicForm,
                            workingHours: { ...(editClinicForm?.workingHours || {}), isOpenSunday: e.target.checked }
                          })}
                        />
                        <span>Open on Sundays</span>
                      </label>
                    </div>
                  </div>

                  {/* SECTION 5: CLINICAL SERVICES OFFERED */}
                  <div style={{ marginBottom: '32px', borderTop: '1px solid #f1f5f9', paddingTop: '22px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e1b4b' }}>
                      <Stethoscope size={18} style={{ color: '#0369a1' }} /> 5. Clinical Services & Medical Specialties
                    </h4>

                    {/* Services Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                      {editClinicForm?.services && editClinicForm.services.length > 0 ? (
                        editClinicForm.services.map((svc, i) => (
                          <span
                            key={i}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#f0f9ff',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              padding: '6px 14px',
                              borderRadius: '9999px',
                              fontSize: '0.86rem',
                              fontWeight: 700
                            }}
                          >
                            <span>{svc}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveService(svc)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#0284c7', display: 'flex', alignItems: 'center' }}
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No services listed.</span>
                      )}
                    </div>

                    {/* Add new service */}
                    <div style={{ display: 'flex', gap: '10px', maxWidth: '450px' }}>
                      <input
                        type="text"
                        placeholder="Add new specialty (e.g. Cardiology)"
                        value={newServiceInput}
                        onChange={(e) => setNewServiceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddService();
                          }
                        }}
                        style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                      />
                      <button
                        type="button"
                        onClick={handleAddService}
                        className="btn btn-secondary btn-sm"
                        style={{ fontWeight: 700, borderRadius: '8px' }}
                      >
                        <Plus size={15} /> Add Service
                      </button>
                    </div>
                  </div>

                  {/* FORM ACTIONS */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
                    <button
                      type="button"
                      onClick={handleCancelEditing}
                      disabled={savingProfile}
                      className="btn btn-secondary"
                      style={{ padding: '12px 24px', fontWeight: 700 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 30px', fontWeight: 800, borderRadius: '12px' }}
                    >
                      {savingProfile ? <Loader2 size={16} className="spin-icon" /> : <Check size={16} />}
                      {savingProfile ? 'Saving Changes...' : 'Save Clinic Profile & Hours'}
                    </button>
                  </div>

                </form>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 4: SLOT GENERATION & MAINTENANCE ENGINE                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'maintenance' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {/* Slot Engine Specs */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Automated Slot Engine</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Background cron job (Runs daily at 00:05 UTC)</div>
                </div>
              </div>

              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                <li>Generates 30-minute consultation slots 30 days in advance.</li>
                <li><strong>Skips Holiday Dates:</strong> Automatically inspects clinic closure records before creating slots.</li>
                <li><strong>Skips Doctor Leaves:</strong> Checks for approved doctor leaves and suppresses slot opening.</li>
                <li>Preserves already booked slots without duplication.</li>
              </ul>
            </div>

            {/* Expired Slot Cleanup Trigger */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Expired Slot Cleanup</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Purge past unbooked slots</div>
                </div>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '20px' }}>
                Removes past unbooked slots with status <code>available</code> older than the current hour so patients only see fresh, upcoming slots.
              </p>

              <button
                onClick={handleTriggerExpiredCleanup}
                disabled={cleaningSlots}
                className="btn btn-secondary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700 }}
              >
                {cleaningSlots ? <Loader2 size={16} className="spin-icon" /> : <Trash2 size={16} />}
                {cleaningSlots ? 'Cleaning Expired Slots...' : 'Trigger Cleanup Now'}
              </button>

              {cleanupResult && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    borderRadius: '10px',
                    background: cleanupResult.success ? '#ecfdf5' : '#fef2f2',
                    color: cleanupResult.success ? '#047857' : '#b91c1c',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  {cleanupResult.message}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── MODAL 1: REVIEW DOCTOR LEAVE ─────────────────────────── */}
      {reviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="glass-panel"
            style={{
              background: 'white',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              borderRadius: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                {reviewModal.status === 'approved' ? 'Approve Doctor Leave' : 'Reject Doctor Leave'}
              </h3>
              <button
                onClick={() => setReviewModal(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', marginBottom: '18px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                {reviewModal.doctorDetails?.specialization}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Period: {formatDateSafe(reviewModal.doctorDetails?.startDate)} to {formatDateSafe(reviewModal.doctorDetails?.endDate)}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Reason: "{reviewModal.doctorDetails?.reason}"
              </div>
            </div>

            {reviewModal.status === 'approved' && (
              <div style={{ background: '#ecfdf5', color: '#047857', padding: '12px 14px', borderRadius: '10px', fontSize: '0.82rem', marginBottom: '18px', lineHeight: 1.4 }}>
                💡 <strong>Automatic Slot Cascade:</strong> Approving this request will immediately purge all unbooked slots for this doctor during these dates and prevent new slots from opening.
              </div>
            )}

            <form onSubmit={handleReviewLeaveSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Administrative Review Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    reviewModal.status === 'approved'
                      ? 'e.g., Approved. On-call coverage arranged.'
                      : 'e.g., Cannot approve due to peak patient load on these dates.'
                  }
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  className="btn btn-secondary"
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn"
                  style={{
                    background: reviewModal.status === 'approved' ? '#10b981' : '#ef4444',
                    color: 'white',
                    fontWeight: 700
                  }}
                >
                  {submittingReview ? 'Processing...' : reviewModal.status === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADD CUSTOM HOLIDAY / CLOSURE ─────────────────── */}
      {showAddHolidayModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="glass-panel"
            style={{
              background: 'white',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              borderRadius: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Add Holiday or Closure Date</h3>
              <button
                onClick={() => setShowAddHolidayModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateHoliday}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Holiday / Closure Title</label>
                <input
                  type="text"
                  placeholder="e.g. Ethiopian Epiphany (Timket)"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Calendar Date</label>
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={newHolidayIsClosed}
                    onChange={(e) => setNewHolidayIsClosed(e.target.checked)}
                  />
                  <span>Clinic is FULLY CLOSED on this date (No slots created)</span>
                </label>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Description / Notice (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Official public national holiday. Emergency desk open."
                  value={newHolidayDesc}
                  onChange={(e) => setNewHolidayDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddHolidayModal(false)}
                  className="btn btn-secondary"
                  disabled={submittingHoliday}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingHoliday}
                  className="btn btn-primary"
                  style={{ fontWeight: 700 }}
                >
                  {submittingHoliday ? 'Saving...' : 'Add Date to Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
