"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  CalendarDays,
  Edit3,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import BrandMark from "@/components/BrandMark";
import { api, getAccessToken } from "@/lib/api";
import { getEventArtwork } from "@/lib/eventArtwork";
import { formatCurrency, formatEventDate } from "@/lib/format";
import type { EventItem, User } from "@/types";

const emptyForm = {
  title: "",
  description: "",
  date: "",
  location: "",
  category: "Music",
  ticket_price: "",
  available_tickets: "50",
  featured: false,
  image: null as File | null,
};

export default function AdminEventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [eventPage, setEventPage] = useState(1);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async (page = eventPage) => {
    setLoading(true);
    try {
      const currentUser = await api.getMe();
      if (currentUser.role !== "admin" && currentUser.role !== "organizer") {
        router.push("/events");
        return;
      }
      setUser(currentUser);
      const payload = await api.getEvents(`?page=${page}`);
      setEvents(payload.results);
      setEventCount(payload.count);
      setHasPreviousPage(Boolean(payload.previous));
      setHasNextPage(Boolean(payload.next));
      setError("");
    } catch {
      router.push("/signin?next=/admin/events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/signin?next=/admin/events");
      return;
    }
    load(eventPage);
  }, [router, eventPage]);

  const updateField = (key: string, value: string | boolean | File | null) =>
    setForm((current) => ({ ...current, [key]: value }));

  const edit = (event: EventItem) => {
    setEditing(event.id);
    setForm({
      title: event.title,
      description: event.description,
      date: event.date.slice(0, 10),
      location: event.location,
      category: event.category,
      ticket_price: String(event.ticket_price),
      available_tickets: String(event.available_tickets),
      featured: event.featured,
      image: null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const data = new FormData();
    data.append("title", form.title);
    data.append("description", form.description);
    data.append("date", form.date);
    data.append("location", form.location);
    data.append("category", form.category);
    data.append("ticket_price", form.ticket_price);
    data.append("available_tickets", form.available_tickets);
    data.append("featured", String(form.featured));
    if (form.image) data.append("image", form.image);

    try {
      if (editing) await api.updateEvent(editing, data);
      else await api.createEvent(data);
      reset();
      if (eventPage === 1) await load(1);
      else setEventPage(1);
      setMessage(editing ? "Event updated." : "Event created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this event? Events with protected ticket history cannot be removed.")) return;
    setError("");
    setMessage("");
    try {
      await api.deleteEvent(id);
      const nextPage = events.length === 1 && eventPage > 1 ? eventPage - 1 : eventPage;
      if (nextPage === eventPage) await load(nextPage);
      else setEventPage(nextPage);
      setMessage("Event deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete event.");
    }
  };

  if (loading || !user) {
    return (
      <section className="section-shell py-14">
        <div className="h-96 animate-pulse rounded-[2.5rem] bg-ink/10" />
      </section>
    );
  }

  return (
    <section className="section-shell pb-24 pt-10 sm:pt-14">
      <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow mb-3">Organizer workspace</p>
          <h1 className="font-display text-5xl font-bold tracking-[-0.05em]">Manage events.</h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-ink/55">
            Shape the calendar, keep inventory honest, and give every event a page worth opening.
          </p>
        </div>
        <div className="rounded-2xl bg-ink px-5 py-4 text-white">
          <p className="text-xs text-white/50">Live listings</p>
          <p className="mt-1 font-display text-3xl font-bold">{eventCount}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="surface h-fit p-6 sm:p-8">
          <div className="mb-7 flex items-start justify-between">
            <div>
              <p className="eyebrow mb-2">{editing ? "Edit listing" : "New listing"}</p>
              <h2 className="font-display text-3xl font-bold">
                {editing ? "Fine tune it." : "Put it on the calendar."}
              </h2>
            </div>
            {editing ? (
              <button
                onClick={reset}
                className="grid h-9 w-9 place-items-center rounded-full border border-ink/10 hover:bg-sand"
                aria-label="Cancel editing"
              >
                <X size={16} />
              </button>
            ) : (
              <Plus className="text-coral" size={24} />
            )}
          </div>

          <form onSubmit={submit} className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              Title
              <input
                className="input-control"
                required
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="East Africa Tech Forum"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Date
                <input
                  className="input-control"
                  required
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Ticket price
                <input
                  className="input-control"
                  required
                  min="0"
                  step="1"
                  type="number"
                  value={form.ticket_price}
                  onChange={(event) => updateField("ticket_price", event.target.value)}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Location
              <input
                className="input-control"
                required
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                placeholder="Sarit Centre, Nairobi"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Category
                <select
                  className="input-control"
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                >
                  {["Music", "Technology", "Food & Drinks", "Art & Culture", "Sports", "Business"].map(
                    (item) => <option key={item}>{item}</option>,
                  )}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Available tickets
                <input
                  className="input-control"
                  required
                  min="0"
                  type="number"
                  value={form.available_tickets}
                  onChange={(event) => updateField("available_tickets", event.target.value)}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Description
              <textarea
                className="input-control min-h-28 resize-y"
                required
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-sand px-4 py-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => updateField("featured", event.target.checked)}
                className="h-4 w-4 accent-[#f26b5b]"
              />
              Feature this event
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-ink/20 px-4 py-4 text-sm font-semibold text-ink/60 hover:border-coral hover:text-coral">
              <ImagePlus size={18} />
              {form.image ? form.image.name : "Upload event image to Supabase Storage"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateField("image", event.target.files?.[0] || null)
                }
              />
            </label>
            {error && (
              <div className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <ShieldAlert size={17} />
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                {message}
              </div>
            )}
            <button disabled={saving} className="button-primary mt-2 w-full disabled:opacity-60">
              {saving ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : editing ? (
                <Save size={17} />
              ) : (
                <Plus size={17} />
              )}
              {saving ? "Saving..." : editing ? "Save changes" : "Create event"}
            </button>
          </form>
        </div>

        <div className="grid gap-4">
          {events.map((event) => (
            <article
              key={event.id}
              className="surface flex flex-col gap-5 p-5 sm:flex-row sm:items-center"
            >
              <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-2xl bg-mist sm:w-48">
                <Image
                  src={getEventArtwork(event)}
                  alt={`${event.category} event artwork`}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
                {!event.image_url && (
                  <BrandMark className="absolute right-3 top-3 h-8 w-8 rounded-xl shadow" />
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">
                  {event.category}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-bold leading-tight">{event.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/55">{event.description}</p>
                  </div>
                  {event.featured && (
                    <span className="rounded-full bg-[#f6ddd5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-coral">
                      Featured
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-ink/55">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-coral" />
                    {formatEventDate(event.date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-coral" />
                    {event.location}
                  </span>
                  <span>{event.available_tickets} tickets · {formatCurrency(event.ticket_price)}</span>
                </div>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => edit(event)} className="button-secondary px-4 py-2 text-xs">
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => remove(event.id)}
                    className="rounded-full px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={14} className="mr-1 inline" /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {eventCount > 0 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button type="button" className="button-secondary" disabled={!hasPreviousPage} onClick={() => setEventPage((current) => current - 1)}>Previous</button>
            <span className="text-sm font-semibold text-ink/55">Page {eventPage}</span>
            <button type="button" className="button-secondary" disabled={!hasNextPage} onClick={() => setEventPage((current) => current + 1)}>Next</button>
          </div>
        )}
      </div>
    </section>
  );
}
