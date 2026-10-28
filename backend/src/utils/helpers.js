// Backend utility helper functions

export const formatResponse = (success, data, message = "") => {
  return {
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const generateToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
