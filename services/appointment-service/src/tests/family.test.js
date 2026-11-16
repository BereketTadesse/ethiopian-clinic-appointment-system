import request from 'supertest';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { fakeAxios, state, addSlot, addFamilyMember, resetFakeServices } from './setup/fakeServices.js';
import { connectDB, initModels, clearDB, closeDB } from './setup/db.js';

jest.unstable_mockModule('axios', () => ({ default: fakeAxios }));

let app, Appointment, PatientCard, runStartupMigrations, clinicDate;

const DOCTOR = new mongoose.Types.ObjectId().toString();
const newId = () => new mongoose.Types.ObjectId().toString();
const tokenFor = (userId, role) => `Bearer ${jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '15m' })}`;
const daysFromToday = (n) => clinicDate(new Date(Date.now() + n * 24 * 60 * 60 * 1000));

let slotHour = 7;
const nextSlot = (date) => {
  slotHour += 1;
  return addSlot({ doctorId: DOCTOR, date, startTime: `${String(slotHour).padStart(2, '0')}:00`, endTime: 'x' });
};

const book = (accountId, date, extra = {}) =>
  request(app).post('/api/appointments')
    .set('Authorization', tokenFor(accountId, 'patient'))
    .send({ doctorId: DOCTOR, slotId: nextSlot(date), date, ...extra });

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.INTERNAL_SERVICE_SECRET = 'test-internal-secret';
  await connectDB();
  app = (await import('../app.js')).default;
  Appointment = (await import('../models/appointment.model.js')).default;
  PatientCard = (await import('../models/patientCard.model.js')).default;
  await import('../models/counter.model.js');
  ({ runStartupMigrations } = await import('../config/migrations.js'));
  ({ clinicDate } = await import('../utils/time.js'));
  await initModels();
});

beforeEach(() => {
  resetFakeServices();
  jest.clearAllMocks();
  slotHour = 7;
});

afterEach(async () => {
  await clearDB();
});

afterAll(async () => {
  await closeDB();
});

describe('Booking for family members', () => {
  it('a parent can book themselves and two children with the same doctor on the same day', async () => {
    const mom = newId();
    const son = addFamilyMember(mom, { fullName: 'Dawit Tesfaye', relationship: 'son' });
    const daughter = addFamilyMember(mom, { fullName: 'Liya Tesfaye', relationship: 'daughter' });
    const date = daysFromToday(2);

    const self = await book(mom, date);
    const forSon = await book(mom, date, { familyMemberId: son });
    const forDaughter = await book(mom, date, { familyMemberId: daughter });

    expect([self.statusCode, forSon.statusCode, forDaughter.statusCode]).toEqual([201, 201, 201]);
    expect(forSon.body.data.familyMemberId).toBe(son);
    expect(forSon.body.data.forPerson).toBe('Dawit Tesfaye (son)');
    expect(forSon.body.data.patientName).toBe('Dawit Tesfaye');
  });

  it('every person gets their OWN card number', async () => {
    const mom = newId();
    const son = addFamilyMember(mom, { fullName: 'Dawit', relationship: 'son' });
    const date = daysFromToday(2);

    const self = await book(mom, date);
    const forSon = await book(mom, date, { familyMemberId: son });
    const sonAgain = await book(mom, daysFromToday(3), { familyMemberId: son });

    expect(self.body.data.cardNumber).not.toBe(forSon.body.data.cardNumber);
    expect(sonAgain.body.data.cardNumber).toBe(forSon.body.data.cardNumber); // same person, same card
    expect(await PatientCard.countDocuments({ patientId: mom })).toBe(2);
  });

  it('the same person still cannot hold two bookings with one doctor on one day', async () => {
    const mom = newId();
    const son = addFamilyMember(mom, { fullName: 'Dawit', relationship: 'son' });
    const date = daysFromToday(2);

    await book(mom, date, { familyMemberId: son });
    const again = await book(mom, date, { familyMemberId: son });

    expect(again.statusCode).toBe(409);
    expect(again.body.message).toMatch(/Dawit already has an appointment/);
  });

  it('ignores a client-supplied name/label; uses the real family record', async () => {
    const mom = newId();
    const son = addFamilyMember(mom, { fullName: 'Dawit', relationship: 'son' });

    const res = await book(mom, daysFromToday(2), { familyMemberId: son, patientName: 'Someone Else', forPerson: 'fake label' });

    expect(res.body.data.patientName).toBe('Dawit');
    expect(res.body.data.forPerson).toBe('Dawit (son)');
  });

  it("cannot book for another account's family member (404, nothing saved)", async () => {
    const otherParent = newId();
    const theirChild = addFamilyMember(otherParent, { fullName: 'Not Yours' });

    const res = await book(newId(), daysFromToday(2), { familyMemberId: theirChild });

    expect(res.statusCode).toBe(404);
    expect(await Appointment.countDocuments()).toBe(0);
    expect(await PatientCard.countDocuments()).toBe(0);
  });

  it('rejects removed family members and invalid ids', async () => {
    const mom = newId();
    const removed = addFamilyMember(mom, { fullName: 'Old', isActive: false });
    expect((await book(mom, daysFromToday(2), { familyMemberId: removed })).statusCode).toBe(400);
    expect((await book(mom, daysFromToday(2), { familyMemberId: 'not-an-id' })).statusCode).toBe(400);
  });

  it('returns 503 (and books nothing) if user-service cannot verify the member', async () => {
    const mom = newId();
    const son = addFamilyMember(mom, { fullName: 'Dawit' });
    state.userServiceDown = true;

    const res = await book(mom, daysFromToday(2), { familyMemberId: son });

    expect(res.statusCode).toBe(503);
    expect(await Appointment.countDocuments()).toBe(0);
  });

  it("the account holder's own 'self' family record maps to their own card", async () => {
    const mom = newId();
    const selfRecord = addFamilyMember(mom, { fullName: 'Almaz', relationship: 'self', isSelf: true });
    const date = daysFromToday(2);

    const viaSelfRecord = await book(mom, date, { familyMemberId: selfRecord });
    const plain = await book(mom, daysFromToday(3));

    expect(viaSelfRecord.statusCode).toBe(201);
    expect(viaSelfRecord.body.data.familyMemberId).toBeNull();
    expect(plain.body.data.cardNumber).toBe(viaSelfRecord.body.data.cardNumber);
  });

  it('staff can book a walk-in for a family member of a verified patient', async () => {
    const mom = newId();
    state.users.set(mom, 'patient');
    const son = addFamilyMember(mom, { fullName: 'Dawit', relationship: 'son' });
    const date = daysFromToday(2);

    const res = await request(app).post('/api/appointments')
      .set('Authorization', tokenFor(newId(), 'receptionist'))
      .send({ patientId: mom, familyMemberId: son, doctorId: DOCTOR, slotId: nextSlot(date), date });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.familyMemberId).toBe(son);
  });
});

describe('Cards are per person', () => {
  const seedFamily = async () => {
    const mom = newId();
    state.profiles.set(mom, { name: 'Almaz', bloodType: 'O+', allergies: ['Penicillin'] });
    const son = addFamilyMember(mom, {
      fullName: 'Dawit', relationship: 'son',
      profile: { bloodType: 'A-', allergies: ['Peanuts'], chronicConditions: ['Asthma'], medications: [{ name: 'Salbutamol', dosage: '100mcg' }], emergencyContact: {} }
    });
    const date = daysFromToday(2);
    const momAppt = (await book(mom, date)).body.data;
    const sonAppt = (await book(mom, date, { familyMemberId: son })).body.data;
    return { mom, son, momAppt, sonAppt };
  };

  it("a child's card shows the child's blood type and allergies, not the parent's", async () => {
    const { mom, son } = await seedFamily();

    const momCard = await request(app).get('/api/cards/me').set('Authorization', tokenFor(mom, 'patient'));
    const sonCard = await request(app).get(`/api/cards/me?familyMemberId=${son}`).set('Authorization', tokenFor(mom, 'patient'));

    expect(momCard.body.data).toMatchObject({ bloodType: 'O+', allergies: ['Penicillin'], fullName: 'Almaz' });
    expect(sonCard.body.data).toMatchObject({
      bloodType: 'A-', allergies: ['Peanuts'], chronicConditions: ['Asthma'],
      currentMedications: ['Salbutamol 100mcg'], fullName: 'Dawit', relationship: 'son'
    });
  });

  it("the doctor's card history for a child contains only the child's visits", async () => {
    const { sonAppt } = await seedFamily();

    const res = await request(app).get(`/api/cards/${sonAppt.cardNumber}/history`).set('Authorization', tokenFor(DOCTOR, 'doctor'));

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(sonAppt._id);
  });

  it('GET /cards/family lists every card on the account', async () => {
    const { mom } = await seedFamily();
    const res = await request(app).get('/api/cards/family').set('Authorization', tokenFor(mom, 'patient'));
    expect(res.body.count).toBe(2);
  });

  it("a patient cannot open another family's card", async () => {
    const { son } = await seedFamily();
    const stranger = newId();
    const res = await request(app).get(`/api/cards/me?familyMemberId=${son}`).set('Authorization', tokenFor(stranger, 'patient'));
    expect(res.body.data).toBeNull();
  });

  it("updating a child's card syncs to THAT child's profile only", async () => {
    const { mom, son } = await seedFamily();

    const res = await request(app).put(`/api/cards/me?familyMemberId=${son}`)
      .set('Authorization', tokenFor(mom, 'patient'))
      .send({ bloodType: 'B+', chronicConditions: ['Asthma', 'Eczema'] });

    expect(res.statusCode).toBe(200);
    expect(state.profileWrites).toHaveLength(1);
    expect(state.profileWrites[0].method).toBe('PATCH');
    expect(state.profileWrites[0].url).toMatch(new RegExp(`/family-member-profile/${son}$`));
    expect(state.profileWrites[0].body).toEqual({ bloodType: 'B+', chronicConditions: ['Asthma', 'Eczema'] });
    expect((await PatientCard.findOne({ patientId: mom, familyMemberId: son })).bloodType).toBe('B+');
    expect((await PatientCard.findOne({ patientId: mom, familyMemberId: null })).bloodType).toBeNull();
  });
});

describe('Existing data', () => {
  it('old cards (no familyMemberId field) stay the account holder card', async () => {
    const mom = newId();
    await PatientCard.collection.insertOne({
      patientId: new mongoose.Types.ObjectId(mom), cardNumber: 'CLN-2025-00003', isActive: true, allergies: []
    });

    const res = await book(mom, daysFromToday(2));

    expect(res.body.data.cardNumber).toBe('CLN-2025-00003');
  });

  it('startup migration drops the old one-card-per-account index', async () => {
    await PatientCard.collection.dropIndex('patient_person_unique');
    await PatientCard.collection.createIndex({ patientId: 1 }, { unique: true, name: 'patientId_1' });

    await runStartupMigrations();

    const names = (await PatientCard.collection.indexes()).map((i) => i.name);
    expect(names).not.toContain('patientId_1');
    expect(names).toContain('patient_person_unique');
    const mom = newId();
    await PatientCard.create({ patientId: mom, cardNumber: 'A' });
    await PatientCard.create({ patientId: mom, familyMemberId: newId(), cardNumber: 'B' });
    await expect(PatientCard.create({ patientId: mom, cardNumber: 'C' })).rejects.toMatchObject({ code: 11000 });
  });
});
