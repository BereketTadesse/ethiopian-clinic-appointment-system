import Slot from '../models/slot.model.js';

// Helper: Convert "HH:MM" string to total minutes from midnight (e.g., "08:30" -> 510)
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper: Convert total minutes back to an standard "HH:MM" 24hr string (e.g., 550 -> "09:10")
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Core Algorithm Engine: Slices a doctor's shift into 40-minute appointment blocks
 */
export const generateSlotsForDoctor = async (doctor, dateStr) => {
  const { startTime, endTime, breakStart, breakEnd } = doctor;
  const SLOT_DURATION = 40; // 🎯 Set precisely to 40 minutes

  let currentMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  const breakStartMinutes = breakStart ? timeToMinutes(breakStart) : null;
  const breakEndMinutes = breakEnd ? timeToMinutes(breakEnd) : null;

  const slotsToCreate = [];

  // Loop forward while there is enough time left in the shift to fit a full 40-minute session
  while (currentMinutes + SLOT_DURATION <= endMinutes) {
    const slotStart = currentMinutes;
    const slotEnd = currentMinutes + SLOT_DURATION;

    // 🥪 LUNCH BREAK GUARD: If the slot overlaps with the lunch break, step over it
    if (breakStartMinutes !== null && breakEndMinutes !== null) {
      // Check if the slot starts during lunch, or ends during lunch, or wraps around lunch
      const overlapsBreak = (slotStart >= breakStartMinutes && slotStart < breakEndMinutes) ||
                            (slotEnd > breakStartMinutes && slotEnd <= breakEndMinutes);
      
      if (overlapsBreak) {
        // Skip straight to the end of the lunch break window and check the next slot
        currentMinutes = breakEndMinutes;
        continue;
      }
    }

    // Convert the calculated raw minutes back into clean time strings
    const startTimeStr = minutesToTime(slotStart);
    const endTimeStr = minutesToTime(slotEnd);

    slotsToCreate.push({
      doctorId: doctor._id,
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      status: 'available'
    });

    // Move the clock forward by 40 minutes for the next patient!
    currentMinutes += SLOT_DURATION;
  }

  // Save the generated slots batch to MongoDB Atlas. 
  // ordered: false avoids crashing the entire array if one slot already exists
  if (slotsToCreate.length > 0) {
    try {
      await Slot.insertMany(slotsToCreate, { ordered: false });
      console.log(`✅ Generated ${slotsToCreate.length} slots (40-min blocks) for Doctor ${doctor._id} on ${dateStr}`);
    } catch (dbError) {
      // Ignore duplicate key errors if some slots were already initialized previously
      if (dbError.code !== 11000) {
        console.error(`❌ Error saving slots batch: ${dbError.message}`);
      }
    }
  }
};