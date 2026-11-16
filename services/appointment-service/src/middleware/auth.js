import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!accessSecret) {
      return res.status(500).json({ message: 'Server authentication configuration error.' });
    }
    const decoded = jwt.verify(token, accessSecret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorizePatient = (req, res, next) => {
  if (req.user?.role !== 'patient') {
    return res.status(403).json({ message: 'Access denied: Patient role required' });
  }
  next();
};

export const authorizeDoctor = (req, res, next) => {
  if (req.user?.role !== 'doctor') {
    return res.status(403).json({ message: 'Access denied: Doctor role required' });
  }
  next();
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin role required' });
  }
  next();
};

export const authorizeStaff = (req, res, next) => {
  if (['admin', 'receptionist'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Admin or Receptionist role required' });
};

export const authorizePatientOrStaff = (req, res, next) => {
  if (['patient', 'admin', 'receptionist'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Patient or Staff role required' });
};

export const authorizeStaffOrDoctor = (req, res, next) => {
  if (['admin', 'receptionist', 'doctor'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Staff or Doctor role required' });
};


