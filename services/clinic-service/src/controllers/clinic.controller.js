import Clinic from '../models/clinic.model.js';


const getClinicProfile = async (req, res) => {
    try {
            let clinic = await Clinic.findOne();

    if(!clinic) {
        clinic = await Clinic.create({
            phoneNumber: '+251911000000', // Default placeholder placeholder
        workingHours: {
          openTime: '08:00',
          closeTime: '17:00'
        }
        });
    }
    return res.status(200).json({
      success: true,
      data: clinic
    });
    } catch (error) {
        console.error('Error fetching clinic profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getClinicStatus = async (req, res) => {
  try {
    const clinic = await Clinic.findOne();
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic records not found' });
    }

    // 🕒 Get local time metrics in Ethiopia
    const now = new Date();
    
    // Convert to Ethiopian Local Time (UTC+3) day matching name
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const options = { timeZone: 'Africa/Addis_Ababa' };
    
    const localDayName = dayNames[new Date(now.toLocaleString('en-US', options)).getDay()];
    const localTimeStr = now.toLocaleString('en-US', { 
      timeZone: 'Africa/Addis_Ababa', 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    }); // Formats out as matching "HH:MM" (e.g. "14:30")

    const { openDays, openTime, closeTime, isOpenSaturday, isOpenSunday } = clinic.workingHours;

    let isOpen = false;

    // 1. Check if the current weekday is a designated open day
    let isWorkingDay = openDays.includes(localDayName);
    if (localDayName === 'Saturday' && isOpenSaturday) isWorkingDay = true;
    if (localDayName === 'Sunday' && isOpenSunday) isWorkingDay = true;

    // 2. If it is a working day, evaluate if the current hours fall inside standard operations
    if (isWorkingDay) {
      // Direct string comparison works perfectly with "HH:MM" 24-hour formats!
      if (localTimeStr >= openTime && localTimeStr <= closeTime) {
        isOpen = true;
      }
    }

    return res.status(200).json({
      success: true,
      isOpen,
      localTime: localTimeStr,
      localDay: localDayName
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error computing runtime operational status',
      error: error.message
    });
  }
};
const updateClinicProfile = async (req, res) => {
  try {
    // Find the single clinic document profile or create it if missing
    let clinic = await Clinic.findOne();

    if (!clinic) {
      // If it doesn't exist, build a temporary instance shell so we can save incoming body files
      clinic = new Clinic();
    }

    // Destructure body payloads safely 
    const { 
      name, description, phoneNumber, email, website, 
      city, subCity, woreda, fullAddress, latitude, longitude,
      openDays, openTime, closeTime, isOpenSaturday, isOpenSunday,
      services, logo, coverImage 
    } = req.body;

    // Map top-level field properties if sent in payload request
    if (name) clinic.name = name;
    if (description) clinic.description = description;
    if (phoneNumber) clinic.phoneNumber = phoneNumber;
    if (email) clinic.email = email;
    if (website) clinic.website = website;

    // Map Nested Location Sub-documents 
    if (city) clinic.location.city = city;
    if (subCity) clinic.location.subCity = subCity;
    if (woreda) clinic.location.woreda = woreda;
    if (fullAddress) clinic.location.fullAddress = fullAddress;
    if (latitude !== undefined) clinic.location.coordinates.latitude = latitude;
    if (longitude !== undefined) clinic.location.coordinates.longitude = longitude;

    // Map Nested Working Hours Sub-documents
    if (openDays) clinic.workingHours.openDays = openDays;
    if (openTime) clinic.workingHours.openTime = openTime;
    if (closeTime) clinic.workingHours.closeTime = closeTime;
    if (isOpenSaturday !== undefined) clinic.workingHours.isOpenSaturday = isOpenSaturday;
    if (isOpenSunday !== undefined) clinic.workingHours.isOpenSunday = isOpenSunday;

    // Map Arrays and Media Links
    if (services) clinic.services = services;
    if (logo) clinic.media.logo = logo;
    if (coverImage) clinic.media.coverImage = coverImage;

    // Save modifications down to Atlas
    const updatedClinic = await clinic.save();

    return res.status(200).json({
      success: true,
      message: 'Clinic profile configuration updated successfully',
      data: updatedClinic
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update administrative clinic profile records',
      error: error.message
    });
  }
};

export { getClinicProfile, getClinicStatus ,updateClinicProfile};   