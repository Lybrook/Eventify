import Image from "next/image";
import { ArrowUpRight, CalendarDays, MapPin, Ticket } from "lucide-react";

import { formatCurrency, formatEventDate } from "@/lib/format";
import type { EventItem } from "@/types";

type EventCardProps = {
  event: EventItem;
  onBook: (event: EventItem) => void;
  onView: (event: EventItem) => void;
};

export default function EventCard({ event, onBook, onView }: EventCardProps) {
  const image = event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80";
  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      <button type="button" onClick={() => onView(event)} className="relative block aspect-[1.18] w-full overflow-hidden text-left">
        <Image src={image} alt={event.title} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2"><span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink">{event.category}</span>{event.featured && <span className="rounded-full bg-coral px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white">Featured</span>}</div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white"><span className="flex items-center gap-2 text-xs font-semibold"><CalendarDays size={14} /> {formatEventDate(event.date)}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 backdrop-blur transition group-hover:bg-coral"><ArrowUpRight size={17} /></span></div>
      </button>
      <div className="p-5">
        <h3 className="font-display text-2xl font-bold leading-tight text-ink">{event.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/55">{event.description}</p>
        <div className="mt-4 grid gap-2 text-xs font-semibold text-ink/55"><span className="flex items-center gap-2"><MapPin size={14} className="text-coral" /> {event.location}</span><span className="flex items-center gap-2"><Ticket size={14} className="text-coral" /> {event.available_tickets} spots left · {formatCurrency(event.ticket_price)}</span></div>
        <button type="button" disabled={event.available_tickets < 1} onClick={() => onBook(event)} className="button-primary mt-5 w-full disabled:cursor-not-allowed disabled:bg-ink/20">{event.available_tickets < 1 ? "Sold out" : "Add to plan"}<ArrowUpRight size={16} /></button>
      </div>
    </article>
  );
}
