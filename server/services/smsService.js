
const AfricasTalking = require('africastalking');

const username = process.env.AT_USERNAME;
const apiKey = process.env.AT_API_KEY;
const environment = process.env.AT_ENV || 'sandbox';

if (environment !== 'sandbox') {
  throw new Error('MediRescue SMS is restricted to sandbox mode.');
}

if (
  !username ||
  !apiKey ||
  apiKey === 'YOUR_ACTUAL_SANDBOX_API_KEY' ||
  apiKey === 'PASTE_YOUR_ACTUAL_SANDBOX_KEY_HERE'
) {
  throw new Error(
    "Missing Africa's Talking credentials. Check AT_USERNAME and AT_API_KEY."
  );
}

const africasTalking = AfricasTalking({
  username,
  apiKey
});

const sms = africasTalking.SMS;

function toKenyanInternationalPhone(phone) {
  const value = String(phone).trim().replace(/[\s()-]/g, '');

  if (/^07\d{8}$/.test(value) || /^01\d{8}$/.test(value)) {
    return '+254' + value.substring(1);
  }

  if (/^254\d{9}$/.test(value)) {
    return '+' + value;
  }

  if (/^\+254\d{9}$/.test(value)) {
    return value;
  }

  throw new Error(
    'Invalid Kenyan phone number. Use 0712345678 or +254712345678.'
  );
}

async function sendOtpSms(phone, code) {
  const internationalPhone = toKenyanInternationalPhone(phone);

  const message =
    `Your MediRescue verification code is ${code}. ` +
    'It expires in 5 minutes. Do not share this code with anyone.';

  return sms.send({
    to: [internationalPhone],
    message
  });
}

module.exports = { sendOtpSms };
