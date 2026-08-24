"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, Menu, Ticket, X } from "lucide-react";
import { useEffect, useState } from "react";

import { api, clearTokens, getAccessToken } from "@/lib/api";
import type { User } from "@/types";

const links = [
  { href: "/events", label: "Discover" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = async () => {
      if (!getAccessToken()) {
        setUser(null);
        return;
      }
      try {
        setUser(await api.getMe());
      } catch {
        clearTokens();
        setUser(null);
      }
    };
    sync();
    window.addEventListener("eventify-auth-changed", sync);
    return () => window.removeEventListener("eventify-auth-changed", sync);
  }, []);

  const logout = () => {
    clearTokens();
    setUser(null);
    setOpen(false);
    router.push("/");
  };

  const goTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink/10 bg-sand/90 backdrop-blur-xl">
      <div className="section-shell flex h-20 items-center justify-between">
        <Link href="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink font-display text-xl font-black text-white transition group-hover:bg-coral">E</span>
          <span className="font-display text-2xl font-bold tracking-tight text-ink">eventify<span className="text-coral">.</span></span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`text-sm font-semibold transition hover:text-coral ${pathname === link.href ? "text-coral" : "text-ink/65"}`}>
              {link.label}
            </Link>
          ))}
          {user?.role === "admin" && (
            <Link href="/admin/events" className={`text-sm font-semibold transition hover:text-coral ${pathname.startsWith("/admin") ? "text-coral" : "text-ink/65"}`}>
              Manage events
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link href="/tickets" className="button-secondary px-4 py-2.5"><Ticket size={16} /> My tickets</Link>
              <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-coral text-sm font-bold text-white" title="Open profile">
                {user.name.charAt(0).toUpperCase()}
              </Link>
              <button onClick={logout} className="text-sm font-semibold text-ink/55 transition hover:text-coral">Log out</button>
            </>
          ) : (
            <Link href="/signin" className="button-primary px-5 py-2.5">Sign in <ChevronRight size={16} /></Link>
          )}
        </div>

        <button className="grid h-10 w-10 place-items-center rounded-full border border-ink/10 md:hidden" aria-label="Toggle navigation" onClick={() => setOpen((value) => !value)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink/10 bg-sand px-5 py-5 shadow-lg md:hidden">
          <nav className="grid gap-2">
            {links.map((link) => <button key={link.href} onClick={() => goTo(link.href)} className="flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold text-ink/70 hover:bg-white">{link.label}<ChevronRight size={16} /></button>)}
            {user?.role === "admin" && <button onClick={() => goTo("/admin/events")} className="flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold text-ink/70 hover:bg-white">Manage events<ChevronRight size={16} /></button>}
            {user ? (
              <>
                <button onClick={() => goTo("/tickets")} className="flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold text-ink/70 hover:bg-white">My tickets<ChevronRight size={16} /></button>
                <button onClick={() => goTo("/profile")} className="flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold text-ink/70 hover:bg-white">Profile<ChevronRight size={16} /></button>
                <button onClick={logout} className="mt-2 rounded-2xl bg-ink px-4 py-3 text-left text-sm font-semibold text-white">Log out</button>
              </>
            ) : <button onClick={() => goTo("/signin")} className="mt-2 rounded-2xl bg-coral px-4 py-3 text-left text-sm font-semibold text-white">Sign in</button>}
          </nav>
        </div>
      )}
    </header>
  );
}
