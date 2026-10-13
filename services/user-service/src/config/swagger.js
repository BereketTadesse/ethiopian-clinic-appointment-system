export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Ethiopian Clinic Appointment System - User Service API',
    version: '1.0.0',
    description: 'Microservice for User Identity, Authentication, Role-Based Access Control (RBAC), Patient Profiles, and Family Dependents management.'
  },
  servers: [
    {
      url: '/',
      description: 'Current Host (Render Cloud / Production)'
    },
    {
      url: 'http://localhost:3001',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from /api/users/login'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6abd0a4b4ad8c9e8e174197f' },
          name: { type: 'string', example: 'Almaz Kebede' },
          email: { type: 'string', example: 'patient.almaz@gmail.com' },
          phoneNumber: { type: 'string', example: '+251911000003' },
          gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'female' },
          role: { type: 'string', enum: ['patient', 'doctor', 'admin'], example: 'patient' },
          address: { type: 'string', example: 'Yeka, Addis Ababa' },
          profilePicture: { type: 'string', example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' },
          isVerified: { type: 'boolean', example: true },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password', 'phoneNumber', 'gender', 'address'],
        properties: {
          name: { type: 'string', example: 'Dawit Bekele' },
          email: { type: 'string', example: 'dawit.bekele@gmail.com' },
          password: { type: 'string', format: 'password', example: 'Dawit@123456' },
          phoneNumber: { type: 'string', example: '+251912345678' },
          gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
          address: { type: 'string', example: 'Bole, Addis Ababa' },
          role: { type: 'string', enum: ['patient', 'doctor', 'admin'], default: 'patient' }
        }
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@clinic.et' },
          password: { type: 'string', format: 'password', example: 'Admin@123456' }
        }
      },
      FamilyMemberInput: {
        type: 'object',
        required: ['fullName', 'dateOfBirth', 'gender', 'relationship'],
        properties: {
          fullName: { type: 'string', example: 'Kalkidan Bekele' },
          dateOfBirth: { type: 'string', format: 'date', example: '2018-05-12' },
          gender: { type: 'string', enum: ['male', 'female'], example: 'female' },
          relationship: {
            type: 'string',
            enum: ['self', 'wife', 'husband', 'son', 'daughter', 'mother', 'father', 'sister', 'brother', 'grandfather', 'grandmother', 'other'],
            example: 'daughter'
          },
          phoneNumber: { type: 'string', example: '+251911223344' },
          nationalId: { type: 'string', example: 'ET-FAYDA-98765432' }
        }
      },
      UpdateProfileInput: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Almaz Kebede' },
          phoneNumber: { type: 'string', example: '+251911000003' },
          address: { type: 'string', example: 'Bole, Addis Ababa' },
          bloodType: { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], example: 'O+' },
          allergies: { type: 'array', items: { type: 'string' }, example: ['Penicillin', 'Dust'] },
          emergencyContact: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Kebede Tadesse' },
              phoneNumber: { type: 'string', example: '+251911998877' },
              relationship: { type: 'string', example: 'father' }
            }
          }
        }
      },
      CreatePatientProfileInput: {
        type: 'object',
        properties: {
          bloodType: { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], example: 'O+' },
          allergies: { type: 'array', items: { type: 'string' }, example: ['Penicillin', 'Dust'] },
          emergencyContact: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Kebede Tadesse' },
              phoneNumber: { type: 'string', example: '+251911998877' },
              relationship: { type: 'string', example: 'father' }
            }
          },
          medicalHistory: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', format: 'date-time' },
                description: { type: 'string', example: 'Appendectomy' }
              }
            }
          },
          medications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Ibuprofen' },
                dosage: { type: 'string', example: '400mg as needed' }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health Check Probe',
        description: 'Verify service status and health',
        responses: {
          200: { description: 'Service is healthy' }
        }
      }
    },
    '/api/users/register': {
      post: {
        tags: ['Authentication & Account'],
        summary: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterInput' }
            }
          }
        },
        responses: {
          201: { description: 'User registered successfully. Verification email sent.' },
          400: { description: 'Validation error or email already registered' }
        }
      }
    },
    '/api/users/login': {
      post: {
        tags: ['Authentication & Account'],
        summary: 'Log in with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' }
            }
          }
        },
        responses: {
          200: { description: 'Login successful. Returns JWT token and sets auth cookie.' },
          401: { description: 'Invalid email or password' }
        }
      }
    },
    '/api/users/logout': {
      post: {
        tags: ['Authentication & Account'],
        summary: 'Log out and invalidate JWT session',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Logged out successfully' }
        }
      }
    },
    '/api/users/refresh-token': {
      post: {
        tags: ['Authentication & Account'],
        summary: 'Refresh an expired Access Token',
        description: 'Client should call this endpoint when their Access Token expires. It reads the Refresh Token from the HTTP-only cookie and returns a new Access Token.',
        responses: {
          200: { description: 'Successfully issued a new Access Token' },
          401: { description: 'Refresh token not found' },
          403: { description: 'Invalid or expired refresh token' }
        }
      }
    },
    '/api/users/test-tokens': {
      get: {
        tags: ['Authentication & Account'],
        summary: 'Test and decode JWT tokens (Dev Mode)',
        security: [{ BearerAuth: [] }],
        description: 'Decodes the Access Token from the Bearer header and the Refresh Token from the HTTP-only cookie to inspect their payloads.',
        responses: {
          200: { description: 'Successfully decoded tokens' }
        }
      }
    },
    '/api/users/check-refresh-token': {
      post: {
        tags: ['Authentication & Account'],
        summary: 'Check the revocation status of a Refresh Token',
        description: 'Validates if the refresh token has expired, been blacklisted in Redis, or removed from MongoDB. Can accept token via cookies or JSON body.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Returns the status (active or revoked) and a reason.' },
          400: { description: 'No refresh token provided' }
        }
      },
      get: {
        tags: ['Authentication & Account'],
        summary: 'Check the revocation status of a Refresh Token (via cookies)',
        description: 'Validates if the refresh token has expired, been blacklisted in Redis, or removed from MongoDB using cookies.',
        responses: {
          200: { description: 'Returns the status (active or revoked) and a reason.' },
          400: { description: 'No refresh token provided' }
        }
      }
    },
    '/api/users/verify/{token}': {
      get: {
        tags: ['Authentication & Account'],
        summary: 'Verify email address via token',
        parameters: [
          { in: 'path', name: 'token', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Email verified successfully' },
          400: { description: 'Invalid or expired token' }
        }
      }
    },
    '/api/users/forgot-password': {
      post: {
        tags: ['Password Management'],
        summary: 'Send password reset link to email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', example: 'patient.almaz@gmail.com' } }
              }
            }
          }
        },
        responses: {
          200: { description: 'Reset email sent' }
        }
      }
    },
    '/api/users/reset-password/{token}': {
      post: {
        tags: ['Password Management'],
        summary: 'Reset password with reset token',
        parameters: [
          { in: 'path', name: 'token', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newPassword'],
                properties: { newPassword: { type: 'string', example: 'NewPass@123456' } }
              }
            }
          }
        },
        responses: {
          200: { description: 'Password reset successfully' }
        }
      }
    },
    '/api/users/change-password': {
      post: {
        tags: ['Password Management'],
        summary: 'Change password while authenticated',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['oldPassword', 'newPassword'],
                properties: {
                  oldPassword: { type: 'string', example: 'Patient@123456' },
                  newPassword: { type: 'string', example: 'Patient@654321' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Password changed successfully' }
        }
      }
    },
    '/api/users/profile/{id}': {
      get: {
        tags: ['Profile & Medical Details'],
        summary: 'Get user profile and clinical baseline by User ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Profile retrieved' }
        }
      }
    },
    '/api/users/update-profile': {
      put: {
        tags: ['Profile & Medical Details'],
        summary: 'Update personal info and medical baseline',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProfileInput' }
            }
          }
        },
        responses: {
          200: { description: 'Profile updated successfully' }
        }
      }
    },
    '/api/users/patient-profile': {
      post: {
        tags: ['Profile & Medical Details'],
        summary: 'Create a new patient profile',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePatientProfileInput' }
            }
          }
        },
        responses: {
          201: { description: 'Patient profile created successfully' },
          400: { description: 'Patient profile already exists' },
          403: { description: 'Only patients can create a patient profile' }
        }
      }
    },
    '/api/users/upload-profile': {
      post: {
        tags: ['Profile & Medical Details'],
        summary: 'Upload profile picture to Cloudinary',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  profilePicture: { type: 'string', format: 'binary' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Picture uploaded successfully' }
        }
      }
    },
    '/api/users/delete-me': {
      delete: {
        tags: ['Profile & Medical Details'],
        summary: 'Soft-delete own account',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Account deactivated' }
        }
      }
    },
    '/api/users/request-email-update': {
      post: {
        tags: ['Email Management'],
        summary: 'Request email address update',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newEmail'],
                properties: { newEmail: { type: 'string', example: 'new.email@gmail.com' } }
              }
            }
          }
        },
        responses: {
          200: { description: 'Verification email dispatched to new address' }
        }
      }
    },
    '/api/users/confirm-email-update/{token}': {
      get: {
        tags: ['Email Management'],
        summary: 'Confirm and finalize email update token',
        parameters: [
          { in: 'path', name: 'token', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Email address updated successfully' }
        }
      }
    },
    '/api/users/public-doctor-account/{id}': {
      get: {
        tags: ['Public Doctor Information'],
        summary: 'Public endpoint to view doctor profile info',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Doctor profile retrieved' }
        }
      }
    },
    '/api/users/createFamilyMember': {
      post: {
        tags: ['Family Members (Dependents)'],
        summary: 'Add a new family dependent (child, spouse, parent)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FamilyMemberInput' }
            }
          }
        },
        responses: {
          201: { description: 'Family member created successfully' }
        }
      }
    },
    '/api/users/getAllFamilyMembers': {
      get: {
        tags: ['Family Members (Dependents)'],
        summary: 'List all family members belonging to the current user',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Family members list' }
        }
      }
    },
    '/api/users/getOneFamilyMember/{id}': {
      get: {
        tags: ['Family Members (Dependents)'],
        summary: 'Get details of a specific family member',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Family member retrieved' }
        }
      }
    },
    '/api/users/updateFamilyMember/{id}': {
      patch: {
        tags: ['Family Members (Dependents)'],
        summary: 'Update family dependent profile',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FamilyMemberInput' }
            }
          }
        },
        responses: {
          200: { description: 'Family member updated' }
        }
      }
    },
    '/api/users/deleteFamilyMember/{id}': {
      delete: {
        tags: ['Family Members (Dependents)'],
        summary: 'Soft-delete a family member',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Family member deactivated' }
        }
      }
    },
    '/api/users/getUsers': {
      get: {
        tags: ['Admin Operations'],
        summary: 'Admin: Get list of all registered users',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
          { in: 'query', name: 'role', schema: { type: 'string', enum: ['patient', 'doctor', 'admin'] } }
        ],
        responses: {
          200: { description: 'Users list retrieved' },
          403: { description: 'Admin access required' }
        }
      }
    },
    '/api/users/admin/update-user-status/{id}': {
      patch: {
        tags: ['Admin Operations'],
        summary: 'Admin: Suspend, activate, or verify user account',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isActive: { type: 'boolean' },
                  isVerified: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'User status updated' }
        }
      }
    },
    '/api/users/family-member-profile/{familyMemberId}': {
      post: {
        tags: ['Family Members (Dependents)'],
        summary: 'Create a medical profile for a family member',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'familyMemberId', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FamilyMemberProfileInput' }
            }
          }
        },
        responses: {
          201: { description: 'Medical profile created successfully' },
          400: { description: 'Profile already exists' },
          404: { description: 'Family member not found' }
        }
      },
      get: {
        tags: ['Family Members (Dependents)'],
        summary: 'Get medical profile for a family member',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'familyMemberId', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Medical profile retrieved successfully' },
          404: { description: 'Family member or profile not found' }
        }
      },
      patch: {
        tags: ['Family Members (Dependents)'],
        summary: 'Update a medical profile for a family member',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'familyMemberId', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FamilyMemberProfileInput' }
            }
          }
        },
        responses: {
          200: { description: 'Medical profile updated successfully' },
          404: { description: 'Family member or profile not found' }
        }
      }
    }
  }
};
