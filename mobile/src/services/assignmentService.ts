
import { API_BASE_URL } from '@/constants/api';

export interface CaseOffer {
  id: number;
  status: string;
  emergency_desc: string;
  severity: string;
  pickup_lat: number | string | null;
  pickup_lng: number | string | null;
  accept_deadline: string;
}

async function assignmentRequest<T>(
  endpoint: string,
  token: string,
  method: 'GET' | 'POST' = 'GET',
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/assignments${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || data.message || 'Assignment request failed.',
    );
  }

  return data as T;
}

export const assignmentService = {
  getMyOffers(token: string): Promise<CaseOffer[]> {
    return assignmentRequest<CaseOffer[]>('/my-offers', token);
  },

  acceptCase(caseId: number, token: string): Promise<unknown> {
    return assignmentRequest(`/${caseId}/accept`, token, 'POST');
  },

  declineCase(caseId: number, token: string): Promise<unknown> {
    return assignmentRequest(`/${caseId}/decline`, token, 'POST');
  },
};
