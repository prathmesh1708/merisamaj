/**
 * authValidator.js — Backend Validation Middleware
 * MeriSamaj — Production-Level Auth API Validation
 *
 * RULES:
 * - Same regex patterns as frontend validators.js (Single Source of Truth)
 * - Returns standardized { success: false, errors: { field: message } } JSON
 * - Sanitizes/strips unknown fields from req.body (whitelist approach)
 * - No third-party validation libraries
 */

'use strict';

// ─── ALLOWED ENUM VALUES (mirrors frontend validators.js) ─────────────────────
const ALLOWED_GENDERS = ['Male', 'Female', 'Other'];
const ALLOWED_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const ALLOWED_MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'];

// ─── REGEX PATTERNS (identical to frontend) ───────────────────────────────────
const NAME_REGEX = /^[a-zA-Z\u0900-\u097F ]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────
const normalizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ');
};

const normalizePhone = (str) => {
  if (!str) return '';
  return String(str).replace(/\D/g, '');
};

const sendValidationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    errors,
  });
};

// ─── WHITELIST FIELD SANITIZER ────────────────────────────────────────────────
const sanitizeBody = (req, allowedFields) => {
  Object.keys(req.body).forEach((key) => {
    if (!allowedFields.includes(key)) {
      delete req.body[key];
    }
  });
};

// ─── REGISTER VALIDATOR ───────────────────────────────────────────────────────
const validateRegister = (req, res, next) => {
  const ALLOWED_FIELDS = ['name', 'phone', 'email', 'password', 'referralCode'];
  sanitizeBody(req, ALLOWED_FIELDS);

  const errors = {};
  let { name, phone, email, password } = req.body;

  // Name
  if (!name || !name.trim()) {
    errors.name = 'Full name is required.';
  } else {
    name = normalizeString(name);
    if (name.length < 2) errors.name = 'Name must be at least 2 characters.';
    else if (name.length > 60) errors.name = 'Name cannot exceed 60 characters.';
    else if (!NAME_REGEX.test(name)) errors.name = 'Name can contain only letters and spaces.';
    else req.body.name = name;
  }

  // Phone
  if (!phone) {
    errors.phone = 'Mobile number is required.';
  } else {
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length !== 10) {
      errors.phone = 'Mobile number must contain exactly 10 digits.';
    } else {
      req.body.phone = cleanPhone;
    }
  }

  // Password
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  } else if (password.length > 30) {
    errors.password = 'Password cannot exceed 30 characters.';
  }

  // Email (optional)
  if (email && email.trim() !== '') {
    email = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Enter a valid email address.';
    } else {
      req.body.email = email;
    }
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

// ─── LOGIN VALIDATOR ──────────────────────────────────────────────────────────
const validateLogin = (req, res, next) => {
  const ALLOWED_FIELDS = ['identifier', 'password'];
  sanitizeBody(req, ALLOWED_FIELDS);

  const errors = {};
  let { identifier, password } = req.body;

  // Identifier
  if (!identifier || !identifier.trim()) {
    errors.identifier = 'Please enter your email or mobile number.';
  } else {
    identifier = identifier.trim();
    req.body.identifier = identifier;

    const isDigitsOnly = /^\d+$/.test(identifier);
    const hasAt = identifier.includes('@');

    if (isDigitsOnly) {
      const cleanPhone = normalizePhone(identifier);
      if (cleanPhone.length !== 10) {
        errors.identifier = 'Mobile number must contain exactly 10 digits.';
      }
    } else if (hasAt) {
      if (!EMAIL_REGEX.test(identifier.toLowerCase())) {
        errors.identifier = 'Enter a valid email address.';
      }
    } else {
      if (identifier.length < 3) {
        errors.identifier = 'Enter a valid email address or 10-digit mobile number.';
      }
    }
  }

  // Password
  if (!password || !password.trim()) {
    errors.password = 'Password is required.';
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

// ─── UPDATE PROFILE VALIDATOR ─────────────────────────────────────────────────
const validateUpdateProfile = (req, res, next) => {
  const ALLOWED_FIELDS = [
    'name', 'bio', 'about', 'gender', 'dob', 'bloodGroup', 'maritalStatus', 'gotra',
    'community', 'communityId', 'subCommunity',
    'city', 'district', 'state', 'pincode', 'country',
    'qualification', 'school', 'passingYear', 'profession', 'company',
    'annualIncome', 'workCity',
    'houseNumber', 'streetAddress', 'landmark', 'areaAddress',
    'pincodeAddress', 'detailedAddress', 'address',
    'alternatePhone', 'alternateEmail',
    'familyMembers',
    'prefEducation', 'prefAge', 'prefHeight', 'prefOccupation', 'prefCity',
    'facebook', 'twitter', 'linkedin',
    'isPrivate', 'phonePrivacy', 'emailPrivacy', 'familyPrivacy',
    'isAadharVerified', 'isFaceVerified',
    'avatar', 'cover', 'avatarFile', 'photo', 'deviceToken',
  ];
  sanitizeBody(req, ALLOWED_FIELDS);

  const errors = {};
  const { name, gender, bloodGroup, maritalStatus, dob, pincode, alternatePhone, alternateEmail } = req.body;

  // Name (if provided)
  if (name !== undefined && name !== '') {
    const cleanName = normalizeString(name);
    if (cleanName.length < 2) errors.name = 'Name must be at least 2 characters.';
    else if (cleanName.length > 60) errors.name = 'Name cannot exceed 60 characters.';
    else if (!NAME_REGEX.test(cleanName)) errors.name = 'Name can contain only letters and spaces.';
    else req.body.name = cleanName;
  }

  // Gender enum
  if (gender !== undefined && gender !== '') {
    if (!ALLOWED_GENDERS.includes(gender)) {
      errors.gender = `Gender must be one of: ${ALLOWED_GENDERS.join(', ')}.`;
    }
  }

  // Blood Group enum
  if (bloodGroup !== undefined && bloodGroup !== '') {
    if (!ALLOWED_BLOOD_GROUPS.includes(bloodGroup)) {
      errors.bloodGroup = `Blood group must be one of: ${ALLOWED_BLOOD_GROUPS.join(', ')}.`;
    }
  }

  // Marital Status enum
  if (maritalStatus !== undefined && maritalStatus !== '') {
    if (!ALLOWED_MARITAL_STATUSES.includes(maritalStatus)) {
      errors.maritalStatus = `Marital status must be one of: ${ALLOWED_MARITAL_STATUSES.join(', ')}.`;
    }
  }

  // DOB (if provided)
  if (dob !== undefined && dob !== '') {
    const date = new Date(dob);
    if (isNaN(date.getTime())) {
      errors.dob = 'Enter a valid date of birth.';
    } else {
      const today = new Date();
      if (date > today) {
        errors.dob = 'Date of birth cannot be in the future.';
      } else {
        const age = Math.floor((today - date) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 5) errors.dob = 'Age must be at least 5 years.';
        else if (age > 120) errors.dob = 'Please enter a valid date of birth.';
      }
    }
  }

  // Pincode (if provided)
  if (pincode !== undefined && pincode !== '') {
    const cleanPin = String(pincode).replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      errors.pincode = 'PIN Code must contain exactly 6 digits.';
    } else {
      req.body.pincode = cleanPin;
    }
  }

  // Alternate Phone (if provided)
  if (alternatePhone !== undefined && alternatePhone !== '') {
    const cleanAlt = normalizePhone(alternatePhone);
    if (cleanAlt.length !== 10) {
      errors.alternatePhone = 'Alternate mobile number must contain exactly 10 digits.';
    } else {
      req.body.alternatePhone = cleanAlt;
    }
  }

  // Alternate Email (if provided)
  if (alternateEmail !== undefined && alternateEmail !== '') {
    const cleanEmail = alternateEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      errors.alternateEmail = 'Enter a valid alternate email address.';
    } else {
      req.body.alternateEmail = cleanEmail;
    }
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

// ─── FORGOT PASSWORD VALIDATOR ────────────────────────────────────────────────
const validateForgotPassword = (req, res, next) => {
  const ALLOWED_FIELDS = ['phone'];
  sanitizeBody(req, ALLOWED_FIELDS);

  const errors = {};
  const { phone } = req.body;

  if (!phone) {
    errors.phone = 'Mobile number is required.';
  } else {
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length !== 10) {
      errors.phone = 'Mobile number must contain exactly 10 digits.';
    } else {
      req.body.phone = cleanPhone;
    }
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

// ─── RESET PASSWORD VALIDATOR ─────────────────────────────────────────────────
const validateResetPassword = (req, res, next) => {
  const ALLOWED_FIELDS = ['phone', 'otp', 'newPassword'];
  sanitizeBody(req, ALLOWED_FIELDS);

  const errors = {};
  const { phone, newPassword } = req.body;

  if (!phone) {
    errors.phone = 'Mobile number is required.';
  } else {
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length !== 10) {
      errors.phone = 'Mobile number must contain exactly 10 digits.';
    } else {
      req.body.phone = cleanPhone;
    }
  }

  if (!newPassword) {
    errors.newPassword = 'New password is required.';
  } else if (newPassword.length < 6) {
    errors.newPassword = 'Password must be at least 6 characters.';
  } else if (newPassword.length > 30) {
    errors.newPassword = 'Password cannot exceed 30 characters.';
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateForgotPassword,
  validateResetPassword,
};
