export type UserRole = "user" | "admin";

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
};

export type EventItem = {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  ticket_price: string | number;
  available_tickets: number;
  featured: boolean;
  category: string;
  image_url: string;
  image?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Ticket = {
  id: number;
  event: number;
  event_title: string;
  event_date: string;
  event_location: string;
  ticket_price: string | number;
  user: number;
  purchase_date: string;
  status: "pending" | "confirmed" | "paid" | "failed" | "cancelled";
  inventory_released: boolean;
};

export type Payment = {
  id: number;
  transaction_id: string;
  ticket_id: number;
  event_title: string;
  amount: string | number;
  phone_number: string;
  status: "pending" | "initiated" | "completed" | "failed";
  checkout_request_id: string;
  merchant_request_id: string;
  mpesa_receipt_number: string;
  created_at: string;
  updated_at: string;
};

export type SupportTicket = {
  id: number;
  name: string;
  email: string;
  issue: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
