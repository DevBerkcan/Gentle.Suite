"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Activity, AlertOctagon, AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Info, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useIsAdmin } from "@/app/components/SubscriptionCollection";
import type { CustomerSubscription, MonitoringIssue, MonitoringSeverity, PaymentMonitoring } from "@/types/api";

const REFRESH_MS = 60_000;

const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }) : "–";

function relative(value?: string | null) {
  if (!value) return "";
  const diffMin = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const h = Math.round(diffMin / 60);
  if (h < 48) return `vor ${h} Std.`;
  return `vor ${Math.round(h / 24)} Tagen`;
}

const SEVERITY: Record<MonitoringSeverity, { label: string; plural: string; dot: string; badge: string; icon: typeof AlertOctagon }> = {
  critical: { label: "Kritisch", plural: "Kritisch", dot: "bg-danger", badge: "bg-danger/10 text-danger", icon: AlertOctagon },
  warning: { label: "Warnung", plural: "Warnungen", dot: "bg-warning", badge: "bg-warning/10 text-warning", icon: AlertTriangle },
  info: { label: "Hinweis", plural: "Hinweise", dot: "bg-secondary", badge: "bg-secondary/15 text-[#5B2DB8] dark:text-secondary", icon: Info },
};

const KIND_LABELS: Record<string, string> = {
  "billing-job-stale": "Abrechnungslauf überfällig",
  "billing-job-failed": "Abrechnungslauf fehlgeschlagen",
  "collection-overdue": "Einzug überfällig",
  "collection-stuck": "Einzug hängt",
  "collection-failed": "Einzug fehlgeschlagen",
  chargeback: "Rücklastschrift",
  "mandate-missing": "Mandat fehlt",
  "mandate-email-failed": "Mandats-E-Mail fehlgeschlagen",
  "authorization-missing": "Freigabe fehlt",
  "webhook-errors": "Webhook-Fehler",
  "mail-delivery-failed": "Mailversand",
};

const MICRO = "text-[10px] font-semibold uppercase tracking-[0.2em] text-muted";

function RunCard({ title, run, stats, emptyText }: { title: string; run?: { startedAt: string; finishedAt?: string | null; succeeded: boolean; error?: string | null } | null; stats: { label: string; value: number; bad?: boolean }[]; emptyText: string }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={MICRO}>{title}</p>
          {run ? (
            <p className="mt-2 text-lg font-semibold tabular-nums">{dateTime(run.finishedAt || run.startedAt)}</p>
          ) : (
            <p className="mt-2 text-lg font-semibold text-muted">Noch kein Lauf</p>
          )}
          {run && <p className="mt-0.5 text-xs text-muted">{relative(run.finishedAt || run.startedAt)}{!run.finishedAt && " · läuft noch"}</p>}
        </div>
        {run && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${run.succeeded ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
            {run.succeeded ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
            {run.succeeded ? "Erfolgreich" : "Fehlgeschlagen"}
          </span>
        )}
      </div>
      {run ? (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
            {stats.map(s => (
              <div key={s.label}>
                <dt className="text-xs text-muted">{s.label}</dt>
                <dd className={`mt-1 text-2xl font-semibold tabular-nums ${s.bad && s.value > 0 ? "text-danger" : ""}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
          {run.error && <p className="mt-4 rounded-xl bg-danger/5 px-3 py-2 text-xs text-danger break-words">{run.error}</p>}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">{emptyText}</p>
      )}
    </section>
  );
}

export default function MonitoringPage() {
  const [data, setData] = useState<PaymentMonitoring | null>(null);
  const [subs, setSubs] = useState<CustomerSubscription[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const request = useRef<AbortController | null>(null);
  const isAdmin = useIsAdmin();

  const load = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setRefreshing(true);
    try {
      const result = await api.paymentMonitoring(controller.signal);
      if (!controller.signal.aborted) { setData(result); setError(""); setLoadedAt(new Date()); }
    } catch (e: any) {
      if (!controller.signal.aborted) setError(e?.message ? `Monitoring-Daten konnten nicht geladen werden: ${e.message}` : "Monitoring-Daten konnten nicht geladen werden.");
    } finally {
      if (request.current === controller) { request.current = null; setRefreshing(false); }
    }
    // Abos nur für die Verlinkung (Kunde / Serie vs. Rate); Fehler hier sind unkritisch.
    api.allSubs().then(list => { if (Array.isArray(list)) setSubs(list); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) { window.location.href = "/login"; return; }
    void load();
    const tick = () => { if (document.visibilityState === "visible") void load(); };
    const interval = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", tick); request.current?.abort(); request.current = null; };
  }, [load]);

  async function reconcile() {
    setReconciling(true);
    setNotice("");
    try {
      const r = await api.reconcileMandates();
      setNotice(r.succeeded ? `Mandatsabgleich abgeschlossen · ${r.updated} ${r.updated === 1 ? "Abo" : "Abos"} aktualisiert.` : `Mandatsabgleich fehlgeschlagen${r.error ? `: ${r.error}` : "."}`);
      await load();
    } catch (e: any) {
      setNotice(e?.message || "Mandatsabgleich konnte nicht gestartet werden.");
    } finally {
      setReconciling(false);
    }
  }

  const subsById = useMemo(() => new Map(subs.map(s => [s.id, s])), [subs]);
  const grouped = useMemo(() => {
    const order: MonitoringSeverity[] = ["critical", "warning", "info"];
    return order.map(sev => ({ sev, items: (data?.issues || []).filter(i => (i.severity || "info") === sev) })).filter(g => g.items.length > 0);
  }, [data]);

  const counts = data?.counts || { critical: 0, warning: 0, info: 0 };
  const light = !data ? "unknown" : counts.critical > 0 ? "red" : counts.warning > 0 ? "amber" : "green";
  const lightCfg = {
    red: { ring: "bg-danger", text: "Kritische Probleme", sub: `${counts.critical} kritisch · ${counts.warning} Warnungen – bitte jetzt prüfen.`, Icon: AlertOctagon, tone: "text-danger" },
    amber: { ring: "bg-warning", text: "Mit Warnungen", sub: `${counts.warning} ${counts.warning === 1 ? "Warnung" : "Warnungen"}, keine kritischen Probleme.`, Icon: AlertTriangle, tone: "text-warning" },
    green: { ring: "bg-success", text: "Alles in Ordnung", sub: "Keine kritischen Probleme im Zahlungsverkehr.", Icon: ShieldCheck, tone: "text-success" },
    unknown: { ring: "bg-border", text: error ? "Status unbekannt" : "Wird geladen …", sub: error ? "Monitoring konnte nicht abgerufen werden." : "Daten werden abgerufen.", Icon: Activity, tone: "text-muted" },
  }[light];

  function IssueRow({ issue }: { issue: MonitoringIssue }) {
    const sev = SEVERITY[(issue.severity as MonitoringSeverity) || "info"] || SEVERITY.info;
    const sub = issue.subscriptionId ? subsById.get(issue.subscriptionId) : undefined;
    const subHref = issue.subscriptionId ? `${sub?.isInstallmentPlan ? "/installments" : "/subscriptions"}?sub=${issue.subscriptionId}` : null;
    return (
      <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-4">
        <span className={`mt-1.5 hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block ${sev.dot}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{issue.title}</p>
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted">{KIND_LABELS[issue.kind] || issue.kind}</span>
          </div>
          {issue.detail && <p className="mt-1 text-sm text-muted">{issue.detail}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {issue.customerName && (sub ? (
              <Link href={`/customers/${sub.customerId}`} className="inline-flex items-center gap-1 font-medium text-navy hover:underline dark:text-text">{issue.customerName}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></Link>
            ) : <span className="font-medium">{issue.customerName}</span>)}
            {subHref && <Link href={subHref} className="inline-flex items-center gap-1 text-navy hover:underline dark:text-text">{sub?.isInstallmentPlan ? "Ratenzahlung" : sub ? "Serienrechnung" : "Abo"}{sub ? ` · ${sub.installmentSourceTitle || sub.planName}` : ""}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></Link>}
            {issue.invoiceId && <Link href={`/invoices/${issue.invoiceId}`} className="inline-flex items-center gap-1 text-navy hover:underline dark:text-text">Rechnung öffnen<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></Link>}
            {issue.since && <span className="inline-flex items-center gap-1 text-muted"><Clock3 className="h-3 w-3" aria-hidden="true" />seit {dateTime(issue.since)}</span>}
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">System · Zahlungsverkehr</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Monitoring</h1>
          <p className="mt-2 text-sm text-muted">Abrechnungsläufe, Mollie-Mandate und offene Probleme bei Einzügen.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-right text-xs text-muted">
            {loadedAt ? `Stand ${loadedAt.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin" })}` : "–"}<br />automatisch alle 60 Sekunden
          </p>
          <button onClick={() => void load()} disabled={refreshing} aria-label="Monitoring aktualisieren" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" /><span className="hidden sm:inline">Aktualisieren</span>
          </button>
          {isAdmin && (
            <button onClick={reconcile} disabled={reconciling} className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-[#07143D] disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${reconciling ? "animate-spin" : ""}`} aria-hidden="true" />
              {reconciling ? "Abgleich läuft …" : "Mandate jetzt mit Mollie abgleichen"}
            </button>
          )}
        </div>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning">{error}</div>}
      {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">{notice}<button onClick={() => setNotice("")} aria-label="Hinweis schließen" className="text-muted hover:text-text">×</button></div>}

      {/* Ampel */}
      <section className="flex flex-col gap-5 rounded-2xl bg-navy p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex flex-col gap-1.5 rounded-full bg-white/10 p-2" role="img" aria-label={`Ampel: ${lightCfg.text}`}>
            <span className={`h-4 w-4 rounded-full ${light === "red" ? "bg-danger shadow-[0_0_12px_rgba(240,68,56,0.8)]" : "bg-white/15"}`} />
            <span className={`h-4 w-4 rounded-full ${light === "amber" ? "bg-[#F79009] shadow-[0_0_12px_rgba(247,144,9,0.8)]" : "bg-white/15"}`} />
            <span className={`h-4 w-4 rounded-full ${light === "green" ? "bg-accent shadow-[0_0_12px_rgba(215,255,63,0.7)]" : "bg-white/15"}`} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">Gesamtstatus</p>
            <h2 className="mt-1 text-2xl sm:text-3xl">{lightCfg.text}</h2>
            <p className="mt-1 text-sm text-white/70">{lightCfg.sub}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {(["critical", "warning", "info"] as MonitoringSeverity[]).map(sev => (
            <div key={sev} className="rounded-xl bg-white/5 px-4 py-3 text-center">
              <p className={`text-2xl font-semibold tabular-nums ${counts[sev] > 0 ? (sev === "critical" ? "text-[#FF8A80]" : sev === "warning" ? "text-[#FDB022]" : "text-secondary") : "text-white/40"}`}>{counts[sev]}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-white/60">{SEVERITY[sev].plural}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RunCard
          title="Letzter Abrechnungslauf"
          run={data?.lastBillingRun}
          emptyText="Es wurde noch kein Abrechnungslauf protokolliert."
          stats={[
            { label: "Rechnungen erstellt", value: data?.lastBillingRun?.invoicesCreated ?? 0 },
            { label: "Einzüge gestartet", value: data?.lastBillingRun?.collectionsStarted ?? 0 },
            { label: "Fehler", value: data?.lastBillingRun?.failures ?? 0, bad: true },
          ]}
        />
        <RunCard
          title="Letzter Mandatsabgleich"
          run={data?.lastMandateReconcile}
          emptyText="Es wurde noch kein Mandatsabgleich protokolliert."
          stats={[{ label: "Abos aktualisiert", value: data?.lastMandateReconcile?.updated ?? 0 }]}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-lg">Probleme</h2>
          <span className="rounded-full bg-background px-3 py-1 text-xs font-medium">{data?.issues.length ?? 0} offen</span>
        </div>
        {!data ? (
          <div className="animate-pulse space-y-3 p-5" role="status" aria-label="Wird geladen">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-background" />)}</div>
        ) : grouped.length === 0 ? (
          <p className="flex items-center justify-center gap-2 p-10 text-sm text-muted"><CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />Keine offenen Probleme – alles läuft.</p>
        ) : (
          grouped.map(group => {
            const cfg = SEVERITY[group.sev];
            return (
              <div key={group.sev} className="border-b border-border last:border-b-0">
                <div className="flex items-center gap-2 bg-background/60 px-5 py-2.5">
                  <cfg.icon className={`h-4 w-4 ${group.sev === "critical" ? "text-danger" : group.sev === "warning" ? "text-warning" : "text-secondary"}`} aria-hidden="true" />
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${group.sev === "critical" ? "text-danger" : group.sev === "warning" ? "text-warning" : "text-muted"}`}>{cfg.plural}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>{group.items.length}</span>
                </div>
                <ul className="divide-y divide-border">
                  {group.items.map((issue, idx) => <IssueRow key={`${issue.kind}-${issue.subscriptionId ?? ""}-${issue.invoiceId ?? ""}-${idx}`} issue={issue} />)}
                </ul>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
