import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-white">
      <div className="section-shell grid gap-12 py-16 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-coral font-display text-xl font-black">E</span>
            <span className="font-display text-2xl font-bold">eventify</span>
          </div>
          <p className="max-w-sm text-sm leading-7 text-white/60">
            A considered way to find what is happening next. Discover events, secure your ticket, and make room for a great memory.
          </p>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-coral">Explore</p>
          <nav className="grid gap-3 text-sm text-white/70">
            <Link className="transition hover:text-white" href="/events">Discover events</Link>
            <Link className="transition hover:text-white" href="/about">About Eventify</Link>
            <Link className="transition hover:text-white" href="/support">Support centre</Link>
          </nav>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-coral">Reach us</p>
          <div className="grid gap-3 text-sm text-white/70">
            <a className="transition hover:text-white" href="mailto:hello@eventify.co.ke">hello@eventify.co.ke</a>
            <a className="transition hover:text-white" href="tel:+254712345678">+254 712 345 678</a>
            <span>Nairobi, Kenya</span>
          </div>
        </div>
      </div>
      <div className="section-shell flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Eventify. Built for better gatherings.</span>
        <span>Tickets secured with M-Pesa</span>
      </div>
    </footer>
  );
}
