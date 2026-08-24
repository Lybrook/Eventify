import type {
  EventItem,
  Paginated,
  Payment,
  SupportTicket,
  Ticket,
  User,
} from "@/types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://eventify-x749.onrender.com/api/v1").replace(/\/$/, "");

const ACCESS_TOKEN_KEY = "eventify_access_token";
const REFRESH_TOKEN_KEY = "eventify_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(access: string, refresh?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  window.dispatchEvent(new Event("eventify-auth-changed"));
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new Event("eventify-auth-changed"));
}

async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refresh = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refresh) return false;
  const response = await fetch(`${API_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) return false;
  const data = (await response.json()) as { access: string; refresh?: string };
  setTokens(data.access, data.refresh);
  return true;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401 && retry && (await refreshAccessToken())) {
    return apiFetch<T>(path, options, false);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail || body?.message || "The request could not be completed.";
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return body as T;
}

export function listFrom<T>(payload: T[] | Paginated<T>): T[] {
  return Array.isArray(payload) ? payload : payload.results;
}

export const api = {
  getEvents: (query = "") => apiFetch<Paginated<EventItem> | EventItem[]>(`/events/${query}`),
  getEvent: (id: number) => apiFetch<EventItem>(`/events/${id}/`),
  createEvent: (data: FormData | Record<string, unknown>) =>
    apiFetch<EventItem>("/events/", { method: "POST", body: data instanceof FormData ? data : JSON.stringify(data) }),
  updateEvent: (id: number, data: FormData | Record<string, unknown>) =>
    apiFetch<EventItem>(`/events/${id}/`, { method: "PATCH", body: data instanceof FormData ? data : JSON.stringify(data) }),
  deleteEvent: (id: number) => apiFetch<void>(`/events/${id}/`, { method: "DELETE" }),
  getTickets: () => apiFetch<Paginated<Ticket> | Ticket[]>("/tickets/"),
  bookTicket: (eventId: number) => apiFetch<Ticket>("/tickets/", { method: "POST", body: JSON.stringify({ event_id: eventId }) }),
  cancelTicket: (id: number) => apiFetch<void>(`/tickets/${id}/`, { method: "DELETE" }),
  initiatePayment: (ticketId: number, phoneNumber: string) =>
    apiFetch<{ message: string; payment: Payment }>("/payments/mpesa/stk-push/", {
      method: "POST",
      body: JSON.stringify({ ticket_id: ticketId, phone_number: phoneNumber }),
    }),
  getPayments: () => apiFetch<Paginated<Payment> | Payment[]>("/payments/"),
  getMe: () => apiFetch<User>("/auth/me/"),
  updateMe: (data: Pick<User, "name" | "email">) => apiFetch<User>("/auth/me/", { method: "PATCH", body: JSON.stringify(data) }),
  deleteMe: (password: string) => apiFetch<void>("/auth/me/", { method: "DELETE", body: JSON.stringify({ password }) }),
  changePassword: (current_password: string, new_password: string) =>
    apiFetch<{ message: string }>("/auth/change-password/", { method: "POST", body: JSON.stringify({ current_password, new_password }) }),
  submitSupportTicket: (data: Pick<SupportTicket, "name" | "email" | "issue">) =>
    apiFetch<SupportTicket>("/support-tickets/", { method: "POST", body: JSON.stringify(data) }),
};
