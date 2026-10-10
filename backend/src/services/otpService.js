/**
 * Phone OTP for registration and password reset.
 *
 * - Real SMS via SMS Gateway Hub when SMS_ENABLED=true (see smsService).
 * - Without SMS, and only outside production, the code is always 123456 so local
 *   development keeps working. In production without SMS, OTP requests fail loudly
 *   instead of letting anyone through.
 * - Codes are stored hashed, expire after 10 minutes, allow 5 wrong attempts, and can
 *   be re-sent after 30 seconds. A verified code must then be used (consumed) by the
 *   registration / password reset within 30 minutes.
 */
const crypto = require('crypto');
const OtpCode = require('../models/OtpCode');
const config = require('../config/config');
const { isSmsEnabled, sendOtpSms } = require('./smsService');

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const VERIFIED_WINDOW_MS = 30 * 60 * 1000;
const DEV_OTP = '123456';

const PURPOSES = { register: 'register', reset_password: 'reset_password', forgot: 'reset_password', reset: 'reset_password' };

class OtpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);
const resolvePurpose = (type) => PURPOSES[String(type || 'register').toLowerCase()] || null;
const hashCode = (phone, purpose, code) => crypto
  .createHmac('sha256', config.jwtSecret || 'otp')
  .update(`${phone}:${purpose}:${code}`)
  .digest('hex');
const isProduction = () => process.env.NODE_ENV === 'production';

/** Create, store and send an OTP. Returns { devOtp } only when SMS is off in development. */
const requestOtp = async (rawPhone, type) => {
  const phone = normalizePhone(rawPhone);
  const purpose = resolvePurpose(type);
  if (phone.length !== 10) throw new OtpError('Enter a valid 10-digit mobile number.');
  if (!purpose) throw new OtpError('Invalid OTP type.');

  const smsOn = isSmsEnabled();
  if (!smsOn && isProduction()) {
    throw new OtpError('OTP service is not configured. Please contact support.', 503);
  }

  const last = await OtpCode.findOne({ phone, purpose }).sort({ createdAt: -1 });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - last.createdAt.getTime())) / 1000);
    throw new OtpError(`Please wait ${wait} seconds before requesting a new OTP.`, 429);
  }

  const code = smsOn ? String(crypto.randomInt(100000, 1000000)) : DEV_OTP;

  // Only the newest code for this phone/purpose stays valid
  await OtpCode.updateMany({ phone, purpose, verifiedAt: null }, { $set: { expiresAt: new Date() } });
  const record = await OtpCode.create({
    phone,
    purpose,
    codeHash: hashCode(phone, purpose, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS)
  });

  if (smsOn) {
    try {
      await sendOtpSms(phone, code);
    } catch (err) {
      console.error('[OTP] SMS send failed:', err.message);
      if (!isProduction()) {
        // Development only: keep working while the SMS gateway is misconfigured
        record.codeHash = hashCode(phone, purpose, DEV_OTP);
        await record.save();
        console.warn('[OTP] Development fallback — use 123456. Fix the SMS gateway before going live.');
        return { devOtp: DEV_OTP, smsFailed: true };
      }
      await OtpCode.deleteOne({ _id: record._id });
      throw new OtpError('Could not send OTP right now. Please try again in a minute.', 502);
    }
    return {};
  }
  return { devOtp: DEV_OTP };
};

/** Check a code. Marks it verified (it must still be consumed by the actual action). */
const verifyOtp = async (rawPhone, type, code) => {
  const phone = normalizePhone(rawPhone);
  const purpose = resolvePurpose(type);
  const entered = String(code || '').trim();
  if (phone.length !== 10 || !purpose || !/^\d{6}$/.test(entered)) {
    throw new OtpError('Enter the 6-digit OTP.');
  }

  const record = await OtpCode.findOne({ phone, purpose, consumedAt: null }).sort({ createdAt: -1 });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new OtpError('OTP has expired. Please request a new one.');
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw new OtpError('Too many wrong attempts. Please request a new OTP.', 429);
  }

  if (!codeMatches(record, entered)) {
    record.attempts += 1;
    await record.save();
    const left = MAX_ATTEMPTS - record.attempts;
    throw new OtpError(left > 0 ? `Invalid OTP. ${left} attempt(s) left.` : 'Too many wrong attempts. Please request a new OTP.');
  }

  if (!record.verifiedAt) {
    record.verifiedAt = new Date();
    await record.save();
  }
  return record;
};

const codeMatches = (record, entered) => {
  const expected = Buffer.from(record.codeHash, 'hex');
  const actual = Buffer.from(hashCode(record.phone, record.purpose, String(entered || '').trim()), 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

/**
 * Use up a verified OTP for the real action (register / reset password).
 * If `code` is given it must match that OTP (password reset always sends it);
 * if the phone isn't verified yet, the code is verified first.
 */
const consumeVerifiedOtp = async (rawPhone, type, code) => {
  const phone = normalizePhone(rawPhone);
  const purpose = resolvePurpose(type);

  let record = await OtpCode.findOne({
    phone,
    purpose,
    consumedAt: null,
    verifiedAt: { $gte: new Date(Date.now() - VERIFIED_WINDOW_MS) }
  }).sort({ verifiedAt: -1 });

  if (record && code && !codeMatches(record, code)) {
    throw new OtpError('Invalid OTP. Please verify your mobile number again.');
  }
  if (!record && code) record = await verifyOtp(phone, purpose, code);
  if (!record) throw new OtpError('Please verify your mobile number with OTP first.');

  record.consumedAt = new Date();
  await record.save();
  return record;
};

module.exports = { OtpError, normalizePhone, requestOtp, verifyOtp, consumeVerifiedOtp, isSmsEnabled };
