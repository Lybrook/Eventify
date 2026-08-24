"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, KeyRound, LogOut, Save, Shield, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { api, clearTokens, getAccessToken } from "@/lib/api";
import type { User } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAccessToken()) { router.push("/signin?next=/profile"); return; }
    api.getMe().then((data) => { setUser(data); setForm({ name: data.name, email: data.email }); }).catch(() => { clearTokens(); router.push("/signin"); }).finally(() => setLoading(false));
  }, [router]);

  const saveProfile = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); setMessage(""); try { const updated = await api.updateMe(form); setUser(updated); setMessage("Profile updated successfully."); } catch (err) { setError(err instanceof Error ? err.message : "Could not update profile."); } finally { setSaving(false); } };
  const savePassword = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); setMessage(""); try { await api.changePassword(passwords.current, passwords.next); setPasswords({ current: "", next: "" }); setMessage("Password changed successfully."); } catch (err) { setError(err instanceof Error ? err.message : "Could not change password."); } finally { setSaving(false); } };
  const deleteAccount = async () => { const password = window.prompt("Enter your password to permanently delete your account."); if (!password) return; setSaving(true); try { await api.deleteMe(password); clearTokens(); router.push("/"); } catch (err) { setError(err instanceof Error ? err.message : "Could not delete your account."); setSaving(false); } };

  if (loading) return <section className="section-shell py-14"><div className="h-96 animate-pulse rounded-[2.5rem] bg-ink/10" /></section>;
  if (!user) return null;

  return <section className="section-shell pb-24 pt-10 sm:pt-14"><div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]"><aside className="rounded-[2.5rem] bg-ink p-7 text-white shadow-soft sm:p-10"><div className="grid h-20 w-20 place-items-center rounded-[1.75rem] bg-coral font-display text-4xl font-bold">{user.name.charAt(0).toUpperCase()}</div><p className="eyebrow mt-10 text-[#f7a395]">Your account</p><h1 className="mt-3 font-display text-4xl font-bold leading-tight">{user.name}</h1><p className="mt-3 text-sm text-white/55">{user.email}</p><div className="mt-10 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold"><Shield size={17} className="text-coral" />{user.role === "admin" ? "Administrator" : "Eventify member"}</div><button onClick={() => { clearTokens(); router.push("/"); }} className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/55 transition hover:text-white"><LogOut size={16} /> Sign out</button></aside><div className="grid gap-5"><div className="surface p-6 sm:p-8"><div className="mb-7 flex items-start justify-between gap-4"><div><p className="eyebrow mb-2">Personal details</p><h2 className="font-display text-3xl font-bold">Make it yours.</h2></div><UserRound className="text-coral" size={24} /></div><form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Name<input className="input-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label className="grid gap-2 text-sm font-semibold">Email<input className="input-control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><button disabled={saving} className="button-primary sm:col-span-2 sm:w-fit"><Save size={16} /> Save changes</button></form></div><div className="surface p-6 sm:p-8"><div className="mb-7 flex items-start justify-between gap-4"><div><p className="eyebrow mb-2">Security</p><h2 className="font-display text-3xl font-bold">Keep it safe.</h2></div><KeyRound className="text-coral" size={24} /></div><form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Current password<input className="input-control" type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} required /></label><label className="grid gap-2 text-sm font-semibold">New password<input className="input-control" type="password" minLength={8} value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} required /></label><button disabled={saving} className="button-secondary sm:col-span-2 sm:w-fit"><Check size={16} /> Change password</button></form></div><div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-red-800">Delete account</p><p className="mt-1 max-w-lg text-sm leading-6 text-red-700/75">This permanently removes your profile and is not reversible. Your paid ticket history is retained for transaction integrity.</p></div><Trash2 className="shrink-0 text-red-600" size={20} /></div><button disabled={saving} onClick={deleteAccount} className="mt-5 text-sm font-bold text-red-700 underline decoration-red-300 underline-offset-4 hover:text-red-900">Delete my account</button></div>{(message || error) && <div className={`rounded-2xl px-5 py-4 text-sm ${error ? "border border-red-200 bg-red-50 text-red-700" : "border border-green-200 bg-green-50 text-green-800"}`}>{error || message}</div>}</div></div></section>;
}
