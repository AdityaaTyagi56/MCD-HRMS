import type { Employee, Grievance, LeaveRequest, Payslip, Ward } from '../types';

const FALLBACK_BASE = import.meta.env.VITE_API_URL || 'https://mcd-hrms-api.onrender.com';
const FALLBACK_KEY = import.meta.env.VITE_API_KEY || 'hackathon-demo-key';

let runtimeBase: string | null = null;
let runtimeKey: string | null = null;

const readFromStorage = (key: 'apiBase' | 'apiKey') => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

const getBase = () => runtimeBase || readFromStorage('apiBase') || FALLBACK_BASE;
const getKey = () => runtimeKey || readFromStorage('apiKey') || FALLBACK_KEY;

export const setApiConfig = (config: { base?: string; key?: string }) => {
  if (config.base) {
    runtimeBase = config.base;
    if (typeof window !== 'undefined') localStorage.setItem('apiBase', config.base);
  }
  if (config.key) {
    runtimeKey = config.key;
    if (typeof window !== 'undefined') localStorage.setItem('apiKey', config.key);
  }
};

export const getApiConfig = () => ({ base: getBase(), key: getKey() });

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getKey(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Request failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => apiFetch<{ ok: boolean; uptime: number; timestamp: string }>('/health'),
  listEmployees: () => apiFetch<Omit<Employee, 'coords'>[]>('/api/employees'),
  markAttendance: (payload: { userId: number; lat: number; lng: number }) =>
    apiFetch<{ message: string; distanceKm: number }>('/api/attendance', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  attendanceTrends: (range: '7d' | '30d' | '90d') =>
    apiFetch<Array<{ day: string; present: number; target: number }>>(`/api/attendance/trends?range=${range}`),
  submitGrievance: (payload: { userId: number; category: string; description: string; priority?: 'High' | 'Medium' | 'Low' }) =>
    apiFetch<Grievance>('/api/grievances', { method: 'POST', body: JSON.stringify(payload) }),
  listGrievances: () => apiFetch<Grievance[]>('/api/grievances'),
  updateGrievanceStatus: (id: number, status: 'Pending' | 'Under Review' | 'Resolved' | 'Escalated') =>
    apiFetch<Grievance>(`/api/grievances/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  createLeave: (payload: { userId: number; startDate: string; endDate: string; type: LeaveRequest['type']; reason: string }) =>
    apiFetch<LeaveRequest>('/api/leaves', { method: 'POST', body: JSON.stringify(payload) }),
  listLeaves: () => apiFetch<LeaveRequest[]>('/api/leaves'),
  updateLeaveStatus: (id: number, status: 'Approved' | 'Rejected') =>
    apiFetch<LeaveRequest>(`/api/leaves/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  listPayslips: () => apiFetch<Payslip[]>('/api/payslips'),
  releaseAllSalaries: () => apiFetch<{ message: string }>('/api/payroll/release-all', { method: 'POST' }),
  listWards: () => apiFetch<Ward[]>('/api/wards'),
};
