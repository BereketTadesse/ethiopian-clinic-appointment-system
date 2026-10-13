/**
 * Custom application error class for operational errors with explicit HTTP status codes
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Flag to identify expected/handled operational errors
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
