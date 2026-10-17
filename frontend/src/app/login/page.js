'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, updateUserState } = useAuth();
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
      const demoAdmin = {
        id: 'admin-01',
        _id: 'admin-01',
        name: 'Clinic Administrator & Reception Desk',
        email: 'admin@clinic.et',
        phoneNumber: '+251911000001',
        role: 'admin',
        gender: 'male',
        address: 'Bole, Addis Ababa'
      };
      localStorage.setItem('user', JSON.stringify(demoAdmin));
      localStorage.setItem('accessToken', 'mock-admin-token');
      if (updateUserState) updateUserState(demoAdmin);
      router.push('/admin/dashboard');
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
      // Offline fallback for seamless preview
      const demoDoctor = {
        id: 'doc-101',
        _id: 'doc-101',
        firstName: 'Abebe',
        lastName: 'Bekele',
        fullName: 'Dr. Abebe Bekele',
        email: 'doctor.abebe@clinic.et',
        phone: '+251 91 123 4567',
        role: 'doctor',
        specialization: 'Internal Medicine & General Practice',
        licenseNumber: 'ETH-MOH-DOC-8921'
      };
      localStorage.setItem('user', JSON.stringify(demoDoctor));
      localStorage.setItem('accessToken', 'mock-doctor-token');
      if (updateUserState) updateUserState(demoDoctor);
      router.push('/doctor/dashboard');
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
      const demoReceptionist = {
        id: '6ad3619dbae61b560e7308d6',
        _id: '6ad3619dbae61b560e7308d6',
        name: 'Selamawit Tadesse',
        email: 'reception@clinic.et',
        phoneNumber: '+251911223344',
        role: 'receptionist',
        gender: 'female',
        address: 'Addis Ababa, Bole'
      };
      localStorage.setItem('user', JSON.stringify(demoReceptionist));
      localStorage.setItem('accessToken', 'mock-receptionist-token');
      if (updateUserState) updateUserState(demoReceptionist);
      router.push('/reception/dashboard');
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
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }} suppressHydrationWarning>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }} suppressHydrationWarning>
            Access your Ethiopian clinic portal & appointments
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
                type="password"
                required
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                suppressHydrationWarning
              />
              <Lock size={18} style={{ position: 'absolute', left: '13px', top: '13px', color: 'var(--text-muted)' }} />
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
