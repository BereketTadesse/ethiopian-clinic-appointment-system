import { z } from 'zod';

// Reusable password validation (ensures consistency across endpoints)
const passwordSchema = z.string({ error: 'All fields are required' })
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// POST /register
export const registerSchema = z.object({
  body: z.object({
    name: z.string({ error: 'All fields are required' }).min(2, 'Name must be at least 2 characters').max(100),
    email: z.string({ error: 'All fields are required' }).email('Invalid email address'),
    password: passwordSchema,
    phoneNumber: z.string({ error: 'All fields are required' }).min(9, 'Phone number is required'),
    gender: z.enum(['male', 'female', 'other'], { 
      error: (issue) => issue.input === undefined ? 'All fields are required' : 'Gender must be male, female, or other'
    }),
    address: z.string({ error: 'All fields are required' }).min(5, 'Address is required'),
    role: z.enum(['patient', 'doctor', 'admin', 'receptionist']).optional(), // default is patient
  }),
});

// POST /login
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'), // Just check if it's provided during login
  }),
});

// POST /forgot-password
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

// POST /reset-password/:token
export const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'Reset token is required'),
  }),
  body: z.object({
    password: passwordSchema, // Using the strong password validator for the new password
  }),
});

// POST /change-password
export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: passwordSchema,
  }).refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password must be different from the old password",
    path: ["newPassword"], // The error will be attached to the newPassword field
  }),
});
