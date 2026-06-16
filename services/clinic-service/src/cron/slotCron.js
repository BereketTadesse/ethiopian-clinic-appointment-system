import cron from 'node-cron';
import Doctor from '../models/doctor.model.js';
import { generateSlotsForDoctor } from '../utils/slotGenerator.js';

/**
 * Automatically calculates a date offset by a specific number of days,
 * forcing the calculations to match the true calendar date in Ethiopia.
 */
const getEthiopianTargetDateInfo = (daysAhead = 1) => {
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
 * Background Task Rule: Scans all active medical personnel schedules 
 * and pre-allocates empty 40-minute blocks for the target day.
 */
export const runDailySlotAllocation = async () => {
  try {
    // We calculate the schedule for Tomorrow (1 day ahead)
    const { dateString, dayName } = getEthiopianTargetDateInfo(1);
    
    console.log(`⏰ [Cron System] Initiating automatic slot inventory allocation for tomorrow: ${dateString} (${dayName})...`);

    // 1. Fetch only doctors who are active and currently accepting patients
    const activeDoctors = await Doctor.find({ isActive: true, isAcceptingPatients: true });

    if (activeDoctors.length === 0) {
      console.log('ℹ️ [Cron System] No active doctor profiles found in the database. Allocation skipped.');
      return;
    }

    let generatedCount = 0;

    // 2. Loop through every doctor and check if they work on that day of the week
    for (const doctor of activeDoctors) {
      if (doctor.availableDays.includes(dayName)) {
        await generateSlotsForDoctor(doctor, dateString);
        generatedCount++;
      }
    }

    console.log(`🏁 [Cron System] Midnight slot batch generation completed. Successfully allocated slots for ${generatedCount} doctors.`);
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