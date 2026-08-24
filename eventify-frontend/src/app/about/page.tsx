import Image from "next/image";
import { ArrowUpRight, Compass, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

const pillars = [
  { icon: Compass, title: "Curated discovery", copy: "Find the rooms and gatherings that fit the way you want to spend your time." },
  { icon: ShieldCheck, title: "Clear by design", copy: "From ticket availability to payment status, the details stay easy to understand." },
  { icon: HeartHandshake, title: "Built for community", copy: "A better experience for the people making events happen and the people showing up." },
];

export default function AboutPage() {
  return <section className="bg-sand pb-24"><div className="section-shell pt-10 sm:pt-14"><div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center"><div><p className="eyebrow mb-5">Why Eventify exists</p><h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.98] tracking-[-0.05em] sm:text-7xl">There is more to a good event than a date and a venue.</h1><p className="mt-7 max-w-xl text-lg leading-8 text-ink/65">Eventify is a home for the moments that turn an ordinary week into a story. We are making event discovery feel more personal, and event management feel more human.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/events" className="button-primary">Find your next moment <ArrowUpRight size={17} /></Link><Link href="/support" className="button-secondary">Talk to the team</Link></div></div><div className="relative aspect-[0.9] overflow-hidden rounded-[2.5rem] bg-ink shadow-soft"><Image src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1000&q=85" alt="A joyful event crowd" fill className="object-cover opacity-85" sizes="(max-width: 1024px) 90vw, 45vw" /><div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-coral/10" /><div className="absolute bottom-6 left-6 right-6 text-white"><div className="flex items-center gap-2 text-sm text-white/65"><Sparkles size={16} className="text-[#f7a395]" /> Made for meaningful plans</div><p className="mt-2 font-display text-3xl font-bold">Come as you are. Leave with a memory.</p></div></div></div><div className="mt-20 grid gap-4 md:grid-cols-3">{pillars.map(({ icon: Icon, title, copy }) => <div key={title} className="rounded-[1.75rem] border border-ink/10 bg-white p-7"><Icon className="text-coral" size={24} /><h2 className="mt-12 font-display text-2xl font-bold">{title}</h2><p className="mt-3 text-sm leading-7 text-ink/55">{copy}</p></div>)}</div></div></section>;
}
