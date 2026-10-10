/**
 * validators.js — Centralized Frontend Validation Utility
 * ApniSamaj — Production-Level Auth Form Validation
 *
 * RULES:
 * - All functions accept a raw value and return { valid: boolean, error: string }
 * - Same regex patterns as backend authValidator.js (Single Source of Truth)
 * - No third-party dependencies
 */

// ─── ALLOWED ENUM VALUES ─────────────────────────────────────────────────────
export const ALLOWED_GENDERS = ['Male', 'Female', 'Other'];
export const ALLOWED_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
export const ALLOWED_MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'];
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// ─── TEXT NORMALIZATION ───────────────────────────────────────────────────────
export const normalizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ');
};

export const sanitizeText = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

/**
 * Build a clean API payload — omit undefined/null/empty-string fields
 */
export const buildCleanPayload = (obj) => {
  const clean = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val === undefined || val === null) return;
    if (typeof val === 'string' && val.trim() === '') return;
    clean[key] = typeof val === 'string' ? normalizeString(val) : val;
  });
  return clean;
};

// ─── FIELD VALIDATORS ─────────────────────────────────────────────────────────

/**
 * Name: letters, Hindi chars, and spaces only, 2–60 chars
 */
export const validateName = (str) => {
  const val = normalizeString(str || '');
  if (!val) return { valid: false, error: 'Name is required.' };
  if (val.length < 2) return { valid: false, error: 'Name must be at least 2 characters.' };
  if (val.length > 60) return { valid: false, error: 'Name cannot exceed 60 characters.' };
  if (!/^[a-zA-Z\u0900-\u097F ]+$/.test(val)) {
    return { valid: false, error: 'Name can contain only letters and spaces.' };
  }
  return { valid: true, error: '' };
};

/**
 * Phone: exactly 10 digits
 */
export const validatePhone = (str) => {
  const val = (str || '').replace(/\D/g, '');
  if (!val) return { valid: false, error: 'Mobile number is required.' };
  if (val.length !== 10) return { valid: false, error: 'Mobile number must contain exactly 10 digits.' };
  return { valid: true, error: '' };
};

/**
 * Email: standard RFC format
 */
export const validateEmail = (str, required = false) => {
  const val = (str || '').trim().toLowerCase();
  if (!val) {
    if (required) return { valid: false, error: 'Email address is required.' };
    return { valid: true, error: '' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(val)) {
    return { valid: false, error: 'Enter a valid email address (e.g. name@example.com).' };
  }
  return { valid: true, error: '' };
};

/**
 * Password: min 6, max 30 chars
 */
export const validatePassword = (str) => {
  const val = str || '';
  if (!val) return { valid: false, error: 'Password is required.' };
  if (val.length < 6) return { valid: false, error: 'Password must be at least 6 characters.' };
  if (val.length > 30) return { valid: false, error: 'Password cannot exceed 30 characters.' };
  return { valid: true, error: '' };
};

/**
 * Confirm password: must match
 */
export const validateConfirmPassword = (password, confirm) => {
  if (!confirm) return { valid: false, error: 'Please confirm your password.' };
  if (password !== confirm) return { valid: false, error: 'Passwords do not match.' };
  return { valid: true, error: '' };
};

/**
 * Password strength: returns 'weak' | 'medium' | 'strong'
 */
export const getPasswordStrength = (str) => {
  if (!str || str.length < 4) return 'weak';
  let score = 0;
  if (str.length >= 8) score++;
  if (/[A-Z]/.test(str)) score++;
  if (/[0-9]/.test(str)) score++;
  if (/[^a-zA-Z0-9]/.test(str)) score++;
  if (score <= 1) return 'weak';
  if (score === 2) return 'medium';
  return 'strong';
};

/**
 * Pincode: exactly 6 digits (optional unless flagged required)
 */
export const validatePincode = (str, required = false) => {
  const val = (str || '').replace(/\D/g, '');
  if (!val) {
    if (required) return { valid: false, error: 'PIN Code is required.' };
    return { valid: true, error: '' };
  }
  if (val.length !== 6) return { valid: false, error: 'PIN Code must contain exactly 6 digits.' };
  return { valid: true, error: '' };
};

/**
 * Age: number, 0–120
 */
export const validateAge = (val) => {
  if (val === '' || val === null || val === undefined) return { valid: true, error: '' };
  const num = parseInt(val, 10);
  if (isNaN(num)) return { valid: false, error: 'Age must be a number.' };
  if (num < 0 || num > 120) return { valid: false, error: 'Age must be between 0 and 120.' };
  return { valid: true, error: '' };
};

/**
 * DOB: valid date, not future, age 5–120 years
 */
export const validateDOB = (str) => {
  if (!str) return { valid: true, error: '' };
  const date = new Date(str);
  if (isNaN(date.getTime())) return { valid: false, error: 'Enter a valid date of birth.' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return { valid: false, error: 'Date of birth cannot be in the future.' };
  const age = Math.floor((today - date) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 5) return { valid: false, error: 'Age must be at least 5 years.' };
  if (age > 120) return { valid: false, error: 'Please enter a valid date of birth.' };
  return { valid: true, error: '' };
};

/**
 * Enum: value must be in allowed list (optional field)
 */
export const validateEnum = (val, allowedList, fieldName = 'This field') => {
  if (!val || val === '') return { valid: true, error: '' };
  if (!allowedList.includes(val)) {
    return { valid: false, error: `${fieldName} has an invalid value. Please select from the available options.` };
  }
  return { valid: true, error: '' };
};

/**
 * Optional text: max length + no HTML injection
 */
export const validateOptionalText = (str, maxLen = 100) => {
  if (!str) return { valid: true, error: '' };
  const val = normalizeString(str);
  if (val.length > maxLen) return { valid: false, error: `Cannot exceed ${maxLen} characters.` };
  if (/<[^>]*>/.test(val)) return { valid: false, error: 'Invalid characters detected.' };
  return { valid: true, error: '' };
};

/**
 * Optional phone: 10 digits if provided
 */
export const validateOptionalPhone = (str) => {
  if (!str || str.trim() === '') return { valid: true, error: '' };
  return validatePhone(str);
};

/**
 * Image file: MIME type + extension + size + basic corruption check
 */
export const validateImageFile = (file) => {
  if (!file) return { valid: true, error: '' };
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Please upload a JPG, PNG, or WEBP image file.' };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid image format. Only JPG, PNG, and WEBP are allowed.' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: 'Image size must be under 5MB.' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'The selected file appears to be empty or corrupted.' };
  }
  return { valid: true, error: '' };
};

/**
 * Login identifier: auto-detect email vs phone vs loginId
 */
export const validateIdentifier = (str) => {
  const val = (str || '').trim();
  if (!val) return { valid: false, error: 'Please enter your email or mobile number.' };
  const isDigitsOnly = /^\d+$/.test(val);
  const hasAt = val.includes('@');
  if (isDigitsOnly) {
    return validatePhone(val);
  } else if (hasAt) {
    return validateEmail(val, true);
  } else {
    if (val.length < 3) return { valid: false, error: 'Enter a valid email address or 10-digit mobile number.' };
    return { valid: true, error: '' };
  }
};

/**
 * Paste validation: validate + sanitize pasted text by field type
 * Returns { valid, sanitized, error }
 */
export const validatePastedValue = (pastedText, fieldType) => {
  const val = (pastedText || '').trim();
  switch (fieldType) {
    case 'phone': {
      const digits = val.replace(/\D/g, '');
      if (digits.length !== 10) {
        return { valid: false, sanitized: '', error: 'Mobile number must be exactly 10 digits. Invalid value rejected.' };
      }
      return { valid: true, sanitized: digits, error: '' };
    }
    case 'name': {
      if (!/^[a-zA-Z\u0900-\u097F ]+$/.test(val)) {
        return { valid: false, sanitized: '', error: 'Name can contain only letters and spaces.' };
      }
      return { valid: true, sanitized: normalizeString(val), error: '' };
    }
    case 'pincode': {
      const digits = val.replace(/\D/g, '');
      if (digits.length !== 6) {
        return { valid: false, sanitized: '', error: 'PIN Code must be exactly 6 digits.' };
      }
      return { valid: true, sanitized: digits, error: '' };
    }
    case 'email': {
      const res = validateEmail(val, false);
      return { valid: res.valid, sanitized: val.toLowerCase(), error: res.error };
    }
    default:
      return { valid: true, sanitized: val, error: '' };
  }
};

/**
 * Alphanumeric: letters and numbers only (for referral codes)
 */
export const validateAlphanumeric = (str) => {
  if (!str) return { valid: true, error: '' };
  if (!/^[a-zA-Z0-9]+$/.test(str.trim())) {
    return { valid: false, error: 'Only letters and numbers are allowed.' };
  }
  return { valid: true, error: '' };
};

/**
 * URL: valid HTTP/HTTPS if provided
 */
export const validateUrl = (str) => {
  if (!str || str.trim() === '') return { valid: true, error: '' };
  try {
    const url = new URL(str.trim());
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'URL must start with http:// or https://.' };
    }
    return { valid: true, error: '' };
  } catch {
    return { valid: false, error: 'Enter a valid URL (e.g. https://example.com).' };
  }
};
