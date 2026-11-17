'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import { clinicApi, appointmentApi } from '@/lib/api';
import API from '@/lib/api';
import { useRequireRole } from '@/lib/useRequireRole';
import { clinicToday, formatClinicRange, formatClinicTime, clinicNowHHMM } from '@/lib/time';
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

  // Walk-in booking: find (or register) the patient first, then book a real appointment
  const emptyNewPatient = { name: '', phoneNumber: '', gender: 'female', email: '', address: '' };
  const [walkinStep, setWalkinStep] = useState('find'); // 'find' | 'register'
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [patientSearchDone, setPatientSearchDone] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatient, setNewPatient] = useState(emptyNewPatient);
  const [existingMatch, setExistingMatch] = useState(null);
  const [walkinReason, setWalkinReason] = useState('');
  const [walkinError, setWalkinError] = useState('');
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);

  // Patient registry lookup tab
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryResults, setRegistryResults] = useState([]);
  const [registrySearched, setRegistrySearched] = useState(false);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState('');

  // Clinic Status State (null = unknown / could not be loaded)
  const [clinicStatus, setClinicStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Doctors State
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [selectedDoctorForSlots, setSelectedDoctorForSlots] = useState(null);

  // Today's queue (real appointments only)
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState('');

  // Arrival check-ins are tracked on this screen only (the backend has no check-in step)
  const [checkIns, setCheckIns] = useState({});

  // Today's open slots (real slots only)
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsError, setSlotsError] = useState('');

  // Error banner (separate from the success notification)
  const [errorNotification, setErrorNotification] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Auth Guard: Only Receptionist and Admin roles
  const { allowed } = useRequireRole(['receptionist', 'admin']);

  const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

  const showNotice = (text) => {
    setErrorNotification('');
    setNotification(text);
    setTimeout(() => setNotification(''), 5000);
  };

  const showError = (text) => {
    setNotification('');
    setErrorNotification(text);
    setTimeout(() => setErrorNotification(''), 7000);
  };

  // Fetch Clinic Status (no invented "open" status on failure)
  const fetchClinicOverview = async () => {
    setLoadingStatus(true);
    try {
      const res = await clinicApi.get('/status');
      if (res.data?.success) {
        setClinicStatus({ isOpen: Boolean(res.data.isOpen), message: res.data.message || '' });
      } else {
        setClinicStatus(null);
      }
    } catch (e) {
      setClinicStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Live Queue Fetcher: today's appointments (Addis Ababa date)
  const fetchLiveQueue = async (currentDoctors = doctors) => {
    setLoadingQueue(true);
    setQueueError('');
    try {
      const res = await appointmentApi.get('/appointments', { params: { date: clinicToday() } });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const docList = currentDoctors && currentDoctors.length > 0 ? currentDoctors : doctors;
      const mapped = list.map(apt => {
        const matchedDoc = docList.find(d => d.id === apt.doctorId);
        return {
          id: apt._id,
          patientId: apt.patientId,
          slotId: apt.slotId,
          startTime: apt.startTime || '',
          slotTime: apt.startTime ? formatClinicRange(apt.startTime, apt.endTime) : '—',
          date: apt.date,
          patientName: apt.patientName || 'Name not recorded',
          forPerson: apt.forPerson || '',
          cardNumber: apt.cardNumber || '',
          doctorId: apt.doctorId,
          doctorName: matchedDoc?.name || `Doctor …${String(apt.doctorId || '').slice(-4)}`,
          specialty: matchedDoc?.specialty || '',
          reasonForVisit: apt.reasonForVisit || '',
          status: apt.status,
          queueNumber: apt.queueNumber ?? null,
          cancelReason: apt.cancelReason || ''
        };
      });
      mapped.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0));
      setQueue(mapped);
    } catch (err) {
      setQueueError(errorMessage(err, 'Could not load today\'s appointments. Please refresh.'));
    } finally {
      setLoadingQueue(false);
    }
  };

  // Today's available slots for the given (active) doctors
  const fetchSlots = async (docList = doctors) => {
    setSlotsError('');
    const today = clinicToday();
    const activeDocs = docList.filter(d => d.active);
    const results = await Promise.allSettled(
      activeDocs.map(doc => clinicApi.get(`/${doc.id}/slots`, { params: { date: today } }))
    );
    const liveSlots = [];
    let failures = 0;
    results.forEach((result, idx) => {
      if (result.status !== 'fulfilled') {
        failures += 1;
        return;
      }
      const slots = Array.isArray(result.value?.data?.data) ? result.value.data.data : [];
      const doc = activeDocs[idx];
      slots.filter(s => s.status === 'available').forEach(s => {
        liveSlots.push({
          id: s._id,
          time: formatClinicRange(s.startTime, s.endTime),
          startTime: s.startTime,
          endTime: s.endTime,
          doctorId: doc.id,
          doctorName: doc.name,
          specialty: doc.specialty
        });
      });
    });
    liveSlots.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0));
    setAvailableSlots(liveSlots);
    if (failures > 0) {
      setSlotsError(`Could not load slots for ${failures} doctor(s). The list below may be incomplete.`);
    }
  };

  const fetchDoctorRoster = async () => {
    setLoadingDoctors(true);
    setRosterError('');
    try {
      const res = await clinicApi.get('/getAllDoctors?all=true');
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const mapped = list.map((doc) => {
        const account = doc.accountDetails && typeof doc.accountDetails === 'object' ? doc.accountDetails : {};
        const rawName = account.fullName || account.name || doc.name || 'Unnamed doctor';
        return {
          id: doc._id || doc.id,
          name: rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`,
          specialty: doc.specialization || '',
          phone: account.phoneNumber || '',
          shift: doc.startTime ? formatClinicRange(doc.startTime, doc.endTime) : '',
          active: doc.isActive !== false
        };
      });
      setDoctors(mapped);
      if (mapped.length > 0 && !selectedDoctorForSlots) {
        setSelectedDoctorForSlots(mapped[0].id);
      }
      fetchLiveQueue(mapped);
      await fetchSlots(mapped);
    } catch (e) {
      setRosterError(errorMessage(e, 'Could not load the doctor roster. Please refresh.'));
      setDoctors([]);
      setAvailableSlots([]);
      fetchLiveQueue([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      fetchClinicOverview();
      fetchDoctorRoster();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  // Mark patient as arrived (front-desk screen only; not saved to the backend)
  const handleCheckInPatient = (aptId) => {
    const nowStr = formatClinicTime(clinicNowHHMM());
    setCheckIns(prev => ({ ...prev, [aptId]: nowStr }));
    showNotice('✅ Patient marked as arrived (shown on this front-desk screen only).');
  };

  // Submit Cancellation: only show "cancelled" after the backend confirms it
  const handleCancelAppointment = async () => {
    if (!showCancelModal) return;
    setCancelSubmitting(true);
    setCancelError('');
    try {
      await appointmentApi.patch(`/appointments/${showCancelModal.id}/cancel`, {
        cancelReason: cancelReason.trim() || 'Front desk cancelled on patient request'
      });
      const name = showCancelModal.patientName;
      setShowCancelModal(null);
      setCancelReason('');
      showNotice(`Appointment for ${name} cancelled and the slot released.`);
      fetchLiveQueue();
      fetchSlots();
    } catch (err) {
      setCancelError(errorMessage(err, 'Could not cancel the appointment. Nothing was changed.'));
    } finally {
      setCancelSubmitting(false);
    }
  };

  const closeCancelModal = () => {
    setShowCancelModal(null);
    setCancelReason('');
    setCancelError('');
  };

  // ── Walk-in flow ────────────────────────────────────────────────
  const openWalkinModal = (slot) => {
    setSelectedSlotForBooking(slot);
    setWalkinStep('find');
    setPatientSearch('');
    setPatientResults([]);
    setPatientSearchDone(false);
    setSelectedPatient(null);
    setNewPatient(emptyNewPatient);
    setExistingMatch(null);
    setWalkinReason('');
    setWalkinError('');
    setShowWalkinModal(true);
  };

  const closeWalkinModal = () => {
    setShowWalkinModal(false);
    setSelectedSlotForBooking(null);
  };

  const handlePatientSearch = async (e) => {
    if (e) e.preventDefault();
    const term = patientSearch.trim();
    setWalkinError('');
    if (term.length < 2) {
      setWalkinError('Type at least 2 characters (name, phone or email) to search.');
      return;
    }
    setSearchingPatients(true);
    try {
      const res = await API.get('/users/staff/patients', { params: { search: term } });
      setPatientResults(Array.isArray(res.data?.data) ? res.data.data : []);
      setPatientSearchDone(true);
    } catch (err) {
      setWalkinError(errorMessage(err, 'Patient search failed. Please try again.'));
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setWalkinError('');
    setExistingMatch(null);
    const payload = {
      name: newPatient.name.trim(),
      phoneNumber: newPatient.phoneNumber.trim(),
      gender: newPatient.gender,
      ...(newPatient.email.trim() ? { email: newPatient.email.trim() } : {}),
      ...(newPatient.address.trim() ? { address: newPatient.address.trim() } : {})
    };
    setWalkinSubmitting(true);
    try {
      const res = await API.post('/users/staff/patients', payload);
      setSelectedPatient(res.data?.data || null);
      setWalkinStep('find');
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.data) {
        setExistingMatch(err.response.data.data);
      }
      setWalkinError(errorMessage(err, 'Could not register the patient. Please check the details.'));
    } finally {
      setWalkinSubmitting(false);
    }
  };

  // Book the walk-in: real appointment only. Nothing is added locally on failure.
  const handleWalkinBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlotForBooking || !selectedPatient) return;
    setWalkinError('');
    setWalkinSubmitting(true);
    try {
      const res = await appointmentApi.post('/appointments', {
        patientId: selectedPatient._id,
        doctorId: selectedSlotForBooking.doctorId,
        slotId: selectedSlotForBooking.id,
        date: clinicToday(),
        reasonForVisit: walkinReason.trim() || 'Walk-in consultation'
      });
      const created = res.data?.data || {};
      closeWalkinModal();
      showNotice(
        `🎉 ${selectedPatient.name} booked with ${selectedSlotForBooking.doctorName} at ${formatClinicTime(created.startTime || selectedSlotForBooking.startTime)}` +
        (created.queueNumber ? ` (Queue #${created.queueNumber})` : '') +
        (created.cardNumber ? ` — card ${created.cardNumber}` : '') + '.'
      );
      fetchLiveQueue();
      fetchSlots();
    } catch (err) {
      setWalkinError(errorMessage(err, 'Booking failed. Nothing was saved.'));
      if (err.response?.status === 409) {
        fetchSlots(); // the slot was probably just taken: refresh the list
      }
    } finally {
      setWalkinSubmitting(false);
    }
  };

  // Registry lookup (real patient records)
  const handleRegistrySearch = async (e) => {
    e.preventDefault();
    const term = registrySearch.trim();
    setRegistryError('');
    if (term.length < 2) {
      setRegistryError('Type at least 2 characters (name, phone or email) to search.');
      return;
    }
    setRegistryLoading(true);
    try {
      const res = await API.get('/users/staff/patients', { params: { search: term } });
      setRegistryResults(Array.isArray(res.data?.data) ? res.data.data : []);
      setRegistrySearched(true);
    } catch (err) {
      setRegistryError(errorMessage(err, 'Patient search failed. Please try again.'));
    } finally {
      setRegistryLoading(false);
    }
  };

  // Queue as displayed: real status, plus local arrival marks on scheduled visits
  const displayQueue = queue.map(item => (
    item.status === 'scheduled' && checkIns[item.id]
      ? { ...item, status: 'checked_in', checkedInAt: checkIns[item.id] }
      : item
  ));

  // Filter queue
  const filteredQueue = displayQueue.filter(item => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q ||
      item.patientName.toLowerCase().includes(q) ||
      item.cardNumber.toLowerCase().includes(q) ||
      item.doctorName.toLowerCase().includes(q) ||
      item.forPerson.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesDoctor = selectedDoctorFilter === 'all' || item.doctorId === selectedDoctorFilter;

    return matchesQuery && matchesStatus && matchesDoctor;
  });

  if (!mounted || !allowed) {
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
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: clinicStatus ? (clinicStatus.isOpen ? '#34d399' : '#f87171') : '#cbd5e1',
                  display: 'inline-block'
                }} />
                {loadingStatus ? 'Checking…' : clinicStatus ? (clinicStatus.isOpen ? 'Open (Addis Ababa)' : 'Closed') : 'Status unavailable'}
              </div>
              {clinicStatus?.message && (
                <div style={{ fontSize: '0.72rem', color: '#d1fae5', marginTop: '2px' }}>{clinicStatus.message}</div>
              )}
            </div>

            <button
              onClick={() => {
                if (availableSlots.length > 0) {
                  openWalkinModal(availableSlots[0]);
                } else {
                  handleTabChange('slots');
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
        {errorNotification && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} />
            <span>{errorNotification}</span>
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
            <Users size={18} /> Today's Patient Queue ({displayQueue.filter(q => q.status !== 'cancelled').length})
            <span style={{
              background: '#ecfdf5',
              color: '#065f46',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {displayQueue.filter(q => q.status === 'checked_in').length} Arrived
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
                      placeholder="Search patient, card number, or doctor..."
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
                    { id: 'checked_in', label: 'Arrived' },
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
                      <th style={{ padding: '14px 20px' }}>Queue #</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Front Desk Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingQueue && queue.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Loading today's appointments…
                        </td>
                      </tr>
                    ) : queueError ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '50px 20px', textAlign: 'center', color: '#991b1b' }}>
                          <div style={{ fontWeight: 700, marginBottom: '10px' }}>{queueError}</div>
                          <button onClick={() => fetchLiveQueue()} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <RefreshCw size={14} /> Try again
                          </button>
                        </td>
                      </tr>
                    ) : filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {queue.length === 0
                            ? `No appointments booked for today (${clinicToday()}).`
                            : 'No patients matching your search criteria.'}
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
                              {item.forPerson && item.forPerson !== 'Self' && <span>{item.forPerson}</span>}
                              {item.forPerson && item.forPerson !== 'Self' && item.cardNumber && <span>•</span>}
                              {item.cardNumber && <span style={{ fontFamily: 'monospace' }}>{item.cardNumber}</span>}
                            </div>
                            {item.reasonForVisit && (
                              <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>
                                {item.reasonForVisit}
                              </div>
                            )}
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
                              {item.status === 'checked_in' ? 'arrived' : item.status.replace('_', ' ')}
                            </span>
                            {item.checkedInAt && (
                              <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '3px' }}>
                                Arrived at {item.checkedInAt}
                              </div>
                            )}
                            {item.status === 'cancelled' && item.cancelReason && (
                              <div style={{ fontSize: '0.72rem', color: '#991b1b', marginTop: '3px' }}>
                                {item.cancelReason}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                              {item.queueNumber ? `#${item.queueNumber}` : '—'}
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
                                  onClick={() => { setCancelError(''); setShowCancelModal(item); }}
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

            {(rosterError || slotsError) && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 18px', borderRadius: '12px', marginBottom: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {rosterError || slotsError}
              </div>
            )}

            {!loadingDoctors && !rosterError && doctors.length === 0 && (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '28px' }}>
                No doctors are registered yet.
              </div>
            )}

            {loadingDoctors && doctors.length === 0 && (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '28px' }}>
                Loading doctor roster and today's slots…
              </div>
            )}

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
                        background: doc.active ? '#ecfdf5' : '#f1f5f9',
                        color: doc.active ? '#065f46' : '#64748b',
                        border: `1px solid ${doc.active ? '#a7f3d0' : '#e2e8f0'}`,
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        {doc.active ? `${docSlots.length} Open Slots` : 'Inactive'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      {doc.shift && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} /> Shift: {doc.shift}
                        </div>
                      )}
                      {doc.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} /> Physician Contact: {doc.phone}
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                        Available Booking Slots Today:
                      </div>

                      {docSlots.length === 0 ? (
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                          {doc.active ? 'No open slots left today.' : 'This doctor is not taking appointments.'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {docSlots.map(slot => (
                            <button
                              key={slot.id}
                              onClick={() => openWalkinModal(slot)}
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
              <p style={{ margin: '0 0 14px', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                Search registered patients by name, phone number or email.
              </p>
              <form onSubmit={handleRegistrySearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '36px', height: '42px', borderRadius: '10px' }}
                    placeholder="e.g. Almaz, 0911223344"
                    value={registrySearch}
                    onChange={(e) => setRegistrySearch(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={registryLoading} style={{ background: '#059669', border: 'none' }}>
                  {registryLoading ? 'Searching…' : 'Search'}
                </button>
              </form>
              {registryError && (
                <div style={{ color: '#991b1b', fontSize: '0.84rem', fontWeight: 600, marginTop: '10px' }}>{registryError}</div>
              )}
            </div>

            {registrySearched && (
              <div style={{ marginBottom: '28px' }}>
                {registryResults.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No registered patients match “{registrySearch.trim()}”.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {registryResults.map(p => (
                      <div key={p._id} className="glass-panel" style={{ padding: '18px', borderRadius: '14px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)' }}>{p.name}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                          <div style={{ color: '#059669', fontWeight: 600 }}>Phone: {p.phoneNumber}</div>
                          {p.email && <div>Email: {p.email}</div>}
                          {p.gender && <div style={{ textTransform: 'capitalize' }}>Gender: {p.gender}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 12px', color: 'var(--text-main)' }}>
              Today's patients ({clinicToday()})
            </h3>
            {displayQueue.length === 0 ? (
              <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {loadingQueue ? 'Loading today\'s appointments…' : queueError || 'No appointments booked for today.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                {displayQueue.map(p => (
                  <div key={p.id} className="glass-panel" style={{ padding: '20px', borderRadius: '14px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {p.patientName}
                      </h4>
                      {p.cardNumber && (
                        <span style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {p.cardNumber}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      {p.forPerson && p.forPerson !== 'Self' && <div>For: {p.forPerson}</div>}
                      <div>Assigned Physician: {p.doctorName}</div>
                      <div>Time: {p.slotTime}</div>
                    </div>

                    <button
                      onClick={() => setShowPatientDetailModal(p)}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Eye size={14} /> View Appointment Details
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto', padding: '30px', background: 'white', borderRadius: '20px' }}>
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
                    {selectedSlotForBooking.doctorName} • {selectedSlotForBooking.time} • {clinicToday()}
                  </span>
                </div>
              </div>
              <button
                onClick={closeWalkinModal}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {walkinError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.84rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {walkinError}
              </div>
            )}

            {selectedPatient ? (
              /* ── Step 2: book the selected patient ─────────────────── */
              <form onSubmit={handleWalkinBookingSubmit}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{selectedPatient.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {selectedPatient.phoneNumber}{selectedPatient.email ? ` • ${selectedPatient.email}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedPatient(null); setWalkinError(''); }}
                    className="btn btn-secondary btn-sm"
                  >
                    Change
                  </button>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Chief Complaint / Reason for Visit *</label>
                  <textarea
                    rows={2}
                    required
                    className="form-control"
                    placeholder="Brief reason for consultation..."
                    value={walkinReason}
                    onChange={(e) => setWalkinReason(e.target.value)}
                  />
                </div>

                <div style={{ fontSize: '0.8rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 12px', marginBottom: '20px' }}>
                  Collect the consultation fee at the desk. Payments are not recorded in this system.
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={closeWalkinModal} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={walkinSubmitting}
                    className="btn btn-primary"
                    style={{ flex: 2, background: '#059669', border: 'none', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <CheckCircle2 size={16} /> {walkinSubmitting ? 'Booking…' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            ) : walkinStep === 'register' ? (
              /* ── Step 1b: register a new walk-in patient ───────────── */
              <form onSubmit={handleRegisterPatient}>
                {existingMatch && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '0.84rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                      Existing record: {existingMatch.name} ({existingMatch.phoneNumber})
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setSelectedPatient(existingMatch); setExistingMatch(null); setWalkinError(''); setWalkinStep('find'); }}
                    >
                      Use this patient
                    </button>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    className="form-control"
                    placeholder="e.g. Dawit Abebe"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      minLength={9}
                      className="form-control"
                      placeholder="0911234567"
                      value={newPatient.phoneNumber}
                      onChange={(e) => setNewPatient({ ...newPatient, phoneNumber: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender *</label>
                    <select
                      className="form-control"
                      value={newPatient.gender}
                      onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Email (optional)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Leave empty if the patient has none"
                    value={newPatient.email}
                    onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Address (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Bole, Addis Ababa"
                    value={newPatient.address}
                    onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setWalkinStep('find'); setWalkinError(''); setExistingMatch(null); }}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Back to search
                  </button>
                  <button
                    type="submit"
                    disabled={walkinSubmitting}
                    className="btn btn-primary"
                    style={{ flex: 2, background: '#059669', border: 'none', fontWeight: 800 }}
                  >
                    {walkinSubmitting ? 'Registering…' : 'Register Patient'}
                  </button>
                </div>
              </form>
            ) : (
              /* ── Step 1: find an existing patient ──────────────────── */
              <div>
                <form onSubmit={handlePatientSearch} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, phone or email"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary" disabled={searchingPatients} style={{ background: '#059669', border: 'none', whiteSpace: 'nowrap' }}>
                    <Search size={14} /> {searchingPatients ? 'Searching…' : 'Search'}
                  </button>
                </form>

                {patientSearchDone && (
                  patientResults.length === 0 ? (
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      No registered patient matches “{patientSearch.trim()}”.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', maxHeight: '260px', overflowY: 'auto' }}>
                      {patientResults.map(p => (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => { setSelectedPatient(p); setWalkinError(''); }}
                          style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}
                        >
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {p.phoneNumber}{p.email ? ` • ${p.email}` : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}

                <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  <button type="button" onClick={closeWalkinModal} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { setWalkinStep('register'); setWalkinError(''); }}
                    className="btn btn-primary"
                    style={{ flex: 2, background: '#059669', border: 'none', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Plus size={16} /> Register New Patient
                  </button>
                </div>
              </div>
            )}
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
                  Appointment Details
                </h3>
                {showPatientDetailModal.cardNumber && (
                  <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                    {showPatientDetailModal.cardNumber}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowPatientDetailModal(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              {[
                ['Patient Name:', showPatientDetailModal.patientName],
                ['Visit For:', showPatientDetailModal.forPerson],
                ['Card Number:', showPatientDetailModal.cardNumber],
                ['Assigned Physician:', showPatientDetailModal.doctorName],
                ['Appointment Time:', `${showPatientDetailModal.slotTime} (${showPatientDetailModal.date})`],
                ['Queue Number:', showPatientDetailModal.queueNumber ? `#${showPatientDetailModal.queueNumber}` : ''],
                ['Status:', showPatientDetailModal.status === 'checked_in' ? 'arrived' : showPatientDetailModal.status],
                ['Cancel Reason:', showPatientDetailModal.status === 'cancelled' ? showPatientDetailModal.cancelReason : '']
              ].filter(([, value]) => value).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <strong style={{ textAlign: 'right', textTransform: label === 'Status:' ? 'capitalize' : 'none' }}>{value}</strong>
                </div>
              ))}
              {showPatientDetailModal.reasonForVisit && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>Chief Complaint:</span>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginTop: '4px', fontSize: '0.85rem' }}>
                    {showPatientDetailModal.reasonForVisit}
                  </div>
                </div>
              )}
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

            {cancelError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: '10px', marginBottom: '12px', fontSize: '0.84rem', fontWeight: 600 }}>
                {cancelError}
              </div>
            )}

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
                onClick={closeCancelModal}
                disabled={cancelSubmitting}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Go Back
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={cancelSubmitting}
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
                {cancelSubmitting ? 'Cancelling…' : 'Confirm Cancel'}
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

