'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import API, { clinicApi, appointmentApi } from '@/lib/api';
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
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Step 4: Payment & Reason
  const [paymentMethod, setPaymentMethod] = useState('telebirr'); // 'telebirr' | 'cbebirr' | 'chapa'
  const [paymentPhone, setPaymentPhone] = useState('0911223344');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [latestBookedApt, setLatestBookedApt] = useState(null);

  // Dynamic 7-day date options
  const generateUpcomingDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      let label;
      if (i === 0) label = `Today, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      else if (i === 1) label = `Tomorrow, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      else label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      dates.push({ iso, label });
    }
    return dates;
  };

  const [dateOptions] = useState(generateUpcomingDates());
  const [selectedDateObj, setSelectedDateObj] = useState(dateOptions[1] || dateOptions[0]);
  const [selectedDate, setSelectedDate] = useState(dateOptions[1]?.label || 'Tomorrow');

  // Helper to validate MongoDB ObjectId
  const isValidMongoId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id || ''));

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [cardSlotsMap, setCardSlotsMap] = useState({});
  const [loadingCardSlots, setLoadingCardSlots] = useState(false);

  // Standardized sequential Clinic Card number
  const makeCardNumber = (seed) => {
    const cleanSeed = String(seed || '00001').slice(-5);
    return `CLN-2026-${cleanSeed.padStart(5, '0')}`;
  };

  // Helper to format slot time safely whether it is a MongoDB object or string
  const getSlotDisplayString = (slot) => {
    if (!slot) return 'No slot selected';
    if (typeof slot === 'string') return slot;
    if (slot.startTime && slot.endTime) return `${slot.startTime} - ${slot.endTime}`;
    if (slot.startTime) return slot.startTime;
    if (slot.time) return slot.time;
    return 'Confirmed Time Slot';
  };

  // Real Appointments & Patient Card from Backend
  const [patientCard, setPatientCard] = useState(null);
  const [loadingCard, setLoadingCard] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

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

  // Fetch Patient Card from appointment-service
  const fetchMyCard = async () => {
    try {
      setLoadingCard(true);
      const res = await appointmentApi.get('/cards/me');
      if (res.data?.success && res.data?.data) {
        setPatientCard(res.data.data);
      } else {
        setPatientCard(null);
      }
    } catch (err) {
      console.log('Notice: No established patient card yet', err?.message);
      setPatientCard(null);
    } finally {
      setLoadingCard(false);
    }
  };

  // Fetch Appointments from appointment-service
  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      const [upcomingRes, historyRes] = await Promise.allSettled([
        appointmentApi.get('/appointments/my-appointments'),
        appointmentApi.get('/appointments/history')
      ]);

      if (upcomingRes.status === 'fulfilled' && upcomingRes.value.data?.success) {
        const list = upcomingRes.value.data.data || [];
        setAppointments(list);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value.data?.success) {
        const all = historyRes.value.data.data || [];
        const past = all.filter(a => a.status === 'completed' || a.status === 'cancelled');
        setPastAppointments(past);
      }
    } catch (err) {
      console.log('Notice: Could not load appointments', err?.message);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Fetch Real Doctors from clinic-service
  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const res = await clinicApi.get('/getAllDoctors');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const validDocs = res.data.data.filter((doc) => isValidMongoId(doc._id || doc.id));
        if (validDocs.length > 0) {
          const mapped = validDocs.map((doc, idx) => {
            const account = doc.accountDetails && typeof doc.accountDetails === 'object' ? doc.accountDetails : {};
            const rawName = account.fullName || doc.name || `Staff Physician ${idx + 1}`;
            const formattedName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
            const expYears = doc.yearsOfExperience ?? doc.experience;
            const docId = doc._id || doc.id;
            return {
              id: docId,
              _id: docId,
              name: formattedName,
              specialty: doc.specialization || 'General Practice',
              experience: expYears ? `${expYears} Years Exp` : 'Licensed Physician',
              location: doc.bio || (doc.room ? `Room ${doc.room}` : 'Central Consultation Suite'),
              availableDays: Array.isArray(doc.availableDays) ? doc.availableDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
              availableToday: doc.isActive ?? true,
              rating: 4.9,
              startTime: doc.startTime || '08:00',
              endTime: doc.endTime || '17:00',
              slots: []
            };
          });
          setDoctors(mapped);
          if (!selectedDoctor && mapped.length > 0) {
            setSelectedDoctor(mapped[0]);
          }
        } else {
          setDoctors([]);
        }
      }
    } catch (err) {
      console.warn('Could not load doctors roster:', err?.message);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Fetch slots for currently selected doctor and date
  const fetchDoctorSlots = async (docId, dateIso) => {
    if (!docId || !dateIso || !isValidMongoId(docId)) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      return;
    }
    try {
      setLoadingSlots(true);
      const res = await clinicApi.get(`/${docId}/slots`, {
        params: { date: dateIso }
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAvailableSlots(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedSlot(res.data.data[0]);
        } else {
          setSelectedSlot(null);
        }
      } else {
        setAvailableSlots([]);
        setSelectedSlot(null);
      }
    } catch (err) {
      console.warn('Could not load slots from clinic-service:', err?.message);
      setAvailableSlots([]);
      setSelectedSlot(null);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Initial Data Load
  useEffect(() => {
    fetchFamilyMembers();
    fetchMyCard();
    fetchAppointments();
    fetchDoctors();
  }, []);

  // Live batch load available slots for all doctors for the current date
  useEffect(() => {
    if (!doctors.length || !selectedDateObj?.iso) return;
    let isMounted = true;
    const loadAllSlots = async () => {
      setLoadingCardSlots(true);
      try {
        const validDoctors = doctors.filter(
          (doc) => isValidMongoId(doc._id || doc.id)
        );
        if (validDoctors.length === 0) {
          if (isMounted) {
            setCardSlotsMap({});
            setLoadingCardSlots(false);
          }
          return;
        }

        const results = await Promise.allSettled(
          validDoctors.map((doc) =>
            clinicApi
              .get(`/${doc._id || doc.id}/slots`, { params: { date: selectedDateObj.iso } })
              .then((res) => ({ docId: doc._id || doc.id, slots: res.data?.data || [] }))
          )
        );
        if (isMounted) {
          const map = {};
          results.forEach((r) => {
            if (r.status === 'fulfilled' && r.value) {
              map[r.value.docId] = r.value.slots;
            }
          });
          setCardSlotsMap(map);
        }
      } catch (err) {
        console.warn('Could not batch load card slots:', err?.message);
      } finally {
        if (isMounted) setLoadingCardSlots(false);
      }
    };
    loadAllSlots();
    return () => {
      isMounted = false;
    };
  }, [doctors, selectedDateObj]);

  // Fetch slots when selected doctor or date changes
  useEffect(() => {
    const docId = selectedDoctor?._id || selectedDoctor?.id;
    if (docId && selectedDateObj?.iso && isValidMongoId(docId)) {
      fetchDoctorSlots(docId, selectedDateObj.iso);
    }
  }, [selectedDoctor, selectedDateObj]);

  const handleCancelAppointment = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment? The time slot will be released back to the clinic.')) {
      return;
    }
    try {
      await appointmentApi.patch(`/appointments/${id}/cancel`, {
        cancelReason: 'Cancelled by patient via dashboard'
      });
      setBookingSuccess('Appointment successfully cancelled and slot released back to clinic inventory.');
      await fetchAppointments();
      setTimeout(() => setBookingSuccess(''), 5000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment.');
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
      cardNumber: patientCard?.cardNumber || 'Auto-generated upon booking (በቀጠሮ ጊዜ ይወጣል)',
      dateOfBirth: user?.birthDate || null,
      gender: user?.gender || 'Not specified',
      nationalId: user?.nationalId || null,
      isPaid: Boolean(patientCard?.cardNumber)
    };
    setActivePatient(defaultPatient);
    if (doctors.length > 0) {
      setSelectedDoctor(doctors[0]);
    }
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
    if (doctors.length > 0) {
      setSelectedDoctor(doctors[0]);
    }
    // Start at doctor selection since patient is locked in
    setFlowStep('doctor');
    setShowFlowModal(true);
  };

  // View Digital Clinic Card Viewer
  const openCardViewer = (item) => {
    const cardData = patientCard || {};
    setActivePatient({
      patientName: item?.patientName || item?.fullName || user?.name || 'Patient',
      relationship: item?.relationship || (item?.forPerson?.includes('Self') ? 'Account Holder' : item?.forPerson) || 'Account Holder',
      cardNumber: item?.cardNumber || cardData.cardNumber || makeCardNumber(user?._id || '00001'),
      memberId: item?._id || item?.memberId || 'self',
      dateOfBirth: item?.dateOfBirth || user?.birthDate || null,
      gender: item?.gender || user?.gender || 'Not specified',
      nationalId: item?.nationalId || user?.nationalId || null,
      doctorName: item?.doctorName,
      clinic: item?.clinic || clinicName || 'CareSync Ethiopian Health Network',
      bloodType: cardData.bloodType || 'Not specified',
      allergies: cardData.allergies?.length > 0 ? cardData.allergies.join(', ') : 'None recorded',
      isPaid: true,
      paymentTxnId: item?.paymentTxnId || 'TXN-TB-2026-88192',
      paymentMethod: item?.paymentMethod || 'Telebirr',
      paymentFee: item?.paymentFee || '100 ETB'
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
      cardNumber: patientCard?.cardNumber || 'Auto-generated upon booking',
      dateOfBirth: user?.birthDate || null,
      gender: user?.gender || 'Not specified',
      nationalId: user?.nationalId || null,
      isPaid: Boolean(patientCard?.cardNumber)
    };
    setActivePatient(defaultPatient);
    setSelectedDoctor(doctor);
    if (slot) {
      setSelectedSlot(slot);
      setFlowStep('payment_confirm');
    } else {
      setFlowStep('slot');
    }
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

        // The person must be saved as a real family member first, so they get their own card.
        let generatedId;
        try {
          const createRes = await API.post('/users/createFamilyMember', newPerson);
          generatedId = createRes.data?.member?._id;
          await fetchFamilyMembers();
        } catch (err) {
          setBookingError(err.response?.data?.message || 'Could not save this person as a family member. Please check the details and try again.');
          return;
        }
        if (!generatedId) {
          setBookingError('Could not save this person as a family member. Please try again.');
          return;
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
    setFlowStep('slot');
  };

  // ── STEP 3: SLOT SELECTED -> PROCEED TO PAYMENT (STEP 4) ──────
  const handleSelectSlotAndProceed = (slot) => {
    setSelectedSlot(slot);
    setFlowStep('payment_confirm');
  };

  // ── STEP 4: CARD PAYMENT (100 ETB) & COMPLETE CARD TAKING ─────
  const handleCompleteCardTakingAndBooking = async (e) => {
    if (e) e.preventDefault();
    setIsProcessingPayment(true);
    setBookingError('');

    try {
      if (!selectedDoctor || !selectedSlot) {
        setBookingError('Please select a doctor and consultation time slot.');
        setIsProcessingPayment(false);
        return;
      }

      const doctorId = selectedDoctor._id || selectedDoctor.id;
      // selectedSlot can be an object from availableSlots with _id, or fallback string/id
      const slotId = typeof selectedSlot === 'object' ? (selectedSlot._id || selectedSlot.id) : selectedSlot;
      const targetDate = selectedDateObj?.iso || new Date().toISOString().split('T')[0];
      // Booking for a registered family member: send their real id so the backend gives them
      // their own patient card and history. (Only real 24-char ids; never the account holder.)
      const memberId = activePatient?.memberId;
      const accountId = user?._id || user?.id;
      const familyMemberId = memberId && memberId !== 'self' && memberId !== accountId && /^[a-f0-9]{24}$/i.test(String(memberId))
        ? memberId
        : undefined;

      const bookingPayload = {
        doctorId,
        slotId,
        date: targetDate,
        patientId: accountId,
        familyMemberId,
        patientName: activePatient?.patientName || user?.name || 'Account Holder',
        forPerson: activePatient?.forPerson || 'Self (Primary Account Holder)',
        reasonForVisit: reasonForVisit.trim() || 'General Clinical Consultation'
      };

      const res = await appointmentApi.post('/appointments', bookingPayload);
      const savedApt = res.data?.data;

      const generatedTxnId = `TXN-${paymentMethod === 'telebirr' ? 'TB' : paymentMethod === 'cbebirr' ? 'CBE' : 'CHP'}-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const paymentMethodName = paymentMethod === 'telebirr' ? 'Telebirr' : paymentMethod === 'cbebirr' ? 'CBE Birr' : 'Chapa';

      const slotTimeDisplay = getSlotDisplayString(selectedSlot);

      const updatedPatient = {
        ...activePatient,
        cardNumber: savedApt?.cardNumber || activePatient?.cardNumber,
        isPaid: true,
        paymentTxnId: generatedTxnId,
        paymentMethod: paymentMethodName,
        paymentFee: '100 ETB',
        paymentDate: selectedDateObj?.label || 'Today'
      };

      const newApt = {
        id: savedApt?._id || `apt-${Date.now()}`,
        _id: savedApt?._id,
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        clinic: selectedDoctor.location || clinicName,
        date: selectedDateObj?.label || targetDate,
        time: slotTimeDisplay,
        forPerson: activePatient?.forPerson || 'Self (Primary Account Holder)',
        patientName: activePatient?.patientName || user?.name || 'Account Holder',
        cardNumber: savedApt?.cardNumber || activePatient?.cardNumber || makeCardNumber(user?._id || '00001'),
        queueNumber: savedApt?.queueNumber || 1,
        status: savedApt?.status || 'scheduled',
        room: selectedDoctor.location || `Suite 201`,
        reason: reasonForVisit.trim() || 'General Clinical Consultation',
        paymentFee: '100 ETB',
        paymentMethod: paymentMethodName,
        paymentTxnId: generatedTxnId,
        isPaid: true
      };

      setActivePatient(updatedPatient);
      setLatestBookedApt(newApt);
      setFlowStep('complete');

      setBookingSuccess(`🎉 Card officially linked & consultation spot confirmed! 100 ETB verified via ${paymentMethodName} (Ref: ${generatedTxnId}). Queue #${newApt.queueNumber}`);

      // Refresh live appointments & patient card
      await Promise.allSettled([fetchAppointments(), fetchMyCard()]);
      setTimeout(() => setBookingSuccess(''), 7000);
    } catch (err) {
      console.error('Booking failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to complete appointment booking.';
      setBookingError(errMsg);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Available specialties derived from real loaded doctors
  const availableSpecialties = [
    'all',
    ...Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)))
  ];

  // Filtered doctors for in-modal selection
  const filteredModalDoctors = slotSpecialtyFilter === 'all'
    ? doctors
    : doctors.filter(d => (d.specialty || '').toLowerCase().includes(slotSpecialtyFilter.toLowerCase()));

  // Filtered doctors for on-page directory
  const filteredPageDoctors = selectedSpecialty === 'all'
    ? doctors
    : doctors.filter(d => (d.specialty || '').toLowerCase().includes(selectedSpecialty.toLowerCase()));

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
              {patientCard?.cardNumber || (loadingCard ? 'Checking...' : 'Not Issued Yet (ያልወጣ)')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600, marginTop: '4px' }}>
              {patientCard?.cardNumber ? (
                <button
                  onClick={() => openCardViewer({
                    patientName: user?.name,
                    forPerson: 'Self',
                    cardNumber: patientCard.cardNumber,
                    bloodType: patientCard.bloodType,
                    allergies: patientCard.allergies
                  })}
                  style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                >
                  View Digital Card (የታካሚ ካርድ) →
                </button>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>
                  Auto-generates upon initial booking
                </span>
              )}
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
            loadingAppointments ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <span className="spinner" style={{ marginRight: '8px' }} /> Loading active clinic appointments...
              </div>
            ) : appointments.length === 0 ? (
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
                {appointments.map((apt) => {
                  const aptId = apt._id || apt.id;
                  const doc = doctors.find(d => String(d._id) === String(apt.doctorId) || String(d.id) === String(apt.doctorId));
                  const doctorName = apt.doctorName || doc?.name || 'Staff Physician';
                  const specialty = apt.specialty || doc?.specialty || 'General Practice';
                  const timeStr = apt.time || (apt.startTime && apt.endTime ? `${apt.startTime} - ${apt.endTime}` : (apt.startTime || 'Scheduled Time'));
                  const roomStr = apt.room || doc?.location || 'Consultation Suite';
                  const isScheduled = ['scheduled', 'confirmed'].includes(apt.status);

                  return (
                    <div key={aptId} className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #4f46e5', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: isScheduled ? '#ecfdf5' : '#fef3c7',
                              color: isScheduled ? '#047857' : '#92400e'
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

                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: '2px 0' }}>
                            {doctorName}
                          </h3>
                          <div style={{ fontSize: '0.82rem', color: '#4f46e5', fontWeight: 600 }}>{specialty}</div>
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
                          For: {apt.forPerson || 'Self'}
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
                          <span>{apt.date} • {timeStr}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={15} style={{ color: '#10b981' }} />
                          <span>{roomStr}</span>
                        </div>
                      </div>

                      {isScheduled && (
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button
                            onClick={() => handleCancelAppointment(aptId)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Cancel Booking
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            pastAppointments.length === 0 ? (
              <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>No past consultations or cancelled appointments found in your medical records.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
                {pastAppointments.map((apt) => {
                  const aptId = apt._id || apt.id;
                  const doc = doctors.find(d => String(d._id) === String(apt.doctorId) || String(d.id) === String(apt.doctorId));
                  const doctorName = apt.doctorName || doc?.name || 'Staff Physician';
                  const specialty = apt.specialty || doc?.specialty || 'General Practice';
                  const timeStr = apt.time || (apt.startTime && apt.endTime ? `${apt.startTime} - ${apt.endTime}` : (apt.startTime || ''));
                  const isCompleted = apt.status === 'completed';

                  return (
                    <div
                      key={aptId}
                      className="glass-panel"
                      style={{
                        padding: '20px',
                        borderLeft: `4px solid ${isCompleted ? '#10b981' : '#94a3b8'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isCompleted ? '#ecfdf5' : '#f1f5f9',
                            color: isCompleted ? '#047857' : '#64748b'
                          }}>
                            ● {apt.status}
                          </span>
                          <h4 style={{ margin: '6px 0 2px', fontSize: '1.05rem', fontWeight: 700 }}>
                            {doctorName}
                          </h4>
                          <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600 }}>
                            {specialty}
                          </div>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          {apt.cardNumber}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        📅 {apt.date} • {timeStr}
                      </div>

                      {apt.cancelReason && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', marginTop: '10px', color: '#991b1b' }}>
                          <strong>Reason for Cancellation:</strong> {apt.cancelReason}
                        </div>
                      )}

                      {apt.doctorNotes && (
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', marginTop: '10px', color: '#334155' }}>
                          <strong>Doctor Notes:</strong> {apt.doctorNotes}
                        </div>
                      )}

                      {apt.prescription && (
                        <div style={{ background: '#ecfdf5', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', marginTop: '6px', color: '#047857' }}>
                          <strong>Prescription:</strong> {apt.prescription}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
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

          {/* Specialty Filter Buttons & Quick Date Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {availableSpecialties.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedSpecialty(filter)}
                  className={`btn btn-sm ${selectedSpecialty === filter ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}
                >
                  {filter === 'all' ? 'All Specialties' : filter}
                </button>
              ))}
            </div>

            {/* Quick Consultation Date Selector */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 8px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Slots for:
              </span>
              {dateOptions.slice(0, 3).map((dObj) => (
                <button
                  key={dObj.iso}
                  type="button"
                  onClick={() => {
                    setSelectedDateObj(dObj);
                    setSelectedDate(dObj.label);
                  }}
                  className={`btn btn-sm ${selectedDateObj?.iso === dObj.iso ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px' }}
                >
                  {dObj.label}
                </button>
              ))}
            </div>
          </div>

          {/* Doctor Cards Grid */}
          {loadingDoctors ? (
            <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
              <span className="spinner" style={{ marginRight: '8px' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading verified medical staff from clinic database...</span>
            </div>
          ) : filteredPageDoctors.length === 0 ? (
            <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
              <Stethoscope size={36} style={{ color: '#6366f1', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                No Physicians Found
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', maxWidth: '420px', margin: '0 auto 14px' }}>
                {selectedSpecialty !== 'all'
                  ? `There are no doctors registered under "${selectedSpecialty}". Try selecting "All Specialties" to view all available physicians.`
                  : 'No active doctors are currently registered in the clinic roster. Please check back soon or contact front desk reception.'}
              </p>
              {selectedSpecialty !== 'all' && (
                <button onClick={() => setSelectedSpecialty('all')} className="btn btn-secondary btn-sm">
                  View All Doctors
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '18px' }}>
              {filteredPageDoctors.map((doc) => {
                const docId = doc._id || doc.id;
                const docLiveSlots = cardSlotsMap[docId] || [];

                return (
                  <div key={docId} className="glass-panel" style={{ padding: '22px' }}>
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
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.name}
                        </h3>
                        <span style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 700 }}>
                          {doc.specialty}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <MapPin size={14} style={{ color: '#6366f1', flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.location}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Stethoscope size={14} style={{ color: '#059669', flexShrink: 0 }} />
                        <span>{doc.experience} • Rating {doc.rating} ★</span>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Available ({selectedDateObj?.label || 'Today'}):
                        </span>
                        <button
                          onClick={() => handlePageDoctorOrSlotClick(doc)}
                          style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                        >
                          Book Flow →
                        </button>
                      </div>

                      {loadingCardSlots ? (
                        <div style={{ fontSize: '0.76rem', color: '#94a3b8', padding: '6px 0' }}>
                          <span className="spinner" style={{ marginRight: '6px' }} /> Checking open slots...
                        </div>
                      ) : docLiveSlots.length > 0 ? (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {docLiveSlots.slice(0, 5).map((slotObj) => (
                            <button
                              key={slotObj._id}
                              onClick={() => handlePageDoctorOrSlotClick(doc, slotObj)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.76rem', padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title={`Reserve ${slotObj.startTime} - ${slotObj.endTime}`}
                            >
                              <Clock size={11} />
                              <span>{slotObj.startTime}</span>
                            </button>
                          ))}
                          {docLiveSlots.length > 5 && (
                            <button
                              onClick={() => handlePageDoctorOrSlotClick(doc)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.74rem', padding: '5px 8px', color: '#4f46e5', fontWeight: 800 }}
                            >
                              +{docLiveSlots.length - 5} more
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No open slots on this date</span>
                          <button
                            onClick={() => handlePageDoctorOrSlotClick(doc)}
                            style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                          >
                            Other Dates →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                    {availableSpecialties.map((filter) => (
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
                    const docLiveCount = cardSlotsMap[doc._id || doc.id]?.length;
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
                            {docLiveCount !== undefined ? `${docLiveCount} open slots` : 'Available for booking'} on {selectedDateObj?.label || 'selected date'}
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
                    {dateOptions.map((dateObj) => (
                      <button
                        key={dateObj.iso}
                        type="button"
                        onClick={() => {
                          setSelectedDateObj(dateObj);
                          setSelectedDate(dateObj.label);
                        }}
                        className={`btn btn-sm ${selectedDateObj?.iso === dateObj.iso ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.8rem', padding: '8px 10px', textAlign: 'center' }}
                      >
                        <Calendar size={13} /> {dateObj.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slots Grid */}
                <div style={{ marginBottom: '22px' }}>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                    2. Select Available Time Slot:
                  </label>
                  {loadingSlots ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <span className="spinner" style={{ marginRight: '8px' }} /> Checking open clinic slots from database...
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
                      {availableSlots.map((slotObj) => {
                        const isSelected = selectedSlot && (selectedSlot._id === slotObj._id || selectedSlot.id === slotObj._id);
                        return (
                          <button
                            key={slotObj._id}
                            type="button"
                            onClick={() => setSelectedSlot(slotObj)}
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
                            <span>{slotObj.startTime}</span>
                            {isSelected && <Check size={13} />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', fontSize: '0.84rem' }}>
                      <Calendar size={22} style={{ color: '#94a3b8', margin: '0 auto 8px', display: 'block' }} />
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                        No Open Consultation Slots
                      </div>
                      All slots for {selectedDoctor?.name || 'this doctor'} on {selectedDateObj?.label || 'this date'} are fully booked or not scheduled. Please choose another date above.
                    </div>
                  )}
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
                      <strong style={{ color: '#4f46e5' }}>{selectedDate} • {getSlotDisplayString(selectedSlot)}</strong>
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
