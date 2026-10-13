import { z } from 'zod';
import mongoose from 'mongoose';

// Reusable ObjectId validation for URL parameters
const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ID format',
});

// Relationships enum matching family_members.model.js
const relationshipEnum = z.enum([
  'self',
  'wife',
  'husband',
  'son',
  'daughter',
  'mother',
  'father',
  'sister',
  'brother',
  'grandfather',
  'grandmother',
  'other',
]);

// ── Family Member Base Validators ────────────────────────────

// POST /createFamilyMember
export const createFamilyMemberSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
    dateOfBirth: z.coerce.date().refine((date) => date < new Date(), {
      message: 'Date of birth must be in the past',
    }),
    gender: z.enum(['male', 'female'], {
      errorMap: () => ({ message: "Gender must be either 'male' or 'female'" }),
    }),
    relationship: relationshipEnum,
    phoneNumber: z.string().trim().min(9).max(20).optional().nullable(),
    nationalId: z.string().trim().min(4).max(50).optional().nullable(),
  }),
});

// PATCH /updateFamilyMember/:id
export const updateFamilyMemberSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional(),
    dateOfBirth: z.coerce.date().refine((date) => date < new Date(), {
      message: 'Date of birth must be in the past',
    }).optional(),
    gender: z.enum(['male', 'female']).optional(),
    relationship: relationshipEnum.optional(),
    phoneNumber: z.string().trim().min(9).max(20).optional().nullable(),
    nationalId: z.string().trim().min(4).max(50).optional().nullable(),
  }),
});

// GET /getOneFamilyMember/:id, DELETE /deleteFamilyMember/:id
export const familyMemberIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

// ── Family Member Profile (Medical Info) Validators ──────────

// Param validation for /family-member-profile/:familyMemberId
export const familyMemberProfileParamSchema = z.object({
  params: z.object({
    familyMemberId: objectIdSchema,
  }),
});

// POST /family-member-profile/:familyMemberId
export const createFamilyMemberProfileSchema = z.object({
  params: z.object({
    familyMemberId: objectIdSchema,
  }),
  body: z.object({
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    allergies: z.array(z.string().trim()).optional(),
    emergencyContact: z.object({
      name: z.string().trim().min(2, 'Emergency contact name is required').optional(),
      phoneNumber: z.string().trim().min(9, 'Emergency contact phone number is required').optional(),
      relationship: z.string().trim().min(2, 'Emergency contact relationship is required').optional(),
    }).optional(),
    medicalHistory: z.array(
      z.object({
        date: z.coerce.date(),
        description: z.string().trim().min(2, 'Description is required'),
      })
    ).optional(),
    medications: z.array(
      z.object({
        name: z.string().trim().min(2, 'Medication name is required'),
        dosage: z.string().trim().min(1, 'Dosage is required'),
      })
    ).optional(),
    chronicConditions: z.array(z.string().trim()).optional(),
  }),
});

// PATCH /family-member-profile/:familyMemberId
export const updateFamilyMemberProfileSchema = z.object({
  params: z.object({
    familyMemberId: objectIdSchema,
  }),
  body: z.object({
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    allergies: z.array(z.string().trim()).optional(),
    emergencyContact: z.object({
      name: z.string().trim().min(2).optional(),
      phoneNumber: z.string().trim().min(9).optional(),
      relationship: z.string().trim().min(2).optional(),
    }).optional(),
    medicalHistory: z.array(
      z.object({
        date: z.coerce.date(),
        description: z.string().trim().min(2),
      })
    ).optional(),
    medications: z.array(
      z.object({
        name: z.string().trim().min(2),
        dosage: z.string().trim().min(1),
      })
    ).optional(),
    chronicConditions: z.array(z.string().trim()).optional(),
  }),
});
