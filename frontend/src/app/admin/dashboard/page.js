'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRequireRole } from '@/lib/useRequireRole';
import { clinicToday, formatClinicRange } from '@/lib/time';
import { useClinic } from '@/context/ClinicContext';
import {
  Users,
  User,
  Stethoscope,
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Plus,
  Activity,
  Phone,
  CreditCard,
  X,
  FileText,
  TrendingUp,
  Shield,
  BadgeCheck,
  ChevronRight,
  Eye,
  UserPlus,
  RefreshCw,
  MapPin,
  Check,
  Ban,
  ArrowRight,
  CalendarOff,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Building2,
  ClipboardList,
  Copy,
  CheckCheck,
  Key
} from 'lucide-react';
import API, { clinicApi, appointmentApi } from '@/lib/api';

function AdminDashboardContent() {
  // Admin-only page: redirects to /login (or the user's own home) otherwise
  const { user, mounted, allowed } = useRequireRole('admin');
  const { clinicName, clinicLogo } = useClinic();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');

  const getInitialTab = () => {
    if (!tabParam) return 'taken_slots';
    if (['taken_slots', 'open_slots', 'doctors', 'treated', 'doctor_leaves', 'receptionists'].includes(tabParam)) {
      return tabParam;
    }
    if (tabParam === 'slots') return 'taken_slots';
    if (tabParam === 'leaves') return 'doctor_leaves';
    return 'taken_slots';
  };

  // Active Main Tab: 'taken_slots' | 'open_slots' | 'doctors' | 'treated' | 'doctor_leaves' | 'receptionists'
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    if (tabParam) {
      if (['taken_slots', 'open_slots', 'doctors', 'treated', 'doctor_leaves', 'receptionists'].includes(tabParam)) {
        setActiveTab(tabParam);
      } else if (tabParam === 'slots') {
        setActiveTab('taken_slots');
      } else if (tabParam === 'leaves') {
        setActiveTab('doctor_leaves');
      }
    } else {
      setActiveTab('taken_slots');
    }
  }, [tabParam]);

  useEffect(() => {
    const syncFromUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t) {
          if (['taken_slots', 'open_slots', 'doctors', 'treated', 'doctor_leaves', 'receptionists'].includes(t)) {
            setActiveTab(t);
          } else if (t === 'slots') setActiveTab('taken_slots');
          else if (t === 'leaves') setActiveTab('doctor_leaves');
        } else {
          setActiveTab('taken_slots');
        }
      } catch (err) {}
    };

    const handleTabEvent = (e) => {
      const t = e.detail?.tab;
      if (t) {
        if (['taken_slots', 'open_slots', 'doctors', 'treated', 'doctor_leaves', 'receptionists'].includes(t)) {
          setActiveTab(t);
        } else if (t === 'slots') setActiveTab('taken_slots');
        else if (t === 'leaves') setActiveTab('doctor_leaves');
      } else {
        setActiveTab('taken_slots');
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
    router.replace(`/admin/dashboard?tab=${tabKey}`, { scroll: false });
    window.dispatchEvent(
      new CustomEvent('app:tab-change', {
        detail: { path: '/admin/dashboard', tab: tabKey }
      })
    );
  };

  // Search & Filter State for Taken Slots
  const [searchPatient, setSearchPatient] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'scheduled' | 'completed' | 'cancelled'
  const [filterDate, setFilterDate] = useState(() => clinicToday()); // 'YYYY-MM-DD' (Addis Ababa)

  // Modal States
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showPatientDetailModal, setShowPatientDetailModal] = useState(null);
  const [notification, setNotification] = useState('');

  // ── DOCTOR LEAVES (ADMIN REVIEW & APPROVAL) ──────────────────────
  const [adminLeaves, setAdminLeaves] = useState([]);
  const [adminLeaveFilter, setAdminLeaveFilter] = useState('all');
  const [loadingAdminLeaves, setLoadingAdminLeaves] = useState(false);
  const [leaveReviewModal, setLeaveReviewModal] = useState(null); // { doctorId, leaveId, status }
  const [adminReviewNotes, setAdminReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // ── RECEPTIONIST STAFF MANAGEMENT ───────────────────────────────
  const [receptionists, setReceptionists] = useState([]);
  const [loadingReceptionists, setLoadingReceptionists] = useState(false);
  const [showAddReceptionistModal, setShowAddReceptionistModal] = useState(false);
  const [receptionistForm, setReceptionistForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    gender: 'female',
    address: 'Addis Ababa, Bole'
  });
  const [submittingReceptionist, setSubmittingReceptionist] = useState(false);
  const [receptionistError, setReceptionistError] = useState('');
  const [createdReceptionistCreds, setCreatedReceptionistCreds] = useState(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const fetchReceptionists = async () => {
    setLoadingReceptionists(true);
    try {
      const res = await API.get('/users/admin/receptionists');
      if (res.data?.success) {
        setReceptionists(res.data.data || []);
      }
    } catch (err) {
      notify(`❌ Could not load receptionists: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoadingReceptionists(false);
    }
  };

  const handleToggleReceptionist = async (id) => {
    try {
      const res = await API.patch(`/users/admin/receptionists/${id}/toggle`);
      if (res.data?.success) {
        setReceptionists(prev => prev.map(r => r._id === id ? { ...r, isActive: !r.isActive } : r));
        setNotification(res.data.message || 'Receptionist status updated successfully');
        setTimeout(() => setNotification(''), 4000);
      }
    } catch (err) {
      setNotification(err.response?.data?.message || 'Failed to toggle receptionist status');
      setTimeout(() => setNotification(''), 4000);
    }
  };

  const handleCreateReceptionistSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReceptionist(true);
    setReceptionistError('');
    try {
      const res = await API.post('/users/admin/receptionist', receptionistForm);
      if (res.data?.success) {
        setCreatedReceptionistCreds({
          name: receptionistForm.name,
          email: receptionistForm.email,
          password: receptionistForm.password,
          phone: receptionistForm.phoneNumber
        });
        fetchReceptionists();
        setReceptionistForm({
          name: '',
          email: '',
          phoneNumber: '',
          password: '',
          gender: 'female',
          address: 'Addis Ababa, Bole'
        });
      }
    } catch (err) {
      setReceptionistError(err.response?.data?.message || 'Failed to onboard receptionist');
    } finally {
      setSubmittingReceptionist(false);
    }
  };

  const fetchAdminLeaves = async () => {
    setLoadingAdminLeaves(true);
    try {
      const res = await clinicApi.get('/admin/doctor-leaves');
      if (res.data?.success) {
        setAdminLeaves(res.data.data || []);
      }
    } catch (err) {
      notify(`❌ Could not load doctor leave requests: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoadingAdminLeaves(false);
    }
  };

  // ── LIVE DOCTOR ROSTER API CALL ─────────────────────────────────
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await clinicApi.get('/getAllDoctors?all=true');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const mapped = res.data.data.map((doc, idx) => {
          const account = doc.accountDetails && typeof doc.accountDetails === 'object' ? doc.accountDetails : {};
          const rawName = account.fullName || doc.name || `Staff Physician ${idx + 1}`;
          const formattedName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
          const workingDaysStr = Array.isArray(doc.availableDays) && doc.availableDays.length > 0
            ? doc.availableDays.map(d => (typeof d === 'string' ? d.slice(0, 3) : d)).join(', ')
            : 'Mon, Tue, Wed, Thu, Fri';
          const shiftStr = doc.startTime ? formatClinicRange(doc.startTime, doc.endTime) : '—';

          return {
            id: doc._id || doc.id || doc.userId,
            _id: doc._id,
            name: formattedName,
            specialty: doc.specialization || 'General Practice',
            licenseNumber: doc.licenseNumber || 'Not recorded',
            email: account.email || doc.email || 'N/A',
            phone: account.phoneNumber || doc.phone || 'Not provided',
            room: doc.room || null,
            shift: shiftStr,
            workingDays: workingDaysStr,
            active: doc.isActive !== undefined ? doc.isActive : true,
            yearsOfExperience: doc.yearsOfExperience || 0,
            bio: doc.bio || ''
          };
        });
        setDoctorsList(mapped);
      }
    } catch (err) {
      notify(`❌ Could not load the doctor roster: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    fetchAdminLeaves();
    fetchDoctors();
    fetchReceptionists();
    fetchTreated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const handleReviewLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveReviewModal) return;
    const { doctorId, leaveId, status } = leaveReviewModal;
    setSubmittingReview(true);

    try {
      const res = await clinicApi.patch(`/admin/doctor-leaves/${doctorId}/${leaveId}`, {
        status,
        adminNotes: adminReviewNotes.trim() || (status === 'approved' ? 'Approved by administrator' : status === 'terminated' ? 'Terminated early by administrator' : 'Rejected by administrator')
      });

      if (res.data?.success) {
        const removed = res.data.data?.unbookedSlotsRemoved || 0;
        const notice = res.data.data?.bookedAppointmentsNotice || '';
        const regCount = res.data.data?.regeneratedDatesCount || 0;
        const msg = status === 'approved'
          ? `🎉 Leave request approved! Automatically removed ${removed} unbooked slot(s). ${notice}`
          : status === 'terminated'
          ? `🛑 Doctor leave terminated early! Schedule restored and slots generated for ${regCount} day(s).`
          : `❌ Leave request has been rejected.`;
        setNotification(msg);
        setLeaveReviewModal(null);
        setAdminReviewNotes('');
        fetchAdminLeaves();
        setTimeout(() => setNotification(''), 7000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to review doctor leave request.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── DOCTOR ROSTER DATA (INITIALIZED FROM API) ───────────────────
  const [doctorsList, setDoctorsList] = useState([]);

  // ── CREATE DOCTOR (POST /users/admin/doctor: login account + clinic profile) ──
  const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const emptyDoctorForm = {
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    gender: 'other',
    address: '',
    specialization: '',
    licenseNumber: '',
    yearsOfExperience: '',
    bio: '',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '08:30',
    endTime: '17:00',
    breakStart: '12:30',
    breakEnd: '13:30'
  };
  const [newDoctorForm, setNewDoctorForm] = useState(emptyDoctorForm);
  const [submittingDoctor, setSubmittingDoctor] = useState(false);
  const [doctorFormError, setDoctorFormError] = useState('');

  const notify = (msg, ms = 4000) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), ms);
  };

  /** Turn a backend error response into readable text (validation errors list every problem). */
  const apiErrorText = (err, fallback) => {
    const data = err?.response?.data;
    const details = Array.isArray(data?.errors) ? data.errors.map((e) => e.message).filter(Boolean) : [];
    const unique = [...new Set([data?.message, ...details].filter(Boolean))];
    return unique.length ? unique.join(' • ') : (err?.message || fallback);
  };

  // ── APPOINTMENTS (live from appointment-service) ──────────────
  const [dayAppointments, setDayAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState('');

  const [treatedAppointments, setTreatedAppointments] = useState([]);
  const [loadingTreated, setLoadingTreated] = useState(false);
  const [treatedError, setTreatedError] = useState('');

  const [openSlotsRaw, setOpenSlotsRaw] = useState([]);
  const [loadingOpenSlots, setLoadingOpenSlots] = useState(false);
  const [openSlotsError, setOpenSlotsError] = useState('');

  const fetchDayAppointments = async (date = filterDate) => {
    setLoadingAppointments(true);
    setAppointmentsError('');
    try {
      const res = await appointmentApi.get('/appointments', { params: { date } });
      setDayAppointments(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setDayAppointments([]);
      setAppointmentsError(apiErrorText(err, 'Could not load appointments.'));
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchTreated = async () => {
    setLoadingTreated(true);
    setTreatedError('');
    try {
      const res = await appointmentApi.get('/appointments', { params: { status: 'completed' } });
      setTreatedAppointments(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setTreatedAppointments([]);
      setTreatedError(apiErrorText(err, 'Could not load completed visits.'));
    } finally {
      setLoadingTreated(false);
    }
  };

  // Free slots per active doctor for the selected date (slots are generated by the backend)
  const fetchOpenSlots = async (date = filterDate, doctors = doctorsList) => {
    const activeDoctors = doctors.filter((d) => d.active);
    if (activeDoctors.length === 0) {
      setOpenSlotsRaw([]);
      return;
    }
    setLoadingOpenSlots(true);
    setOpenSlotsError('');
    const results = await Promise.allSettled(
      activeDoctors.map((doc) => clinicApi.get(`/${doc.id}/slots`, { params: { date } }))
    );
    const slots = [];
    let failures = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && Array.isArray(r.value.data?.data)) {
        r.value.data.data.forEach((slot) => slots.push({ ...slot, doctorId: slot.doctorId || activeDoctors[i].id }));
      } else {
        failures += 1;
      }
    });
    slots.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    setOpenSlotsRaw(slots);
    if (failures > 0) {
      setOpenSlotsError(`Could not load slots for ${failures} of ${activeDoctors.length} doctor(s).`);
    }
    setLoadingOpenSlots(false);
  };

  useEffect(() => {
    if (allowed) fetchDayAppointments(filterDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, filterDate]);

  useEffect(() => {
    if (allowed) fetchOpenSlots(filterDate, doctorsList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, filterDate, doctorsList]);

  // Map backend records into the shape the cards below render
  const doctorById = (id) => doctorsList.find((d) => String(d.id) === String(id));
  const toRow = (apt) => {
    const doc = doctorById(apt.doctorId);
    return {
      id: apt._id,
      slotTime: apt.startTime ? formatClinicRange(apt.startTime, apt.endTime) : '—',
      date: apt.date,
      patientName: apt.patientName || 'Patient',
      forPerson: apt.forPerson || 'Self',
      cardNumber: apt.cardNumber || '—',
      doctorId: apt.doctorId,
      doctorName: doc?.name || 'Doctor',
      specialty: doc?.specialty || '',
      chiefComplaint: apt.reasonForVisit || 'Not provided',
      status: apt.status,
      queueNumber: apt.queueNumber,
      doctorNotes: apt.doctorNotes,
      prescription: apt.prescription,
      followUpDate: apt.followUpDate,
      cancelReason: apt.cancelReason
    };
  };
  const takenSlots = dayAppointments.map(toRow);
  const treatedPatients = treatedAppointments.map(toRow);
  const openSlots = openSlotsRaw.map((slot) => {
    const doc = doctorById(slot.doctorId);
    return {
      id: slot._id,
      doctorId: slot.doctorId,
      doctorName: doc?.name || 'Doctor',
      specialty: doc?.specialty || '',
      time: formatClinicRange(slot.startTime, slot.endTime),
      date: slot.date,
      duration: '40 mins'
    };
  });

  // Filtered Taken Slots
  const filteredTakenSlots = takenSlots.filter((slot) => {
    const q = searchPatient.trim().toLowerCase();
    const matchesDoctor = filterDoctor === 'all' || String(slot.doctorId) === String(filterDoctor);
    const matchesStatus = filterStatus === 'all' || slot.status === filterStatus;
    const matchesSearch =
      q === '' ||
      slot.patientName.toLowerCase().includes(q) ||
      slot.cardNumber.toLowerCase().includes(q) ||
      slot.forPerson.toLowerCase().includes(q);
    return matchesDoctor && matchesStatus && matchesSearch;
  });

  // Cancel an appointment (admin: reason required). The slot becomes bookable again.
  const handleCancelSlot = async (slotId) => {
    const slot = takenSlots.find((s) => s.id === slotId);
    if (!slot) return;
    const reason = window.prompt(`Reason for cancelling ${slot.patientName}'s ${slot.slotTime} appointment (required):`);
    if (reason === null) return;
    if (!reason.trim()) {
      notify('❌ A cancellation reason is required.');
      return;
    }
    try {
      await appointmentApi.patch(`/appointments/${slotId}/cancel`, { cancelReason: reason.trim() });
      notify(`Appointment cancelled. Slot ${slot.slotTime} is bookable again.`);
      fetchDayAppointments();
      fetchOpenSlots();
    } catch (err) {
      notify(`❌ ${apiErrorText(err, 'Could not cancel the appointment.')}`, 7000);
    }
  };

  // Create a doctor: login account + clinic profile in one request (rolled back by the backend on failure)
  const handleAddDoctorSubmit = async (e) => {
    e.preventDefault();
    setDoctorFormError('');
    const f = newDoctorForm;
    if (f.availableDays.length === 0) {
      setDoctorFormError('Select at least one working day.');
      return;
    }
    if (Boolean(f.breakStart) !== Boolean(f.breakEnd)) {
      setDoctorFormError('Provide both break start and break end, or leave both empty.');
      return;
    }

    const body = {
      name: f.name.trim(),
      email: f.email.trim(),
      phoneNumber: f.phoneNumber.trim(),
      password: f.password,
      gender: f.gender,
      specialization: f.specialization.trim(),
      licenseNumber: f.licenseNumber.trim(),
      availableDays: f.availableDays,
      startTime: f.startTime,
      endTime: f.endTime
    };
    if (f.address.trim()) body.address = f.address.trim();
    if (f.bio.trim()) body.bio = f.bio.trim();
    if (f.yearsOfExperience !== '') body.yearsOfExperience = Number(f.yearsOfExperience);
    if (f.breakStart && f.breakEnd) {
      body.breakStart = f.breakStart;
      body.breakEnd = f.breakEnd;
    }

    setSubmittingDoctor(true);
    try {
      await API.post('/users/admin/doctor', body);
      setShowAddDoctorModal(false);
      setNewDoctorForm(emptyDoctorForm);
      notify(`✅ Dr. ${body.name} created. They can log in with ${body.email} and the password you set.`, 7000);
      fetchDoctors();
    } catch (err) {
      setDoctorFormError(apiErrorText(err, 'Could not create the doctor.'));
    } finally {
      setSubmittingDoctor(false);
    }
  };

  // Toggle Doctor Active Status (Persisted to Database). Deactivating also cancels the doctor's
  // upcoming appointments; if that fails the backend rolls everything back and we show why.
  const handleToggleDoctorStatus = async (doctorId) => {
    const targetDoc = doctorsList.find(d => d.id === doctorId);
    if (!targetDoc) return;
    const nextState = !targetDoc.active;
    if (!nextState && !confirm(`Deactivate ${targetDoc.name}? All of their upcoming appointments will be cancelled.`)) {
      return;
    }

    try {
      const res = await clinicApi.patch(`/admin/toggleDoctorStatus/${doctorId}`, {
        isActive: nextState
      });
      notify(`✅ ${res.data?.message || `${targetDoc.name} marked as ${nextState ? 'Active' : 'Inactive'}`}`, 6000);
      fetchDoctors();
      fetchDayAppointments();
    } catch (err) {
      notify(`❌ ${apiErrorText(err, 'Could not change the doctor status.')}`, 8000);
    }
  };

  if (!allowed) {
    return (
      <div
        suppressHydrationWarning
        style={{
          backgroundColor: 'var(--bg-page)',
          minHeight: '94vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '28px 0 60px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
          <div className="spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent' }} />
          Loading Administrator Portal...
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning style={{ backgroundColor: 'var(--bg-page)', minHeight: '94vh', padding: '28px 0 60px' }}>
      <div className="container" suppressHydrationWarning>

        {/* ── HEADER BANNER ────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          color: 'white',
          marginBottom: '28px',
          boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {clinicLogo && (
              <div
                style={{
                  width: '64px',
                  height: '64px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px'
                }}>
                  👑 CLINIC ADMIN & RECEPTION DESK
                </span>
                <span style={{
                  background: '#10b981',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  LIVE SYNC
                </span>
              </div>
              <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
                {clinicName} Operations & Slot Management
              </h1>
              <p style={{ margin: 0, opacity: 0.85, fontSize: '0.95rem' }}>
                Manage taken & open slots, assign walk-in patients, onboard physicians, and monitor clinical volume.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAddDoctorModal(true)}
              className="btn"
              style={{
                background: '#ffffff',
                color: '#312e81',
                fontWeight: 700,
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
              }}
            >
              <UserPlus size={17} /> Add New Doctor
            </button>
            <Link
              href="/admin/clinic"
              className="btn"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 700,
                borderRadius: '12px'
              }}
            >
              <Building2 size={17} /> Clinic Profile
            </Link>
            <Link
              href="/admin/analytics"
              className="btn"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 700,
                borderRadius: '12px'
              }}
            >
              <TrendingUp size={17} /> Clinic Analytics & Revenue
            </Link>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            padding: '12px 18px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '0.92rem',
            boxShadow: '0 4px 12px rgba(4, 120, 87, 0.1)'
          }}>
            <CheckCircle2 size={18} />
            <span>{notification}</span>
          </div>
        )}

        {/* Pending Doctor Leaves Urgent Banner */}
        {adminLeaves.filter(l => l.status === 'pending').length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fde68a',
            color: '#92400e',
            padding: '16px 20px',
            borderRadius: '16px',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: '#f59e0b',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.1rem'
              }}>
                {adminLeaves.filter(l => l.status === 'pending').length}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#78350f' }}>
                  Doctor Leave Requests Awaiting Admin Approval
                </div>
                <div style={{ fontSize: '0.86rem', color: '#b45309' }}>
                  Physicians have submitted upcoming absence requests. Approving will update staff schedules and auto-remove unbooked slots.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setActiveTab('doctor_leaves');
                  fetchAdminLeaves();
                }}
                className="btn btn-sm"
                style={{ background: '#b45309', color: 'white', fontWeight: 700, borderRadius: '8px' }}
              >
                Review in Tab ({adminLeaves.filter(l => l.status === 'pending').length})
              </button>
              <Link
                href="/admin/clinic"
                className="btn btn-sm btn-secondary"
                style={{ fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Building2 size={14} /> Clinic Facility Page
              </Link>
            </div>
          </div>
        )}

        {/* ── TOP KPI QUICK METRICS ───────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}>
          {/* Total Taken Slots */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#e0e7ff',
              color: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Booked on {filterDate}</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {takenSlots.filter(s => s.status !== 'cancelled').length}
              </div>
            </div>
          </div>

          {/* Open Slots Available */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Open Slots on {filterDate}</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {openSlots.length}
              </div>
            </div>
          </div>

          {/* Total Doctors on Staff */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#fef3c7',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Stethoscope size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Doctors on Staff</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {doctorsList.length} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a' }}>({doctorsList.filter(d => d.active).length} Active)</span>
              </div>
            </div>
          </div>

          {/* Total Treated Patients */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#f1f5f9',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Treated Patients</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {treatedPatients.length}
              </div>
            </div>
          </div>

          {/* Total Doctor Leaves */}
          <div
            className="glass-panel"
            onClick={() => {
              setActiveTab('doctor_leaves');
              fetchAdminLeaves();
            }}
            style={{
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              border: adminLeaves.filter(l => l.status === 'pending').length > 0 ? '1px solid #fde68a' : undefined
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: adminLeaves.filter(l => l.status === 'pending').length > 0 ? '#fef3c7' : '#f1f5f9',
              color: adminLeaves.filter(l => l.status === 'pending').length > 0 ? '#b45309' : '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CalendarOff size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Doctor Leaves</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {adminLeaves.length}
                {adminLeaves.filter(l => l.status === 'pending').length > 0 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '9999px' }}>
                    {adminLeaves.filter(l => l.status === 'pending').length} Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN NAVIGATION TABS ─────────────────────────────────── */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '24px',
          gap: '8px',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => handleTabChange('taken_slots')}
            style={{
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'taken_slots' ? '#4f46e5' : 'var(--text-muted)',
              borderBottom: activeTab === 'taken_slots' ? '3px solid #4f46e5' : '3px solid transparent',
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
            <Calendar size={18} /> Taken Slots ({takenSlots.length})
          </button>

          <button
            onClick={() => handleTabChange('open_slots')}
            style={{
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'open_slots' ? '#4f46e5' : 'var(--text-muted)',
              borderBottom: activeTab === 'open_slots' ? '3px solid #4f46e5' : '3px solid transparent',
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
            <Clock size={18} /> Open Slots ({openSlots.length})
          </button>

          <button
            onClick={() => {
              handleTabChange('doctors');
              fetchDoctors();
            }}
            style={{
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'doctors' ? '#4f46e5' : 'var(--text-muted)',
              borderBottom: activeTab === 'doctors' ? '3px solid #4f46e5' : '3px solid transparent',
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
            <Stethoscope size={18} /> Doctor Roster & Staff ({doctorsList.length})
          </button>

          <button
            onClick={() => handleTabChange('treated')}
            style={{
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'treated' ? '#4f46e5' : 'var(--text-muted)',
              borderBottom: activeTab === 'treated' ? '3px solid #4f46e5' : '3px solid transparent',
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
            <CheckCircle2 size={18} /> Treated Patients ({treatedPatients.length})
          </button>

          <button
            onClick={() => {
              handleTabChange('doctor_leaves');
              fetchAdminLeaves();
            }}
            style={{
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'doctor_leaves' ? '#4f46e5' : 'var(--text-muted)',
              borderBottom: activeTab === 'doctor_leaves' ? '3px solid #4f46e5' : '3px solid transparent',
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
            <CalendarOff size={18} /> Doctor Leaves ({adminLeaves.length})
            {adminLeaves.filter(l => l.status === 'pending').length > 0 && (
              <span style={{
                background: '#f59e0b',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 900
              }}>
                {adminLeaves.filter(l => l.status === 'pending').length} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => {
              handleTabChange('receptionists');
              fetchReceptionists();
            }}
            style={{
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: activeTab === 'receptionists' ? '#4f46e5' : 'var(--text-muted)',
              borderBottom: activeTab === 'receptionists' ? '3px solid #4f46e5' : '3px solid transparent',
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
            <ClipboardList size={18} /> Front Desk Staff ({receptionists.length})
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: TAKEN SLOTS (ALL BOOKED APPOINTMENTS & FILTERS)        */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'taken_slots' && (
          <div>
            {/* Filter Toolbar */}
            <div className="glass-panel" style={{ padding: '18px 24px', marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '14px',
                justifyContent: 'space-between'
              }}>
                {/* Search by Patient Name / Card Number */}
                <div style={{ position: 'relative', flex: '1 1 260px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by patient name, card number, or phone..."
                    value={searchPatient}
                    onChange={(e) => setSearchPatient(e.target.value)}
                    style={{ paddingLeft: '38px', height: '42px', fontSize: '0.88rem' }}
                  />
                  {searchPatient && (
                    <button
                      onClick={() => setSearchPatient('')}
                      style={{ position: 'absolute', right: '10px', top: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date:</span>
                  <input
                    type="date"
                    className="form-control"
                    value={filterDate}
                    onChange={(e) => e.target.value && setFilterDate(e.target.value)}
                    style={{ height: '42px', fontSize: '0.88rem' }}
                  />
                </div>

                {/* Filter by Doctor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Doctor:</span>
                  <select
                    className="form-control"
                    value={filterDoctor}
                    onChange={(e) => setFilterDoctor(e.target.value)}
                    style={{ height: '42px', minWidth: '180px', fontSize: '0.88rem' }}
                  >
                    <option value="all">All Doctors ({doctorsList.length})</option>
                    {doctorsList.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
                  <select
                    className="form-control"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ height: '42px', minWidth: '150px', fontSize: '0.88rem' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Quick Reset Button */}
                {(searchPatient || filterDoctor !== 'all' || filterStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchPatient('');
                      setFilterDoctor('all');
                      setFilterStatus('all');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '42px' }}
                  >
                    <RefreshCw size={14} /> Reset
                  </button>
                )}
              </div>
            </div>

            {/* Results Counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <div>
                {loadingAppointments
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Loader2 size={15} className="spin-icon" /> Loading appointments…</span>
                  : <>Showing <strong>{filteredTakenSlots.length}</strong> appointments for {filterDate}</>}
              </div>
              <button
                onClick={() => setActiveTab('open_slots')}
                style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>View {openSlots.length} Open Slots</span> <ChevronRight size={15} />
              </button>
            </div>

            {appointmentsError && (
              <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '14px', borderLeft: '4px solid #e11d48', color: '#b91c1c', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <span><AlertCircle size={16} style={{ verticalAlign: 'middle' }} /> {appointmentsError}</span>
                <button onClick={() => fetchDayAppointments()} className="btn btn-secondary btn-sm"><RefreshCw size={14} /> Retry</button>
              </div>
            )}

            {/* Slot Cards List */}
            {loadingAppointments ? null : filteredTakenSlots.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Calendar size={48} style={{ color: '#cbd5e1', margin: '0 auto 14px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px' }}>
                  No Appointments Found
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 20px' }}>
                  {takenSlots.length === 0
                    ? `No appointments are booked for ${filterDate}.`
                    : 'No appointments match your current filters. Adjust the doctor/status selection or clear the search.'}
                </p>
                <button
                  onClick={() => { setSearchPatient(''); setFilterDoctor('all'); setFilterStatus('all'); }}
                  className="btn btn-secondary btn-sm"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredTakenSlots.map((slot) => {
                  const statusColors = {
                    scheduled: { bg: '#e0e7ff', color: '#4338ca', label: 'Scheduled' },
                    completed: { bg: '#dcfce7', color: '#15803d', label: 'Treated & Completed ✓' },
                    cancelled: { bg: '#fee2e2', color: '#b91c1c', label: 'Cancelled' }
                  };
                  const currentStatus = statusColors[slot.status] || statusColors.scheduled;

                  return (
                    <div
                      key={slot.id}
                      className="glass-panel"
                      style={{
                        padding: '20px 24px',
                        borderLeft: `5px solid ${slot.status === 'cancelled' ? '#e11d48' : slot.status === 'completed' ? '#10b981' : '#4f46e5'}`,
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        
                        {/* Left: Slot Time & Patient Info */}
                        <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                          {/* Slot Time Box */}
                          <div style={{
                            background: '#f8fafc',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            textAlign: 'center',
                            minWidth: '105px'
                          }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                              SLOT TIME
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4f46e5', marginTop: '2px' }}>
                              {slot.slotTime}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                              {slot.date}
                            </div>
                          </div>

                          {/* Patient Details */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                                {slot.patientName}
                              </h3>
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: '#f1f5f9',
                                color: '#475569',
                                fontWeight: 600
                              }}>
                                {slot.forPerson === 'Self' ? 'Account holder' : slot.forPerson}
                                {slot.queueNumber ? ` • Queue #${slot.queueNumber}` : ''}
                              </span>
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: '#ecfdf5',
                                color: '#047857',
                                fontWeight: 700,
                                border: '1px solid #a7f3d0'
                              }}>
                                💳 {slot.cardNumber}
                              </span>
                            </div>

                            {/* Attending Doctor */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '0.88rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Assigned Physician:</span>
                              <strong style={{ color: '#312e81', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Stethoscope size={15} color="#4f46e5" /> {slot.doctorName}
                              </strong>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>• {slot.specialty}</span>
                            </div>

                            {/* Chief Complaint */}
                            <div style={{
                              marginTop: '8px',
                              fontSize: '0.86rem',
                              color: '#334155',
                              background: '#f8fafc',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #f1f5f9'
                            }}>
                              <span style={{ fontWeight: 600, color: '#64748b' }}>Chief Complaint:</span> {slot.chiefComplaint}
                            </div>
                          </div>
                        </div>

                        {/* Right: Payment, Status & Quick Reception Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              background: currentStatus.bg,
                              color: currentStatus.color
                            }}>
                              {currentStatus.label}
                            </span>
                          </div>
                          {slot.status === 'cancelled' && slot.cancelReason && (
                            <div style={{ fontSize: '0.78rem', color: '#b91c1c', maxWidth: '260px', textAlign: 'right' }}>
                              Reason: {slot.cancelReason}
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                            <button
                              onClick={() => setShowPatientDetailModal(slot)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.8rem', padding: '6px 10px', borderRadius: '8px' }}
                            >
                              <Eye size={14} /> Full File
                            </button>

                            {slot.status !== 'completed' && slot.status !== 'cancelled' && (
                              <button
                                onClick={() => handleCancelSlot(slot.id)}
                                className="btn btn-sm"
                                style={{
                                  background: '#fff1f2',
                                  color: '#e11d48',
                                  border: '1px solid #fecdd3',
                                  fontSize: '0.8rem',
                                  padding: '6px 10px',
                                  borderRadius: '8px'
                                }}
                              >
                                <Ban size={14} /> Cancel Appointment
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: OPEN SLOTS & QUICK RESERVATION FOR RECEPTIONIST        */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'open_slots' && (
          <div>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)' }}>
                    Available Consultation Slots ({openSlots.length})
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Free 40-minute slots on <strong>{filterDate}</strong>, generated automatically from each doctor&apos;s schedule.
                    Walk-in and phone bookings are made from the <strong>Reception desk</strong>.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="date"
                    className="form-control"
                    value={filterDate}
                    onChange={(e) => e.target.value && setFilterDate(e.target.value)}
                    style={{ height: '36px', fontSize: '0.85rem' }}
                  />
                  <button
                    onClick={() => fetchOpenSlots()}
                    disabled={loadingOpenSlots}
                    className="btn btn-secondary btn-sm"
                  >
                    <RefreshCw size={14} className={loadingOpenSlots ? 'spin-icon' : ''} /> Refresh
                  </button>
                </div>
              </div>
            </div>

            {openSlotsError && (
              <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '14px', borderLeft: '4px solid #e11d48', color: '#b91c1c', fontSize: '0.88rem' }}>
                <AlertCircle size={16} style={{ verticalAlign: 'middle' }} /> {openSlotsError}
              </div>
            )}

            {loadingOpenSlots ? (
              <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={20} className="spin-icon" /> Loading free slots…
              </div>
            ) : openSlots.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Clock size={48} style={{ color: '#cbd5e1', margin: '0 auto 14px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px' }}>
                  No Free Slots
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 20px' }}>
                  There are no free slots on {filterDate}: they are all booked, the doctors are off, or it is a clinic holiday.
                </p>
                <button onClick={() => setShowAddDoctorModal(true)} className="btn btn-primary btn-sm">
                  <UserPlus size={15} /> Add Another Doctor
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '18px'
              }}>
                {openSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1.5px solid #e0e7ff',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      {/* Top Row: Time & Fee */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{
                          background: '#e0e7ff',
                          color: '#4338ca',
                          fontWeight: 800,
                          fontSize: '1rem',
                          padding: '4px 10px',
                          borderRadius: '8px'
                        }}>
                          {slot.time}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {slot.date}
                        </span>
                      </div>

                      {/* Doctor Details */}
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>
                        {slot.doctorName}
                      </h3>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        {slot.specialty}
                      </div>

                      {/* Room & Duration */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: '#64748b' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} /> {slot.duration}
                        </span>
                      </div>
                    </div>

                    {/* Booking happens at the Reception desk (real patient record required) */}
                    <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Free — book from the Reception desk
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: DOCTOR ROSTER & ADD DOCTORS (ሐኪሞች ማስተዳደር)           */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'doctors' && (
          <div>
            {/* Doctors Header Banner */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      Physician Staff Directory
                    </h2>
                    <span style={{
                      background: '#e0e7ff',
                      color: '#4338ca',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 800
                    }}>
                      {doctorsList.length} Total Doctors
                    </span>
                    <span style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 800
                    }}>
                      {doctorsList.filter(d => d.active).length} Active
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Active physicians authorized under the Ethiopian Ministry of Health (MOH) standards.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={fetchDoctors}
                    disabled={loadingDoctors}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} className={loadingDoctors ? 'spin-icon' : ''} />
                    {loadingDoctors ? 'Syncing...' : 'Refresh Directory'}
                  </button>
                  <button
                    onClick={() => setShowAddDoctorModal(true)}
                    className="btn btn-primary"
                    style={{ borderRadius: '12px' }}
                  >
                    <Plus size={16} /> Add New Doctor
                  </button>
                </div>
              </div>
            </div>

            {/* Doctors Grid / Empty State */}
            {loadingDoctors && doctorsList.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
                <Loader2 size={36} className="spin-icon" style={{ color: '#4f46e5', margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Loading Doctors & Staff from Database...</div>
              </div>
            ) : doctorsList.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
                <Stethoscope size={44} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px 0' }}>No Doctors Registered</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Click below to onboard your first physician to the clinic directory.
                </p>
                <button onClick={() => setShowAddDoctorModal(true)} className="btn btn-primary btn-sm">
                  <Plus size={15} /> Add New Doctor
                </button>
              </div>
            ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px'
            }}>
              {doctorsList.map((doc) => (
                <div
                  key={doc.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: `5px solid ${doc.active ? '#4f46e5' : '#94a3b8'}`
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: doc.active ? '#e0e7ff' : '#f1f5f9',
                          color: doc.active ? '#4338ca' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.1rem'
                        }}>
                          👨‍⚕️
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                            {doc.name}
                          </h3>
                          <div style={{ fontSize: '0.82rem', color: '#4f46e5', fontWeight: 600 }}>
                            {doc.specialty}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: doc.active ? '#dcfce7' : '#fee2e2',
                        color: doc.active ? '#15803d' : '#991b1b'
                      }}>
                        {doc.active ? 'Active' : 'On Leave'}
                      </span>
                    </div>

                    {/* Metadata Specs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.83rem', color: '#475569', marginTop: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>MOH License:</span>
                        <strong style={{ color: '#0f172a' }}>{doc.licenseNumber}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Room / Suite:</span>
                        <strong style={{ color: '#0f172a' }}>{doc.room}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Working Shift:</span>
                        <span>{doc.shift}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Working Days:</span>
                        <span>{doc.workingDays}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Contact:</span>
                        <span>{doc.phone}</span>
                      </div>
                    </div>

                    {/* Patients Handled Today */}
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      marginTop: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem'
                    }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Completed Visits:</span>
                      <strong style={{ color: '#4f46e5', fontSize: '1rem' }}>{treatedPatients.filter(t => String(t.doctorId) === String(doc.id)).length} Patients</strong>
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => handleToggleDoctorStatus(doc.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, fontSize: '0.8rem' }}
                    >
                      {doc.active ? 'Mark On Leave' : 'Mark Active'}
                    </button>
                    <button
                      onClick={() => {
                        setFilterDoctor(doc.id);
                        setActiveTab('taken_slots');
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, fontSize: '0.8rem' }}
                    >
                      View Appointments ({takenSlots.filter(s => String(s.doctorId) === String(doc.id) && s.status !== 'cancelled').length})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 4: TREATED PATIENTS HISTORY                               */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'treated' && (
          <div>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)' }}>
                    Completed & Treated Patients Roster ({treatedPatients.length})
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Finished consultations with the doctor&apos;s notes and prescriptions.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="btn btn-secondary btn-sm"
                >
                  Print Daily Treated Log
                </button>
              </div>
            </div>

            {treatedError && (
              <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '14px', borderLeft: '4px solid #e11d48', color: '#b91c1c', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <span><AlertCircle size={16} style={{ verticalAlign: 'middle' }} /> {treatedError}</span>
                <button onClick={fetchTreated} className="btn btn-secondary btn-sm"><RefreshCw size={14} /> Retry</button>
              </div>
            )}
            {loadingTreated && (
              <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={20} className="spin-icon" /> Loading completed visits…
              </div>
            )}
            {!loadingTreated && !treatedError && treatedPatients.length === 0 && (
              <div className="glass-panel" style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={40} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
                <div>No completed visits yet.</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {!loadingTreated && treatedPatients.map((treated) => (
                <div
                  key={treated.id}
                  className="glass-panel"
                  style={{
                    padding: '20px 24px',
                    borderLeft: '5px solid #10b981'
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                          {treated.patientName}
                        </h3>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#ecfdf5',
                          color: '#047857',
                          fontWeight: 700,
                          border: '1px solid #a7f3d0'
                        }}>
                          {treated.cardNumber}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: '#dcfce7',
                          color: '#15803d',
                          fontWeight: 700
                        }}>
                          Treated ✓
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Treated on <strong>{treated.date} ({treated.slotTime})</strong> by <strong>{treated.doctorName}</strong>{treated.specialty ? ` (${treated.specialty})` : ''}
                        {treated.forPerson && treated.forPerson !== 'Self' ? ` • for ${treated.forPerson}` : ''}
                      </div>

                      {/* Clinical Diagnosis Note */}
                      <div style={{
                        marginTop: '10px',
                        background: '#f8fafc',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.88rem'
                      }}>
                        <div style={{ fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                          Doctor&apos;s Notes: <span style={{ fontWeight: 500, color: '#0f172a' }}>{treated.doctorNotes || 'No notes recorded'}</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                          <strong>Prescribed Rx:</strong> {treated.prescription || 'None recorded'}
                        </div>
                      </div>
                    </div>

                    {/* Follow-up */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Follow-up</div>
                      <div style={{
                        marginTop: '4px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: '#e0e7ff',
                        color: '#4338ca',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-block'
                      }}>
                        {treated.followUpDate || 'None scheduled'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 5: DOCTOR LEAVE & ABSENCE REQUESTS (የሐኪሞች ፈቃድ ማፅደቂያ) */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'doctor_leaves' && (
          <div>
            {/* Header Banner */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      Physician Leave Requests & Review (የሐኪሞች ፈቃድ ማፅደቂያ)
                    </h2>
                    <span style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 800
                    }}>
                      {adminLeaves.filter(l => l.status === 'pending').length} Awaiting Review
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    Review submitted doctor leave requests. Approving a leave automatically purges unbooked appointment slots for that doctor during the leave dates.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href="/admin/clinic"
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Building2 size={14} /> Clinic Operations Page
                  </Link>
                  <button
                    onClick={fetchAdminLeaves}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} /> Refresh Requests
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>Filter Status:</span>
              {[
                { id: 'all', label: `All Requests (${adminLeaves.length})` },
                { id: 'pending', label: `Pending Review (${adminLeaves.filter(l => l.status === 'pending').length})` },
                { id: 'approved', label: `Approved (${adminLeaves.filter(l => l.status === 'approved').length})` },
                { id: 'rejected', label: `Rejected (${adminLeaves.filter(l => l.status === 'rejected').length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAdminLeaveFilter(tab.id)}
                  className={`btn btn-sm ${adminLeaveFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Leave Requests Cards */}
            {adminLeaves.filter(l => adminLeaveFilter === 'all' || l.status === adminLeaveFilter).length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', background: 'white' }}>
                <CalendarOff size={42} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>No doctor leave requests</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                  No leave requests currently match the selected filter.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {adminLeaves
                  .filter(l => adminLeaveFilter === 'all' || l.status === adminLeaveFilter)
                  .map((leave) => {
                    const isPending = leave.status === 'pending';
                    const isApproved = leave.status === 'approved';
                    const isRejected = leave.status === 'rejected';
                    const isTerminated = leave.status === 'terminated';

                    const borderCol = isApproved ? '#10b981' : isPending ? '#f59e0b' : isTerminated ? '#6366f1' : '#ef4444';
                    const badgeBg = isApproved ? '#ecfdf5' : isPending ? '#fef3c7' : isTerminated ? '#eef2ff' : '#fef2f2';
                    const badgeCol = isApproved ? '#047857' : isPending ? '#92400e' : isTerminated ? '#4338ca' : '#b91c1c';

                    return (
                      <div
                        key={leave.leaveId || leave._id}
                        className="glass-panel"
                        style={{
                          padding: '22px 26px',
                          background: 'white',
                          borderRadius: '16px',
                          borderLeft: `5px solid ${borderCol}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: '16px'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '8px',
                              background: badgeBg,
                              color: badgeCol,
                              fontWeight: 800,
                              fontSize: '0.76rem',
                              textTransform: 'uppercase'
                            }}>
                              ● {leave.status}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 700 }}>
                              {leave.specialization || 'Clinical Specialist'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              License: {leave.licenseNumber || 'MOH-CERT'}
                            </span>
                          </div>

                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                            📅 {leave.startDate} → {leave.endDate}
                          </div>

                          <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                            <strong>Reason:</strong> {leave.reason}
                          </div>

                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Doctor ID: <span style={{ fontFamily: 'monospace' }}>{leave.doctorId}</span> • Requested on {leave.createdAt ? new Date(leave.createdAt).toLocaleDateString() : 'N/A'}
                          </div>

                          {leave.adminNotes && (
                            <div style={{
                              marginTop: '10px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.82rem',
                              color: '#475569'
                            }}>
                              <span style={{ fontWeight: 700, color: '#334155' }}>Admin Feedback: </span>
                              {leave.adminNotes}
                              {leave.reviewedAt && (
                                <span style={{ color: '#94a3b8', marginLeft: '6px' }}>
                                  ({new Date(leave.reviewedAt).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions for Pending Requests */}
                        {isPending && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setLeaveReviewModal({
                                  doctorId: leave.doctorId,
                                  leaveId: leave.leaveId || leave._id,
                                  status: 'approved',
                                  startDate: leave.startDate,
                                  endDate: leave.endDate
                                });
                                setAdminReviewNotes('Approved by administrator. Unbooked slots cleaned.');
                              }}
                              className="btn btn-sm"
                              style={{
                                background: '#10b981',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderRadius: '8px'
                              }}
                            >
                              <Check size={14} /> Approve Leave
                            </button>

                            <button
                              onClick={() => {
                                setLeaveReviewModal({
                                  doctorId: leave.doctorId,
                                  leaveId: leave.leaveId || leave._id,
                                  status: 'rejected',
                                  startDate: leave.startDate,
                                  endDate: leave.endDate
                                });
                                setAdminReviewNotes('Leave request rejected due to clinic staffing coverage constraints.');
                              }}
                              className="btn btn-sm"
                              style={{
                                background: '#ef4444',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderRadius: '8px'
                              }}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        )}

                        {/* Actions for Approved Requests - Allow Early Termination */}
                        {isApproved && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setLeaveReviewModal({
                                  doctorId: leave.doctorId,
                                  leaveId: leave.leaveId || leave._id,
                                  status: 'terminated',
                                  startDate: leave.startDate,
                                  endDate: leave.endDate
                                });
                                setAdminReviewNotes('Doctor returned to duty early. Terminating approved leave and restoring slots.');
                              }}
                              className="btn btn-sm"
                              style={{
                                background: '#dc2626',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderRadius: '8px'
                              }}
                            >
                              <Ban size={14} /> Terminate Leave
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

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 6: FRONT DESK & RECEPTIONIST MANAGEMENT (የመቀበያ ሠራተኞች)  */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'receptionists' && (
          <div>
            {/* Header Banner */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      Front Desk & Receptionist Staff (የመቀበያ ሠራተኞች)
                    </h2>
                    <span style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 800
                    }}>
                      {receptionists.filter(r => r.isActive).length} Active On Duty
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    Onboard front desk receptionists. They can search patients, verify check-ins, book available doctor slots, and handle walk-ins. Receptionists cannot update clinic details or financial settings.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={fetchReceptionists}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} className={loadingReceptionists ? 'animate-spin' : ''} /> Refresh
                  </button>
                  <button
                    onClick={() => {
                      setCreatedReceptionistCreds(null);
                      setReceptionistError('');
                      setShowAddReceptionistModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <UserPlus size={15} /> Onboard New Receptionist
                  </button>
                </div>
              </div>
            </div>

            {/* Receptionists List */}
            {loadingReceptionists ? (
              <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div className="spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Loading receptionist directory...</div>
              </div>
            ) : receptionists.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <ClipboardList size={28} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main)' }}>
                  No Front Desk Receptionists Onboarded Yet
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 20px' }}>
                  Create the first receptionist profile so staff can manage patient queues and appointment check-ins at the front desk.
                </p>
                <button
                  onClick={() => setShowAddReceptionistModal(true)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <UserPlus size={15} /> Onboard First Receptionist
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                {receptionists.map((rec) => {
                  const recId = (rec._id || '').slice(-6).toUpperCase();
                  return (
                    <div
                      key={rec._id}
                      className="glass-panel"
                      style={{
                        padding: '22px',
                        border: rec.isActive ? '1px solid #d1fae5' : '1px solid #fee2e2',
                        background: rec.isActive ? '#ffffff' : '#fafafa',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '16px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '12px',
                              background: rec.isActive ? '#ecfdf5' : '#f1f5f9',
                              color: rec.isActive ? '#059669' : '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '1.1rem'
                            }}>
                              {rec.name ? rec.name.charAt(0).toUpperCase() : 'R'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                                {rec.name}
                              </div>
                              <span style={{
                                fontSize: '0.72rem',
                                color: '#64748b',
                                fontFamily: 'monospace'
                              }}>
                                ETH-REC-{recId}
                              </span>
                            </div>
                          </div>

                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: rec.isActive ? '#ecfdf5' : '#fef2f2',
                            color: rec.isActive ? '#065f46' : '#991b1b',
                            border: rec.isActive ? '1px solid #a7f3d0' : '1px solid #fee2e2',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {rec.isActive ? <CheckCircle2 size={12} /> : <Ban size={12} />}
                            {rec.isActive ? 'Active Duty' : 'Suspended'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={14} style={{ color: '#64748b' }} />
                            <span>{rec.email}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Phone size={14} style={{ color: '#64748b' }} />
                            <span>{rec.phoneNumber || 'No phone'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={14} style={{ color: '#64748b' }} />
                            <span>{rec.address || 'Addis Ababa, Bole'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Added {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : 'Recently'}
                        </div>

                        <button
                          onClick={() => handleToggleReceptionist(rec._id)}
                          className="btn btn-sm"
                          style={{
                            background: rec.isActive ? '#fee2e2' : '#ecfdf5',
                            color: rec.isActive ? '#991b1b' : '#065f46',
                            border: rec.isActive ? '1px solid #fecaca' : '1px solid #a7f3d0',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: '8px'
                          }}
                        >
                          {rec.isActive ? 'Suspend Access' : 'Reactivate'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADMIN REVIEW DOCTOR LEAVE (APPROVE / REJECT)            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {leaveReviewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 105,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'white', borderRadius: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {leaveReviewModal.status === 'approved' 
                  ? 'Approve Doctor Leave' 
                  : leaveReviewModal.status === 'terminated'
                  ? 'Terminate Approved Leave Early'
                  : 'Reject Doctor Leave'}
              </h3>
              <button
                onClick={() => setLeaveReviewModal(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '16px' }}>
              You are about to mark this leave request for dates <strong>{leaveReviewModal.startDate} → {leaveReviewModal.endDate}</strong> as{' '}
              <strong style={{ 
                color: leaveReviewModal.status === 'approved' ? '#059669' : leaveReviewModal.status === 'terminated' ? '#dc2626' : '#dc2626', 
                textTransform: 'uppercase' 
              }}>
                {leaveReviewModal.status}
              </strong>.
            </p>

            {leaveReviewModal.status === 'approved' && (
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#047857',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} />
                <span>
                  Automatic Action: All unbooked slots for this doctor during the leave dates will be purged from the database.
                </span>
              </div>
            )}

            {leaveReviewModal.status === 'terminated' && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#b91c1c',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>
                  Automatic Action: Doctor schedule will be immediately reactivated and consultation slots for remaining working days will be automatically regenerated.
                </span>
              </div>
            )}

            <form onSubmit={handleReviewLeaveSubmit}>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Administrator Feedback / Decision Notes</label>
                <textarea
                  rows={3}
                  className="form-control"
                  value={adminReviewNotes}
                  onChange={(e) => setAdminReviewNotes(e.target.value)}
                  placeholder={
                    leaveReviewModal.status === 'terminated'
                      ? 'e.g., Doctor returned to duty early. Terminating leave and regenerating slots.'
                      : 'Enter comments for the physician...'
                  }
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setLeaveReviewModal(null)}
                  className="btn btn-secondary"
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    background: leaveReviewModal.status === 'approved' ? '#10b981' : '#dc2626',
                    color: 'white',
                    fontWeight: 800
                  }}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Processing...
                    </>
                  ) : leaveReviewModal.status === 'approved' ? (
                    'Confirm Approval'
                  ) : leaveReviewModal.status === 'terminated' ? (
                    'Confirm Termination & Restore Slots'
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: ADD NEW DOCTOR (ሐኪም መመዝገቢያ)                          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showAddDoctorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            background: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Onboard New Clinic Doctor
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Creates the doctor's login and clinic schedule in one step.
                </p>
              </div>
              <button
                onClick={() => { setShowAddDoctorModal(false); setDoctorFormError(''); }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddDoctorSubmit}>
              {doctorFormError && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#b91c1c', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px' }}>
                  <AlertCircle size={15} style={{ verticalAlign: 'middle' }} /> {doctorFormError}
                </div>
              )}

              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', margin: '0 0 8px' }}>Login account</div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" required minLength={2} className="form-control" placeholder="e.g. Meron Teshome"
                  value={newDoctorForm.name} onChange={(e) => setNewDoctorForm({ ...newDoctorForm, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Email (login)</label>
                  <input type="email" required className="form-control" placeholder="doctor@clinic.et"
                    value={newDoctorForm.email} onChange={(e) => setNewDoctorForm({ ...newDoctorForm, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" required minLength={9} className="form-control" placeholder="0911 000 000"
                    value={newDoctorForm.phoneNumber} onChange={(e) => setNewDoctorForm({ ...newDoctorForm, phoneNumber: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Initial Password</label>
                  <input type="text" required minLength={8} className="form-control" placeholder="8+ chars, Aa1"
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}"
                    title="At least 8 characters with an uppercase letter, a lowercase letter and a number"
                    value={newDoctorForm.password} onChange={(e) => setNewDoctorForm({ ...newDoctorForm, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-control" value={newDoctorForm.gender} onChange={(e) => setNewDoctorForm({ ...newDoctorForm, gender: e.target.value })}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other / not specified</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address (optional)</label>
                <input type="text" className="form-control" placeholder="Bole, Addis Ababa"
                  value={newDoctorForm.address} onChange={(e) => setNewDoctorForm({ ...newDoctorForm, address: e.target.value })} />
              </div>

              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', margin: '16px 0 8px' }}>Clinical profile</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <input type="text" required minLength={2} className="form-control" placeholder="e.g. Pediatrics"
                    value={newDoctorForm.specialization} onChange={(e) => setNewDoctorForm({ ...newDoctorForm, specialization: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">MOH License Number</label>
                  <input type="text" required minLength={3} className="form-control" placeholder="ETH-MED-2026-001"
                    value={newDoctorForm.licenseNumber} onChange={(e) => setNewDoctorForm({ ...newDoctorForm, licenseNumber: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Years of Experience</label>
                  <input type="number" min={0} max={70} className="form-control"
                    value={newDoctorForm.yearsOfExperience} onChange={(e) => setNewDoctorForm({ ...newDoctorForm, yearsOfExperience: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Short Bio (optional)</label>
                  <input type="text" maxLength={1000} className="form-control"
                    value={newDoctorForm.bio} onChange={(e) => setNewDoctorForm({ ...newDoctorForm, bio: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Working Days</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {WEEK_DAYS.map((day) => {
                    const on = newDoctorForm.availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setNewDoctorForm({
                          ...newDoctorForm,
                          availableDays: on
                            ? newDoctorForm.availableDays.filter((d) => d !== day)
                            : WEEK_DAYS.filter((d) => d === day || newDoctorForm.availableDays.includes(d))
                        })}
                        className="btn btn-sm"
                        style={{
                          background: on ? '#4f46e5' : '#f1f5f9',
                          color: on ? 'white' : '#475569',
                          fontSize: '0.78rem',
                          padding: '5px 10px',
                          borderRadius: '8px'
                        }}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Shift Start</label>
                  <input type="time" required className="form-control" value={newDoctorForm.startTime}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, startTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Shift End</label>
                  <input type="time" required className="form-control" value={newDoctorForm.endTime}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, endTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Break Start</label>
                  <input type="time" className="form-control" value={newDoctorForm.breakStart}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, breakStart: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Break End</label>
                  <input type="time" className="form-control" value={newDoctorForm.breakEnd}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, breakEnd: e.target.value })} />
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                40-minute slots are generated automatically from this schedule. Leave both break fields empty for no break.
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddDoctorModal(false); setDoctorFormError(''); }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDoctor}
                  className="btn btn-primary"
                  style={{ flex: 1.5 }}
                >
                  {submittingDoctor ? <><Loader2 size={16} className="spin-icon" /> Creating…</> : <><UserPlus size={16} /> Create Doctor Account</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: PATIENT FULL DETAILS MODAL                           */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showPatientDetailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '28px',
            background: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Patient Clinical Registration File
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 700, marginTop: '2px' }}>
                  Card #{showPatientDetailModal.cardNumber}
                </div>
              </div>
              <button
                onClick={() => setShowPatientDetailModal(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Full Name:</span>
                <strong>{showPatientDetailModal.patientName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Visit For:</span>
                <span>{showPatientDetailModal.forPerson === 'Self' ? 'Account holder' : showPatientDetailModal.forPerson}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status & Queue:</span>
                <span>{showPatientDetailModal.status}{showPatientDetailModal.queueNumber ? ` • Queue #${showPatientDetailModal.queueNumber}` : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Physician:</span>
                <strong>{showPatientDetailModal.doctorName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Appointment Slot:</span>
                <span>{showPatientDetailModal.slotTime} ({showPatientDetailModal.date})</span>
              </div>
              <div style={{ marginTop: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700 }}>Chief Complaint:</span>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', fontSize: '0.85rem' }}>
                  {showPatientDetailModal.chiefComplaint}
                </div>
              </div>
              {showPatientDetailModal.cancelReason && (
                <div style={{ fontSize: '0.85rem', color: '#b91c1c' }}>
                  <strong>Cancellation reason:</strong> {showPatientDetailModal.cancelReason}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPatientDetailModal(null)}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '24px' }}
            >
              Close File
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ONBOARD FRONT DESK RECEPTIONIST (ADMIN CONTROLLED)      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showAddReceptionistModal && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '32px', background: 'white', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Onboard Receptionist Staff
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Create front desk account with immediate login credentials
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAddReceptionistModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {createdReceptionistCreds ? (
              <div>
                <div style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 style={{ margin: '0 0 4px', color: '#065f46', fontWeight: 800, fontSize: '1.1rem' }}>
                    Receptionist Created Successfully!
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#047857' }}>
                    Share these temporary login credentials with your new staff member:
                  </p>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '0.88rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Full Name:</span>
                    <strong>{createdReceptionistCreds.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Login Email:</span>
                    <strong>{createdReceptionistCreds.email}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Temporary Password:</span>
                    <strong style={{ color: '#4f46e5', fontFamily: 'monospace' }}>{createdReceptionistCreds.password}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Portal URL:</span>
                    <span>{typeof window !== 'undefined' ? window.location.origin : ''}/login</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      const text = `CareSync Front Desk Credentials:\nName: ${createdReceptionistCreds.name}\nEmail: ${createdReceptionistCreds.email}\nPassword: ${createdReceptionistCreds.password}\nPortal: ${window.location.origin}/login`;
                      navigator.clipboard.writeText(text);
                      setCopiedCreds(true);
                      setTimeout(() => setCopiedCreds(false), 3000);
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {copiedCreds ? <CheckCheck size={16} style={{ color: '#059669' }} /> : <Copy size={16} />}
                    {copiedCreds ? 'Copied to Clipboard!' : 'Copy Credentials'}
                  </button>
                  <button
                    onClick={() => setShowAddReceptionistModal(false)}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateReceptionistSubmit}>
                {receptionistError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={16} />
                    <span>{receptionistError}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Selamawit Tadesse"
                    value={receptionistForm.name}
                    onChange={(e) => setReceptionistForm({ ...receptionistForm, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      className="form-control"
                      placeholder="reception@clinic.et"
                      value={receptionistForm.email}
                      onChange={(e) => setReceptionistForm({ ...receptionistForm, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="+251 91 122 3344"
                      value={receptionistForm.phoneNumber}
                      onChange={(e) => setReceptionistForm({ ...receptionistForm, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Temporary Password *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="e.g. Reception@123"
                      value={receptionistForm.password}
                      onChange={(e) => setReceptionistForm({ ...receptionistForm, password: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-control"
                      value={receptionistForm.gender}
                      onChange={(e) => setReceptionistForm({ ...receptionistForm, gender: e.target.value })}
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '22px' }}>
                  <label className="form-label">Duty Location / Branch</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Addis Ababa Central Clinic, Bole"
                    value={receptionistForm.address}
                    onChange={(e) => setReceptionistForm({ ...receptionistForm, address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddReceptionistModal(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReceptionist}
                    className="btn btn-primary"
                    style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {submittingReceptionist ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    {submittingReceptionist ? 'Creating...' : 'Onboard Receptionist'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Operations Terminal...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}


