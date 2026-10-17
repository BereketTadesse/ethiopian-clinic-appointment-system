'use client';

import Link from 'next/link';
import { Calendar, Shield, Users, ArrowRight } from 'lucide-react';
import { useClinic } from '@/context/ClinicContext';

export default function HomePage() {
  const { clinicName, clinicLogo, clinic } = useClinic();

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        padding: '80px 20px',
        background: 'linear-gradient(180deg, rgba(238, 242, 255, 0.7) 0%, rgba(248, 250, 252, 1) 100%)',
        textAlign: 'center'
      }}>
        <div className="container" style={{ maxWidth: '850px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 18px',
            borderRadius: '9999px',
            background: '#ffffff',
            boxShadow: '0 4px 15px rgba(79, 70, 229, 0.08)',
            border: '1px solid #e0e7ff',
            color: '#4f46e5',
            fontWeight: 800,
            fontSize: '0.9rem',
            marginBottom: '24px'
          }}>
            {clinicLogo ? (
              <img
                src={clinicLogo}
                alt={clinicName}
                style={{ width: '22px', height: '22px', borderRadius: '6px', objectFit: 'contain' }}
              />
            ) : (
              <Shield size={16} />
            )}
            <span>{clinicName} • Official Patient Appointment Portal</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
            fontWeight: 800,
            letterSpacing: '-1.5px',
            lineHeight: 1.15,
            marginBottom: '20px',
            color: 'var(--text-main)'
          }}>
            Quality Healthcare & Appointments at {clinicName}
          </h1>

          <p style={{
            fontSize: '1.15rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: '36px',
            maxWidth: '680px',
            margin: '0 auto 36px'
          }}>
            {clinic?.description || 'Book trusted doctors, securely manage medical records, and schedule care for your children and parents with zero waiting lines.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-primary btn-lg">
              <span>Get Started Free</span> <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg">
              Sign In to Patient Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="container" style={{ padding: '60px 20px 100px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#eef2ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <Calendar size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px' }}>Instant Appointments</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5 }}>
              Choose certified general practitioners and specialists across Addis Ababa and regional clinics with immediate slot booking.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <Users size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px' }}>Family Health Profiles</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5 }}>
              Manage appointments for your children, spouse, or parents directly from a single centralized account.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <Shield size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px' }}>Cloudinary Digital Records</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5 }}>
              Upload and store avatars and verified clinical documentation securely with zero loss and rapid retrieval.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
