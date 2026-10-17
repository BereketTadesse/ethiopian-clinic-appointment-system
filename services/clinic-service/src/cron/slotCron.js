import cron from 'node-cron';
import Doctor from '../models/doctor.model.js';
import Slot from '../models/slot.model.js';
import Holiday from '../models/holiday.model.js';
import { generateSlotsForDoctor } from '../utils/slotGenerator.js';

/**
 * Automatically calculates a date offset by a specific number of days,
 * forcing the calculations to match the true calendar date in Ethiopia.
 */
export const getEthiopianTargetDateInfo = (daysAhead = 1) => {
  // 1. Create a date object based on the server's current environment clock
  const systemDate = new Date();
  
  // 2. Adjust for timezone offset shifts manually to target 'Africa/Addis_Ababa'
  // Addis Ababa is UTC+3. This safely normalizes the date calculation anywhere.
  const targetTime = systemDate.getTime() + (systemDate.getTimezoneOffset() * 60000) + (3 * 3600000);
  const localTargetDate = new Date(targetTime);
  
  // Advance the clock to the target day (default 1 day ahead = Tomorrow)
  localTargetDate.setDate(localTargetDate.getDate() + daysAhead);

  // 3. Format date components cleanly to match model schemas
  const year = localTargetDate.getFullYear();
  const month = String(localTargetDate.getMonth() + 1).padStart(2, '0');
  const day = String(localTargetDate.getDate()).padStart(2, '0');
  
  const dateString = `${year}-${month}-${day}`; // Format: 'YYYY-MM-DD'

  // 4. Map the standard JavaScript day index to your availableDays strings
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysOfWeek[localTargetDate.getDay()];

  return { dateString, dayName };
};

/**
 * 🧹 Expired Slot Cleanup Task:
 * Transitions unbooked slots from previous calendar days (date < today) to 'expired'
 * to maintain clean slot inventory and optimal database indexing.
 */
export const cleanExpiredSlots = async () => {
  try {
    const { dateString: todayStr } = getEthiopianTargetDateInfo(0);

    const result = await Slot.updateMany(
      {
        date: { $lt: todayStr },
        status: 'available'
      },
      {
        $set: { status: 'expired' }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`🧹 [Slot Cleanup] Marked ${result.modifiedCount} outdated unbooked slot(s) before ${todayStr} as 'expired'.`);
    }
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ [Slot Cleanup Error]: Failed to clean expired slots:', error.message);
    return 0;
  }
};

/**
 * Background Task Rule: Scans all active medical personnel schedules 
 * and pre-allocates empty 40-minute blocks for the target day.
 * Respects clinic holidays and doctor approved leaves.
 */
export const runDailySlotAllocation = async (daysAhead = 1) => {
  try {
    // 1. Run expired slot cleanup for past unbooked slots
    await cleanExpiredSlots();

    // 2. We calculate the schedule for the target day (default = tomorrow)
    const { dateString, dayName } = getEthiopianTargetDateInfo(daysAhead);
    const label = daysAhead === 0 ? 'today' : daysAhead === 1 ? 'tomorrow' : `${daysAhead} days ahead`;

    // 3. 🏖️ HOLIDAY & CLINIC CLOSURE GUARD:
    // Check if the target day is declared as an official holiday or admin closure
    const holiday = await Holiday.findOne({ date: dateString, isClosed: true });
    if (holiday) {
      console.log(`🏖️ [Cron System] Target date ${dateString} is a registered clinic closure (${holiday.name}). Slot generation skipped.`);
      return;
    }

    console.log(`⏰ [Cron System] Initiating automatic slot inventory allocation for ${label}: ${dateString} (${dayName})...`);

    // 4. Fetch only doctors who are active and currently accepting patients
    const activeDoctors = await Doctor.find({ isActive: true, isAcceptingPatients: true });

    if (activeDoctors.length === 0) {
      console.log('ℹ️ [Cron System] No active doctor profiles found in the database. Allocation skipped.');
      return;
    }

    let generatedCount = 0;
    let skippedLeaveCount = 0;

    console.log(`📋 [Cron System] Found ${activeDoctors.length} active doctor(s). Checking availability for ${dayName}...`);

    // 5. Loop through every doctor and check if they work on that day of the week & are not on leave
    for (const doctor of activeDoctors) {
      // 🏖️ DOCTOR LEAVE GUARD: Check if the doctor has an approved leave spanning this date
      const isOnLeave = doctor.leaves?.some(l => 
        l.status === 'approved' && dateString >= l.startDate && dateString <= l.endDate
      );

      if (isOnLeave) {
        skippedLeaveCount++;
        console.log(`🌴 [Cron System] Doctor ${doctor._id} is on approved leave on ${dateString}. Slot generation skipped.`);
        continue;
      }

      // Case-insensitive comparison — handles 'monday' and 'Monday' equally
      if (doctor.availableDays.map(d => d.toLowerCase()).includes(dayName.toLowerCase())) {
        await generateSlotsForDoctor(doctor, dateString);
        generatedCount++;
      } else {
        console.log(`⏭️  [Cron System] Doctor ${doctor._id} skipped — not scheduled on ${dayName}. Their days: [${doctor.availableDays.join(', ')}]`);
      }
    }

    console.log(`🏁 [Cron System] Slot generation completed for ${dateString}: Allocated slots for ${generatedCount} doctor(s) (Skipped on leave: ${skippedLeaveCount}).`);
  } catch (error) {
    console.error(`❌ [Cron System Critical Error]: Failed to execute automatic daily slots batch setup:`, error.message);
  }
};

/**
 * Initialize the system scheduler daemon rule.
 * Schedule string syntax: "0 0 * * *" = Executes exactly at 00:00 (Midnight) every single night.
 */
export const initSlotCronScheduler = () => {
  cron.schedule('0 0 * * *', async () => {
    await runDailySlotAllocation();
  }, {
    scheduled: true,
    timezone: "Africa/Addis_Ababa" // Forces the cron scheduler rule loop to ring exactly at midnight Ethiopian time!
  });
  
  console.log('🚀 [Scheduler Status]: Midnight 40-Minute Slot Generation Cron Job successfully mounted.');
};