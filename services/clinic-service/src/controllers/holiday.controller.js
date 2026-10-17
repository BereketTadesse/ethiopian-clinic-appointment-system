import Holiday from '../models/holiday.model.js';
import Slot from '../models/slot.model.js';

/**
 * Get all clinic holidays and closure dates
 * Optional query: ?upcoming=true (filters for today and future dates)
 */
export const getAllHolidays = async (req, res) => {
  try {
    const { upcoming } = req.query;
    let queryFilter = {};

    if (upcoming === 'true') {
      const todayStr = new Date().toISOString().split('T')[0];
      queryFilter.date = { $gte: todayStr };
    }

    const holidays = await Holiday.find(queryFilter).sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: holidays.length,
      data: holidays
    });
  } catch (error) {
    console.error('Error fetching clinic holidays:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve clinic holidays',
      error: error.message
    });
  }
};

/**
 * Admin: Declare a specific date as a holiday or clinic closure day.
 * Automatically deletes/cancels existing unbooked slots on that day to prevent new bookings.
 */
export const createHoliday = async (req, res) => {
  try {
    const { date, name, description, isClosed } = req.body;

    if (!date || !name) {
      return res.status(400).json({
        success: false,
        message: 'Both date (YYYY-MM-DD) and name/reason are required.'
      });
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD (e.g. 2026-09-11).'
      });
    }

    // Check if already registered
    const existing = await Holiday.findOne({ date });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Date ${date} is already registered as a clinic closure (${existing.name}).`,
        data: existing
      });
    }

    const holiday = await Holiday.create({
      date,
      name,
      description: description || '',
      isClosed: isClosed !== undefined ? isClosed : true,
      createdBy: req.user?.id || null
    });

    // 🧹 CASCADE: Clean up existing unbooked slots for that date so patients cannot book them!
    const slotRemovalResult = await Slot.deleteMany({
      date,
      status: 'available'
    });

    // Check if any patients had already booked on that date before it was declared a holiday
    const existingBookedCount = await Slot.countDocuments({
      date,
      status: 'booked'
    });

    console.log(`🏖️ [Holiday Admin] Designated ${date} as holiday (${name}). Removed ${slotRemovalResult.deletedCount} unbooked slot(s).`);

    return res.status(201).json({
      success: true,
      message: `Successfully declared ${date} as clinic holiday (${name}).`,
      data: holiday,
      cleanupSummary: {
        unbookedSlotsRemoved: slotRemovalResult.deletedCount,
        existingBookedAppointmentsNotice: existingBookedCount > 0 
          ? `⚠️ Warning: ${existingBookedCount} patient appointment(s) were already booked on this day and require manual rescheduling.`
          : 'Zero conflicting appointments were booked on this date.'
      }
    });
  } catch (error) {
    console.error('Error creating clinic holiday:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create clinic holiday',
      error: error.message
    });
  }
};

/**
 * Admin: Remove a holiday or clinic closure (re-opens the clinic for that date)
 */
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    // Support deleting by Mongo ObjectId OR by direct date string (YYYY-MM-DD)
    const holiday = await Holiday.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { date: id }]
    });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday / closure record not found.'
      });
    }

    console.log(`✅ [Holiday Admin] Removed holiday for ${holiday.date} (${holiday.name}). Clinic is now open for scheduling.`);

    return res.status(200).json({
      success: true,
      message: `Holiday for ${holiday.date} (${holiday.name}) removed. Clinic reopened for scheduling.`
    });
  } catch (error) {
    console.error('Error deleting clinic holiday:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete clinic holiday',
      error: error.message
    });
  }
};

/**
 * Admin: One-click seed of prominent Ethiopian national & religious holidays
 */
export const seedEthiopianHolidays = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    // Standard prominent Ethiopian public holidays (Gregorian equivalents)
    const baseHolidays = [
      { date: `${currentYear}-01-07`, name: 'Genna (Ethiopian Christmas / ገና)' },
      { date: `${currentYear}-01-19`, name: 'Timket (Ethiopian Epiphany / ጥምቀት)' },
      { date: `${currentYear}-03-02`, name: 'Adwa Victory Day (የዐድዋ ድል በዓል)' },
      { date: `${currentYear}-05-01`, name: 'International Labor Day (የሠራተኞች ቀን)' },
      { date: `${currentYear}-05-05`, name: 'Patriots Victory Day (የአርበኞች ቀን)' },
      { date: `${currentYear}-05-28`, name: 'Downfall of the Derg (ግንቦት 20)' },
      { date: `${currentYear}-09-11`, name: 'Enkutatash (Ethiopian New Year / እንቁጣጣሽ)' },
      { date: `${currentYear}-09-27`, name: 'Meskel (Finding of the True Cross / መስቀል)' },
      
      // Next Year early holidays
      { date: `${nextYear}-01-07`, name: 'Genna (Ethiopian Christmas / ገና)' },
      { date: `${nextYear}-01-19`, name: 'Timket (Ethiopian Epiphany / ጥምቀት)' },
      { date: `${nextYear}-03-02`, name: 'Adwa Victory Day (የዐድዋ ድል በዓል)' },
      { date: `${nextYear}-09-11`, name: 'Enkutatash (Ethiopian New Year / እንቁጣጣሽ)' },
      { date: `${nextYear}-09-27`, name: 'Meskel (Finding of the True Cross / መስቀል)' }
    ];

    let seededCount = 0;
    for (const h of baseHolidays) {
      const exists = await Holiday.findOne({ date: h.date });
      if (!exists) {
        await Holiday.create({
          date: h.date,
          name: h.name,
          description: 'Official Ethiopian National / Public Holiday',
          isClosed: true,
          createdBy: req.user?.id || 'SYSTEM'
        });
        seededCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Seeded ${seededCount} Ethiopian national holidays into clinic calendar.`,
      seededCount
    });
  } catch (error) {
    console.error('Error seeding Ethiopian holidays:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to seed Ethiopian holidays',
      error: error.message
    });
  }
};
