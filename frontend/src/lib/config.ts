// API configuration
export const API_URL = 'http://localhost:5000/api';

export const getAssetUrl = (path?: string | null) => (
  path ? new URL(path, API_URL).toString() : undefined
);

// Token storage keys
export const TOKEN_KEY = 'auth_token';
export const USER_KEY = 'user';