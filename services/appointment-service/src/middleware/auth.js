import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
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
