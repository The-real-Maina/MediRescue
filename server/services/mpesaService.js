
const axios = require('axios');

// ==========================================
// M-PESA SANDBOX CONFIGURATION
// ==========================================

const BASE_URL = 'https://sandbox.safaricom.co.ke';

// ==========================================
// GET M-PESA ACCESS TOKEN
// ==========================================

async function getMpesaAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;

  if (!key || !secret) {
    throw new Error('M-Pesa credentials are missing');
  }

  const credentials = Buffer.from(
    `${key}:${secret}`
  ).toString('base64');

  const response = await axios.get(
    `${BASE_URL}/oauth/v1/generate`,
    {
      params: {
        grant_type: 'client_credentials'
      },
      headers: {
        Authorization: `Basic ${credentials}`
      },
      timeout: 15000
    }
  );

  if (!response.data.access_token) {
    throw new Error('M-Pesa access token not received');
  }

  return response.data.access_token;
}

// ==========================================
// GENERATE KENYA TIMESTAMP
// ==========================================

function generateTimestamp() {
  const kenyaTime = new Date(
    Date.now() + 3 * 60 * 60 * 1000
  );

  const year = kenyaTime.getUTCFullYear();

  const month = String(
    kenyaTime.getUTCMonth() + 1
  ).padStart(2, '0');

  const day = String(
    kenyaTime.getUTCDate()
  ).padStart(2, '0');

  const hours = String(
    kenyaTime.getUTCHours()
  ).padStart(2, '0');

  const minutes = String(
    kenyaTime.getUTCMinutes()
  ).padStart(2, '0');

  const seconds = String(
    kenyaTime.getUTCSeconds()
  ).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// ==========================================
// GENERATE STK CREDENTIALS
// ==========================================

function generateStkCredentials() {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;

  if (!shortcode || !passkey) {
    throw new Error(
      'M-Pesa shortcode or passkey is missing'
    );
  }

  const timestamp = generateTimestamp();

  const password = Buffer.from(
    `${shortcode}${passkey}${timestamp}`
  ).toString('base64');

  return {
    shortcode,
    timestamp,
    password
  };
}

// ==========================================
// VALIDATE CALLBACK URL
// ==========================================

function validateCallbackUrl(callbackUrl) {
  if (!callbackUrl || typeof callbackUrl !== 'string') {
    throw new Error('M-Pesa callback URL is required');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(callbackUrl);
  } catch {
    throw new Error('Invalid M-Pesa callback URL');
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    !parsedUrl.hostname ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error(
      'M-Pesa callback URL must be a valid HTTPS URL'
    );
  }

  if (
    ['localhost', '127.0.0.1', '::1'].includes(
      parsedUrl.hostname.toLowerCase()
    )
  ) {
    throw new Error(
      'M-Pesa callback URL must be publicly accessible'
    );
  }

  return parsedUrl.toString();
}

// ==========================================
// INITIATE M-PESA STK PUSH
// ==========================================

async function initiateStkPush(
  phone,
  amount,
  reference,
  callbackUrl
) {
  const normalizedPhone = String(phone || '')
    .replace(/\D/g, '');

  if (!/^254[71]\d{8}$/.test(normalizedPhone)) {
    throw new Error(
      'Phone must be in format 2547XXXXXXXX or 2541XXXXXXXX'
    );
  }

  const paymentAmount = Number(amount);

  if (
    !Number.isSafeInteger(paymentAmount) ||
    paymentAmount <= 0
  ) {
    throw new Error(
      'Amount must be a positive whole number'
    );
  }

  const validCallbackUrl = validateCallbackUrl(
    callbackUrl
  );

  const token = await getMpesaAccessToken();

  const {
    shortcode,
    timestamp,
    password
  } = generateStkCredentials();

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: paymentAmount,
    PartyA: normalizedPhone,
    PartyB: shortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL: validCallbackUrl,
    AccountReference: String(reference).slice(0, 12),
    TransactionDesc: 'MediRescue payment'
  };

  const response = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  return response.data;
}

// ==========================================
// QUERY STK PUSH PAYMENT STATUS
// ==========================================

async function queryStkPushStatus(checkoutRequestId) {
  if (
    typeof checkoutRequestId !== 'string' ||
    !checkoutRequestId.trim()
  ) {
    throw new Error(
      'CheckoutRequestID is required'
    );
  }

  const token = await getMpesaAccessToken();

  const {
    shortcode,
    timestamp,
    password
  } = generateStkCredentials();

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId.trim()
  };

  const response = await axios.post(
    `${BASE_URL}/mpesa/stkpushquery/v1/query`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  return response.data;
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

module.exports = {
  getMpesaAccessToken,
  initiateStkPush,
  queryStkPushStatus
};
