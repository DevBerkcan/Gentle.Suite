"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, CheckCircle2, ClipboardCheck, LifeBuoy, ListTodo, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "@/lib/api";

type Item = { kind: string; id: string; title: string; customerName?: string; customerId?: string; dueDate?: string; overdue: boolean; href: string; detail?: string };
type Week = { linked: boolean; teamMemberName?: string; until: string; tasks: Item[]; tickets: Item[]; opportunities: Item[]; onboarding: Item[]; unassignedDueTasks: number };

const KIND_LABEL: Record<string, string> = { Call: "Anruf", Meeting: "Termin", Task: "Aufgabe", Email: "E-Mail" };
const due = (d?: string) => {
  if (!d) return "ohne Termin";
  const date = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(date.toDateString()).getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "heute";
  if (diff === 1) return "morgen";
  if (diff === -1) return "gestern";
  return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });
};

function Section({ title, icon: Icon, items, empty, onDone }: { title: string; icon: LucideIcon; items: Item[]; empty: string; onDone?: (id: string) => void }) {
  const overdue = items.filter(i => i.overdue).length;
  return <section className="rounded-2xl border border-border bg-surface overflow-hidden">
    <div className="p-5 border-b border-border flex items-center justify-between gap-3">
      <h2 className="font-semibold flex items-center gap-2"><Icon size={18} className="text-muted" aria-hidden="true" />{title}</h2>
      <span className="text-xs text-muted">{items.length}{overdue > 0 && <span className="text-danger"> · {overdue} überfällig</span>}</span>
    </div>
    {items.length === 0 ? <p className="p-6 text-sm text-muted flex items-center gap-2"><CheckCircle2 size={16} className="text-success" aria-hidden="true" />{empty}</p> :
      <ul className="divide-y divide-border">{items.map(i => <li key={i.id} className="flex items-center gap-3 px-5 py-3">
        {onDone && <button onClick={() => onDone(i.id)} aria-label={`„${i.title}“ erledigt`} title="Erledigt" className="h-5 w-5 shrink-0 rounded border border-border hover:border-success hover:bg-success/10" />}
        <Link href={i.href} className="min-w-0 flex-1 hover:underline">
          <p className="text-sm font-medium truncate">{i.title}</p>
          <p className="text-xs text-muted mt-0.5 truncate">{[KIND_LABEL[i.kind], i.customerName, i.detail].filter(Boolean).join(" · ")}</p>
        </Link>
        <span className={`text-xs whitespace-nowrap ${i.overdue ? "text-danger font-semibold" : "text-muted"}`}>{due(i.dueDate)}</span>
      </li>)}</ul>}
  </section>;
}

export default function MyWeekPage() {
  const [week, setWeek] = useState<Week | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => { api.myWeek().then(setWeek).catch(() => setError("„Meine Woche“ konnte nicht geladen werden.")); }, []);
  useEffect(() => { load(); }, [load]);

  async function done(id: string) {
    setWeek(w => w ? { ...w, tasks: w.tasks.filter(t => t.id !== id) } : w);
    try { await api.completeCrmActivity(id); } catch { setError("Aufgabe konnte nicht abgeschlossen werden."); load(); }
  }

  return <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
    <header>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Persönlich</p>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-3"><CalendarCheck className="text-primary" aria-hidden="true" />Meine Woche</h1>
      <p className="text-sm text-muted mt-2">{week?.teamMemberName ? `${week.teamMemberName} · ` : ""}Überfälliges und alles, was in den nächsten 7 Tagen fällig ist.</p>
    </header>
    {error && <div role="alert" className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning">{error}</div>}
    {week && !week.linked && <div className="rounded-xl border border-border bg-surface p-5 text-sm">
      Dein Login ist noch keinem Mitarbeiter zugeordnet – deshalb fehlen Aufgaben, Tickets und Opportunities.
      <Link href="/team" className="ml-1 text-primary hover:underline">Unter Mitarbeiter verknüpfen ↗</Link>
    </div>}
    {!week && !error && <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-pulse">{[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-2xl border border-border bg-surface" />)}</div>}
    {week && <>
      {week.unassignedDueTasks > 0 && <p className="text-sm text-muted">{week.unassignedDueTasks} fällige Aufgabe{week.unassignedDueTasks === 1 ? " ist" : "n sind"} niemandem zugewiesen – siehe Dashboard → Handlungsbedarf.</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Aufgaben & Rückrufe" icon={ListTodo} items={week.tasks} empty="Keine offenen Aufgaben." onDone={done} />
        <Section title="Tickets nach SLA" icon={LifeBuoy} items={week.tickets} empty="Keine offenen Tickets." />
        <Section title="Opportunities vor Abschluss" icon={TrendingUp} items={week.opportunities} empty="Keine Abschlüsse diese Woche geplant." />
        <Section title="Onboarding-Aufgaben" icon={ClipboardCheck} items={week.onboarding} empty="Keine fälligen Onboarding-Aufgaben." />
      </div>
    </>}
  </div>;
}
