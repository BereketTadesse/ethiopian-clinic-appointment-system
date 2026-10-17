'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import API from '@/lib/api';
import {
  Calendar,
  Clock,
  User,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Stethoscope,
  MapPin,
  Heart,
  ChevronRight,
  Shield,
  Phone,
  CreditCard,
  QrCode,
  X,
  Sparkles,
  Printer,
  BadgeCheck,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  Smartphone,
  Receipt,
  ShieldCheck
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { clinicName, clinicLogo } = useClinic();
  const router = useRouter();

  // If user is a doctor, admin, or receptionist, navigate to their dedicated dashboard
  useEffect(() => {
    if (user && user.role === 'doctor') {
      router.push('/doctor/dashboard');
    } else if (user && user.role === 'admin') {
      router.push('/admin/dashboard');
    } else if (user && user.role === 'receptionist') {
      router.push('/reception/dashboard');
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');

  // Family Members from Backend
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // ── UNIFIED GUIDED 4-STEP MODAL FLOW ──────────────────────────
  // Step 1: 'patient' -> Step 2: 'doctor' -> Step 3: 'slot' -> Step 4: 'payment_confirm' -> 'complete' | 'card_viewer'
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [flowStep, setFlowStep] = useState('patient');

  // Step 1: Patient Selection & Card Info
  const [flowRecipientType, setFlowRecipientType] = useState('self'); // 'self' | 'family' | 'other'
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [activePatient, setActivePatient] = useState(null);

  // New Person / Dependent Registration State (for 'other')
  const [newPerson, setNewPerson] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'female',
    relationship: 'daughter',
    phoneNumber: '',
    nationalId: ''
  });

  // Step 2 & 3: Doctor, Date & Time Slot
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [slotSpecialtyFilter, setSlotSpecialtyFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('Tomorrow, Oct 14');
  const [selectedSlot, setSelectedSlot] = useState('');

  // Step 4: Payment & Reason
  const [paymentMethod, setPaymentMethod] = useState('telebirr'); // 'telebirr' | 'cbebirr' | 'chapa'
  const [paymentPhone, setPaymentPhone] = useState('0911223344');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [latestBookedApt, setLatestBookedApt] = useState(null);

  // Deterministic date options to prevent SSR hydration issues
  const availableDates = [
    'Today, Oct 13',
    'Tomorrow, Oct 14',
    'Wednesday, Oct 15',
    'Thursday, Oct 16'
  ];

  // Doctors & Slot Directory
  const doctors = [
    {
      id: 'doc-1',
      name: 'Dr. Selamawit Bekele',
      specialty: 'General Medicine',
      experience: '8 Years Exp',
      location: 'Bole Medhanealem Clinic',
      availableToday: true,
      rating: 4.9,
      slots: ['08:45 AM', '09:30 AM', '11:00 AM', '02:00 PM', '03:15 PM']
    },
    {
      id: 'doc-2',
      name: 'Dr. Yared Assefa',
      specialty: 'Cardiologist',
      experience: '12 Years Exp',
      location: 'Sarbet Specialist Hospital',
      availableToday: true,
      rating: 4.8,
      slots: ['09:00 AM', '10:30 AM', '01:30 PM', '04:00 PM']
    },
    {
      id: 'doc-3',
      name: 'Dr. Helina Girma',
      specialty: 'Pediatrician',
      experience: '6 Years Exp',
      location: 'CMC Family Care Center',
      availableToday: true,
      rating: 5.0,
      slots: ['08:30 AM', '10:00 AM', '01:00 PM', '02:30 PM', '04:30 PM']
    },
    {
      id: 'doc-4',
      name: 'Dr. Ermias Kebede',
      specialty: 'Dental Surgeon',
      experience: '10 Years Exp',
      location: 'Kazanchis Dental Pavilion',
      availableToday: true,
      rating: 4.7,
      slots: ['09:15 AM', '11:30 AM', '02:15 PM', '05:00 PM']
    },
    {
      id: 'doc-5',
      name: 'Dr. Almaz Tefera',
      specialty: 'Gynecologist',
      experience: '9 Years Exp',
      location: 'Hayat Maternal Center',
      availableToday: true,
      rating: 4.9,
      slots: ['09:00 AM', '11:00 AM', '01:45 PM', '03:30 PM']
    }
  ];

  // Standardized sequential Clinic Card number
  const makeCardNumber = (seed) => {
    const cleanSeed = String(seed || '00001').slice(-5);
    return `CLN-2026-${cleanSeed.padStart(5, '0')}`;
  };

  // Preloaded Appointments List
  const [appointments, setAppointments] = useState([
    {
      id: 'apt-101',
      doctorName: 'Dr. Selamawit Bekele',
      specialty: 'General Medicine',
      clinic: 'CareSync Central Clinic - Bole Branch',
      date: 'Tomorrow, Oct 14',
      time: '09:30 AM',
      forPerson: 'Self (Primary Account Holder)',
      patientName: 'Account Holder',
      cardNumber: 'CLN-2026-00001',
      queueNumber: 1,
      status: 'confirmed',
      room: 'Room 204',
      paymentFee: '100 ETB',
      paymentMethod: 'Telebirr',
      paymentTxnId: 'TXN-TB-2026-00001',
      isPaid: true
    },
    {
      id: 'apt-102',
      doctorName: 'Dr. Dawit Tadesse',
      specialty: 'Pediatrician',
      clinic: 'CareSync Children Hospital - Piassa',
      date: 'Friday, Oct 17',
      time: '02:00 PM',
      forPerson: 'Tigist (Daughter)',
      patientName: 'Tigist Bekele',
      cardNumber: 'CLN-2026-00045',
      queueNumber: 4,
      status: 'confirmed',
      room: 'Room 105',
      paymentFee: '100 ETB',
      paymentMethod: 'CBE Birr',
      paymentTxnId: 'TXN-CBE-2026-00045',
      isPaid: true
    }
  ]);

  // Fetch real registered family members
  const fetchFamilyMembers = async () => {
    try {
      setLoadingMembers(true);
      const { data } = await API.get('/users/getAllFamilyMembers');
      const list = data.members || data.familyMembers || [];
      setFamilyMembers(list);
      if (list.length > 0 && !selectedFamilyId) {
        setSelectedFamilyId(list[0]._id);
      }
    } catch (err) {
      console.log('Notice: Could not load family members', err?.message);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  // Listen for deep-link / URL query parameters to launch flow seamlessly
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const memberId = params.get('bookMemberId');
      const action = params.get('action');

      if (memberId && familyMembers.length > 0) {
        const found = familyMembers.find(m => m._id === memberId);
        if (found) {
          startFlowForPerson(found);
          window.history.replaceState({}, '', '/dashboard');
        }
      } else if (action === 'book' || action === 'take_card') {
        startUnifiedFlow();
        window.history.replaceState({}, '', '/dashboard');
      }
    }
  }, [familyMembers]);

  const handleCancelAppointment = (id) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      setAppointments(appointments.filter(a => a.id !== id));
    }
  };

  // ── UNIFIED FLOW LAUNCHERS ─────────────────────────────────────

  // Primary launcher for both "Book an Appointment" and "Take a Clinic Card"
  const startUnifiedFlow = () => {
    setBookingError('');
    setFlowRecipientType('self');
    const defaultPatient = {
      patientName: user?.name || 'Account Holder',
      relationship: 'Account Holder',
      forPerson: 'Self (Primary Account Holder)',
      memberId: 'self',
      cardNumber: makeCardNumber(user?._id || '00001'),
      dateOfBirth: user?.birthDate || null,
      gender: user?.gender || 'Not specified',
      nationalId: user?.nationalId || null,
      isPaid: false
    };
    setActivePatient(defaultPatient);
    setSelectedDoctor(doctors[0]);
    setSelectedDate('Tomorrow, Oct 14');
    setSelectedSlot(doctors[0]?.slots[0] || '09:30 AM');
    setPaymentPhone(user?.phoneNumber || '0911223344');
    setFlowStep('patient');
    setShowFlowModal(true);
  };

  // Launching flow for a specific person (e.g. from family members card)
  const startFlowForPerson = (member) => {
    setBookingError('');
    const patientObj = {
      patientName: member.fullName,
      relationship: member.relationship || 'Dependent',
      forPerson: `${member.fullName} (${member.relationship})`,
      memberId: member._id,
      cardNumber: makeCardNumber(member._id),
      dateOfBirth: member.dateOfBirth,
      gender: member.gender,
      nationalId: member.nationalId,
      isPaid: false
    };
    setActivePatient(patientObj);
    setFlowRecipientType('family');
    setSelectedFamilyId(member._id);
    setSelectedDoctor(doctors[0]);
    setSelectedDate('Tomorrow, Oct 14');
    setSelectedSlot(doctors[0]?.slots[0] || '09:30 AM');
    // Start at doctor selection since patient is locked in
    setFlowStep('doctor');
    setShowFlowModal(true);
  };

  // View Digital Clinic Card Viewer
  const openCardViewer = (item) => {
    setActivePatient({
      patientName: item.patientName || item.fullName || user?.name || 'Patient',
      relationship: item.relationship || (item.forPerson?.includes('Self') ? 'Account Holder' : item.forPerson) || 'Account Holder',
      cardNumber: item.cardNumber || makeCardNumber(item._id || '00001'),
      memberId: item._id || item.memberId || 'self',
      dateOfBirth: item.dateOfBirth || null,
      gender: item.gender || 'Not specified',
      nationalId: item.nationalId || null,
      doctorName: item.doctorName,
      clinic: item.clinic || 'CareSync Ethiopian Health Network',
      isPaid: true,
      paymentTxnId: item.paymentTxnId || 'TXN-TB-2026-88192',
      paymentMethod: item.paymentMethod || 'Telebirr',
      paymentFee: item.paymentFee || '100 ETB'
    });
    setFlowStep('card_viewer');
    setShowFlowModal(true);
  };

  // When user clicks a doctor or slot directly on the page
  const handlePageDoctorOrSlotClick = (doctor, slot = null) => {
    setBookingError('');
    const defaultPatient = activePatient || {
      patientName: user?.name || 'Account Holder',
      relationship: 'Account Holder',
      forPerson: 'Self (Primary Account Holder)',
      memberId: 'self',
      cardNumber: makeCardNumber(user?._id || '00001'),
      dateOfBirth: user?.birthDate || null,
      gender: user?.gender || 'Not specified',
      nationalId: user?.nationalId || null,
      isPaid: false
    };
    setActivePatient(defaultPatient);
    setSelectedDoctor(doctor);
    setSelectedDate('Tomorrow, Oct 14');
    setSelectedSlot(slot || doctor.slots[0]);
    // Guide them into the 4th step (Payment & Confirm) or Step 1
    setFlowStep(slot ? 'payment_confirm' : 'slot');
    setShowFlowModal(true);
  };

  // ── STEP 1: PROCEED FROM PATIENT STEP -> DOCTOR (STEP 2) ──────
  const handleProceedFromPatientStep = async (e) => {
    if (e) e.preventDefault();
    setBookingError('');

    try {
      let patientData = null;

      // Option 1: Myself
      if (flowRecipientType === 'self') {
        patientData = {
          patientName: user?.name || 'Account Holder',
          relationship: 'Account Holder',
          forPerson: 'Self (Primary Account Holder)',
          memberId: 'self',
          cardNumber: makeCardNumber(user?._id || '00001'),
          dateOfBirth: user?.birthDate || null,
          gender: user?.gender || 'Not specified',
          nationalId: user?.nationalId || null,
          isPaid: false
        };
      }

      // Option 2: Family Member
      else if (flowRecipientType === 'family') {
        const found = familyMembers.find(m => m._id === selectedFamilyId) || familyMembers[0];
        if (!found) {
          setBookingError('Please select a registered family member or choose "Other / New" to add one.');
          return;
        }
        patientData = {
          patientName: found.fullName,
          relationship: found.relationship,
          forPerson: `${found.fullName} (${found.relationship})`,
          memberId: found._id,
          cardNumber: makeCardNumber(found._id),
          dateOfBirth: found.dateOfBirth,
          gender: found.gender,
          nationalId: found.nationalId,
          isPaid: false
        };
      }

      // Option 3: Other / Register New Dependent
      else if (flowRecipientType === 'other') {
        if (!newPerson.fullName.trim() || !newPerson.dateOfBirth) {
          setBookingError('Please enter full name and date of birth to register this person.');
          return;
        }

        let generatedId = Date.now();
        try {
          const createRes = await API.post('/users/createFamilyMember', newPerson);
          if (createRes.data?.member?._id) {
            generatedId = createRes.data.member._id;
          }
          await fetchFamilyMembers();
        } catch (err) {
          console.log('API save notice:', err.message);
        }

        const cardNum = makeCardNumber(generatedId);
        patientData = {
          patientName: newPerson.fullName,
          relationship: newPerson.relationship,
          forPerson: `${newPerson.fullName} (${newPerson.relationship})`,
          memberId: generatedId,
          cardNumber: cardNum,
          dateOfBirth: newPerson.dateOfBirth,
          gender: newPerson.gender,
          nationalId: newPerson.nationalId,
          isPaid: false
        };

        // Reset new person form
        setNewPerson({
          fullName: '',
          dateOfBirth: '',
          gender: 'female',
          relationship: 'daughter',
          phoneNumber: '',
          nationalId: ''
        });
      }

      setActivePatient(patientData);
      if (!selectedDoctor) setSelectedDoctor(doctors[0]);
      setFlowStep('doctor');
    } catch (err) {
      setBookingError(err.message || 'Failed to process patient card');
    }
  };

  // ── STEP 2: DOCTOR SELECTED -> PROCEED TO SLOT (STEP 3) ───────
  const handleSelectDoctorAndProceed = (doctor) => {
    setSelectedDoctor(doctor);
    if (!selectedSlot || !doctor.slots.includes(selectedSlot)) {
      setSelectedSlot(doctor.slots[0]);
    }
    setFlowStep('slot');
  };

  // ── STEP 3: SLOT SELECTED -> PROCEED TO PAYMENT (STEP 4) ──────
  const handleSelectSlotAndProceed = (slot) => {
    setSelectedSlot(slot);
    setFlowStep('payment_confirm');
  };

  // ── STEP 4: CARD PAYMENT (100 ETB) & COMPLETE CARD TAKING ─────
  const handleCompleteCardTakingAndBooking = (e) => {
    if (e) e.preventDefault();
    setIsProcessingPayment(true);
    setBookingError('');

    // Simulate authentic Ethiopian payment processing (1.2s delay - Frontend Only)
    setTimeout(() => {
      setIsProcessingPayment(false);

      if (!selectedDoctor || !selectedSlot) {
        setBookingError('Please select a doctor and consultation time slot.');
        return;
      }

      const generatedTxnId = `TXN-${paymentMethod === 'telebirr' ? 'TB' : paymentMethod === 'cbebirr' ? 'CBE' : 'CHP'}-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const assignedQueue = appointments.filter(a => a.doctorName === selectedDoctor.name).length + 1;
      const paymentMethodName = paymentMethod === 'telebirr' ? 'Telebirr' : paymentMethod === 'cbebirr' ? 'CBE Birr' : 'Chapa';

      const updatedPatient = {
        ...activePatient,
        isPaid: true,
        paymentTxnId: generatedTxnId,
        paymentMethod: paymentMethodName,
        paymentFee: '100 ETB',
        paymentDate: 'Today, Oct 13, 2026'
      };

      const newApt = {
        id: `apt-${Date.now()}`,
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        clinic: selectedDoctor.location,
        date: selectedDate,
        time: selectedSlot,
        forPerson: activePatient?.forPerson || 'Self (Primary Account Holder)',
        patientName: activePatient?.patientName || user?.name || 'Account Holder',
        cardNumber: activePatient?.cardNumber || makeCardNumber(user?._id || '00001'),
        queueNumber: assignedQueue,
        status: 'confirmed',
        room: `Suite ${100 + assignedQueue}`,
        reason: reasonForVisit.trim() || 'General Clinical Consultation',
        paymentFee: '100 ETB',
        paymentMethod: paymentMethodName,
        paymentTxnId: generatedTxnId,
        isPaid: true
      };

      setActivePatient(updatedPatient);
      setAppointments([newApt, ...appointments]);
      setLatestBookedApt(newApt);
      setFlowStep('complete');

      setBookingSuccess(`🎉 Card officially issued & consultation spot confirmed! 100 ETB verified via ${paymentMethodName} (Ref: ${generatedTxnId}). Queue #${assignedQueue}`);
      setTimeout(() => setBookingSuccess(''), 7000);
    }, 1200);
  };

  // Filtered doctors for in-modal selection
  const filteredModalDoctors = slotSpecialtyFilter === 'all'
    ? doctors
    : doctors.filter(d => d.specialty.toLowerCase().includes(slotSpecialtyFilter.toLowerCase()));

  // Filtered doctors for on-page directory
  const filteredPageDoctors = selectedSpecialty === 'all'
    ? doctors
    : doctors.filter(d => d.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase()));

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', minHeight: '90vh', padding: '36px 0 60px' }}>
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
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#4f46e5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                <Shield size={14} /> {clinicName} • Patient Portal
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', margin: 0 }}>
                Welcome, {user?.name || 'Valued Patient'} 👋
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px' }}>
                Take clinic cards with integrated 4-step Telebirr/CBE payment, book consultation spots, and view your live queue numbers at {clinicName}.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {/* Primary Action: Book Appointment Flow */}
            <button
              onClick={startUnifiedFlow}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
            >
              <Calendar size={16} /> Book an Appointment (ቀጠሮ ያስይዙ)
            </button>

            <Link href="/family-members" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} /> Family Members ({familyMembers.length})
            </Link>

            <Link href="/profile" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} /> My Patient Profile
            </Link>
          </div>
        </div>

        {/* Global Success Notification */}
        {bookingSuccess && (
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
            <span style={{ fontWeight: 600 }}>{bookingSuccess}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '32px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Active Consultations</span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{appointments.length}</div>
            <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, marginTop: '4px' }}>Queue spot live</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Registered Family Cards</span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{familyMembers.length + 1}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>You + {familyMembers.length} Dependents</div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Primary Clinic Card</span>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '6px', fontFamily: 'monospace' }}>
              {makeCardNumber(user?._id || '00001')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600, marginTop: '4px' }}>
              <button
                onClick={() => openCardViewer({ patientName: user?.name, forPerson: 'Self', cardNumber: makeCardNumber(user?._id || '00001') })}
                style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: 0, fontWeight: 700 }}
              >
                View Digital Card (Paid) →
              </button>
            </div>
          </div>
        </div>

        {/* Section 1: Upcoming Consultations */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Your Clinic Consultations & Queue Spots
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Appointments booked with allocated queue spots and clinic cards
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`btn btn-sm ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Upcoming ({appointments.length})
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`btn btn-sm ${activeTab === 'past' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Past History
              </button>
            </div>
          </div>

          {activeTab === 'upcoming' ? (
            appointments.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
                <Calendar size={40} style={{ color: '#cbd5e1', marginBottom: '12px', display: 'inline-block' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>No active appointments booked</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '6px 0 16px' }}>
                  Take a clinic card and reserve a consultation spot using our unified 4-step flow.
                </p>
                <button onClick={startUnifiedFlow} className="btn btn-primary btn-sm">
                  <Calendar size={15} /> Book an Appointment (ቀጠሮ ያስይዙ)
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
                {appointments.map((apt) => (
                  <div key={apt.id} className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #4f46e5', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: apt.status === 'confirmed' ? '#ecfdf5' : '#fef3c7',
                            color: apt.status === 'confirmed' ? '#047857' : '#92400e'
                          }}>
                            ● {apt.status}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: '#eef2ff',
                            color: '#4338ca',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            Queue #{apt.queueNumber}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {apt.doctorName}
                        </h3>
                        <div style={{ fontSize: '0.82rem', color: '#4f46e5', fontWeight: 600 }}>{apt.specialty}</div>
                      </div>

                      <span style={{
                        fontSize: '0.75rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        color: '#334155'
                      }}>
                        For: {apt.forPerson}
                      </span>
                    </div>

                    {/* Card and Spot Details */}
                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        <CreditCard size={15} style={{ color: '#4f46e5' }} />
                        <span>Card: <strong style={{ fontFamily: 'monospace' }}>{apt.cardNumber}</strong></span>
                        <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginLeft: '4px' }}>
                          Paid 100 ETB
                        </span>
                      </div>
                      <button
                        onClick={() => openCardViewer(apt)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                      >
                        View Card (ካርድ)
                      </button>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={15} style={{ color: '#4f46e5' }} />
                        <span>{apt.date} • {apt.time}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={15} style={{ color: '#10b981' }} />
                        <span>{apt.room}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Cancel Booking
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>Completed 3 consultations in September 2026. All medical records and cards saved to your master clinic profile.</p>
            </div>
          )}
        </div>

        {/* Section 2: Doctor Directory with 1-Click Flow Initiation */}
        <div id="doctor-directory">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Find a Doctor & Reserve a Consultation Spot
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Browse certified physicians or click any time slot to enter the 4-step guided booking flow
              </p>
            </div>
            <button onClick={startUnifiedFlow} className="btn btn-primary btn-sm">
              <Calendar size={15} /> Open Booking Flow →
            </button>
          </div>

          {/* Specialty Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {['all', 'General', 'Cardiologist', 'Pediatrician', 'Dental', 'Gynecologist'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedSpecialty(filter)}
                className={`btn btn-sm ${selectedSpecialty === filter ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textTransform: 'capitalize' }}
              >
                {filter === 'all' ? 'All Specialties' : filter}
              </button>
            ))}
          </div>

          {/* Doctor Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            {filteredPageDoctors.map((doc) => (
              <div key={doc.id} className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 700
                  }}>
                    👨‍⚕️
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{doc.name}</h3>
                    <span style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600 }}>{doc.specialty}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <MapPin size={14} /> <span>{doc.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Stethoscope size={14} /> <span>{doc.experience} • Rating {doc.rating} ★</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Available Slots:
                    </span>
                    <button
                      onClick={() => handlePageDoctorOrSlotClick(doc)}
                      style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Book Flow →
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {doc.slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => handlePageDoctorOrSlotClick(doc, slot)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 🌟 UNIFIED 4-STEP FLOW MODAL (PAYMENT AS STEP 4)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showFlowModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 100,
          overflowY: 'auto'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '28px', background: 'white', maxHeight: '94vh', overflowY: 'auto', position: 'relative', borderRadius: '20px' }}>
            
            {/* Modal Top Header & Close */}
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
                  {flowStep === 'patient' && 'Step 1 of 4: Patient Selection'}
                  {flowStep === 'doctor' && 'Step 2 of 4: Choose Physician'}
                  {flowStep === 'slot' && 'Step 3 of 4: Choose Date & Slot'}
                  {flowStep === 'payment_confirm' && 'Step 4 of 4: Card Payment & Confirmation'}
                  {flowStep === 'complete' && 'Card Issued & Queue Allocated'}
                  {flowStep === 'card_viewer' && 'Official Digital Clinic Card'}
                </span>

                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {flowStep === 'patient' && 'Select Patient & Clinic Card'}
                  {flowStep === 'doctor' && 'Select Attending Physician'}
                  {flowStep === 'slot' && 'Choose Consultation Date & Slot'}
                  {flowStep === 'payment_confirm' && 'Card Payment (100 ETB) & Confirmation'}
                  {flowStep === 'complete' && '🎉 Card Issued & Spot Secured!'}
                  {flowStep === 'card_viewer' && 'Ethiopian Digital Clinic Card'}
                </h2>
              </div>

              <button
                onClick={() => setShowFlowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', borderRadius: '6px' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Visual 4-Step Progress Indicator */}
            {['patient', 'doctor', 'slot', 'payment_confirm'].includes(flowStep) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '20px'
              }}>
                {[
                  { id: 'patient', label: '1. Patient' },
                  { id: 'doctor', label: '2. Doctor' },
                  { id: 'slot', label: '3. Slot' },
                  { id: 'payment_confirm', label: '4. Pay & Finish' }
                ].map((step, idx) => {
                  const stepOrder = ['patient', 'doctor', 'slot', 'payment_confirm'];
                  const currentIndex = stepOrder.indexOf(flowStep);
                  const isCurrent = flowStep === step.id;
                  const isPassed = stepOrder.indexOf(step.id) < currentIndex;

                  return (
                    <React.Fragment key={step.id}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: isCurrent ? 800 : 600,
                        color: isCurrent ? '#4f46e5' : isPassed ? '#10b981' : '#94a3b8'
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          background: isCurrent ? '#4f46e5' : isPassed ? '#10b981' : '#e2e8f0',
                          color: isCurrent || isPassed ? 'white' : '#64748b',
                          fontWeight: 800
                        }}>
                          {isPassed ? <Check size={12} /> : idx + 1}
                        </div>
                        <span className="hide-on-mobile">{step.label.replace(/^\d+\.\s*/, '')}</span>
                      </div>
                      {idx < 3 && (
                        <div style={{
                          flex: 1,
                          height: '2px',
                          background: isPassed ? '#10b981' : '#e2e8f0',
                          margin: '0 8px'
                        }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Validation / Error Banner */}
            {bookingError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{bookingError}</span>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* STEP 1: PATIENT SELECTION                                   */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {flowStep === 'patient' && (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: '16px' }}>
                  Select who this clinic card is for. A 100 ETB official card fee will be payable at Step 4:
                </p>

                {/* Recipient Segmented Selector */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFlowRecipientType('self');
                        setBookingError('');
                      }}
                      className={`btn btn-sm ${flowRecipientType === 'self' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.82rem', padding: '8px 6px' }}
                    >
                      <User size={14} /> Myself
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFlowRecipientType('family');
                        setBookingError('');
                      }}
                      className={`btn btn-sm ${flowRecipientType === 'family' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.82rem', padding: '8px 6px' }}
                    >
                      <Users size={14} /> Family Member
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFlowRecipientType('other');
                        setBookingError('');
                      }}
                      className={`btn btn-sm ${flowRecipientType === 'other' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.82rem', padding: '8px 6px' }}
                    >
                      <Plus size={14} /> Other / New
                    </button>
                  </div>
                </div>

                <form onSubmit={handleProceedFromPatientStep}>
                  {/* TAB 1: MYSELF */}
                  {flowRecipientType === 'self' && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.02rem', color: 'var(--text-main)' }}>
                            {user?.name || 'Primary Account Holder'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600 }}>
                            Primary Patient Account
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                        <div>
                          <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Email</span>
                          <strong style={{ color: '#334155' }}>{user?.email || 'N/A'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Clinic Card Number</span>
                          <strong style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{makeCardNumber(user?._id || '00001')}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: EXISTING FAMILY MEMBER */}
                  {flowRecipientType === 'family' && (
                    <div style={{ marginBottom: '20px' }}>
                      {familyMembers.length === 0 ? (
                        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
                          <Users size={28} style={{ color: '#94a3b8', margin: '0 auto 6px', display: 'block' }} />
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '4px' }}>No Family Members Added Yet</div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
                            You haven't registered any dependents. Click "Other / New" to add a child, spouse, or parent.
                          </p>
                          <button
                            type="button"
                            onClick={() => setFlowRecipientType('other')}
                            className="btn btn-primary btn-sm"
                          >
                            <Plus size={14} /> Register Someone New
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label" style={{ fontWeight: 700 }}>Select Registered Dependent:</label>
                            <select
                              className="form-control"
                              value={selectedFamilyId || (familyMembers[0]?._id || '')}
                              onChange={(e) => setSelectedFamilyId(e.target.value)}
                              style={{ fontWeight: 600 }}
                            >
                              {familyMembers.map((m) => (
                                <option key={m._id} value={m._id}>
                                  {m.fullName} — ({m.relationship})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Selected Family Member Preview */}
                          {(() => {
                            const activeFam = familyMembers.find(m => m._id === selectedFamilyId) || familyMembers[0];
                            if (!activeFam) return null;
                            return (
                              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', fontSize: '0.82rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)' }}>{activeFam.fullName}</span>
                                  <span style={{ background: '#eef2ff', color: '#4338ca', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, textTransform: 'capitalize' }}>
                                    {activeFam.relationship}
                                  </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: 'var(--text-muted)' }}>
                                  <div>DOB: {activeFam.dateOfBirth ? new Date(activeFam.dateOfBirth).toLocaleDateString() : 'N/A'} ({activeFam.gender})</div>
                                  <div>Card: <strong style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{makeCardNumber(activeFam._id)}</strong></div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: OTHER / NEW (AUTO-REGISTRATION) */}
                  {flowRecipientType === 'other' && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '0.8rem', color: '#3730a3', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} style={{ flexShrink: 0 }} />
                        <span>
                          Entering details below will <strong>save them as a family member</strong> and advance to doctor selection.
                        </span>
                      </div>

                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label className="form-label">Full Name *</label>
                        <input
                          type="text"
                          required
                          className="form-control"
                          placeholder="e.g. Bethlehem Tadesse"
                          value={newPerson.fullName}
                          onChange={(e) => setNewPerson({ ...newPerson, fullName: e.target.value })}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Date of Birth *</label>
                          <input
                            type="date"
                            required
                            className="form-control"
                            value={newPerson.dateOfBirth}
                            onChange={(e) => setNewPerson({ ...newPerson, dateOfBirth: e.target.value })}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Gender</label>
                          <select
                            className="form-control"
                            value={newPerson.gender}
                            onChange={(e) => setNewPerson({ ...newPerson, gender: e.target.value })}
                          >
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label className="form-label">Relationship to Account Holder</label>
                        <select
                          className="form-control"
                          value={newPerson.relationship}
                          onChange={(e) => setNewPerson({ ...newPerson, relationship: e.target.value })}
                        >
                          <option value="daughter">Daughter</option>
                          <option value="son">Son</option>
                          <option value="wife">Wife</option>
                          <option value="husband">Husband</option>
                          <option value="mother">Mother</option>
                          <option value="father">Father</option>
                          <option value="sister">Sister</option>
                          <option value="brother">Brother</option>
                          <option value="grandmother">Grandmother</option>
                          <option value="grandfather">Grandfather</option>
                          <option value="other">Other Dependent</option>
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Phone (Optional)</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="+251911..."
                            value={newPerson.phoneNumber}
                            onChange={(e) => setNewPerson({ ...newPerson, phoneNumber: e.target.value })}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Fayda ID (Optional)</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="ET-FAYDA-..."
                            value={newPerson.nationalId}
                            onChange={(e) => setNewPerson({ ...newPerson, nationalId: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Flow Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="button" onClick={() => setShowFlowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 1.6, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <span>Next: Select Doctor (ቀጣይ: ሐኪም)</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* STEP 2: CHOOSE SPECIALTY & DOCTOR                           */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {flowStep === 'doctor' && (
              <div>
                {/* Active Patient Indicator Banner */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Card Recipient:</span>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                      {activePatient?.patientName} <span style={{ color: '#4f46e5', fontWeight: 600 }}>({activePatient?.relationship || 'Self'})</span>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', background: '#eef2ff', color: '#4338ca', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    {activePatient?.cardNumber}
                  </span>
                </div>

                {/* Specialty Filter Chips */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                    Filter Specialty:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['all', 'General', 'Cardiologist', 'Pediatrician', 'Dental', 'Gynecologist'].map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setSlotSpecialtyFilter(filter)}
                        className={`btn btn-sm ${slotSpecialtyFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.75rem', padding: '4px 10px', textTransform: 'capitalize' }}
                      >
                        {filter === 'all' ? 'All' : filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List of Doctors */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' }}>
                  {filteredModalDoctors.map((doc) => {
                    const isSelected = selectedDoctor?.id === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoctor(doc)}
                        style={{
                          background: isSelected ? '#eef2ff' : '#f8fafc',
                          border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.12)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: isSelected ? '#4f46e5' : '#e0e7ff',
                              color: isSelected ? 'white' : '#4338ca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '16px'
                            }}>
                              👨‍⚕️
                            </div>
                            <div>
                              <h4 style={{ fontWeight: 800, fontSize: '0.96rem', margin: 0, color: 'var(--text-main)' }}>
                                {doc.name}
                              </h4>
                              <span style={{ fontSize: '0.76rem', color: '#4f46e5', fontWeight: 600 }}>
                                {doc.specialty} • {doc.location}
                              </span>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                              Available
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, marginTop: '4px' }}>
                              ★ {doc.rating}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {doc.slots.length} consultation slots available
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectDoctorAndProceed(doc);
                            }}
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '0.75rem', padding: '4px 12px', fontWeight: 700 }}
                          >
                            {isSelected ? 'Selected ✓' : 'Select Doctor'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Navigation */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setFlowStep('patient')}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.84rem' }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="button"
                    disabled={!selectedDoctor}
                    onClick={() => handleSelectDoctorAndProceed(selectedDoctor || doctors[0])}
                    className="btn btn-primary"
                    style={{ flex: 1.5, fontSize: '0.84rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <span>Next: Choose Time Slot (ቀጣይ: ሰዓት)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* STEP 3: CHOOSE DATE & TIME SLOT                             */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {flowStep === 'slot' && (
              <div>
                {/* Selected Doctor Summary Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Physician:</span>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.98rem' }}>
                        {selectedDoctor?.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600 }}>
                        {selectedDoctor?.specialty} • {selectedDoctor?.location}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFlowStep('doctor')}
                      style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Change Doctor
                    </button>
                  </div>
                </div>

                {/* Date Selection Chips */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                    1. Select Consultation Date:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {availableDates.map((date) => (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`btn btn-sm ${selectedDate === date ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.8rem', padding: '8px 10px', textAlign: 'center' }}
                      >
                        <Calendar size={13} /> {date}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slots Grid */}
                <div style={{ marginBottom: '22px' }}>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                    2. Select Available Time Slot:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: '8px' }}>
                    {selectedDoctor?.slots.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            fontSize: '0.82rem',
                            padding: '8px 6px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: isSelected ? '0 4px 10px rgba(79, 70, 229, 0.25)' : 'none'
                          }}
                        >
                          <Clock size={13} />
                          <span>{slot}</span>
                          {isSelected && <Check size={13} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setFlowStep('doctor')}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.84rem' }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSlot}
                    onClick={() => handleSelectSlotAndProceed(selectedSlot)}
                    className="btn btn-primary"
                    style={{ flex: 1.5, fontSize: '0.84rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <span>Next: 4. Card Payment & Finish</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* STEP 4: CARD PAYMENT (100 ETB) & COMPLETE CARD TAKING       */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {flowStep === 'payment_confirm' && (
              <div>
                {/* 1. Consultation & Patient Summary Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                        {selectedDoctor?.name}
                      </div>
                      <div style={{ color: '#4f46e5', fontWeight: 600, fontSize: '0.8rem' }}>
                        {selectedDoctor?.specialty} • {selectedDoctor?.location}
                      </div>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: '#eef2ff', color: '#4338ca', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      {activePatient?.cardNumber}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Time & Date:</span>
                      <strong style={{ color: '#4f46e5' }}>{selectedDate} • {selectedSlot}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Patient Name:</span>
                      <strong style={{ color: '#334155' }}>{activePatient?.patientName} ({activePatient?.relationship || 'Self'})</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Official Ethiopian Card Issuance Fee Banner */}
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#047857', fontWeight: 800, letterSpacing: '0.5px' }}>
                      Official Clinic Card Fee (የካርድ ማውጫ ክፍያ)
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#064e3b', marginTop: '2px' }}>
                      100.00 <span style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>ETB</span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#047857' }}>
                      Standard fee to issue & activate digital clinic card
                    </span>
                  </div>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#d1fae5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900
                  }}>
                    💳
                  </div>
                </div>

                {/* 3. Ethiopian Payment Gateway Selector */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 800, marginBottom: '8px', fontSize: '0.84rem' }}>
                    Select Payment Gateway (የክፍያ ዘዴ ይምረጡ):
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {/* Telebirr */}
                    <div
                      onClick={() => setPaymentMethod('telebirr')}
                      style={{
                        border: paymentMethod === 'telebirr' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        background: paymentMethod === 'telebirr' ? '#f0f9ff' : '#ffffff',
                        borderRadius: '12px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px' }}>📱</span>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '0.9rem' }}>Telebirr (ቴሌብር)</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Instant Ethio Telecom mobile wallet payment</div>
                          </div>
                        </div>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: paymentMethod === 'telebirr' ? '5px solid #0284c7' : '2px solid #cbd5e1'
                        }} />
                      </div>

                      {paymentMethod === 'telebirr' && (
                        <div style={{ marginTop: '10px', borderTop: '1px solid #e0f2fe', paddingTop: '8px' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="+251 9XX XXX XXX"
                            value={paymentPhone}
                            onChange={(e) => setPaymentPhone(e.target.value)}
                            style={{ fontSize: '0.84rem', padding: '6px 10px' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* CBE Birr */}
                    <div
                      onClick={() => setPaymentMethod('cbebirr')}
                      style={{
                        border: paymentMethod === 'cbebirr' ? '2px solid #7c2084' : '1px solid #e2e8f0',
                        background: paymentMethod === 'cbebirr' ? '#fdf4ff' : '#ffffff',
                        borderRadius: '12px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px' }}>🏦</span>
                          <div>
                            <div style={{ fontWeight: 800, color: '#7c2084', fontSize: '0.9rem' }}>CBE Birr (የኢትዮጵያ ንግድ ባንክ)</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Commercial Bank of Ethiopia mobile banking</div>
                          </div>
                        </div>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: paymentMethod === 'cbebirr' ? '5px solid #7c2084' : '2px solid #cbd5e1'
                        }} />
                      </div>

                      {paymentMethod === 'cbebirr' && (
                        <div style={{ marginTop: '10px', borderTop: '1px solid #fae8ff', paddingTop: '8px' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="09... or 1000..."
                            value={paymentPhone}
                            onChange={(e) => setPaymentPhone(e.target.value)}
                            style={{ fontSize: '0.84rem', padding: '6px 10px' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Chapa */}
                    <div
                      onClick={() => setPaymentMethod('chapa')}
                      style={{
                        border: paymentMethod === 'chapa' ? '2px solid #059669' : '1px solid #e2e8f0',
                        background: paymentMethod === 'chapa' ? '#ecfdf5' : '#ffffff',
                        borderRadius: '12px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px' }}>⚡</span>
                          <div>
                            <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>Chapa / Debit Card (ቻፓ)</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>EthSwitch, Visa, Mastercard & instant checkout</div>
                          </div>
                        </div>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: paymentMethod === 'chapa' ? '5px solid #059669' : '2px solid #cbd5e1'
                        }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional Reason Input */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Reason for Visit (Optional):</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Routine checkup, seasonal flu, fever evaluation"
                    value={reasonForVisit}
                    onChange={(e) => setReasonForVisit(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                {/* Complete Card Taking & Booking Button */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={isProcessingPayment}
                    onClick={() => setFlowStep('slot')}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.84rem' }}
                  >
                    <ArrowLeft size={14} /> Back to Slots
                  </button>

                  <button
                    type="button"
                    disabled={isProcessingPayment}
                    onClick={handleCompleteCardTakingAndBooking}
                    className="btn btn-primary"
                    style={{
                      flex: 1.8,
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isProcessingPayment ? (
                      <>
                        <span className="spinner" />
                        <span>Verifying 100 ETB...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay 100 ETB & Complete Card Taking (ክፈል)</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* STEP: COMPLETION SCREEN - CARD ISSUED & QUEUE CONFIRMED    */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {flowStep === 'complete' && latestBookedApt && (
              <div style={{ textAlign: 'center', padding: '4px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <CheckCircle2 size={32} />
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Card Issued & Spot Secured!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', maxWidth: '380px', margin: '0 auto 16px' }}>
                  Card fee (100 ETB) verified and consultation spot officially registered in the clinic database.
                </p>

                {/* 1. Official Digital Clinic Card (Paid) */}
                <div style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
                  color: 'white',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  textAlign: 'left',
                  boxShadow: '0 12px 30px -10px rgba(49, 46, 129, 0.45)',
                  marginBottom: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.62rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#a5b4fc', fontWeight: 800 }}>
                        FDRE Health Network • Patient Health Pass
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span>CareSync Patient Card (የታካሚ ካርድ)</span>
                        <BadgeCheck size={16} style={{ color: '#38bdf8' }} />
                      </div>
                    </div>
                    <div style={{ background: 'white', color: '#1e1b4b', padding: '4px', borderRadius: '6px' }}>
                      <QrCode size={26} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ fontSize: '0.66rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Card Number</span>
                      <strong style={{ display: 'block', fontFamily: 'monospace', fontSize: '1rem', color: '#ffffff' }}>{latestBookedApt.cardNumber}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.66rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Card Holder</span>
                      <strong style={{ display: 'block', color: '#ffffff' }}>{latestBookedApt.patientName}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.66rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Payment Status</span>
                      <strong style={{ display: 'block', color: '#86efac' }}>● Paid 100 ETB ({latestBookedApt.paymentMethod})</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.66rem', color: '#cbd5e1', textTransform: 'uppercase' }}>TXN Reference</span>
                      <strong style={{ display: 'block', fontFamily: 'monospace', color: '#ffffff', fontSize: '0.74rem' }}>{latestBookedApt.paymentTxnId}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Queue Consultation Ticket */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', marginBottom: '18px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Allocated Queue Spot</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4f46e5' }}>
                        Queue #{latestBookedApt.queueNumber}
                      </div>
                    </div>
                    <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 800 }}>
                      Confirmed
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>Physician</span>
                      <strong style={{ color: '#334155' }}>{latestBookedApt.doctorName}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>Consultation Time</span>
                      <strong style={{ color: '#4f46e5' }}>{latestBookedApt.date} • {latestBookedApt.time}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.84rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Printer size={15} /> Print Card & Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFlowModal(false)}
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '0.84rem' }}
                  >
                    Done / Return
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* DIGITAL CLINIC CARD VIEWER (FROM LIST)                      */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {flowStep === 'card_viewer' && activePatient && (
              <div>
                <div style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
                  color: 'white',
                  borderRadius: '18px',
                  padding: '22px',
                  boxShadow: '0 16px 36px -12px rgba(49, 46, 129, 0.5)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  marginBottom: '18px'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.64rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#a5b4fc', fontWeight: 800 }}>
                      FDRE • Ministry of Health Clinic Network
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>CareSync Patient Card (የታካሚ ካርድ)</span>
                      <BadgeCheck size={18} style={{ color: '#38bdf8' }} />
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.12)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', color: '#c7d2fe', fontWeight: 700 }}>
                        Card Number (የካርድ ቁጥር)
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '1px', marginTop: '2px', color: '#ffffff' }}>
                        {activePatient.cardNumber}
                      </div>
                    </div>
                    <div style={{
                      background: 'white',
                      color: '#1e1b4b',
                      padding: '5px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <QrCode size={30} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ fontSize: '0.66rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Patient Name</div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 800, marginTop: '2px' }}>{activePatient.patientName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.66rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Relationship</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, marginTop: '2px', textTransform: 'capitalize' }}>
                        {activePatient.relationship}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.66rem', color: '#cbd5e1', textTransform: 'uppercase' }}>DOB / Gender</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: '2px' }}>
                        {activePatient.dateOfBirth ? new Date(activePatient.dateOfBirth).toLocaleDateString() : 'Active Record'} ({activePatient.gender})
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.66rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Card Status</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#86efac', marginTop: '2px' }}>
                        ● Paid (100 ETB) & Active
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.12)', paddingTop: '8px', fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                    <span>TXN: <strong style={{ fontFamily: 'monospace', color: '#ffffff' }}>{activePatient.paymentTxnId || 'TXN-TB-2026-88192'}</strong></span>
                    <span>Method: <strong style={{ color: '#86efac' }}>{activePatient.paymentMethod || 'Telebirr'}</strong></span>
                  </div>
                </div>

                {/* Direct Action: Jump into Guided Flow with this Card! */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (!selectedDoctor) setSelectedDoctor(doctors[0]);
                      setFlowStep('doctor');
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%', height: '46px', fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span>Proceed to Book Spot with this Card (ቀጠሮ ያዝ) →</span>
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowFlowModal(false)}
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '0.82rem' }}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Printer size={14} /> Print Card & Receipt
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
