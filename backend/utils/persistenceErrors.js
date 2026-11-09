const isUniqueConstraintError = (error) => (
  error?.code === 'UNIQUE_CONSTRAINT'
  || error?.name === 'SequelizeUniqueConstraintError'
);

export { isUniqueConstraintError };
