"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { API_URL, setTokens } from "@/lib/api";

export default function AuthForm() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      if (isRegister) {
        const response = await fetch(`${API_URL}/auth/signup/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.detail || data?.email?.[0] || "Could not create your account.");
        setNotice("Account created. Sign in to continue.");
        setIsRegister(false);
        setForm((value) => ({ ...value, password: "" }));
        return;
      }

      const response = await fetch(`${API_URL}/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.detail || "Email or password is incorrect.");
      setTokens(data.access, data.refresh);
      const userResponse = await fetch(`${API_URL}/auth/me/`, { headers: { Authorization: `Bearer ${data.access}` } });
      const user = await userResponse.json();
      router.push(user.role === "admin" ? "/admin/events" : "/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface mx-auto grid max-w-5xl overflow-hidden shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-ink p-10 text-white lg:block">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-coral/40 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between">
          <div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-coral font-display text-2xl font-black">E</span><p className="mt-12 max-w-xs font-display text-4xl font-bold leading-tight">Your next good plan starts here.</p></div>
          <p className="max-w-xs text-sm leading-7 text-white/55">Keep your tickets in one place, discover the right rooms, and show up ready.</p>
        </div>
      </div>
      <div className="p-7 sm:p-12">
        <div className="mb-8"><p className="eyebrow mb-3">{isRegister ? "Join the community" : "Welcome back"}</p><h1 className="font-display text-4xl font-bold tracking-tight">{isRegister ? "Create your account." : "Sign in to Eventify."}</h1><p className="mt-3 text-sm leading-6 text-ink/55">{isRegister ? "Save your plans and keep every ticket within reach." : "Pick up where you left off and get back to making plans."}</p></div>
        {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>}
        <form className="grid gap-4" onSubmit={submit}>
          {isRegister && <label className="grid gap-2 text-sm font-semibold">Your name<div className="relative"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={17} /><input className="input-control pl-11" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Amina Wanjiku" /></div></label>}
          <label className="grid gap-2 text-sm font-semibold">Email address<div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={17} /><input className="input-control pl-11" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div></label>
          <label className="grid gap-2 text-sm font-semibold">Password<div className="relative"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={17} /><input className="input-control px-11" type={showPassword ? "text" : "password"} required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-coral">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          <button disabled={loading} className="button-primary mt-3 w-full disabled:cursor-wait disabled:opacity-60">{loading ? "Working..." : isRegister ? "Create account" : "Sign in"}<ArrowRight size={17} /></button>
        </form>
        <button onClick={() => { setIsRegister((value) => !value); setError(""); setNotice(""); }} className="mt-7 w-full text-center text-sm font-semibold text-ink/55 transition hover:text-coral">{isRegister ? "Already have an account? Sign in" : "New to Eventify? Create an account"}</button>
      </div>
    </div>
  );
}
