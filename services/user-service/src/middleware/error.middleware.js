import { AppError } from '../utils/appError.js';

/**
 * Handle Mongoose CastError (e.g. invalid ObjectId)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose duplicate key error (code 11000)
 */
const handleDuplicateFieldsDB = (err) => {
  // Extract key name and value causing the collision
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : '';
  const message = `Duplicate value '${value}' for ${field}. Please use another value.`;
  return new AppError(message, 409);
};

/**
 * Handle Mongoose ValidationError
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  return new AppError('Database validation failed', 400, errors);
};

/**
 * Handle JWT Errors
 */
const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired. Please log in again.', 401);

/**
 * Centralized Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.code = err.code;

  // 1. Zod Validation Errors
  if (err.name === 'ZodError') {
    const rawIssues = err.issues || err.errors || [];
    const formattedErrors = rawIssues.map((e) => {
      // Clean up path: e.g. ['body', 'email'] -> 'email'
      const cleanPath = e.path && e.path.length > 1 && ['body', 'query', 'params'].includes(e.path[0])
        ? e.path.slice(1).join('.')
        : (e.path ? e.path.join('.') : '');

      return {
        field: cleanPath,
        message: e.message,
      };
    });

    // Use the specific validator message as the primary message (e.g. "Invalid email address")
    const primaryMessage = formattedErrors[0]?.message || 'Validation failed';

    return res.status(400).json({
      success: false,
      message: primaryMessage,
      errors: formattedErrors,
    });
  }

  // 2. Mongoose Specific Errors
  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);

  // 3. JWT Specific Errors
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;

  // Log unhandled non-operational crashes for debugging
  if (!isOperational && statusCode === 500) {
    console.error('🔥 CRITICAL UNHANDLED ERROR:', err);
  }

  return res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    ...(process.env.NODE_ENV !== 'production' && !isOperational && { stack: err.stack }),
  });
};

/**
 * 404 Route Not Found Middleware
 */
export const notFoundHandler = (req, res, next) => {
  return res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
};

export default errorHandler;
