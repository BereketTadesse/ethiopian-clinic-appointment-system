'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { clinicApi } from '@/lib/api';
import {
  Stethoscope,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Shield,
  BadgeCheck,
  Edit2,
  CheckCircle2,
  ArrowLeft,
  Building,
  GraduationCap,
  Award,
  FileText,
  AlertTriangle,
  Plus,
  X,
  Send,
  Check,
  Loader2,
  CalendarOff,
  Info,
  CalendarDays,
  CheckCircle,
  XCircle,
  Hourglass,
  Sun,
  Moon,
  Trash2,
  Coffee,
  AlertCircle
} from 'lucide-react';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

export default function DoctorProfilePage() {
  const { user, mounted } = useAuth();
  const router = useRouter();

  // Navigation tab inside Doctor Profile
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'leaves' | 'schedule' | 'holidays'

  // Loading & Notification States
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [cancellingLeaveId, setCancellingLeaveId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Doctor Clinical Profile State (Live from Clinic Service)
  const [doctorProfile, setDoctorProfile] = useState({
    name: user?.name || 'Attending Physician',
    title: 'Consultant Physician',
    specialty: 'General Internal Medicine',
    licenseNumber: 'ETH-MD-90872',
    yearsOfExperience: 8,
    clinicName: 'CareSync Central Clinic - Addis Ababa',
    clinicAddress: 'Bole Medhanealem, Addis Ababa, Ethiopia',
    roomNumber: 'Consultation Suite 204',
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    education: 'Doctor of Medicine (MD), Addis Ababa University',
    bio: 'Dedicated medical practitioner focused on acute internal medicine, family diagnostic evaluations, and preventative patient care under the Ethiopian Ministry of Health standards.',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '08:30',
    endTime: '17:00',
    breakStart: '12:30',
    breakEnd: '13:30',
    isAcceptingPatients: true,
    hasLiveClinicalRecord: false
  });

  // Edit Profile Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    bio: '',
    yearsOfExperience: 8,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '08:30',
    endTime: '17:00',
    breakStart: '12:30',
    breakEnd: '13:30'
  });

  // Doctor Leaves State (Live from Clinic Service)
  const [leaves, setLeaves] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [newLeaveForm, setNewLeaveForm] = useState({
    startDate: '',
    endDate: '',
    reasonPreset: 'Annual Vacation',
    customReason: ''
  });

  // Clinic Status & Holidays State
  const [clinicStatus, setClinicStatus] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [todaySlots, setTodaySlots] = useState([]);

  // ─────────────────────────────────────────────────────────────
  // 1. DATA FETCHING (SYNC WITH LIVE CLINIC SERVICE)
  // ─────────────────────────────────────────────────────────────
  const fetchAllDoctorData = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMessage('');

    const userId = user.id || user._id;

    try {
      // 1. Fetch Doctor Clinical Profile
      try {
        const docRes = await clinicApi.get(`/getAllDoctors/${userId}`);
        if (docRes.data?.success && docRes.data?.data) {
          const d = docRes.data.data;
          const userAcct = d.accountDetails && typeof d.accountDetails === 'object' ? d.accountDetails : {};

          setDoctorProfile(prev => ({
            ...prev,
            name: userAcct.fullName || user.name || prev.name,
            email: userAcct.email || user.email || prev.email,
            phone: userAcct.phoneNumber || user.phoneNumber || prev.phone,
            specialty: d.specialization || prev.specialty,
            licenseNumber: d.licenseNumber || prev.licenseNumber,
            yearsOfExperience: d.yearsOfExperience ?? prev.yearsOfExperience,
            bio: d.bio || prev.bio,
            availableDays: d.availableDays?.length ? d.availableDays : prev.availableDays,
            startTime: d.startTime || prev.startTime,
            endTime: d.endTime || prev.endTime,
            breakStart: d.breakStart || prev.breakStart,
            breakEnd: d.breakEnd || prev.breakEnd,
            isAcceptingPatients: d.isAcceptingPatients !== undefined ? d.isAcceptingPatients : true,
            hasLiveClinicalRecord: true
          }));

          setEditFormData({
            bio: d.bio || '',
            yearsOfExperience: d.yearsOfExperience ?? 8,
            availableDays: d.availableDays?.length ? d.availableDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            startTime: d.startTime || '08:30',
            endTime: d.endTime || '17:00',
            breakStart: d.breakStart || '12:30',
            breakEnd: d.breakEnd || '13:30'
          });
        }
      } catch (profileErr) {
        // Fallback gracefully if admin hasn't created shift schedule row yet
        console.warn('Doctor clinical profile not yet registered in clinic db:', profileErr.message);
      }

      // 2. Fetch Doctor Leaves (Role Protected: doctor role only)
      try {
        const leaveRes = await clinicApi.get('/me/leaves');
        if (leaveRes.data?.success) {
          setLeaves(leaveRes.data.data || []);
        }
      } catch (leaveErr) {
        console.warn('Could not fetch doctor leaves:', leaveErr.message);
      }

      // 3. Fetch Clinic Status & Operating Schedule
      try {
        const statusRes = await clinicApi.get('/status');
        if (statusRes.data?.success) {
          setClinicStatus(statusRes.data);
        }
      } catch (statusErr) {
        console.warn('Could not fetch clinic status:', statusErr.message);
      }

      // 4. Fetch Holidays & Closures
      try {
        const holRes = await clinicApi.get('/holidays');
        if (holRes.data?.success) {
          setHolidays(holRes.data.data || []);
        }
      } catch (holErr) {
        console.warn('Could not fetch holidays:', holErr.message);
      }

      // 5. Fetch Today's Slots
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const slotsRes = await clinicApi.get(`/${userId}/slots?date=${todayStr}`);
        if (slotsRes.data?.success && slotsRes.data?.slots) {
          setTodaySlots(slotsRes.data.slots);
        }
      } catch (slotsErr) {
        // slots might be unallocated for today, ignore
      }

    } catch (err) {
      console.error('Error loading doctor data:', err);
      setErrorMessage('Some clinical details could not be loaded from the clinic service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && user) {
      fetchAllDoctorData();
    } else if (mounted && !user) {
      router.push('/login');
    }
  }, [mounted, user]);

  // ─────────────────────────────────────────────────────────────
  // 2. HANDLE DOCTOR PROFILE SELF-UPDATE (PATCH /me)
  // ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await clinicApi.patch('/me', editFormData);
      if (res.data?.success) {
        const updated = res.data.data;
        setDoctorProfile(prev => ({
          ...prev,
          bio: updated.bio,
          yearsOfExperience: updated.yearsOfExperience,
          availableDays: updated.availableDays,
          startTime: updated.startTime,
          endTime: updated.endTime,
          breakStart: updated.breakStart,
          breakEnd: updated.breakEnd,
          hasLiveClinicalRecord: true
        }));
        setIsEditing(false);
        setSuccessMessage('🎉 Your clinical profile and working hours have been saved successfully!');
        setTimeout(() => setSuccessMessage(''), 6000);
      }
    } catch (err) {
      console.error('Error saving doctor profile:', err);
      setErrorMessage(
        err.response?.data?.message || 'Failed to update professional clinical profile. Please try again.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleDaySelection = (day) => {
    setEditFormData(prev => {
      const exists = prev.availableDays.includes(day);
      const nextDays = exists
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day];
      return { ...prev, availableDays: nextDays };
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 3. HANDLE DOCTOR LEAVE REQUEST (POST /me/leaves)
  // ─────────────────────────────────────────────────────────────
  const handleRequestLeave = async (e) => {
    e.preventDefault();
    const { startDate, endDate, reasonPreset, customReason } = newLeaveForm;

    if (!startDate || !endDate) {
      setErrorMessage('Please select both a start date and an end date.');
      return;
    }

    if (startDate > endDate) {
      setErrorMessage('The leave start date cannot be after the end date.');
      return;
    }

    const fullReason = customReason.trim()
      ? `${reasonPreset} — ${customReason.trim()}`
      : reasonPreset;

    setSubmittingLeave(true);
    setErrorMessage('');

    try {
      const res = await clinicApi.post('/me/leaves', {
        startDate,
        endDate,
        reason: fullReason
      });

      if (res.data?.success) {
        setSuccessMessage('📝 Leave request submitted successfully! It is now pending administrator approval.');
        setShowLeaveModal(false);
        setNewLeaveForm({
          startDate: '',
          endDate: '',
          reasonPreset: 'Annual Vacation',
          customReason: ''
        });

        // Refresh leaves list
        const leavesRes = await clinicApi.get('/me/leaves');
        if (leavesRes.data?.success) {
          setLeaves(leavesRes.data.data || []);
        }
        setTimeout(() => setSuccessMessage(''), 7000);
      }
    } catch (err) {
      console.error('Error requesting leave:', err);
      setErrorMessage(
        err.response?.data?.message || 'Failed to submit leave request. Please check date inputs.'
      );
    } finally {
      setSubmittingLeave(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. CANCEL PENDING/APPROVED LEAVE
  // ─────────────────────────────────────────────────────────────
  const handleCancelLeave = async (leaveId) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    const userId = user.id || user._id;
    setCancellingLeaveId(leaveId);

    try {
      const res = await clinicApi.delete(`/doctors/${userId}/leaves/${leaveId}`);
      if (res.data?.success) {
        setLeaves(prev => prev.filter(l => l._id !== leaveId));
        setSuccessMessage('Leave request has been successfully cancelled and removed.');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('Error cancelling leave:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to cancel leave request.');
    } finally {
      setCancellingLeaveId(null);
    }
  };

  // Filter leaves based on selected sub-filter
  const filteredLeaves = leaves.filter(l => {
    if (leaveFilter === 'all') return true;
    return l.status === leaveFilter;
  });

  const pendingLeavesCount = leaves.filter(l => l.status === 'pending').length;
  const approvedLeavesCount = leaves.filter(l => l.status === 'approved').length;

  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        style={{
          backgroundColor: 'var(--bg-page)',
          minHeight: '92vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '36px 0 60px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
          <div className="spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent' }} />
          Loading Physician Portal...
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning style={{ backgroundColor: 'var(--bg-page)', minHeight: '92vh', padding: '36px 0 60px' }}>
      <div className="container" suppressHydrationWarning style={{ maxWidth: '980px' }}>
        
        {/* Top Back Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <Link
            href="/doctor/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#4f46e5',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.88rem'
            }}
          >
            <ArrowLeft size={16} /> Return to Doctor Portal (የሐኪም ፖርታል)
          </Link>

          {/* Real-time Clinic Status Tag */}
          {clinicStatus && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: clinicStatus.isOpen ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${clinicStatus.isOpen ? '#a7f3d0' : '#fecaca'}`,
              color: clinicStatus.isOpen ? '#047857' : '#b91c1c',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: clinicStatus.isOpen ? '#10b981' : '#ef4444' }} />
              {clinicStatus.isHoliday
                ? `Clinic Closed Today (${clinicStatus.holidayName})`
                : clinicStatus.isOpen
                ? `Clinic Open • ${clinicStatus.localDay} ${clinicStatus.localTime}`
                : `Clinic Currently Closed • ${clinicStatus.localDay} ${clinicStatus.localTime}`}
            </div>
          )}
        </div>

        {/* Global Notifications */}
        {successMessage && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            padding: '14px 18px',
            borderRadius: '14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)'
          }}>
            <CheckCircle2 size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '14px 18px',
            borderRadius: '14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
          }}>
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile Header Hero Card */}
        <div className="glass-panel" style={{
          padding: '32px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '24px',
          marginBottom: '24px',
          position: 'relative',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            
            <div style={{ display: 'flex', gap: '22px', alignItems: 'center' }}>
              {/* Doctor Avatar with Gradient Aura */}
              <div style={{
                width: '88px',
                height: '88px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                boxShadow: '0 12px 28px rgba(79, 70, 229, 0.3)'
              }}>
                👨‍⚕️
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.4px' }}>
                    {doctorProfile.name}
                  </h1>
                  <BadgeCheck size={24} style={{ color: '#0ea5e9' }} />
                </div>

                <div style={{ fontSize: '0.96rem', color: '#4f46e5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Stethoscope size={16} /> {doctorProfile.title} • {doctorProfile.specialty}
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>
                    MOH License: <strong style={{ fontFamily: 'monospace', color: '#1e293b' }}>{doctorProfile.licenseNumber}</strong>
                  </span>
                  <span>•</span>
                  <span>{doctorProfile.yearsOfExperience} Years Clinical Experience</span>
                  <span>•</span>
                  <span style={{ color: doctorProfile.isAcceptingPatients ? '#059669' : '#d97706', fontWeight: 700 }}>
                    ● {doctorProfile.isAcceptingPatients ? 'Accepting Patients' : 'Schedule Paused'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setShowLeaveModal(true);
                  setErrorMessage('');
                }}
                className="btn btn-sm"
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #c7d2fe',
                  color: '#4338ca',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CalendarOff size={16} /> Request Leave / Absence
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Edit2 size={15} /> {isEditing ? 'Cancel Edit' : 'Edit Working Schedule'}
              </button>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* EDIT WORKING PROFILE & SHIFTS FORM (PATCH /me)               */}
        {/* ───────────────────────────────────────────────────────────── */}
        {isEditing && (
          <div className="glass-panel" style={{
            padding: '30px',
            background: 'white',
            borderRadius: '20px',
            marginBottom: '26px',
            border: '2px solid #e0e7ff',
            boxShadow: '0 12px 28px rgba(79, 70, 229, 0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Update Professional Clinical Profile & Schedule
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '4px 0 0' }}>
                  Changes are synchronized with the <code>clinic-service</code> database and adjust slot generation.
                </p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              {/* Working Hours & Break Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sun size={14} style={{ color: '#d97706' }} /> Shift Start Time
                  </label>
                  <input
                    type="time"
                    required
                    className="form-control"
                    value={editFormData.startTime}
                    onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Moon size={14} style={{ color: '#4338ca' }} /> Shift End Time
                  </label>
                  <input
                    type="time"
                    required
                    className="form-control"
                    value={editFormData.endTime}
                    onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Coffee size={14} style={{ color: '#92400e' }} /> Lunch Break Start
                  </label>
                  <input
                    type="time"
                    className="form-control"
                    value={editFormData.breakStart}
                    onChange={(e) => setEditFormData({ ...editFormData, breakStart: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Coffee size={14} style={{ color: '#92400e' }} /> Lunch Break End
                  </label>
                  <input
                    type="time"
                    className="form-control"
                    value={editFormData.breakEnd}
                    onChange={(e) => setEditFormData({ ...editFormData, breakEnd: e.target.value })}
                  />
                </div>
              </div>

              {/* Weekly Available Days Selector */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">
                  Available Working Days for Appointments (የሥራ ቀናት)
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {ALL_DAYS.map(day => {
                    const isSelected = editFormData.availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDaySelection(day)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isSelected ? '1.5px solid #4f46e5' : '1.5px solid #cbd5e1',
                          background: isSelected ? '#eef2ff' : 'white',
                          color: isSelected ? '#4338ca' : '#475569'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}{day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Years of Experience */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Years of Certified Medical Practice</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  className="form-control"
                  style={{ maxWidth: '240px' }}
                  value={editFormData.yearsOfExperience}
                  onChange={(e) => setEditFormData({ ...editFormData, yearsOfExperience: Number(e.target.value) })}
                />
              </div>

              {/* Bio & Philosophy */}
              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label">Professional Practice Bio & Philosophy</label>
                <textarea
                  rows={3}
                  className="form-control"
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  placeholder="Summarize your clinical background, patient consultation approach, and specialized competencies..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary"
                  disabled={savingProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontWeight: 800 }}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Save Clinical Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* INTERACTIVE NAVIGATION TABS                                    */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('profile')}
            className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700, fontSize: '0.86rem' }}
          >
            <User size={15} /> Clinical Profile & Facility
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`btn btn-sm ${activeTab === 'leaves' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700, fontSize: '0.86rem', position: 'relative' }}
          >
            <CalendarOff size={15} /> Leave & Absence Requests
            {pendingLeavesCount > 0 && (
              <span style={{
                background: '#f59e0b',
                color: 'white',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem',
                fontWeight: 900
              }}>
                {pendingLeavesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`btn btn-sm ${activeTab === 'schedule' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700, fontSize: '0.86rem' }}
          >
            <Clock size={15} /> Working Hours & Slots
          </button>

          <button
            onClick={() => setActiveTab('holidays')}
            className={`btn btn-sm ${activeTab === 'holidays' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700, fontSize: '0.86rem' }}
          >
            <CalendarDays size={15} /> Clinic Holidays ({holidays.length})
          </button>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: CLINICAL PROFILE & FACILITY DETAILS                   */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '24px' }}>
              
              {/* Card 1: Affiliated Facility */}
              <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '18px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building size={18} style={{ color: '#4f46e5' }} /> Affiliated Healthcare Facility
                </h3>
                <div style={{ fontSize: '0.86rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Clinic Branch</span>
                    <strong>{doctorProfile.clinicName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Address</span>
                    <span>{doctorProfile.clinicAddress}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Consultation Suite</span>
                    <span style={{ color: '#4f46e5', fontWeight: 700 }}>{doctorProfile.roomNumber}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Academic Qualifications & Certification */}
              <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '18px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GraduationCap size={18} style={{ color: '#0ea5e9' }} /> Qualifications & Credentials
                </h3>
                <div style={{ fontSize: '0.86rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Medical Degree</span>
                    <strong>{doctorProfile.education}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>MOH Certification</span>
                    <span style={{ color: '#059669', fontWeight: 700 }}>● Fully Licensed in Ethiopia</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Contact Email & Phone</span>
                    <span>{doctorProfile.email || '—'} • {doctorProfile.phone || '—'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Doctor Bio Card */}
            <div className="glass-panel" style={{ padding: '26px', background: 'white', borderRadius: '18px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Clinical Bio & Practice Philosophy
              </h3>
              <p style={{ color: '#334155', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                {doctorProfile.bio}
              </p>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: DOCTOR LEAVE & ABSENCE REQUESTS (THE CORE FEATURE!)   */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'leaves' && (
          <div>
            {/* Header with Leave Request Trigger */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Doctor Leave & Absence Management (የዕረፍት እና ፈቃድ ጥያቄዎች)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '2px 0 0' }}>
                  Submit scheduled leaves. Requests remain <strong>Pending</strong> until approved by clinic administrators.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowLeaveModal(true);
                  setErrorMessage('');
                }}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Submit New Leave Request
              </button>
            </div>

            {/* Status Filter Chips */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status:</span>
              {[
                { id: 'all', label: `All (${leaves.length})` },
                { id: 'pending', label: `Pending Review (${pendingLeavesCount})` },
                { id: 'approved', label: `Approved (${approvedLeavesCount})` },
                { id: 'rejected', label: `Rejected` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setLeaveFilter(f.id)}
                  className={`btn btn-sm ${leaveFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Leaves List */}
            {filteredLeaves.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', background: 'white', borderRadius: '18px' }}>
                <CalendarOff size={42} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>No leave records found</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 16px' }}>
                  {leaveFilter === 'all'
                    ? "You haven't submitted any leave or absence requests yet."
                    : `No leaves currently match the "${leaveFilter}" filter.`}
                </p>
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  <Plus size={14} /> Submit a Leave Request
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredLeaves.map((leave) => {
                  const isPending = leave.status === 'pending';
                  const isApproved = leave.status === 'approved';
                  const isRejected = leave.status === 'rejected';

                  const badgeColor = isApproved ? '#059669' : isPending ? '#d97706' : '#dc2626';
                  const badgeBg = isApproved ? '#ecfdf5' : isPending ? '#fef3c7' : '#fef2f2';
                  const badgeBorder = isApproved ? '#a7f3d0' : isPending ? '#fde68a' : '#fecaca';

                  return (
                    <div
                      key={leave._id}
                      className="glass-panel"
                      style={{
                        padding: '20px 24px',
                        background: 'white',
                        borderRadius: '16px',
                        borderLeft: `5px solid ${badgeColor}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '14px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        {/* Top Status & Date Range */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '8px',
                            background: badgeBg,
                            border: `1px solid ${badgeBorder}`,
                            color: badgeColor,
                            fontWeight: 800,
                            fontSize: '0.76rem',
                            textTransform: 'uppercase',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isApproved && <CheckCircle size={12} />}
                            {isPending && <Hourglass size={12} />}
                            {isRejected && <XCircle size={12} />}
                            {leave.status === 'pending' ? 'Pending Admin Review' : leave.status}
                          </span>

                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Submitted {leave.createdAt ? formatDateSafe(leave.createdAt) : 'recently'}
                          </span>
                        </div>

                        {/* Leave Date Window */}
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                          📅 {leave.startDate} → {leave.endDate}
                        </div>

                        {/* Reason */}
                        <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                          <strong>Reason:</strong> {leave.reason}
                        </div>

                        {/* Admin Feedback Notes */}
                        {leave.adminNotes && (
                          <div style={{
                            marginTop: '8px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.8rem',
                            color: '#475569'
                          }}>
                            <span style={{ fontWeight: 700, color: '#334155' }}>Administrator Review: </span>
                            {leave.adminNotes}
                            {leave.reviewedAt && (
                              <span style={{ color: '#94a3b8', marginLeft: '6px' }}>
                                ({formatDateSafe(leave.reviewedAt)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Cancel Button (Available for Pending leaves) */}
                      {isPending && (
                        <div>
                          <button
                            onClick={() => handleCancelLeave(leave._id)}
                            disabled={cancellingLeaveId === leave._id}
                            className="btn btn-sm"
                            style={{
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#e11d48',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {cancellingLeaveId === leave._id ? (
                              <Loader2 size={12} className="spinner" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            Cancel Request
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 3: WORKING HOURS & TODAY'S APPOINTMENT SLOTS             */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'schedule' && (
          <div>
            <div className="glass-panel" style={{ padding: '26px', background: 'white', borderRadius: '18px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} style={{ color: '#4f46e5' }} /> Weekly Shift & Consultation Hours
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem', fontWeight: 700 }}
                >
                  <Edit2 size={13} /> Edit Shift
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '0.86rem' }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px' }}>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Consultation Hours</span>
                  <strong style={{ fontSize: '1rem', color: '#1e1b4b' }}>{doctorProfile.startTime} - {doctorProfile.endTime}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px' }}>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Lunch Break</span>
                  <strong style={{ fontSize: '1rem', color: '#92400e' }}>{doctorProfile.breakStart} - {doctorProfile.breakEnd}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px' }}>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Weekly Days</span>
                  <strong style={{ fontSize: '0.9rem', color: '#047857' }}>
                    {doctorProfile.availableDays.join(', ')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Today's Generated Slots */}
            <div className="glass-panel" style={{ padding: '26px', background: 'white', borderRadius: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Today's Active 40-Minute Slot Inventory ({todaySlots.length})
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  Synchronized with Patient Booking Engine
                </span>
              </div>

              {todaySlots.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No slots scheduled for today (Today may be an off-day, a declared clinic holiday, or during an approved leave period).
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {todaySlots.map(slot => (
                    <span
                      key={slot._id || slot.startTime}
                      style={{
                        background: slot.status === 'booked' ? '#e0e7ff' : '#f8fafc',
                        border: `1px solid ${slot.status === 'booked' ? '#a5b4fc' : '#cbd5e1'}`,
                        color: slot.status === 'booked' ? '#3730a3' : '#1e1b4b',
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Clock size={13} style={{ color: slot.status === 'booked' ? '#4f46e5' : '#64748b' }} />
                      {slot.startTime} - {slot.endTime}
                      {slot.status === 'booked' && (
                        <span style={{ fontSize: '0.68rem', background: '#4f46e5', color: 'white', padding: '1px 5px', borderRadius: '4px' }}>
                          Booked
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 4: CLINIC HOLIDAYS & OFFICIAL CLOSURES                   */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'holidays' && (
          <div className="glass-panel" style={{ padding: '26px', background: 'white', borderRadius: '18px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Official Ethiopian National Holidays & Clinic Closures
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '4px 0 0' }}>
                On these admin-declared closure dates, the automatic slot generator halts creation of appointment slots.
              </p>
            </div>

            {holidays.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                No upcoming clinic holidays currently configured in the clinic calendar.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {holidays.map(h => (
                  <div
                    key={h._id || h.date}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <strong style={{ color: '#1e1b4b', fontSize: '0.92rem' }}>{h.name}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#b91c1c', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        Closed
                      </span>
                    </div>
                    <div style={{ color: '#4f46e5', fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px' }}>
                      📅 {h.date}
                    </div>
                    {h.description && (
                      <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                        {h.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 🏖️ REQUEST LEAVE / ABSENCE MODAL                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showLeaveModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 100
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            background: 'white',
            borderRadius: '20px',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
          }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: '#eef2ff',
                  color: '#4338ca',
                  display: 'inline-block',
                  marginBottom: '4px'
                }}>
                  Attending Physician Self-Service
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Request Leave / Absence (የዕረፍት ጥያቄ)
                </h3>
              </div>

              <button
                onClick={() => setShowLeaveModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRequestLeave}>
              {/* Start & End Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Leave Start Date (መነሻ)</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={newLeaveForm.startDate}
                    onChange={(e) => setNewLeaveForm({ ...newLeaveForm, startDate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Leave End Date (መድረሻ)</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={newLeaveForm.endDate}
                    onChange={(e) => setNewLeaveForm({ ...newLeaveForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Leave Reason Preset */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Absence Category / Type</label>
                <select
                  className="form-control"
                  value={newLeaveForm.reasonPreset}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, reasonPreset: e.target.value })}
                >
                  <option value="Annual Vacation">Annual Vacation (የዓመት ዕረፍት)</option>
                  <option value="Medical Conference / CPD Training">Medical Conference / CPD Training</option>
                  <option value="Sick Leave / Medical Care">Sick Leave / Medical Care (የህመም ፈቃድ)</option>
                  <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                  <option value="Family / Personal Matter">Family / Personal Matter</option>
                  <option value="Other / Special Exemption">Other / Special Exemption</option>
                </select>
              </div>

              {/* Custom Notes */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Additional Details / Remarks (Optional)</label>
                <textarea
                  rows={2}
                  className="form-control"
                  value={newLeaveForm.customReason}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, customReason: e.target.value })}
                  placeholder="Provide any specific context for clinic administration review..."
                />
              </div>

              {/* Notice */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: '#64748b',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Info size={16} style={{ color: '#4f46e5', flexShrink: 0 }} />
                <span>
                  Once approved by the clinic admin, available consultation slots during this date range will be automatically unbooked and unlisted from the patient directory.
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="btn btn-secondary"
                  disabled={submittingLeave}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontWeight: 800 }}
                  disabled={submittingLeave}
                >
                  {submittingLeave ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Submitting Request...
                    </>
                  ) : (
                    <>
                      <Send size={15} /> Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
