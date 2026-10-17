export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Ethiopian Clinic Appointment System - Clinic & Doctor Slot Service API',
    version: '1.0.0',
    description: 'Microservice responsible for Clinic Profile & Working Hours, Doctor Schedule Availability, Real-Time Operating Status in Ethiopia, and 40-Minute Slot Generation & Inventory Booking.'
  },
  servers: [
    {
      url: '/',
      description: 'Current Host (Render Cloud / Production)'
    },
    {
      url: 'http://localhost:3002',
      description: 'Local Development Server (Port 3002)'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide a valid Bearer JWT token obtained from User Service (/api/users/login)'
      }
    },
    schemas: {
      Clinic: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6751a1b2c3d4e5f678901234' },
          name: { type: 'string', example: 'Selam General Clinic' },
          description: { type: 'string', example: 'Providing comprehensive healthcare services in Addis Ababa' },
          phoneNumber: { type: 'string', example: '+251911000000' },
          email: { type: 'string', example: 'info@selamclinic.et' },
          website: { type: 'string', example: 'https://selamclinic.et' },
          location: {
            type: 'object',
            properties: {
              city: { type: 'string', example: 'Addis Ababa' },
              subCity: { type: 'string', example: 'Bole' },
              woreda: { type: 'string', example: 'Woreda 03' },
              fullAddress: { type: 'string', example: 'Near Edna Mall, Airport Road' },
              coordinates: {
                type: 'object',
                properties: {
                  latitude: { type: 'number', example: 9.005401 },
                  longitude: { type: 'number', example: 38.784260 }
                }
              }
            }
          },
          workingHours: {
            type: 'object',
            properties: {
              openDays: {
                type: 'array',
                items: { type: 'string' },
                example: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
              },
              openTime: { type: 'string', example: '08:00' },
              closeTime: { type: 'string', example: '17:00' }
            }
          },
          services: {
            type: 'array',
            items: { type: 'string' },
            example: ['General Checkup', 'Dental', 'Pediatrics', 'Laboratory']
          },
          media: {
            type: 'object',
            properties: {
              logo: { type: 'string', example: 'https://res.cloudinary.com/demo/image/upload/logo.png' },
              coverImage: { type: 'string', example: 'https://res.cloudinary.com/demo/image/upload/cover.jpg' }
            }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      UpdateClinicProfileInput: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Selam General Clinic' },
          description: { type: 'string', example: 'Providing comprehensive healthcare services' },
          phoneNumber: { type: 'string', example: '+251911000000' },
          email: { type: 'string', example: 'contact@selamclinic.et' },
          website: { type: 'string', example: 'https://selamclinic.et' },
          city: { type: 'string', example: 'Addis Ababa' },
          subCity: { type: 'string', example: 'Bole' },
          woreda: { type: 'string', example: '03' },
          fullAddress: { type: 'string', example: 'Near Edna Mall, Airport Road' },
          latitude: { type: 'number', example: 9.005401 },
          longitude: { type: 'number', example: 38.784260 },
          openDays: {
            type: 'array',
            items: { type: 'string' },
            example: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          },
          openTime: { type: 'string', example: '08:00' },
          closeTime: { type: 'string', example: '17:00' },
          isOpenSaturday: { type: 'boolean', example: true },
          isOpenSunday: { type: 'boolean', example: false },
          services: {
            type: 'array',
            items: { type: 'string' },
            example: ['General Checkup', 'Dental', 'Pediatrics']
          },
          logo: { type: 'string', example: 'https://res.cloudinary.com/demo/image/upload/logo.png' },
          coverImage: { type: 'string', example: 'https://res.cloudinary.com/demo/image/upload/cover.jpg' }
        }
      },
      Doctor: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6751a1b2c3d4e5f678901235', description: 'Linked User Service ID' },
          specialization: { type: 'string', example: 'Dental' },
          licenseNumber: { type: 'string', example: 'MED-ET-2024-8899' },
          yearsOfExperience: { type: 'number', example: 7 },
          bio: { type: 'string', example: 'Experienced dental specialist with over 7 years in oral surgery.' },
          availableDays: {
            type: 'array',
            items: { type: 'string' },
            example: ['Monday', 'Wednesday', 'Friday']
          },
          startTime: { type: 'string', example: '08:30' },
          endTime: { type: 'string', example: '16:30' },
          breakStart: { type: 'string', example: '12:30' },
          breakEnd: { type: 'string', example: '13:30' },
          isAcceptingPatients: { type: 'boolean', example: true },
          isActive: { type: 'boolean', example: true },
          accountDetails: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Dr. Dawit Bekele' },
              email: { type: 'string', example: 'dr.dawit@clinic.et' },
              phoneNumber: { type: 'string', example: '+251912345678' },
              profilePicture: { type: 'string', example: 'https://res.cloudinary.com/demo/image/upload/doctor.jpg' }
            }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      CreateDoctorProfileInput: {
        type: 'object',
        required: ['userId', 'specialization', 'licenseNumber', 'availableDays', 'startTime', 'endTime'],
        properties: {
          userId: { type: 'string', example: '6751a1b2c3d4e5f678901235', description: 'Existing user ID from User Service with role "doctor"' },
          specialization: { type: 'string', example: 'General Practitioner' },
          licenseNumber: { type: 'string', example: 'MED-ET-2024-5541' },
          yearsOfExperience: { type: 'number', example: 5 },
          bio: { type: 'string', example: 'Compassionate medical professional specialized in internal medicine.' },
          availableDays: {
            type: 'array',
            items: { type: 'string' },
            example: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
          },
          startTime: { type: 'string', example: '08:30', description: 'Shift start time (HH:MM 24h format)' },
          endTime: { type: 'string', example: '17:30', description: 'Shift end time (HH:MM 24h format)' },
          breakStart: { type: 'string', example: '12:30', description: 'Optional lunch break start' },
          breakEnd: { type: 'string', example: '13:30', description: 'Optional lunch break end' }
        }
      },
      DoctorSelfUpdateInput: {
        type: 'object',
        properties: {
          bio: { type: 'string', example: 'Updated doctor biography and clinical focus.' },
          availableDays: {
            type: 'array',
            items: { type: 'string' },
            example: ['Monday', 'Tuesday', 'Thursday']
          },
          startTime: { type: 'string', example: '09:00' },
          endTime: { type: 'string', example: '17:00' },
          breakStart: { type: 'string', example: '12:00' },
          breakEnd: { type: 'string', example: '13:00' }
        }
      },
      UpdateDoctorProfileInput: {
        type: 'object',
        properties: {
          specialization: { type: 'string', example: 'Pediatrics' },
          licenseNumber: { type: 'string', example: 'MED-ET-2024-9988' },
          yearsOfExperience: { type: 'number', example: 8 },
          bio: { type: 'string', example: 'Senior pediatric specialist.' },
          availableDays: {
            type: 'array',
            items: { type: 'string' },
            example: ['Monday', 'Wednesday', 'Friday']
          },
          startTime: { type: 'string', example: '08:30' },
          endTime: { type: 'string', example: '16:30' },
          breakStart: { type: 'string', example: '12:30' },
          breakEnd: { type: 'string', example: '13:30' },
          isAcceptingPatients: { type: 'boolean', example: true },
          isActive: { type: 'boolean', example: true }
        }
      },
      Slot: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6751a1b2c3d4e5f678901236' },
          doctorId: { type: 'string', example: '6751a1b2c3d4e5f678901235' },
          date: { type: 'string', example: '2026-06-16', description: 'Date in YYYY-MM-DD format' },
          startTime: { type: 'string', example: '08:30' },
          endTime: { type: 'string', example: '09:10' },
          status: {
            type: 'string',
            enum: ['available', 'reserved', 'booked', 'blocked'],
            example: 'available'
          },
          appointmentId: {
            type: 'string',
            nullable: true,
            example: null,
            description: 'Linked appointment ID once booked'
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      BookSlotInput: {
        type: 'object',
        required: ['slotId', 'appointmentId'],
        properties: {
          slotId: { type: 'string', example: '6751a1b2c3d4e5f678901236' },
          appointmentId: { type: 'string', example: '6751a1b2c3d4e5f678901299' }
        }
      },
      ReleaseSlotInput: {
        type: 'object',
        properties: {
          slotId: { type: 'string', example: '6751a1b2c3d4e5f678901236' },
          id: { type: 'string', example: '6751a1b2c3d4e5f678901236' }
        }
      },
      BlockSlotInput: {
        type: 'object',
        required: ['doctorId', 'date', 'startTime', 'endTime'],
        properties: {
          doctorId: { type: 'string', example: '6751a1b2c3d4e5f678901235' },
          date: { type: 'string', example: '2026-06-16' },
          startTime: { type: 'string', example: '14:00' },
          endTime: { type: 'string', example: '15:20' }
        }
      },
      CancelBlockedSlotInput: {
        type: 'object',
        properties: {
          slotId: { type: 'string', example: '6751a1b2c3d4e5f678901236' },
          id: { type: 'string', example: '6751a1b2c3d4e5f678901236' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description message' }
        }
      },
      Holiday: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6751a1b2c3d4e5f678901240' },
          date: { type: 'string', example: '2026-09-11', description: 'YYYY-MM-DD' },
          name: { type: 'string', example: 'Enkutatash (Ethiopian New Year)' },
          description: { type: 'string', example: 'Official Ethiopian National Holiday' },
          isClosed: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      CreateHolidayInput: {
        type: 'object',
        required: ['date', 'name'],
        properties: {
          date: { type: 'string', example: '2026-09-11', description: 'Closure / Holiday date (YYYY-MM-DD)' },
          name: { type: 'string', example: 'Enkutatash (Ethiopian New Year)' },
          description: { type: 'string', example: 'National holiday celebration' },
          isClosed: { type: 'boolean', default: true, description: 'True to halt slot generation and declare clinic closed' }
        }
      },
      DoctorLeave: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6751a1b2c3d4e5f678901241' },
          startDate: { type: 'string', example: '2026-10-20' },
          endDate: { type: 'string', example: '2026-10-25' },
          reason: { type: 'string', example: 'Annual Medical Conference Leave' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'], example: 'pending' },
          adminNotes: { type: 'string', example: 'Approved by administrator' },
          reviewedBy: { type: 'string', example: '6750f123456789abcdef0123' },
          reviewedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      RequestDoctorLeaveInput: {
        type: 'object',
        required: ['startDate', 'endDate'],
        properties: {
          startDate: { type: 'string', example: '2026-10-20', description: 'Start date of leave (YYYY-MM-DD)' },
          endDate: { type: 'string', example: '2026-10-25', description: 'End date of leave (YYYY-MM-DD)' },
          reason: { type: 'string', example: 'Attending Ethiopian Medical Association Annual Conference', description: 'Reason for leave request' }
        }
      },
      ReviewDoctorLeaveInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['approved', 'rejected'], example: 'approved', description: 'Review decision' },
          adminNotes: { type: 'string', example: 'Approved. Clinic schedule adjusted and unbooked slots released.', description: 'Administrator notes or explanation' }
        }
      },
      AddDoctorLeaveInput: {
        type: 'object',
        required: ['startDate', 'endDate'],
        properties: {
          startDate: { type: 'string', example: '2026-10-20', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', example: '2026-10-25', description: 'End date (YYYY-MM-DD)' },
          reason: { type: 'string', example: 'Annual Vacation' }
        }
      }
    }
  },
  tags: [
    { name: 'Clinic Management', description: 'Clinic profile configuration, operational hours, and real-time open/closed status' },
    { name: 'Holidays & Closures', description: 'Admin-managed clinic closure dates, Ethiopian national holidays, and slot generation guards' },
    { name: 'Doctors', description: 'Doctor profile registry, schedules, working hours, and admin toggles' },
    { name: 'Doctor Leaves', description: 'Doctor leave and absence management with automatic unbooked slot cancellation' },
    { name: 'Slots & Scheduling', description: '40-minute appointment slot inventory, booking lock, releasing, and slot blocking' },
    { name: 'System & Health', description: 'Microservice health check and uptime probe' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System & Health'],
        summary: 'Service Health & Uptime Probe',
        description: 'Returns the health status and operational state of the Clinic Service.',
        responses: {
          200: {
            description: 'Clinic Service is up and running healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'UP' },
                    message: { type: 'string', example: 'Clinic Service is alive and healthy!' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/clinics': {
      get: {
        tags: ['Clinic Management'],
        summary: 'Get clinic profile and configuration',
        description: 'Retrieves the main clinic information, working hours, services, and location. Automatically bootstraps default profile if empty.',
        responses: {
          200: {
            description: 'Clinic profile retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Clinic' }
                  }
                }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      },
      post: {
        tags: ['Clinic Management'],
        summary: 'Admin: Create and save new clinic profile to database',
        description: 'Creates and registers the clinic profile in MongoDB with brand media (logo and cover image uploaded directly to Cloudinary CDN), operating hours, location, and services.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'overwrite',
            required: false,
            schema: { type: 'boolean', default: false },
            description: 'Set to true if replacing an existing clinic profile'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['phoneNumber'],
                properties: {
                  logo: {
                    type: 'string',
                    format: 'binary',
                    description: '🖼️ Clinic brand logo image file (JPEG, PNG, WebP) - Uploads to Cloudinary'
                  },
                  coverImage: {
                    type: 'string',
                    format: 'binary',
                    description: '🖼️ Clinic cover/banner hero photo (JPEG, PNG, WebP) - Uploads to Cloudinary'
                  },
                  name: { type: 'string', example: 'Selam General Clinic', description: 'Clinic Name' },
                  phoneNumber: { type: 'string', example: '+251911000000', description: 'Main Reception Phone (Required)' },
                  email: { type: 'string', example: 'info@selamclinic.et' },
                  website: { type: 'string', example: 'https://selamclinic.et' },
                  description: { type: 'string', example: 'Comprehensive specialized healthcare center in Addis Ababa' },
                  city: { type: 'string', example: 'Addis Ababa' },
                  subCity: { type: 'string', example: 'Bole' },
                  woreda: { type: 'string', example: 'Woreda 03' },
                  fullAddress: { type: 'string', example: 'Near Edna Mall, Airport Road' },
                  openDays: {
                    type: 'string',
                    example: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday',
                    description: 'Comma-separated days or JSON array'
                  },
                  openTime: { type: 'string', example: '08:00', description: 'Opening time (HH:MM 24h)' },
                  closeTime: { type: 'string', example: '17:00', description: 'Closing time (HH:MM 24h)' },
                  isOpenSaturday: { type: 'boolean', example: true },
                  isOpenSunday: { type: 'boolean', example: false },
                  services: {
                    type: 'string',
                    example: 'General Checkup, Dental, Pediatrics, Laboratory',
                    description: 'Comma-separated medical services offered'
                  }
                }
              }
            },
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateClinicProfileInput' }
            }
          }
        },
        responses: {
          201: {
            description: 'Clinic profile created successfully and saved to database',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Clinic profile successfully created and saved to database.' },
                    data: { $ref: '#/components/schemas/Clinic' }
                  }
                }
              }
            }
          },
          400: { description: 'Missing required phone number or invalid fields' },
          401: { description: 'Unauthorized - Missing or invalid token' },
          403: { description: 'Forbidden - Admin access required' },
          409: { description: 'Clinic profile already exists (use ?overwrite=true to replace)' },
          500: { description: 'Internal server error creating clinic profile' }
        }
      }
    },
    '/api/clinics/createClinicProfile': {
      post: {
        tags: ['Clinic Management'],
        summary: 'Admin: Create clinic profile (Explicit Route Alias)',
        description: 'Explicit alias endpoint to create a clinic profile, identical to POST /api/clinics.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'overwrite',
            required: false,
            schema: { type: 'boolean', default: false },
            description: 'Set to true if replacing an existing clinic profile'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['phoneNumber'],
                properties: {
                  logo: {
                    type: 'string',
                    format: 'binary',
                    description: '🖼️ Clinic brand logo image file (JPEG, PNG, WebP) - Uploads to Cloudinary'
                  },
                  coverImage: {
                    type: 'string',
                    format: 'binary',
                    description: '🖼️ Clinic cover/banner hero photo (JPEG, PNG, WebP) - Uploads to Cloudinary'
                  },
                  name: { type: 'string', example: 'Selam General Clinic' },
                  phoneNumber: { type: 'string', example: '+251911000000' },
                  email: { type: 'string', example: 'info@selamclinic.et' },
                  website: { type: 'string', example: 'https://selamclinic.et' },
                  description: { type: 'string', example: 'Comprehensive specialized healthcare center' },
                  city: { type: 'string', example: 'Addis Ababa' },
                  subCity: { type: 'string', example: 'Bole' },
                  woreda: { type: 'string', example: 'Woreda 03' },
                  fullAddress: { type: 'string', example: 'Near Edna Mall, Airport Road' },
                  openDays: { type: 'string', example: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday' },
                  openTime: { type: 'string', example: '08:00' },
                  closeTime: { type: 'string', example: '17:00' },
                  isOpenSaturday: { type: 'boolean', example: true },
                  isOpenSunday: { type: 'boolean', example: false },
                  services: { type: 'string', example: 'General Checkup, Dental, Laboratory' }
                }
              }
            },
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateClinicProfileInput' }
            }
          }
        },
        responses: {
          201: {
            description: 'Clinic profile created successfully and saved to database',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Clinic' }
                  }
                }
              }
            }
          },
          400: { description: 'Bad request' },
          409: { description: 'Clinic profile already exists' }
        }
      }
    },
    '/api/clinics/status': {
      get: {
        tags: ['Clinic Management'],
        summary: 'Get real-time operational status (Open / Closed)',
        description: 'Computes whether the clinic is currently open or closed based on Ethiopian local time (Africa/Addis_Ababa, UTC+3) and working hours configuration.',
        responses: {
          200: {
            description: 'Operating status computed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    isOpen: { type: 'boolean', example: true },
                    localTime: { type: 'string', example: '14:30' },
                    localDay: { type: 'string', example: 'Tuesday' }
                  }
                }
              }
            }
          },
          404: {
            description: 'Clinic records not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          },
          500: {
            description: 'Failed to compute status',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },
    '/api/clinics/updateClinicProfile': {
      put: {
        tags: ['Clinic Management'],
        summary: 'Admin: Update clinic profile and upload logo / cover image',
        description: 'Modifies clinic contact details, location, working hours, and uploads brand media (logo and cover banner) directly to Cloudinary CDN.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  logo: {
                    type: 'string',
                    format: 'binary',
                    description: '🖼️ Clinic brand logo image file (JPEG, PNG, WebP) - Uploads to Cloudinary'
                  },
                  coverImage: {
                    type: 'string',
                    format: 'binary',
                    description: '🖼️ Clinic cover/banner hero photo (JPEG, PNG, WebP) - Uploads to Cloudinary'
                  },
                  name: { type: 'string', example: 'Selam General Clinic' },
                  description: { type: 'string', example: 'Comprehensive healthcare clinic in Addis Ababa' },
                  phoneNumber: { type: 'string', example: '+251911000000' },
                  email: { type: 'string', example: 'contact@selamclinic.et' },
                  website: { type: 'string', example: 'https://selamclinic.et' },
                  city: { type: 'string', example: 'Addis Ababa' },
                  subCity: { type: 'string', example: 'Bole' },
                  woreda: { type: 'string', example: '03' },
                  fullAddress: { type: 'string', example: 'Near Edna Mall, Airport Road' },
                  openDays: {
                    type: 'string',
                    example: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday',
                    description: 'Comma-separated days or JSON array'
                  },
                  openTime: { type: 'string', example: '08:00' },
                  closeTime: { type: 'string', example: '17:00' },
                  isOpenSaturday: { type: 'boolean', example: true },
                  isOpenSunday: { type: 'boolean', example: false },
                  services: {
                    type: 'string',
                    example: 'General Checkup, Dental, Laboratory, Pediatrics',
                    description: 'Comma-separated medical services offered'
                  }
                }
              }
            },
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateClinicProfileInput' }
            }
          }
        },
        responses: {
          200: {
            description: 'Clinic profile configuration updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Clinic profile configuration updated successfully' },
                    data: { $ref: '#/components/schemas/Clinic' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized - Missing or invalid token' },
          403: { description: 'Forbidden - Requires admin privileges' },
          500: { description: 'Internal server error updating clinic profile' }
        }
      }
    },
    '/api/clinics/upload-media': {
      post: {
        tags: ['Clinic Management'],
        summary: 'Admin: Upload clinic logo and/or cover image directly to Cloudinary',
        description: 'Uploads clinic brand assets (logo, coverImage) to Cloudinary CDN and automatically persists the secure URLs to the database.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  logo: {
                    type: 'string',
                    format: 'binary',
                    description: 'Clinic brand logo image file (JPEG, PNG, WebP)'
                  },
                  coverImage: {
                    type: 'string',
                    format: 'binary',
                    description: 'Clinic cover / hero image file (JPEG, PNG, WebP)'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Clinic media uploaded and saved to database successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Clinic media uploaded and saved to database successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        logo: { type: 'string', example: 'https://res.cloudinary.com/demo/image/upload/logo.png' },
                        coverImage: { type: 'string', example: 'https://res.cloudinary.com/demo/image/upload/cover.jpg' },
                        media: { $ref: '#/components/schemas/Clinic/properties/media' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'No image files provided or invalid file format' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin access required' },
          500: { description: 'Failed to upload clinic media' }
        }
      }
    },
    '/api/clinics/getAllDoctors': {
      get: {
        tags: ['Doctors'],
        summary: 'List all active doctors with account details',
        description: 'Fetches active doctor profiles with their working hours and weekly schedule. Enriches each doctor profile with identity details from User Service. Optionally filter by department / specialization.',
        parameters: [
          {
            in: 'query',
            name: 'specialization',
            required: false,
            schema: { type: 'string' },
            description: 'Filter doctors by medical specialization (case-insensitive substring, e.g. "Dental", "General")'
          }
        ],
        responses: {
          200: {
            description: 'Active doctors retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'number', example: 5 },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Doctor' }
                    }
                  }
                }
              }
            }
          },
          500: { description: 'Internal server error retrieving doctors' }
        }
      }
    },
    '/api/clinics/getAllDoctors/{id}': {
      get: {
        tags: ['Doctors'],
        summary: 'Get doctor profile by ID with linked user details',
        description: 'Retrieves complete profile details for a specific doctor including shift schedule and user account details.',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Doctor user ID'
          }
        ],
        responses: {
          200: {
            description: 'Doctor profile retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Doctor' }
                  }
                }
              }
            }
          },
          404: { description: 'Doctor profile not found' },
          500: { description: 'Internal server error' }
        }
      }
    },
    '/api/clinics/createDoctorProfile': {
      post: {
        tags: ['Doctors'],
        summary: 'Admin: Register a doctor schedule profile',
        description: 'Creates a doctor shift and specialization profile linked to an existing user account with the "doctor" role. Automatically pre-allocates appointment slots for today and tomorrow if scheduled.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDoctorProfileInput' }
            }
          }
        },
        responses: {
          201: {
            description: 'Doctor profile registered and initial slot inventory allocated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Doctor profile registered successfully and initial slot batch created.' },
                    data: { $ref: '#/components/schemas/Doctor' }
                  }
                }
              }
            }
          },
          400: { description: 'Missing required fields or invalid input' },
          401: { description: 'Unauthorized - Missing or invalid token' },
          403: { description: 'Forbidden - Admin access required' },
          409: { description: 'Doctor profile or license number already exists' },
          500: { description: 'Internal server error' }
        }
      }
    },
    '/api/clinics/me': {
      patch: {
        tags: ['Doctors'],
        summary: 'Doctor: Self-update working hours and biography',
        description: 'Allows an authenticated doctor to update their own bio, available days, and shift hours.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DoctorSelfUpdateInput' }
            }
          }
        },
        responses: {
          200: {
            description: 'Doctor profile updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Your doctor profile has been updated successfully.' },
                    data: { $ref: '#/components/schemas/Doctor' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Only doctor role permitted' },
          404: { description: 'Doctor profile not found' },
          500: { description: 'Internal server error' }
        }
      }
    },
    '/api/clinics/admin/updateDoctorProfile/{id}': {
      patch: {
        tags: ['Doctors'],
        summary: 'Admin: Modify any doctor profile and hours',
        description: 'Allows an administrator to modify specialization, license number, shift hours, break times, and patient acceptance.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Doctor user ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateDoctorProfileInput' }
            }
          }
        },
        responses: {
          200: {
            description: 'Doctor profile updated by administrator',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Doctor profile updated successfully by administrator.' },
                    data: { $ref: '#/components/schemas/Doctor' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin access required' },
          404: { description: 'Doctor profile not found' },
          500: { description: 'Internal server error' }
        }
      }
    },
    '/api/clinics/admin/toggleDoctorStatus/{id}': {
      patch: {
        tags: ['Doctors'],
        summary: 'Admin: Activate or deactivate doctor (with User Service sync)',
        description: 'Toggles a doctor active state. Synchronizes the account state with User Service and automatically cascades cancellation of future available slots when deactivated.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Doctor user ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isActive'],
                properties: {
                  isActive: { type: 'boolean', example: false }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Doctor status synchronized successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Doctor profile deactivated successfully. User account status also updated in User Service.' },
                    data: {
                      type: 'object',
                      properties: {
                        doctorId: { type: 'string', example: '6751a1b2c3d4e5f678901235' },
                        isActive: { type: 'boolean', example: false },
                        clinicStatusChanged: { type: 'boolean', example: true }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid status request body' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin access required' },
          404: { description: 'Doctor profile not found' },
          502: { description: 'User-Service synchronization failure' },
          500: { description: 'Internal server error' }
        }
      }
    },
    '/api/clinics/{id}/slots': {
      get: {
        tags: ['Slots & Scheduling'],
        summary: 'Get available 40-minute slots for a doctor on a target date',
        description: 'Queries available appointment slots for a specific doctor on the requested date. Slots are filtered to include only those with status "available".',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Doctor ID'
          },
          {
            in: 'query',
            name: 'date',
            required: true,
            schema: { type: 'string', example: '2026-06-16' },
            description: 'Target calendar date in YYYY-MM-DD format'
          }
        ],
        responses: {
          200: {
            description: 'Available slots retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'number', example: 8 },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Slot' }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Missing required target date query parameter' },
          500: { description: 'Failed to retrieve available slots' }
        }
      }
    },
    '/api/clinics/bookslots': {
      post: {
        tags: ['Slots & Scheduling'],
        summary: 'Lock/book a slot for an appointment',
        description: 'Transitions an available time slot into "booked" status and associates it with the appointment ID.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookSlotInput' }
            }
          }
        },
        responses: {
          200: {
            description: 'Slot booked successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Slot booked successfully' },
                    data: { $ref: '#/components/schemas/Slot' }
                  }
                }
              }
            }
          },
          400: { description: 'Slot is not available or invalid payload' },
          404: { description: 'Time slot record not found' },
          500: { description: 'Failed to book slot' }
        }
      }
    },
    '/api/clinics/releaseSlot': {
      post: {
        tags: ['Slots & Scheduling'],
        summary: 'Release a booked slot back to available inventory',
        description: 'Resets a previously booked slot back to "available" status and removes the linked appointment ID. Used during appointment cancellations or transaction rollbacks.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReleaseSlotInput' }
            }
          }
        },
        responses: {
          200: {
            description: 'Slot released successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Slot released successfully' },
                    data: { $ref: '#/components/schemas/Slot' }
                  }
                }
              }
            }
          },
          400: { description: 'Slot is not in booked state or missing ID' },
          404: { description: 'Time slot record not found' },
          500: { description: 'Failed to release slot' }
        }
      }
    },
    '/api/clinics/blockSlots': {
      post: {
        tags: ['Slots & Scheduling'],
        summary: 'Admin: Block a doctor slot interval manually',
        description: 'Allows an administrator to manually create a "blocked" slot record to prevent bookings during staff meetings, maintenance, or ad-hoc leave.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BlockSlotInput' }
            }
          }
        },
        responses: {
          200: {
            description: 'Slot blocked successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Slot blocked successfully' },
                    data: { $ref: '#/components/schemas/Slot' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin access required' },
          500: { description: 'Failed to block slot' }
        }
      }
    },
    '/api/clinics/cancelBlockedSlot': {
      post: {
        tags: ['Slots & Scheduling'],
        summary: 'Admin: Cancel a blocked slot and revert to available',
        description: 'Unblocks a blocked slot, restoring its status to "available".',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CancelBlockedSlotInput' }
            }
          }
        },
        responses: {
          200: {
            description: 'Slot unblocked successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Slot cancelled successfully' },
                    data: { $ref: '#/components/schemas/Slot' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin access required' },
          404: { description: 'Time slot record not found' },
          500: { description: 'Failed to cancel slot' }
        }
      }
    },
    '/api/clinics/holidays': {
      get: {
        tags: ['Holidays & Closures'],
        summary: 'List all registered clinic holidays & closures',
        description: 'Retrieves designated clinic holidays and planned closures. Optionally filter for upcoming dates with ?upcoming=true.',
        parameters: [
          {
            in: 'query',
            name: 'upcoming',
            required: false,
            schema: { type: 'boolean', default: false },
            description: 'Set to true to only fetch today and future closures'
          }
        ],
        responses: {
          200: {
            description: 'List of holidays retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'number', example: 5 },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Holiday' }
                    }
                  }
                }
              }
            }
          },
          500: { description: 'Internal server error' }
        }
      },
      post: {
        tags: ['Holidays & Closures'],
        summary: 'Admin: Declare a date as a clinic holiday / closure',
        description: 'Registers a specific calendar date as a clinic holiday. Prevents the midnight cron from generating slots, and automatically deletes all unbooked slots on that date.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateHolidayInput' }
            }
          }
        },
        responses: {
          201: {
            description: 'Holiday recorded and unbooked slots purged',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Successfully declared 2026-09-11 as clinic holiday.' },
                    data: { $ref: '#/components/schemas/Holiday' },
                    cleanupSummary: {
                      type: 'object',
                      properties: {
                        unbookedSlotsRemoved: { type: 'number', example: 12 },
                        existingBookedAppointmentsNotice: { type: 'string', example: 'Zero conflicting appointments were booked on this date.' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Missing required date or name' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin access required' },
          409: { description: 'Date is already registered as a holiday' },
          500: { description: 'Internal server error' }
        }
      }
    },
    '/api/clinics/holidays/{id}': {
      delete: {
        tags: ['Holidays & Closures'],
        summary: 'Admin: Delete holiday / Reopen clinic date for scheduling',
        description: 'Removes a holiday record using either its MongoDB ID or YYYY-MM-DD date string.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Holiday document ID or YYYY-MM-DD date string'
          }
        ],
        responses: {
          200: {
            description: 'Holiday removed and date reopened for scheduling',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Holiday for 2026-09-11 removed. Clinic reopened for scheduling.' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin access required' },
          404: { description: 'Holiday record not found' }
        }
      }
    },
    '/api/clinics/holidays/seed-ethiopian': {
      post: {
        tags: ['Holidays & Closures'],
        summary: 'Admin: One-click seed of prominent Ethiopian national holidays',
        description: 'Automatically seeds prominent Ethiopian national & religious holidays (Enkutatash, Meskel, Genna, Timket, Adwa, etc.) into the clinic closure calendar.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Ethiopian holidays seeded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Seeded 12 Ethiopian national holidays into clinic calendar.' },
                    seededCount: { type: 'number', example: 12 }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin access required' }
        }
      }
    },
    '/api/clinics/me/leaves': {
      post: {
        tags: ['Doctor Leaves'],
        summary: 'Doctor Role Only: Submit a leave / absence request (Starts in Pending status)',
        description: 'Protected strictly to doctors (role: "doctor"). Submits a formal leave request for administrative review. Starts in "pending" status and does not affect slot generation until approved by an administrator.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RequestDoctorLeaveInput' }
            }
          }
        },
        responses: {
          201: {
            description: 'Leave request submitted and pending administrator approval',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Leave request submitted successfully. It is now pending administrator approval.' },
                    data: { $ref: '#/components/schemas/DoctorLeave' }
                  }
                }
              }
            }
          },
          400: { description: 'Missing required dates or invalid format' },
          401: { description: 'Unauthorized - Missing or invalid token' },
          403: { description: 'Forbidden - Only users with doctor role can submit leave requests' },
          404: { description: 'Doctor clinical profile not found' }
        }
      },
      get: {
        tags: ['Doctor Leaves'],
        summary: 'Doctor Role Only: View my own leave requests and approval statuses',
        description: 'Protected strictly to doctors (role: "doctor"). Retrieves all personal leave requests submitted by the logged-in doctor, showing current status (pending, approved, rejected) and any administrator review notes.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Personal leaves retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'number', example: 2 },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/DoctorLeave' }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Doctor role required' }
        }
      }
    },
    '/api/clinics/admin/doctor-leaves': {
      get: {
        tags: ['Doctor Leaves'],
        summary: 'Admin Only: List and filter all doctor leave requests',
        description: 'Protected strictly to administrators (role: "admin"). Retrieves all leave requests submitted by all doctors across the clinic. Supports filtering by status (e.g. ?status=pending) to view requests awaiting approval.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'status',
            required: false,
            schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            description: 'Optional filter by request status (e.g. "pending")'
          }
        ],
        responses: {
          200: {
            description: 'Leave requests retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'number', example: 4 },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          doctorId: { type: 'string', example: '6750f123456789abcdef0123' },
                          specialization: { type: 'string', example: 'Dentistry' },
                          licenseNumber: { type: 'string', example: 'ETH-MD-90872' },
                          leaveId: { type: 'string', example: '6751a1b2c3d4e5f678901241' },
                          startDate: { type: 'string', example: '2026-10-20' },
                          endDate: { type: 'string', example: '2026-10-25' },
                          reason: { type: 'string', example: 'Medical conference attendance' },
                          status: { type: 'string', enum: ['pending', 'approved', 'rejected'], example: 'pending' },
                          adminNotes: { type: 'string', example: 'Approved' },
                          reviewedBy: { type: 'string', example: '6750f123456789abcdef0999' },
                          reviewedAt: { type: 'string', format: 'date-time' },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin access required' }
        }
      }
    },
    '/api/clinics/admin/doctor-leaves/{doctorId}/{leaveId}': {
      patch: {
        tags: ['Doctor Leaves'],
        summary: 'Admin Only: Approve or Reject a doctor leave request',
        description: 'Protected strictly to administrators (role: "admin"). When APPROVED, automatically purges unbooked slots for that doctor during the leave date range and prevents new slots from being generated. Returns an alert if any booked appointments exist that require patient rescheduling.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'doctorId',
            required: true,
            schema: { type: 'string' },
            description: 'Doctor user ID'
          },
          {
            in: 'path',
            name: 'leaveId',
            required: true,
            schema: { type: 'string' },
            description: 'Doctor leave request subdocument ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReviewDoctorLeaveInput' }
            }
          }
        },
        responses: {
          200: {
            description: 'Leave request reviewed and status updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Leave request for Doctor 6750f123456789abcdef0123 has been approved.' },
                    data: {
                      type: 'object',
                      properties: {
                        leave: { $ref: '#/components/schemas/DoctorLeave' },
                        unbookedSlotsRemoved: { type: 'number', example: 16 },
                        bookedAppointmentsNotice: { type: 'string', example: 'Zero conflicting appointments were booked during this period.' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid review status (must be "approved" or "rejected")' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin access required' },
          404: { description: 'Doctor or leave request not found' }
        }
      },
    },
    '/api/clinics/doctors/{id}/leaves': {
      get: {
        tags: ['Doctor Leaves'],
        summary: 'View leave & absence schedule for a doctor',
        description: 'Returns all recorded leaves and absence periods for a specific doctor.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Doctor user ID'
          }
        ],
        responses: {
          200: {
            description: 'Leaves retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'number', example: 2 },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/DoctorLeave' }
                    }
                  }
                }
              }
            }
          },
          404: { description: 'Doctor not found' }
        }
      },
      post: {
        tags: ['Doctor Leaves'],
        summary: 'Record an approved leave for a doctor',
        description: 'Records a doctor leave (vacation, conference, sickness). Automatically purges unbooked slots for this doctor during the leave dates and prevents future slot generation.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Doctor user ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddDoctorLeaveInput' }
            }
          }
        },
        responses: {
          201: {
            description: 'Leave recorded and unbooked slots purged',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Leave successfully recorded from 2026-10-20 to 2026-10-25.' },
                    data: {
                      type: 'object',
                      properties: {
                        leave: { $ref: '#/components/schemas/DoctorLeave' },
                        unbookedSlotsRemoved: { type: 'number', example: 16 },
                        existingBookedAppointmentsNotice: { type: 'string', example: 'Zero conflicting appointments were booked during this period.' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid date format or startDate after endDate' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Only admin or the doctor themselves can record leave' },
          404: { description: 'Doctor profile not found' }
        }
      }
    },
    '/api/clinics/doctors/{id}/leaves/{leaveId}': {
      delete: {
        tags: ['Doctor Leaves'],
        summary: 'Cancel a doctor leave period',
        description: 'Cancels an existing leave record for a doctor, restoring standard shift slot generation.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Doctor user ID'
          },
          {
            in: 'path',
            name: 'leaveId',
            required: true,
            schema: { type: 'string' },
            description: 'Leave item ID'
          }
        ],
        responses: {
          200: {
            description: 'Leave cancelled successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Leave period cancelled and removed successfully.' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
          404: { description: 'Doctor or leave record not found' }
        }
      }
    },
    '/api/clinics/slots/cleanup-expired': {
      post: {
        tags: ['Slots & Scheduling'],
        summary: 'Admin: Trigger maintenance cleanup of past unbooked slots',
        description: 'Housekeeping utility that marks past unbooked slots (calendar date < today) as "expired" to optimize database indexing and inventory hygiene.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Expired slot cleanup completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Expired slot cleanup completed. Marked 24 unbooked slot(s) from past dates as expired.' },
                    cleanedCount: { type: 'number', example: 24 }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin access required' }
        }
      }
    }
  }
};
