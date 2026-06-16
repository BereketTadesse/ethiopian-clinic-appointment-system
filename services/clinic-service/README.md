# Clinic Service

Microservice responsible for clinic and appointment management in the Ethiopian Clinic Appointment System.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file or use the root `.env` with required variables:
```
MONGODB_URI=your_mongodb_uri
REDIS_URL=your_redis_url
JWT_SECRET=your_jwt_secret
CLINIC_PORT=3002
```

3. Start the service:
```bash
npm run dev      # Development with nodemon
npm start        # Production
```

## Health Check

```bash
curl http://localhost:3002/health
```

## API Routes

(To be implemented)
- `GET /api/clinics` - Get all clinics
- `POST /api/clinics` - Create a clinic
- `GET /api/appointments` - Get appointments
- `POST /api/appointments` - Create appointment

## Architecture

```
src/
├── config/          # Configuration files (DB, Redis, env)
├── controllers/     # Business logic handlers
├── middleware/      # Express middleware (auth, validation)
├── models/          # MongoDB schemas
├── routes/          # API route definitions
└── utils/           # Helper utilities
```
