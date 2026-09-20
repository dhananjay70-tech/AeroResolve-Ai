import axios from "axios";

const TOKEN_KEY = "aeroresolve_token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AUTH_EXPIRED_EVENT = "aeroresolve:auth-expired";

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong. Please try again.";
    return Promise.reject(new Error(message));
  }
);

export const authApi = {
  login: (email, password) => api.post("/api/auth/login", { email, password }),
  register: (email, password, fullName) =>
    api.post("/api/auth/register", {
      email,
      password,
      ...(fullName ? { fullName } : {}),
    }),
  me: () => api.get("/api/auth/me"),
};

export const customerApi = {
  getByPnr: (pnr) => api.get(`/api/customers/${pnr}`),
};

export const bookingApi = {
  getByPnr: (pnr) => api.get(`/api/bookings/${pnr}`),
  getStatus: (pnr) => api.get(`/api/bookings/${pnr}/status`),
};

export const agentApi = {
  // Routed through the Node backend to the Python AI Service (LangGraph +
  // Gemini), which itself calls back into this same backend for every fact
  // and every action. Node remains the source of truth for policy/actions.
  chat: (pnr, message, conversationId) =>
    api.post("/api/agent/ai-chat", {
      pnr,
      message,
      ...(conversationId ? { conversationId } : {}),
    }),
};

export const escalationApi = {
  create: (bookingId, reason, requestedAction) =>
    api.post("/api/escalations", { bookingId, reason, requestedAction }),
  getById: (id) => api.get(`/api/escalations/${id}`),
};

export const voiceApi = {
  // Node owns the Exotel credentials end to end - the frontend only ever
  // triggers/reads call status for an existing escalation.
  initiateCall: (escalationId) => api.post(`/api/voice/escalations/${escalationId}/call`),
  getStatus: (escalationId) => api.get(`/api/voice/escalations/${escalationId}/call`),
};

export default api;
