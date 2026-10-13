'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import API from '@/lib/api';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Calls POST /api/users/forgot-password
      const { data } = await API.post('/users/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      const resp = err.response?.data;
      setError(resp?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '36px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              textDecoration: 'none',
              fontWeight: 600,
              marginBottom: '16px'
            }}
          >
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Reset Password
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
            Enter your registered email address and we'll send you a secure link to create a new password.
          </p>
        </div>

        {success ? (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#d1fae5',
              color: '#059669',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <CheckCircle2 size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#065f46', marginBottom: '8px' }}>
              Check Your Inbox
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#047857', lineHeight: 1.5, marginBottom: '20px' }}>
              We've sent a password reset link to <strong>{email}</strong>. The link expires in 10 minutes.
            </p>
            <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
              Return to Sign In
            </Link>
          </div>
        ) : (
          <>
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
              }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    className="form-control"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                  />
                  <Mail size={18} style={{ position: 'absolute', left: '13px', top: '13px', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px', height: '46px', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Sending link...' : <><span>Send Reset Instructions</span> <ArrowRight size={17} /></>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
