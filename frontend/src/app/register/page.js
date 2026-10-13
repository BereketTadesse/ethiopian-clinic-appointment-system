'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '+251',
    gender: 'male',
    address: 'Addis Ababa',
    role: 'patient',
  });
  const [error, setError] = useState('');
  const [errorsList, setErrorsList] = useState([]);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorsList([]);
    setSubmitting(true);

    try {
      await register(formData);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2200);
    } catch (err) {
      const resp = err.response?.data;
      setError(resp?.message || 'Registration failed');
      if (resp?.errors) {
        setErrorsList(resp.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }} suppressHydrationWarning>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '36px', textAlign: 'center' }} suppressHydrationWarning>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }} suppressHydrationWarning>
            Create Your Account
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }} suppressHydrationWarning>
            Join CareSync Ethiopia for personal & family appointments
          </p>
          <div style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }} suppressHydrationWarning>
            Loading registration portal...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }} suppressHydrationWarning>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '36px' }} suppressHydrationWarning>
        <div style={{ textAlign: 'center', marginBottom: '24px' }} suppressHydrationWarning>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }} suppressHydrationWarning>
            Create Your Account
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }} suppressHydrationWarning>
            Join CareSync Ethiopia for personal & family appointments
          </p>
        </div>

        {success && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            padding: '14px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle size={20} />
            <span>Account created! Redirecting to login...</span>
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
            fontSize: '0.88rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
            {errorsList.length > 0 && (
              <ul style={{ marginTop: '8px', paddingLeft: '22px', fontSize: '0.82rem' }}>
                {errorsList.map((err, idx) => (
                  <li key={idx}>{err.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              required
              className="form-control"
              placeholder="e.g. Abebe Bikila"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              required
              className="form-control"
              placeholder="abebe@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                name="phoneNumber"
                required
                className="form-control"
                placeholder="+251911223344"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" className="form-control" value={formData.gender} onChange={handleChange}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address / City</label>
            <input
              type="text"
              name="address"
              required
              className="form-control"
              placeholder="Addis Ababa, Bole Sub-city"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              required
              className="form-control"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', height: '46px', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Creating account...' : <><span>Complete Registration</span> <ArrowRight size={17} /></>}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '20px' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
