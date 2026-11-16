import request from 'supertest';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { fakeAxios, state, addSlot, resetFakeServices } from './setup/fakeServices.js';
import { connectDB, initModels, clearDB, closeDB } from './setup/db.js';

jest.unstable_mockModule('axios', () => ({ default: fakeAxios }));

let app, Appointment, PatientCard, runStartupMigrations;
let clinicDate, clinicTime, clinicYear;

const DOCTOR = new mongoose.Types.ObjectId().toString();
const INTERNAL = 'test-internal-secret';

// Tokens in the exact shape user-service issues ({ userId, role })
const tokenFor = (userId, role) =>
  `Bearer ${jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '15m' })}`;
const newId = () => new mongoose.Types.ObjectId().toString();

const daysFromToday = (n) => clinicDate(new Date(Date.now() + n * 24 * 60 * 60 * 1000));

const book = (patientId, slotId, date, extra = {}) =>
  request(app).post('/api/appointments')
    .set('Authorization', tokenFor(patientId, 'patient'))
    .send({ doctorId: DOCTOR, slotId, date, reasonForVisit: 'Checkup', ...extra });

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.INTERNAL_SERVICE_SECRET = INTERNAL;
  await connectDB();
  app = (await import('../app.js')).default;
  Appointment = (await import('../models/appointment.model.js')).default;
  PatientCard = (await import('../models/patientCard.model.js')).default;
  await import('../models/counter.model.js');
  ({ runStartupMigrations } = await import('../config/migrations.js'));
  ({ clinicDate, clinicTime, clinicYear } = await import('../utils/time.js'));
  await initModels();
});

beforeEach(() => {
  resetFakeServices();
  jest.clearAllMocks();
});

afterEach(async () => {
  await clearDB();
});

afterAll(async () => {
  await closeDB();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Auth token shape', () => {
  it('accepts real user-service tokens ({ userId }) and books for that patient', async () => {
    const patient = newId();
    const date = daysFromToday(2);
    const slot = addSlot({ doctorId: DOCTOR, date, startTime: '09:00', endTime: '09:40' });

    const res = await book(patient, slot, date);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.patientId).toBe(patient);
    expect(res.body.data.reasonForVisit).toBe('Checkup'); // was silently dropped before
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Queue order = appointment time', () => {
  it('numbers the queue by slot time, not by who booked first', async () => {
    const date = daysFromToday(2);
    const late = addSlot({ doctorId: DOCTOR, date, startTime: '10:00', endTime: '10:40' });
    const early = addSlot({ doctorId: DOCTOR, date, startTime: '08:00', endTime: '08:40' });
    const alice = newId();
    const bob = newId();

    const first = await book(alice, late, date);   // booked first, but at 10:00
    expect(first.body.data.queueNumber).toBe(1);   // alone in the queue for now

    const second = await book(bob, early, date);   // booked later, but at 08:00
    expect(second.body.data.queueNumber).toBe(1);

    const aliceView = await request(app).get('/api/appointments/my-appointments').set('Authorization', tokenFor(alice, 'patient'));
    expect(aliceView.body.data[0].queueNumber).toBe(2); // moved behind the 08:00 patient

    // Bob cancels -> Alice is first again
    await request(app).patch(`/api/appointments/${second.body.data._id}/cancel`).set('Authorization', tokenFor(bob, 'patient')).send({});
    const after = await request(app).get('/api/appointments/my-appointments').set('Authorization', tokenFor(alice, 'patient'));
    expect(after.body.data[0].queueNumber).toBe(1);
  });

  it("doctor's queue for today is sorted by time and numbers include completed visits", async () => {
    const today = clinicDate();
    const base = { doctorId: DOCTOR, date: today, cardNumber: 'CLN-2026-00001', endTime: 'x' };
    await Appointment.create([
      { ...base, patientId: newId(), slotId: 's3', startTime: '11:00', status: 'scheduled' },
      { ...base, patientId: newId(), slotId: 's1', startTime: '08:00', status: 'completed' },
      { ...base, patientId: newId(), slotId: 's2', startTime: '09:20', status: 'scheduled' },
      { ...base, patientId: newId(), slotId: 's4', startTime: '08:40', status: 'cancelled' }
    ]);

    const res = await request(app).get('/api/appointments/my-queue').set('Authorization', tokenFor(DOCTOR, 'doctor'));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.map((a) => [a.startTime, a.queueNumber])).toEqual([['09:20', 2], ['11:00', 3]]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 1: cancelled slots can be booked again', () => {
  it('book -> cancel -> another patient books the same slot', async () => {
    const date = daysFromToday(3);
    const slot = addSlot({ doctorId: DOCTOR, date, startTime: '09:00', endTime: '09:40' });
    const alice = newId();

    const first = await book(alice, slot, date);
    expect(first.statusCode).toBe(201);
    await request(app).patch(`/api/appointments/${first.body.data._id}/cancel`).set('Authorization', tokenFor(alice, 'patient')).send({});
    expect(state.slots.get(slot).status).toBe('available');

    const again = await book(newId(), slot, date);
    expect(again.statusCode).toBe(201);
  });

  it('startup migration drops the legacy slotId_1 unique index', async () => {
    await Appointment.collection.dropIndex('slotId_active_unique');
    await Appointment.collection.createIndex({ slotId: 1 }, { unique: true, name: 'slotId_1' });

    await runStartupMigrations();

    const names = (await Appointment.collection.indexes()).map((i) => i.name);
    expect(names).not.toContain('slotId_1');
    expect(names).toContain('slotId_active_unique');
  });

  it('the database still refuses two ACTIVE appointments on one slot', async () => {
    const base = { doctorId: DOCTOR, date: daysFromToday(1), cardNumber: 'C', startTime: '08:00', endTime: '08:40', slotId: 'same' };
    await Appointment.create({ ...base, patientId: newId(), status: 'cancelled' });
    await Appointment.create({ ...base, patientId: newId(), status: 'scheduled' });
    await expect(Appointment.create({ ...base, patientId: newId(), status: 'scheduled' })).rejects.toMatchObject({ code: 11000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 2: race-safe numbers', () => {
  it('simultaneous first-time patients get unique, sequential card numbers', async () => {
    const date = daysFromToday(4);
    const bookings = Array.from({ length: 8 }, (_, i) => {
      const slot = addSlot({ doctorId: DOCTOR, date, startTime: `${String(8 + i).padStart(2, '0')}:00`, endTime: 'x' });
      return book(newId(), slot, date);
    });

    const results = await Promise.all(bookings);

    expect(results.map((r) => r.statusCode)).toEqual(Array(8).fill(201));
    const cards = results.map((r) => r.body.data.cardNumber).sort();
    const year = clinicYear();
    expect(cards).toEqual(Array.from({ length: 8 }, (_, i) => `CLN-${year}-${String(i + 1).padStart(5, '0')}`));
  });

  it('continues after the highest existing card number (cards issued before the counter existed)', async () => {
    const year = clinicYear();
    await PatientCard.create({ patientId: newId(), cardNumber: `CLN-${year}-00041` });
    const date = daysFromToday(4);
    const slot = addSlot({ doctorId: DOCTOR, date, startTime: '09:00', endTime: '09:40' });

    const res = await book(newId(), slot, date);

    expect(res.body.data.cardNumber).toBe(`CLN-${year}-00042`);
  });

  it('two patients racing for one slot: exactly one wins, and the slot stays booked for the winner', async () => {
    const date = daysFromToday(4);
    const slot = addSlot({ doctorId: DOCTOR, date, startTime: '09:00', endTime: '09:40' });

    const results = await Promise.all([book(newId(), slot, date), book(newId(), slot, date)]);

    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    const winner = results.find((r) => r.statusCode === 201).body.data;
    expect(state.slots.get(slot)).toMatchObject({ status: 'booked', appointmentId: winner._id });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 3: staff bookings fail closed', () => {
  const staffBook = (body) =>
    request(app).post('/api/appointments').set('Authorization', tokenFor(newId(), 'receptionist')).send(body);

  it('returns 503 and saves nothing when user-service is unreachable', async () => {
    state.userServiceDown = true;
    const date = daysFromToday(2);
    const slot = addSlot({ doctorId: DOCTOR, date, startTime: '09:00', endTime: '09:40' });

    const res = await staffBook({ patientId: newId(), doctorId: DOCTOR, slotId: slot, date });

    expect(res.statusCode).toBe(503);
    expect(await Appointment.countDocuments()).toBe(0);
    expect(await PatientCard.countDocuments()).toBe(0);
    expect(state.slots.get(slot).status).toBe('available');
  });

  it('returns 404 for an unknown patient', async () => {
    const date = daysFromToday(2);
    const slot = addSlot({ doctorId: DOCTOR, date, startTime: '09:00', endTime: '09:40' });
    const res = await staffBook({ patientId: newId(), doctorId: DOCTOR, slotId: slot, date });
    expect(res.statusCode).toBe(404);
  });

  it('books for a verified patient', async () => {
    const patient = newId();
    state.users.set(patient, 'patient');
    const date = daysFromToday(2);
    const slot = addSlot({ doctorId: DOCTOR, date, startTime: '09:00', endTime: '09:40' });
    const res = await staffBook({ patientId: patient, doctorId: DOCTOR, slotId: slot, date });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.patientId).toBe(patient);
  });

  it('requires a patientId from staff', async () => {
    const res = await staffBook({ doctorId: DOCTOR, slotId: 'x', date: daysFromToday(2) });
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 4: Addis Ababa time', () => {
  it('22:30 UTC is already the next day, 01:30, in Addis Ababa', () => {
    const instant = new Date('2026-11-16T22:30:00Z');
    expect(clinicDate(instant)).toBe('2026-11-17');
    expect(clinicTime(instant)).toBe('01:30');
  });

  it('rejects bookings for a past date', async () => {
    const date = daysFromToday(-1);
    const slot = addSlot({ doctorId: DOCTOR, date, startTime: '09:00', endTime: '09:40' });
    const res = await book(newId(), slot, date);
    expect(res.statusCode).toBe(400);
  });

  it('rejects a slot earlier today that has already started', async () => {
    const date = clinicDate();
    const slot = addSlot({ doctorId: DOCTOR, date, startTime: '00:00', endTime: '00:40' });
    const res = await book(newId(), slot, date);
    expect(res.statusCode).toBe(400);
    expect(state.slots.get(slot).status).toBe('available');
  });

  it('rejects malformed dates', async () => {
    const res = await book(newId(), 'x', '2026-13-45');
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 5: correct errors from clinic-service', () => {
  it('slot taken between check and lock -> 409 (not "clinic offline")', async () => {
    const date = daysFromToday(2);
    const slot = addSlot({ doctorId: DOCTOR, date, startTime: '09:00', endTime: '09:40' });
    // Someone else locks it right after our availability check
    fakeAxios.get.mockImplementationOnce(async () => {
      const data = [{ ...state.slots.get(slot) }];
      Object.assign(state.slots.get(slot), { status: 'booked', appointmentId: 'someone-else' });
      return { status: 200, data: { success: true, data } };
    });

    const res = await book(newId(), slot, date);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/just taken/);
    expect(state.slots.get(slot).appointmentId).toBe('someone-else'); // not released
  });

  it('clinic-service unreachable -> 503', async () => {
    state.clinicDown = true;
    const res = await book(newId(), 'x', daysFromToday(2));
    expect(res.statusCode).toBe(503);
  });

  it('slot no longer available -> 409', async () => {
    const res = await book(newId(), 'does-not-exist', daysFromToday(2));
    expect(res.statusCode).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 6: errors become JSON responses, not crashes', () => {
  it('malformed JSON -> 400 JSON', async () => {
    const res = await request(app).post('/api/appointments')
      .set('Authorization', tokenFor(newId(), 'patient'))
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('unknown route -> 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 7: cancel upcoming appointments of a deactivated doctor', () => {
  const url = `/api/appointments/internal/doctors/${DOCTOR}/cancel-upcoming`;

  const seed = async () => {
    const base = { cardNumber: 'C', endTime: 'x', patientId: newId() };
    return Appointment.create([
      { ...base, doctorId: DOCTOR, date: daysFromToday(3), slotId: 'f1', startTime: '09:00', status: 'scheduled' },
      { ...base, doctorId: DOCTOR, date: clinicDate(), slotId: 't1', startTime: '23:59', status: 'scheduled' },
      { ...base, doctorId: DOCTOR, date: daysFromToday(-2), slotId: 'p1', startTime: '09:00', status: 'scheduled' },
      { ...base, doctorId: DOCTOR, date: daysFromToday(3), slotId: 'c1', startTime: '10:00', status: 'completed' },
      { ...base, doctorId: 'other-doctor', date: daysFromToday(3), slotId: 'o1', startTime: '09:00', status: 'scheduled' }
    ]);
  };

  it('rejects calls without the internal secret (even with an admin token)', async () => {
    const res = await request(app).patch(url).set('Authorization', tokenFor(newId(), 'admin'));
    expect(res.statusCode).toBe(403);
  });

  it("cancels only this doctor's scheduled appointments from today onward", async () => {
    await seed();

    const res = await request(app).patch(url).set('x-internal-service-secret', INTERNAL).send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.cancelledCount).toBe(2);
    const bySlot = Object.fromEntries((await Appointment.find()).map((a) => [a.slotId, a]));
    expect(bySlot.f1).toMatchObject({ status: 'cancelled', cancelledBy: 'system' });
    expect(bySlot.t1.status).toBe('cancelled');
    expect(bySlot.p1.status).toBe('scheduled');  // past: untouched
    expect(bySlot.c1.status).toBe('completed');  // completed: untouched
    expect(bySlot.o1.status).toBe('scheduled');  // other doctor: untouched
    expect(bySlot.f1.cancelReason).toMatch(/no longer available/);
  });
});
