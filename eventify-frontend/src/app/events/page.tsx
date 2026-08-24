"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Filter, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";

import CheckoutDrawer from "@/components/CheckoutDrawer";
import EventCard from "@/components/EventCard";
import EventModal from "@/components/EventModal";
import { api, listFrom } from "@/lib/api";
import type { EventItem, Ticket } from "@/types";

const categories = ["All categories", "Music", "Technology", "Food & Drinks", "Art & Culture", "Sports", "Business"];

type CartItem = EventItem & { quantity: number };

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [location, setLocation] = useState("All locations");
  const [date, setDate] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.getEvents().then((payload) => setEvents(listFrom(payload))).catch((err) => setError(err instanceof Error ? err.message : "Could not load events.")).finally(() => setLoading(false));
  }, []);

  const locations = useMemo(() => ["All locations", ...Array.from(new Set(events.map((event) => event.location.split(",").at(-1)?.trim() || event.location)))], [events]);
  const filtered = useMemo(() => events.filter((event) => {
    const matchesSearch = `${event.title} ${event.description} ${event.location}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All categories" || event.category === category;
    const matchesLocation = location === "All locations" || event.location.toLowerCase().includes(location.toLowerCase());
    const matchesDate = !date || event.date.startsWith(date);
    return matchesSearch && matchesCategory && matchesLocation && matchesDate;
  }), [events, search, category, location, date]);

  const addToPlan = (event: EventItem) => {
    setCart((items) => items.some((item) => item.id === event.id) ? items.map((item) => item.id === event.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...event, quantity: 1 }]);
    setNotice(`${event.title} added to your plan.`);
    window.setTimeout(() => setNotice(""), 2500);
  };

  const removeFromPlan = (id: number) => setCart((items) => items.filter((item) => item.id !== id));
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const checkoutSuccess = (tickets: Ticket[]) => {
    setCart([]);
    setCheckoutOpen(false);
    router.push(`/tickets?paid=${tickets.length}`);
  };

  return (
    <section className="bg-sand pb-24">
      <div className="section-shell pt-10 sm:pt-14">
        <div className="grid gap-8 rounded-[2.5rem] bg-ink p-7 text-white shadow-soft sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end lg:p-14">
          <div><p className="eyebrow mb-5 text-[#f7a395]">The good stuff, in one place</p><h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.98] tracking-[-0.05em] sm:text-7xl">Find something<br /><span className="text-[#f7a395]">worth the trip.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-white/60 sm:text-lg">Browse a considered mix of events around Kenya. Search by mood, date, or neighbourhood, then make a plan.</p></div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 lg:w-64"><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">On the calendar</p><p className="mt-3 font-display text-4xl font-bold">{events.length || "—"}</p><p className="mt-1 text-sm text-white/55">events to discover</p></div>
        </div>

        <div className="surface relative z-10 -mt-6 grid gap-3 p-3 sm:grid-cols-[1.5fr_1fr_1fr] lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <label className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><input className="input-control border-transparent bg-sand pl-11" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events, places, people..." /></label>
          <label className="relative"><Filter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={17} /><select className="input-control appearance-none border-transparent bg-sand pl-11 pr-10" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/35" size={16} /></label>
          <label className="relative"><SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={17} /><select className="input-control appearance-none border-transparent bg-sand pl-11 pr-10" value={location} onChange={(e) => setLocation(e.target.value)}>{locations.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/35" size={16} /></label>
          <label className="relative"><CalendarDays className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={17} /><input className="input-control border-transparent bg-sand pl-11" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>

        <div className="mt-14 flex items-end justify-between gap-4"><div><p className="eyebrow mb-3">Curated for you</p><h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{category === "All categories" ? "All events" : category}</h2></div><p className="text-sm font-semibold text-ink/45">{filtered.length} result{filtered.length === 1 ? "" : "s"}</p></div>
        {notice && <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
        {loading ? <div className="grid gap-5 py-10 md:grid-cols-2 lg:grid-cols-3"><div className="h-96 animate-pulse rounded-[1.75rem] bg-ink/10" /><div className="h-96 animate-pulse rounded-[1.75rem] bg-ink/10" /><div className="h-96 animate-pulse rounded-[1.75rem] bg-ink/10" /></div> : error ? <div className="mt-8 rounded-[1.75rem] border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div> : filtered.length === 0 ? <div className="mt-8 rounded-[1.75rem] border border-ink/10 bg-white p-12 text-center"><p className="font-display text-2xl font-bold">Nothing matches that search.</p><p className="mt-2 text-sm text-ink/55">Try a different category, date, or location.</p><button onClick={() => { setSearch(""); setCategory("All categories"); setLocation("All locations"); setDate(""); }} className="button-secondary mt-6">Clear filters <X size={16} /></button></div> : <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map((event) => <EventCard key={event.id} event={event} onBook={addToPlan} onView={setSelected} />)}</div>}
      </div>
      <button onClick={() => setCheckoutOpen(true)} className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-coral px-5 py-4 text-sm font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-ink"><ShoppingBag size={18} /> Plan <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/20 px-1">{cartCount}</span></button>
      {selected && <EventModal event={selected} onClose={() => setSelected(null)} onBook={addToPlan} />}
      <CheckoutDrawer items={cart} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} onRemove={removeFromPlan} onSuccess={checkoutSuccess} />
    </section>
  );
}
