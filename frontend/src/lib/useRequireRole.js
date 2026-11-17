'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const HOME_BY_ROLE = {
  admin: '/admin/dashboard',
  receptionist: '/reception/dashboard',
  doctor: '/doctor/dashboard',
  patient: '/dashboard'
};

/**
 * Page guard for role-specific pages.
 *  - not logged in        -> /login
 *  - logged in, wrong role -> that role's own home page
 * Returns `allowed`: render the page only when true (avoids flashing content).
 * The backend enforces the same rules; this only keeps the UI honest.
 */
export const useRequireRole = (roles) => {
  const { user, mounted } = useAuth();
  const router = useRouter();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const allowed = Boolean(mounted && user && allowedRoles.includes(user.role));

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.replace('/login');
    } else if (!allowedRoles.includes(user.role)) {
      router.replace(HOME_BY_ROLE[user.role] || '/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, user, router, allowedRoles.join(',')]);

  return { allowed, user, mounted };
};
