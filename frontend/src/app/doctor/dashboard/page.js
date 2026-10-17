'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
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

export default function DoctorDashboardPage() {
  const { user, mounted } = useAuth();
  const { clinicName, clinicLogo } = useClinic();
  const router = useRouter();

  // Active Filter / Tab
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'waiting' | 'in_consultation' | 'completed'
  const [selectedSlotFilter, setSelectedSlotFilter] = useState('all');

  // Active Patient for Clinical Chart Modal
  const [activePatientModal, setActivePatientModal] = useState(null);
  const [chartActiveTab, setChartActiveTab] = useState('history'); // 'history' | 'conditions' | 'new_diagnosis'
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Doctor Clinical Notes & New Diagnosis Form State
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescribedMedication, setPrescribedMedication] = useState('');
  const [patientVitals, setPatientVitals] = useState({
    bp: '120/80 mmHg',
    temp: '37.1 °C',
    pulse: '76 bpm',
    weight: '68 kg'
  });

  // Doctor's consultation slots
  const [doctorSlots, setDoctorSlots] = useState([
    '08:45 AM',
    '09:30 AM',
    '11:00 AM',
    '02:00 PM',
    '03:15 PM'
  ]);

  // Patients Registered for this Doctor's Slots
  const [registeredPatients, setRegisteredPatients] = useState([
    {
      id: 'apt-201',
      patientName: 'Bereket Tadesse',
      relationship: 'Self (Account Holder)',
      gender: 'male',
      age: 28,
      birthDate: '1998-05-14',
      phoneNumber: '+251911445566',
      nationalId: 'ET-FAYDA-94821',
      cardNumber: 'CLN-2026-00001',
      queueNumber: 1,
      slot: '08:45 AM',
      date: 'Today, Oct 13',
      status: 'in_consultation', // 'waiting' | 'in_consultation' | 'completed'
      chiefComplaint: 'Persistent dry cough, mild chest tightness and evening fever for 3 days.',
      isPaid: true,
      bloodType: 'O+',
      allergies: ['Penicillin', 'Dust'],
      chronicConditions: ['Mild Seasonal Asthma'],
      activeMedications: ['Salbutamol Inhaler PRN'],
      emergencyContact: {
        name: 'Tadesse Bekele',
        phone: '+251911223344',
        relationship: 'Father'
      },
      diagnosisHistory: [
        {
          id: 'dx-1',
          date: 'Oct 24, 2025',
          doctorName: 'Dr. Dawit Tadesse',
          clinic: 'CareSync Central Clinic',
          diagnosis: 'Acute Upper Respiratory Tract Infection (URTI)',
          symptoms: 'Rhinorrhea, throat irritation, low-grade fever (37.8°C).',
          notes: 'Pharynx mildly erythematous. Lungs clear bilaterally. Negative for tonsillar exudate.',
          prescriptions: ['Amoxicillin 500mg PO TID x 7 days', 'Paracetamol 500mg PO PRN']
        },
        {
          id: 'dx-2',
          date: 'June 10, 2025',
          doctorName: 'Dr. Selamawit Bekele',
          clinic: 'Bole Medhanealem Clinic',
          diagnosis: 'Mild Bronchospasm / Asthmatic Exacerbation',
          symptoms: 'Shortness of breath after dust exposure.',
          notes: 'Scattered expiratory wheezes in lower lobes. Chest X-ray clear.',
          prescriptions: ['Salbutamol 100mcg MDI 2 puffs QID x 5 days', 'Cetirizine 10mg OD']
        },
        {
          id: 'dx-3',
          date: 'Jan 15, 2025',
          doctorName: 'Dr. Yared Assefa',
          clinic: 'Sarbet Specialist Hospital',
          diagnosis: 'Routine Health Checkup & Annual Screen',
          symptoms: 'Asymptomatic. Requested general blood panel and ECG.',
          notes: 'BP 118/76 mmHg. Heart sounds regular. Blood work unremarkable.',
          prescriptions: ['Multivitamin 1 tablet daily']
        }
      ]
    },
    {
      id: 'apt-202',
      patientName: 'Tigist Bekele',
      relationship: 'Daughter (Dependent)',
      gender: 'female',
      age: 7,
      birthDate: '2019-03-22',
      phoneNumber: '+251911889900',
      nationalId: 'ET-FAYDA-11029',
      cardNumber: 'CLN-2026-00045',
      queueNumber: 2,
      slot: '09:30 AM',
      date: 'Today, Oct 13',
      status: 'waiting',
      chiefComplaint: 'High fever (38.9°C), sore throat, pain swallowing solids for 2 days.',
      isPaid: true,
      bloodType: 'A+',
      allergies: ['No known drug allergies'],
      chronicConditions: ['None reported'],
      activeMedications: ['None'],
      emergencyContact: {
        name: 'Bereket Tadesse',
        phone: '+251911445566',
        relationship: 'Father'
      },
      diagnosisHistory: [
        {
          id: 'dx-4',
          date: 'Nov 12, 2025',
          doctorName: 'Dr. Helina Girma',
          clinic: 'CMC Family Care Center',
          diagnosis: 'Pediatric Acute Otitis Media (Left Ear)',
          symptoms: 'Left ear pain, irritability, mild fever.',
          notes: 'Left tympanic membrane bulging and erythematous.',
          prescriptions: ['Amoxicillin-Clavulanate 250mg susp TID x 7d', 'Ibuprofen susp 5ml PRN']
        }
      ]
    },
    {
      id: 'apt-203',
      patientName: 'Aster Wolde',
      relationship: 'Mother (Dependent)',
      gender: 'female',
      age: 62,
      birthDate: '1964-11-08',
      phoneNumber: '+251911776655',
      nationalId: 'ET-FAYDA-77218',
      cardNumber: 'CLN-2026-00088',
      queueNumber: 3,
      slot: '11:00 AM',
      date: 'Today, Oct 13',
      status: 'waiting',
      chiefComplaint: 'Monthly hypertension follow-up and blood pressure review. Occasional morning headaches.',
      isPaid: true,
      bloodType: 'B+',
      allergies: ['Sulfonamides'],
      chronicConditions: ['Essential Hypertension (Stage 1)', 'Mild Osteoarthritis'],
      activeMedications: ['Amlodipine 5mg OD', 'Hydrochlorothiazide 12.5mg OD'],
      emergencyContact: {
        name: 'Dawit Tadesse',
        phone: '+251911332211',
        relationship: 'Son'
      },
      diagnosisHistory: [
        {
          id: 'dx-5',
          date: 'Sep 02, 2025',
          doctorName: 'Dr. Yared Assefa',
          clinic: 'Sarbet Specialist Hospital',
          diagnosis: 'Essential Hypertension Review',
          symptoms: 'Mild dizziness, BP elevated at 144/92 mmHg.',
          notes: 'Adjusted medication regimen. Fundoscopic exam normal. Recommended low sodium diet.',
          prescriptions: ['Amlodipine 5mg daily', 'Hydrochlorothiazide 12.5mg daily']
        }
      ]
    },
    {
      id: 'apt-204',
      patientName: 'Kidus Tadesse',
      relationship: 'Son (Dependent)',
      gender: 'male',
      age: 4,
      birthDate: '2022-08-19',
      phoneNumber: '+251911445566',
      nationalId: 'ET-FAYDA-33912',
      cardNumber: 'CLN-2026-00102',
      queueNumber: 4,
      slot: '02:00 PM',
      date: 'Today, Oct 13',
      status: 'completed',
      chiefComplaint: 'Routine pediatric growth evaluation & seasonal immunization.',
      isPaid: true,
      bloodType: 'O+',
      allergies: ['None'],
      chronicConditions: ['None'],
      activeMedications: ['None'],
      emergencyContact: {
        name: 'Bereket Tadesse',
        phone: '+251911445566',
        relationship: 'Father'
      },
      diagnosisHistory: [
        {
          id: 'dx-6',
          date: 'Today, Oct 13, 2026',
          doctorName: 'Dr. Selamawit Bekele',
          clinic: 'Bole Medhanealem Clinic',
          diagnosis: 'Routine Well-Child Pediatric Exam - Normal',
          symptoms: 'Healthy 4-year-old child presenting for routine exam.',
          notes: 'Height and weight at 65th percentile. Milestones appropriate. Lungs clear.',
          prescriptions: ['Pediatric Vitamin Drops 1ml daily']
        }
      ]
    }
  ]);

  // Update Status of Consultation
  const handleUpdateStatus = (patientId, newStatus) => {
    setRegisteredPatients(prev =>
      prev.map(p => (p.id === patientId ? { ...p, status: newStatus } : p))
    );
  };

  // Open Full Patient Chart Modal
  const openPatientChart = (patient) => {
    setActivePatientModal(patient);
    setChartActiveTab('history');
    setNewDiagnosis('');
    setClinicalNotes('');
    setPrescribedMedication('');
    setSaveSuccessMsg('');
  };

  // Doctor Documents a New Clinical Diagnosis
  const handleSaveDiagnosis = (e) => {
    e.preventDefault();
    if (!newDiagnosis.trim()) return;

    const newDxEntry = {
      id: `dx-${Date.now()}`,
      date: 'Today, Oct 13, 2026',
      doctorName: user?.name || 'Dr. Selamawit Bekele',
      clinic: 'CareSync Central Clinic - Bole Branch',
      diagnosis: newDiagnosis.trim(),
      symptoms: activePatientModal.chiefComplaint,
      notes: clinicalNotes.trim() || 'Physical examination conducted. Vitals recorded within acceptable parameters.',
      prescriptions: prescribedMedication.trim()
        ? prescribedMedication.split(',').map(m => m.trim())
        : ['Supportive care & hydration advised']
    };

    // Update patient record
    const updatedHistory = [newDxEntry, ...activePatientModal.diagnosisHistory];
    const updatedPatient = {
      ...activePatientModal,
      status: 'completed',
      diagnosisHistory: updatedHistory
    };

    setActivePatientModal(updatedPatient);
    setRegisteredPatients(prev =>
      prev.map(p => (p.id === activePatientModal.id ? updatedPatient : p))
    );

    setSaveSuccessMsg('✅ Clinical diagnosis and treatment documented in patient medical file!');
    setTimeout(() => setSaveSuccessMsg(''), 5000);

    // Reset form fields
    setNewDiagnosis('');
    setClinicalNotes('');
    setPrescribedMedication('');
    setChartActiveTab('history');
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
                Welcome, {user?.name || 'Dr. Selamawit Bekele'} 👨‍⚕️
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
          {filteredPatients.length === 0 ? (
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
                      {patient.relationship} • {patient.age} Yrs ({patient.gender}) • Blood: {patient.bloodType}
                    </div>
                  </div>

                  {/* Slot & Time */}
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 700 }}>
                      <Clock size={15} style={{ color: '#4f46e5' }} />
                      <span>{patient.date} at {patient.slot}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      Card Paid (100 ETB)
                    </span>
                  </div>

                  {/* Chief Complaint / Symptoms */}
                  <div style={{ marginBottom: '16px', fontSize: '0.84rem' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: '2px' }}>
                      Chief Complaint / Reason for Visit:
                    </div>
                    <p style={{ margin: 0, color: '#334155', lineHeight: 1.4, fontStyle: 'italic' }}>
                      "{patient.chiefComplaint}"
                    </p>
                  </div>

                  {/* Past Diagnosis count highlight */}
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <History size={14} style={{ color: '#4f46e5' }} />
                    <span><strong>{patient.diagnosisHistory.length}</strong> previous diagnoses in medical file</span>
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
                        onClick={() => handleUpdateStatus(patient.id, 'completed')}
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
                  Card: <strong style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{activePatientModal.cardNumber}</strong> • Fayda: {activePatientModal.nationalId} • Queue #{activePatientModal.queueNumber}
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
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
              fontSize: '0.8rem'
            }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Age / Gender</span>
                <strong style={{ color: '#334155' }}>{activePatientModal.age} Yrs ({activePatientModal.gender})</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Blood Group</span>
                <strong style={{ color: '#ef4444' }}>{activePatientModal.bloodType}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Recorded BP</span>
                <strong style={{ color: '#334155' }}>{patientVitals.bp}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Allergies</span>
                <strong style={{ color: '#d97706' }}>{activePatientModal.allergies.join(', ')}</strong>
              </div>
            </div>

            {/* Current Chief Complaint for This Slot */}
            <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', fontSize: '0.84rem' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#4338ca', fontWeight: 800 }}>
                Today's Consultation Complaint ({activePatientModal.slot}):
              </div>
              <div style={{ color: '#1e1b4b', fontWeight: 600, marginTop: '3px' }}>
                "{activePatientModal.chiefComplaint}"
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
                <History size={14} /> Previous Diagnoses ({activePatientModal.diagnosisHistory.length})
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                  {activePatientModal.diagnosisHistory.map((entry, index) => (
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
                          {entry.date}
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

            {/* ── TAB 2: CHRONIC CONDITIONS & ACTIVE MEDS ───────────── */}
            {chartActiveTab === 'conditions' && (
              <div style={{ fontSize: '0.85rem' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e1b4b', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Heart size={16} style={{ color: '#ef4444' }} /> Documented Chronic Conditions:
                  </h4>
                  {activePatientModal.chronicConditions && activePatientModal.chronicConditions.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {activePatientModal.chronicConditions.map((cond, cIdx) => (
                        <span key={cIdx} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
                          {cond}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>No chronic conditions reported.</div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e1b4b', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Pill size={16} style={{ color: '#4f46e5' }} /> Current Active Medications:
                  </h4>
                  {activePatientModal.activeMedications && activePatientModal.activeMedications.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {activePatientModal.activeMedications.map((med, mIdx) => (
                        <span key={mIdx} style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
                          {med}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>No active daily medications.</div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e1b4b', margin: '0 0 6px' }}>Emergency Contact:</h4>
                  <div style={{ color: '#334155' }}>
                    <strong>{activePatientModal.emergencyContact?.name}</strong> ({activePatientModal.emergencyContact?.relationship}) • Tel: {activePatientModal.emergencyContact?.phone}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: DOCUMENT NEW DIAGNOSIS & CLINICAL NOTES ───── */}
            {chartActiveTab === 'new_diagnosis' && (
              <div>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', fontSize: '0.8rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BadgeCheck size={16} />
                  <span>Only authorized licensed physicians can document official clinical diagnoses into the Ethiopian patient health card.</span>
                </div>

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
                      style={{ flex: 1.8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Check size={16} /> Save Diagnosis & Complete Visit
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
