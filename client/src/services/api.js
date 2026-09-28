function getToken() {
  return localStorage.getItem("mc_token");
}

export async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Consents
  getConsents: () => apiFetch("/api/consents"),
  createConsent: (body) =>
    apiFetch("/api/consents", { method: "POST", body: JSON.stringify(body) }),
  getConsent: (id) => apiFetch(`/api/consents/${id}`),
  revokeConsent: (id) =>
    apiFetch(`/api/consents/${id}/revoke`, { method: "PUT" }),

  // Emergency Access
  getEmergencyAccesses: (params) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(`/api/emergency-access${qs}`);
  },
  createEmergencyAccess: (body) =>
    apiFetch("/api/emergency-access", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  endEmergencyAccess: (id) =>
    apiFetch(`/api/emergency-access/${id}/end`, { method: "PUT" }),
  checkEmergencyAccess: (patientId) =>
    apiFetch(`/api/emergency-access/check/${patientId}`),

  // Audit Logs
  getAuditLogs: (params) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(`/api/audit-logs${qs}`);
  },
  getAuditLog: (id) => apiFetch(`/api/audit-logs/${id}`),
  getAuditStats: () => apiFetch("/api/audit-logs/stats/summary"),

  // Patients
  getPatients: () => apiFetch("/api/patients"),
  getPatient: (id) => apiFetch(`/api/patients/${id}`),

  // Doctors
  getDoctors: () => apiFetch("/api/doctors"),

  // Admin
  getUsers: () => apiFetch("/api/admin/users"),
  getStats: () => apiFetch("/api/admin/stats"),
};
