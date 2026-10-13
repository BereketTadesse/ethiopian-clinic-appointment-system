'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
  FileText
} from 'lucide-react';

export default function DoctorProfilePage() {
  const { user, mounted } = useAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Doctor Profile Data State
  const [doctorProfile, setDoctorProfile] = useState({
    name: user?.name || 'Dr. Selamawit Bekele',
    title: 'Consultant Physician',
    specialty: 'General Internal Medicine',
    licenseNumber: 'FDRE-MOH-2018-04921',
    clinicName: 'CareSync Central Clinic - Bole Branch',
    clinicAddress: 'Bole Medhanealem, Addis Ababa, Ethiopia',
    roomNumber: 'Consultation Suite 204',
    email: user?.email || 'dr.selamawit@clinic.et',
    phone: user?.phoneNumber || '+251 911 883 344',
    education: 'MD, Addis Ababa University School of Medicine (Class of 2016)',
    experience: '8+ Years Clinical Practice across Public & Specialized Healthcare',
    bio: 'Dedicated medical practitioner focused on acute internal medicine, family diagnostic evaluations, and preventative patient care under the Ethiopian Ministry of Health standards.',
    workingDays: 'Monday - Friday (08:30 AM - 05:00 PM)',
    consultationSlots: ['08:45 AM', '09:30 AM', '11:00 AM', '02:00 PM', '03:15 PM']
  });

  const [editFormData, setEditFormData] = useState({ ...doctorProfile });

  useEffect(() => {
    if (user?.name) {
      setDoctorProfile(prev => ({
        ...prev,
        name: user.name,
        email: user.email || prev.email,
        phone: user.phoneNumber || prev.phone
      }));
      setEditFormData(prev => ({
        ...prev,
        name: user.name,
        email: user.email || prev.email,
        phone: user.phoneNumber || prev.phone
      }));
    }
  }, [user]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setDoctorProfile({ ...editFormData });
    setIsEditing(false);
    setSuccessMessage('🎉 Doctor profile details successfully updated!');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', minHeight: '92vh', padding: '36px 0 60px' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        
        {/* Top Back Link */}
        <div style={{ marginBottom: '20px' }}>
          <Link href="/doctor/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4f46e5', fontWeight: 700, textDecoration: 'none', fontSize: '0.88rem' }}>
            <ArrowLeft size={16} /> Return to Doctor Dashboard (የሐኪም ፖርታል)
          </Link>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            padding: '12px 18px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700
          }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Profile Header Hero Card */}
        <div className="glass-panel" style={{
          padding: '32px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '20px',
          marginBottom: '24px',
          position: 'relative',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '18px' }}>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              {/* Doctor Avatar Badge */}
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '38px',
                boxShadow: '0 10px 24px rgba(79, 70, 229, 0.25)'
              }}>
                👨‍⚕️
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    {doctorProfile.name}
                  </h1>
                  <BadgeCheck size={22} style={{ color: '#0ea5e9' }} />
                </div>

                <div style={{ fontSize: '0.95rem', color: '#4f46e5', fontWeight: 700 }}>
                  {doctorProfile.title} • {doctorProfile.specialty}
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  MOH License: <strong style={{ fontFamily: 'monospace', color: '#334155' }}>{doctorProfile.licenseNumber}</strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <Edit2 size={15} /> {isEditing ? 'Cancel Edit' : 'Edit Physician Profile'}
            </button>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing ? (
          <div className="glass-panel" style={{ padding: '28px', background: 'white', borderRadius: '18px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '18px', color: 'var(--text-main)' }}>
              Edit Physician Professional Profile
            </h3>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Professional Specialty</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={editFormData.specialty}
                    onChange={(e) => setEditFormData({ ...editFormData, specialty: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Consultation Suite / Room</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={editFormData.roomNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, roomNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Clinical Practice Bio & Philosophy</label>
                <textarea
                  rows={3}
                  className="form-control"
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Professional Credentials & Clinic Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '24px' }}>
          
          {/* Card 1: Hospital & Clinic Facility */}
          <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} style={{ color: '#4f46e5' }} /> Affiliated Clinic Facility
            </h3>
            
            <div style={{ fontSize: '0.86rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Clinic Branch</span>
                <strong>{doctorProfile.clinicName}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Location</span>
                <span>{doctorProfile.clinicAddress}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Consultation Room</span>
                <span style={{ color: '#4f46e5', fontWeight: 700 }}>{doctorProfile.roomNumber}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Academic & Registration */}
          <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={18} style={{ color: '#0ea5e9' }} /> Medical Qualifications
            </h3>
            
            <div style={{ fontSize: '0.86rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Medical Degree</span>
                <strong>{doctorProfile.education}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Clinical Experience</span>
                <span>{doctorProfile.experience}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>License Status</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>● Active & Certified in Ethiopia</span>
              </div>
            </div>
          </div>

        </div>

        {/* Doctor Bio Card */}
        <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
            Clinical Bio & Practice Philosophy
          </h3>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            {doctorProfile.bio}
          </p>
        </div>

        {/* Consultation Schedule Slots Card */}
        <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: '#4f46e5' }} /> Active Consultation Time Slots
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
              Live in Booking Directory
            </span>
          </div>

          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Working Schedule: <strong>{doctorProfile.workingDays}</strong>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {doctorProfile.consultationSlots.map(slot => (
              <span
                key={slot}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#1e1b4b',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Clock size={13} style={{ color: '#4f46e5' }} /> {slot}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
