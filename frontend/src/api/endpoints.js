
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Base URL without /api suffix for direct endpoint usage
export const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
  USER: {
    PROFILE: `${API_BASE_URL}/user/profile`,
    UPDATE: `${API_BASE_URL}/user/update`,
  },
};

export const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    return await response.json();
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

