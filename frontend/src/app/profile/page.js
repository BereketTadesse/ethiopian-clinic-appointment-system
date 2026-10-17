'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import API from '@/lib/api';
import {
  User,
  Camera,
  HeartPulse,
  AlertTriangle,
  Phone,
  Shield,
  Calendar,
  MapPin,
  Pill,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Edit3,
  FileBadge,
  Droplet,
  Lock,
  Stethoscope
} from 'lucide-react';

export default function PatientProfilePage() {
  const { user, updateUserState, mounted } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'medical' | 'personal'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Personal Info State
  const [personalData, setPersonalData] = useState({
    name: '',
    phoneNumber: '',
    address: '',
    gender: 'male',
    birthDate: '',
  });

  // Avatar state
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewURL, setPreviewURL] = useState('');

  // Medical Profile State (Read-only for medications/history, editable for blood/allergies/emergency contact)
  const [medicalData, setMedicalData] = useState({
    bloodType: 'O+',
    allergies: [],
    emergencyContact: {
      name: '',
      phoneNumber: '',
      relationship: 'spouse',
    },
    medications: [],
    medicalHistory: [],
  });

  // Allergy input draft state
  const [allergyInput, setAllergyInput] = useState('');

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Fetch complete profile from backend
  const fetchFullProfile = async (userId) => {
    try {
      setLoading(true);
      setError('');
      // Calls GET /api/users/profile/:id
      const { data } = await API.get(`/users/profile/${userId}`);
      const profile = data.data;

      if (profile) {
        // Core user fields
        const u = profile.user || user;
        setPersonalData({
          name: u.name || '',
          phoneNumber: u.phoneNumber || '',
          address: u.address || profile.address || '',
          gender: u.gender || profile.gender || 'male',
          birthDate: u.birthDate || profile.birthDate ? new Date(u.birthDate || profile.birthDate).toISOString().split('T')[0] : '',
        });

        if (u.profilePicture) {
          setPreviewURL(u.profilePicture);
        }

        // Medical fields
        setMedicalData({
          bloodType: profile.bloodType || 'O+',
          allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
          emergencyContact: {
            name: profile.emergencyContact?.name || '',
            phoneNumber: profile.emergencyContact?.phoneNumber || '',
            relationship: profile.emergencyContact?.relationship || 'spouse',
          },
          medications: Array.isArray(profile.medications) ? profile.medications : [],
          medicalHistory: Array.isArray(profile.medicalHistory) ? profile.medicalHistory : [],
        });
      }
    } catch (err) {
      console.error('Error loading patient profile:', err);
      if (user) {
        setPersonalData({
          name: user.name || '',
          phoneNumber: user.phoneNumber || '',
          address: user.address || '',
          gender: user.gender || 'male',
          birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
        });
        if (user.profilePicture) setPreviewURL(user.profilePicture);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      if (!user) {
        router.push('/login');
      } else {
        const userId = user._id || user.id;
        if (userId) {
          fetchFullProfile(userId);
        }
      }
    }
  }, [mounted, user, router]);

  // Handle avatar select
  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  // 1. Save Personal Details (with Cloudinary avatar)
  const handleSavePersonal = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', personalData.name);
      formData.append('phoneNumber', personalData.phoneNumber);
      formData.append('address', personalData.address);
      formData.append('gender', personalData.gender);
      if (personalData.birthDate) {
        formData.append('birthDate', personalData.birthDate);
      }
      if (avatarFile) {
        formData.append('profilePicture', avatarFile);
      }

      const { data } = await API.put('/users/update-profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage('Personal details and profile picture updated successfully!');
      if (data.data?.user) {
        updateUserState(data.data.user);
      } else if (data.user) {
        updateUserState(data.user);
      }
      setAvatarFile(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update personal profile');
    } finally {
      setSaving(false);
    }
  };

  // 2. Save Medical Information (Patient-editable: Blood Type, Allergies, Emergency Contact)
  const handleSaveMedical = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      // NOTE: Diagnosis, clinical records, and prescribed medications are strictly physician-managed
      const payload = {
        bloodType: medicalData.bloodType,
        allergies: medicalData.allergies,
        emergencyContact: medicalData.emergencyContact,
      };

      await API.put('/users/update-profile', payload);

      setMessage('Medical information and emergency contact saved successfully!');
      const userId = user._id || user.id;
      if (userId) fetchFullProfile(userId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save medical records');
    } finally {
      setSaving(false);
    }
  };

  // Allergy list management
  const handleAddAllergy = (e) => {
    e.preventDefault();
    if (!allergyInput.trim()) return;
    if (!medicalData.allergies.includes(allergyInput.trim())) {
      setMedicalData({
        ...medicalData,
        allergies: [...medicalData.allergies, allergyInput.trim()],
      });
    }
    setAllergyInput('');
  };

  const handleRemoveAllergy = (itemToRemove) => {
    setMedicalData({
      ...medicalData,
      allergies: medicalData.allergies.filter((a) => a !== itemToRemove),
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    setChangingPassword(true);
    setMessage('');
    setError('');
    try {
      await API.post('/users/change-password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      setMessage('Password updated successfully!');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!mounted || !user) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading session...</div>;
  }

  const patientIdNumber = (user._id || user.id || '000000').slice(-6).toUpperCase();
  const isReceptionist = user.role === 'receptionist';
  const isAdmin = user.role === 'admin';
  const isStaff = isReceptionist || isAdmin;
  const roleDisplayLabel = isReceptionist ? 'Front Desk Receptionist' : isAdmin ? 'Clinic Administrator' : (user.role || 'Patient');
  const idPrefix = isReceptionist ? 'ETH-REC' : isAdmin ? 'ETH-ADM' : 'ETH-PAT';

  return (
    <div className="container" style={{ padding: '40px 20px 80px', maxWidth: '1000px' }}>
      {/* ── Profile Header Card ───────────────────────────── */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          background: isStaff ? 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{
              width: '92px',
              height: '92px',
              borderRadius: '24px',
              overflow: 'hidden',
              background: isReceptionist ? '#d1fae5' : '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px -6px rgba(79, 70, 229, 0.25)',
              border: '3px solid white',
              position: 'relative'
            }}>
              {previewURL ? (
                <img src={previewURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={46} style={{ color: isReceptionist ? '#059669' : '#4f46e5' }} />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                  {personalData.name || user.name || roleDisplayLabel}
                </h1>
                <span style={{
                  background: isReceptionist ? '#ecfdf5' : isAdmin ? '#fef3c7' : '#eef2ff',
                  color: isReceptionist ? '#065f46' : isAdmin ? '#92400e' : '#4338ca',
                  border: isReceptionist ? '1px solid #a7f3d0' : isAdmin ? '1px solid #fde68a' : '1px solid #c7d2fe',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Shield size={12} /> {roleDisplayLabel}
                </span>
                <span style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                }}>
                  ID: {idPrefix}-{patientIdNumber}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.86rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={14} /> {user.email}
                </span>
                {personalData.phoneNumber && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Phone size={14} /> {personalData.phoneNumber}
                  </span>
                )}
                {personalData.address && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={14} /> {personalData.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Badges */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {isStaff ? (
              <>
                <div style={{
                  background: '#ecfdf5',
                  border: '1px solid #d1fae5',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                    Staff Status
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <CheckCircle2 size={16} /> Active & Verified
                  </div>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Operating Role
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                    {isReceptionist ? 'Front Desk Staff' : 'System Admin'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
                    Blood Type
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Droplet size={16} /> {medicalData.bloodType || 'N/A'}
                  </div>
                </div>

                <div style={{
                  background: '#ecfdf5',
                  border: '1px solid #d1fae5',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                    Allergies
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                    {medicalData.allergies.length} Listed
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '28px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'overview' ? '#4f46e5' : '#f8fafc',
              color: activeTab === 'overview' ? 'white' : '#64748b',
              transition: 'all 0.2s ease',
            }}
          >
            <FileBadge size={16} /> {isStaff ? 'Staff Credential Card' : 'Patient Health Card'}
          </button>

          {!isStaff && (
            <button
              onClick={() => setActiveTab('medical')}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'medical' ? '#4f46e5' : '#f8fafc',
                color: activeTab === 'medical' ? 'white' : '#64748b',
                transition: 'all 0.2s ease',
              }}
            >
              <HeartPulse size={16} /> Edit Medical Info & Allergies
            </button>
          )}

          <button
            onClick={() => setActiveTab('personal')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'personal' ? '#4f46e5' : '#f8fafc',
              color: activeTab === 'personal' ? 'white' : '#64748b',
              transition: 'all 0.2s ease',
            }}
          >
            <Edit3 size={16} /> Edit Personal Info & Photo
          </button>

          <button
            onClick={() => setActiveTab('security')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'security' ? '#4f46e5' : '#f8fafc',
              color: activeTab === 'security' ? 'white' : '#64748b',
              transition: 'all 0.2s ease',
            }}
          >
            <Lock size={16} /> Account Security & Password
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#047857',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Retrieving complete clinical health records...
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW - STAFF CREDENTIAL CARD OR PATIENT CARD  */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            isStaff ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* Official Staff Identity Credential Card */}
                <div style={{
                  background: isReceptionist
                    ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)'
                    : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
                  color: 'white',
                  borderRadius: '20px',
                  padding: '30px',
                  boxShadow: '0 14px 30px -10px rgba(6, 95, 70, 0.4)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    right: '-20px',
                    bottom: '-20px',
                    width: '180px',
                    height: '180px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '50%',
                    pointerEvents: 'none'
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', letterSpacing: '2px', textTransform: 'uppercase', color: isReceptionist ? '#a7f3d0' : '#a5b4fc', fontWeight: 700 }}>
                        Federal Democratic Republic of Ethiopia • Clinic Network
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '4px', letterSpacing: '-0.3px' }}>
                        CareSync Official Clinic Staff Credential
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: '6px 14px',
                      borderRadius: '30px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.5px'
                    }}>
                      AUTHORIZED CLINIC STAFF
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginTop: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Staff Name</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '3px' }}>
                        {personalData.name || user.name || roleDisplayLabel}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Staff ID</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '3px', fontFamily: 'monospace' }}>
                        {idPrefix}-{patientIdNumber}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Assigned Unit</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '3px' }}>
                        {isReceptionist ? 'Front Desk & Patient Intake' : 'Central Administration'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Duty Base</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '3px' }}>
                        {personalData.address || 'Addis Ababa Central Clinic'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Staff Privileges and Responsibilities Breakdown */}
                <div className="glass-panel" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                    <Shield size={22} style={{ color: isReceptionist ? '#059669' : '#4f46e5' }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                      Operational Privileges & Responsibilities
                    </h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} /> Patient Reception & Walk-in Booking
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#475569', margin: '6px 0 0' }}>
                        Authorized to look up patient cards, schedule available physician slots, and manage reception intake queue.
                      </p>
                    </div>

                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} /> Real-time Slot Availability
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#475569', margin: '6px 0 0' }}>
                        Live visibility into doctor rosters, consultation shift hours, and immediate slot booking.
                      </p>
                    </div>

                    <div style={{
                      padding: '16px',
                      background: isAdmin ? '#ecfdf5' : '#fef2f2',
                      borderRadius: '12px',
                      border: isAdmin ? '1px solid #a7f3d0' : '1px solid #fee2e2'
                    }}>
                      <div style={{
                        fontWeight: 700,
                        color: isAdmin ? '#059669' : '#dc2626',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {isAdmin ? <CheckCircle2 size={16} /> : <Lock size={16} />}
                        Clinic Profile & Configuration
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#475569', margin: '6px 0 0' }}>
                        {isAdmin
                          ? 'Full administrative control over clinic operating hours, media branding, doctor onboarding, and holidays.'
                          : 'Restricted: Only the Clinic Administrator can modify clinic operating details, logo, holidays, or doctor roster.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* Digital Clinical Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
                  color: 'white',
                  borderRadius: '20px',
                  padding: '28px',
                  boxShadow: '0 14px 30px -10px rgba(49, 46, 129, 0.4)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    right: '-20px',
                    bottom: '-20px',
                    width: '180px',
                    height: '180px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '50%',
                    pointerEvents: 'none'
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#a5b4fc', fontWeight: 700 }}>
                        Federal Democratic Republic of Ethiopia • Clinic Network
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '4px', letterSpacing: '-0.3px' }}>
                        CareSync Ethiopian Patient Health Card
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      padding: '6px 14px',
                      borderRadius: '30px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.5px'
                    }}>
                      ACTIVE CLINIC RECORD
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginTop: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Patient Name</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '3px' }}>
                        {personalData.name || user.name || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Clinical Patient ID</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '3px', fontFamily: 'monospace' }}>
                        ETH-PAT-{patientIdNumber}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Blood Group</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '3px', color: '#fca5a5' }}>
                        {medicalData.bloodType || 'Unassigned'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Emergency Contact</div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 600, marginTop: '3px' }}>
                        {medicalData.emergencyContact?.name ? (
                          `${medicalData.emergencyContact.name} (${medicalData.emergencyContact.phoneNumber || 'No phone'})`
                        ) : (
                          'None listed'
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Managed Vitals: Allergies & Emergency Contact */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  {/* Allergies Card */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AlertTriangle size={18} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Known Allergies</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('medical')}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.78rem' }}
                      >
                        Update
                      </button>
                    </div>

                    {medicalData.allergies.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', padding: '12px 0' }}>
                        No adverse drug or environmental allergies reported.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {medicalData.allergies.map((allergy, i) => (
                          <span key={i} style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                          }}>
                            ⚠️ {allergy}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Emergency Contact Card */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Phone size={18} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Emergency Contact</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('medical')}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.78rem' }}
                      >
                        Update
                      </button>
                    </div>

                    {medicalData.emergencyContact?.name ? (
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontWeight: 700 }}>
                          {medicalData.emergencyContact.name}{' '}
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                            ({medicalData.emergencyContact.relationship})
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5' }}>
                          <Phone size={14} />
                          <a href={`tel:${medicalData.emergencyContact.phoneNumber}`} style={{ color: 'inherit', fontWeight: 600, textDecoration: 'none' }}>
                            {medicalData.emergencyContact.phoneNumber}
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', padding: '12px 0' }}>
                        No emergency contact registered yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor-Managed Records: Medications & Medical History (READ-ONLY) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  {/* Active Medications (Physician prescribed) */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Pill size={18} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Active Prescriptions</h3>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Lock size={11} /> Prescribed by Doctor • Read-Only
                          </span>
                        </div>
                      </div>
                    </div>

                    {medicalData.medications.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', padding: '12px 0' }}>
                        No active prescriptions documented by attending doctor.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {medicalData.medications.map((med, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{med.name}</span>
                            <span style={{ fontSize: '0.82rem', color: '#64748b', background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>{med.dosage}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Medical History & Diagnoses (Doctor filled) */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Stethoscope size={18} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Diagnoses & Medical History</h3>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Lock size={11} /> Documented by Physician • Read-Only
                          </span>
                        </div>
                      </div>
                    </div>

                    {medicalData.medicalHistory.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', padding: '12px 0' }}>
                        No clinical diagnoses or historical conditions recorded yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {medicalData.medicalHistory.map((item, i) => (
                          <div key={i} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                              {item.date ? new Date(item.date).toLocaleDateString() : 'Historical'}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', marginTop: '2px' }}>
                              {item.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ======================================================== */}
          {/* TAB 2: EDIT MEDICAL INFO & ALLERGIES (PATIENT-MANAGED)   */}
          {/* ======================================================== */}
          {activeTab === 'medical' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Medical Information & Allergies</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Update your blood group, report any allergies, and maintain your primary emergency contact.
                </p>
              </div>

              {/* Informative notice explaining clinical records */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '26px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <Shield size={20} style={{ color: '#4f46e5', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '2px' }}>
                    Physician-Managed Clinical Records
                  </strong>
                  Official clinical diagnoses, patient medical history, and prescribed medications are strictly entered and updated by licensed doctors during clinic visits.
                </div>
              </div>

              <form onSubmit={handleSaveMedical}>
                {/* Blood Type & Allergies */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">Blood Type</label>
                    <select
                      className="form-control"
                      value={medicalData.bloodType}
                      onChange={(e) => setMedicalData({ ...medicalData, bloodType: e.target.value })}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Add Known Allergy</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Penicillin, Peanuts"
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                      />
                      <button type="button" onClick={handleAddAllergy} className="btn btn-secondary" style={{ padding: '0 16px' }}>
                        <Plus size={16} /> Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Display Allergies tags */}
                {medicalData.allergies.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
                    {medicalData.allergies.map((allergy, i) => (
                      <span key={i} style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {allergy}
                        <button
                          type="button"
                          onClick={() => handleRemoveAllergy(allergy)}
                          style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 0 }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Emergency Contact */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginBottom: '28px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>
                    Emergency Contact Details
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Almaz Tadesse"
                        value={medicalData.emergencyContact.name}
                        onChange={(e) => setMedicalData({
                          ...medicalData,
                          emergencyContact: { ...medicalData.emergencyContact, name: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="+251911..."
                        value={medicalData.emergencyContact.phoneNumber}
                        onChange={(e) => setMedicalData({
                          ...medicalData,
                          emergencyContact: { ...medicalData.emergencyContact, phoneNumber: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Relationship</label>
                      <select
                        className="form-control"
                        value={medicalData.emergencyContact.relationship}
                        onChange={(e) => setMedicalData({
                          ...medicalData,
                          emergencyContact: { ...medicalData.emergencyContact, relationship: e.target.value }
                        })}
                      >
                        <option value="spouse">Spouse</option>
                        <option value="parent">Parent</option>
                        <option value="sibling">Sibling</option>
                        <option value="child">Child</option>
                        <option value="friend">Friend / Relative</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ height: '46px', padding: '0 28px' }}
                >
                  {saving ? 'Saving...' : 'Save Medical Information'}
                </button>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: EDIT PERSONAL INFO & PHOTO                        */}
          {/* ======================================================== */}
          {activeTab === 'personal' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Personal Identity & Account Settings</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Update your contact phone, address, and profile photo stored securely on Cloudinary.
                </p>
              </div>

              <form onSubmit={handleSavePersonal}>
                {/* Avatar Uploader */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '28px' }}>
                  <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    background: '#e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {previewURL ? (
                      <img src={previewURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={40} style={{ color: '#4f46e5' }} />
                    )}
                  </div>

                  <div>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', padding: '9px 15px' }}>
                      <Camera size={16} />
                      <span>Upload Photo to Cloudinary</span>
                      <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                    </label>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Supports PNG, JPG, or WEBP up to 5MB
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={personalData.name}
                      onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+251911..."
                      value={personalData.phoneNumber}
                      onChange={(e) => setPersonalData({ ...personalData, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                  <div className="form-group">
                    <label className="form-label">Address / Subcity (Addis Ababa)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Bole Subcity, Woreda 03"
                      value={personalData.address}
                      onChange={(e) => setPersonalData({ ...personalData, address: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-control"
                      value={personalData.gender}
                      onChange={(e) => setPersonalData({ ...personalData, gender: e.target.value })}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ maxWidth: '300px' }}>
                  <label className="form-label">Birth Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={personalData.birthDate}
                    onChange={(e) => setPersonalData({ ...personalData, birthDate: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ marginTop: '14px', height: '46px', padding: '0 28px' }}
                >
                  {saving ? 'Uploading to Cloudinary & Saving...' : 'Save Personal Details'}
                </button>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: ACCOUNT SECURITY & CHANGE PASSWORD                */}
          {/* ======================================================== */}
          {activeTab === 'security' && (

            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Account Security & Password</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Protect your clinic credentials by maintaining a strong, unique password.
                </p>
              </div>

              <form onSubmit={handleChangePassword} style={{ maxWidth: '520px' }}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    required
                    className="form-control"
                    placeholder="Enter existing password"
                    value={passwordData.oldPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    required
                    className="form-control"
                    placeholder="Min 8 characters (letters & numbers)"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                    Must contain at least 8 characters, with uppercase, lowercase, and numbers.
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    className="form-control"
                    placeholder="Re-type new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="btn btn-primary"
                  style={{ height: '46px', padding: '0 28px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Lock size={16} />
                  {changingPassword ? 'Verifying & Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

