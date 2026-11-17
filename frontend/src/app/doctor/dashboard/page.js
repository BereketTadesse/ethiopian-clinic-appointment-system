'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRequireRole } from '@/lib/useRequireRole';
import { useClinic } from '@/context/ClinicContext';
import { appointmentApi } from '@/lib/api';
import {
  Stethoscope,
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Heart,
  Shield,
  Phone,
  CreditCard,
  QrCode,
  X,
  Plus,
  Search,
  BadgeCheck,
  Printer,
  ChevronRight,
  ClipboardList,
  Pill,
  History,
  Check
} from 'lucide-react';
import { formatClinicRange } from '@/lib/time';

// Map one appointment from GET /appointments/my-queue to the card shown in the queue.
// Only real API fields: nothing is invented (no default age, phone, ID or blood type).
const mapQueueItem = (item) => ({
  id: item._id,
  _id: item._id,
  doctorId: item.doctorId,
  patientName: item.patientName || 'Patient',
  relationship: item.forPerson || 'Self',
  cardNumber: item.cardNumber,
  queueNumber: item.queueNumber,
  slot: formatClinicRange(item.startTime, item.endTime),
  date: item.date,
  status: item.status === 'scheduled' ? 'waiting' : item.status,
  chiefComplaint: item.reasonForVisit || ''
});

export default function DoctorDashboardPage() {
  const { allowed, user, mounted } = useRequireRole('doctor');
  const { clinicName, clinicLogo } = useClinic();
  const doctorId = user?._id || user?.id;

  // Active Filter / Tab
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'waiting' | 'in_consultation' | 'completed'
  const [selectedSlotFilter, setSelectedSlotFilter] = useState('all');

  // Active Patient for Clinical Chart Modal
  const [activePatientModal, setActivePatientModal] = useState(null);
  const [chartActiveTab, setChartActiveTab] = useState('history'); // 'history' | 'conditions' | 'new_diagnosis'
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);

  // Doctor Clinical Notes & New Diagnosis Form State
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescribedMedication, setPrescribedMedication] = useState('');

  // Today's queue (real data only)
  const [registeredPatients, setRegisteredPatients] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState('');

  // Visits completed (and saved) in this session. The API queue only returns visits that are
  // still scheduled, so these are kept so the "Completed" tab reflects work actually saved.
  const completedThisSession = useRef(new Map());

  // Fetch Today's Queue from appointment-service
  const fetchDoctorQueue = async () => {
    setLoadingQueue(true);
    setQueueError('');
    try {
      const res = await appointmentApi.get('/appointments/my-queue');
      const list = Array.isArray(res.data?.data) ? res.data.data.map(mapQueueItem) : [];
      setRegisteredPatients((prev) => {
        // Keep the local "in consultation" marker for patients still waiting in the API queue
        const localStatus = new Map(prev.map((p) => [p.id, p.status]));
        const live = list.map((p) =>
          localStatus.get(p.id) === 'in_consultation' && p.status === 'waiting' ? { ...p, status: 'in_consultation' } : p
        );
        const liveIds = new Set(live.map((p) => p.id));
        const completed = [...completedThisSession.current.values()].filter((p) => !liveIds.has(p.id));
        return [...live, ...completed];
      });
    } catch (err) {
      setQueueError(err.response?.data?.message || 'Could not load today\'s queue. Please refresh to try again.');
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      fetchDoctorQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  // Slot filter chips come from the real slots of today's booked patients
  const doctorSlots = useMemo(
    () => [...new Set(registeredPatients.map((p) => p.slot))].sort(),
    [registeredPatients]
  );

  // Local-only marker: the doctor has called the patient in. Nothing is saved by this.
  const handleUpdateStatus = (patientId, newStatus) => {
    setRegisteredPatients(prev =>
      prev.map(p => (p.id === patientId ? { ...p, status: newStatus } : p))
    );
  };

  // Map the patient's past visits (card history) to the chart's history entries
  const mapHistoryEntry = (h) => ({
    id: h._id,
    date: h.date,
    status: h.status,
    doctorName: String(h.doctorId) === String(doctorId) ? (user?.name || 'You') : 'Another clinic doctor',
    clinic: clinicName,
    diagnosis: h.reasonForVisit || 'Consultation visit',
    notes: h.doctorNotes || '',
    prescriptions: h.prescription ? [h.prescription] : []
  });

  // Open Full Patient Chart Modal: loads the medical card and the visit history
  const openPatientChart = async (patient, tab = 'history') => {
    setActivePatientModal({
      ...patient,
      card: { status: 'loading', data: null },
      diagnosisHistory: null
    });
    setChartActiveTab(tab);
    setNewDiagnosis('');
    setClinicalNotes('');
    setPrescribedMedication('');
    setSaveSuccessMsg('');
    setSaveError('');

    const updateIfSamePatient = (patch) =>
      setActivePatientModal((prev) => (prev && prev.id === patient.id ? { ...prev, ...patch } : prev));

    const loadCard = async () => {
      if (!patient.cardNumber) {
        updateIfSamePatient({ card: { status: 'error', data: null } });
        return;
      }
      try {
        const res = await appointmentApi.get(`/cards/${encodeURIComponent(patient.cardNumber)}`);
        updateIfSamePatient({ card: { status: 'loaded', data: res.data?.data || null } });
      } catch (e) {
        updateIfSamePatient({ card: { status: 'error', data: null } });
      }
    };

    const loadHistory = async () => {
      try {
        const res = await appointmentApi.get(`/appointments/${patient.id}`);
        const history = Array.isArray(res.data?.data?.cardHistory) ? res.data.data.cardHistory : [];
        updateIfSamePatient({ diagnosisHistory: history.map(mapHistoryEntry), historyError: '' });
      } catch (e) {
        updateIfSamePatient({ diagnosisHistory: [], historyError: 'Could not load the visit history.' });
      }
    };

    await Promise.all([loadCard(), loadHistory()]);
  };

  // Doctor documents the diagnosis: only marked completed once the backend has saved it
  const handleSaveDiagnosis = async (e) => {
    e.preventDefault();
    if (!newDiagnosis.trim() || !activePatientModal) return;
    setSaveError('');
    setSavingDiagnosis(true);

    const aptId = activePatientModal._id || activePatientModal.id;
    try {
      const res = await appointmentApi.patch(`/appointments/${aptId}/complete`, {
        doctorNotes: `${newDiagnosis.trim()}. ${clinicalNotes.trim()}`.trim(),
        prescription: prescribedMedication.trim(),
        followUpDate: null
      });
      const saved = res.data?.data || {};

      const completedPatient = { ...activePatientModal, status: 'completed' };
      completedThisSession.current.set(aptId, {
        id: completedPatient.id,
        _id: completedPatient._id,
        doctorId: completedPatient.doctorId,
        patientName: completedPatient.patientName,
        relationship: completedPatient.relationship,
        cardNumber: completedPatient.cardNumber,
        queueNumber: completedPatient.queueNumber,
        slot: completedPatient.slot,
        date: completedPatient.date,
        status: 'completed',
        chiefComplaint: completedPatient.chiefComplaint
      });

      setActivePatientModal((prev) => (prev && prev.id === activePatientModal.id
        ? {
            ...prev,
            status: 'completed',
            diagnosisHistory: [
              mapHistoryEntry({ ...saved, _id: saved._id || aptId, doctorId, date: saved.date || prev.date, status: 'completed', reasonForVisit: saved.reasonForVisit ?? prev.chiefComplaint }),
              ...(prev.diagnosisHistory || []).filter((h) => h.id !== aptId)
            ]
          }
        : prev));

      setSaveSuccessMsg('✅ Diagnosis saved and visit marked as completed.');
      setTimeout(() => setSaveSuccessMsg(''), 5000);
      setNewDiagnosis('');
      setClinicalNotes('');
      setPrescribedMedication('');
      setChartActiveTab('history');
      fetchDoctorQueue();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'The diagnosis could not be saved. Nothing was recorded — please try again.');
    } finally {
      setSavingDiagnosis(false);
    }
  };

  // Filter patients by status & slot
  const filteredPatients = registeredPatients.filter(patient => {
    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus;
    const matchesSlot = selectedSlotFilter === 'all' || patient.slot === selectedSlotFilter;
    return matchesStatus && matchesSlot;
  });

  const waitingCount = registeredPatients.filter(p => p.status === 'waiting').length;
  const inConsultCount = registeredPatients.filter(p => p.status === 'in_consultation').length;
  const completedCount = registeredPatients.filter(p => p.status === 'completed').length;

  // Not logged in / not a doctor: useRequireRole redirects; render nothing meanwhile
  if (!allowed) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        {mounted ? 'Redirecting…' : 'Loading…'}
      </div>
    );
  }

  // Card data shown in the chart (null until loaded)
  const chartCard = activePatientModal?.card?.status === 'loaded' ? activePatientModal.card.data : null;
  const chartCardStatus = activePatientModal?.card?.status;

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', minHeight: '92vh', padding: '36px 0 60px' }}>
      <div className="container">
        
        {/* Welcome Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {clinicLogo && (
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                  flexShrink: 0
                }}
              >
                <img
                  src={clinicLogo}
                  alt={clinicName}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px' }}
                />
              </div>
            )}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#4f46e5', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                <Stethoscope size={15} /> {clinicName} • Attending Physician Portal
              </div>
              <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', margin: 0 }}>
                Welcome, {user?.name || 'Doctor'} 👨‍⚕️
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px' }}>
                Review patients registered for your consultation slots at {clinicName}, inspect complete diagnosis history, and document clinical evaluations.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/doctor/profile" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <User size={16} /> My Doctor Profile (የሐኪም ፕሮፋይል)
            </Link>
            <button
              onClick={() => alert('Consultation schedule slots are synced with the clinic system.')}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Clock size={16} /> Manage Working Slots
            </button>
          </div>
        </div>

        {/* Global Clinical Success Notification */}
        {saveSuccessMsg && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            padding: '14px 18px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)'
          }}>
            <CheckCircle2 size={20} />
            <span style={{ fontWeight: 700 }}>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '32px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Patients in Today's Queue</span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{registeredPatients.length}</div>
            <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 700, marginTop: '4px' }}>Booked across your slots</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Waiting in Waiting Area</span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706' }}>{waitingCount}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Ready for consultation</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Currently in Consultation</span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4338ca' }}>{inConsultCount}</div>
            <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, marginTop: '4px' }}>In examination room</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Completed Consultations</span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>{completedCount}</div>
            <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginTop: '4px' }}>Diagnosed & discharged</div>
          </div>
        </div>

        {/* Section: Patients Registered for Doctor Slots */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Patients Registered for Your Slots (የተመዘገቡ ታካሚዎች)
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                Click "Open Clinical File" to inspect diagnosis history, past medications, or document new clinical findings
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All (${registeredPatients.length})` },
                { id: 'waiting', label: `Waiting (${waitingCount})` },
                { id: 'in_consultation', label: `In Consultation (${inConsultCount})` },
                { id: 'completed', label: `Completed (${completedCount})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`btn btn-sm ${filterStatus === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slot Chips Filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Filter Slot:</span>
            <button
              onClick={() => setSelectedSlotFilter('all')}
              className={`btn btn-sm ${selectedSlotFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.76rem', padding: '4px 10px' }}
            >
              All Slots
            </button>
            {doctorSlots.map(slot => (
              <button
                key={slot}
                onClick={() => setSelectedSlotFilter(slot)}
                className={`btn btn-sm ${selectedSlotFilter === slot ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.76rem', padding: '4px 10px' }}
              >
                <Clock size={12} /> {slot}
              </button>
            ))}
          </div>

          {/* Patients Queue Cards Grid */}
          {queueError ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px', border: '1px solid #fecaca', background: '#fef2f2' }}>
              <AlertCircle size={32} style={{ color: '#dc2626', marginBottom: '10px' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#991b1b' }}>{queueError}</h3>
              <button onClick={fetchDoctorQueue} className="btn btn-secondary btn-sm" style={{ marginTop: '10px' }}>Try again</button>
            </div>
          ) : loadingQueue && registeredPatients.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              Loading today's queue…
            </div>
          ) : registeredPatients.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
              <Users size={36} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No patients in today's queue</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Booked patients for today will appear here.</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
              <Users size={36} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No patients matching this filter</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Select another status or time slot filter above.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
              {filteredPatients.map(patient => (
                <div
                  key={patient.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    borderLeft: `5px solid ${
                      patient.status === 'in_consultation' ? '#4f46e5' : patient.status === 'completed' ? '#10b981' : '#f59e0b'
                    }`,
                    position: 'relative'
                  }}
                >
                  {/* Top Bar: Queue & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: '#eef2ff',
                        color: '#4338ca',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontWeight: 900,
                        fontSize: '0.85rem'
                      }}>
                        Queue #{patient.queueNumber}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background:
                          patient.status === 'in_consultation'
                            ? '#e0e7ff'
                            : patient.status === 'completed'
                            ? '#ecfdf5'
                            : '#fef3c7',
                        color:
                          patient.status === 'in_consultation'
                            ? '#4338ca'
                            : patient.status === 'completed'
                            ? '#047857'
                            : '#92400e'
                      }}>
                        ● {patient.status.replace('_', ' ')}
                      </span>
                    </div>

                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '0.78rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      color: '#475569',
                      fontWeight: 700
                    }}>
                      {patient.cardNumber}
                    </span>
                  </div>

                  {/* Patient Name & Relation */}
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 2px' }}>
                      {patient.patientName}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: '#4f46e5', fontWeight: 700 }}>
                      {patient.relationship}
                    </div>
                  </div>

                  {/* Slot & Time */}
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 700 }}>
                      <Clock size={15} style={{ color: '#4f46e5' }} />
                      <span>{patient.date} at {patient.slot}</span>
                    </div>
                  </div>

                  {/* Chief Complaint / Symptoms */}
                  <div style={{ marginBottom: '16px', fontSize: '0.84rem' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: '2px' }}>
                      Chief Complaint / Reason for Visit:
                    </div>
                    <p style={{ margin: 0, color: '#334155', lineHeight: 1.4, fontStyle: 'italic' }}>
                      {patient.chiefComplaint ? `"${patient.chiefComplaint}"` : '—'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openPatientChart(patient)}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1.5, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 800 }}
                    >
                      <Stethoscope size={15} /> Open Clinical File & History
                    </button>

                    {patient.status === 'waiting' && (
                      <button
                        onClick={() => handleUpdateStatus(patient.id, 'in_consultation')}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, fontSize: '0.76rem' }}
                      >
                        Start Visit
                      </button>
                    )}

                    {patient.status === 'in_consultation' && (
                      <button
                        onClick={() => openPatientChart(patient, 'new_diagnosis')}
                        title="Document the diagnosis to complete the visit"
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}
                      >
                        Finish Visit ✓
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 🩺 DOCTOR PATIENT CLINICAL FILE & DIAGNOSIS HISTORY MODAL      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activePatientModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 110,
          overflowY: 'auto'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '28px', background: 'white', maxHeight: '94vh', overflowY: 'auto', position: 'relative', borderRadius: '20px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
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
                  Official Clinical Medical Record • Confidential
                </span>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {activePatientModal.patientName} (የታካሚ ማህደር)
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Card: <strong style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{activePatientModal.cardNumber}</strong> • Queue #{activePatientModal.queueNumber ?? '—'}
                </div>
              </div>

              <button
                onClick={() => setActivePatientModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', borderRadius: '6px' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Patient Clinical Profile Summary Banner */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: '18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              fontSize: '0.8rem'
            }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Visit For</span>
                <strong style={{ color: '#334155' }}>{activePatientModal.relationship}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Name on Card</span>
                <strong style={{ color: '#334155' }}>{chartCard?.fullName || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Blood Group</span>
                <strong style={{ color: '#ef4444' }}>{chartCard?.bloodType || (chartCardStatus === 'loading' ? '…' : 'Not recorded')}</strong>
              </div>
            </div>

            {/* ALLERGIES — shown prominently; never presented as "none" unless the card was actually loaded */}
            {chartCardStatus === 'loading' && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Loading medical card (allergies, blood group)…
              </div>
            )}
            {chartCardStatus === 'error' && (
              <div style={{ background: '#fef2f2', border: '2px solid #dc2626', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', fontSize: '0.88rem', color: '#991b1b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} /> Could not load the medical card — confirm allergies with the patient before prescribing.
              </div>
            )}
            {chartCardStatus === 'loaded' && (
              chartCard?.allergies?.length > 0 ? (
                <div style={{ background: '#fef2f2', border: '2px solid #dc2626', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', fontSize: '0.9rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} />
                  <span><strong>ALLERGIES:</strong> {chartCard.allergies.join(', ')}</span>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', marginBottom: '18px', fontSize: '0.84rem', color: '#475569' }}>
                  No allergies recorded on this patient's card. Confirm with the patient.
                </div>
              )
            )}

            {/* Current Chief Complaint for This Slot */}
            <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', fontSize: '0.84rem' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#4338ca', fontWeight: 800 }}>
                Today's Consultation Complaint ({activePatientModal.slot}):
              </div>
              <div style={{ color: '#1e1b4b', fontWeight: 600, marginTop: '3px' }}>
                {activePatientModal.chiefComplaint ? `"${activePatientModal.chiefComplaint}"` : '—'}
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setChartActiveTab('history')}
                className={`btn btn-sm ${chartActiveTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.82rem' }}
              >
                <History size={14} /> Visit History ({activePatientModal.diagnosisHistory ? activePatientModal.diagnosisHistory.length : '…'})
              </button>
              <button
                type="button"
                onClick={() => setChartActiveTab('conditions')}
                className={`btn btn-sm ${chartActiveTab === 'conditions' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.82rem' }}
              >
                <Heart size={14} /> Chronic History & Meds
              </button>
              <button
                type="button"
                onClick={() => setChartActiveTab('new_diagnosis')}
                className={`btn btn-sm ${chartActiveTab === 'new_diagnosis' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.82rem', fontWeight: 800 }}
              >
                <Plus size={14} /> Document New Diagnosis
              </button>
            </div>

            {/* ── TAB 1: PREVIOUS DIAGNOSES HISTORY ─────────────────── */}
            {chartActiveTab === 'history' && (
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Chronological record of past physician-documented clinical diagnoses and treatments:
                </div>

                {activePatientModal.diagnosisHistory === null && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Loading visit history…</div>
                )}
                {activePatientModal.historyError && (
                  <div style={{ color: '#b91c1c', fontSize: '0.84rem', fontWeight: 700 }}>{activePatientModal.historyError}</div>
                )}
                {Array.isArray(activePatientModal.diagnosisHistory) && activePatientModal.diagnosisHistory.length === 0 && !activePatientModal.historyError && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>No previous visits on this card.</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                  {(activePatientModal.diagnosisHistory || []).map((entry, index) => (
                    <div
                      key={entry.id || index}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px',
                        fontSize: '0.84rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#1e1b4b' }}>
                            {entry.diagnosis}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#4f46e5', fontWeight: 700 }}>
                            Documented by: {entry.doctorName} • {entry.clinic}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                          {entry.date}{entry.status ? ` • ${entry.status}` : ''}
                        </span>
                      </div>

                      {entry.notes && (
                        <div style={{ marginTop: '8px', color: '#334155', lineHeight: 1.4 }}>
                          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>Physician Clinical Notes:</span>
                          {entry.notes}
                        </div>
                      )}

                      {entry.prescriptions && entry.prescriptions.length > 0 && (
                        <div style={{ marginTop: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#047857', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Pill size={12} /> Prescribed Medications:
                          </span>
                          <ul style={{ margin: '4px 0 0', paddingLeft: '18px', color: '#334155', fontSize: '0.8rem' }}>
                            {entry.prescriptions.map((rx, rIdx) => (
                              <li key={rIdx}>{rx}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 2: CHRONIC CONDITIONS & ACTIVE MEDS (from the patient's card) ── */}
            {chartActiveTab === 'conditions' && (
              <div style={{ fontSize: '0.85rem' }}>
                {chartCardStatus === 'loading' && (
                  <div style={{ color: 'var(--text-muted)' }}>Loading medical card…</div>
                )}
                {chartCardStatus === 'error' && (
                  <div style={{ color: '#991b1b', fontWeight: 700 }}>
                    Could not load the medical card — confirm conditions, medications and allergies with the patient.
                  </div>
                )}
                {chartCardStatus === 'loaded' && (
                  <>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
                      <h4 style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e1b4b', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Heart size={16} style={{ color: '#ef4444' }} /> Documented Chronic Conditions:
                      </h4>
                      {chartCard?.chronicConditions?.length > 0 ? (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {chartCard.chronicConditions.map((cond, cIdx) => (
                            <span key={cIdx} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
                              {cond}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }}>None recorded on the card.</div>
                      )}
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
                      <h4 style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e1b4b', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Pill size={16} style={{ color: '#4f46e5' }} /> Current Medications:
                      </h4>
                      {chartCard?.currentMedications?.length > 0 ? (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {chartCard.currentMedications.map((med, mIdx) => (
                            <span key={mIdx} style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
                              {med}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }}>None recorded on the card.</div>
                      )}
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e1b4b', margin: '0 0 6px' }}>Emergency Contact:</h4>
                      {chartCard?.emergencyContactName || chartCard?.emergencyContactPhone ? (
                        <div style={{ color: '#334155' }}>
                          <strong>{chartCard.emergencyContactName || '—'}</strong>
                          {chartCard.emergencyContactRelationship ? ` (${chartCard.emergencyContactRelationship})` : ''}
                          {chartCard.emergencyContactPhone ? ` • Tel: ${chartCard.emergencyContactPhone}` : ''}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }}>Not recorded.</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TAB 3: DOCUMENT NEW DIAGNOSIS & CLINICAL NOTES ───── */}
            {chartActiveTab === 'new_diagnosis' && (
              <div>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', fontSize: '0.8rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BadgeCheck size={16} />
                  <span>Only authorized licensed physicians can document official clinical diagnoses into the Ethiopian patient health card.</span>
                </div>

                {activePatientModal.status === 'completed' && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', fontSize: '0.84rem', color: '#065f46', fontWeight: 700 }}>
                    This visit is already completed and saved.
                  </div>
                )}
                {saveError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', fontSize: '0.84rem', color: '#991b1b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={16} /> {saveError}
                  </div>
                )}
                <form onSubmit={handleSaveDiagnosis}>
                  <div className="form-group">
                    <label className="form-label">Clinical Diagnosis *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="e.g. Acute Bacterial Pharyngitis, Viral Bronchitis, Mild Gastroenteritis"
                      value={newDiagnosis}
                      onChange={(e) => setNewDiagnosis(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Physician Clinical Findings & Observations</label>
                    <textarea
                      rows={3}
                      className="form-control"
                      placeholder="Examination notes: pharynx, chest auscultation, vitals, temperature, lymphadenopathy..."
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Prescribed Medications (Comma separated)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Amoxicillin 500mg TID x 7d, Paracetamol 500mg PRN, Oral Rehydration Salt"
                      value={prescribedMedication}
                      onChange={(e) => setPrescribedMedication(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                    <button
                      type="button"
                      onClick={() => setChartActiveTab('history')}
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={savingDiagnosis || activePatientModal.status === 'completed'}
                      style={{ flex: 1.8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Check size={16} /> {savingDiagnosis ? 'Saving…' : 'Save Diagnosis & Complete Visit'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal Bottom Footer */}
            <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={14} /> Print Patient Record
              </button>

              <button
                type="button"
                onClick={() => setActivePatientModal(null)}
                className="btn btn-secondary btn-sm"
              >
                Close Chart
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
