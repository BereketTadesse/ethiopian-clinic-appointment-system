# 🏥 Ethiopian Clinic Appointment System (የክሊኒክ ቀጠሮና ካርድ አስተዳደር ሲስተም)

[![Node.js Version](https://img.shields.io/badge/Node.js-v20%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express Version](https://img.shields.io/badge/Express-v5.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Mongoose%209-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Cache%20%26%20RateLimit-Redis%20v6-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Containers-Docker%20Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A robust, enterprise-ready microservices-based backend platform purpose-built to modernize outpatient scheduling, digital clinic card management (**የህመምተኛ ካርድ**), and dynamic queue management for clinics and hospitals in Ethiopia.

---

## 📑 Table of Contents

- [Overview & Problem Solved](#-overview--problem-solved)
- [System Architecture](#-system-architecture)
- [Key Features & Ethiopian Context](#-key-features--ethiopian-context)
- [Services Breakdown](#-services-breakdown)
  - [1. User Service](#1-user-service-port-3001)
  - [2. Clinic Service](#2-clinic-service-port-3002)
  - [3. Appointment Service](#3-appointment-service-port-3003)
- [Core Algorithms & Workflows](#-core-algorithms--workflows)
  - [40-Minute Slot Generation & Lunch Break Handling](#40-minute-slot-generation--lunch-break-handling)
  - [Addis Ababa Midnight Cron Job](#addis-ababa-midnight-cron-job)
  - [Booking Orchestration & Two-Phase Rollback Safety](#booking-orchestration--two-phase-rollback-safety)
  - [Sequential Patient Card Numbering](#sequential-patient-card-numbering)
- [API Reference](#-api-reference)
- [Data Models & Schemas](#-data-models--schemas)
- [Environment Configuration](#-environment-configuration)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Docker & Containerization](#-docker--containerization)
- [CI/CD Automation](#-cicd-automation)
- [Reliability & Production Readiness](#-reliability--production-readiness)

---

## 🌟 Overview & Problem Solved

In traditional Ethiopian private and public outpatient clinics, patients face significant friction:
1. **Physical Card Inefficiencies**: Patients must line up at the reception archive window (*ካርድ ክፍል*) to retrieve or create physical paper folders.
2. **First-Come-First-Serve Chaos**: Patients spend half a day sitting in waiting halls without knowing their estimated consultation time.
3. **No Support for Family Dependents**: Primary earners frequently need to schedule visits for children, spouses, or elderly parents without separate accounts.
4. **Doctor Shift Mismatches**: Doctors balance hospital rounds and private clinic shifts, needing flexible schedules with lunch break protection.

**The Ethiopian Clinic Appointment System** addresses these challenges through a resilient, decoupled microservice architecture:
- **Digital Patient Cards (`CLN-YYYY-00001`)**: Automatically provisions and stitches persistent patient records across service boundaries.
- **Dynamic 40-Minute Consultation Windows**: Slices doctor shifts into exact consultation slots while avoiding break periods.
- **Addis Ababa Timezone Alignment (`UTC+3`)**: Automates slot inventory allocations at Ethiopian midnight.
- **Daily Queue Numbers**: Gives each patient a transparent, numbered position in the doctor’s daily queue.
- **Family Profile Accounts**: Enables management of dependents (children, spouses, parents) under a single verified account holder.

---

## 🏗 System Architecture

The solution is divided into three independently scalable microservices communicating via secure HTTP/REST APIs, with centralized rate limiting and caching backed by Redis:

```mermaid
flowchart TB
    subgraph Clients["Clients & Frontend"]
        Web[React / Next.js Web App]
        AdminApp[Admin / Receptionist Portal]
    end

    subgraph UserSvc["User Service (:3001)"]
        UA[Auth & RBAC]
        UP[User & Patient Profiles]
        UF[Family Members Management]
        UDB[(User MongoDB)]
        URedis[(Redis Rate Limiter)]
    end

    subgraph ClinicSvc["Clinic Service (:3002)"]
        CP[Clinic Information & Profile]
        CD[Doctor Rosters & Schedules]
        CS[40-Min Slot Generator Engine]
        CCron[Midnight Cron Scheduler<br/>Africa/Addis_Ababa]
        CDB[(Clinic MongoDB)]
    end

    subgraph ApptSvc["Appointment Service (:3003)"]
        PC[Sequential Patient Card (ካርድ)]
        AB[Booking & Queue Engine]
        AQ[Daily Doctor Queue]
        ADB[(Appointment MongoDB)]
    end

    subgraph External["External Cloud Integrations"]
        Cloudinary[Cloudinary CDN - Images]
        Brevo[Brevo API - Transactional Emails]
    end

    Web -->|JWT / Cookies| UserSvc
    Web -->|Browse Slots| ClinicSvc
    Web -->|Book / Cancel / History| ApptSvc
    AdminApp -->|Clinic Config & Admin Actions| ClinicSvc
    AdminApp -->|View All Appts & Overrides| ApptSvc

    ApptSvc -->|Verify & Lock / Release Slots| ClinicSvc
    ApptSvc -->|Enrich Card Profiles| UserSvc
    ClinicSvc -->|Sync Doctor Accounts| UserSvc

    UserSvc --> External
```

---

## 🇪🇹 Key Features & Ethiopian Context

| Feature | Description | Ethiopian Context / Impact |
| :--- | :--- | :--- |
| **Permanent Patient Card (ካርድ)** | Sequential format `CLN-YYYY-00001` auto-generated on the patient's first booking. | Replaces paper folders at clinic archives (*ካርድ ክፍል*) with instant digital lookups. |
| **Family Dependent Accounts** | Create sub-profiles for `wife`, `husband`, `son`, `daughter`, `mother`, `father`, `grandmother`, etc. | Allows parents and relatives to book and manage medical visits for dependents under one phone number. |
| **Ethiopian National ID (Fayda) & Phone** | Stores Ethiopian National IDs and `+251` mobile phone numbers. | Ready for integration with Ethiopia's National ID system (*ፋይዳ*) and Ethio Telecom / Safaricom SMS. |
| **Addis Ababa Timezone Alignment** | Automated schedule generation explicitly configured for `Africa/Addis_Ababa` (`UTC+3`). | Midnight generation runs at `00:00 EAT`, avoiding time-drift across overseas cloud containers. |
| **Daily Queue Numbering** | Every confirmed booking receives a daily sequential integer (`queueNumber: 1, 2, 3...`). | Directly corresponds to physical clinic waiting rooms and outpatient reception announcements. |
| **Shift & Break Integrity** | Doctor shifts respect configurable lunch intervals (e.g., `12:30` - `13:30`). | Protects doctors' break times and prevents overbooking between morning and afternoon rounds. |

---

## 📦 Services Breakdown

### 1. User Service (Port 3001)
*Manages identity, authentication, user profiles, clinical baselines, and family members.*

- **Technologies**: Node.js, Express 5, MongoDB (Mongoose 9), Redis 6, JSON Web Tokens (JWT), BcryptJS, Multer, Cloudinary, Brevo API.
- **Responsibilities**:
  - Secure registration, login, logout, and password management.
  - Role-Based Access Control (**RBAC**): `patient`, `doctor`, `admin`.
  - Email verification and secure password resets via **Brevo Transactional Email API**.
  - Redis-backed sliding window rate limiters (`authRateLimiter` and `generalRateLimiter`).
  - Family Member CRUD for multi-patient management under a single primary account.
  - Avatar image upload direct to **Cloudinary CDN**.
  - Medical baseline profiles (blood type, allergies, emergency contacts, medical history).

### 2. Clinic Service (Port 3002)
*Manages clinic facilities, doctor shifts, specialties, and the intelligent slot allocation engine.*

- **Technologies**: Node.js, Express 5, MongoDB (Mongoose 9), Redis 6, `node-cron`.
- **Responsibilities**:
  - Clinic metadata: address (City, Sub-City/ክፍለ ከተማ, Woreda/ወረዳ, Coordinates), open days, and operational hours.
  - Doctor profiles: specialization, medical license number, shift start/end times, and lunch breaks.
  - **40-Minute Slot Generation**: Generates non-overlapping consultation windows.
  - **Midnight Cron Daemon**: Automatically pre-allocates slots for active doctors on duty each day.
  - Doctor status toggle with **Mongoose post-save cascade hooks** (auto-cancels open slots if a doctor is deactivated).
  - Slot administration: lock, release, block, and unblock slots.

### 3. Appointment Service (Port 3003)
*Orchestrates booking workflows, digital clinic cards, queue allocation, and consultation completions.*

- **Technologies**: Node.js, Express 5, MongoDB (Mongoose 9), Redis 6, Axios.
- **Responsibilities**:
  - **Patient Card (ካርድ) Engine**: Issues sequential, annual card numbers (`CLN-YYYY-00001`).
  - Cross-service profile stitching: blends card data with live medical info from `user-service`.
  - **Atomic-Style Booking Sequence**: Coordinates slot verification, card assignment, daily queue calculation, and slot locking.
  - Double-booking guard: guarantees one active appointment per patient per doctor per calendar day.
  - Doctor Queue View (`GET /api/appointments/my-queue`): sorted strictly by queue order.
  - Doctor Consultation Closure: saves clinical notes, prescriptions, and follow-up dates.
  - Cancellation & Rollback: releases locked slots back to available inventory on cancellations or system aborts.

---

## 🧠 Core Algorithms & Workflows

### 40-Minute Slot Generation & Lunch Break Handling
The slot engine in `services/clinic-service/src/utils/slotGenerator.js` calculates exact 40-minute consultation blocks and steps over lunch intervals:

```javascript
// Converts 24hr string to absolute minutes from midnight
const timeToMinutes = (t) => t.split(':').reduce((h, m) => h * 60 + +m);

// Slices doctor shift into 40-minute consultation blocks
while (currentMinutes + 40 <= endMinutes) {
  const slotStart = currentMinutes;
  const slotEnd = currentMinutes + 40;

  // Interval overlap test: Start < BreakEnd && End > BreakStart
  if (breakStartMinutes && breakEndMinutes) {
    if (slotStart < breakEndMinutes && slotEnd > breakStartMinutes) {
      currentMinutes = breakEndMinutes; // Skip past lunch break
      continue;
    }
  }

  slots.push({ doctorId, date, startTime, endTime, status: 'available' });
  currentMinutes += 40;
}
```

### Addis Ababa Midnight Cron Job
Located in `services/clinic-service/src/cron/slotCron.js`, this scheduled job ensures slots are generated automatically according to Ethiopian local time:
- Scheduled with expression: `0 0 * * *` (Runs every midnight).
- Explicitly binds `timezone: "Africa/Addis_Ababa"`.
- Calculates date targets using Ethiopian timezone offsets (`UTC+3`).
- On server startup, immediately executes for **Today** and **Tomorrow** so slots are ready without waiting for midnight.
- Guarded by MongoDB compound unique index `{ doctorId: 1, date: 1, startTime: 1 }` to guarantee idempotency.

### Booking Orchestration & Two-Phase Rollback Safety
When a patient books through `POST /api/appointments`:

```
Patient ────> Appointment Service ────> Check Active Duplicates
                    │
                    ├────> Clinic Service: Verify Slot is 'available'
                    │
                    ├────> Query/Create Patient Card (CLN-YYYY-NNNNN)
                    │
                    ├────> Calculate Daily Doctor Queue Number
                    │
                    ├────> Clinic Service: Lock Slot (PENDING_SAVE)
                    │
                    ├────> Write Appointment Record to DB
                    │         │
                    │         ├─── [Success] ──> Lock Slot with appointmentId
                    │         └─── [Failure] ──> ROLLBACK: Release Slot to 'available'
                    │
                    └────> Return Confirmed Appointment & Queue Ticket
```

### Sequential Patient Card Numbering
In `services/appointment-service/src/services/card.service.js`:
- Card format: `CLN-{YYYY}-{NNNNN}` (e.g., `CLN-2026-00001`).
- Scoped to the current calendar year.
- Calculates existing cards matching `^CLN-{year}-` and zero-pads the incremented count to 5 digits.

---

## 📡 API Reference

### 👤 User Service (`http://localhost:3001`)

#### Authentication & Account Management
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/users/register` | Public | Register new patient account |
| `POST` | `/api/users/login` | Public | Login with email & password (returns JWT cookie & token) |
| `GET` | `/api/users/verify/:token` | Public | Verify user email address |
| `POST` | `/api/users/logout` | Public | Clear authentication cookie & session |
| `POST` | `/api/users/forgot-password`| Public | Send password reset token to email |
| `POST` | `/api/users/reset-password/:token` | Public | Reset password with token |
| `POST` | `/api/users/change-password` | Private | Change password for logged-in user |
| `DELETE`| `/api/users/delete-me` | Private | Self-delete account |
| `GET` | `/api/users/public-doctor-account/:id` | Public | Fetch public profile for a doctor |

#### Profile & Health Information
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/profile/:id` | Private | Fetch full user profile & medical history |
| `POST` | `/api/users/upload-profile` | Private | Upload profile picture to Cloudinary (`multipart/form-data`) |
| `PUT` | `/api/users/update-profile` | Private | Update user profile and medical baseline |
| `POST` | `/api/users/request-email-update` | Private | Request change of registered email |
| `GET` | `/api/users/confirm-email-update/:token` | Public | Confirm and apply email update |

#### Family Members Management
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/users/createFamilyMember` | Private | Add a new family member / dependent |
| `GET` | `/api/users/getAllFamilyMembers` | Private | List all family members under current account |
| `GET` | `/api/users/getOneFamilyMember/:id` | Private | Get single family member details |
| `PATCH`| `/api/users/updateFamilyMember/:id` | Private | Update family member profile |
| `DELETE`| `/api/users/deleteFamilyMember/:id` | Admin | Delete family member record |

#### Admin User Controls
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/getUsers` | Admin | List all registered users across the system |
| `PATCH`| `/api/users/admin/update-user-status/:id` | Admin | Activate or deactivate a user account |

---

### 🏥 Clinic Service (`http://localhost:3002`)

#### Clinic Metadata & Profile
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/clinics` | Public | Retrieve clinic profile, location, and working hours |
| `GET` | `/api/clinics/status` | Public | Check if clinic is open right now |
| `PUT` | `/api/clinics/updateClinicProfile` | Admin | Update address, working hours, services, and media |

#### Doctor Rostering & Shifts
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/clinics/getAllDoctors` | Public | List all active doctors |
| `GET` | `/api/clinics/getAllDoctors/:id` | Public | Get doctor profile by User ID |
| `POST` | `/api/clinics/createDoctorProfile` | Admin | Create doctor shift schedule & license details |
| `PATCH`| `/api/clinics/me` | Doctor | Doctor self-updates bio and practice details |
| `PATCH`| `/api/clinics/admin/updateDoctorProfile/:id` | Admin | Admin updates doctor shifts and specialty |
| `PATCH`| `/api/clinics/admin/toggleDoctorStatus/:id` | Admin | Toggle doctor active state (cascades slot cancellation) |

#### Slot Management
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/clinics/:id/slots?date=YYYY-MM-DD` | Public | View available 40-minute slots for a doctor on a date |
| `POST` | `/api/clinics/bookslots` | Private | Lock and mark slot as `booked` |
| `POST` | `/api/clinics/releaseSlot` | Private | Release a booked slot back to `available` |
| `POST` | `/api/clinics/blockSlots` | Admin | Block a time window from patient booking |
| `POST` | `/api/clinics/cancelBlockedSlot` | Admin | Unblock a previously blocked slot |

---

### 📅 Appointment Service (`http://localhost:3003`)

#### Patient Appointments
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/appointments` | Patient | Book appointment (generates card & queue ticket) |
| `GET` | `/api/appointments/my-appointments` | Patient | List active/scheduled appointments for patient |
| `GET` | `/api/appointments/history` | Patient | View past appointment history |
| `PATCH`| `/api/appointments/:appointmentId/cancel`| Patient | Cancel appointment (releases slot back to clinic) |

#### Digital Clinic Card (ካርድ)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cards/me` | Patient | Retrieve patient's digital card & stitched medical info |
| `PUT` | `/api/cards/me` | Patient | Update medical background & emergency contacts |
| `GET` | `/api/cards/:cardNumber` | Doc / Admin | Look up card details by card number (e.g. `CLN-2026-00001`) |
| `GET` | `/api/cards/:cardNumber/history` | Doc / Admin | View complete historical appointment trail for card |

#### Doctor Clinical Workstation
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/appointments/my-queue` | Doctor | View today's queue ordered chronologically (`1, 2, 3...`) |
| `GET` | `/api/appointments/:id` | Doctor | View consultation details & full patient card history |
| `PATCH`| `/api/appointments/:id/complete` | Doctor | Mark visit completed; save notes, prescription & follow-up |

#### Admin Appointment Controls
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/appointments?date=...&doctorId=...&status=...` | Admin | Filter and list all appointments system-wide |
| `PATCH`| `/api/appointments/:id/cancel` | Admin | Admin cancellation with required reason & slot release |

---

## 🗄 Data Models & Schemas

### User Service Models
- **`User`**: Core credentials, contact details, role (`patient`, `doctor`, `admin`), active/verified flags, tokens.
- **`PatientProfile`**: One-to-one extension containing `bloodType`, `allergies`, `emergencyContact`, `medicalHistory`, and `medications`.
- **`FamilyMember`**: Dependent profiles linked to an account with `relationship`, `dateOfBirth`, `gender`, `nationalId`, and `isSelf` constraint.

### Clinic Service Models
- **`Clinic`**: Single-source-of-truth metadata, physical address (Addis Ababa, Sub-City, Woreda), operating hours, departments, and media assets.
- **`Doctor`**: Professional record keyed to User ID, license number, `availableDays`, `startTime`, `endTime`, `breakStart`, `breakEnd`, and Mongoose cascade hooks.
- **`Slot`**: Atomic 40-minute unit (`doctorId`, `date`, `startTime`, `endTime`, `status: available|reserved|booked|blocked`, `appointmentId`).

### Appointment Service Models
- **`PatientCard`**: The permanent digital card record (`cardNumber: CLN-YYYY-NNNNN`, `patientId`, emergency info, blood type).
- **`Appointment`**: The booking entity (`cardNumber`, `patientId`, `doctorId`, `slotId` [unique], `date`, `startTime`, `endTime`, `queueNumber`, `status`, `doctorNotes`, `prescription`).

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory or inside each individual service directory. The system's `loadEnv.js` utilities automatically resolve variables from the root `.env`.

### Complete `.env` Reference Template

```env
# =============================================================
# ENVIRONMENT & GENERAL
# =============================================================
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# =============================================================
# SECURITY & AUTHENTICATION (Shared across services)
# =============================================================
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRE=7d

# =============================================================
# DATABASE CONNECTIONS (Dedicated MongoDB per Service)
# =============================================================
USER_SERVICE_MONGO_URI=mongodb://localhost:27017/clinic_user_db
CLINIC_SERVICE_MONGO_URI=mongodb://localhost:27017/clinic_clinic_db
APPOINTMENT_SERVICE_MONGO_URI=mongodb://localhost:27017/clinic_appointment_db

# =============================================================
# REDIS CACHE & DISTRIBUTED RATE LIMITER
# =============================================================
REDIS_URL=redis://localhost:6379

# =============================================================
# SERVICE PORTS
# =============================================================
PORT=3001
CLINIC_PORT=3002
APPOINTMENT_PORT=3003

# =============================================================
# INTER-SERVICE URL COMMUNICATION
# =============================================================
USER_SERVICE_URL=http://localhost:3001
CLINIC_SERVICE_URL=http://localhost:3002

# =============================================================
# EXTERNAL INTEGRATIONS (User Service)
# =============================================================
# Brevo Email API (for verification & password reset emails)
BREVO_API_KEY=xkeysib-your-brevo-api-key-here
BREVO_SENDER_EMAIL=noreply@yourclinic.et

# Cloudinary (for avatar & clinic document uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Node.js**: `v20.x LTS` or higher
- **npm**: `v10.x` or higher
- **MongoDB**: Local MongoDB instance or free MongoDB Atlas cluster
- **Redis**: Local Redis server or cloud Redis (e.g., Upstash / Render Redis)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/BereketTadesse/ethiopian-clinic-appointment-system.git
cd ethiopian-clinic-appointment-system
```

### 2. Configure Environment
Copy the configuration template above and save it as `.env` in the root folder:
```bash
cp .env.example .env   # Or create .env manually
```

### 3. Install Dependencies
Run `npm install` inside each of the three microservices:

```bash
# Terminal 1: User Service
cd services/user-service
npm install

# Terminal 2: Clinic Service
cd services/clinic-service
npm install

# Terminal 3: Appointment Service
cd services/appointment-service
npm install
```

### 4. Run the Services in Development Mode
Start each service using nodemon:

```bash
# In services/user-service
npm run dev
# 🚀 User Service listening on 0.0.0.0:3001

# In services/clinic-service
npm run dev
# 🚀 Clinic Service listening on 0.0.0.0:3002
# ⏰ Midnight 40-Minute Slot Generation Cron Job mounted

# In services/appointment-service
npm run dev
# 🚀 Appointment Service listening on port 3003
```

### 5. Verify Health Checks
Test that all three services are responding:
```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
```

---

## 🐳 Docker & Containerization

All three microservices contain optimized Dockerfiles.

### Service Dockerfiles Overview
- **`user-service/Dockerfile`**: Lightweight `node:20-slim` image with layer-cached dependencies.
- **`clinic-service/Dockerfile`**: Alpine-based `node:20-alpine` production image.
- **`appointment-service/Dockerfile`**: Multi-stage production build (`builder` stage + slim `production` stage omitting dev dependencies).

### Run with Docker Compose
To spin up all services, MongoDB databases, and Redis locally with a single command, use the provided `docker-compose.yml`:

```bash
docker compose up --build
```

---

## 🔄 CI/CD Automation

The project includes an automated GitHub Actions workflow in `.github/workflows/appointment-ci-cd.yml` configured to:
1. Trigger automatically on code pushes and pull requests affecting `services/appointment-service/**`.
2. Configure **Docker Buildx** and Docker Hub authentication.
3. Build the container image using GitHub Actions cache (`type=gha`).
4. Publish multi-tagged images (`latest` and git commit SHA) directly to Docker Hub upon merge to `main`.

---

## 🛡 Reliability & Production Readiness

- **Graceful Shutdown**: All services trap `SIGTERM` and `SIGINT` signals, safely draining in-flight HTTP connections, closing Mongoose database connections, and disconnecting Redis clients cleanly.
- **Reverse Proxy Support**: Pre-configured with `app.set('trust proxy', 1)` to run cleanly behind Docker ingress, Nginx, AWS ALB, or Render load balancers.
- **Graceful Redis Fallback**: If Redis is temporarily unreachable, services log an operational warning and proceed with localized safety mechanisms without crashing.
- **Idempotency & Race Condition Prevention**:
  - Slot compound index `{ doctorId: 1, date: 1, startTime: 1 }` blocks duplicate slot creation.
  - Appointment unique index `{ slotId: 1 }` prevents concurrent double-booking of the exact same slot.
  - Automatic rollback safely reverts slots to `available` if booking fails mid-flight.

---

## 👥 Authors & Acknowledgments

- **Lead Developer**: [Bereket Tadesse](https://github.com/BereketTadesse)
- **Special Acknowledgments**: Ethiopian healthcare workers, outpatient nurses, and clinic administrators who provided domain insights on outpatient card archiving (*ካርድ ክፍል*) workflows.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
