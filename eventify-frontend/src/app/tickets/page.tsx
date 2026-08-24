"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, MapPin, Ticket as TicketIcon, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { api, getAccessToken, listFrom } from "@/lib/api";
import { formatCurrency, formatEventDate } from "@/lib/format";
import type { Payment, Ticket } from "@/types";

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    if (!getAccessToken()) { router.push("/signin?next=/tickets"); return; }
    try {
      const [ticketPayload, paymentPayload] = await Promise.all([api.getTickets(), api.getPayments()]);
      setTickets(listFrom(ticketPayload));
      setPayments(listFrom(paymentPayload));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your tickets.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const paidCount = tickets.filter((ticket) => ticket.status === "paid").length;
  const pendingCount = tickets.filter((ticket) => ticket.status === "pending" || ticket.status === "confirmed").length;
  const paymentFor = (ticketId: number) => payments.find((payment) => payment.ticket_id === ticketId);
  const cancel = async (id: number) => {
    try { await api.cancelTicket(id); setTickets((items) => items.filter((ticket) => ticket.id !== id)); setNotice("Ticket cancelled and inventory released."); } catch (err) { setError(err instanceof Error ? err.message : "Could not cancel this ticket."); }
  };

  return <section className="section-shell bg-sand pb-24 pt-10 sm:pt-14">
    <div className="grid gap-8 rounded-[2.5rem] bg-ink p-7 text-white shadow-soft sm:p-12 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="eyebrow mb-4 text-[#f7a395]">Your little black book</p><h1 className="font-display text-5xl font-bold tracking-[-0.05em] sm:text-6xl">My tickets.</h1><p className="mt-4 max-w-lg text-base leading-7 text-white/60">Everything you have booked, with the payment trail attached. Keep this page handy on the day.</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-white/50">Paid</p><p className="mt-2 font-display text-3xl font-bold">{paidCount}</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-white/50">In progress</p><p className="mt-2 font-display text-3xl font-bold">{pendingCount}</p></div></div></div>
    {notice && <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notification"><XCircle size={17} /></button></div>}
    {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}
    {loading ? <div className="mt-10 grid gap-4"><div className="h-44 animate-pulse rounded-[1.75rem] bg-ink/10" /><div className="h-44 animate-pulse rounded-[1.75rem] bg-ink/10" /></div> : tickets.length === 0 ? <div className="surface mt-10 p-12 text-center"><TicketIcon className="mx-auto text-coral" size={34} /><h2 className="mt-4 font-display text-2xl font-bold">Your wallet is waiting.</h2><p className="mt-2 text-sm text-ink/55">Find an event that feels like a yes, then your ticket will live here.</p><button onClick={() => router.push("/events")} className="button-primary mt-6">Discover events</button></div> : <div className="mt-10 grid gap-4">{tickets.map((ticket) => { const payment = paymentFor(ticket.id); const paid = ticket.status === "paid" || payment?.status === "completed"; return <article key={ticket.id} className="surface flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-4"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${paid ? "bg-green-100 text-green-700" : ticket.status === "failed" ? "bg-red-100 text-red-700" : "bg-[#f6ddd5] text-coral"}`}>{paid ? <CheckCircle2 size={22} /> : ticket.status === "failed" ? <XCircle size={22} /> : <Clock3 size={22} />}</div><div><div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-2xl font-bold">{ticket.event_title}</h2><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${paid ? "bg-green-100 text-green-700" : ticket.status === "failed" ? "bg-red-100 text-red-700" : "bg-[#f6ddd5] text-coral"}`}>{paid ? "Paid" : ticket.status === "failed" ? "Payment failed" : "Awaiting payment"}</span></div><div className="mt-3 grid gap-2 text-sm font-semibold text-ink/55 sm:grid-cols-2"><span className="flex items-center gap-2"><CalendarDays size={15} className="text-coral" />{formatEventDate(ticket.event_date)}</span><span className="flex items-center gap-2"><MapPin size={15} className="text-coral" />{ticket.event_location}</span><span className="flex items-center gap-2"><TicketIcon size={15} className="text-coral" />{formatCurrency(ticket.ticket_price)}</span></div>{payment?.mpesa_receipt_number && <p className="mt-3 text-xs font-bold text-green-700">M-Pesa receipt: {payment.mpesa_receipt_number}</p>}</div></div>{!paid && ticket.status !== "failed" && <button onClick={() => cancel(ticket.id)} className="button-secondary shrink-0 text-xs"><Trash2 size={15} /> Cancel</button>}</article>; })}</div>}
  </section>;
}
