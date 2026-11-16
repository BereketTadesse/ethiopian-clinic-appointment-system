import Appointment from '../models/appointment.model.js';
import PatientCard from '../models/patientCard.model.js';

/**
 * Idempotent index migrations, run on every startup (safe to run repeatedly).
 *
 * 1. Drop the legacy `slotId_1` unique index. It counted CANCELLED appointments too,
 *    so a cancelled slot could never be booked again. It is replaced by the partial
 *    unique index `slotId_active_unique` declared in the Appointment model.
 * 2. Build the model's indexes (including the new partial index).
 * 3. Patient cards become per person (account + family member) instead of per account.
 *    Existing cards have no familyMemberId, so they stay the account holder's card.
 */
export const runStartupMigrations = async () => {
  const collection = Appointment.collection;

  let indexes = [];
  try {
    indexes = await collection.indexes();
  } catch (err) {
    // Collection does not exist yet (fresh database) — nothing to migrate.
    if (err.codeName !== 'NamespaceNotFound') throw err;
  }

  const legacy = indexes.find((idx) => idx.name === 'slotId_1');
  if (legacy) {
    await collection.dropIndex('slotId_1');
    console.log('🛠️ Migration: dropped legacy unique index slotId_1 (cancelled slots can now be rebooked).');
  }

  await Appointment.createIndexes();

  // 3. Patient cards: one card per PERSON instead of one per account. Drop the old unique
  //    index on patientId alone (it forced the whole family onto one card).
  let cardIndexes = [];
  try {
    cardIndexes = await PatientCard.collection.indexes();
  } catch (err) {
    if (err.codeName !== 'NamespaceNotFound') throw err;
  }
  if (cardIndexes.some((idx) => idx.name === 'patientId_1' && idx.unique)) {
    await PatientCard.collection.dropIndex('patientId_1');
    console.log('🛠️ Migration: dropped unique index patientId_1 on cards (each family member now gets their own card).');
  }
  await PatientCard.createIndexes();
};
