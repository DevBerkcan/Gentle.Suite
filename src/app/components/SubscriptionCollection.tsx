"use client";
// Mollie-Überarbeitung: Einzugsstatus je Abo-Rechnung, nächste Abbuchung und Mandatsinfo
// (geteilt von /subscriptions und /installments, Formen siehe docs/mollie-api-contract.md).
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ChevronDown, Copy, CreditCard, Info, Landmark, Loader2, RefreshCw, Wallet } from "lucide-react";
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

/* ───────── Rechnungsliste je Abo (Chevron) ───────── */

export function SubscriptionInvoicesTable({ sub }: { sub: CustomerSubscription }) {
  const [invoices, setInvoices] = useState<SubscriptionInvoice[] | null>(null);
  const [error, setError] = useState(false);

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
                  <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{formatDate(i.paymentCollectionDueDate)}</td>
                  <td className="px-4 py-2.5"><CollectionPill invoice={i} /></td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${i.collectionAttemptCount > 1 ? "font-semibold text-warning" : "text-muted"}`}>{i.collectionAttemptCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
