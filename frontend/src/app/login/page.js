'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, updateUserState } = useAuth();
  const { clinicName, clinicLogo } = useClinic();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVerified = searchParams?.get('verified') === 'true';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await login(email, password);
      if (res?.user?.role === 'doctor') {
        router.push('/doctor/dashboard');
      } else if (res?.user?.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (res?.user?.role === 'receptionist') {
        router.push('/reception/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please verify credentials.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };


  const handleDemoAdminLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      setEmail('admin@clinic.et');
      setPassword('Admin@123456');
      const res = await login('admin@clinic.et', 'Admin@123456');
      router.push('/admin/dashboard');
    } catch (e) {
      // No offline fallback: never fake a session with a mock token.
      setError(e.response?.data?.message || 'Demo login failed. Make sure the backend is running and the demo accounts are seeded.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoDoctorLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      setEmail('doctor.abebe@clinic.et');
      setPassword('Doctor@123456');
      const res = await login('doctor.abebe@clinic.et', 'Doctor@123456');
      if (res?.user?.role === 'doctor') {
        router.push('/doctor/dashboard');
      } else {
        router.push('/doctor/dashboard');
      }
    } catch (e) {
      // No offline fallback: never fake a session with a mock token.
      setError(e.response?.data?.message || 'Demo login failed. Make sure the backend is running and the demo accounts are seeded.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoReceptionistLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      setEmail('reception@clinic.et');
      setPassword('Reception@123');
      const res = await login('reception@clinic.et', 'Reception@123');
      router.push('/reception/dashboard');
    } catch (e) {
      // No offline fallback: never fake a session with a mock token.
      setError(e.response?.data?.message || 'Demo login failed. Make sure the backend is running and the demo accounts are seeded.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }} suppressHydrationWarning>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '36px', textAlign: 'center' }} suppressHydrationWarning>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }} suppressHydrationWarning>
            Welcome Back
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }} suppressHydrationWarning>
            Access your Ethiopian clinic portal & appointments
          </p>
          <div style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }} suppressHydrationWarning>
            Loading portal...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }} suppressHydrationWarning>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '36px' }} suppressHydrationWarning>
        <div style={{ textAlign: 'center', marginBottom: '28px' }} suppressHydrationWarning>
          {clinicLogo && (
            <div
              style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 12px',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
              }}
              suppressHydrationWarning
            >
              <img
                src={clinicLogo}
                alt={clinicName}
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }}
              />
            </div>
          )}
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }} suppressHydrationWarning>
            {clinicName}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }} suppressHydrationWarning>
            Sign in to access your clinic portal & medical appointments
          </p>
        </div>

        {/* Account Verification Success Banner */}
        {isVerified && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            padding: '12px 14px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }} suppressHydrationWarning>
            <CheckCircle2 size={18} />
            <span>Email verified successfully! You can now log into your account.</span>
          </div>
        )}

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 14px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }} suppressHydrationWarning>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} suppressHydrationWarning>
          <div className="form-group" suppressHydrationWarning>
            <label className="form-label" suppressHydrationWarning>Email Address</label>
            <div style={{ position: 'relative' }} suppressHydrationWarning>
              <input
                type="email"
                required
                className="form-control"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '40px' }}
                suppressHydrationWarning
              />
              <Mail size={18} style={{ position: 'absolute', left: '13px', top: '13px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group" suppressHydrationWarning>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} suppressHydrationWarning>
              <label className="form-label" suppressHydrationWarning>Password</label>
              <Link href="/forgot-password" style={{ fontSize: '0.8rem', color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>
            <div style={{ position: 'relative' }} suppressHydrationWarning>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                suppressHydrationWarning
              />
              <Lock size={18} style={{ position: 'absolute', left: '13px', top: '13px', color: 'var(--text-muted)' }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px', height: '46px', opacity: submitting ? 0.7 : 1 }}
            suppressHydrationWarning
          >
            {submitting ? 'Authenticating...' : <><span>Sign In</span> <ArrowRight size={17} /></>}
          </button>

          {/* Quick Demo Login Buttons for Admin & Doctor */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0', textAlign: 'center' }} suppressHydrationWarning>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>
              One-Click Role Demos
            </div>

            {/* Admin Demo Button */}
            <button
              type="button"
              onClick={handleDemoAdminLogin}
              disabled={submitting}
              suppressHydrationWarning
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '8px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                color: '#92400e',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '8px'
              }}
            >
              <span>👑 Demo: Log in as Clinic Admin (አስተዳዳሪ)</span>
            </button>

            {/* Doctor Demo Button */}
            <button
              type="button"
              onClick={handleDemoDoctorLogin}
              disabled={submitting}
              suppressHydrationWarning
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '8px'
              }}
            >
              <span>🩺 Demo: Log in as Doctor (ዶ/ር አበበ)</span>
            </button>

            {/* Receptionist Demo Button */}
            <button
              type="button"
              onClick={handleDemoReceptionistLogin}
              disabled={submitting}
              suppressHydrationWarning
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '8px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>📋 Demo: Log in as Receptionist (ሰላማዊት ታደሰ)</span>
            </button>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }} suppressHydrationWarning>
              Admin: <code>admin@clinic.et</code> • Receptionist: <code>reception@clinic.et</code>
            </div>
          </div>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '20px' }} suppressHydrationWarning>
          Don't have an account yet?{' '}
          <Link href="/register" style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
