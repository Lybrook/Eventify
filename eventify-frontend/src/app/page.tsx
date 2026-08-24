import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, MapPin, Sparkles, Ticket, Users } from "lucide-react";

const categories = [
  { name: "Music", count: "24 events", tone: "bg-[#f6ddd5]" },
  { name: "Technology", count: "18 events", tone: "bg-[#dce9ee]" },
  { name: "Food & culture", count: "16 events", tone: "bg-[#e8e5ce]" },
  { name: "Sport & wellness", count: "12 events", tone: "bg-[#dbe6d8]" },
];

const benefits = [
  "Curated happenings across Kenya",
  "Simple, secure mobile-money checkout",
  "Digital tickets ready when you are",
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-sand pb-20 pt-12 lg:pb-28 lg:pt-20">
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-coral/10 blur-3xl" />
        <div className="section-shell grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div className="relative z-10">
            <div className="eyebrow mb-6 flex items-center gap-2"><Sparkles size={14} /> Nairobi, and everywhere worth going</div>
            <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.98] tracking-[-0.055em] text-ink sm:text-7xl">
              Make plans<br /><span className="text-coral">worth showing up for.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-ink/65 sm:text-xl">
              Eventify brings the best concerts, conversations, tastings, and community moments into one calm place to discover and book.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/events" className="button-primary">Explore events <ArrowUpRight size={18} /></Link>
              <Link href="/about" className="button-secondary">Why Eventify</Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 text-sm text-ink/55">
              <span className="flex items-center gap-2"><Users size={16} className="text-coral" /> 50k+ attendees</span>
              <span className="flex items-center gap-2"><Ticket size={16} className="text-coral" /> Instant digital tickets</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-5 top-10 z-10 hidden -rotate-6 rounded-2xl bg-ink px-5 py-4 text-white shadow-xl sm:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">This weekend</p>
              <p className="mt-1 font-display text-xl font-bold">Find your people.</p>
            </div>
            <div className="relative aspect-[0.88] overflow-hidden rounded-[3rem] bg-ink shadow-soft">
              <Image src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85" alt="A crowd enjoying a live event" fill priority className="object-cover opacity-85" sizes="(max-width: 1024px) 90vw, 45vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-coral/10" />
              <div className="absolute bottom-0 left-0 right-0 p-7 text-white sm:p-9">
                <div className="mb-4 flex items-center gap-2 text-sm text-white/70"><CalendarDays size={16} /> 18 October 2026</div>
                <h2 className="max-w-sm font-display text-3xl font-bold leading-tight sm:text-4xl">Live music under Nairobi skies.</h2>
                <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-5 text-sm">
                  <span className="flex items-center gap-2 text-white/70"><MapPin size={15} /> KICC, Nairobi</span>
                  <span className="font-bold">From KES 2,500</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 -right-4 hidden w-40 rounded-3xl border border-ink/10 bg-white p-4 shadow-soft sm:block">
              <div className="mb-3 flex -space-x-2"><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-coral text-xs font-bold text-white">A</span><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#b6c7d1] text-xs font-bold text-ink">K</span><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#e0bc8b] text-xs font-bold text-ink">M</span></div>
              <p className="text-xs font-bold text-ink">Good plans are better together.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="section-shell">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="eyebrow mb-3">Find your frequency</p><h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Something for every mood.</h2></div>
            <Link href="/events" className="flex items-center gap-2 text-sm font-bold text-coral transition hover:gap-3">View all events <ArrowUpRight size={17} /></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => <Link href={`/events?category=${encodeURIComponent(category.name)}`} key={category.name} className={`group rounded-[1.75rem] ${category.tone} p-6 transition duration-200 hover:-translate-y-1 hover:shadow-soft`}><div className="flex h-28 flex-col justify-between"><span className="self-end rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-ink/60">{category.count}</span><span className="font-display text-2xl font-bold text-ink">{category.name}<ArrowUpRight className="ml-2 inline-block transition group-hover:translate-x-1 group-hover:-translate-y-1" size={18} /></span></div></Link>)}
          </div>
        </div>
      </section>

      <section className="bg-ink py-20 text-white lg:py-28">
        <div className="section-shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div><p className="eyebrow mb-4 text-[#f7a395]">A better way to go out</p><h2 className="max-w-lg font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Less scrolling. More living.</h2><p className="mt-6 max-w-md text-base leading-8 text-white/60">From first discovery to the ticket at the door, Eventify keeps the little details light so the moment can be the main thing.</p><Link href="/about" className="button-secondary mt-8 border-white/20 bg-white/5 text-white hover:border-coral hover:bg-coral hover:text-white">See how it works <ArrowUpRight size={17} /></Link></div>
          <div className="grid gap-4 sm:grid-cols-3">
            {benefits.map((benefit, index) => <div key={benefit} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6"><span className="mb-12 grid h-10 w-10 place-items-center rounded-full bg-coral font-display text-lg font-bold">{index + 1}</span><p className="font-display text-xl font-bold leading-tight">{benefit}</p><Check className="mt-6 text-coral" size={20} /></div>)}
          </div>
        </div>
      </section>

      <section className="bg-sand py-20 lg:py-28">
        <div className="section-shell grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="surface overflow-hidden bg-[#d8e4e7] p-3 shadow-none"><div className="relative aspect-[1.2] overflow-hidden rounded-[1.5rem]"><Image src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=85" alt="People gathering for a conference" fill className="object-cover" sizes="(max-width: 1024px) 90vw, 45vw" /><div className="absolute inset-x-5 bottom-5 rounded-2xl bg-white/90 p-4 backdrop-blur"><div className="flex items-center justify-between"><span className="eyebrow">Featured</span><span className="text-sm font-bold text-ink">Nov 07</span></div><p className="mt-1 font-display text-xl font-bold">East Africa Tech Forum</p></div></div></div>
          <div className="lg:pl-10"><p className="eyebrow mb-4">For organizers, too</p><h2 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Put your event in the right room.</h2><p className="mt-6 max-w-lg text-lg leading-8 text-ink/65">Create a beautiful listing, keep inventory clear, and let attendees focus on why they want to be there. Event management that feels human.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/signin" className="button-primary">Create an organizer account <ArrowUpRight size={17} /></Link><Link href="/support" className="button-secondary">Talk to us</Link></div></div>
        </div>
      </section>
    </>
  );
}
