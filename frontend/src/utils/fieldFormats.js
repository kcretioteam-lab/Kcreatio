// Formatted text fields. Use with <Input format="gstin" …> (components/ui/Input.jsx):
//   clean     — runs on every keystroke/paste; strips characters the field can never contain
//   validate  — runs on blur; returns a message when the finished value is wrong, else null
// The regexes mirror the backend Zod schemas, so a value that passes here passes the API.
import { gstinError, PAN_REGEX } from './gst.js';

const upperAlnum = (max) => (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, max);

export const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const MOBILE_REGEX = /^(?:\+?91|0)?[6-9]\d{9}$/;
export const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const FORMATS = {
  gstin: {
    clean: upperAlnum(15),
    validate: (v) => gstinError(v),
  },
  pan: {
    clean: upperAlnum(10),
    validate: (v) => (PAN_REGEX.test(v) ? null : 'PAN should look like ABCDE1234F'),
  },
  tan: {
    clean: upperAlnum(10),
    validate: (v) => (TAN_REGEX.test(v) ? null : 'TAN should look like BLRA12345B'),
  },
  ifsc: {
    clean: upperAlnum(11),
    validate: (v) => (IFSC_REGEX.test(v) ? null : 'IFSC should be 11 characters, like HDFC0001234'),
  },
  // Indian mobile. Spaces are dropped so the stored value is +919876543210-style
  mobile: {
    inputMode: 'tel',
    clean: (v) => v.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').slice(0, 13),
    validate: (v) => (MOBILE_REGEX.test(v) ? null : 'Enter a 10-digit mobile number, like +91XXXXXXXXXX'),
  },
  // Any contact number (landline or foreign): digits with an optional leading +, spaces and hyphens
  phone: {
    inputMode: 'tel',
    clean: (v) => v.replace(/[^\d+\s-]/g, '').replace(/(?!^)\+/g, '').slice(0, 20),
    validate: (v) => {
      const digits = v.replace(/\D/g, '').length;
      return digits >= 8 && digits <= 15 ? null : 'Enter a valid phone number (8–15 digits)';
    },
  },
  account: {
    inputMode: 'numeric',
    clean: (v) => v.replace(/\D/g, '').slice(0, 18),
    validate: (v) => (v.length >= 9 ? null : 'Account numbers are 9 to 18 digits'),
  },
  upi: {
    inputMode: 'email',
    clean: (v) => v.replace(/[^a-zA-Z0-9._@-]/g, '').replace(/@(?=.*@)/g, '').slice(0, 100),
    validate: (v) => (UPI_REGEX.test(v) ? null : 'UPI ID should look like name@bank'),
  },
  email: {
    inputMode: 'email',
    clean: (v) => v.replace(/\s/g, '').slice(0, 254),
    validate: (v) => (EMAIL_REGEX.test(v) ? null : 'Enter a valid email, like name@example.com'),
  },
};
