'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import API from '@/lib/api';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Phone,
  CreditCard,
  HeartPulse,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  QrCode,
  BadgeCheck,
  Printer
} from 'lucide-react';

export default function FamilyMembersPage() {
  const { user, mounted } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null); // null when adding, populated when editing
  const [activeMedicalMember, setActiveMedicalMember] = useState(null); // when viewing/editing medical profile
  const [activeCardMember, setActiveCardMember] = useState(null); // when viewing digital clinic card
  const [medicalProfile, setMedicalProfile] = useState(null);
  const [loadingMedical, setLoadingMedical] = useState(false);

  // Form State for Family Member basic info
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'female',
    relationship: 'daughter',
    phoneNumber: '',
    nationalId: '',
  });

  // Form State for Medical Profile
  const [medicalFormData, setMedicalFormData] = useState({
    bloodType: 'O+',
    allergies: '',
    chronicConditions: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: 'parent',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch All Family Members from Backend
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/users/getAllFamilyMembers');
      setMembers(data.members || data.familyMembers || []);
    } catch (err) {
      console.error('Fetch members error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      if (!user) {
        router.push('/login');
      } else {
        fetchMembers();
      }
    }
  }, [mounted, user, router]);

  // Open modal for Adding
  const openAddModal = () => {
    setEditingMember(null);
    setFormData({
      fullName: '',
      dateOfBirth: '',
      gender: 'female',
      relationship: 'daughter',
      phoneNumber: '',
      nationalId: '',
    });
    setError('');
    setShowModal(true);
  };

  // Open modal for Editing
  const openEditModal = (member) => {
    setEditingMember(member);
    const dob = member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : '';
    setFormData({
      fullName: member.fullName || '',
      dateOfBirth: dob,
      gender: member.gender || 'female',
      relationship: member.relationship || 'daughter',
      phoneNumber: member.phoneNumber || '',
      nationalId: member.nationalId || '',
    });
    setError('');
    setShowModal(true);
  };

  // 2. Submit Handler: Create OR Update
  const handleSubmitMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (editingMember) {
        // PATCH /api/users/updateFamilyMember/:id
        await API.patch(`/users/updateFamilyMember/${editingMember._id}`, formData);
        setSuccess(`Updated details for ${formData.fullName} successfully!`);
      } else {
        // POST /api/users/createFamilyMember
        await API.post('/users/createFamilyMember', formData);
        setSuccess(`Added ${formData.fullName} as a family member!`);
      }
      setShowModal(false);
      fetchMembers();
    } catch (err) {
      const resp = err.response?.data;
      setError(resp?.message || 'Operation failed. Please verify input fields.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Delete Handler
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await API.delete(`/users/deleteFamilyMember/${id}`);
      setSuccess(`Removed ${name} from your account.`);
      fetchMembers();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // 4. View/Edit Medical Profile Modal
  const openMedicalModal = async (member) => {
    setActiveMedicalMember(member);
    setLoadingMedical(true);
    setMedicalProfile(null);
    setError('');

    try {
      // GET /api/users/family-member-profile/:familyMemberId
      const { data } = await API.get(`/users/family-member-profile/${member._id}`);
      if (data.data) {
        setMedicalProfile(data.data);
        setMedicalFormData({
          bloodType: data.data.bloodType || 'O+',
          allergies: (data.data.allergies || []).join(', '),
          chronicConditions: (data.data.chronicConditions || []).join(', '),
          emergencyName: data.data.emergencyContact?.name || '',
          emergencyPhone: data.data.emergencyContact?.phoneNumber || '',
          emergencyRelationship: data.data.emergencyContact?.relationship || 'parent',
        });
      }
    } catch (err) {
      // Profile might not exist yet; default empty form
      setMedicalFormData({
        bloodType: 'O+',
        allergies: '',
        chronicConditions: '',
        emergencyName: '',
        emergencyPhone: '',
        emergencyRelationship: 'parent',
      });
    } finally {
      setLoadingMedical(false);
    }
  };

  const handleSaveMedical = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      bloodType: medicalFormData.bloodType,
      allergies: medicalFormData.allergies ? medicalFormData.allergies.split(',').map(s => s.trim()) : [],
      chronicConditions: medicalFormData.chronicConditions ? medicalFormData.chronicConditions.split(',').map(s => s.trim()) : [],
      emergencyContact: {
        name: medicalFormData.emergencyName,
        phoneNumber: medicalFormData.emergencyPhone,
        relationship: medicalFormData.emergencyRelationship,
      }
    };

    try {
      if (medicalProfile) {
        // PATCH /api/users/family-member-profile/:familyMemberId
        await API.patch(`/users/family-member-profile/${activeMedicalMember._id}`, payload);
      } else {
        // POST /api/users/family-member-profile/:familyMemberId
        await API.post(`/users/family-member-profile/${activeMedicalMember._id}`, payload);
      }
      setSuccess(`Medical profile for ${activeMedicalMember.fullName} saved!`);
      setActiveMedicalMember(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save medical record.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !user) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading session...</div>;
  }

  return (
    <div className="container" style={{ padding: '40px 20px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Family Members (Dependents)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px' }}>
            Manage profiles, medical cards, and clinic appointments for your children, spouse, or parents.
          </p>
        </div>

        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={18} /> Add Family Member
        </button>
      </div>

      {/* Success banner */}
      {success && (
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
          <span>{success}</span>
        </div>
      )}

      {/* Members Grid / Empty State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading your family members...</div>
      ) : members.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '64px 20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#eef2ff', color: '#4f46e5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Users size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No family members added yet</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '8px auto 24px', fontSize: '0.92rem', lineHeight: 1.5 }}>
            Register your children or parents to quickly schedule clinical appointments and track their medical history in one account.
          </p>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={18} /> Add Your First Dependent
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {members.map((member) => (
            <div key={member._id} className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    background: member.isSelf ? '#eef2ff' : '#ecfdf5',
                    color: member.isSelf ? '#4338ca' : '#047857',
                  }}>
                    {member.isSelf ? 'Primary Account Holder' : member.relationship}
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '10px', color: 'var(--text-main)' }}>
                    {member.fullName}
                  </h3>
                </div>

                {!member.isSelf && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => openEditModal(member)}
                      title="Edit Details"
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(member._id, member.fullName)}
                      title="Delete Member"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Dependent Details */}
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} style={{ color: '#4f46e5' }} />
                  <span>DOB: {member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : 'N/A'} ({member.gender})</span>
                </div>
                {member.phoneNumber && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={15} style={{ color: '#10b981' }} />
                    <span>{member.phoneNumber}</span>
                  </div>
                )}
                {member.nationalId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={15} style={{ color: '#f59e0b' }} />
                    <span>Fayda ID: {member.nationalId}</span>
                  </div>
                )}
              </div>

              {/* Actions: Clinic Card and Medical Profile */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => setActiveCardMember(member)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem' }}
                >
                  <CreditCard size={15} style={{ color: '#4f46e5' }} />
                  <span>Clinic Card (ካርድ)</span>
                </button>
                <button
                  onClick={() => openMedicalModal(member)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem' }}
                >
                  <HeartPulse size={15} style={{ color: '#ef4444' }} />
                  <span>Medical Record</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Create or Edit Family Member */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 100
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '32px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  {editingMember ? 'Edit Family Member' : 'Add New Family Member'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Directly synced with backend Family Member endpoints
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitMember}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Kalkidan Bekele"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-control"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Relationship to Account Holder</label>
                <select
                  className="form-control"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
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
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Phone (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+251911223344"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">National ID / Fayda (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ET-FAYDA-..."
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                  {submitting ? 'Saving...' : editingMember ? 'Update Member' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Medical Profile (Blood, Allergies, History) */}
      {activeMedicalMember && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 100
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '32px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  Medical Record: {activeMedicalMember.fullName}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Managed via <code>/family-member-profile/:familyMemberId</code>
                </p>
              </div>
              <button onClick={() => setActiveMedicalMember(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {loadingMedical ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading medical profile...</div>
            ) : (
              <form onSubmit={handleSaveMedical}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Blood Type</label>
                    <select
                      className="form-control"
                      value={medicalFormData.bloodType}
                      onChange={(e) => setMedicalFormData({ ...medicalFormData, bloodType: e.target.value })}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Allergies (comma separated)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Penicillin, Peanuts, Dust"
                      value={medicalFormData.allergies}
                      onChange={(e) => setMedicalFormData({ ...medicalFormData, allergies: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Chronic Conditions</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Asthma, Diabetes Type 1"
                    value={medicalFormData.chronicConditions}
                    onChange={(e) => setMedicalFormData({ ...medicalFormData, chronicConditions: e.target.value })}
                  />
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '10px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)' }}>
                    Emergency Contact Person
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Contact Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Dawit Bekele"
                        value={medicalFormData.emergencyName}
                        onChange={(e) => setMedicalFormData({ ...medicalFormData, emergencyName: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="+251911..."
                        value={medicalFormData.emergencyPhone}
                        onChange={(e) => setMedicalFormData({ ...medicalFormData, emergencyPhone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="button" onClick={() => setActiveMedicalMember(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Close
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                    {submitting ? 'Saving...' : 'Save Medical Record'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Digital Ethiopian Clinic Card (የታካሚ ካርድ) */}
      {activeCardMember && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 110
        }}>
          <div style={{ width: '100%', maxWidth: '520px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
              color: 'white',
              borderRadius: '24px',
              padding: '28px',
              boxShadow: '0 20px 40px -15px rgba(49, 46, 129, 0.6)',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              {/* Close Button */}
              <button
                onClick={() => setActiveCardMember(null)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>

              {/* Card Header */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ fontSize: '0.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#a5b4fc', fontWeight: 800 }}>
                  Federal Democratic Republic of Ethiopia • Clinic Network
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>CareSync Patient Card (የታካሚ ካርድ)</span>
                  <BadgeCheck size={18} style={{ color: '#38bdf8' }} />
                </div>
              </div>

              {/* Card Number & QR Code */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#c7d2fe', fontWeight: 700 }}>
                    Official Card Number (የካርድ ቁጥር)
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '1px', marginTop: '2px', color: '#ffffff' }}>
                    CLN-2026-{String(activeCardMember._id || '00000').slice(-5).padStart(5, '0')}
                  </div>
                </div>

                <div style={{
                  background: 'white',
                  color: '#1e1b4b',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <QrCode size={36} />
                </div>
              </div>

              {/* Patient Attributes Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.86rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Patient Name</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px' }}>{activeCardMember.fullName}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Relationship</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '2px', textTransform: 'capitalize' }}>
                    {activeCardMember.isSelf ? 'Account Holder' : activeCardMember.relationship}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textTransform: 'uppercase' }}>DOB / Gender</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '2px' }}>
                    {activeCardMember.dateOfBirth ? new Date(activeCardMember.dateOfBirth).toLocaleDateString() : 'N/A'} ({activeCardMember.gender})
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Card Fee & Status</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#86efac', marginTop: '2px' }}>
                    ● Paid (100 ETB) & Active
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.12)', paddingTop: '8px', fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>TXN Ref: <strong style={{ fontFamily: 'monospace', color: '#ffffff' }}>TXN-TB-2026-{String(activeCardMember._id).slice(-5)}</strong></span>
                <span>Payment: <strong style={{ color: '#86efac' }}>Telebirr Verified</strong></span>
              </div>

              {/* Card Footer */}
              <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => router.push(`/dashboard?bookMemberId=${activeCardMember._id}`)}
                  style={{
                    background: '#4f46e5',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    color: 'white',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Book a Spot with this Card (ቀጠሮ ያዝ) →</span>
                </button>

                <button
                  onClick={() => window.print()}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    color: 'white',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={15} /> Print Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
