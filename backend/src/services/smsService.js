/**
 * DLT-compliant transactional SMS for India.
 *
 * Providers (SMS_PROVIDER):
 *   smsindiahub   — cloud.smsindiahub.in/vendorsms/pushsms.aspx  (default)
 *   smsgatewayhub — www.smsgatewayhub.com/api/mt/SendSMS
 *
 * Configured entirely from backend/.env:
 *   SMS_ENABLED=true|false
 *   SMS_PROVIDER=smsindiahub
 *   SMS_API_KEY=...                           (provider API key)
 *   SMS_SENDER_ID=BGADPL                      (6-letter DLT header)
 *   SMS_OTP_DLT_TEMPLATE_ID=...               (DLT template id of the OTP message)
 *   SMS_OTP_TEMPLATE="... ##var## ..."        (exact DLT template text; ##var## = the OTP)
 *   SMS_DLT_TEMPLATE_PARAM=...                (optional — query param name the provider uses
 *                                              for the template id, e.g. from its API page)
 *   SMS_DLT_ENTITY_ID=...                     (optional — DLT principal entity id, smsgatewayhub)
 *   SMS_ROUTE=1                               (optional — route id, smsgatewayhub)
 *
 * The text sent must match the registered DLT template character-for-character,
 * otherwise operators reject the message.
 */
const https = require('https');

class SmsError extends Error {}

const provider = () => (process.env.SMS_PROVIDER || 'smsindiahub').toLowerCase();
const apiKey = () => process.env.SMS_API_KEY || process.env.SMS_GATEWAY_HUB_API_KEY || '';

const isSmsEnabled = () => String(process.env.SMS_ENABLED || '').toLowerCase() === 'true'
  && !!apiKey()
  && !!process.env.SMS_SENDER_ID;

const httpGet = (url, timeoutMs = 15000) => new Promise((resolve, reject) => {
  const req = https.get(url, (res) => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => resolve(body));
  });
  req.on('error', err => reject(new SmsError(`SMS gateway unreachable: ${err.message}`)));
  req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
});

// Both providers answer either JSON ({ ErrorCode: '000', ... }) or plain text ("Success#..." / "Failed#...")
const parseResult = (body) => {
  let json = null;
  try { json = JSON.parse(body); } catch (e) { /* plain text */ }
  if (json) {
    const code = String(json.ErrorCode ?? '');
    if (code === '000' || code === '0') {
      return { jobId: json.JobId, messageId: json.MessageData?.[0]?.MessageId };
    }
    throw new SmsError(`SMS not sent (code ${code || '?'}): ${json.ErrorMessage || json.Message || 'unknown error'}`);
  }
  const text = String(body || '').trim();
  if (/^success/i.test(text)) return { raw: text };
  throw new SmsError(`SMS not sent: ${text.slice(0, 200) || 'empty response'}`);
};

const buildSmsIndiaHubUrl = (phone10, text, dltTemplateId) => {
  const params = new URLSearchParams({
    APIKey: apiKey(),
    msisdn: `91${phone10}`,
    sid: process.env.SMS_SENDER_ID,
    msg: text,
    fl: '0',       // 0 = normal (not flash) SMS
    gwid: '2'      // 2 = transactional route
  });
  // SMSIndiaHub matches the DLT template by id; without it the text is rejected
  // with "006 Invalid template text".
  if (dltTemplateId) {
    params.set(process.env.SMS_DLT_TEMPLATE_PARAM || 'templateid', dltTemplateId);
  }
  return `https://cloud.smsindiahub.in/vendorsms/pushsms.aspx?${params.toString()}`;
};

const buildSmsGatewayHubUrl = (phone10, text, dltTemplateId) => {
  const params = new URLSearchParams({
    APIKey: apiKey(),
    senderid: process.env.SMS_SENDER_ID,
    channel: '2',        // 2 = transactional
    DCS: '0',            // 0 = normal (English) text
    flashsms: '0',
    number: `91${phone10}`,
    text,
    route: process.env.SMS_ROUTE || '1'
  });
  if (dltTemplateId) params.set(process.env.SMS_DLT_TEMPLATE_PARAM || 'dlttemplateid', dltTemplateId);
  if (process.env.SMS_DLT_ENTITY_ID) params.set('EntityId', process.env.SMS_DLT_ENTITY_ID);
  return `https://www.smsgatewayhub.com/api/mt/SendSMS?${params.toString()}`;
};

/**
 * @param {string} phone10  10-digit Indian mobile number
 * @param {string} text     message text (must match the DLT template)
 * @param {string} dltTemplateId
 */
const sendSms = async (phone10, text, dltTemplateId) => {
  const url = provider() === 'smsgatewayhub'
    ? buildSmsGatewayHubUrl(phone10, text, dltTemplateId)
    : buildSmsIndiaHubUrl(phone10, text, dltTemplateId);
  return parseResult(await httpGet(url));
};

const sendOtpSms = (phone10, code) => {
  const template = process.env.SMS_OTP_TEMPLATE;
  if (!template || !template.includes('##var##')) {
    throw new SmsError('SMS_OTP_TEMPLATE is missing or has no ##var## placeholder.');
  }
  return sendSms(phone10, template.replace('##var##', code), process.env.SMS_OTP_DLT_TEMPLATE_ID);
};

module.exports = { isSmsEnabled, sendSms, sendOtpSms, SmsError };
