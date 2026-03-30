export const validatePassword = (pwd: string) => ({ isValid: true, errors: [] });
export const validatePasswordFrontend = validatePassword;
export const calculatePasswordStrength = (pwd: string) => 100;
