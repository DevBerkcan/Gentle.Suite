"use client";
// Mollie-Überarbeitung: Einzugsstatus je Abo-Rechnung, nächste Abbuchung und Mandatsinfo
// (geteilt von /subscriptions und /installments, Formen siehe docs/mollie-api-contract.md).
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Check, ChevronDown, Copy, CreditCard, Info, Landmark, Loader2, RefreshCw, Wallet, X } from "lucide-react";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/currentUser";
import type { CustomerSubscription, SubscriptionInvoice } from "@/types/api";

export const formatMoney = (value: number | null | undefined) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(value || 0));
export const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" }) : "–";

/** Admin-Rolle aus dem gespeicherten Login. */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const u = getStoredUser();
    setIsAdmin(!!u && (u.role === "Admin" || !!u.roles?.includes("Admin")));
  }, []);
  return isAdmin;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function CopyLinkButton({ url, label = "Einrichtungslink kopieren", className = "" }: { url: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async e => {
        e.stopPropagation();
        if (await copyText(url)) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
      }}
      title={url}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text hover:border-navy/40 hover:bg-background transition-colors ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? "Kopiert" : label}
    </button>
  );
}

/* ───────── Einzugsstatus ───────── */

type CollectionKey = "planned" | "running" | "paid" | "failed" | "chargeback" | "none";

const COLLECTION_PILLS: Record<CollectionKey, { label: string; cls: string }> = {
  planned: { label: "geplant", cls: "bg-navy/5 text-navy dark:bg-white/10 dark:text-text" },
  running: { label: "läuft", cls: "bg-secondary/15 text-[#5B2DB8] dark:text-secondary" },
  paid: { label: "bezahlt", cls: "bg-success/10 text-success" },
  failed: { label: "fehlgeschlagen", cls: "bg-danger/10 text-danger" },
  chargeback: { label: "Rücklastschrift", cls: "bg-danger text-white" },
  none: { label: "kein Einzug", cls: "bg-background text-muted" },
};

export function collectionKey(i: Pick<SubscriptionInvoice, "chargedBack" | "paymentCollectionStatus" | "status" | "paidAt">): CollectionKey {
  if (i.chargedBack) return "chargeback";
  const s = (i.paymentCollectionStatus || "").toLowerCase();
  if (s === "paid" || i.status === "Paid" || i.paidAt) return "paid";
  if (["failed", "canceled", "cancelled", "expired", "error"].includes(s)) return "failed";
  if (["open", "pending", "authorized"].includes(s)) return "running";
  if (s === "scheduled") return "planned";
  return "none";
}

export function CollectionPill({ invoice }: { invoice: SubscriptionInvoice }) {
  const key = collectionKey(invoice);
  const pill = COLLECTION_PILLS[key];
  const reason = invoice.lastFailureReason;
  return (
    <span
      title={reason ? `Grund: ${reason}` : undefined}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${pill.cls} ${reason ? "cursor-help" : ""}`}
    >
      {pill.label}
      {reason && <Info className="h-3 w-3" aria-hidden="true" />}
      {reason && <span className="sr-only">: {reason}</span>}
    </span>
  );
}

/* ───────── Einzug verschieben (Admin) ───────── */

const MAX_POSTPONE_DAYS = 90;

/** Heutiges Datum in Europe/Berlin als YYYY-MM-DD (gleiche Regel wie das Backend). */
function berlinToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function berlinIsoDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)) : "";
}

function RescheduleCollectionDialog({ invoice, onClose, onSaved }: { invoice: SubscriptionInvoice; onClose: () => void; onSaved: (i: SubscriptionInvoice) => void }) {
  const today = berlinToday();
  const min = addDays(today, 1);
  const max = addDays(today, MAX_POSTPONE_DAYS);
  const current = berlinIsoDate(invoice.paymentCollectionDueDate);
  const [date, setDate] = useState(current && current >= min && current <= max ? current : min);
  const [reason, setReason] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const valid = !!date && date >= min && date <= max;

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      onSaved(await api.rescheduleCollection(invoice.id, { date, reason: reason.trim() || null, notifyCustomer }));
    } catch (e: any) {
      setError(e?.message || "Einzugstermin konnte nicht verschoben werden");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`reschedule-${invoice.id}`}
        className="w-full max-w-md rounded-xl border border-border bg-surface shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 id={`reschedule-${invoice.id}`} className="text-lg font-semibold">Einzugstermin verschieben</h2>
            <p className="mt-1 text-xs text-muted">
              Rechnung {invoice.invoiceNumber} · {formatMoney(invoice.grossTotal)} · bisher {formatDate(invoice.paymentCollectionDueDate)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className="text-muted hover:text-text"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>

        <div className="space-y-4 p-5">
          {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
          <div>
            <label htmlFor={`reschedule-date-${invoice.id}`} className="mb-1 block text-xs uppercase tracking-wide text-muted">Neuer Einzugstermin</label>
            <input
              id={`reschedule-date-${invoice.id}`}
              type="date"
              value={date}
              min={min}
              max={max}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2"
            />
            <p className={`mt-1 text-xs ${date && !valid ? "text-danger" : "text-muted"}`}>
              Frühestens {formatDate(`${min}T12:00:00Z`)}, spätestens {formatDate(`${max}T12:00:00Z`)} ({MAX_POSTPONE_DAYS} Tage).
            </p>
          </div>
          <div>
            <label htmlFor={`reschedule-reason-${invoice.id}`} className="mb-1 block text-xs uppercase tracking-wide text-muted">Grund (optional, nur intern)</label>
            <input
              id={`reschedule-reason-${invoice.id}`}
              type="text"
              value={reason}
              maxLength={500}
              onChange={e => setReason(e.target.value)}
              placeholder="z. B. Rechnung erst verspätet erhalten"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={notifyCustomer} onChange={e => setNotifyCustomer(e.target.checked)} className="mt-1" />
            <span>
              Kunde per E-Mail informieren
              <span className="block text-xs text-muted">Kurze Mail an den Hauptkontakt mit neuem Termin und Betrag.</span>
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-border p-5">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Abbrechen</button>
          <button type="button" onClick={save} disabled={!valid || saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50">
            {saving ? "Wird gespeichert …" : "Termin speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Rechnungsliste je Abo (Chevron) ───────── */

export function SubscriptionInvoicesTable({ sub }: { sub: CustomerSubscription }) {
  const [invoices, setInvoices] = useState<SubscriptionInvoice[] | null>(null);
  const [error, setError] = useState(false);
  const isAdmin = useIsAdmin();
  const [rescheduling, setRescheduling] = useState<SubscriptionInvoice | null>(null);

  useEffect(() => {
    let active = true;
    api.subscriptionInvoiceList(sub.id)
      .then(list => { if (active) setInvoices(list); })
      .catch(() => { if (active) { setInvoices([]); setError(true); } });
    return () => { active = false; };
  }, [sub.id]);

  const unit = sub.isInstallmentPlan ? "Raten" : "Rechnungen";
  const relevant = (invoices || []).filter(i => i.status !== "Cancelled" && i.status !== "Draft");
  const paid = sub.invoicesPaid ?? relevant.filter(i => collectionKey(i) === "paid").length;
  // Installment plans count all agreed installments ("1 von 3 Raten"), not only the invoices issued so far.
  const total = sub.isInstallmentPlan && sub.contractDurationMonths
    ? Math.max(sub.contractDurationMonths, sub.invoicesTotal ?? 0)
    : sub.invoicesTotal ?? relevant.length;
  const outstanding = sub.outstandingAmount ?? relevant.filter(i => collectionKey(i) !== "paid").reduce((sum, i) => sum + Number(i.grossTotal || 0), 0);

  return (
    <div className="max-w-5xl rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{sub.isInstallmentPlan ? "Raten & Einzüge" : "Rechnungen & Einzüge"}</p>
        {invoices && (
          <p className="text-sm text-text">
            <span className="font-semibold">{paid} von {total} {unit} bezahlt</span>
            <span className="text-muted"> · </span>
            <span className={outstanding > 0 ? "font-medium" : "text-muted"}>{formatMoney(outstanding)} offen</span>
          </p>
        )}
      </div>
      {invoices === null ? (
        <p className="flex items-center gap-2 px-4 py-4 text-xs text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Rechnungen werden geladen …</p>
      ) : error ? (
        <p className="px-4 py-4 text-xs text-danger">Rechnungen konnten nicht geladen werden.</p>
      ) : invoices.length === 0 ? (
        <p className="px-4 py-4 text-xs text-muted">Noch keine Rechnung erstellt.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted">
                <th scope="col" className="px-4 py-2 font-medium">Nr.</th>
                <th scope="col" className="px-4 py-2 font-medium">Zeitraum</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Betrag</th>
                <th scope="col" className="px-4 py-2 font-medium">Einzugsdatum</th>
                <th scope="col" className="px-4 py-2 font-medium">Einzugsstatus</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Versuche</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map(i => (
                <tr key={i.id} className={i.status === "Cancelled" ? "text-muted line-through decoration-muted/50" : ""}>
                  <td className="px-4 py-2.5 whitespace-nowrap"><Link href={`/invoices/${i.id}`} className="font-medium text-navy underline-offset-2 hover:underline dark:text-text">{i.invoiceNumber}</Link></td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted">{i.billingPeriodStart && i.billingPeriodEnd ? `${formatDate(i.billingPeriodStart)} – ${formatDate(i.billingPeriodEnd)}` : "–"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right font-medium tabular-nums">{formatMoney(i.grossTotal)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                    {formatDate(i.paymentCollectionDueDate)}
                    {isAdmin && collectionKey(i) === "planned" && (
                      <button
                        type="button"
                        onClick={() => setRescheduling(i)}
                        className="ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 align-middle text-[11px] font-medium text-text transition-colors hover:border-navy/40 hover:bg-background"
                      >
                        <CalendarClock className="h-3 w-3" aria-hidden="true" />
                        Termin verschieben
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2.5"><CollectionPill invoice={i} /></td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${i.collectionAttemptCount > 1 ? "font-semibold text-warning" : "text-muted"}`}>{i.collectionAttemptCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rescheduling && (
        <RescheduleCollectionDialog
          invoice={rescheduling}
          onClose={() => setRescheduling(null)}
          onSaved={updated => {
            setInvoices(list => (list || []).map(x => (x.id === updated.id ? updated : x)));
            setRescheduling(null);
          }}
        />
      )}
    </div>
  );
}

/** Runder Chevron-Button zum Auf-/Zuklappen einer Abo-Zeile. */
export function ExpandChevron({ expanded, onClick, label }: { expanded: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={`${expanded ? "Rechnungen ausblenden" : "Rechnungen anzeigen"}: ${label}`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-navy/40 hover:text-text"
    >
      <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
  );
}

/* ───────── Nächste Abbuchung ───────── */

const BANK_HINT = "Bis der Betrag auf dem Konto gebucht ist, kann es je nach Bank 1–3 Werktage dauern.";

export function NextCollection({ sub, fallbackDate }: { sub: CustomerSubscription; fallbackDate?: string | null }) {
  if (sub.nextCollectionBlockedReason) {
    const mandateIssue = /mandat/i.test(sub.nextCollectionBlockedReason);
    return (
      <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-warning/25 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="font-medium">{sub.nextCollectionBlockedReason}</span>
        {mandateIssue && sub.mandateSetupUrl && <CopyLinkButton url={sub.mandateSetupUrl} label="Link kopieren" className="!py-0.5" />}
      </div>
    );
  }
  if (sub.nextCollectionDate) {
    return (
      <div className="text-xs leading-relaxed" title={BANK_HINT}>
        <p className="whitespace-nowrap text-sm text-text">
          {sub.nextCollectionIsForecast ? "voraussichtlich am " : "am "}
          <span className="font-semibold tabular-nums">{formatDate(sub.nextCollectionDate)}</span>
          <Info className="ml-1 inline h-3.5 w-3.5 cursor-help align-[-2px] text-muted" aria-label={BANK_HINT} />
        </p>
        <p className="whitespace-nowrap text-muted">
          {sub.nextCollectionAmount != null && <span className="tabular-nums">{formatMoney(sub.nextCollectionAmount)}</span>}
          {sub.nextCollectionInvoiceNumber ? <> · {sub.nextCollectionInvoiceNumber}</> : sub.nextCollectionIsForecast ? <> · Rechnung folgt</> : null}
        </p>
      </div>
    );
  }
  // Ältere API ohne die neuen Felder: bisherige Anzeige
  return <span className="text-sm text-muted">{fallbackDate ? formatDate(fallbackDate) : "–"}</span>;
}

/* ───────── Abbuchungstag (Admin) ───────── */

const COLLECTION_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const COLLECTION_DAY_HINT = "Gilt für alle künftigen Rechnungen; bereits erstellte Rechnungen behalten ihren Termin.";

/** Fester Abbuchungstag je Abo/Ratenplan (1–28) oder Standard = Einzug zum Periodenbeginn. Nur für Admins. */
export function CollectionDaySetting({ sub, onUpdated, onError }: { sub: CustomerSubscription; onUpdated: (s: CustomerSubscription) => void; onError?: (msg: string) => void }) {
  const isAdmin = useIsAdmin();
  const current = sub.collectionDayOfMonth ?? null;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current == null ? "" : String(current));
  const [saving, setSaving] = useState(false);

  if (!isAdmin) return null;

  async function save() {
    if (saving) return;
    const day = value === "" ? null : Number(value);
    if (day === current) { setEditing(false); return; }
    setSaving(true);
    try {
      onUpdated(await api.setSubscriptionCollectionDay(sub.id, { day }));
      setEditing(false);
    } catch (e: any) {
      onError?.(e?.message || "Abbuchungstag konnte nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="inline-flex items-center gap-1.5 text-sm text-text">
          <CalendarClock className="h-4 w-4 text-secondary" aria-hidden="true" />
          <span className="text-muted">Abbuchungstag:</span>
          <span className="font-semibold">{current == null ? "Standard (Periodenbeginn)" : `am ${current}. (Ausnahme)`}</span>
        </p>
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`collection-day-${sub.id}`} className="sr-only">Abbuchungstag wählen</label>
            <select
              id={`collection-day-${sub.id}`}
              value={value}
              onChange={e => setValue(e.target.value)}
              disabled={saving}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-sm"
            >
              <option value="">Standard (Periodenbeginn)</option>
              {COLLECTION_DAYS.map(d => <option key={d} value={d}>am {d}.</option>)}
            </select>
            <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50">
              {saving ? "Wird gespeichert …" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setValue(current == null ? "" : String(current)); }}
              disabled={saving}
              className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-background disabled:opacity-50"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setValue(current == null ? "" : String(current)); setEditing(true); }}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-text transition-colors hover:border-navy/40 hover:bg-background"
          >
            Ändern
          </button>
        )}
      </div>
      {editing && <p className="mt-1.5 text-xs text-muted">{COLLECTION_DAY_HINT}</p>}
    </div>
  );
}

/* ───────── Mandat ───────── */

export function mandateLabel(method?: string | null, last4?: string | null) {
  const tail = last4 ? ` ••${last4}` : "";
  switch (method) {
    case "directdebit": return `SEPA${tail}`;
    case "creditcard": return `Karte${tail}`;
    case "paypal": return "PayPal";
    default: return null;
  }
}

/** Letzter fehlgeschlagener Einrichtungsversuch des Kunden (nur solange kein gültiges Mandat besteht). */
export function SetupAttemptHint({ sub }: { sub: CustomerSubscription }) {
  if (sub.mollieMandateStatus === "valid" || !sub.lastSetupAttemptAt || !sub.lastSetupError) return null;
  const method = sub.lastSetupAttemptMethod === "card" ? "Karte" : sub.lastSetupAttemptMethod === "iban" ? "IBAN" : sub.lastSetupAttemptMethod || "unbekannt";
  const when = new Date(sub.lastSetupAttemptAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const text = `Einrichtung versucht am ${when} (${method}, ${sub.setupAttemptCount ?? 1}×): ${sub.lastSetupError}`;
  return (
    <p title={text} className="flex max-w-64 cursor-help items-start gap-1.5 rounded-lg border border-warning/25 bg-warning/10 px-2 py-1 text-xs text-warning">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="line-clamp-3">{text}</span>
    </p>
  );
}

export function MandateInfo({ sub, isAdmin, onUpdated, onError }: { sub: CustomerSubscription; isAdmin: boolean; onUpdated: (s: CustomerSubscription) => void; onError?: (msg: string) => void }) {
  const [checking, setChecking] = useState(false);
  const label = mandateLabel(sub.mandateMethod, sub.mandateAccountLast4);
  const Icon = sub.mandateMethod === "creditcard" ? CreditCard : sub.mandateMethod === "paypal" ? Wallet : Landmark;

  async function check() {
    setChecking(true);
    try {
      onUpdated(await api.checkSubscriptionMandate(sub.id));
    } catch (e: any) {
      onError?.(e?.message || "Mandat konnte nicht bei Mollie geprüft werden");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-1.5 text-xs">
      {label ? (
        <p className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-text"><Icon className="h-4 w-4 text-secondary" aria-hidden="true" />{label}</p>
      ) : (
        <p className="whitespace-nowrap text-muted">Kein Mandat hinterlegt</p>
      )}
      <SetupAttemptHint sub={sub} />
      <div className="flex flex-col items-start gap-1.5">
        {sub.mandateSetupUrl && <CopyLinkButton url={sub.mandateSetupUrl} />}
        {isAdmin && (
          <button
            type="button"
            onClick={check}
            disabled={checking}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text hover:border-navy/40 hover:bg-background disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />
            {checking ? "Wird geprüft …" : "Bei Mollie prüfen"}
          </button>
        )}
      </div>
    </div>
  );
}
