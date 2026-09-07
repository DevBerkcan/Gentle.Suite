"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, RefreshCw, AlertCircle, Repeat2, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import type { BillingOverview, DashboardOverview } from "@/types/dashboard";

const money = (value: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
const date = (value: string) => new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const collectionLabels: Record<string, string> = { scheduled: "Geplant", open: "Angefragt", pending: "In Bearbeitung", authorized: "Autorisiert" };

function Metric({ label, value, hint, color = "text-text", href }: { label: string; value: string; hint: string; color?: string; href: string }) {
  return <Link href={href} className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors min-w-0">
    <div className="flex justify-between gap-2 text-sm text-muted"><span>{label}</span><ArrowUpRight size={16} className="shrink-0" aria-hidden="true" /></div>
    <p className={`mt-3 text-2xl xl:text-3xl font-semibold tracking-tight tabular-nums ${color}`}>{value}</p>
    <p className="mt-2 text-xs text-muted leading-relaxed">{hint}</p>
  </Link>;
}

function Progress({ percent, label }: { percent: number; label: string }) {
  return <div role="progressbar" aria-label={label} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1.5 rounded-full bg-border overflow-hidden"><div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} /></div>;
}

function BillingPanel({ title, summary, installment = false }: { title: string; summary: BillingOverview; installment?: boolean }) {
  const href = installment ? "/installments" : "/subscriptions";
  const paidPercent = summary.contractNet > 0 ? Math.min(100, summary.paidNet / summary.contractNet * 100) : 0;
  return <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/5 p-2.5 text-primary">{installment ? <Wallet size={20} aria-hidden="true" /> : <Repeat2 size={20} aria-hidden="true" />}</span><div><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted mt-1">{summary.active} aktiv · {summary.total} insgesamt</p></div></div>
      <Link href={href} className="text-xs font-medium text-primary hover:underline">Alle ansehen ↗</Link>
    </div>
    {installment ? <div className="mb-5 rounded-xl bg-background p-4">
      <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="text-muted">Bezahlt (Nettoanteil)</span><span className="font-semibold tabular-nums">{money(summary.paidNet)} <span className="font-normal text-muted">von {money(summary.contractNet)}</span></span></div>
      <Progress percent={paidPercent} label="Bezahlter Anteil der Ratenverträge" />
      <p className="text-xs text-muted mt-2">{summary.settled} vollständig bezahlt · ohne abgebrochene/beendete Verträge</p>
    </div> : <div className="mb-5 rounded-xl bg-background p-4"><p className="text-xs text-muted">Vertraglicher Monatswert · netto</p><p className="text-2xl font-semibold tabular-nums mt-1">{money(summary.monthlyNet)}</p><p className="text-xs text-muted mt-2">Aktive Serienverträge, ohne Ratenpläne. Kein Zahlungseingang.</p></div>}
    <div className="grid grid-cols-2 gap-x-5 gap-y-3">
      {summary.stages.filter(s => !["closed", "completed", "paused"].includes(s.key)).map(stage => <Link key={stage.key} href={href} className="flex items-center justify-between gap-2 text-sm hover:underline"><span className="text-muted">{stage.label}</span><span className={`font-semibold tabular-nums ${stage.count > 0 && stage.key !== "ready" ? "text-warning" : "text-text"}`}>{stage.count}</span></Link>)}
    </div>
    <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {summary.stages.filter(s => ["closed", "completed", "paused"].includes(s.key)).map(stage => <span key={stage.key}>{stage.label}: <b className="font-medium text-text">{stage.count}</b></span>)}
    </div>
  </section>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setRefreshing(true);
    try {
      const result = await api.dashboardOverview(controller.signal);
      if (!controller.signal.aborted) { setData(result); setError(""); }
    } catch {
      if (!controller.signal.aborted) setError("Die aktuellen Dashboard-Daten konnten nicht geladen werden. Bitte erneut aktualisieren.");
    } finally {
      if (request.current === controller) { request.current = null; setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) { window.location.href = "/login"; return; }
    void loadData();
    const refreshVisible = () => { if (document.visibilityState === "visible") void loadData(); };
    const interval = setInterval(refreshVisible, 30000);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", refreshVisible); request.current?.abort(); request.current = null; };
  }, [loadData]);

  const chart = data?.paymentChart.map(m => ({ name: `${months[m.month - 1]} ${String(m.year).slice(2)}`, Zahlungen: m.revenue, Ausgaben: m.expenses }));

  return <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Finanzen & Prozesse</p><h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Alles im Blick</h1><p className="text-sm text-muted mt-2">Serienrechnungen, Raten und die nächsten Schritte.</p></div>
      <div className="flex items-center gap-3">
        <div className="text-right text-xs text-muted"><p className="flex items-center justify-end gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-warning" : data ? "bg-success" : "bg-border"}`} />{data ? `Stand ${new Date(data.generatedAt).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin" })}` : error ? "Abruf fehlgeschlagen" : "Daten werden geladen"}</p><p className="mt-1">CRM-Daten · alle 30 Sekunden</p></div>
        <button onClick={() => void loadData()} disabled={refreshing} aria-label="Dashboard aktualisieren" className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-50 hover:bg-background"><RefreshCw size={15} className={refreshing ? "animate-spin" : ""} aria-hidden="true" /><span className="hidden sm:inline">Aktualisieren</span></button>
      </div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning">{error}{data && <p className="mt-1">Die angezeigten Werte stammen vom letzten erfolgreichen Abruf ({date(data.generatedAt)}).</p>}</div>}
    {!data && !error && <div role="status" aria-label="Dashboard wird geladen" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">{[1, 2, 3, 4].map(i => <div key={i} className="h-36 bg-surface border border-border rounded-2xl" />)}<span className="sr-only">Dashboard wird geladen…</span></div>}
    {data && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric label="Zahlungen diesen Monat" value={money(data.receivedThisMonth)} hint="Gebucht · brutto, nach Rücklastschriften" color="text-success" href="/invoices" />
        <Metric label="Offene Rechnungsbeträge" value={money(data.openInvoiceAmount)} hint={`${money(data.overdueInvoiceAmount)} überfällig · ${data.overdueInvoiceCount} Rechnungen`} color={data.overdueInvoiceCount ? "text-danger" : "text-text"} href="/invoices" />
        <Metric label="Serienumsatz pro Monat" value={money(data.recurring.monthlyNet)} hint={`${data.recurring.active} aktive Serienverträge · netto`} href="/subscriptions" />
        <Metric label="Verbleibende Ratenbeträge" value={money(data.installments.remainingNet)} hint="Vertragsrest netto · inkl. noch nicht fakturierter Raten" href="/installments" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5"><BillingPanel title="Serienrechnungen" summary={data.recurring} /><BillingPanel title="Ratenzahlungen" summary={data.installments} installment /></div>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div><p className="text-xs text-muted">SEPA-Einzüge geplant</p><p className="font-semibold text-xl mt-1 tabular-nums">{data.scheduledCollections} <span className="text-sm font-normal text-muted">· {money(data.scheduledAmount)}</span></p></div>
          <div><p className="text-xs text-muted">Einzüge in Bearbeitung</p><p className="font-semibold text-xl mt-1 tabular-nums">{data.processingCollections}</p></div>
          <div><p className="text-xs text-muted">Fehlgeschlagen / Rücklastschrift</p><p className={`font-semibold text-xl mt-1 tabular-nums ${data.failedCollections > 0 ? "text-danger" : ""}`}>{data.failedCollections}</p></div>
          <div><p className="text-xs text-muted">Überfällige Rechnungen</p><p className={`font-semibold text-xl mt-1 tabular-nums ${data.overdueInvoiceCount > 0 ? "text-danger" : ""}`}>{data.overdueInvoiceCount}</p></div>
        </div><p className="mt-3 text-xs text-muted">Gespeicherter Zahlungsstatus · geplante und laufende Einzüge gelten erst nach Zahlungsbuchung als bezahlt.</p>
      </section>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-5 border-b border-border flex justify-between items-center gap-3"><h2 className="font-semibold flex items-center gap-2"><AlertCircle size={18} className={data.attentionCount ? "text-warning" : "text-muted"} aria-hidden="true" />Handlungsbedarf</h2><span className="text-xs rounded-full bg-background px-2.5 py-1 font-medium">{data.attentionCount} Hinweise</span></div>
          <p className="px-5 pt-3 text-xs text-muted">Beträge zeigen den offenen Rechnungsrest (brutto).</p>
          {data.attention.length === 0 ? <div className="p-8 text-sm text-muted flex items-center justify-center gap-2"><CheckCircle2 size={18} className="text-success" aria-hidden="true" />Aktuell keine auffälligen Vorgänge.</div> : <div className="divide-y divide-border">{data.attention.map(item => <Link key={item.id} href={item.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-background transition-colors"><span className={`h-2 w-2 rounded-full shrink-0 ${item.severity === "danger" ? "bg-danger" : "bg-warning"}`} aria-hidden="true" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted mt-1 truncate">{item.customerName} · {item.detail}</p></div>{item.amount !== null && <span className="text-sm font-semibold tabular-nums shrink-0">{money(item.amount)}</span>}<ArrowUpRight size={15} className="text-muted shrink-0" aria-hidden="true" /></Link>)}</div>}
          {data.attentionCount > data.attention.length && <p className="px-5 py-3 text-xs text-muted border-t border-border">Die {data.attention.length} wichtigsten von {data.attentionCount} Hinweisen. Weitere Vorgänge unter Rechnungen, Serienrechnungen und Ratenzahlungen.</p>}
        </section>
        <section className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-5 border-b border-border"><div className="flex justify-between items-center gap-3"><h2 className="font-semibold flex items-center gap-2"><Clock3 size={18} className="text-muted" aria-hidden="true" />Nächste Einzüge</h2><Link href="/invoices" className="text-xs text-primary hover:underline">Rechnungen ↗</Link></div><p className="text-xs text-muted mt-2">Bis in 14 Tagen, inklusive ausstehender älterer Einzüge · brutto</p></div>
          {data.upcoming.length === 0 ? <p className="p-8 text-center text-sm text-muted">Keine offenen Einzüge in diesem Zeitraum geplant.</p> : <div className="divide-y divide-border">{data.upcoming.map(item => <Link key={item.invoiceId} href={`/invoices/${item.invoiceId}`} className="flex justify-between gap-3 px-5 py-3.5 hover:bg-background transition-colors"><div className="min-w-0"><p className="text-sm font-medium truncate">{item.customerName}</p><p className="text-xs text-muted mt-1">{item.invoiceNumber} · {item.isInstallmentPlan ? "Rate" : "Serie"} · {date(item.dueDate)}</p></div><div className="text-right shrink-0"><p className="text-sm font-semibold tabular-nums">{money(item.amount)}</p><p className={`text-xs mt-1 ${item.attempts > 0 ? "text-warning" : "text-muted"}`}>{item.attempts > 0 ? `Wiederholung nach ${item.attempts} Fehlversuch(en)` : collectionLabels[item.status] || item.status}</p></div></Link>)}</div>}
          {data.upcomingCount > data.upcoming.length && <p className="px-5 py-3 border-t border-border text-xs text-muted">{data.upcoming.length} von {data.upcomingCount} Einzügen angezeigt.</p>}
        </section>
      </div>
      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="p-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Ratenfortschritt nach Kunde</h2><p className="text-xs text-muted mt-1">Zahlungsfortschritt aus Rechnungsbuchungen · Beträge netto · größte Restbeträge zuerst</p></div><Link href="/installments" className="text-xs text-primary hover:underline">Alle Ratenpläne ↗</Link></div>
        {data.installmentTracking.length === 0 ? <p className="p-8 text-sm text-muted text-center border-t border-border">Noch keine laufenden oder fertig fakturierten Ratenpläne vorhanden.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-background border-y border-border text-xs text-muted"><tr><th scope="col" className="p-4 text-left font-medium">Kunde / Leistung</th><th scope="col" className="p-4 text-left font-medium">Prozessstand</th><th scope="col" className="p-4 text-left font-medium">Rechnungen erstellt</th><th scope="col" className="p-4 text-left font-medium min-w-[200px]">Zahlungsfortschritt</th><th scope="col" className="p-4 text-right font-medium">Restbetrag</th></tr></thead><tbody className="divide-y divide-border">{data.installmentTracking.map(plan => {
          const percent = plan.contractNet > 0 ? Math.min(100, plan.paidNet / plan.contractNet * 100) : 0;
          return <tr key={plan.id}><td className="p-4"><Link href="/installments" className="font-medium hover:underline">{plan.customerName}</Link><p className="text-xs text-muted mt-1">{plan.title}</p></td><td className="p-4 text-xs text-muted">{plan.stage}</td><td className="p-4 tabular-nums">{plan.issued} / {plan.totalInstallments ?? "–"}</td><td className="p-4"><div className="flex justify-between gap-2 text-xs"><span className="tabular-nums">{money(plan.paidNet)} / {money(plan.contractNet)}</span><span className="text-muted">{Math.round(percent)} %</span></div><Progress percent={percent} label={`Zahlungsfortschritt ${plan.customerName}`} /></td><td className="p-4 text-right font-semibold tabular-nums whitespace-nowrap">{money(plan.remainingNet)}</td></tr>;
        })}</tbody></table></div>}
        {data.installmentTrackingCount > data.installmentTracking.length && <p className="px-5 py-3 text-xs text-muted">{data.installmentTracking.length} von {data.installmentTrackingCount} Ratenplänen angezeigt.</p>}
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-surface p-5 min-w-0"><h2 className="font-semibold">Zahlungen & gebuchte Ausgaben</h2><p className="text-xs text-muted mt-1 mb-5">Letzte 6 Monate · brutto · Ausgaben nach Belegdatum</p><div role="img" aria-label="Balkendiagramm mit Zahlungen und gebuchten Ausgaben der letzten sechs Monate"><ResponsiveContainer width="100%" height={250}><BarChart data={chart} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--color-border))" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgb(var(--color-muted))" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "rgb(var(--color-muted))" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v.toLocaleString("de-DE")} €`} width={75} /><Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: 12, background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border))", color: "rgb(var(--color-text))" }} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar name="Gebuchte Zahlungen" dataKey="Zahlungen" fill="rgb(var(--color-success))" radius={[3, 3, 0, 0]} /><Bar name="Gebuchte Ausgaben" dataKey="Ausgaben" fill="rgb(var(--color-muted))" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
        <section className="rounded-2xl border border-border bg-surface p-5"><h2 className="font-semibold mb-4">Letzte Aktivitäten</h2><div className="space-y-4">{data.recentActivity.length === 0 && <p className="text-sm text-muted">Noch keine Aktivitäten vorhanden.</p>}{data.recentActivity.map(item => <div key={item.id} className="border-l-2 border-border pl-3"><p className="text-sm leading-relaxed">{item.description || item.action}</p><p className="text-xs text-muted mt-1">{date(item.createdAt)} · {new Date(item.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}</p></div>)}</div></section>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
        { label: "Aktive Kunden", value: data.activeCustomers, href: "/customers" },
        { label: "Offene Angebote", value: data.openQuotes, href: "/quotes" },
        { label: "Laufende Onboardings", value: data.openOnboardings, href: "/onboarding" },
        { label: "Überfällige Aufgaben", value: data.overdueTasks, href: "/onboarding" },
      ].map(item => <Link key={item.label} href={item.href} className="rounded-xl border border-border px-4 py-3 flex items-center justify-between gap-2 hover:bg-surface"><span className="text-xs text-muted">{item.label}</span><span className="font-semibold tabular-nums">{item.value}</span></Link>)}</div>
      <p className="text-xs text-muted">Rechnungsforderungen sind brutto, Vertrags- und Ratenwerte netto. Der Ratenrest enthält auch zukünftige Rechnungen und wird nicht zu offenen Rechnungsbeträgen addiert. Zeiträume: Europe/Berlin.</p>
    </>}
  </div>;
}
