import AppError from './AppError.js';

const parsePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400, 'VALIDATION_ERROR');
  }
  return parsed;
};

export { parsePositiveInteger };
