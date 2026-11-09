import AppError from './AppError.js';

const requireFields = (source, fields) => {
  const missing = fields.filter((field) => {
    const value = source[field];
    return value === undefined || value === null || (typeof value === 'string' && !value.trim());
  });
  if (missing.length) {
    throw new AppError(`Required fields: ${missing.join(', ')}`, 400, 'VALIDATION_ERROR');
  }
};

export { requireFields };
