'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
import API, { clinicApi } from '@/lib/api';

function AdminDashboardContent() {
  const { user, mounted } = useAuth();
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
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'confirmed' | 'in_consultation' | 'completed' | 'cancelled'
  const [filterDate, setFilterDate] = useState('Today, Oct 13');

  // Modal States
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedSlotToReserve, setSelectedSlotToReserve] = useState(null);
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
      console.warn('Could not fetch receptionists for admin:', err.message);
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
      console.warn('Could not fetch doctor leave requests for admin:', err.message);
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
          const shiftStr = (doc.startTime && doc.endTime) ? `${doc.startTime} - ${doc.endTime}` : '08:30 - 17:30';

          return {
            id: doc._id || doc.id || doc.userId,
            _id: doc._id,
            name: formattedName,
            specialty: doc.specialization || 'General Practice',
            licenseNumber: doc.licenseNumber || 'Verified MOH',
            email: account.email || doc.email || 'N/A',
            phone: account.phoneNumber || doc.phone || '+251 91 000 0000',
            room: doc.room || `Suite 20${(idx % 5) + 1}`,
            shift: shiftStr,
            workingDays: workingDaysStr,
            active: doc.isActive !== undefined ? doc.isActive : true,
            yearsOfExperience: doc.yearsOfExperience || 0,
            bio: doc.bio || '',
            patientsCountToday: 0,
            totalTreated: idx === 0 ? 82 : 45
          };
        });
        setDoctorsList(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch doctors from API:', err.message);
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    fetchAdminLeaves();
    fetchDoctors();
    fetchReceptionists();
  }, []);

  // Auth Guard: Admin Only
  useEffect(() => {
    if (mounted && user) {
      if (user.role === 'receptionist') {
        router.push('/reception/dashboard');
      } else if (user.role === 'doctor') {
        router.push('/doctor/dashboard');
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [mounted, user, router]);

  const handleReviewLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveReviewModal) return;
    const { doctorId, leaveId, status } = leaveReviewModal;
    setSubmittingReview(true);

    try {
      const res = await clinicApi.patch(`/admin/doctor-leaves/${doctorId}/${leaveId}`, {
        status,
        adminNotes: adminReviewNotes.trim() || (status === 'approved' ? 'Approved by administrator' : 'Rejected by administrator')
      });

      if (res.data?.success) {
        const removed = res.data.data?.unbookedSlotsRemoved || 0;
        const notice = res.data.data?.bookedAppointmentsNotice || '';
        const msg = status === 'approved'
          ? `🎉 Leave request approved! Automatically removed ${removed} unbooked slot(s). ${notice}`
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

  // Form State for Adding Doctor
  const [newDoctorForm, setNewDoctorForm] = useState({
    name: '',
    specialty: 'Internal Medicine & General Practice',
    licenseNumber: '',
    email: '',
    phone: '+251',
    room: 'Suite ',
    shift: '08:30 AM - 04:30 PM',
    workingDays: 'Monday - Friday'
  });

  // ── TAKEN SLOTS / BOOKED APPOINTMENTS ─────────────────────────
  const [takenSlots, setTakenSlots] = useState([
    {
      id: 'apt-001',
      slotTime: '08:45 AM',
      date: 'Today, Oct 13',
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
      status: 'in_consultation', // 'confirmed' | 'in_consultation' | 'completed' | 'cancelled'
      feePaid: 500, // 100 card + 400 consultation
      paymentMethod: 'Telebirr',
      bookedAt: 'Today, 07:30 AM'
    },
    {
      id: 'apt-002',
      slotTime: '09:30 AM',
      date: 'Today, Oct 13',
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
      status: 'confirmed',
      feePaid: 500,
      paymentMethod: 'CBE Birr',
      bookedAt: 'Today, 08:10 AM'
    },
    {
      id: 'apt-003',
      slotTime: '09:00 AM',
      date: 'Today, Oct 13',
      patientName: 'Natnael Girma',
      gender: 'male',
      age: 7,
      phoneNumber: '+251 92 443 2199',
      cardNumber: 'CLN-2026-00019',
      nationalId: 'ET-FAYDA-11048',
      doctorId: 'doc-103',
      doctorName: 'Dr. Dawit Tadesse',
      specialty: 'Pediatrics & Child Health',
      chiefComplaint: 'High fever (38.8 °C) and mild ear pain since yesterday evening.',
      status: 'confirmed',
      feePaid: 500,
      paymentMethod: 'Telebirr',
      bookedAt: 'Today, 08:00 AM'
    },
    {
      id: 'apt-004',
      slotTime: '10:00 AM',
      date: 'Today, Oct 13',
      patientName: 'Hiwot Tesfaye',
      gender: 'female',
      age: 32,
      phoneNumber: '+251 93 112 2334',
      cardNumber: 'CLN-2026-00078',
      nationalId: 'ET-FAYDA-55421',
      doctorId: 'doc-104',
      doctorName: 'Dr. Hanna Girma',
      specialty: 'Obstetrics & Gynecology (OB/GYN)',
      chiefComplaint: 'Second trimester routine prenatal ultrasound & blood pressure evaluation.',
      status: 'confirmed',
      feePaid: 600,
      paymentMethod: 'Chapa',
      bookedAt: 'Today, 08:15 AM'
    },
    {
      id: 'apt-005',
      slotTime: '11:00 AM',
      date: 'Today, Oct 13',
      patientName: 'Kalkidan Assefa',
      gender: 'female',
      age: 24,
      phoneNumber: '+251 91 223 3445',
      cardNumber: 'CLN-2026-00095',
      nationalId: 'ET-FAYDA-77291',
      doctorId: 'doc-102',
      doctorName: 'Dr. Selamawit Bekele',
      specialty: 'General Internal Medicine',
      chiefComplaint: 'Acute migraine attack, light sensitivity and nausea for 2 days.',
      status: 'confirmed',
      feePaid: 500,
      paymentMethod: 'Telebirr',
      bookedAt: 'Today, 08:45 AM'
    },
    {
      id: 'apt-006',
      slotTime: '08:00 AM',
      date: 'Today, Oct 13',
      patientName: 'Mulugeta Kebede',
      gender: 'male',
      age: 64,
      phoneNumber: '+251 91 334 4556',
      cardNumber: 'CLN-2026-00012',
      nationalId: 'ET-FAYDA-90124',
      doctorId: 'doc-105',
      doctorName: 'Dr. Yared Melaku',
      specialty: 'Cardiology & Hypertension Clinic',
      chiefComplaint: 'Routine ECG review and post-angioplasty follow up visit.',
      status: 'completed',
      feePaid: 700,
      paymentMethod: 'CBE Birr',
      bookedAt: 'Yesterday, 04:00 PM'
    }
  ]);

  // ── OPEN / AVAILABLE SLOTS (Can be reserved by receptionist) ─
  const [openSlots, setOpenSlots] = useState([
    {
      id: 'slot-open-1',
      doctorId: 'doc-101',
      doctorName: 'Dr. Abebe Bekele',
      specialty: 'Internal Medicine & General Practice',
      room: 'Suite 201',
      time: '11:00 AM',
      date: 'Today, Oct 13',
      duration: '30 mins',
      fee: '400 ETB'
    },
    {
      id: 'slot-open-2',
      doctorId: 'doc-101',
      doctorName: 'Dr. Abebe Bekele',
      specialty: 'Internal Medicine & General Practice',
      room: 'Suite 201',
      time: '02:00 PM',
      date: 'Today, Oct 13',
      duration: '30 mins',
      fee: '400 ETB'
    },
    {
      id: 'slot-open-3',
      doctorId: 'doc-101',
      doctorName: 'Dr. Abebe Bekele',
      specialty: 'Internal Medicine & General Practice',
      room: 'Suite 201',
      time: '03:15 PM',
      date: 'Today, Oct 13',
      duration: '30 mins',
      fee: '400 ETB'
    },
    {
      id: 'slot-open-4',
      doctorId: 'doc-102',
      doctorName: 'Dr. Selamawit Bekele',
      specialty: 'General Internal Medicine',
      room: 'Suite 204',
      time: '01:30 PM',
      date: 'Today, Oct 13',
      duration: '30 mins',
      fee: '400 ETB'
    },
    {
      id: 'slot-open-5',
      doctorId: 'doc-102',
      doctorName: 'Dr. Selamawit Bekele',
      specialty: 'General Internal Medicine',
      room: 'Suite 204',
      time: '02:45 PM',
      date: 'Today, Oct 13',
      duration: '30 mins',
      fee: '400 ETB'
    },
    {
      id: 'slot-open-6',
      doctorId: 'doc-103',
      doctorName: 'Dr. Dawit Tadesse',
      specialty: 'Pediatrics & Child Health',
      room: 'Suite 108',
      time: '10:30 AM',
      date: 'Today, Oct 13',
      duration: '30 mins',
      fee: '400 ETB'
    },
    {
      id: 'slot-open-7',
      doctorId: 'doc-103',
      doctorName: 'Dr. Dawit Tadesse',
      specialty: 'Pediatrics & Child Health',
      room: 'Suite 108',
      time: '01:00 PM',
      date: 'Today, Oct 13',
      duration: '30 mins',
      fee: '400 ETB'
    },
    {
      id: 'slot-open-8',
      doctorId: 'doc-104',
      doctorName: 'Dr. Hanna Girma',
      specialty: 'Obstetrics & Gynecology (OB/GYN)',
      room: 'Suite 212',
      time: '02:15 PM',
      date: 'Today, Oct 13',
      duration: '30 mins',
      fee: '500 ETB'
    },
    {
      id: 'slot-open-9',
      doctorId: 'doc-105',
      doctorName: 'Dr. Yared Melaku',
      specialty: 'Cardiology & Hypertension Clinic',
      room: 'Suite 305',
      time: '02:30 PM',
      date: 'Today, Oct 13',
      duration: '45 mins',
      fee: '600 ETB'
    }
  ]);

  // ── TREATED PATIENTS HISTORY ──────────────────────────────────
  const [treatedPatients, setTreatedPatients] = useState([
    {
      id: 'trt-001',
      patientName: 'Mulugeta Kebede',
      cardNumber: 'CLN-2026-00012',
      gender: 'male',
      age: 64,
      treatedDate: 'Today, Oct 13 at 08:35 AM',
      doctorName: 'Dr. Yared Melaku',
      specialty: 'Cardiology',
      diagnosis: 'Ischemic Heart Disease (Post-PCI), Well-controlled Hypertensive Status',
      rxSummary: 'Atorvastatin 40mg q.d., Amlodipine 5mg q.d., Aspirin 81mg q.d.',
      feePaid: 700,
      paymentMethod: 'CBE Birr',
      followUp: 'Review in 3 Months'
    },
    {
      id: 'trt-002',
      patientName: 'Tigist Hailu',
      cardNumber: 'CLN-2026-00055',
      gender: 'female',
      age: 36,
      treatedDate: 'Yesterday, Oct 12 at 03:40 PM',
      doctorName: 'Dr. Selamawit Bekele',
      specialty: 'General Internal Medicine',
      diagnosis: 'Acute Bacterial Sinusitis, Mild Iron Deficiency Anemia',
      rxSummary: 'Amoxicillin-Clavulanate 625mg b.i.d. x 7d, Ferrous Sulfate 200mg',
      feePaid: 500,
      paymentMethod: 'Telebirr',
      followUp: 'As needed'
    },
    {
      id: 'trt-003',
      patientName: 'Samuel Mengistu',
      cardNumber: 'CLN-2026-00089',
      gender: 'male',
      age: 42,
      treatedDate: 'Yesterday, Oct 12 at 11:20 AM',
      doctorName: 'Dr. Abebe Bekele',
      specialty: 'Internal Medicine',
      diagnosis: 'Type 2 Diabetes Mellitus (HbA1c 7.4%), Peripheral Neuropathy',
      rxSummary: 'Metformin 850mg b.i.d., B-Complex Neuro vitamins',
      feePaid: 500,
      paymentMethod: 'Telebirr',
      followUp: 'Fasting Blood Sugar check in 4 Weeks'
    },
    {
      id: 'trt-004',
      patientName: 'Bethlehem Desta',
      cardNumber: 'CLN-2026-00031',
      gender: 'female',
      age: 5,
      treatedDate: 'Oct 11, 2026 at 10:15 AM',
      doctorName: 'Dr. Dawit Tadesse',
      specialty: 'Pediatrics',
      diagnosis: 'Acute Tonsillitis with Pharyngitis',
      rxSummary: 'Azithromycin suspension 200mg/5ml x 3d, Paracetamol drops',
      feePaid: 500,
      paymentMethod: 'Chapa',
      followUp: 'Complete full medication course'
    }
  ]);

  // Reservation Form State (For Walk-in / Phone Callers)
  const [reserveForm, setReserveForm] = useState({
    patientName: '',
    gender: 'male',
    age: '',
    phoneNumber: '+251 9',
    cardNumber: '',
    chiefComplaint: '',
    paymentMethod: 'Telebirr'
  });

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  // Filtered Taken Slots
  const filteredTakenSlots = takenSlots.filter((slot) => {
    const matchesDoctor = filterDoctor === 'all' || slot.doctorId === filterDoctor;
    const matchesStatus = filterStatus === 'all' || slot.status === filterStatus;
    const matchesSearch =
      searchPatient.trim() === '' ||
      slot.patientName.toLowerCase().includes(searchPatient.toLowerCase()) ||
      slot.cardNumber.toLowerCase().includes(searchPatient.toLowerCase()) ||
      slot.phoneNumber.includes(searchPatient);
    return matchesDoctor && matchesStatus && matchesSearch;
  });

  // Handle Mark Arrived / Change Status
  const handleUpdateStatus = (slotId, newStatus) => {
    setTakenSlots(prev =>
      prev.map(item => {
        if (item.id === slotId) {
          return { ...item, status: newStatus };
        }
        return item;
      })
    );
    notify(`Status successfully updated to "${newStatus.replace('_', ' ')}"!`);
  };

  // Handle Cancel / Release Slot
  const handleCancelSlot = (slotId) => {
    const slot = takenSlots.find(s => s.id === slotId);
    if (!slot) return;
    if (confirm(`Are you sure you want to cancel the reservation for ${slot.patientName} (${slot.slotTime})?`)) {
      setTakenSlots(prev => prev.filter(s => s.id !== slotId));
      // Return back to open slots
      setOpenSlots(prev => [
        ...prev,
        {
          id: `slot-open-${Date.now()}`,
          doctorId: slot.doctorId,
          doctorName: slot.doctorName,
          specialty: slot.specialty,
          room: 'Suite 201',
          time: slot.slotTime,
          date: slot.date,
          duration: '30 mins',
          fee: `${slot.feePaid - 100} ETB`
        }
      ]);
      notify(`Appointment cancelled. Slot ${slot.slotTime} released back to open slots.`);
    }
  };

  // Handle Quick Reservation from Open Slots
  const handleOpenReserveModal = (slot) => {
    setSelectedSlotToReserve(slot);
    setReserveForm({
      patientName: '',
      gender: 'male',
      age: '',
      phoneNumber: '+251 9',
      cardNumber: `CLN-2026-000${Math.floor(10 + Math.random() * 89)}`,
      chiefComplaint: '',
      paymentMethod: 'Telebirr'
    });
    setShowReserveModal(true);
  };

  const handleConfirmReservation = (e) => {
    e.preventDefault();
    if (!reserveForm.patientName || !reserveForm.phoneNumber) {
      alert('Please provide patient name and phone number');
      return;
    }

    const newAppointment = {
      id: `apt-${Date.now()}`,
      slotTime: selectedSlotToReserve.time,
      date: selectedSlotToReserve.date,
      patientName: reserveForm.patientName,
      gender: reserveForm.gender,
      age: Number(reserveForm.age) || 30,
      phoneNumber: reserveForm.phoneNumber,
      cardNumber: reserveForm.cardNumber,
      nationalId: `ET-FAYDA-${Math.floor(10000 + Math.random() * 89999)}`,
      doctorId: selectedSlotToReserve.doctorId,
      doctorName: selectedSlotToReserve.doctorName,
      specialty: selectedSlotToReserve.specialty,
      chiefComplaint: reserveForm.chiefComplaint || 'Consultation via Receptionist Booking',
      status: 'confirmed',
      feePaid: 500,
      paymentMethod: reserveForm.paymentMethod,
      bookedAt: 'Just Now (Reception Desk)'
    };

    // Add to taken slots
    setTakenSlots(prev => [newAppointment, ...prev]);
    // Remove from open slots
    setOpenSlots(prev => prev.filter(s => s.id !== selectedSlotToReserve.id));
    setShowReserveModal(false);
    notify(`🎉 Slot ${selectedSlotToReserve.time} reserved for ${reserveForm.patientName}!`);
  };

  // Handle Add Doctor
  const handleAddDoctorSubmit = (e) => {
    e.preventDefault();
    if (!newDoctorForm.name || !newDoctorForm.licenseNumber) {
      alert('Please fill out doctor name and MOH license number');
      return;
    }

    const docId = `doc-${Date.now()}`;
    const newDoc = {
      id: docId,
      name: newDoctorForm.name.startsWith('Dr.') ? newDoctorForm.name : `Dr. ${newDoctorForm.name}`,
      specialty: newDoctorForm.specialty,
      licenseNumber: newDoctorForm.licenseNumber,
      email: newDoctorForm.email || `dr.${newDoctorForm.name.toLowerCase().replace(/[^a-z]/g, '')}@clinic.et`,
      phone: newDoctorForm.phone,
      room: newDoctorForm.room,
      shift: newDoctorForm.shift,
      workingDays: newDoctorForm.workingDays,
      active: true,
      patientsCountToday: 0,
      totalTreated: 0
    };

    setDoctorsList(prev => [...prev, newDoc]);

    // Generate initial open slots for this new doctor
    const generatedSlots = [
      {
        id: `slot-${docId}-1`,
        doctorId: docId,
        doctorName: newDoc.name,
        specialty: newDoc.specialty,
        room: newDoc.room,
        time: '09:00 AM',
        date: 'Today, Oct 13',
        duration: '30 mins',
        fee: '400 ETB'
      },
      {
        id: `slot-${docId}-2`,
        doctorId: docId,
        doctorName: newDoc.name,
        specialty: newDoc.specialty,
        room: newDoc.room,
        time: '10:30 AM',
        date: 'Today, Oct 13',
        duration: '30 mins',
        fee: '400 ETB'
      },
      {
        id: `slot-${docId}-3`,
        doctorId: docId,
        doctorName: newDoc.name,
        specialty: newDoc.specialty,
        room: newDoc.room,
        time: '02:00 PM',
        date: 'Today, Oct 13',
        duration: '30 mins',
        fee: '400 ETB'
      }
    ];

    setOpenSlots(prev => [...prev, ...generatedSlots]);
    setShowAddDoctorModal(false);
    setNewDoctorForm({
      name: '',
      specialty: 'Internal Medicine & General Practice',
      licenseNumber: '',
      email: '',
      phone: '+251',
      room: 'Suite ',
      shift: '08:30 AM - 04:30 PM',
      workingDays: 'Monday - Friday'
    });
    notify(`✅ ${newDoc.name} successfully registered to clinic staff!`);
  };

  // Toggle Doctor Active Status (Persisted to Database)
  const handleToggleDoctorStatus = async (doctorId) => {
    const targetDoc = doctorsList.find(d => d.id === doctorId);
    if (!targetDoc) return;
    const nextState = !targetDoc.active;

    try {
      const res = await clinicApi.patch(`/admin/toggleDoctorStatus/${doctorId}`, {
        isActive: nextState
      });
      if (res.data?.success) {
        notify(`✅ ${targetDoc.name} marked as ${nextState ? 'Active' : 'On Leave / Inactive'}`);
        fetchDoctors();
        return;
      }
    } catch (err) {
      console.warn('Backend toggle failed, applying optimistic update:', err.message);
    }

    // Local fallback update
    setDoctorsList(prev =>
      prev.map(d => {
        if (d.id === doctorId) {
          notify(`${d.name} marked as ${nextState ? 'Active' : 'On Leave / Inactive'}`);
          return { ...d, active: nextState };
        }
        return d;
      })
    );
  };

  if (!mounted) {
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
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Booked Slots</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                {takenSlots.length}
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
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Open Slots to Reserve</div>
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
                {treatedPatients.length + takenSlots.filter(s => s.status === 'completed').length}
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
            <Clock size={18} /> Open Slots to Reserve ({openSlots.length})
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
                    <option value="confirmed">Confirmed</option>
                    <option value="in_consultation">In Consultation</option>
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
                Showing <strong>{filteredTakenSlots.length}</strong> booked slots for {filterDate}
              </div>
              <button
                onClick={() => setActiveTab('open_slots')}
                style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>View {openSlots.length} Open Slots</span> <ChevronRight size={15} />
              </button>
            </div>

            {/* Slot Cards List */}
            {filteredTakenSlots.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Calendar size={48} style={{ color: '#cbd5e1', margin: '0 auto 14px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px' }}>
                  No Booked Slots Found
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 20px' }}>
                  No reservations match your current filters. Adjust doctor selection or clear the search query.
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
                    confirmed: { bg: '#e0e7ff', color: '#4338ca', label: 'Confirmed Booking' },
                    in_consultation: { bg: '#fef3c7', color: '#b45309', label: 'In Consultation 🩺' },
                    completed: { bg: '#dcfce7', color: '#15803d', label: 'Treated & Completed ✓' },
                    cancelled: { bg: '#fee2e2', color: '#b91c1c', label: 'Cancelled' }
                  };
                  const currentStatus = statusColors[slot.status] || statusColors.confirmed;

                  return (
                    <div
                      key={slot.id}
                      className="glass-panel"
                      style={{
                        padding: '20px 24px',
                        borderLeft: `5px solid ${slot.status === 'in_consultation' ? '#f59e0b' : slot.status === 'completed' ? '#10b981' : '#4f46e5'}`,
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
                                {slot.gender === 'male' ? 'Male' : 'Female'}, Age {slot.age}
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
                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: '#15803d',
                              background: '#dcfce7',
                              padding: '4px 8px',
                              borderRadius: '6px'
                            }}>
                              {slot.feePaid} ETB Paid ({slot.paymentMethod})
                            </span>
                          </div>

                          {/* Quick Actions */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {slot.status === 'confirmed' && (
                              <button
                                onClick={() => handleUpdateStatus(slot.id, 'in_consultation')}
                                className="btn btn-sm"
                                style={{
                                  background: '#4f46e5',
                                  color: 'white',
                                  fontSize: '0.8rem',
                                  padding: '6px 12px',
                                  borderRadius: '8px'
                                }}
                              >
                                Send to Doctor Room
                              </button>
                            )}

                            {slot.status === 'in_consultation' && (
                              <button
                                onClick={() => handleUpdateStatus(slot.id, 'completed')}
                                className="btn btn-sm"
                                style={{
                                  background: '#10b981',
                                  color: 'white',
                                  fontSize: '0.8rem',
                                  padding: '6px 12px',
                                  borderRadius: '8px'
                                }}
                              >
                                Mark Visit Completed ✓
                              </button>
                            )}

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
                                <Ban size={14} /> Release Slot
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
                    These slots are unreserved. Click <strong>"Reserve for Patient"</strong> to register a walk-in or telephone patient.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => notify('Slot schedules refreshed from central clinic sync.')}
                    className="btn btn-secondary btn-sm"
                  >
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
              </div>
            </div>

            {openSlots.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Clock size={48} style={{ color: '#cbd5e1', margin: '0 auto 14px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px' }}>
                  All Slots are Currently Booked
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 20px' }}>
                  There are no unreserved slots for today. You can add more doctors or release existing slots.
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
                        <span style={{
                          background: '#ecfdf5',
                          color: '#047857',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          padding: '4px 8px',
                          borderRadius: '6px'
                        }}>
                          {slot.fee}
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
                          <MapPin size={13} /> {slot.room}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} /> {slot.duration}
                        </span>
                      </div>
                    </div>

                    {/* Reserve Button */}
                    <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => handleOpenReserveModal(slot)}
                        className="btn btn-primary"
                        style={{
                          width: '100%',
                          fontSize: '0.88rem',
                          padding: '9px 14px',
                          borderRadius: '10px'
                        }}
                      >
                        <UserPlus size={16} /> Reserve for Patient
                      </button>
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
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Patients Seen:</span>
                      <strong style={{ color: '#4f46e5', fontSize: '1rem' }}>{doc.totalTreated} Patients</strong>
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
                      View Slots ({doc.patientsCountToday})
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
                    Historical log of finished consultations with diagnosis details and fee records.
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {treatedPatients.map((treated) => (
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
                        Treated on <strong>{treated.treatedDate}</strong> by <strong>{treated.doctorName}</strong> ({treated.specialty})
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
                          Primary Diagnosis: <span style={{ fontWeight: 500, color: '#0f172a' }}>{treated.diagnosis}</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                          <strong>Prescribed Rx:</strong> {treated.rxSummary}
                        </div>
                      </div>
                    </div>

                    {/* Fee Paid & Followup */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d' }}>
                        {treated.feePaid} ETB
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Paid via {treated.paymentMethod}
                      </div>
                      <div style={{
                        marginTop: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: '#e0e7ff',
                        color: '#4338ca',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-block'
                      }}>
                        {treated.followUp}
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

                    const borderCol = isApproved ? '#10b981' : isPending ? '#f59e0b' : '#ef4444';
                    const badgeBg = isApproved ? '#ecfdf5' : isPending ? '#fef3c7' : '#fef2f2';
                    const badgeCol = isApproved ? '#047857' : isPending ? '#92400e' : '#b91c1c';

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
                {leaveReviewModal.status === 'approved' ? 'Approve Doctor Leave' : 'Reject Doctor Leave'}
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
              <strong style={{ color: leaveReviewModal.status === 'approved' ? '#059669' : '#dc2626', textTransform: 'uppercase' }}>
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

            <form onSubmit={handleReviewLeaveSubmit}>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Administrator Feedback / Decision Notes</label>
                <textarea
                  rows={3}
                  className="form-control"
                  value={adminReviewNotes}
                  onChange={(e) => setAdminReviewNotes(e.target.value)}
                  placeholder="Enter comments for the physician..."
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
                    background: leaveReviewModal.status === 'approved' ? '#10b981' : '#ef4444',
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
                  Register a new practitioner to Bole Branch clinical roster.
                </p>
              </div>
              <button
                onClick={() => setShowAddDoctorModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddDoctorSubmit}>
              <div className="form-group">
                <label className="form-label">Doctor Full Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Dr. Meron Teshome"
                  value={newDoctorForm.name}
                  onChange={(e) => setNewDoctorForm({ ...newDoctorForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Medical Specialization</label>
                <select
                  className="form-control"
                  value={newDoctorForm.specialty}
                  onChange={(e) => setNewDoctorForm({ ...newDoctorForm, specialty: e.target.value })}
                >
                  <option value="Internal Medicine & General Practice">Internal Medicine & General Practice</option>
                  <option value="Pediatrics & Child Health">Pediatrics & Child Health</option>
                  <option value="Obstetrics & Gynecology (OB/GYN)">Obstetrics & Gynecology (OB/GYN)</option>
                  <option value="Cardiology & Hypertension Clinic">Cardiology & Hypertension Clinic</option>
                  <option value="Dermatology & Skin Health">Dermatology & Skin Health</option>
                  <option value="Orthopedic Surgery & Joints">Orthopedic Surgery & Joints</option>
                  <option value="Ophthalmology (Eye Clinic)">Ophthalmology (Eye Clinic)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Ethiopian MOH License #</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="ETH-MOH-DOC-XXXX"
                    value={newDoctorForm.licenseNumber}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, licenseNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Consultation Room / Suite</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Suite 208"
                    value={newDoctorForm.room}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, room: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="+251 91 123 4567"
                    value={newDoctorForm.phone}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="doctor@clinic.et"
                    value={newDoctorForm.email}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Shift Hours</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="08:30 AM - 04:30 PM"
                    value={newDoctorForm.shift}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, shift: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Working Days</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Monday - Friday"
                    value={newDoctorForm.workingDays}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, workingDays: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1.5 }}
                >
                  <UserPlus size={16} /> Save Doctor & Generate Slots
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: QUICK RESERVATION MODAL (ለታካሚ ስሎት መያዝ)              */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showReserveModal && selectedSlotToReserve && (
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
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '30px',
            background: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Reserve Slot: {selectedSlotToReserve.time}
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 600, marginTop: '2px' }}>
                  {selectedSlotToReserve.doctorName} • {selectedSlotToReserve.specialty}
                </div>
              </div>
              <button
                onClick={() => setShowReserveModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmReservation}>
              <div className="form-group">
                <label className="form-label">Patient Full Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Martha Haile"
                  value={reserveForm.patientName}
                  onChange={(e) => setReserveForm({ ...reserveForm, patientName: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-control"
                    value={reserveForm.gender}
                    onChange={(e) => setReserveForm({ ...reserveForm, gender: e.target.value })}
                  >
                    <option value="male">Male (ወንድ)</option>
                    <option value="female">Female (ሴት)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 34"
                    value={reserveForm.age}
                    onChange={(e) => setReserveForm({ ...reserveForm, age: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="+251 91 234 5678"
                    value={reserveForm.phoneNumber}
                    onChange={(e) => setReserveForm({ ...reserveForm, phoneNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Clinic Card #</label>
                  <input
                    type="text"
                    className="form-control"
                    value={reserveForm.cardNumber}
                    onChange={(e) => setReserveForm({ ...reserveForm, cardNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Chief Complaint / Reason for Visit</label>
                <textarea
                  rows={2}
                  className="form-control"
                  placeholder="e.g. High fever, headache and throat soreness"
                  value={reserveForm.chiefComplaint}
                  onChange={(e) => setReserveForm({ ...reserveForm, chiefComplaint: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method Collected</label>
                <select
                  className="form-control"
                  value={reserveForm.paymentMethod}
                  onChange={(e) => setReserveForm({ ...reserveForm, paymentMethod: e.target.value })}
                >
                  <option value="Telebirr">Telebirr (ቴሌብር)</option>
                  <option value="CBE Birr">CBE Birr (የኢትዮጵያ ንግድ ባንክ)</option>
                  <option value="Chapa">Chapa / Card</option>
                  <option value="Cash at Desk">Cash at Reception Desk</option>
                </select>
              </div>

              <div style={{
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.88rem'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>Card Fee (100) + Consultation (400):</span>
                <strong style={{ color: '#15803d', fontSize: '1rem' }}>500 ETB Total</strong>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowReserveModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1.5 }}
                >
                  Confirm Reservation & Queue
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
                <span style={{ color: 'var(--text-muted)' }}>Gender & Age:</span>
                <span>{showPatientDetailModal.gender === 'male' ? 'Male' : 'Female'}, {showPatientDetailModal.age} Years</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ethiopian National ID (Fayda):</span>
                <span>{showPatientDetailModal.nationalId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phone Number:</span>
                <span>{showPatientDetailModal.phoneNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Physician:</span>
                <strong>{showPatientDetailModal.doctorName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Appointment Slot:</span>
                <span>{showPatientDetailModal.slotTime} ({showPatientDetailModal.date})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Fee & Payment:</span>
                <span style={{ color: '#15803d', fontWeight: 700 }}>{showPatientDetailModal.feePaid} ETB Paid ({showPatientDetailModal.paymentMethod})</span>
              </div>
              <div style={{ marginTop: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700 }}>Chief Complaint:</span>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', fontSize: '0.85rem' }}>
                  {showPatientDetailModal.chiefComplaint}
                </div>
              </div>
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
                    <span>http://localhost:3000/login</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      const text = `CareSync Front Desk Credentials:\nName: ${createdReceptionistCreds.name}\nEmail: ${createdReceptionistCreds.email}\nPassword: ${createdReceptionistCreds.password}\nPortal: http://localhost:3000/login`;
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


