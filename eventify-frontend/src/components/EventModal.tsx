"use client";

import Image from "next/image";
import { CalendarDays, MapPin, Ticket, X } from "lucide-react";

import { formatCurrency, formatEventDate } from "@/lib/format";
import type { EventItem } from "@/types";

type EventModalProps = { event: EventItem; onClose: () => void; onBook: (event: EventItem) => void };

export default function EventModal({ event, onClose, onBook }: EventModalProps) {
  const image = event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80";
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={event.title} onClick={onClose}>
      <div className="surface max-h-[90vh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-[2/1] overflow-hidden"><Image src={image} alt={event.title} fill className="object-cover" sizes="(max-width: 768px) 95vw, 672px" /><div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" /><button onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink transition hover:bg-coral hover:text-white" aria-label="Close event details"><X size={18} /></button><div className="absolute bottom-5 left-6 right-6 text-white"><span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{event.category}</span><h2 className="mt-1 font-display text-3xl font-bold">{event.title}</h2></div></div>
        <div className="p-6 sm:p-8"><p className="text-base leading-8 text-ink/65">{event.description}</p><div className="mt-6 grid gap-3 rounded-2xl bg-sand p-5 text-sm font-semibold text-ink/65 sm:grid-cols-2"><span className="flex items-center gap-2"><CalendarDays size={16} className="text-coral" /> {formatEventDate(event.date)}</span><span className="flex items-center gap-2"><MapPin size={16} className="text-coral" /> {event.location}</span><span className="flex items-center gap-2"><Ticket size={16} className="text-coral" /> {event.available_tickets} spots left</span><span className="font-display text-lg text-ink">{formatCurrency(event.ticket_price)}</span></div><button disabled={event.available_tickets < 1} onClick={() => { onBook(event); onClose(); }} className="button-primary mt-7 w-full disabled:cursor-not-allowed disabled:bg-ink/20">{event.available_tickets < 1 ? "Sold out" : "Add to plan"}</button></div>
      </div>
    </div>
  );
}
