import { API_BASE_URL } from '@/constants/api';

const REQUEST_TIMEOUT_MS = 20000;

export interface CaseOffer {
  id: number;
  status: string;
  emergency_desc: string;
  severity: string;
  pickup_lat: number | string | null;
  pickup_lng: number | string | null;
  accept_deadline: string;
  patient_name?: string;
  patient_phone?: string;
}

async function apiRequest<T>(
  path: string,
  token: string,
  method: 'GET' | 'PATCH' | 'POST' = 'GET',
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data: any = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}).`,
        );
      }
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          data.message ||
          `Request failed (${response.status}).`,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'The server did not answer within 20 seconds. Please try again.',
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const assignmentService = {
  /** GET /api/cases/driver/assigned — cases assigned to this driver. */
  getMyOffers(token: string): Promise<CaseOffer[]> {
    return apiRequest<CaseOffer[]>('/cases/driver/assigned', token);
  },

  /** PATCH /api/cases/:id/accept */
  acceptCase(caseId: number, token: string): Promise<unknown> {
    return apiRequest(`/cases/${caseId}/accept`, token, 'PATCH');
  },

  /** POST /api/assignments/:id/decline — legacy route, still driver-authorized. */
  declineCase(caseId: number, token: string): Promise<unknown> {
    return apiRequest(`/assignments/${caseId}/decline`, token, 'POST');
  },

  /** PATCH /api/cases/:id/pickup */
  markPickup(caseId: number, token: string): Promise<unknown> {
    return apiRequest(`/cases/${caseId}/pickup`, token, 'PATCH');
  },

  /** PATCH /api/cases/:id/arrive */
  markArrived(caseId: number, token: string): Promise<unknown> {
    return apiRequest(`/cases/${caseId}/arrive`, token, 'PATCH');
  },

  /** PATCH /api/cases/driver/ambulance/status */
  updateAmbulanceStatus(
    token: string,
    status: string,
  ): Promise<unknown> {
    return apiRequest('/cases/driver/ambulance/status', token, 'PATCH', {
      status,
    });
  },
};