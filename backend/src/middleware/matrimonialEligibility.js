/**
 * matrimonialEligibility.js
 * Members registered as Married can't use Matrimony on their own account —
 * a family member looking for a match needs their own account. The app shows
 * a poster for this; this middleware enforces the same rule on the server.
 *
 * Runs after `protect` (applied to every /member route).
 */
const MARRIED = /^married$/i;

const blockMarriedMembers = (req, res, next) => {
  if (MARRIED.test(req.user?.maritalStatus || '')) {
    return res.status(403).json({
      status: 'error',
      code: 'MARRIED_ACCOUNT',
      message: 'Your account is registered as Married, so Matrimony is not available on it. '
        + 'Create a separate account for the family member who is looking for a match.'
    });
  }
  next();
};

module.exports = { blockMarriedMembers };
