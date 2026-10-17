import Clinic from '../models/clinic.model.js';
import Holiday from '../models/holiday.model.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Helper to safely parse arrays from FormData (supports arrays, JSON strings, or comma-separated values)
const parseArrayField = (val) => {
  if (!val) return undefined;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    val = val.trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      try {
        return JSON.parse(val);
      } catch {
        // Fallback to comma-separated split
      }
    }
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return val;
};

const createClinicProfile = async (req, res) => {
  try {
    let existingClinic = await Clinic.findOne();

    // If an existing profile is the auto-created placeholder or user passed ?overwrite=true
    const isDefaultPlaceholder = existingClinic && existingClinic.phoneNumber === '+251911000000';
    const allowOverwrite = req.query.overwrite === 'true' || isDefaultPlaceholder;

    if (existingClinic && !allowOverwrite) {
      return res.status(409).json({
        success: false,
        message: 'A clinic profile already exists. Use PUT /api/clinics/updateClinicProfile to modify it, or supply ?overwrite=true to replace it.',
        data: existingClinic
      });
    }

    const clinic = existingClinic && allowOverwrite ? existingClinic : new Clinic();

    const {
      name, description, phoneNumber, email, website,
      city, subCity, woreda, fullAddress, latitude, longitude,
      openDays, openTime, closeTime, isOpenSaturday, isOpenSunday,
      services, logo, coverImage
    } = req.body || {};

    if (!phoneNumber && !clinic.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Main reception phone number is required.'
      });
    }

    // Core Clinic Attributes
    clinic.name = name || clinic.name || 'Selam General Clinic';
    if (description !== undefined) clinic.description = description;
    clinic.phoneNumber = phoneNumber || clinic.phoneNumber;
    if (email !== undefined) clinic.email = email;
    if (website !== undefined) clinic.website = website;

    // Location
    clinic.location = clinic.location || {};
    clinic.location.coordinates = clinic.location.coordinates || {};
    clinic.location.city = city || clinic.location.city || 'Addis Ababa';
    if (subCity !== undefined) clinic.location.subCity = subCity;
    if (woreda !== undefined) clinic.location.woreda = woreda;
    if (fullAddress !== undefined) clinic.location.fullAddress = fullAddress;
    if (latitude !== undefined) clinic.location.coordinates.latitude = Number(latitude);
    if (longitude !== undefined) clinic.location.coordinates.longitude = Number(longitude);

    // Working Hours
    clinic.workingHours = clinic.workingHours || {};
    if (openDays) {
      clinic.workingHours.openDays = parseArrayField(openDays);
    } else if (!clinic.workingHours.openDays || clinic.workingHours.openDays.length === 0) {
      clinic.workingHours.openDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    }
    clinic.workingHours.openTime = openTime || clinic.workingHours.openTime || '08:00';
    clinic.workingHours.closeTime = closeTime || clinic.workingHours.closeTime || '17:00';
    if (isOpenSaturday !== undefined) {
      clinic.workingHours.isOpenSaturday = isOpenSaturday === true || isOpenSaturday === 'true';
    }
    if (isOpenSunday !== undefined) {
      clinic.workingHours.isOpenSunday = isOpenSunday === true || isOpenSunday === 'true';
    }

    // Services
    if (services) {
      clinic.services = parseArrayField(services);
    } else if (!clinic.services || clinic.services.length === 0) {
      clinic.services = ['General Checkup', 'Dental', 'Lab'];
    }

    // Media
    clinic.media = clinic.media || {};

    // 🖼️ Handle binary image file uploads directly to Cloudinary
    if (req.files) {
      if (req.files['logo'] && req.files['logo'][0]) {
        clinic.media.logo = await uploadToCloudinary(req.files['logo'][0], 'ethio_clinic_media/logo');
      }
      if (req.files['coverImage'] && req.files['coverImage'][0]) {
        clinic.media.coverImage = await uploadToCloudinary(req.files['coverImage'][0], 'ethio_clinic_media/cover');
      }
    } else if (req.file) {
      if (req.file.fieldname === 'logo') {
        clinic.media.logo = await uploadToCloudinary(req.file, 'ethio_clinic_media/logo');
      } else if (req.file.fieldname === 'coverImage') {
        clinic.media.coverImage = await uploadToCloudinary(req.file, 'ethio_clinic_media/cover');
      }
    }

    if (logo && (!req.files || !req.files['logo'])) clinic.media.logo = logo;
    if (coverImage && (!req.files || !req.files['coverImage'])) clinic.media.coverImage = coverImage;

    const savedClinic = await clinic.save();

    return res.status(201).json({
      success: true,
      message: 'Clinic profile successfully created and saved to database.',
      data: savedClinic
    });
  } catch (error) {
    console.error('Error creating clinic profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create clinic profile',
      error: error.message
    });
  }
};

const getClinicProfile = async (req, res) => {
  try {
    let clinic = await Clinic.findOne();

    if (!clinic) {
      clinic = await Clinic.create({
        phoneNumber: '+251911000000', // Default placeholder
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
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const options = { timeZone: 'Africa/Addis_Ababa' };
    
    // Convert to Ethiopian Local Time (UTC+3) day and date
    const localEthiopianDate = new Date(now.toLocaleString('en-US', options));
    const localDayName = dayNames[localEthiopianDate.getDay()];
    const localTimeStr = now.toLocaleString('en-US', { 
      timeZone: 'Africa/Addis_Ababa', 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    }); // Formats out as matching "HH:MM" (e.g. "14:30")

    const year = localEthiopianDate.getFullYear();
    const month = String(localEthiopianDate.getMonth() + 1).padStart(2, '0');
    const day = String(localEthiopianDate.getDate()).padStart(2, '0');
    const todayDateStr = `${year}-${month}-${day}`;

    // 🏖️ Check if today is designated as a clinic closure or holiday
    const holiday = await Holiday.findOne({ date: todayDateStr, isClosed: true });
    if (holiday) {
      return res.status(200).json({
        success: true,
        isOpen: false,
        isHoliday: true,
        holidayName: holiday.name,
        localDate: todayDateStr,
        localTime: localTimeStr,
        localDay: localDayName,
        message: `Clinic is closed today for ${holiday.name}`
      });
    }

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
      isHoliday: false,
      localDate: todayDateStr,
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
      clinic = new Clinic();
    }

    // Ensure sub-document objects exist before assigning properties
    clinic.location = clinic.location || {};
    clinic.location.coordinates = clinic.location.coordinates || {};
    clinic.workingHours = clinic.workingHours || {};
    clinic.media = clinic.media || {};

    // Destructure body payloads safely 
    const { 
      name, description, phoneNumber, email, website, 
      city, subCity, woreda, fullAddress, latitude, longitude,
      openDays, openTime, closeTime, isOpenSaturday, isOpenSunday,
      services, logo, coverImage 
    } = req.body || {};

    // Map top-level field properties if sent in payload request
    if (name) clinic.name = name;
    if (description !== undefined) clinic.description = description;
    if (phoneNumber) clinic.phoneNumber = phoneNumber;
    if (email !== undefined) clinic.email = email;
    if (website !== undefined) clinic.website = website;

    // Map Nested Location Sub-documents 
    if (city) clinic.location.city = city;
    if (subCity !== undefined) clinic.location.subCity = subCity;
    if (woreda !== undefined) clinic.location.woreda = woreda;
    if (fullAddress !== undefined) clinic.location.fullAddress = fullAddress;
    if (latitude !== undefined && latitude !== '' && !isNaN(Number(latitude))) {
      clinic.location.coordinates.latitude = Number(latitude);
    }
    if (longitude !== undefined && longitude !== '' && !isNaN(Number(longitude))) {
      clinic.location.coordinates.longitude = Number(longitude);
    }

    // Map Nested Working Hours Sub-documents (handles stringified JSON arrays or comma-separated strings from FormData)
    if (openDays) clinic.workingHours.openDays = parseArrayField(openDays);
    if (openTime) clinic.workingHours.openTime = openTime;
    if (closeTime) clinic.workingHours.closeTime = closeTime;
    if (isOpenSaturday !== undefined) {
      clinic.workingHours.isOpenSaturday = isOpenSaturday === true || isOpenSaturday === 'true';
    }
    if (isOpenSunday !== undefined) {
      clinic.workingHours.isOpenSunday = isOpenSunday === true || isOpenSunday === 'true';
    }

    // Map Arrays (handles stringified JSON arrays or comma-separated strings from FormData)
    if (services) clinic.services = parseArrayField(services);

    // 🖼️ Handle binary image file uploads directly to Cloudinary
    if (req.files) {
      if (req.files['logo'] && req.files['logo'][0]) {
        clinic.media.logo = await uploadToCloudinary(req.files['logo'][0], 'ethio_clinic_media/logo');
      }
      if (req.files['coverImage'] && req.files['coverImage'][0]) {
        clinic.media.coverImage = await uploadToCloudinary(req.files['coverImage'][0], 'ethio_clinic_media/cover');
      }
    } else if (req.file) {
      if (req.file.fieldname === 'logo') {
        clinic.media.logo = await uploadToCloudinary(req.file, 'ethio_clinic_media/logo');
      } else if (req.file.fieldname === 'coverImage') {
        clinic.media.coverImage = await uploadToCloudinary(req.file, 'ethio_clinic_media/cover');
      }
    }

    // Direct URL strings fallback if no binary file was attached
    if (logo && (!req.files || !req.files['logo'])) clinic.media.logo = logo;
    if (coverImage && (!req.files || !req.files['coverImage'])) clinic.media.coverImage = coverImage;

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

const uploadClinicMedia = async (req, res) => {
  try {
    let clinic = await Clinic.findOne();
    if (!clinic) {
      clinic = new Clinic();
    }
    clinic.media = clinic.media || {};

    const uploaded = {};

    if (req.files) {
      if (req.files['logo'] && req.files['logo'][0]) {
        const logoUrl = await uploadToCloudinary(req.files['logo'][0], 'ethio_clinic_media/logo');
        clinic.media.logo = logoUrl;
        uploaded.logo = logoUrl;
      }
      if (req.files['coverImage'] && req.files['coverImage'][0]) {
        const coverUrl = await uploadToCloudinary(req.files['coverImage'][0], 'ethio_clinic_media/cover');
        clinic.media.coverImage = coverUrl;
        uploaded.coverImage = coverUrl;
      }
    } else if (req.file) {
      if (req.file.fieldname === 'logo') {
        const logoUrl = await uploadToCloudinary(req.file, 'ethio_clinic_media/logo');
        clinic.media.logo = logoUrl;
        uploaded.logo = logoUrl;
      } else if (req.file.fieldname === 'coverImage') {
        const coverUrl = await uploadToCloudinary(req.file, 'ethio_clinic_media/cover');
        clinic.media.coverImage = coverUrl;
        uploaded.coverImage = coverUrl;
      }
    }

    if (Object.keys(uploaded).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided. Please attach a "logo" or "coverImage" file.'
      });
    }

    await clinic.save();

    return res.status(200).json({
      success: true,
      message: 'Clinic media uploaded and saved to database successfully',
      data: {
        ...uploaded,
        media: clinic.media
      }
    });
  } catch (error) {
    console.error('Error uploading clinic media:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload clinic media',
      error: error.message
    });
  }
};

export { getClinicProfile, getClinicStatus, createClinicProfile, updateClinicProfile, uploadClinicMedia };   