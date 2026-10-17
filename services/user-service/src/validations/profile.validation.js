import { z } from 'zod';
import mongoose from 'mongoose';

// Helper to validate MongoDB ObjectIDs in URL params
const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ID format',
});

// PUT /update-profile
export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    phoneNumber: z.string().min(9, 'Phone number is too short').max(20).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    address: z.string().min(2, 'Address is too short').optional(),
    birthDate: z.coerce.date().optional(),
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    allergies: z.array(z.string()).optional(),
    emergencyContact: z.object({
      name: z.string().min(2, 'Name is required').optional(),
      phoneNumber: z.string().min(9, 'Phone number is required').optional(),
      relationship: z.string().min(2, 'Relationship is required').optional(),
    }).optional(),
    medicalHistory: z.array(
      z.object({
        date: z.coerce.date(),
        description: z.string().min(2, 'Description is required'),
      })
    ).optional(),
    medications: z.array(
      z.object({
        name: z.string().min(2, 'Medication name is required'),
        dosage: z.string().min(1, 'Dosage is required'),
      })
    ).optional(),
  }).passthrough(),
});

// POST /patient-profile
export const patientProfileSchema = z.object({
  body: z.object({
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    allergies: z.array(z.string()).optional(),
    emergencyContact: z.object({
      name: z.string().min(2, 'Name is required').optional(),
      phoneNumber: z.string().min(9, 'Phone number is required').optional(),
      relationship: z.string().min(2, 'Relationship is required').optional(),
    }).optional(),
    medicalHistory: z.array(
      z.object({
        date: z.coerce.date(),
        description: z.string().min(2, 'Description is required'),
      })
    ).optional(),
    medications: z.array(
      z.object({
        name: z.string().min(2, 'Medication name is required'),
        dosage: z.string().min(1, 'Dosage is required'),
      })
    ).optional(),
  }),
});

// GET /profile/:id
export const getProfileByIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

// POST /request-email-update
export const emailUpdateSchema = z.object({
  body: z.object({
    newEmail: z.string().email('Invalid email format'),
  }),
});

// PATCH /admin/update-user-status/:id
export const adminUpdateStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    status: z.enum(['active', 'suspended', 'banned']), 
    // Assuming you update a status field, though your model has isActive: Boolean. 
    // If it's boolean, you can change this to z.boolean()
    isActive: z.boolean().optional(),
  }),
});

// GET /getUsers (Admin filtering/pagination)
export const getUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    role: z.enum(['patient', 'doctor', 'admin', 'receptionist']).optional(),
    search: z.string().optional(),
  }),
});

// POST /admin/receptionist
export const createReceptionistSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    phoneNumber: z.string().min(9, 'Phone number must be at least 9 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    gender: z.enum(['male', 'female', 'other']).optional(),
    address: z.string().optional(),
  }),
});

