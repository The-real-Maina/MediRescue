// Live MediRescue backend (Render). To test against a local server instead,
// create mobile/.env with: EXPO_PUBLIC_API_URL=http://YOUR-PC-IP:5000/api
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://medirescue.onrender.com/api';