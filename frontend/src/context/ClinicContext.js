'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clinicApi } from '../lib/api';

const ClinicContext = createContext(null);

const DEFAULT_CLINIC = {
  name: 'Selam General Clinic',
  description: 'Premier outpatient clinic providing compassionate, high quality medical care.',
  phoneNumber: '+251911000000',
  email: 'contact@selamclinic.et',
  website: 'https://selamclinic.et',
  logo: '',
  coverImage: '',
  location: {
    city: 'Addis Ababa',
    subCity: 'Bole',
    woreda: '03',
    fullAddress: 'Near Edna Mall, Airport Road'
  },
  workingHours: {
    openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    openTime: '08:00',
    closeTime: '17:00'
  },
  services: ['General Checkup', 'Dental', 'Laboratory', 'Pediatrics']
};

export const ClinicProvider = ({ children }) => {
  const [clinic, setClinic] = useState(DEFAULT_CLINIC);
  const [loadingClinic, setLoadingClinic] = useState(true);

  const fetchClinicProfile = useCallback(async () => {
    try {
      const res = await clinicApi.get('/');
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        const normalized = {
          _id: d._id || '',
          name: d.name || DEFAULT_CLINIC.name,
          description: d.description || DEFAULT_CLINIC.description,
          phoneNumber: d.phoneNumber || DEFAULT_CLINIC.phoneNumber,
          email: d.email || DEFAULT_CLINIC.email,
          website: d.website || DEFAULT_CLINIC.website,
          logo: d.media?.logo || '',
          coverImage: d.media?.coverImage || '',
          location: d.location || DEFAULT_CLINIC.location,
          workingHours: d.workingHours || DEFAULT_CLINIC.workingHours,
          services: Array.isArray(d.services) && d.services.length > 0 ? d.services : DEFAULT_CLINIC.services
        };
        setClinic(normalized);
      }
    } catch (err) {
      console.warn('Could not load global clinic profile, using defaults:', err.message);
    } finally {
      setLoadingClinic(false);
    }
  }, []);

  useEffect(() => {
    fetchClinicProfile();
  }, [fetchClinicProfile]);

  return (
    <ClinicContext.Provider
      value={{
        clinic,
        clinicName: clinic?.name || DEFAULT_CLINIC.name,
        clinicLogo: clinic?.logo || '',
        clinicCover: clinic?.coverImage || '',
        loadingClinic,
        refreshClinic: fetchClinicProfile
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    return {
      clinic: DEFAULT_CLINIC,
      clinicName: DEFAULT_CLINIC.name,
      clinicLogo: '',
      clinicCover: '',
      loadingClinic: false,
      refreshClinic: async () => {}
    };
  }
  return context;
};
