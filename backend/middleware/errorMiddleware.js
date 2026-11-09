import AppError from '../utils/AppError.js';

export const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
};

export const errorHandler = (error, req, res, next) => {
  let normalizedError = error;

  if (error.type === 'entity.too.large') {
    normalizedError = new AppError('Uploaded image must be 2 MB or smaller', 413, 'PAYLOAD_TOO_LARGE');
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    normalizedError = new AppError('A record with these values already exists', 409, 'CONFLICT');
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    normalizedError = new AppError('The referenced record does not exist or is in use', 409, 'CONFLICT');
  } else if (error.name === 'SequelizeValidationError') {
    normalizedError = new AppError(error.errors.map((item) => item.message).join(', '), 400, 'VALIDATION_ERROR');
  } else if (!(error instanceof AppError)) {
    console.error('Unhandled request error:', error);
    normalizedError = new AppError('Internal server error', 500, 'INTERNAL_ERROR');
  }

  const statusCode = normalizedError.statusCode || 500;
  const payload = {
    message: normalizedError.message,
    code: normalizedError.code || 'INTERNAL_ERROR'
  };

  if (process.env.NODE_ENV !== 'production' && error.name === 'SequelizeDatabaseError') {
    payload.details = error.message;
  }

  res.status(statusCode).json(payload);
};
