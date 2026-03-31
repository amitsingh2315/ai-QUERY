/**
 * API Service — Centralized HTTP client for all backend calls.
 *
 * In production (Render), VITE_API_URL is set to the backend service URL.
 * In local development, requests go through the Vite dev proxy to localhost:8000.
 */

let BASE_URL = '/api';
if (import.meta.env.VITE_API_URL) {
  const apiUrl = import.meta.env.VITE_API_URL;
  BASE_URL = apiUrl.startsWith('http') ? `${apiUrl}/api` : `https://${apiUrl}/api`;
}

async function request(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const response = await fetch(`${BASE_URL}${url}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Tickets ─────────────────────────────────────────────

export const ticketApi = {
  create: (data) => request('/tickets/', { method: 'POST', body: JSON.stringify(data) }),
  list: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v))
    ).toString();
    return request(`/tickets/?${query}`);
  },
  listByEmail: (email) => request(`/tickets/?user_email=${encodeURIComponent(email)}`),
  get: (id) => request(`/tickets/${id}`),
  updateStatus: (id, data) => request(`/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  addNote: (id, data) => request(`/tickets/${id}/notes`, { method: 'POST', body: JSON.stringify(data) }),
  getNotes: (id) => request(`/tickets/${id}/notes`),
  getTimeline: (id) => request(`/tickets/${id}/timeline`),
  submitFeedback: (id, data) => request(`/tickets/${id}/feedback`, { method: 'POST', body: JSON.stringify(data) }),
  escalate: (id) => request(`/tickets/${id}/escalate`, { method: 'POST' }),
  addReply: (id, data) => request(`/tickets/${id}/replies`, { method: 'POST', body: JSON.stringify(data) }),
  getReplies: (id) => request(`/tickets/${id}/replies`),
  giveReplyFeedback: (id, replyId, data) => request(`/tickets/${id}/replies/${replyId}/feedback`, { method: 'PATCH', body: JSON.stringify(data) }),
  getNotifications: (id) => request(`/tickets/${id}/notifications`),
  checkEscalations: () => request('/tickets/check-escalations', { method: 'POST' }),
};

// ─── Employees ───────────────────────────────────────────

export const employeeApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== ''))
    ).toString();
    return request(`/employees/?${query}`);
  },
  get: (id) => request(`/employees/${id}`),
  create: (data) => request('/employees/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivate: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
  departments: () => request('/employees/departments/list'),
  activeTickets: () => request('/employees/active-tickets'),
};

// ─── Analytics ───────────────────────────────────────────

export const analyticsApi = {
  overview: () => request('/analytics/overview'),
  departmentLoad: () => request('/analytics/department-load'),
  topCategories: () => request('/analytics/top-categories'),
  severityDistribution: () => request('/analytics/severity-distribution'),
  resolutionTrend: () => request('/analytics/resolution-trend'),
  employeePerformance: () => request('/analytics/employee-performance'),
};

// ─── Health ──────────────────────────────────────────────

export const healthApi = {
  check: () => request('/health'),
};
