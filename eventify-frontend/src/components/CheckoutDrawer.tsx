"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, LoaderCircle, Phone, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { api, getAccessToken } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { EventItem, Ticket } from "@/types";

type CartItem = EventItem & { quantity: number };
type CheckoutDrawerProps = { items: CartItem[]; open: boolean; onClose: () => void; onRemove: (id: number) => void; onSuccess: (tickets: Ticket[]) => void };

export default function CheckoutDrawer({ items, open, onClose, onRemove, onSuccess }: CheckoutDrawerProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.ticket_price) * item.quantity, 0), [items]);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!getAccessToken()) {
      router.push("/signin?next=/events");
      return;
    }
    setProcessing(true);
    const purchased: Ticket[] = [];
    try {
      const expanded = items.flatMap((item) => Array.from({ length: item.quantity }, () => item));
      for (let index = 0; index < expanded.length; index += 1) {
        const item = expanded[index];
        setProgress(`Securing ticket ${index + 1} of ${expanded.length}`);
        const ticket = await api.bookTicket(item.id);
        await api.initiatePayment(ticket.id, phone);
        purchased.push(ticket);
      }
      onSuccess(purchased);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not start payment. Please try again.");
    } finally {
      setProcessing(false);
      setProgress("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/55 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Checkout">
      <button className="absolute inset-0 cursor-default" aria-label="Close checkout" onClick={onClose} />
      <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col bg-sand shadow-2xl sm:bottom-4 sm:right-4 sm:top-4 sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5 sm:px-8"><div><p className="eyebrow mb-1">Almost there</p><h2 className="font-display text-2xl font-bold">Your plan</h2></div><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-ink/10 hover:bg-white" aria-label="Close checkout"><X size={18} /></button></div>
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {items.length === 0 ? <div className="rounded-2xl bg-white p-6 text-center text-sm text-ink/55">Your plan is empty. Add an event to begin.</div> : <div className="grid gap-3">{items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white p-4"><div><p className="font-display font-bold">{item.title}</p><p className="mt-1 text-xs text-ink/55">{item.quantity} × {formatCurrency(item.ticket_price)}</p></div><button onClick={() => onRemove(item.id)} className="text-xs font-bold text-ink/45 hover:text-coral">Remove</button></div>)}</div>}
          <div className="mt-7 rounded-[1.75rem] bg-ink p-5 text-white"><div className="flex items-center justify-between"><span className="text-sm text-white/55">Total</span><span className="font-display text-3xl font-bold">{formatCurrency(total)}</span></div><p className="mt-2 text-xs leading-5 text-white/50">Each ticket is matched to its own payment record for reliable confirmation.</p></div>
          <form onSubmit={submit} className="mt-7 grid gap-4"><label className="grid gap-2 text-sm font-semibold">M-Pesa phone number<div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={17} /><input className="input-control pl-11" required pattern="[0-9+ ]{9,15}" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="254 712 345 678" /></div></label><div className="flex gap-3 rounded-2xl border border-ink/10 bg-white p-4 text-xs leading-5 text-ink/55"><ShieldCheck className="mt-0.5 shrink-0 text-coral" size={17} />You will receive a secure payment prompt on your phone. Never share your M-Pesa PIN.</div>{error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<button disabled={processing || items.length === 0} className="button-primary w-full disabled:cursor-wait disabled:opacity-60">{processing ? <><LoaderCircle className="animate-spin" size={17} />{progress}</> : <>Continue to secure payment <ArrowRight size={17} /></>}</button></form>
        </div>
      </aside>
    </div>
  );
}
